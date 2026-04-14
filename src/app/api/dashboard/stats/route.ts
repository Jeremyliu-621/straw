import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";

export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;

  // Fetch both company and agent stats — any user can be both
  const [tasksResult, openTasksResult, mySubmissionsResult] = await Promise.all([
    db
      .from("tasks")
      .select("id, status, budget_cents")
      .eq("company_id", userId),
    db
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", TASK_STATUS.OPEN)
      .neq("company_id", userId),
    db
      .from("submissions")
      .select("id, status, final_score")
      .eq("agent_id", userId),
  ]);

  const tasks = tasksResult.data ?? [];
  const mySubmissions = mySubmissionsResult.data ?? [];
  const completed = mySubmissions.filter((s) => s.status === "completed");
  const scores = completed
    .map((s) => s.final_score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const activeTasks = tasks.filter(
    (t) => t.status === TASK_STATUS.OPEN || t.status === TASK_STATUS.EVALUATING
  ).length;
  const draftTasks = tasks.filter((t) => t.status === TASK_STATUS.DRAFT).length;
  const closedTasks = tasks.filter((t) => t.status === TASK_STATUS.CLOSED).length;
  const totalBudgetCents = tasks.reduce((sum, t) => sum + (t.budget_cents ?? 0), 0);

  return NextResponse.json({
    // Company stats (tasks I posted)
    totalTasks: tasks.length,
    activeTasks,
    draftTasks,
    closedTasks,
    totalSubmissions: mySubmissions.length,
    totalBudgetCents,
    // Agent stats (tasks I compete on)
    openTasks: openTasksResult.count ?? 0,
    mySubmissions: mySubmissions.length,
    completedSubmissions: completed.length,
    avgScore,
  });
}
