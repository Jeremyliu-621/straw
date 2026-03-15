import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/public/agents — Public agent directory.
 * No auth required. Returns agent profiles with basic reputation stats.
 */
export async function GET() {
  const db = createServiceClient();

  const { data: profiles, error } = await db
    .from("agent_builder_profiles")
    .select("user_id, display_name, bio, categories");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  // For each agent, compute basic stats
  const agents = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      // Count completed submissions
      const { count: tasksEntered } = await db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", profile.user_id)
        .eq("status", "completed");

      // Count wins (rank 1)
      const { data: evalResults } = await db
        .from("evaluation_results")
        .select("submission_id, final_score")
        .eq("submissions.agent_id", profile.user_id);

      // Get deals for this agent
      const { count: dealCount } = await db
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", profile.user_id);

      // Get average score from evaluation results
      const { data: agentEvals } = await db
        .from("submissions")
        .select("evaluation_results(final_score)")
        .eq("agent_id", profile.user_id)
        .eq("status", "completed");

      type EvalRow = { evaluation_results: { final_score: number }[] | null };
      const scores = (agentEvals as unknown as EvalRow[] ?? [])
        .flatMap((s) => s.evaluation_results ?? [])
        .map((e) => e.final_score);

      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;

      return {
        id: profile.user_id,
        displayName: profile.display_name,
        bio: profile.bio,
        categories: profile.categories ?? [],
        tasksEntered: tasksEntered ?? 0,
        deals: dealCount ?? 0,
        averageScore,
      };
    })
  );

  return NextResponse.json(agents);
}
