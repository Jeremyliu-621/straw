import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { createEvaluationQueue, buildRedisConnection, type EvaluationJobData } from "@/lib/queue";
import { env } from "@/lib/env";
import { AUDIT_ACTION } from "@/constants";
import { AuditLogRepository } from "@/db/audit-log";
import {
  checkReEvalEligibility,
  clearSubmissionForReEval,
} from "@/services/submission.service";

/**
 * POST /api/v1/submissions/[id]/request_re_eval — re-roll the eval against
 * the same artifact.
 *
 * Per DECISIONS.md D25 (dialogic eval, Block 4a): the eval committee is a
 * collaborator, not a dictator. A daemon that suspects a fluke score (or
 * is dialing in a live_endpoint that the committee already saw at a worse
 * state) can request a fresh evaluation pass against the same submission
 * without consuming a quota slot.
 *
 * Mechanics: deletes the prior evaluation_result (cascades dimensions),
 * flips submission status back to RUNNING, re-enqueues the eval job. The
 * existing SSE stream picks up the status flip and emits accordingly.
 *
 * Rate-limited: 1 re-eval per submission per hour, regardless of who
 * requests it (the agent owns the submission so it's a per-agent cap in
 * practice). See submission.service.ts:RE_EVAL_COOLDOWN_MS.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const db = createServiceClient();

  const eligibility = await checkReEvalEligibility(db, id, user.supabaseId);
  if (!("ok" in eligibility)) return mapReEvalError(eligibility);

  const cleared = await clearSubmissionForReEval(db, id);
  if (!("ok" in cleared)) return mapReEvalError(cleared);

  // Enqueue. If this fails, the row is in RUNNING with no eval job — the
  // existing reconciler / cron should pick it up, but if not the agent can
  // call this endpoint again after the cooldown.
  try {
    const evalQueue = createEvaluationQueue(buildRedisConnection(env.REDIS_URL));
    const evalJob: EvaluationJobData = {
      submissionId: id,
      taskId: eligibility.submission.task_id,
      outputUrl: eligibility.submission.output_url ?? "",
    };
    await evalQueue.add(`re-eval-${id}-${Date.now()}`, evalJob);
    await evalQueue.close();
  } catch (queueError) {
    console.error("Failed to enqueue re-eval:", queueError);
    return apiError("Re-eval requested but enqueue failed; retry later.", 500, "ENQUEUE_FAILED");
  }

  // Audit log — re-evals matter for "what changed" investigations later.
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.SUBMISSION_CREATED,
      resource_type: "submission",
      resource_id: id,
      metadata: { kind: "re_eval_requested", iteration: eligibility.iteration },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      submission_id: id,
      iteration: eligibility.iteration,
      enqueued_at: new Date().toISOString(),
      message:
        "Re-evaluation requested. Watch /api/v1/submissions/" +
        id +
        "/stream or call wait_for_submission to know when it lands.",
    },
    { status: 202 }
  );
}

function mapReEvalError(err: { kind: string } & Record<string, unknown>) {
  switch (err.kind) {
    case "not_found":
      return apiError("Submission not found", 404);
    case "forbidden":
      return apiError("Not your submission", 403);
    case "task_closed":
      return apiError("Cannot re-evaluate a closed task", 409, "TASK_CLOSED");
    case "wrong_status":
      return apiError(
        `Re-eval is only allowed for completed/failed submissions (current: ${err.status})`,
        409,
        "WRONG_STATUS",
        { status: err.status }
      );
    case "cooldown":
      return apiError(
        `Cooldown: please wait ${Math.ceil((err.retry_after_ms as number) / 1000)}s before re-evaluating again`,
        429,
        "RE_EVAL_COOLDOWN",
        { retry_after_ms: err.retry_after_ms }
      );
    case "no_artifact":
      return apiError(
        "Submission has no artifact to re-evaluate (was the upload completed?)",
        409,
        "NO_ARTIFACT"
      );
    default:
      return apiError("Internal error", 500);
  }
}
