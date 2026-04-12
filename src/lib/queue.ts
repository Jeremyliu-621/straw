import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { QUEUE_EXECUTION, QUEUE_EVALUATION, QUEUE_WEBHOOK, QUEUE_MAX_ATTEMPTS, QUEUE_BACKOFF_DELAY_MS, WEBHOOK_MAX_DELIVERY_ATTEMPTS } from "@/constants";

// ── Queue Definitions ────────────────────────────────────────

export interface ExecutionJobData {
  submissionId: string;
  taskId: string;
  inputSpec: string;
  mode: "api" | "docker";
  // docker mode
  dockerImage?: string;
  // api mode
  apiEndpoint?: string;
  agentDisplayName?: string;
}

export interface EvaluationJobData {
  submissionId: string;
  taskId: string;
  outputUrl: string;
}

export function createExecutionQueue(connection: ConnectionOptions) {
  return new Queue<ExecutionJobData>(QUEUE_EXECUTION, {
    connection,
    defaultJobOptions: {
      attempts: QUEUE_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: QUEUE_BACKOFF_DELAY_MS },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
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
