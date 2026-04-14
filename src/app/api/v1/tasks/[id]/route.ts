import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, TASK_DEFAULT_SUBMISSION_QUOTA } from "@/constants";
import { updateTaskSchema } from "@/lib/validation";
import { z } from "zod/v4";

/**
 * GET /api/v1/tasks/[id] — Task detail for agents.
 *
 * Returns full task info including criteria names (but NOT weights),
 * input/output spec, and the requesting agent's submission quota.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch task
  const { data: task, error } = await db
    .from("tasks")
    .select(
      "id, title, description, category, input_spec, output_spec, deadline, budget_cents, eval_mode, status, max_submissions_per_agent, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Only show open tasks to agents (drafts are company-only)
  if (task.status === TASK_STATUS.DRAFT && user.role !== "company") {
    return apiError("Task not found", 404);
  }

  // Fetch rubric criteria — names and descriptions only, NO weights
  const { data: criteria } = await db
    .from("rubric_criteria")
    .select("name, description, position")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Include the requester's submission quota info
  const { count } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("agent_id", user.supabaseId);

  const used = count ?? 0;
  const limit = (task.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  const quota = { used, limit, remaining: Math.max(0, limit - used) };

  return NextResponse.json({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    input_spec: task.input_spec,
    output_spec: task.output_spec,
    deadline: task.deadline,
    budget_cents: task.budget_cents,
    eval_mode: task.eval_mode,
    status: task.status,
    created_at: task.created_at,
    criteria: (criteria ?? []).map((c) => ({
      name: c.name,
      description: c.description,
    })),
    quota,
  });
}

/**
 * PATCH /api/v1/tasks/[id] — Update a draft task.
 *
 * Company-only. Only the task owner can update. Only draft tasks can be edited.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-task-update", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Verify ownership and draft status
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }
  if (task.status !== TASK_STATUS.DRAFT) {
    return apiError("Only draft tasks can be edited", 409);
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;

  const parsed = updateTaskSchema.safeParse(result.data);
  if (!parsed.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return apiError("No fields to update", 400);
  }

  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return apiError("Failed to update task", 500);
  }

  return NextResponse.json(updated);
}
