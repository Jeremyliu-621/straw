import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  calculateWinRate,
  calculateAverageScore,
  deriveCategories,
  type ReputationStats,
  type CompetitionHistoryEntry,
} from "@/services/reputation.service";

/**
 * GET /api/agents/[id] — Public agent profile with reputation stats.
 * No auth required — this is a public page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  // Fetch agent profile
  const { data: profile, error: profileError } = await db
    .from("agent_builder_profiles")
    .select("user_id, display_name, bio, github_url, categories")
    .eq("user_id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Fetch all submissions by this agent with their evaluation results and task info
  const { data: submissions } = await db
    .from("submissions")
    .select(
      `
      id,
      task_id,
      status,
      created_at,
      evaluation_results (
        final_score
      ),
      tasks (
        id,
        title,
        category,
        status,
        deadline
      )
    `
    )
    .eq("agent_id", id)
    .eq("status", "completed");

  // Fetch deals where this agent won
  const { data: deals } = await db
    .from("deals")
    .select("deal_type")
    .eq("agent_id", id);

  // Calculate stats
  type SubRow = {
    id: string;
    task_id: string;
    created_at: string;
    evaluation_results: { final_score: number } | { final_score: number }[] | null;
    tasks: { id: string; title: string; category: string; status: string; deadline: string } | { id: string; title: string; category: string; status: string; deadline: string }[] | null;
  };

  const completedSubs = (submissions ?? []) as unknown as SubRow[];
  const scores: number[] = [];
  const historyEntries: { category: string; won: boolean }[] = [];
  const competitionHistory: CompetitionHistoryEntry[] = [];

  // Compute per-task rank for this agent
  for (const sub of completedSubs) {
    const evalResults = sub.evaluation_results;
    let task = sub.tasks;
    if (Array.isArray(task)) {
       task = task[0]
    }
    if (!evalResults || !task) continue;

    let score = 0;
    if (Array.isArray(evalResults)) {
      if (evalResults.length === 0) continue;
      score = evalResults[0].final_score;
    } else {
      score = evalResults.final_score;
    }

    scores.push(score);

    // Get all scores for this task to determine rank
    const { data: taskSubs } = await db
      .from("submissions")
      .select("agent_id, evaluation_results(final_score)")
      .eq("task_id", sub.task_id)
      .eq("status", "completed");

    type TaskSubRow = { agent_id: string; evaluation_results: { final_score: number }[] | null };
    const allScores = ((taskSubs ?? []) as TaskSubRow[])
      .filter((s) => s.evaluation_results && s.evaluation_results.length > 0)
      .map((s) => ({
        agentId: s.agent_id,
        score: s.evaluation_results![0].final_score,
      }))
      .sort((a, b) => b.score - a.score);

    const rank = allScores.findIndex((s) => s.agentId === id) + 1;
    const won = rank === 1;

    historyEntries.push({ category: task.category, won });
    competitionHistory.push({
      taskId: task.id,
      taskTitle: task.title,
      rank,
      totalCompetitors: allScores.length,
      finalScore: score,
      category: task.category,
      completedAt: task.deadline,
      won,
    });
  }

  const outputPurchases = (deals ?? []).filter(
    (d: { deal_type: string }) => d.deal_type === "output_purchase"
  ).length;
  const agentHires = (deals ?? []).filter(
    (d: { deal_type: string }) => d.deal_type === "agent_hire"
  ).length;

  const tasksWon = historyEntries.filter((e) => e.won).length;

  const stats: ReputationStats = {
    tasksEntered: completedSubs.length,
    tasksWon,
    winRate: calculateWinRate(tasksWon, completedSubs.length),
    averageScore: calculateAverageScore(scores),
    outputPurchases,
    agentHires,
    categories: deriveCategories(historyEntries),
  };

  return NextResponse.json({
    profile: {
      id: profile.user_id,
      displayName: profile.display_name,
      bio: profile.bio,
      githubUrl: profile.github_url,
      categories: profile.categories,
    },
    stats,
    history: competitionHistory.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
  });
}
