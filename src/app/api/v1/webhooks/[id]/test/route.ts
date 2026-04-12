import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { createWebhookQueue } from "@/lib/queue";
import { env } from "@/lib/env";

/**
 * POST /api/v1/webhooks/[id]/test — Send a test webhook delivery.
 * Enqueues a test event so the agent can verify their endpoint works.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Verify ownership + active
  const { data: webhook, error: fetchError } = await db
    .from("webhooks")
    .select("id, user_id, url, secret, active")
    .eq("id", id)
    .single();

  if (fetchError || !webhook) {
    return apiError("Webhook not found", 404);
  }

  if (webhook.user_id !== user.supabaseId) {
    return apiError("Not your webhook", 403);
  }

  if (!webhook.active) {
    return apiError("Webhook is inactive", 409, "WEBHOOK_INACTIVE");
  }

  // Build test payload
  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook delivery from Straw.",
      webhook_id: webhook.id,
    },
  };

  // Create delivery record
  const { data: delivery, error: deliveryError } = await db
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhook.id,
      event_type: "test",
      payload: testPayload,
    })
    .select("id")
    .single();

  if (deliveryError || !delivery) {
    return apiError("Failed to create test delivery", 500);
  }

  // Enqueue for webhook worker
  try {
    const redisUrl = new URL(env.REDIS_URL);
    const queue = createWebhookQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    await queue.add(`wh-test-${delivery.id}`, {
      deliveryId: delivery.id as string,
      webhookId: webhook.id as string,
      url: webhook.url as string,
      secret: webhook.secret as string,
      payload: JSON.stringify(testPayload),
    });

    await queue.close();
  } catch (queueError) {
    console.error("Failed to enqueue test webhook:", queueError);
    return apiError("Failed to enqueue test delivery", 500);
  }

  return NextResponse.json(
    {
      delivery_id: delivery.id,
      message: "Test webhook queued for delivery",
    },
    { status: 202 }
  );
}
