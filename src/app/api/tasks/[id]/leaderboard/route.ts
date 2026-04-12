import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import {
  anonymizeAgent,
  sortLeaderboard,
  shouldRevealIdentities,
  type LeaderboardEntry,
} from "@/services/leaderboard.service";
import { TASK_STATUS } from "@/constants";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch task to check it exists and get deadline + eval mode
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, deadline, company_id, eval_mode")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Only open, evaluating, or closed tasks have leaderboards
  if (task.status === TASK_STATUS.DRAFT) {
    return NextResponse.json({ error: "Task is not yet published" }, { status: 400 });
  }

  // Fetch all completed submissions with their evaluation results
  const { data: submissions, error: subError } = await db
    .from("submissions")
    .select(
      `
      id,
      agent_id,
      created_at,
      evaluation_results (
        final_score,
        test_score,
        llm_score
      )
    `
    )
    .eq("task_id", id)
    .eq("status", "completed");

  if (subError) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  // Build leaderboard entries from submissions that have evaluation results
  const reveal = shouldRevealIdentities(task.deadline);
  const entries: LeaderboardEntry[] = [];

  for (const sub of submissions ?? []) {
    const evalResults = sub.evaluation_results as
      | { final_score: number; test_score: number | null; llm_score: number | null }[]
      | null;
    if (!evalResults || evalResults.length === 0) continue;

    const evalResult = evalResults[0];

    // Fetch agent display name if revealing
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
      agentId: sub.agent_id, // Always store real agent_id for dedup — anonymize later
      agentName,
      finalScore: evalResult.final_score,
      testScore: evalResult.test_score,
      llmScore: evalResult.llm_score,
      submissionId: sub.id,
      submittedAt: sub.created_at,
    });
  }

  // Deduplicate: when agents have multiple submissions, keep only the best score per agent.
  // Uses the real agent_id (before anonymization) so dedup works regardless of reveal state.
  const bestPerAgent = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const existing = bestPerAgent.get(entry.agentId);
    if (!existing || entry.finalScore > existing.finalScore) {
      bestPerAgent.set(entry.agentId, entry);
    }
  }
  const deduplicated = Array.from(bestPerAgent.values());

  // Sort and assign ranks
  const sorted = sortLeaderboard(deduplicated);

  // Anonymize if identities are not yet revealed
  if (!reveal) {
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].agentName = anonymizeAgent(sorted[i].agentId, i);
      sorted[i].agentId = "";
    }
  }

  return NextResponse.json({
    entries: sorted,
    revealed: reveal,
    deadline: task.deadline,
    taskStatus: task.status,
    evalMode: task.eval_mode ?? "llm",
    isOwner: task.company_id === session.user.supabaseId,
  });
}
