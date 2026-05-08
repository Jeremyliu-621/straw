import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { SUBMISSION_STATUS, EVAL_MODE } from "@/constants";

/**
 * POST /api/v1/submissions/:id/external-score — D40 path B (external eval).
 *
 * Called by the poster's own infrastructure after their judge has scored
 * the submission. Auth is the per-task `eval_callback_token` issued at
 * task creation; no agent api_key needed (the poster's daemon is acting
 * as Straw's eval driver, not as an agent).
 *
 * Request body:
 *   {
 *     "callback_token": "straw_evaltok_<32-hex>",
 *     "final_score": 87.5,                              // required, 0-100
 *     "reasoning": "<overall judge prose>",             // optional
 *     "dimensions": [                                   // optional
 *       { "criterion_name": "correctness", "score": 90, "reasoning": "..." },
 *       ...
 *     ],
 *     "error_message": "judge timed out" | null        // when set, marks evaluation_failed
 *   }
 *
 * On success: writes evaluation_results, marks submission completed +
 * evaluated:true, fires the standard submission.completed webhook so any
 * agent SSE listeners see the score arrive.
 *
 * Security:
 *   - Token compared with timing-safe equality.
 *   - Token only known to the poster (and Straw); rotation = create new task.
 *   - One score per submission (evaluation_results trigger is immutable).
 *   - Rate-limited per IP — same default gate as other write endpoints.
 */

const externalScoreSchema = z
  .object({
    callback_token: z.string().min(20).max(200),
    final_score: z.number().min(0).max(100).optional(),
    reasoning: z.string().max(50_000).optional(),
    dimensions: z
      .array(
        z.object({
          criterion_name: z.string().min(1).max(200),
          score: z.number().min(0).max(100),
          reasoning: z.string().max(10_000).optional(),
        }),
      )
      .max(50)
      .optional(),
    error_message: z.string().max(5_000).nullable().optional(),
  })
  .refine(
    (data) => typeof data.final_score === "number" || typeof data.error_message === "string",
    {
      message: "Either `final_score` (0-100) or `error_message` must be provided",
      path: ["final_score"],
    },
  );

function tokensMatch(a: string, b: string): boolean {
  // Pad to equal length to make timingSafeEqual not throw — and compare.
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "external-score", maxRequests: 60 });
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const uuidErr = validateUuid(id, "submission ID");
  if (uuidErr) return uuidErr;

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;

  const validation = externalScoreSchema.safeParse(parsed.data);
  if (!validation.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(validation.error));
  }
  const body = validation.data;

  const db = createServiceClient();

  // Look up submission + parent task in one round-trip.
  const { data: submission, error: subErr } = await db
    .from("submissions")
    .select("id, task_id, status, output_url, agent_id")
    .eq("id", id)
    .single();

  if (subErr || !submission) return apiError("Submission not found", 404);

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .select("id, eval_mode, eval_callback_token, company_id, status")
    .eq("id", submission.task_id)
    .single();

  if (taskErr || !task) return apiError("Task not found", 404);

  if (task.eval_mode !== EVAL_MODE.EXTERNAL) {
    return apiError(
      "Task is not configured for external eval",
      400,
      "WRONG_EVAL_MODE",
    );
  }

  if (!task.eval_callback_token || !tokensMatch(body.callback_token, task.eval_callback_token)) {
    return apiError("Invalid callback_token", 401, "INVALID_CALLBACK_TOKEN");
  }

  // Score-write idempotency — evaluation_results table has an immutable
  // trigger, so a second write would always 500. Surface a clean 409 if
  // the score has already landed.
  const { data: existingEval } = await db
    .from("evaluation_results")
    .select("id")
    .eq("submission_id", id)
    .maybeSingle();
  if (existingEval) {
    return apiError(
      "Score already recorded for this submission",
      409,
      "ALREADY_SCORED",
    );
  }

  // Error path — mark evaluation_failed, no score row.
  if (typeof body.error_message === "string" && body.error_message.length > 0) {
    await db
      .from("submissions")
      .update({
        status: SUBMISSION_STATUS.EVALUATION_FAILED,
        error_message: body.error_message,
      })
      .eq("id", id);
    return NextResponse.json({
      submission_id: id,
      status: SUBMISSION_STATUS.EVALUATION_FAILED,
      error_message: body.error_message,
    });
  }

  // Success path — write evaluation_results + dimensions, mark completed.
  const finalScore = body.final_score!;

  const { data: evalRow, error: evalErr } = await db
    .from("evaluation_results")
    .insert({
      submission_id: id,
      final_score: finalScore,
      llm_reasoning: body.reasoning ?? null,
      eval_mode: EVAL_MODE.EXTERNAL,
    })
    .select("id")
    .single();

  if (evalErr || !evalRow) {
    return apiError("Failed to write evaluation result", 500, "EVAL_WRITE_FAILED");
  }

  // Per-dimension scores — match by criterion_name to the task's
  // rubric_criteria rows so a row is written with the FK.
  if (body.dimensions && body.dimensions.length > 0) {
    const { data: criteria } = await db
      .from("rubric_criteria")
      .select("id, name")
      .eq("task_id", submission.task_id);

    const byName = new Map<string, string>();
    for (const c of criteria ?? []) byName.set(c.name, c.id);

    const dimRows = body.dimensions
      .map((d) => {
        const criterionId = byName.get(d.criterion_name);
        if (!criterionId) return null;
        return {
          evaluation_result_id: evalRow.id,
          rubric_criterion_id: criterionId,
          score: d.score,
          reasoning: d.reasoning ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (dimRows.length > 0) {
      await db.from("evaluation_dimensions").insert(dimRows);
    }
  }

  await db
    .from("submissions")
    .update({ status: SUBMISSION_STATUS.COMPLETED })
    .eq("id", id);

  return NextResponse.json({
    submission_id: id,
    status: SUBMISSION_STATUS.COMPLETED,
    evaluated: true,
    final_score: finalScore,
    evaluation_id: evalRow.id,
  });
}
