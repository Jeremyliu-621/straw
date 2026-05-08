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

  // ── ReputationTile extras ─────────────────────────────────
  // bestScore: max final_score across all of the agent's completed submissions.
  // top3Count: count of distinct tasks where the agent placed top 3.
  // bestCategory: dominant category among the agent's completed submissions
  //               (tie-break: most recent submission wins).
  const bestScore = scores.length > 0
    ? Math.round(Math.max(...scores) * 10) / 10
    : null;

  // For top-3, we'd need to know per-task ranking. Cheapest path: for each
  // distinct task with at least one completed submission, fetch the top 3
  // final_score values and check if any of the agent's submissions fall in
  // that set. Run a single query: pull final_score + task_id + agent_id for
  // every completed submission across the tasks the agent has touched.
  const agentTaskIds = Array.from(new Set(completed.map((s) => s.task_id)));
  let top3Count = 0;
  let bestCategory: string | null = null;
  if (agentTaskIds.length > 0) {
    const [rankResult, categoryResult] = await Promise.all([
      db
        .from("submissions")
        .select("task_id, agent_id, evaluation_results(final_score)")
        .in("task_id", agentTaskIds)
        .eq("status", "completed"),
      db
        .from("tasks")
        .select("id, category")
        .in("id", agentTaskIds),
    ]);

    const allScored = (rankResult.data ?? [])
      .map((row) => {
        const er = row.evaluation_results;
        const score = Array.isArray(er)
          ? er[0]?.final_score ?? null
          : (er as { final_score: number } | null)?.final_score ?? null;
        return score == null
          ? null
          : { taskId: row.task_id as string, agentId: row.agent_id as string, score };
      })
      .filter((r): r is { taskId: string; agentId: string; score: number } => r !== null);

    // For each task, sort scores desc, find the top 3, check if the user is in.
    const tasksWithScores = new Map<string, Array<{ agentId: string; score: number }>>();
    for (const row of allScored) {
      if (!tasksWithScores.has(row.taskId)) tasksWithScores.set(row.taskId, []);
      tasksWithScores.get(row.taskId)!.push({ agentId: row.agentId, score: row.score });
    }
    for (const [, scoreList] of tasksWithScores) {
      scoreList.sort((a, b) => b.score - a.score);
      const top3 = scoreList.slice(0, 3);
      if (top3.some((r) => r.agentId === userId)) {
        top3Count += 1;
      }
    }

    // Best category = mode of categories across the agent's completed tasks.
    const categoryById = new Map<string, string>(
      (categoryResult.data ?? []).map((t) => [t.id as string, t.category as string])
    );
    const counts = new Map<string, number>();
    for (const s of completed) {
      const cat = categoryById.get(s.task_id);
      if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    let max = 0;
    for (const [cat, count] of counts) {
      if (count > max) {
        max = count;
        bestCategory = cat;
      }
    }
  }

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
    bestScore,
    top3Count,
    bestCategory,
  });
}
