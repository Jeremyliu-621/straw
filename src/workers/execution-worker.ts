/**
 * EXECUTION WORKER — Architecture
 *
 * This is a separate Node.js process. It NEVER imports Next.js internals.
 * It connects to Redis via BullMQ and processes execution jobs.
 *
 * Flow:
 * 1. Receive job with { submissionId, taskId, dockerImage, inputSpec }
 * 2. Update submission status to "running"
 * 3. Pull the Docker image
 * 4. Run the container with:
 *    - --network none (no network access)
 *    - Memory limit (512MB)
 *    - CPU limit (1 core)
 *    - Timeout (5 minutes)
 *    - MAP_TASK_INPUT env var set to inputSpec
 *    - /output volume mounted for capturing output
 * 5. Wait for container to exit
 * 6. If exit code 0: upload output, update status to "completed", enqueue evaluation
 * 7. If exit code != 0: update status to "failed" with error message
 *
 * Failure modes handled:
 * - Image pull failure → failed, "Docker image pull failed"
 * - Container timeout → failed, "Execution timed out"
 * - Non-zero exit code → failed, "Agent exited with code N"
 * - No output produced → failed, "No output found in /output"
 * - Docker daemon error → retry via BullMQ backoff
 */

import { Worker, Queue } from "bullmq";
import Dockerode from "dockerode";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import os from "os";
import { NOTIFICATION_TYPE, AUDIT_ACTION } from "@/constants";
import {
  dispatchWebhookFromWorker,
  dispatchNotificationFromWorker,
  writeAuditLog,
} from "./lib/dispatch";
import type { WebhookPayload } from "./lib/dispatch";

// ── Config (no env.ts import — this is not a Next.js process) ──

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required env vars: REDIS_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EXECUTION_TIMEOUT_MS = 5 * 60 * 1000;
const MEMORY_LIMIT = 512 * 1024 * 1024; // 512MB in bytes
const CPU_LIMIT = 1e9; // 1 CPU in nanoCPUs
const OUTPUT_DIR = "/output";
const INPUT_ENV_VAR = "MAP_TASK_INPUT";
const QUEUE_NAME = "execution";
const EVAL_QUEUE_NAME = "evaluation";
const WEBHOOK_QUEUE_NAME = "webhook";
const STORAGE_BUCKET = "agent-outputs";
const EXECUTION_LOG_MAX_BYTES = 50 * 1024; // 50KB max stored log size

// ── Clients ──────────────────────────────────────────────────

const docker = new Dockerode();
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const redisConnection = {
  host: new URL(REDIS_URL).hostname,
  port: Number(new URL(REDIS_URL).port) || 6379,
};

