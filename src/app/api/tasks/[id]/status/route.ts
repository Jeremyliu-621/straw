import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { isValidTransition } from "@/services/task.service";
import { ROLE_COMPANY, WEBHOOK_EVENT, AUDIT_ACTION, type TaskStatus } from "@/constants";
import { z } from "zod/v4";
import { apiError } from "@/lib/api-utils";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildTaskStatusChangedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { TaskInvitationRepository } from "@/db/task-invitations";
import { dispatchTaskMatchedNotifications } from "@/services/task-match-dispatch";

const statusSchema = z.object({
  status: z.enum(["draft", "open", "evaluating", "closed"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  if (user.role !== ROLE_COMPANY) {
    return apiError("Only companies can update task status", 403);
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid status", 400, "VALIDATION_ERROR");
  }

  const db = createServiceClient();

  // Fetch current task
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("company_id", user.supabaseId)
    .single();

  if (fetchError || !task) {
    return apiError("Task not found", 404);
  }

  const newStatus = parsed.data.status as TaskStatus;
  if (!isValidTransition(task.status as TaskStatus, newStatus)) {
    return apiError(`Invalid status transition: ${task.status} → ${newStatus}`, 400, "INVALID_TRANSITION");
  }

  // If publishing (draft → open), validate rubric weights sum to 100
  if (newStatus === "open") {
    const { data: criteria } = await db
      .from("rubric_criteria")
      .select("weight")
      .eq("task_id", id);

    const totalWeight = (criteria ?? []).reduce(
      (sum: number, c: { weight: number }) => sum + c.weight,
      0
    );
    if (totalWeight !== 100) {
      return apiError(`Rubric weights sum to ${totalWeight}%, must equal 100%`, 400, "INVALID_WEIGHTS");
    }
  }

  const { data: updated, error: updateError } = await db
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return apiError("Failed to update task status", 500);
  }

  // Dispatch webhook event (fire-and-forget)
  const previousStatus = task.status as TaskStatus;
  dispatchWebhookEvent(
    user.supabaseId,
    WEBHOOK_EVENT.TASK_STATUS_CHANGED,
    buildTaskStatusChangedPayload(id, previousStatus, newStatus)
  ).catch(() => {
    // Intentionally swallowed — dispatchWebhookEvent already handles errors
  });

  // Audit log (fire-and-forget)
  const auditAction = newStatus === "open" ? AUDIT_ACTION.TASK_PUBLISHED : AUDIT_ACTION.TASK_CLOSED;
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: auditAction,
      resource_type: "task",
      resource_id: id,
      metadata: { previous_status: previousStatus, new_status: newStatus },
    })
    .catch((err) => console.error("[audit] Failed to log task status change:", err));

  // Notify matching agents when task is published (fire-and-forget)
  if (newStatus === "open") {
    dispatchTaskMatchedNotifications(updated as {
      id: string;
      title: string;
      category: string;
      deadline: string;
      eval_mode: string;
      budget_cents: number;
    }).catch(() => {});
  }

  // Expire pending invitations when task closes
  if (newStatus === "closed") {
    const invitationRepo = new TaskInvitationRepository(db);
    invitationRepo
      .expireByTask(id)
      .catch((err) => console.error("[invitations] Failed to expire invitations:", err));
  }

  return NextResponse.json(updated);
}
