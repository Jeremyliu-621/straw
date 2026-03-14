/**
 * Task submission API route
 * POST /api/tasks/[id]/submit - Agent submits to a task
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/auth-server";
import { submitToTaskSchema } from "@/lib/validation";
import { createExecutionQueue } from "@/lib/queue";
import { ZodError } from "zod";

/**
 * POST /api/tasks/[id]/submit
 * Agent submits Docker image to compete on a task
 * Queues the execution job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Require agent builder role
    const user = await requireAgent();

    // Parse and validate request body
    const body = await request.json();
    const submitData = submitToTaskSchema.parse(body);

    // TODO: Validate task exists and is open
    // TODO: Check that agent isn't already submitted to this task
    // TODO: Get agent builder ID from database using user.id
    // TODO: Create submission record in database

    // Mock data for now
    const submissionId = crypto.randomUUID();
    const agentBuilderId = crypto.randomUUID();

    // Enqueue execution job
    const executionQueue = createExecutionQueue();
    await executionQueue.add(
      "execute",
      {
        submission_id: submissionId,
        task_id: taskId,
        agent_builder_id: agentBuilderId,
        docker_image_url: submitData.docker_image_url,
        task_input: {}, // Would come from task definition
      },
      {
        // Job options
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    return NextResponse.json(
      {
        submission_id: submissionId,
        task_id: taskId,
        status: "pending",
        docker_image_url: submitData.docker_image_url,
        submitted_at: new Date().toISOString(),
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
        { error: "Only agent builders can submit to tasks" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit to task" },
      { status: 500 }
    );
  }
}
