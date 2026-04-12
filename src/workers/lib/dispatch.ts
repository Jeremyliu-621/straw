/**
 * Shared dispatch utilities for workers.
 *
 * Workers are standalone Node.js processes — they NEVER import Next.js internals.
 * All imports here must be worker-safe (no next/server, no Next.js middleware).
 *
 * These functions are fire-and-forget: they log errors but never throw.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import type { Queue } from "bullmq";
import type { NotificationType, AuditAction } from "@/constants";
import { NotificationRepository } from "@/db/notifications";
import { AuditLogRepository } from "@/db/audit-log";
import { buildNotification, shouldNotify } from "@/services/notifications.service";

// ── Webhook Dispatch ────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Find matching webhooks for a company + event, create delivery records,
 * and enqueue jobs for the webhook worker to deliver.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function dispatchWebhookFromWorker(
  db: AnySupabaseClient,
  webhookQueue: Queue,
  userId: string,
  event: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    const { data: webhooks } = await db
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("user_id", userId)
      .eq("active", true);

    const matching = (webhooks ?? []).filter(
      (w: { events: string[] }) => w.events.includes(event)
    );
    if (matching.length === 0) return;

    for (const webhook of matching) {
      const { data: delivery } = await db
        .from("webhook_deliveries")
        .insert({ webhook_id: webhook.id, event_type: event, payload })
        .select("id")
        .single();

      if (delivery) {
        await webhookQueue.add(`wh-${delivery.id}`, {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          payload: JSON.stringify(payload),
        });
      }
    }
  } catch (err) {
    console.error("[dispatch] Failed to dispatch webhook:", err);
  }
}

/**
 * Dispatch a webhook event to multiple users in a single bulk query.
 * Used for task matching — notifies all matching agents at once.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function dispatchWebhookToManyUsers(
  db: AnySupabaseClient,
  webhookQueue: Queue,
  userIds: string[],
  event: string,
  payload: WebhookPayload
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const { data: webhooks } = await db
      .from("webhooks")
      .select("id, user_id, url, secret, events")
      .in("user_id", userIds)
      .eq("active", true);

    const matching = (webhooks ?? []).filter(
      (w: { events: string[] }) => w.events.includes(event)
    );
    if (matching.length === 0) return;

    for (const webhook of matching) {
      const { data: delivery } = await db
        .from("webhook_deliveries")
        .insert({ webhook_id: webhook.id, event_type: event, payload })
        .select("id")
        .single();

      if (delivery) {
        await webhookQueue.add(`wh-${delivery.id}`, {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          payload: JSON.stringify(payload),
        });
      }
    }
  } catch (err) {
    console.error("[dispatch] Failed to dispatch webhook to many users:", err);
  }
}

// ── Notification Dispatch ───────────────────────────────────

/**
 * Send an in-app notification to a user. Checks notification preferences
 * before creating — if the user has disabled this type, it's a no-op.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function dispatchNotificationFromWorker(
  db: AnySupabaseClient,
  type: NotificationType,
  userId: string,
  title: string,
  body: string,
  resourceType: string | null = null,
  resourceId: string | null = null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const repo = new NotificationRepository(db);

    const preferences = await repo.getPreferences(userId);
    if (!shouldNotify(preferences, type)) return;

    const notification = buildNotification(
      type,
      userId,
      resourceType,
      resourceId,
      title,
      body,
      metadata
    );

    await repo.create(notification);
  } catch (err) {
    console.error("[dispatch] Failed to dispatch notification:", err);
  }
}

/**
 * Send a notification to the owner of a task.
 * Looks up the company_id from the tasks table, then dispatches.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function dispatchNotificationToTaskOwnerFromWorker(
  db: AnySupabaseClient,
  taskId: string,
  type: NotificationType,
  title: string,
  body: string,
  resourceType: string | null = null,
  resourceId: string | null = null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: task, error } = await db
      .from("tasks")
      .select("company_id")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      console.error(`[dispatch] Failed to find task ${taskId} for notification:`, error);
      return;
    }

    await dispatchNotificationFromWorker(
      db,
      type,
      task.company_id as string,
      title,
      body,
      resourceType,
      resourceId,
      metadata
    );
  } catch (err) {
    console.error("[dispatch] Failed to dispatch notification to task owner:", err);
  }
}

// ── Audit Log ───────────────────────────────────────────────

/**
 * Write an audit log entry. For worker-initiated actions, the actorId
 * is typically the agent or the system.
 *
 * Fire-and-forget — logs errors but never throws.
 */
export async function writeAuditLog(
  db: AnySupabaseClient,
  action: AuditAction,
  actorId: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const repo = new AuditLogRepository(db);
    await repo.log({
      user_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
    });
  } catch (err) {
    console.error("[dispatch] Failed to write audit log:", err);
  }
}
