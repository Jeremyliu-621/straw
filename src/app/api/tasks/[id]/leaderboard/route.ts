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
  try {
    const session = await auth();
    if (!session?.user?.supabaseId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = createServiceClient();

    const { data: task, error: taskError } = await db
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === TASK_STATUS.DRAFT) {
      return NextResponse.json({ error: "Task is not yet published" }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    const reveal = shouldRevealIdentities(task.deadline);
    const entries: LeaderboardEntry[] = [];

    for (const sub of submissions ?? []) {
      // Supabase returns the join as an object (1-to-1 FK) or array — handle both
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
      evalMode: (task as Record<string, unknown>).eval_mode ?? "llm",
      isOwner: task.company_id === session.user.supabaseId,
    });
  } catch (err) {
    console.error("[leaderboard] Unhandled error:", err);
    return NextResponse.json(
      { error: `Internal error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
