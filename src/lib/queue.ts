import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { QUEUE_EVALUATION, QUEUE_WEBHOOK, QUEUE_MAX_ATTEMPTS, QUEUE_BACKOFF_DELAY_MS, WEBHOOK_MAX_DELIVERY_ATTEMPTS } from "@/constants";

/**
 * Build a BullMQ connection option from a Redis URL.
 *
 * Parses password, username, database index, and TLS upgrade (`rediss://`)
 * off the URL so managed providers like Upstash, Redis Cloud, and ElastiCache
 * work without additional config. Earlier call sites manually built
 * `{ host, port }` from `new URL(REDIS_URL)`, silently dropping auth + TLS —
 * fine against local Docker Redis, broken against anything managed.
 *
 * Always route new Redis connections through this helper.
 */
export function buildRedisConnection(url?: string): ConnectionOptions {
  const resolved = url ?? process.env.REDIS_URL;
  if (!resolved) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  const parsed = new URL(resolved);
  const opts: ConnectionOptions = {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    // Required for BullMQ Workers; harmless on Queues.
    maxRetriesPerRequest: null,
  };
  if (parsed.password) opts.password = decodeURIComponent(parsed.password);
  if (parsed.username && parsed.username !== "default") {
    opts.username = decodeURIComponent(parsed.username);
  }
  if (parsed.protocol === "rediss:") {
    opts.tls = {};
  }
  const dbPath = parsed.pathname.replace(/^\//, "");
  if (dbPath) {
    const db = Number(dbPath);
    if (Number.isFinite(db) && db >= 0) opts.db = db;
  }
  return opts;
}

// ── Queue Definitions ────────────────────────────────────────

export interface EvaluationJobData {
  submissionId: string;
  taskId: string;
  outputUrl: string;
}

export function createEvaluationQueue(connection: ConnectionOptions) {
  return new Queue<EvaluationJobData>(QUEUE_EVALUATION, {
    connection,
    defaultJobOptions: {
      attempts: QUEUE_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: QUEUE_BACKOFF_DELAY_MS },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
}

// ── Webhook Queue ───────────────────────────────────────────

export interface WebhookJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: string;
}

export function createWebhookQueue(connection: ConnectionOptions) {
  return new Queue<WebhookJobData>(QUEUE_WEBHOOK, {
    connection,
    defaultJobOptions: {
      attempts: WEBHOOK_MAX_DELIVERY_ATTEMPTS,
      backoff: { type: "exponential", delay: QUEUE_BACKOFF_DELAY_MS },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
}

export { Queue, Worker, type Job, type ConnectionOptions };
