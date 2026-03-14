/**
 * Execution Worker
 * Separate Node.js process that pulls Docker images and runs agent containers
 *
 * Usage: npm run worker
 * This runs continuously, processing jobs from the execution queue
 */

import { Worker, Job } from "bullmq";
import Docker from "dockerode";
import fs from "fs";
import path from "path";
import os from "os";
import { env } from "@/lib/env";
import { createExecutionQueue, ExecutionJob } from "@/lib/queue";
import { QUEUE_CONFIG } from "@/constants";

// Docker client
const docker = new Docker({
  host: env.DOCKER_HOST || undefined, // Use system docker if not specified
});

const EXECUTION_TIMEOUT = env.EXECUTION_TIMEOUT_MS || 600000;
const MEMORY_LIMIT_MB = env.EXECUTION_MEMORY_LIMIT_MB || 2048;

/**
 * Execute an agent container
 *
 * Lifecycle:
 * 1. Pull latest image from registry
 * 2. Create container with output volume + env vars
 * 3. Run container with timeout
 * 4. Capture stdout/stderr and exit code
 * 5. Extract output artifacts
 * 6. Clean up container
 */
async function executeAgent(job: Job<ExecutionJob, void, string>) {
  const {
    submission_id,
    docker_image_url,
    task_input,
    timeout_ms = EXECUTION_TIMEOUT,
    memory_limit_mb = MEMORY_LIMIT_MB,
  } = job.data;

  console.log(`[${submission_id}] Starting execution of ${docker_image_url}`);

  let container: Docker.Container | null = null;
  let outputDir: string | null = null;

  try {
    // Update job progress
    job.updateProgress(10);

    // 1. Pull image from registry
    console.log(`[${submission_id}] Pulling image...`);
    try {
      await docker.pull(docker_image_url);
    } catch (error) {
      throw new Error(`Failed to pull Docker image: ${error}`);
    }

    job.updateProgress(30);

    // 2. Create temporary output directory
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "arena-output-"));
    console.log(`[${submission_id}] Output directory: ${outputDir}`);

    // 3. Create and run container
    console.log(`[${submission_id}] Creating container...`);
    container = await docker.createContainer({
      Image: docker_image_url,
      Env: [
        `ARENA_TASK_INPUT=${JSON.stringify(task_input)}`,
        `SUBMISSION_ID=${submission_id}`,
      ],
      Volumes: {
        "/arena/output": {},
      },
      HostConfig: {
        Binds: [`${outputDir}:/arena/output`],
        NetworkMode: "none", // Disable network
        Memory: memory_limit_mb * 1024 * 1024,
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    job.updateProgress(50);

    // 4. Run container with timeout
    console.log(`[${submission_id}] Running container (timeout: ${timeout_ms}ms)...`);
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      // Start container
      await container.start();
      console.log(`[${submission_id}] Container started`);

      // Wait for container to finish with timeout
      const waitPromise = container.wait();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Container execution timeout")), timeout_ms)
      );

      try {
        const result = await Promise.race([waitPromise, timeoutPromise]);
        exitCode = (result as any).StatusCode || 0;
      } catch (error) {
        // Force kill container on timeout
        if (error instanceof Error && error.message === "Container execution timeout") {
          console.log(`[${submission_id}] Timeout reached, killing container...`);
          await container.kill();
          throw error;
        }
        throw error;
      }

      // Get logs after container finishes
      try {
        const logs = await container.logs({
          stdout: true,
          stderr: true,
        });
        stdout = logs.toString();
      } catch (error) {
        console.error(`[${submission_id}] Error getting logs:`, error);
      }
    } catch (error) {
      console.error(`[${submission_id}] Error running container:`, error);
      exitCode = 1;
    }

    const elapsedTime = Date.now() - startTime;
    console.log(
      `[${submission_id}] Container exited with code ${exitCode} (${elapsedTime}ms)`
    );

    job.updateProgress(75);

    // 5. Read output artifacts
    let artifacts = {};
    try {
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          artifacts = {
            ...artifacts,
            [file]: fs.readFileSync(filePath, "utf-8"),
          };
        }
      }
    } catch (error) {
      console.error(`[${submission_id}] Error reading artifacts:`, error);
    }

    job.updateProgress(90);

    // 6. Return results (will be stored in database)
    const result = {
      submission_id,
      status: exitCode === 0 ? "completed" : "failed",
      exit_code: exitCode,
      stdout,
      stderr,
      artifacts,
      executed_at: new Date().toISOString(),
    };

    console.log(
      `[${submission_id}] Execution complete. Status: ${result.status}`
    );

    job.updateProgress(100);

    return result;
  } catch (error) {
    console.error(`[${submission_id}] Execution failed:`, error);
    throw error;
  } finally {
    // Clean up
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (error) {
        console.error(`[${submission_id}] Error removing container:`, error);
      }
    }

    if (outputDir && fs.existsSync(outputDir)) {
      try {
        fs.rmSync(outputDir, { recursive: true });
      } catch (error) {
        console.error(`[${submission_id}] Error removing temp directory:`, error);
      }
    }
  }
}

/**
 * Start the execution worker
 */
async function startWorker() {
  console.log("Starting execution worker...");

  const queue = createExecutionQueue();
  const worker = new Worker<ExecutionJob>(
    QUEUE_CONFIG.EXECUTION_QUEUE,
    executeAgent,
    {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || "6379"),
      },
      concurrency: 1, // Only one container at a time
    }
  );

  worker.on("completed", (job) => {
    console.log(`[${job.data.submission_id}] Job completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${job?.data.submission_id}] Job failed:`, err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down worker...");
    await worker.close();
    process.exit(0);
  });

  console.log("Execution worker running and listening for jobs...");
}

// Start worker if this is the main module
if (require.main === module) {
  startWorker().catch((error) => {
    console.error("Failed to start worker:", error);
    process.exit(1);
  });
}

export { executeAgent };
