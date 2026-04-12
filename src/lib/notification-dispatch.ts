import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/constants";
import { NotificationRepository } from "@/db/notifications";
import { buildNotification, shouldNotify } from "@/services/notifications.service";

/**
 * Dispatch a notification to a specific user.
 * Checks user preferences before creating the notification.
 * Fire-and-forget — wrapped in try/catch, never blocks the caller.
 */
export async function dispatchNotification(
  db: SupabaseClient,
  type: NotificationType,
  userId: string,
  resourceType: string | null,
  resourceId: string | null,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const repo = new NotificationRepository(db);

    // Check user preferences
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
  } catch (error) {
    // Fire-and-forget: log but never throw
    console.error("Failed to dispatch notification:", error);
  }
}

/**
 * Dispatch a notification to the owner of a task.
 * Looks up the task's company_id, then dispatches to that user.
 * Fire-and-forget — wrapped in try/catch, never blocks the caller.
 */
export async function dispatchNotificationToTaskOwner(
  db: SupabaseClient,
  taskId: string,
  type: NotificationType,
  resourceType: string | null,
  resourceId: string | null,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Look up the task's company_id
    const { data: task, error } = await db
      .from("tasks")
      .select("company_id")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      console.error(
        `Failed to find task ${taskId} for notification dispatch:`,
        error
      );
      return;
    }

    await dispatchNotification(
      db,
      type,
      task.company_id as string,
      resourceType,
      resourceId,
      title,
      body,
      metadata
    );
  } catch (error) {
    // Fire-and-forget: log but never throw
    console.error("Failed to dispatch notification to task owner:", error);
  }
}
