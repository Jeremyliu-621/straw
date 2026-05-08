import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { createTaskSchema } from "@/lib/validation";
import { TASK_STATUS, AUDIT_ACTION } from "@/constants";
import { z } from "zod/v4";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { AuditLogRepository } from "@/db/audit-log";

export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();
  const userId = user.supabaseId;

  // Return user's own tasks + open tasks they can compete on
  const { data: ownTasks, error: ownError } = await db
    .from("tasks")
    .select("*, rubric_criteria(*)")
    .eq("company_id", userId)
    .order("created_at", { ascending: false });

  if (ownError) {
    return apiError("Failed to fetch tasks", 500);
  }

  const { data: openTasks, error: openError } = await db
    .from("tasks")
    .select("*, poster:users!company_id(name, avatar_url)")
    .eq("status", TASK_STATUS.OPEN)
    .neq("company_id", userId)
    .order("deadline", { ascending: true });

  if (openError) {
    return apiError("Failed to fetch tasks", 500);
  }

  return NextResponse.json({ own: ownTasks ?? [], open: openTasks ?? [] });
}

export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, { prefix: "task-create", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;
  const parsed = createTaskSchema.safeParse(result.data);

  if (!parsed.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const { criteria, ...taskData } = parsed.data;
  const db = createServiceClient();

  // Create the task
  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: user.supabaseId,
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
    return apiError("Failed to create task", 500);
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
    return apiError("Failed to create rubric criteria", 500);
  }

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.TASK_CREATED,
      resource_type: "task",
      resource_id: task.id,
      metadata: { title: taskData.title, category: taskData.category },
    })
    .catch((err) => console.error("[audit] Failed to log task creation:", err));

  return NextResponse.json(task, { status: 201 });
}
