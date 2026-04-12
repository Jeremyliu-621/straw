/**
 * WEBHOOK DELIVERY WORKER
 *
 * This is a separate Node.js process. It NEVER imports Next.js internals.
 * It connects to Redis via BullMQ and delivers webhook payloads.
 *
 * Flow:
 * 1. Receive job with { deliveryId, webhookId, url, secret, payload }
 * 2. Sign the payload with HMAC-SHA256
 * 3. POST to the webhook URL with signature header
 * 4. Capture response status + body (max 1KB)
 * 5. Update webhook_deliveries with status (delivered/failed)
 *
 * Retries: 3 attempts with exponential backoff (handled by BullMQ).
 * Timeout: 10 seconds per delivery attempt.
 * Concurrency: 10 parallel deliveries.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

// ── Config ──────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[webhook-worker] Missing required env vars: REDIS_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DELIVERY_TIMEOUT_MS = 10_000;
const RESPONSE_BODY_MAX_BYTES = 1024;
const QUEUE_NAME = "webhook";

// ── Supabase Client ─────────────────────────────────────────

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Redis Connection ────────────────────────────────────────

const redisUrl = new URL(REDIS_URL);
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

// ── HMAC Signature ──────────────────────────────────────────

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// ── Worker ──────────────────────────────────────────────────

interface WebhookJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: string;
}

const worker = new Worker<WebhookJobData>(
  QUEUE_NAME,
  async (job) => {
    const { deliveryId, url, secret, payload } = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;

    console.log(`[webhook-worker] Delivering ${deliveryId} to ${url} (attempt ${attempt})`);

    const signature = signPayload(payload, secret);
    let parsedEvent = "unknown";
    try {
      parsedEvent = JSON.parse(payload).event ?? "unknown";
    } catch {
      // payload parsing failed, use default
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Straw-Signature": signature,
          "X-Straw-Event": parsedEvent,
          "X-Straw-Delivery": deliveryId,
          "User-Agent": "Straw-Webhook/1.0",
        },
        body: payload,
        signal: controller.signal,
        redirect: "manual",
      });

      clearTimeout(timeout);

      const responseBody = await response.text();
      const truncatedBody = responseBody.slice(0, RESPONSE_BODY_MAX_BYTES);

      const status = response.ok ? "delivered" : "failed";

      await db
        .from("webhook_deliveries")
        .update({
          status,
          response_status: response.status,
          response_body: truncatedBody,
          attempts: attempt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);

      if (!response.ok) {
        console.error(`[webhook-worker] ${deliveryId} returned ${response.status}`);
        throw new Error(`Webhook returned ${response.status}: ${truncatedBody}`);
      }

      console.log(`[webhook-worker] ${deliveryId} delivered successfully`);
    } catch (err) {
      clearTimeout(timeout);

      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isAbort = err instanceof Error && err.name === "AbortError";

      await db
        .from("webhook_deliveries")
        .update({
          status: "failed",
          response_body: isAbort ? "Request timed out" : errorMessage,
          attempts: attempt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);

      // Re-throw so BullMQ retries
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// ── Lifecycle ───────────────────────────────────────────────

worker.on("failed", (job, err) => {
  console.error(`[webhook-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on("completed", (job) => {
  console.log(`[webhook-worker] Job ${job.id} completed`);
});

process.on("SIGTERM", async () => {
  console.log("[webhook-worker] Shutting down...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[webhook-worker] Shutting down...");
  await worker.close();
  process.exit(0);
});

console.log("[webhook-worker] Started, waiting for jobs...");
