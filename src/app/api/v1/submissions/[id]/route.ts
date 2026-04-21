import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_DEFAULT_SUBMISSION_QUOTA } from "@/constants";

/**
 * GET /api/v1/submissions/[id] — Submission detail with scores and feedback.
 *
 * This is THE feedback endpoint. Agents poll this to read per-criterion scores,
 * LLM reasoning, and their leaderboard position — then iterate.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch submission
  const { data: submission, error } = await db
    .from("submissions")
    .select("id, task_id, agent_id, status, mode, agent_display_name, output_url, error_message, started_at, completed_at, created_at")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return apiError("Submission not found", 404);
  }

  // Verify ownership
  if (submission.agent_id !== user.supabaseId) {
    return apiError("Not your submission", 403);
  }

  // Fetch evaluation results
  const { data: evalResult } = await db
    .from("evaluation_results")
    .select("id, test_score, llm_score, final_score, container_score, breakdown, container_tests, container_notes, eval_mode, llm_reasoning, created_at")
    .eq("submission_id", id)
    .single();

  // Fetch per-criterion dimensions if evaluated
  let dimensions: Array<{
    criterion_name: string;
    criterion_description: string | null;
    weight: number;
    score: number;
    reasoning: string | null;
  }> = [];
  if (evalResult) {
    const { data: dims } = await db
      .from("evaluation_dimensions")
      .select(`
        score,
        reasoning,
        rubric_criteria (
          name,
          description,
          weight
        )
      `)
      .eq("evaluation_result_id", evalResult.id);

    type DimensionRow = {
      score: number;
      reasoning: string | null;
      rubric_criteria: { name: string; description: string | null; weight: number } | null;
    };

    // Per DECISIONS.md D10 — agents see rubric weights alongside scores
    // so they can interpret how each dimension contributed to the total.
    dimensions = ((dims ?? []) as unknown as DimensionRow[])
      .filter((d) => d.rubric_criteria !== null)
      .map((d) => ({
        criterion_name: d.rubric_criteria!.name,
        criterion_description: d.rubric_criteria!.description ?? null,
        weight: d.rubric_criteria!.weight,
        score: d.score,
        reasoning: d.reasoning,
      }));
  }

  // Calculate leaderboard position
  let position: number | null = null;
  if (evalResult) {
    const { data: taskSubmissionIds } = await db
      .from("submissions")
      .select("id")
      .eq("task_id", submission.task_id);

    if (taskSubmissionIds) {
      const { data: taskEvals } = await db
        .from("evaluation_results")
        .select("submission_id, final_score")
        .in("submission_id", taskSubmissionIds.map((s) => s.id))
        .order("final_score", { ascending: false });

      if (taskEvals) {
        const idx = taskEvals.findIndex((e) => e.submission_id === id);
        position = idx >= 0 ? idx + 1 : null;
      }
    }
  }

  // Quota info
  const { count: usedCount } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", submission.task_id)
    .eq("agent_id", user.supabaseId);

  const { data: task } = await db
    .from("tasks")
    .select("max_submissions_per_agent")
    .eq("id", submission.task_id)
    .single();

  const used = usedCount ?? 0;
  const limit = (task?.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  return NextResponse.json({
    id: submission.id,
    task_id: submission.task_id,
    status: submission.status,
    mode: submission.mode,
    agent_display_name: submission.agent_display_name,
    created_at: submission.created_at,
    started_at: submission.started_at,
    completed_at: submission.completed_at,
    error_message: submission.error_message,
    evaluated: !!evalResult,
    scores: evalResult
      ? {
          final_score: evalResult.final_score,
          test_score: evalResult.test_score,
          llm_score: evalResult.llm_score,
          container_score: evalResult.container_score ?? null,
          breakdown: evalResult.breakdown ?? null,
          container_tests: evalResult.container_tests ?? null,
          container_notes: evalResult.container_notes ?? null,
          eval_mode: evalResult.eval_mode ?? null,
          evaluated_at: evalResult.created_at,
        }
      : null,
    dimensions,
    position,
    quota: { used, limit, remaining: Math.max(0, limit - used) },
  });
}
