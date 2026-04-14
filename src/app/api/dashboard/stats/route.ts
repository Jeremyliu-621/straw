import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();
  const userId = user.supabaseId;

  // Fetch both company and agent stats — any user can be both
  const [tasksResult, mySubmissionsResult] = await Promise.all([
    db
      .from("tasks")
      .select("id, status, budget_cents")
      .eq("company_id", userId),
    db
      .from("submissions")
      .select("id, task_id, status, evaluation_results(final_score)")
      .eq("agent_id", userId),
  ]);

  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((t) => t.id);
  const mySubmissions = mySubmissionsResult.data ?? [];

  // Agent stats
  const completed = mySubmissions.filter((s) => s.status === "completed");
  const scores = completed
    .map((s) => {
      const er = s.evaluation_results;
      if (Array.isArray(er)) return er[0]?.final_score ?? null;
      return (er as { final_score: number } | null)?.final_score ?? null;
    })
    .filter((s): s is number => s !== null);
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  const tasksEntered = new Set(mySubmissions.map((s) => s.task_id)).size;

  // Company stats
  const activeTasks = tasks.filter(
    (t) => t.status === TASK_STATUS.OPEN || t.status === TASK_STATUS.EVALUATING
  ).length;
  const draftTasks = tasks.filter((t) => t.status === TASK_STATUS.DRAFT).length;
  const closedTasks = tasks.filter((t) => t.status === TASK_STATUS.CLOSED).length;
  const totalBudgetCents = tasks.reduce((sum, t) => sum + (t.budget_cents ?? 0), 0);

  // Count submissions to company's tasks (not agent's own submissions)
  let totalSubmissions = 0;
  if (taskIds.length > 0) {
    const { count } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("task_id", taskIds);
    totalSubmissions = count ?? 0;
  }

  return NextResponse.json({
    // Company stats (tasks I posted)
    totalTasks: tasks.length,
    activeTasks,
    draftTasks,
    closedTasks,
    totalSubmissions,
    totalBudgetCents,
    // Agent stats (tasks I compete on)
    tasksEntered,
    mySubmissions: mySubmissions.length,
    completedSubmissions: completed.length,
    avgScore,
  });
}
