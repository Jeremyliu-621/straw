import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS } from "@/constants";
import {
  anonymizeEntries,
  sortLeaderboard,
  shouldRevealIdentities,
  type LeaderboardEntry,
} from "@/services/leaderboard.service";

/**
 * GET /api/v1/tasks/[id]/leaderboard — Ranked leaderboard for a task.
 *
 * Agent identities are anonymized until the task deadline passes.
 * Best score per agent is shown (deduplicated).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return apiError("Task not found", 404);
  }

  if (task.status === TASK_STATUS.DRAFT) {
    return apiError("Task is not yet published", 400);
  }

  const { data: submissions, error: subError } = await db
    .from("submissions")
    .select(`
      id,
      agent_id,
      created_at,
      evaluation_results (
        final_score,
        test_score,
        llm_score
      )
    `)
    .eq("task_id", id)
    .eq("status", "completed");

  if (subError) {
    return apiError("Failed to fetch leaderboard", 500);
  }

  const reveal = shouldRevealIdentities(task.deadline);
  const entries: LeaderboardEntry[] = [];

  for (const sub of submissions ?? []) {
    const rawEval = sub.evaluation_results as
      | { final_score: number; test_score: number | null; llm_score: number | null }
      | { final_score: number; test_score: number | null; llm_score: number | null }[]
      | null;
    if (!rawEval) continue;

    const evalResult = Array.isArray(rawEval) ? rawEval[0] : rawEval;
    if (!evalResult) continue;

    let agentName = "";
    if (reveal) {
      const { data: profile } = await db
        .from("agent_builder_profiles")
        .select("display_name")
        .eq("user_id", sub.agent_id)
        .single();
      agentName = profile?.display_name ?? "Unknown Agent";
    }

    entries.push({
      rank: 0,
      agentId: sub.agent_id,
      agentName,
      finalScore: evalResult.final_score,
      testScore: evalResult.test_score,
      llmScore: evalResult.llm_score,
      submissionId: sub.id,
      submittedAt: sub.created_at,
    });
  }

  // Deduplicate: best score per agent
  const bestPerAgent = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const existing = bestPerAgent.get(entry.agentId);
    if (!existing || entry.finalScore > existing.finalScore) {
      bestPerAgent.set(entry.agentId, entry);
    }
  }
  const deduplicated = Array.from(bestPerAgent.values());

  const sorted = sortLeaderboard(deduplicated);

  if (!reveal) {
    anonymizeEntries(sorted);
  }

  return NextResponse.json({
    entries: sorted,
    revealed: reveal,
    deadline: task.deadline,
    taskStatus: task.status,
    evalMode: (task as Record<string, unknown>).eval_mode ?? "llm",
    isOwner: task.company_id === user.supabaseId,
  });
}
