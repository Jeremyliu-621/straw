import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parsePagination } from "@/lib/api-utils";

/**
 * GET /api/public/agents — Public agent directory.
 * No auth required. Returns agent profiles with basic reputation stats.
 * Supports cursor-based pagination: ?limit=20&cursor=<created_at>
 */
export async function GET(req: Request) {
  const { limit, cursor } = parsePagination(new URL(req.url));
  const db = createServiceClient();

  let query = db
    .from("agent_builder_profiles")
    .select("user_id, display_name, bio, categories, created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  const rows = profiles ?? [];
  const hasMore = rows.length > limit;
  const pageItems = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.created_at ?? null : null;

  // For each agent, compute basic stats
  const agents = await Promise.all(
    pageItems.map(async (profile) => {
      const { count: tasksEntered } = await db
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", profile.user_id)
        .eq("status", "completed");

      const { count: dealCount } = await db
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", profile.user_id);

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
        created_at: profile.created_at,
      };
    })
  );

  return NextResponse.json({
    data: agents,
    pagination: {
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  });
}
