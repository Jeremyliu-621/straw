import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { createTaskSchema } from "@/lib/validation";
import { ROLE_COMPANY, TASK_STATUS } from "@/constants";
import { z } from "zod/v4";
import { parseBody } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const isCompany = session.user.role === ROLE_COMPANY;

  if (isCompany) {
    // Companies see their own tasks
    const { data, error } = await db
      .from("tasks")
      .select("*, rubric_criteria(*)")
      .eq("company_id", session.user.supabaseId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
    return NextResponse.json(data);
  } else {
    // Agent builders see open tasks
    const { data, error } = await db
      .from("tasks")
      .select("*")
      .eq("status", TASK_STATUS.OPEN)
      .order("deadline", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
    return NextResponse.json(data);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ error: "Only companies can create tasks" }, { status: 403 });
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;
  const parsed = createTaskSchema.safeParse(result.data);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { criteria, ...taskData } = parsed.data;
  const db = createServiceClient();

  // Create the task
  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: session.user.supabaseId,
      title: taskData.title,
      description: taskData.description,
      category: taskData.category,
      input_spec: taskData.input_spec,
      output_spec: taskData.output_spec,
      test_weight: taskData.test_weight,
      llm_weight: taskData.llm_weight,
      budget_cents: taskData.budget_cents,
      deadline: taskData.deadline,
      status: TASK_STATUS.DRAFT,
      eval_mode: taskData.eval_mode,
      eval_image: taskData.eval_image ?? null,
      eval_network: taskData.eval_network,
      eval_memory_mb: taskData.eval_memory_mb,
      eval_timeout_seconds: taskData.eval_timeout_seconds,
    })
    .select()
    .single();

  if (taskError) {
    console.error("Failed to create task:", taskError);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  // Create rubric criteria
  const rubricRows = criteria.map((c) => ({
    task_id: task.id,
    name: c.name,
    description: c.description ?? null,
    weight: c.weight,
    position: c.position,
  }));

  const { error: rubricError } = await db.from("rubric_criteria").insert(rubricRows);

  if (rubricError) {
    console.error("Failed to create rubric criteria:", rubricError);
    // Clean up the task if rubric creation fails
    await db.from("tasks").delete().eq("id", task.id);
    return NextResponse.json({ error: "Failed to create rubric criteria" }, { status: 500 });
  }

  return NextResponse.json(task, { status: 201 });
}
