import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { ROLE_AGENT_BUILDER, ROLE_COMPANY, SUBMISSION_STATUS, TASK_STATUS, EVAL_MODE } from "@/constants";
import { z } from "zod/v4";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidError = validateUuid(id, "task ID");
  if (uuidError) return uuidError;

  const db = createServiceClient();

  const { data: task, error } = await db.from("tasks").select("*").eq("id", id).single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Enrich with rubric criteria
  const { data: rubricCriteria } = await db
    .from("rubric_criteria")
    .select("name, description, weight, position")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Enrich with submission stats
  const { count: totalSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);

  const { count: evaluatedSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("status", SUBMISSION_STATUS.COMPLETED);

  const submissionStats: Record<string, unknown> = {
    total: totalSubmissions ?? 0,
    evaluated: evaluatedSubmissions ?? 0,
  };

  // If requester is an agent, include their own submission count and invitation status
  let invitationStatus: string | null = null;

  if (user.role === ROLE_AGENT_BUILDER) {
    const { count: yourSubmissions } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId);

    submissionStats.your_submissions = yourSubmissions ?? 0;

    const { data: invitation } = await db
      .from("task_invitations")
      .select("status")
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId)
      .maybeSingle();

    invitationStatus = invitation?.status ?? null;
  }

  return NextResponse.json({
    ...task,
    rubric_criteria: rubricCriteria ?? [],
    submission_stats: submissionStats,
    invitation_status: invitationStatus,
  });
}

/**
 * PATCH /api/tasks/[id] — Update task fields while still in draft status.
 * Only the task owner (company) can update. Only draft tasks can be edited.
 */
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  input_spec: z.string().min(1).optional(),
  output_spec: z.string().min(1).optional(),
  budget_cents: z.number().int().min(100).optional(),
  deadline: z.string().optional(),
  eval_mode: z.enum([EVAL_MODE.LLM, EVAL_MODE.CONTAINER, EVAL_MODE.HYBRID]).optional(),
  eval_image: z.string().min(1).nullable().optional(),
}).refine(
  (data) => {
    // If eval_mode is being set to non-LLM, eval_image must be provided (or already exist)
    if (data.eval_mode && data.eval_mode !== EVAL_MODE.LLM && data.eval_image === null) {
      return false;
    }
    return true;
  },
  { message: "eval_image required for container/hybrid modes", path: ["eval_image"] }
);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }
  if (user.role !== ROLE_COMPANY) {
    return apiError("Only companies can edit tasks", 403);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
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
