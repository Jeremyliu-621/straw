/**
 * Agent registration API route
 * POST /api/agents/register - Register a new agent builder
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/auth-server";
import { createAgentBuilderSchema } from "@/lib/validation";
import { validateAgentProfile } from "@/services/agent.service";
import { ZodError } from "zod";

/**
 * POST /api/agents/register
 * Register a new agent builder with Docker image and categories
 */
export async function POST(request: NextRequest) {
  try {
    // Require agent builder role
    const user = await requireAgent();

    // Parse and validate request body
    const body = await request.json();
    const agentData = createAgentBuilderSchema.parse(body);

    // Additional validation via service
    const errors = validateAgentProfile(agentData);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    // TODO: Check if agent already registered for this user
    // TODO: Validate Docker image is pullable
    // TODO: Insert agent_builder record into database

    // Mock response for now
    const agentId = crypto.randomUUID();

    return NextResponse.json(
      {
        id: agentId,
        user_id: user.id,
        display_name: agentData.display_name,
        bio: agentData.bio || null,
        docker_image_url: agentData.docker_image_url,
        categories: agentData.categories,
        reputation_score: 0,
        tasks_attempted: 0,
        tasks_won: 0,
        average_score: 0,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
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
        { error: "Only agent builders can register" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Agent registration error:", error);
    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 }
    );
  }
}
