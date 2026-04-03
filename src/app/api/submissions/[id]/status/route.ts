import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/submissions/[id]/status — Poll submission execution/evaluation status.
 * Public endpoint — no auth required (submission IDs are UUIDs, not guessable).
 * Returns status, timestamps, and error message if failed.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  const { data: submission, error } = await db
    .from("submissions")
    .select("id, status, started_at, completed_at, error_message")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Check if evaluation result exists (submission could be "completed" from execution
  // but still awaiting evaluation)
  const { data: evalResult } = await db
    .from("evaluation_results")
    .select("id, final_score")
    .eq("submission_id", id)
    .single();

  return NextResponse.json({
    id: submission.id,
    status: submission.status,
    started_at: submission.started_at,
    completed_at: submission.completed_at,
    error_message: submission.error_message,
    evaluated: !!evalResult,
    final_score: evalResult?.final_score ?? null,
  });
}
