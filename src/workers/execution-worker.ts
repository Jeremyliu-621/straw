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
const STORAGE_BUCKET = "agent-outputs";

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

      // 4. Capture logs
      const logs = await container.logs({ stdout: true, stderr: true, follow: false });
      const logText = logs.toString().slice(0, 10000); // Cap at 10K chars

      // 5. Clean up container
      try {
        await container.remove({ force: true });
      } catch {
        // Best effort cleanup
      }

      // 6. Check exit code
      if (exitCode !== 0) {
        throw new ExecutionError(`Agent exited with code ${exitCode}`, logText);
      }

      // 7. Check output exists
      const outputFiles = fs.readdirSync(tmpDir);
      if (outputFiles.length === 0) {
        throw new ExecutionError("No output found in /output");
      }

      // 8. Upload output to Supabase Storage
      const outputUrl = await uploadOutput(submissionId, tmpDir, outputFiles);

      // 9. Update submission to completed
      await updateSubmission(submissionId, "completed", {
        output_url: outputUrl,
        completed_at: new Date().toISOString(),
      });

      // 10. Enqueue evaluation job
      await evaluationQueue.add(`eval-${submissionId}`, {
        submissionId,
        taskId: job.data.taskId,
        outputUrl,
      });
      console.log(`[exec] Submission ${submissionId} completed, evaluation enqueued`);
    } catch (err) {
      const message = err instanceof ExecutionError ? err.message : "Unexpected execution error";
      console.error(`[exec] Submission ${submissionId} failed: ${message}`);

      await updateSubmission(submissionId, "failed", {
        error_message: message,
        completed_at: new Date().toISOString(),
      });

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
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[exec] Shutting down...");
  await worker.close();
  await evaluationQueue.close();
  process.exit(0);
});
