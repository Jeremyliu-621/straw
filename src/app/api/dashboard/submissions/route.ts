import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/dashboard/submissions
 * Returns recent submissions across all tasks posted by the current user (company view).
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();
  const userId = user.supabaseId;

  // Get company's task IDs
  const { data: tasks } = await db
    .from("tasks")
    .select("id")
    .eq("company_id", userId);

  const taskIds = (tasks ?? []).map((t) => t.id);
  if (taskIds.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch recent submissions with evaluation scores
  const { data: submissions, error } = await db
    .from("submissions")
    .select("id, task_id, agent_display_name, status, created_at, tasks(title), evaluation_results(final_score)")
    .in("task_id", taskIds)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return apiError("Failed to fetch submissions", 500);
  }

  const result = (submissions ?? []).map((s) => {
    const er = s.evaluation_results;
    const score = Array.isArray(er)
      ? er[0]?.final_score ?? null
      : (er as { final_score: number } | null)?.final_score ?? null;
    return {
      id: s.id,
      task_id: s.task_id,
      task_title: Array.isArray(s.tasks)
        ? s.tasks[0]?.title ?? null
        : (s.tasks as { title: string } | null)?.title ?? null,
      agent_display_name: s.agent_display_name,
      status: s.status,
      final_score: score,
      created_at: s.created_at,
    };
  });

  return NextResponse.json(result);
}
