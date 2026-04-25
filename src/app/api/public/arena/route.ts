import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS, SUBMISSION_STATUS } from "@/constants";
import {
  anonymizeAgent,
  shouldRevealIdentities,
} from "@/services/leaderboard.service";

const ARENA_MAX_AGENTS = 20;

/**
 * GET /api/public/arena — Agents with submission status for the 3D arena.
 *
 * Without a query string, returns up to 20 agents across active (open /
 * evaluating) competitions ranked by best score.
 *
 * With `?taskId=<uuid>`, filters to agents that submitted to that specific
 * task. Ranks + names mirror the task's leaderboard (same anonymization
 * rule, same ordering) so the arena labels always match what the
 * leaderboard would show. Agents without a completed+scored submission
 * still appear in the arena but have `rank: null` and `displayName: null`
 * so the client can render them unlabeled.
 */
export async function GET(request: Request) {
  const db = createServiceClient();
  const url = new URL(request.url);
  const taskIdFilter = url.searchParams.get("taskId");

  let tasks: { id: string; title: string; deadline: string }[] | null;
  let taskError: unknown;

  if (taskIdFilter) {
    const { data, error } = await db
      .from("tasks")
      .select("id, title, deadline")
      .eq("id", taskIdFilter)
      .limit(1);
    tasks = data;
    taskError = error;
  } else {
    const { data, error } = await db
      .from("tasks")
      .select("id, title, deadline")
      .in("status", [TASK_STATUS.OPEN, TASK_STATUS.EVALUATING])
      .order("created_at", { ascending: false })
      .limit(10);
    tasks = data;
    taskError = error;
  }

  if (taskError || !tasks || tasks.length === 0) {
    return NextResponse.json({ agents: [] });
  }

  const taskIds = tasks.map((t) => t.id);
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));

  const { data: submissions, error: subError } = await db
    .from("submissions")
    .select(
      "id, task_id, agent_id, status, created_at, completed_at, evaluation_results(final_score)"
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

  type Agg = {
    agentId: string;
    taskId: string;
    bestScore: number | null;
    /** created_at of the submission that produced bestScore — used for tiebreaking
        to match leaderboard ordering. */
    bestScoreCreatedAt: string | null;
    latestStatus: string | null;
    taskTitle: string;
  };

  const agentMap = new Map<string, Agg>();

  for (const sub of rows) {
    const agentId = sub.agent_id as string;
    const taskId = sub.task_id as string;
    const existing = agentMap.get(agentId);

    type EvalRow = { final_score: number };
    // Supabase's join can return this as either an object or a 1-element array
    // depending on the relationship metadata; handle both like the leaderboard route does.
    const rawEval = sub.evaluation_results as unknown as EvalRow | EvalRow[] | null;
    const evalResult = Array.isArray(rawEval) ? rawEval[0] ?? null : rawEval;
    const score = evalResult ? evalResult.final_score : null;
    const createdAt = sub.created_at as string;

    if (!existing) {
      agentMap.set(agentId, {
        agentId,
        taskId,
        bestScore: score,
        bestScoreCreatedAt: score !== null ? createdAt : null,
        latestStatus: sub.status as string,
        taskTitle: taskById[taskId]?.title ?? "Unknown",
      });
    } else {
      if (score !== null) {
        if (existing.bestScore === null || score > existing.bestScore) {
          existing.bestScore = score;
          existing.bestScoreCreatedAt = createdAt;
        } else if (
          score === existing.bestScore &&
          existing.bestScoreCreatedAt &&
          new Date(createdAt).getTime() <
            new Date(existing.bestScoreCreatedAt).getTime()
        ) {
          // Same score, earlier submission — matches leaderboard tiebreaker.
          existing.bestScoreCreatedAt = createdAt;
        }
      }
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

  // Split: on-leaderboard (has a score) vs off-leaderboard (no completed score yet).
  // Leaderboard ranks by score desc, tiebreaker earliest created_at.
  const scored = [...agentMap.values()].filter((a) => a.bestScore !== null);
  const unscored = [...agentMap.values()].filter((a) => a.bestScore === null);

  scored.sort((a, b) => {
    const sb = b.bestScore ?? -Infinity;
    const sa = a.bestScore ?? -Infinity;
    if (sb !== sa) return sb - sa;
    const ta = a.bestScoreCreatedAt
      ? new Date(a.bestScoreCreatedAt).getTime()
      : Infinity;
    const tb = b.bestScoreCreatedAt
      ? new Date(b.bestScoreCreatedAt).getTime()
      : Infinity;
    return ta - tb;
  });

  const combined = [...scored, ...unscored].slice(0, ARENA_MAX_AGENTS);

  // Fetch display names
  const agentIds = combined.map((a) => a.agentId);
  const { data: profiles } = await db
    .from("agent_builder_profiles")
    .select("user_id, display_name")
    .in("user_id", agentIds);

  const nameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p.display_name])
  );

  // Reveal rule is per-task. For taskId-scoped queries the task is known;
  // for the global arena we evaluate each agent's task.
  const revealByTask = new Map<string, boolean>(
    tasks.map((t) => [t.id, shouldRevealIdentities(t.deadline)])
  );

  const agents = combined.map((a, idx) => {
    const onLeaderboard = a.bestScore !== null;
    const rank = onLeaderboard ? scored.findIndex((s) => s.agentId === a.agentId) + 1 : null;
    const reveal = revealByTask.get(a.taskId) ?? false;

    let displayName: string | null;
    if (!onLeaderboard) {
      displayName = null;
    } else if (reveal) {
      displayName = nameById[a.agentId] ?? "Anonymous Agent";
    } else {
      displayName = anonymizeAgent(a.agentId, (rank ?? idx + 1) - 1);
    }

    // Before the reveal deadline, emit a synthetic per-position id so
    // clients keep a stable React key / state anchor without learning
    // the real agent UUID. An agent can identify themselves from a UUID
    // they already know (returned at submission creation); matching the
    // leaderboard route's anonymisation here closes the same gap.
    const publicId = reveal
      ? a.agentId
      : rank !== null
        ? `anon-rank-${rank}`
        : `anon-idx-${idx}`;

    return {
      id: publicId,
      displayName,
      rank,
      latestStatus: a.latestStatus,
      score: a.bestScore,
      taskTitle: a.taskTitle,
    };
  });

  const response = NextResponse.json({ agents });
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=30"
  );
  return response;
}
