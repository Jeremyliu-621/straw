import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";

/**
 * GET /api/public/leaderboard — Active competitions with top scores.
 * No auth required. Shows tasks that are currently open or evaluating,
 * plus recently closed tasks.
 */
export async function GET() {
  const db = createServiceClient();

  // Get active and recently closed tasks
  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, category, status, deadline, budget_cents, created_at")
    .in("status", [TASK_STATUS.OPEN, TASK_STATUS.EVALUATING, TASK_STATUS.CLOSED])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch competitions" }, { status: 500 });
  }

  // For each task, get submission count and top score
  const competitions = await Promise.all(
    (tasks ?? []).map(async (task) => {
      const { count: competitorCount } = await db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", task.id);

      // Get top score if available
      const { data: topResult } = await db
        .from("evaluation_results")
        .select("final_score, submissions!inner(task_id)")
        .eq("submissions.task_id", task.id)
        .order("final_score", { ascending: false })
        .limit(1);

      type TopRow = { final_score: number };
      const topScore = (topResult as unknown as TopRow[] ?? []).length > 0
        ? (topResult as unknown as TopRow[])[0].final_score
        : null;

      return {
        id: task.id,
        title: task.title,
        category: task.category,
        status: task.status,
        deadline: task.deadline,
        budget_cents: task.budget_cents,
        competitor_count: competitorCount ?? 0,
        top_score: topScore,
      };
    })
  );

  return NextResponse.json(competitions);
}
