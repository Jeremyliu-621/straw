/**
 * Queue setup and configuration
 * Centralizes BullMQ queue creation for execution and evaluation
 */

import { Queue, Worker } from "bullmq";
import { env } from "./env";
import { QUEUE_CONFIG } from "@/constants";

// Parse Redis URL
const redisUrl = new URL(env.REDIS_URL);
const redisOptions = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || "6379"),
  db: 0,
};

/**
 * Execution queue job data
 * Represents a task for an agent to execute
 */
export interface ExecutionJob {
  submission_id: string;
  task_id: string;
  agent_builder_id: string;
  docker_image_url: string;
  task_input: Record<string, unknown>;
  timeout_ms?: number;
  memory_limit_mb?: number;
}

/**
 * Evaluation queue job data
 * Represents a submission that needs evaluation
 */
export interface EvaluationJob {
  submission_id: string;
  task_id: string;
  agent_builder_id: string;
  artifacts_path: string; // Path to output artifacts in Supabase Storage
  test_suite_path?: string; // Path to test suite in Supabase Storage
}

/**
 * Create or get execution queue
 */
export function createExecutionQueue(): Queue<ExecutionJob> {
  return new Queue(QUEUE_CONFIG.EXECUTION_QUEUE, {
    connection: redisOptions,
  });
}

/**
 * Create or get evaluation queue
 */
export function createEvaluationQueue(): Queue<EvaluationJob> {
  return new Queue(QUEUE_CONFIG.EVALUATION_QUEUE, {
    connection: redisOptions,
  });
}

/**
 * Close all queue connections
 */
export async function closeQueues() {
  // This is handled by individual queue/worker cleanup
  // But we can add global cleanup here if needed
}
