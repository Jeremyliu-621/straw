import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";

/**
 * GET /api/public/tasks — Public listing of open tasks.
 * No auth required. Returns limited fields for public consumption.
 */
export async function GET() {
  const db = createServiceClient();

  const { data, error } = await db
    .from("tasks")
    .select("id, title, description, category, budget_cents, deadline, status, eval_mode, created_at")
    .eq("status", TASK_STATUS.OPEN)
    .order("deadline", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }

  // Count submissions per task
  const taskIds = (data ?? []).map((t) => t.id);
  const { data: submissionCounts } = await db
    .from("submissions")
    .select("task_id")
    .in("task_id", taskIds.length > 0 ? taskIds : ["__none__"]);

  const countMap = new Map<string, number>();
  for (const s of submissionCounts ?? []) {
    countMap.set(s.task_id, (countMap.get(s.task_id) ?? 0) + 1);
  }

  const tasks = (data ?? []).map((task) => ({
    ...task,
    competitor_count: countMap.get(task.id) ?? 0,
  }));

  return NextResponse.json(tasks);
}
