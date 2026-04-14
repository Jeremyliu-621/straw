import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/submissions/[id]/details — Get evaluation dimensions for a submission.
 * Returns the per-criterion scores and reasoning from the LLM judge.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "submission ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Get the evaluation result for this submission (include container fields)
  const { data: evalResult, error: evalError } = await db
    .from("evaluation_results")
    .select("id, llm_reasoning, container_score, breakdown, eval_mode")
    .eq("submission_id", id)
    .single();

  if (evalError || !evalResult) {
    return NextResponse.json({
      dimensions: [],
      reasoning: null,
      container_score: null,
      breakdown: null,
      eval_mode: null,
    });
  }

  // Get the evaluation dimensions with criterion details
  const { data: dimensions, error: dimError } = await db
    .from("evaluation_dimensions")
    .select(
      `
      score,
      reasoning,
      rubric_criteria (
        name,
        weight
      )
    `
    )
    .eq("evaluation_result_id", evalResult.id);

  if (dimError) {
    return NextResponse.json({
      dimensions: [],
      reasoning: evalResult.llm_reasoning,
      container_score: evalResult.container_score ?? null,
      breakdown: evalResult.breakdown ?? null,
      eval_mode: evalResult.eval_mode ?? null,
    });
  }

  // Format for the frontend
  type DimensionRow = {
    score: number;
    reasoning: string | null;
    rubric_criteria: { name: string; weight: number } | null;
  };

  const formatted = (dimensions as unknown as DimensionRow[])
    .filter((d) => d.rubric_criteria !== null)
    .map((d) => ({
      criterion_name: d.rubric_criteria!.name,
      score: d.score,
      reasoning: d.reasoning,
      weight: d.rubric_criteria!.weight,
    }));

  return NextResponse.json({
    dimensions: formatted,
    reasoning: evalResult.llm_reasoning,
    container_score: evalResult.container_score ?? null,
    breakdown: evalResult.breakdown ?? null,
    eval_mode: evalResult.eval_mode ?? null,
  });
}
