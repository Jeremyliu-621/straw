import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS, SUBMISSION_STATUS } from "@/constants";

const ARENA_MAX_AGENTS = 20;

/**
 * GET /api/public/arena — Top agents with submission status for the 3D arena.
 * No auth required. Returns up to 20 agents across active competitions,
 * ranked by their best score.
 */
export async function GET() {
  const db = createServiceClient();

  const { data: tasks, error: taskError } = await db
    .from("tasks")
    .select("id, title")
    .in("status", [TASK_STATUS.OPEN, TASK_STATUS.EVALUATING])
    .order("created_at", { ascending: false })
    .limit(10);

  if (taskError || !tasks || tasks.length === 0) {
    return NextResponse.json({ agents: [] });
  }

  const taskIds = tasks.map((t) => t.id);
  const taskTitleById = Object.fromEntries(tasks.map((t) => [t.id, t.title]));

  const { data: submissions, error: subError } = await db
    .from("submissions")
    .select(
      "id, task_id, agent_id, status, completed_at, evaluation_results(final_score)"
    )
    .in("task_id", taskIds)
    .order("completed_at", { ascending: false });

  if (subError) {
    return NextResponse.json(
      { error: "Failed to fetch arena data" },
      { status: 500 }
    );
  }

  const rows = submissions ?? [];

  // Group by agent, pick best score and latest status
  const agentMap = new Map<
    string,
    {
      agentId: string;
      bestScore: number | null;
      latestStatus: string | null;
      taskTitle: string;
    }
  >();

  for (const sub of rows) {
    const agentId = sub.agent_id as string;
    const existing = agentMap.get(agentId);

    type EvalRow = { final_score: number };
    const evalResults = sub.evaluation_results as unknown as EvalRow[] | null;
    const score =
      evalResults && evalResults.length > 0 ? evalResults[0].final_score : null;

    if (!existing) {
      agentMap.set(agentId, {
        agentId,
        bestScore: score,
        latestStatus: sub.status as string,
        taskTitle: taskTitleById[sub.task_id as string] ?? "Unknown",
      });
    } else {
      if (score !== null && (existing.bestScore === null || score > existing.bestScore)) {
        existing.bestScore = score;
      }
      // Prefer active statuses over completed ones for display
      const activeStatuses = [
        SUBMISSION_STATUS.RUNNING,
        SUBMISSION_STATUS.PENDING,
        SUBMISSION_STATUS.REGISTERED,
      ];
      if (activeStatuses.includes(sub.status as typeof activeStatuses[number])) {
        existing.latestStatus = sub.status as string;
      }
    }
  }

  // Sort by best score descending, then by agent id for stability
  const sorted = [...agentMap.values()]
    .sort((a, b) => {
      if (a.bestScore === null && b.bestScore === null) return 0;
      if (a.bestScore === null) return 1;
      if (b.bestScore === null) return -1;
      return b.bestScore - a.bestScore;
    })
    .slice(0, ARENA_MAX_AGENTS);

  // Fetch display names
  const agentIds = sorted.map((a) => a.agentId);
  const { data: profiles } = await db
    .from("agent_builder_profiles")
    .select("user_id, display_name")
    .in("user_id", agentIds);

  const nameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p.display_name])
  );

  const agents = sorted.map((a) => ({
    id: a.agentId,
    displayName: nameById[a.agentId] ?? "Anonymous Agent",
    latestStatus: a.latestStatus,
    score: a.bestScore,
    taskTitle: a.taskTitle,
  }));

  const response = NextResponse.json({ agents });
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=30"
  );
  return response;
}
