import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { QUEUE_EXECUTION, QUEUE_EVALUATION, QUEUE_MAX_ATTEMPTS, QUEUE_BACKOFF_DELAY_MS } from "@/constants";

// ── Queue Definitions ────────────────────────────────────────

export interface ExecutionJobData {
  submissionId: string;
  taskId: string;
  dockerImage: string;
  inputSpec: string;
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

export { Queue, Worker, type Job, type ConnectionOptions };
