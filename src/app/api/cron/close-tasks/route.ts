import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createEvaluationQueue, buildRedisConnection, type Queue, type EvaluationJobData } from "@/lib/queue";
import { checkDeadlines } from "@/services/task-deadline.service";
import type { DeadlineEvent } from "@/services/task-deadline.service";
import { apiError } from "@/lib/api-utils";
import { verifyCronRequest } from "@/lib/cron-auth";
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
 * /api/cron/close-tasks — Auto-close tasks past deadline.
 *
 * Wired up via vercel.json cron schedule. Vercel Cron sends GET; manual
 * tests / external triggers can use POST. Both behave identically.
 *
 * Resilient to a missing or unreachable Redis: the lifecycle transitions
 * (open → evaluating, evaluating → closed) happen against Postgres, and
 * the eval-enqueue step degrades to a no-op with a logged warning. This
 * keeps deadline-auto-close working even when no worker infrastructure is
 * deployed (the current state for the Vercel-only setup as of 2026-04-25).
 *
 * Security: Requires either:
 * - Authorization: Bearer <CRON_SECRET> header
 * - x-vercel-cron-signature header (for Vercel Cron)
 * - Running in development mode
 */

export async function GET(req: Request) {
  return runCloseTasksCron(req);
}

export async function POST(req: Request) {
  return runCloseTasksCron(req);
}

async function runCloseTasksCron(req: Request) {
  if (!verifyCronRequest(req)) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();

  // Try to set up the eval queue. If REDIS_URL is unset or the connection
  // builder throws for any reason, fall through with `evalQueue = null` —
  // checkDeadlines treats a missing enqueue function as "skip the enqueue
  // step entirely," which is the correct behavior when no worker is
  // listening anyway.
  let evalQueue: Queue<EvaluationJobData> | null = null;
  let queueWarning: string | null = null;
  try {
    if (process.env.REDIS_URL) {
      evalQueue = createEvaluationQueue(buildRedisConnection(process.env.REDIS_URL));
    } else {
      queueWarning = "REDIS_URL not set; deadline transitions only, no eval enqueue.";
    }
  } catch (err) {
    queueWarning = `Eval queue unavailable (${(err as Error).message}); deadline transitions only.`;
    evalQueue = null;
  }

  // Wrap each enqueue in a try/catch so an unreachable Redis (queue object
  // exists but Redis won't accept connections) downgrades to a logged
  // warning per submission rather than killing the whole cron run.
  const enqueueErrors: string[] = [];
  const enqueueEvaluation = evalQueue
    ? async (submissionId: string, taskId: string, outputUrl: string): Promise<void> => {
        try {
          await evalQueue!.add(`eval-${submissionId}`, { submissionId, taskId, outputUrl });
        } catch (err) {
          enqueueErrors.push(`enqueue ${submissionId}: ${(err as Error).message}`);
        }
      }
    : undefined;

  try {
    const result = await checkDeadlines(db, enqueueEvaluation);

    // Dispatch lifecycle side-effects for each event
    for (const event of result.events) {
      await handleDeadlineEvent(db, event);
    }

    return NextResponse.json({
      status: "ok",
      ...result,
      ...(queueWarning ? { queue_warning: queueWarning } : {}),
      ...(enqueueErrors.length > 0 ? { enqueue_errors: enqueueErrors } : {}),
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (evalQueue) {
      await evalQueue.close().catch(() => {
        // Closing a queue with an unreachable Redis can throw — swallow.
      });
    }
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
