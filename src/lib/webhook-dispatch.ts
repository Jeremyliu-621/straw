import { createServiceClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import { createWebhookQueue } from "@/lib/queue";
import type { WebhookEventType } from "@/constants";
import type { WebhookPayload } from "@/services/webhook.service";

/**
 * Fire-and-forget webhook dispatcher for API routes.
 * Finds active webhooks subscribed to the event, creates delivery records,
 * and enqueues jobs for the webhook worker.
 * Never throws — failures are logged and silently ignored.
 */
export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEventType,
  payload: WebhookPayload
): Promise<void> {
  try {
    const db = createServiceClient();

    // Find active webhooks for this company subscribed to this event
    const { data: webhooks } = await db
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("user_id", userId)
      .eq("active", true);

    const matching = (webhooks ?? []).filter(
      (w: { events: string[] }) => w.events.includes(event)
    );
    if (matching.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const redisUrl = new URL(env.REDIS_URL);
    const queue = createWebhookQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    for (const webhook of matching) {
      const { data: delivery } = await db
        .from("webhook_deliveries")
        .insert({
          webhook_id: webhook.id,
          event_type: event,
          payload,
        })
        .select("id")
        .single();

      if (delivery) {
        await queue.add(`wh-${delivery.id}`, {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          payload: payloadStr,
        });
      }
    }

    await queue.close();
  } catch (err) {
    console.error("[webhook] Failed to dispatch webhook event:", err);
    // Fire-and-forget: never block the calling route
  }
}