const evaluationQueue = new Queue(EVAL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ── Worker ───────────────────────────────────────────────────

interface ExecutionJobData {
  submissionId: string;
  taskId: string;
  dockerImage: string;
  inputSpec: string;
}

const worker = new Worker<ExecutionJobData>(
  QUEUE_NAME,
  async (job) => {
    const { submissionId, dockerImage, inputSpec } = job.data;
    console.log(`[exec] Processing submission ${submissionId} with image ${dockerImage}`);

    // Update status to running
    await updateSubmission(submissionId, "running", { started_at: new Date().toISOString() });

    // Create temp output directory
    const tmpDir = path.join(os.tmpdir(), `map-exec-${submissionId}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // 1. Pull image
      console.log(`[exec] Pulling image ${dockerImage}...`);
      try {
        await pullImage(dockerImage);
      } catch (err) {
        throw new ExecutionError("Docker image pull failed", err);
      }

      // 2. Create and start container
      console.log(`[exec] Creating container...`);
      const container = await docker.createContainer({
        Image: dockerImage,
        Env: [`${INPUT_ENV_VAR}=${inputSpec}`],
        HostConfig: {
          Memory: MEMORY_LIMIT,
          NanoCpus: CPU_LIMIT,
          NetworkMode: "none",
          Binds: [`${tmpDir}:${OUTPUT_DIR}`],
          AutoRemove: false,
        },
      });

      // 3. Start and wait with timeout
      await container.start();
      console.log(`[exec] Container started, waiting...`);

      const exitCode = await waitForContainer(container, EXECUTION_TIMEOUT_MS);

      // 4. Capture logs and truncate to max size
      const logs = await container.logs({ stdout: true, stderr: true, follow: false });
      const logText = truncateLog(logs.toString());

      // 5. Persist logs to submission record regardless of outcome
      await saveExecutionLog(submissionId, logText);

      // 6. Clean up container
      try {
        await container.remove({ force: true });
      } catch {
        // Best effort cleanup
      }

      // 7. Check exit code
      if (exitCode !== 0) {
        throw new ExecutionError(`Agent exited with code ${exitCode}`, logText);
      }

      // 8. Check output exists
      const outputFiles = fs.readdirSync(tmpDir);
      if (outputFiles.length === 0) {
        throw new ExecutionError("No output found in /output");
      }

      // 9. Upload output to Supabase Storage
      const outputUrl = await uploadOutput(submissionId, tmpDir, outputFiles);

      // 10. Update submission to completed
      await updateSubmission(submissionId, "completed", {
        output_url: outputUrl,
        completed_at: new Date().toISOString(),
      });

      // 11. Enqueue evaluation job
      await evaluationQueue.add(`eval-${submissionId}`, {
        submissionId,
        taskId: job.data.taskId,
        outputUrl,
      });
      console.log(`[exec] Submission ${submissionId} completed, evaluation enqueued`);

      // 12. Dispatch submission.completed webhook + notification + audit
      const { data: taskInfo } = await db
        .from("tasks")
        .select("company_id")
        .eq("id", job.data.taskId)
        .single();
      if (taskInfo) {
        await dispatchWebhookFromWorker(
          db,
          webhookQueue,
          taskInfo.company_id as string,
          "submission.completed",
          {
            event: "submission.completed",
            timestamp: new Date().toISOString(),
            data: { submission_id: submissionId, task_id: job.data.taskId },
          }
        );
      }

      // 13. Notify the agent that their submission completed
      const { data: subInfo } = await db
        .from("submissions")
        .select("agent_id")
        .eq("id", submissionId)
        .single();
      if (subInfo) {
        await dispatchNotificationFromWorker(
          db,
          NOTIFICATION_TYPE.SUBMISSION_COMPLETED,
          subInfo.agent_id as string,
          "Submission completed",
          `Your submission has finished executing and is queued for evaluation.`,
          "submission",
          submissionId
        );
        await writeAuditLog(
          db,
          AUDIT_ACTION.SUBMISSION_COMPLETED,
          subInfo.agent_id as string,
          "submission",
          submissionId,
          { task_id: job.data.taskId }
        );
      }
    } catch (err) {
      const message = err instanceof ExecutionError ? err.message : "Unexpected execution error";
      console.error(`[exec] Submission ${submissionId} failed: ${message}`);

      await updateSubmission(submissionId, "failed", {
        error_message: message,
        completed_at: new Date().toISOString(),
      });

      // Dispatch submission.failed webhook + notification + audit
      const { data: taskInfo } = await db
        .from("tasks")
        .select("company_id")
        .eq("id", job.data.taskId)
        .single();
      if (taskInfo) {
        await dispatchWebhookFromWorker(
          db,
          webhookQueue,
          taskInfo.company_id as string,
          "submission.failed",
          {
            event: "submission.failed",
            timestamp: new Date().toISOString(),
            data: {
              submission_id: submissionId,
              task_id: job.data.taskId,
              error_message: message,
            },
          }
        );
      }

      // Notify the agent that their submission failed
      const { data: failedSubInfo } = await db
        .from("submissions")
        .select("agent_id")
        .eq("id", submissionId)
        .single();
      if (failedSubInfo) {
        await dispatchNotificationFromWorker(
          db,
          NOTIFICATION_TYPE.SUBMISSION_FAILED,
          failedSubInfo.agent_id as string,
          "Submission failed",
          `Your submission failed: ${message}`,
          "submission",
          submissionId
        );
        await writeAuditLog(
          db,
          AUDIT_ACTION.SUBMISSION_FAILED,
          failedSubInfo.agent_id as string,
          "submission",
          submissionId,
          { task_id: job.data.taskId, error_message: message }
        );
      }

      // Don't rethrow ExecutionError — these are permanent failures
      if (err instanceof ExecutionError) return;
      throw err; // Rethrow unexpected errors for BullMQ retry
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Best effort
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// ── Storage Upload ──────────────────────────────────────────

async function ensureBucketExists(): Promise<void> {
  const { data: buckets } = await db.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    const { error } = await db.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB max per file
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Failed to create storage bucket: ${error.message}`);
    }
  }
}

