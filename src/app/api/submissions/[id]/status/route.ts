import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/submissions/[id]/status — Poll submission execution/evaluation status.
 * Public endpoint — no auth required (submission IDs are UUIDs, not guessable).
 * Returns status, timestamps, error message, and score breakdown if evaluated.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  const { data: submission, error } = await db
    .from("submissions")
    .select("id, status, started_at, completed_at, error_message, task_id")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Check if evaluation result exists
  const { data: evalResult } = await db
    .from("evaluation_results")
    .select("id, test_score, llm_score, final_score, container_score, breakdown, eval_mode, created_at")
    .eq("submission_id", id)
    .single();

  // Count artifacts
  const { count: artifactCount } = await db
    .from("submission_artifacts")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", id);

  // Calculate leaderboard position if evaluated
  let position: number | null = null;
  if (evalResult) {
    const { count: higherScores } = await db
      .from("evaluation_results")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", id)
      .gt("final_score", evalResult.final_score);

    // Position = number of submissions with higher scores + 1
    // But we need to count across the task, not just this submission
    const { data: taskEvals } = await db
      .from("evaluation_results")
      .select("submission_id, final_score")
      .in(
        "submission_id",
        (await db
          .from("submissions")
          .select("id")
          .eq("task_id", submission.task_id)
        ).data?.map((s) => s.id) ?? []
      )
      .order("final_score", { ascending: false });

    if (taskEvals) {
      const idx = taskEvals.findIndex((e) => e.submission_id === id);
      position = idx >= 0 ? idx + 1 : null;
    }
  }

  return NextResponse.json({
    id: submission.id,
    status: submission.status,
    started_at: submission.started_at,
    completed_at: submission.completed_at,
    error_message: submission.error_message,
    evaluated: !!evalResult,
    scores: evalResult
      ? {
          test_score: evalResult.test_score,
          llm_score: evalResult.llm_score,
          final_score: evalResult.final_score,
          container_score: evalResult.container_score ?? null,
          breakdown: evalResult.breakdown ?? null,
          eval_mode: evalResult.eval_mode ?? null,
          evaluated_at: evalResult.created_at,
        }
      : null,
    artifacts: artifactCount ?? 0,
    position,
  });
}
