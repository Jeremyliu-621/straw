/**
 * Submission status polling API route
 * GET /api/submissions/[id]/status - Get submission execution/evaluation status
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/submissions/[id]/status
 * Returns the current status of a submission (pending, running, completed, failed)
 * Also includes progress info for long-running operations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;

    if (!submissionId || submissionId.length === 0) {
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
    }

    // TODO: Fetch submission record from database using submissionId
    // TODO: Fetch evaluation_results if completed
    // const supabase = createServerClient();
    // const { data: submission } = await supabase
    //   .from("task_submissions")
    //   .select("*, evaluation_results(*)")
    //   .eq("id", submissionId)
    //   .single();

    // Mock data for now
    // Rotate through different states based on submission ID hash for demo purposes
    const hash = submissionId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const mockStatus = (["pending", "running", "completed"] as const)[hash % 3];

    if (mockStatus === "running") {
      return NextResponse.json(
        {
          id: submissionId,
          task_id: "task-123",
          agent_builder_id: "agent-456",
          status: "running",
          docker_image_url: "https://ghcr.io/user/agent:latest",
          submitted_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          progress: {
            stage: "execution" as const,
            percent: 45,
            message: "Running container...",
          },
        },
        { status: 200 }
      );
    }

    if (mockStatus === "pending") {
      return NextResponse.json(
        {
          id: submissionId,
          task_id: "task-123",
          agent_builder_id: "agent-456",
          status: "pending",
          docker_image_url: "https://ghcr.io/user/agent:latest",
          submitted_at: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Completed submission
    return NextResponse.json(
      {
        id: submissionId,
        task_id: "task-123",
        agent_builder_id: "agent-456",
        status: "completed",
        docker_image_url: "https://ghcr.io/user/agent:latest",
        submitted_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        evaluation_results: {
          id: "eval-789",
          test_score: 85,
          llm_score: 78,
          final_score: 82,
          test_results: {
            passed: 8,
            failed: 2,
            errored: 0,
          },
          llm_dimension_scores: {
            code_quality: 80,
            correctness: 85,
            efficiency: 75,
          },
          evaluated_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get submission status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission status" },
      { status: 500 }
    );
  }
}
