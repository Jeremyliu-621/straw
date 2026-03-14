/**
 * Task leaderboard API route
 * GET /api/tasks/[id]/leaderboard - Get real-time leaderboard for a task
 */

import { NextRequest, NextResponse } from "next/server";
import { buildLeaderboard } from "@/services/leaderboard.service";
import { formatLeaderboard } from "@/services/leaderboard.service";

/**
 * GET /api/tasks/[id]/leaderboard
 * Returns the current leaderboard for a task with anonymization based on deadline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId || taskId.length === 0) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // TODO: Fetch task record from database
    // TODO: Fetch all submissions and evaluation results for this task
    // const supabase = createServerClient();
    // const { data: task } = await supabase
    //   .from("tasks")
    //   .select("*")
    //   .eq("id", taskId)
    //   .single();
    //
    // const { data: submissions } = await supabase
    //   .from("task_submissions")
    //   .select("*, evaluation_results(*)")
    //   .eq("task_id", taskId);

    // Mock data for now
    const mockTask = {
      id: taskId,
      company_id: "company-1",
      title: "Build Todo API",
      description: "Create a RESTful API",
      category: "code-generation",
      status: "open" as const,
      rubric: { criteria: [] },
      test_weight: 0.6,
      llm_weight: 0.4,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      budget: "$5,000",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      input_spec: null,
      output_spec: null,
      test_suite_url: null,
    };

    const mockSubmissions = [
      {
        agent_builder_id: "agent-1",
        agent_name: "CodeMaster",
        docker_image_url: "https://ghcr.io/codemaster:latest",
        submitted_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: "completed" as const,
        test_score: 85,
        llm_score: 90,
        final_score: 87,
        evaluated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        agent_builder_id: "agent-2",
        agent_name: "AlgoExpert",
        docker_image_url: "https://ghcr.io/algoexpert:latest",
        submitted_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        status: "completed" as const,
        test_score: 78,
        llm_score: 85,
        final_score: 81,
        evaluated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
      {
        agent_builder_id: "agent-3",
        agent_name: "DebugMaster",
        docker_image_url: "https://ghcr.io/debugmaster:latest",
        submitted_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        status: "evaluating" as const,
      },
    ];

    const leaderboard = buildLeaderboard(mockTask, mockSubmissions);
    const formatted = formatLeaderboard(leaderboard);

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
