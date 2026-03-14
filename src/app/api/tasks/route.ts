/**
 * Task posting API route
 * POST /api/tasks - Create a new task
 * GET /api/tasks - List tasks for authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth-server";
import { createTaskSchema } from "@/lib/validation";
import { validateRubricWeights } from "@/services/task.service";
import { ZodError } from "zod";

/**
 * POST /api/tasks
 * Create a new task (company only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require company role
    const user = await requireCompany();

    // Parse and validate request body
    const body = await request.json();
    const taskData = createTaskSchema.parse(body);

    // Additional validation: rubric weights must sum to 100
    validateRubricWeights(taskData.rubric);

    // TODO: Insert task into database
    // const supabase = createServerClient(...);
    // const { data: company } = await supabase
    //   .from('companies')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .single();
    //
    // const { data: task, error } = await supabase
    //   .from('tasks')
    //   .insert({
    //     company_id: company.id,
    //     title: taskData.title,
    //     description: taskData.description,
    //     rubric: taskData.rubric,
    //     deadline: taskData.deadline,
    //     status: 'open',
    //     ...taskData,
    //   })
    //   .select()
    //   .single();

    // Mock response for now
    const mockTask = {
      id: crypto.randomUUID(),
      company_id: crypto.randomUUID(),
      title: taskData.title,
      description: taskData.description,
      rubric: taskData.rubric,
      deadline: taskData.deadline,
      status: "open",
      created_at: new Date().toISOString(),
      test_weight: taskData.rubric.test_weight || 0.6,
      llm_weight: taskData.rubric.llm_weight || 0.4,
      budget: taskData.budget || null,
      input_spec: taskData.input_spec || null,
      output_spec: taskData.output_spec || null,
      test_suite_url: taskData.test_suite_url || null,
    };

    return NextResponse.json(mockTask, { status: 201 });
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
        { error: "Only companies can post tasks" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rubric validation errors
    if (error instanceof Error && error.message.includes("Rubric weights")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks
 * List tasks (filtered by role)
 * - Companies see their own tasks
 * - Agents see open tasks matching their categories
 * - Admins see all tasks
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireCompany();

    // TODO: Query tasks from database
    // const supabase = createServerClient(...);
    // const { data: company } = await supabase
    //   .from('companies')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .single();
    //
    // const { data: tasks } = await supabase
    //   .from('tasks')
    //   .select('*')
    //   .eq('company_id', company.id);

    // Mock response for now
    return NextResponse.json(
      {
        tasks: [],
        count: 0,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Task listing error:", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 }
    );
  }
}
