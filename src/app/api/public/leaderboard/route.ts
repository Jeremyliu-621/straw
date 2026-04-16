import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";

/**
 * GET /api/public/leaderboard — Active competitions with top scores.
 * No auth required. Shows tasks that are currently open or evaluating,
 * plus recently closed tasks.
 * Supports cursor-based pagination: ?limit=20&cursor=<created_at>
 */
export async function GET(req: Request) {
  const { limit, cursor } = parsePagination(new URL(req.url));
  const db = createServiceClient();

  let query = db
    .from("tasks")
    .select("id, title, category, status, deadline, budget_cents, created_at")
    .in("status", [TASK_STATUS.OPEN, TASK_STATUS.EVALUATING, TASK_STATUS.CLOSED])
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch competitions" }, { status: 500 });
  }

  const rows = tasks ?? [];
  const pageItems = rows.slice(0, limit);

  // For each task, get submission count and top score
  const competitions = await Promise.all(
    pageItems.map(async (task) => {
      const { count: competitorCount } = await db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", task.id);

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
        ...task,
        competitor_count: competitorCount ?? 0,
        top_score: topScore,
      };
    })
  );

  const response = paginatedResponse(competitions, limit);
  // Public anonymous browse of active competitions. Top score changes as
  // submissions complete; keep TTL short so the landing-page browse feels live.
  // Fresh for 15s, serve-stale-while-revalidate up to 1min.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=15, stale-while-revalidate=60"
  );
  return response;
}
