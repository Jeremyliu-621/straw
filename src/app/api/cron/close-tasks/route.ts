import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createEvaluationQueue } from "@/lib/queue";
import { env } from "@/lib/env";
import { checkDeadlines } from "@/services/task-deadline.service";
import type { DeadlineEvent } from "@/services/task-deadline.service";
import { apiError } from "@/lib/api-utils";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { dispatchNotification } from "@/lib/notification-dispatch";
import { AuditLogRepository } from "@/db/audit-log";
import { TaskInvitationRepository } from "@/db/task-invitations";
import { buildTaskStatusChangedPayload } from "@/services/webhook.service";
import {
  WEBHOOK_EVENT,
  TASK_STATUS,
  NOTIFICATION_TYPE,
  AUDIT_ACTION,
  type TaskStatus,
} from "@/constants";

/**
 * POST /api/cron/close-tasks — Auto-close tasks past deadline.
 *
 * Designed to be called by a cron job (Vercel Cron, Railway cron, etc.).
 * Protected by a shared secret in the Authorization header.
 *
 * Can also be called manually for testing.
 *
 * Security: Requires either:
 * - Authorization: Bearer <CRON_SECRET> header
 * - x-vercel-cron-signature header (for Vercel Cron)
 * - Running in development mode
 */
export async function POST(req: Request) {
  // Auth check: cron secret or dev mode
  const isDev = process.env.NODE_ENV === "development";
  const cronSecret = process.env.CRON_SECRET;

  if (!isDev) {
    const authHeader = req.headers.get("authorization");
    const vercelCron = req.headers.get("x-vercel-cron-signature");

    if (!vercelCron && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return apiError("Unauthorized", 401);
    }
  }

  const db = createServiceClient();

  // Build evaluation enqueue function
  const redisUrl = new URL(env.REDIS_URL);
  const evalQueue = createEvaluationQueue({
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  });

  async function enqueueEvaluation(
    submissionId: string,
    taskId: string,
    outputUrl: string
  ): Promise<void> {
    await evalQueue.add(`eval-${submissionId}`, {
      submissionId,
      taskId,
      outputUrl,
    });
  }

  try {
    const result = await checkDeadlines(db, enqueueEvaluation);

    // Dispatch lifecycle side-effects for each event
    for (const event of result.events) {
      await handleDeadlineEvent(db, event);
    }

    return NextResponse.json({
      status: "ok",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } finally {
    await evalQueue.close();
  }
}

/**
 * Handle a single lifecycle event from the deadline check.
 * Dispatches webhooks, notifications, audit logs, and expires invitations.
 * Fire-and-forget — errors are logged but don't break the cron.
 */
async function handleDeadlineEvent(
  db: ReturnType<typeof createServiceClient>,
  event: DeadlineEvent
): Promise<void> {
  try {
    if (event.type === "task_moved_to_evaluating") {
      // Webhook
      await dispatchWebhookEvent(
        event.companyId,
        WEBHOOK_EVENT.TASK_STATUS_CHANGED,
        buildTaskStatusChangedPayload(event.taskId, TASK_STATUS.OPEN as TaskStatus, TASK_STATUS.EVALUATING as TaskStatus)
      );

      // Notify company
      await dispatchNotification(
        db,
        NOTIFICATION_TYPE.TASK_CLOSED,
        event.companyId,
        "task",
        event.taskId,
        "Task moved to evaluation",
        `"${event.taskTitle}" deadline passed — evaluation has begun.`
      );

      // Audit log
      const auditRepo = new AuditLogRepository(db);
      await auditRepo.log({
        user_id: event.companyId,
        action: AUDIT_ACTION.TASK_CLOSED,
        resource_type: "task",
        resource_id: event.taskId,
        metadata: { reason: "deadline_passed", new_status: TASK_STATUS.EVALUATING },
      });
    } else if (event.type === "task_closed") {
      // Webhook
      await dispatchWebhookEvent(
        event.companyId,
        WEBHOOK_EVENT.TASK_STATUS_CHANGED,
        buildTaskStatusChangedPayload(event.taskId, TASK_STATUS.EVALUATING as TaskStatus, TASK_STATUS.CLOSED as TaskStatus)
      );

      // Notify company
      await dispatchNotification(
        db,
        NOTIFICATION_TYPE.TASK_CLOSED,
        event.companyId,
        "task",
        event.taskId,
        "Task closed",
        `"${event.taskTitle}" has been closed — all evaluations are complete.`
      );

      // Audit log
      const auditRepo = new AuditLogRepository(db);
      await auditRepo.log({
        user_id: event.companyId,
        action: AUDIT_ACTION.TASK_CLOSED,
        resource_type: "task",
        resource_id: event.taskId,
        metadata: { reason: "all_evaluations_complete" },
      });

      // Expire pending invitations
      const invitationRepo = new TaskInvitationRepository(db);
      await invitationRepo.expireByTask(event.taskId);
    }
  } catch (err) {
    console.error(`[cron] Failed to handle event ${event.type} for task ${event.taskId}:`, err);
  }
}
