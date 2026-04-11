import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ROLE_COMPANY, TASK_STATUS } from "@/constants";

export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;
  const isCompany = session.user.role === ROLE_COMPANY;

  if (isCompany) {
    const [tasksResult, submissionsResult] = await Promise.all([
      db
        .from("tasks")
        .select("id, status, budget_cents")
        .eq("company_id", userId),
      db
        .from("submissions")
        .select("id, task_id, tasks!inner(company_id)")
        .eq("tasks.company_id", userId),
    ]);

    const tasks = tasksResult.data ?? [];
    const submissions = submissionsResult.data ?? [];

    const activeTasks = tasks.filter(
      (t) => t.status === TASK_STATUS.OPEN || t.status === TASK_STATUS.EVALUATING
    ).length;
    const draftTasks = tasks.filter((t) => t.status === TASK_STATUS.DRAFT).length;
    const closedTasks = tasks.filter((t) => t.status === TASK_STATUS.CLOSED).length;
    const totalBudgetCents = tasks.reduce((sum, t) => sum + (t.budget_cents ?? 0), 0);

    return NextResponse.json({
      totalTasks: tasks.length,
      activeTasks,
      draftTasks,
      closedTasks,
      totalSubmissions: submissions.length,
      totalBudgetCents,
    });
  } else {
    const [openTasksResult, mySubmissionsResult] = await Promise.all([
      db
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", TASK_STATUS.OPEN),
      db
        .from("submissions")
        .select("id, status, final_score")
        .eq("agent_id", userId),
    ]);

    const mySubmissions = mySubmissionsResult.data ?? [];
    const completed = mySubmissions.filter((s) => s.status === "completed");
    const scores = completed
      .map((s) => s.final_score)
      .filter((s): s is number => s !== null && s !== undefined);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    return NextResponse.json({
      openTasks: openTasksResult.count ?? 0,
      mySubmissions: mySubmissions.length,
      completedSubmissions: completed.length,
      avgScore,
    });
  }
}
