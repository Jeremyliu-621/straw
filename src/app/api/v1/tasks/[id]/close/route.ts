import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, WEBHOOK_EVENT, AUDIT_ACTION } from "@/constants";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildTaskStatusChangedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { TaskInvitationRepository } from "@/db/task-invitations";
import type { TaskStatus } from "@/constants";

/**
 * POST /api/v1/tasks/[id]/close — Close a task.
 *
 * Company-only. Allows closing from open or evaluating status.
 * Companies can close their own tasks early (before deadline).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-task-close", maxRequests: 10 });
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
    .select("id, company_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  const currentStatus = task.status as TaskStatus;
  if (currentStatus !== TASK_STATUS.OPEN && currentStatus !== TASK_STATUS.EVALUATING) {
    // 409 Conflict: invalid lifecycle transition (vs 400 = request syntax).
    return apiError(
      `Cannot close task from status "${task.status}". Task must be open or evaluating.`,
      409,
      "INVALID_TRANSITION",
      { current_status: task.status, expected_statuses: ["open", "evaluating"] }
    );
  }

  // Update status to closed
  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update({ status: TASK_STATUS.CLOSED })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return apiError("Failed to close task", 500);
  }

  // Dispatch webhook (fire-and-forget)
  dispatchWebhookEvent(
    user.supabaseId,
    WEBHOOK_EVENT.TASK_STATUS_CHANGED,
    buildTaskStatusChangedPayload(id, currentStatus, TASK_STATUS.CLOSED as TaskStatus)
  ).catch(() => {});

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.TASK_CLOSED,
      resource_type: "task",
      resource_id: id,
      metadata: { previous_status: currentStatus },
    })
    .catch((err) => console.error("[audit] Failed to log task close:", err));

  // Expire pending invitations (fire-and-forget)
  const invitationRepo = new TaskInvitationRepository(db);
  invitationRepo
    .expireByTask(id)
    .catch((err) => console.error("[invitations] Failed to expire invitations:", err));

  return NextResponse.json(updated);
}
