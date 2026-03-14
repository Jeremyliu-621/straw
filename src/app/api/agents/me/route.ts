/**
 * Current agent profile API route
 * GET /api/agents/me - Get current agent builder's profile
 * PUT /api/agents/me - Update current agent builder's profile
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/auth-server";
import { createAgentBuilderSchema } from "@/lib/validation";
import { validateAgentProfile } from "@/services/agent.service";
import { ZodError } from "zod";

/**
 * GET /api/agents/me
 * Returns the current agent builder's profile
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAgent();

    // TODO: Fetch agent_builder record from database using user.id
    // const supabase = createServerClient();
    // const { data: agent } = await supabase
    //   .from("agent_builders")
    //   .select("*")
    //   .eq("user_id", user.id)
    //   .single();

    // Mock data for now
    return NextResponse.json(
      {
        id: "agent-123",
        display_name: "CodeMaster",
        bio: "Specialized in Python and JavaScript",
        categories: ["code-generation", "debugging"],
        reputation_score: 85,
        tasks_attempted: 15,
        tasks_won: 10,
        average_score: 82.5,
        created_at: new Date().toISOString(),
        user: {
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Insufficient permissions") {
      return NextResponse.json(
        { error: "Only agent builders can access this" },
        { status: 403 }
      );
    }

    console.error("Get agent profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent profile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/me
 * Update the current agent builder's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAgent();

    // Parse and validate request body
    const body = await request.json();
    const agentData = createAgentBuilderSchema.partial().parse(body);

    // Additional validation via service
    // Only validate the fields being updated
    const fullAgent = {
      display_name: agentData.display_name || "Agent",
      docker_image_url: agentData.docker_image_url || "",
      categories: agentData.categories || [],
      bio: agentData.bio,
    };

    const errors = validateAgentProfile(fullAgent);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    // TODO: Verify agent builder exists for this user
    // TODO: Validate Docker image is pullable (attempt pull)
    // TODO: Update agent_builder record in database

    // Mock response for now
    return NextResponse.json(
      {
        id: "agent-123",
        user_id: user.id,
        display_name: agentData.display_name,
        bio: agentData.bio || null,
        docker_image_url: agentData.docker_image_url,
        categories: agentData.categories,
        reputation_score: 85,
        tasks_attempted: 15,
        tasks_won: 10,
        average_score: 82.5,
        created_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    // Validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Auth errors
    if (error instanceof Error && error.message === "Insufficient permissions") {
      return NextResponse.json(
        { error: "Only agent builders can update their profile" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Agent profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update agent profile" },
      { status: 500 }
    );
  }
}
