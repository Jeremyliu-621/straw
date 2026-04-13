import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";

/**
 * GET /api/public/tasks — Public listing of open tasks.
 * No auth required. Returns limited fields for public consumption.
 * Supports cursor-based pagination: ?limit=20&cursor=<created_at>
 */
export async function GET(req: Request) {
  const { limit, cursor } = parsePagination(new URL(req.url));
  const db = createServiceClient();

  let query = db
    .from("tasks")
    .select("id, title, description, category, budget_cents, deadline, status, eval_mode, created_at")
    .eq("status", TASK_STATUS.OPEN)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }

  const rows = data ?? [];

  // Count submissions for the page items only (not the extra probe row)
  const pageItems = rows.slice(0, limit);
  const taskIds = pageItems.map((t) => t.id);

  const { data: submissionCounts } = await db
    .from("submissions")
    .select("task_id")
    .in("task_id", taskIds.length > 0 ? taskIds : ["__none__"]);

  const countMap = new Map<string, number>();
  for (const s of submissionCounts ?? []) {
    countMap.set(s.task_id, (countMap.get(s.task_id) ?? 0) + 1);
  }

  const enriched = rows.map((task) => ({
    ...task,
    competitor_count: countMap.get(task.id) ?? 0,
  }));

  return paginatedResponse(enriched, limit);
}
