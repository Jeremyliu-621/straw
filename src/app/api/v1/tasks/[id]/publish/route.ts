import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, WEBHOOK_EVENT, AUDIT_ACTION, RUBRIC_WEIGHT_SUM } from "@/constants";
import { isValidTransition } from "@/services/task.service";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildTaskStatusChangedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { dispatchTaskMatchedNotifications } from "@/services/task-match-dispatch";
import type { TaskStatus } from "@/constants";

/**
 * POST /api/v1/tasks/[id]/publish — Publish a draft task (draft → open).
 *
 * Company-only. Validates rubric weights sum to 100%.
 * Dispatches task.matched webhooks/notifications to matching agents.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-task-publish", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Fetch task and verify ownership
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  const currentStatus = task.status as TaskStatus;
  if (!isValidTransition(currentStatus, TASK_STATUS.OPEN as TaskStatus)) {
    return apiError(`Cannot publish from status "${task.status}"`, 400, "INVALID_TRANSITION");
  }

  // Validate rubric weights sum to 100
  const { data: criteria } = await db
    .from("rubric_criteria")
    .select("weight")
    .eq("task_id", id);

  const totalWeight = (criteria ?? []).reduce(
    (sum: number, c: { weight: number }) => sum + c.weight,
    0
  );
  if (totalWeight !== RUBRIC_WEIGHT_SUM) {
    return apiError(
      `Rubric weights sum to ${totalWeight}%, must equal ${RUBRIC_WEIGHT_SUM}%`,
      400,
      "INVALID_WEIGHTS"
    );
  }

  // Update status
  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update({ status: TASK_STATUS.OPEN })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return apiError("Failed to publish task", 500);
  }

  // Dispatch webhook (fire-and-forget)
  dispatchWebhookEvent(
    user.supabaseId,
    WEBHOOK_EVENT.TASK_STATUS_CHANGED,
    buildTaskStatusChangedPayload(id, currentStatus, TASK_STATUS.OPEN as TaskStatus)
  ).catch(() => {});

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.TASK_PUBLISHED,
      resource_type: "task",
      resource_id: id,
      metadata: { previous_status: currentStatus },
    })
    .catch((err) => console.error("[audit] Failed to log task publish:", err));

  // Notify matching agents (fire-and-forget)
  dispatchTaskMatchedNotifications(updated as {
    id: string;
    title: string;
    category: string;
    deadline: string;
    eval_mode: string;
    budget_cents: number;
  }).catch(() => {});

  return NextResponse.json(updated);
}
