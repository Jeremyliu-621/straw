import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody, parsePagination, paginatedResponse } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, AUDIT_ACTION } from "@/constants";
import { createTaskSchema } from "@/lib/validation";
import { z } from "zod/v4";
import { AuditLogRepository } from "@/db/audit-log";

/**
 * GET /api/v1/tasks — List open tasks for programmatic agent discovery.
 *
 * Query params:
 *   ?category=code-generation  — filter by category
 *   ?eval_mode=container       — filter by eval mode
 *   ?limit=20&cursor=...       — pagination
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const evalMode = url.searchParams.get("eval_mode");
  const { limit, cursor } = parsePagination(url);

  const db = createServiceClient();

  // Filter out expired tasks at the query layer. The doc claim in /api/docs
  // and llms.txt promises this; without it, the very first row a fresh agent
  // sees is often a long-closed task because they're sorted by deadline asc
  // and the cron that flips `status=closed` runs hourly, not real-time.
  const nowIso = new Date().toISOString();

  let query = db
    .from("tasks")
    .select("id, title, description, category, deadline, budget_cents, eval_mode, created_at")
    .eq("status", TASK_STATUS.OPEN)
    .gt("deadline", nowIso)
    .order("deadline", { ascending: true })
    .limit(limit + 1);

  if (category) {
    query = query.eq("category", category);
  }
  if (evalMode) {
    query = query.eq("eval_mode", evalMode);
  }
  if (cursor) {
    query = query.gt("deadline", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch tasks", 500);
  }

  return paginatedResponse(data ?? [], limit);
}

/**
 * POST /api/v1/tasks — Create a draft task with rubric criteria.
 *
 * Company-only. Returns the task with criteria attached.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-task-create", maxRequests: 10 });
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

  // External eval mode mints a per-task callback_token at create time.
  // It rides out in the outbound webhook payload when a submission lands
  // and must be presented when the poster's judge POSTs the score back.
  // 32 hex chars = 128 bits — enough that a brute-force POST-back attack
  // is infeasible.
  const evalCallbackToken =
    taskData.eval_mode === "external"
      ? `straw_evaltok_${randomBytes(16).toString("hex")}`
      : null;

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
      eval_callback_url: taskData.eval_callback_url ?? null,
      eval_callback_token: evalCallbackToken,
      eval_network: taskData.eval_network,
      eval_memory_mb: taskData.eval_memory_mb,
      eval_timeout_seconds: taskData.eval_timeout_seconds,
      max_submissions_per_agent: taskData.max_submissions_per_agent ?? undefined,
      submission_contract: taskData.submission_contract ?? null,
    })
    .select()
    .single();

  if (taskError) {
    console.error("[v1/tasks] Failed to create task:", taskError);
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
    console.error("[v1/tasks] Failed to create rubric criteria:", rubricError);
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

  return NextResponse.json({ ...task, rubric_criteria: rubricRows }, { status: 201 });
}