async function uploadOutput(
  submissionId: string,
  tmpDir: string,
  outputFiles: string[]
): Promise<string> {
  await ensureBucketExists();

  const storagePath = `submissions/${submissionId}`;
  const uploadedPaths: string[] = [];

  for (const file of outputFiles) {
    const filePath = path.join(tmpDir, file);
    const stat = fs.statSync(filePath);

    // Skip directories, only upload files
    if (stat.isDirectory()) continue;

    const fileContent = fs.readFileSync(filePath);
    const remotePath = `${storagePath}/${file}`;

    const { error } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(remotePath, fileContent, {
        upsert: true,
        contentType: "application/octet-stream",
      });

    if (error) {
      console.error(`[exec] Failed to upload ${file}: ${error.message}`);
      throw new Error(`Storage upload failed for ${file}: ${error.message}`);
    }

    uploadedPaths.push(remotePath);
  }

  console.log(`[exec] Uploaded ${uploadedPaths.length} files to ${storagePath}`);
  return storagePath;
}

// ── Helpers ──────────────────────────────────────────────────

class ExecutionError extends Error {
  constructor(
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

/**
 * Truncate log output to EXECUTION_LOG_MAX_BYTES.
 * If truncated, prepends a notice so the agent builder knows.
 */
function truncateLog(log: string): string {
  if (Buffer.byteLength(log, "utf8") <= EXECUTION_LOG_MAX_BYTES) {
    return log;
  }
  const truncated = Buffer.from(log, "utf8").subarray(0, EXECUTION_LOG_MAX_BYTES).toString("utf8");
  return `[LOG TRUNCATED — showing first ${EXECUTION_LOG_MAX_BYTES} bytes]\n${truncated}`;
}

/**
 * Save execution log to the submission record.
 * Best-effort — failure to save logs should not block the pipeline.
 */
async function saveExecutionLog(submissionId: string, logText: string): Promise<void> {
  const { error } = await db
    .from("submissions")
    .update({ execution_log: logText })
    .eq("id", submissionId);

  if (error) {
    console.error(`[exec] Failed to save execution log for ${submissionId}:`, error);
  }
}

async function pullImage(image: string): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (followErr: Error | null) => {
        if (followErr) return reject(followErr);
        resolve();
      });
    });
  });
}

async function waitForContainer(container: Dockerode.Container, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      try {
        await container.kill();
      } catch {
        // Container may have already exited
      }
      reject(new ExecutionError("Execution timed out"));
    }, timeoutMs);

    container
      .wait()
      .then((result) => {
        clearTimeout(timeout);
        resolve(result.StatusCode);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

async function updateSubmission(
  id: string,
  status: string,
  extra?: Record<string, string | null>
) {
  const { error } = await db
    .from("submissions")
    .update({ status, ...extra })
    .eq("id", id);

  if (error) {
    console.error(`[exec] Failed to update submission ${id}:`, error);
  }
}

// ── Lifecycle ────────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[exec] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[exec] Job ${job?.id} failed:`, err.message);
});

console.log("[exec] Execution worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  console.log("[exec] Shutting down...");
  await worker.close();
  await evaluationQueue.close();
  await webhookQueue.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[exec] Shutting down...");
  await worker.close();
  await evaluationQueue.close();
  await webhookQueue.close();
  process.exit(0);
});
