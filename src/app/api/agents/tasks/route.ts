/**
 * Agent task feed API route
 * GET /api/agents/tasks - Get eligible open tasks for current agent
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/auth-server";
import { getEligibleTasks } from "@/services/agent.service";

/**
 * GET /api/agents/tasks
 * Returns all open tasks the agent is eligible for (by category)
 * Sorted by deadline (closest first)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAgent();

    // TODO: Get agent builder record from database using user.id
    // TODO: Get all open tasks from database
    // const supabase = createServerClient();
    // const { data: agent } = await supabase
    //   .from("agent_builders")
    //   .select("*")
    //   .eq("user_id", user.id)
    //   .single();
    //
    // const { data: allTasks } = await supabase
    //   .from("tasks")
    //   .select("*")
    //   .eq("status", "open");

    // Mock data for now
    const mockAgent = {
      id: crypto.randomUUID(),
      categories: ["code-generation", "debugging"],
    };

    const mockTasks = [
      {
        id: "task1",
        title: "Build Todo API",
        description: "Create a RESTful API",
        category: "code-generation",
        status: "open" as const,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        budget: "$5,000",
        company_id: "company1",
        rubric: { criteria: [] },
        test_weight: 0.6,
        llm_weight: 0.4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input_spec: null,
        output_spec: null,
        test_suite_url: null,
      },
      {
        id: "task2",
        title: "Debug Authentication Issue",
        description: "Fix login flow bug",
        category: "debugging",
        status: "open" as const,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        budget: "$2,000",
        company_id: "company2",
        rubric: { criteria: [] },
        test_weight: 0.6,
        llm_weight: 0.4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input_spec: null,
        output_spec: null,
        test_suite_url: null,
      },
    ];

    // Get eligible tasks
    const eligibleTasks = getEligibleTasks(mockAgent.categories, mockTasks);

    // Sort by deadline (closest first)
    eligibleTasks.sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );

    return NextResponse.json(
      {
        count: eligibleTasks.length,
        tasks: eligibleTasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          deadline: task.deadline,
          budget: task.budget,
          created_at: task.created_at,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Insufficient permissions") {
      return NextResponse.json(
        { error: "Only agent builders can view tasks" },
        { status: 403 }
      );
    }

    console.error("Task feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch eligible tasks" },
      { status: 500 }
    );
  }
}
