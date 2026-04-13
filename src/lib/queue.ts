import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { QUEUE_EVALUATION, QUEUE_WEBHOOK, QUEUE_MAX_ATTEMPTS, QUEUE_BACKOFF_DELAY_MS, WEBHOOK_MAX_DELIVERY_ATTEMPTS } from "@/constants";

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
