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
import fs from "fs";
import os from "os";
import path from "path";
import {
  WEBHOOK_WORKER_CONCURRENCY_DEFAULT,
  WORKER_DURATION_WINDOW_SIZE,
} from "@/constants";
import { buildRedisConnection } from "@/lib/queue";
import { validatePublicUrlDynamic } from "@/lib/public-url";

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
const HEALTH_CHECK_PATH = path.join(os.tmpdir(), "webhook-worker-heartbeat");

const WEBHOOK_WORKER_CONCURRENCY = (() => {
  const raw = process.env.WEBHOOK_WORKER_CONCURRENCY;
  if (!raw) return WEBHOOK_WORKER_CONCURRENCY_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.warn(
      `[webhook-worker] WEBHOOK_WORKER_CONCURRENCY=${raw} invalid, falling back to ${WEBHOOK_WORKER_CONCURRENCY_DEFAULT}`
    );
    return WEBHOOK_WORKER_CONCURRENCY_DEFAULT;
  }
  return parsed;
})();

// ── Heartbeat + Metrics ─────────────────────────────────────

interface WebhookMetrics {
  jobsProcessed: number;
  jobsFailed: number;
  durationsMs: number[];
  lastError: string | null;
  startedAt: string;
}

const metrics: WebhookMetrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  durationsMs: [],
  lastError: null,
  startedAt: new Date().toISOString(),
};

function recordJobResult(durationMs: number, ok: boolean, errorMessage?: string): void {
  if (ok) {
    metrics.jobsProcessed += 1;
  } else {
    metrics.jobsFailed += 1;
    if (errorMessage) {
      metrics.lastError = errorMessage.slice(0, 500);
    }
  }
  metrics.durationsMs.push(durationMs);
  if (metrics.durationsMs.length > WORKER_DURATION_WINDOW_SIZE) {
    metrics.durationsMs.shift();
  }
}

function averageDurationMs(): number {
  if (metrics.durationsMs.length === 0) return 0;
  const total = metrics.durationsMs.reduce((a, b) => a + b, 0);
  return Math.round(total / metrics.durationsMs.length);
}

function writeHeartbeat(status: "idle" | "processing", jobId?: string): void {
  try {
    const payload = JSON.stringify({
      pid: process.pid,
      status,
      jobId: jobId ?? null,
      lastHeartbeat: new Date().toISOString(),
      startedAt: metrics.startedAt,
      jobsProcessed: metrics.jobsProcessed,
      jobsFailed: metrics.jobsFailed,
      avgDurationMs: averageDurationMs(),
      lastError: metrics.lastError,
    });
    fs.writeFileSync(HEALTH_CHECK_PATH, payload, "utf8");
  } catch {
    // Best effort
  }
}

const jobStartTimes = new Map<string, number>();

// ── Supabase Client ─────────────────────────────────────────

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Redis Connection ────────────────────────────────────────

// Use shared helper so password + TLS (rediss://) are honored identically
// across web routes and workers. See src/lib/queue.ts::buildRedisConnection.
const redisConnection = buildRedisConnection(REDIS_URL);

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

    if (job.id) jobStartTimes.set(job.id, Date.now());
    writeHeartbeat("processing", job.id);

    console.log(`[webhook-worker] Delivering ${deliveryId} to ${url} (attempt ${attempt})`);

    // Block SSRF before we do anything else. URLs could have been registered
    // via the API (where we apply the sync check) but hostnames can flip to
    // private IPs via DNS between registration and delivery (rebinding).
    // Resolve fresh on every attempt.
    const urlCheck = await validatePublicUrlDynamic(url);
    if (!urlCheck.ok) {
      console.error(
        `[webhook-worker] Refusing to deliver ${deliveryId} to ${url}: ${urlCheck.reason}`
      );
      await db
        .from("webhook_deliveries")
        .update({
          status: "failed",
          response_body: `Refused: ${urlCheck.reason}`,
          attempts: attempt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);
      // Throw a non-retryable error — re-trying a blocked URL will just
      // keep failing. BullMQ will mark the job as failed.
      throw new Error(`Refused to deliver to ${url}: ${urlCheck.reason}`);
    }

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
    concurrency: WEBHOOK_WORKER_CONCURRENCY,
  }
);

// ── Lifecycle ───────────────────────────────────────────────

worker.on("failed", (job, err) => {
  console.error(`[webhook-worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  const startedAt = job?.id ? jobStartTimes.get(job.id) : undefined;
  if (job?.id) jobStartTimes.delete(job.id);
  recordJobResult(startedAt ? Date.now() - startedAt : 0, false, err.message);
  writeHeartbeat("idle");
});

worker.on("completed", (job) => {
  console.log(`[webhook-worker] Job ${job.id} completed`);
  const startedAt = job.id ? jobStartTimes.get(job.id) : undefined;
  if (job.id) jobStartTimes.delete(job.id);
  recordJobResult(startedAt ? Date.now() - startedAt : 0, true);
  writeHeartbeat("idle");
});

process.on("SIGTERM", async () => {
  console.log("[webhook-worker] Shutting down...");
  await worker.close();
  try { fs.unlinkSync(HEALTH_CHECK_PATH); } catch { /* best effort */ }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[webhook-worker] Shutting down...");
  await worker.close();
  try { fs.unlinkSync(HEALTH_CHECK_PATH); } catch { /* best effort */ }
  process.exit(0);
});

writeHeartbeat("idle");
console.log(
  `[webhook-worker] Started, waiting for jobs... (concurrency=${WEBHOOK_WORKER_CONCURRENCY})`
);
