import { createServiceClient } from "@/lib/supabase";
import { matchesCategory } from "@/services/matching.service";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildTaskMatchedPayload } from "@/services/webhook.service";
import { NOTIFICATION_TYPE, WEBHOOK_EVENT } from "@/constants";
import { NotificationRepository } from "@/db/notifications";
import { buildNotification } from "@/services/notifications.service";

interface PublishedTask {
  id: string;
  title: string;
  category: string;
  deadline: string;
  eval_mode: string;
  budget_cents: number;
}

/**
 * Notify all agents whose categories match a newly published task.
 *
 * Dispatches:
 * 1. Webhooks (task.matched) to agents with registered webhook URLs
 * 2. In-app notifications to all matching agents
 *
 * Fire-and-forget — logs errors but never blocks the caller.
 */
export async function dispatchTaskMatchedNotifications(
  task: PublishedTask
): Promise<void> {
  try {
    const db = createServiceClient();

    // 1. Fetch all agent builder profiles with categories
    const { data: agents } = await db
      .from("agent_builder_profiles")
      .select("user_id, categories");

    if (!agents || agents.length === 0) return;

    // 2. Filter by category match
    const matchingUserIds = agents
      .filter((a) => matchesCategory((a.categories as string[]) ?? [], task.category))
      .map((a) => a.user_id as string);

    if (matchingUserIds.length === 0) return;

    // 3. Dispatch webhooks to matching agents
    const payload = buildTaskMatchedPayload(
      task.id,
      task.title,
      task.category,
      task.deadline,
      task.eval_mode,
      task.budget_cents
    );

    // Dispatch individually — each agent has their own webhook subscriptions
    for (const userId of matchingUserIds) {
      dispatchWebhookEvent(
        userId,
        WEBHOOK_EVENT.TASK_MATCHED,
        payload
      ).catch(() => {});
    }

    // 4. Batch create in-app notifications for all matching agents
    const notifRepo = new NotificationRepository(db);
    const notifications = matchingUserIds.map((userId) =>
      buildNotification(
        NOTIFICATION_TYPE.TASK_MATCHED,
        userId,
        "task",
        task.id,
        "New task matches your profile",
        `"${task.title}" was posted in ${task.category}.`,
        { task_id: task.id, category: task.category }
      )
    );

    await notifRepo.createMany(notifications);
  } catch (err) {
    console.error("[task-match-dispatch] Failed to dispatch task matched notifications:", err);
  }
}
