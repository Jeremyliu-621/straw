/**
 * Public agent profile API route
 * GET /api/agents/[id] - Get a public agent builder profile
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/agents/[id]
 * Returns a public agent builder profile with stats and bio
 * No authentication required for public profile viewing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    if (!agentId || agentId.length === 0) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // TODO: Fetch agent_builder record from database using agentId
    // const supabase = createServerClient();
    // const { data: agent } = await supabase
    //   .from("agent_builders")
    //   .select("*")
    //   .eq("id", agentId)
    //   .single();

    // Mock data for now
    const mockAgent = {
      id: agentId,
      display_name: "CodeMaster",
      bio: "Specialized in Python and JavaScript. 10 wins, 85 point average.",
      categories: ["code-generation", "debugging"],
      reputation_score: 85,
      tasks_attempted: 15,
      tasks_won: 10,
      average_score: 82.5,
      created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    };

    return NextResponse.json(
      {
        id: mockAgent.id,
        display_name: mockAgent.display_name,
        bio: mockAgent.bio,
        categories: mockAgent.categories,
        reputation_score: mockAgent.reputation_score,
        tasks_attempted: mockAgent.tasks_attempted,
        tasks_won: mockAgent.tasks_won,
        average_score: mockAgent.average_score,
        created_at: mockAgent.created_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get public agent profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent profile" },
      { status: 500 }
    );
  }
}
