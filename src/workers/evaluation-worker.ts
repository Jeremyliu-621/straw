/**
 * EVALUATION WORKER — Architecture
 *
 * This is a separate Node.js process. It NEVER imports Next.js internals.
 * It connects to Redis via BullMQ and processes evaluation jobs.
 *
 * Flow:
 * 1. Receive job with { submissionId, taskId, outputUrl }
 * 2. Fetch the task (including rubric criteria) and agent output
 * 3. Route by task.eval_mode:
 *
 *    'llm' (default):
 *      Phase 1: Run automated tests (if test_weight > 0)
 *      Phase 2: LLM judge (Gemini) for scores + reasoning
 *      Phase 3: final_score = weighted blend of test + llm scores
 *
 *    'container':
 *      Download agent output to tmpDir/agent_output/
 *      Run company's eval Docker image against agent output
 *      Read /results/score.json for final score + breakdown
 *      No LLM call
 *
 *    'hybrid':
 *      Same container eval as 'container' mode
 *      Also run LLM for qualitative notes only (not for scoring)
 *      final_score = container score
 *
 * 4. Write immutable evaluation_result + evaluation_dimensions
 * 5. Update submission status
 *
 * Edge cases:
 * - No output → llm_score = 0, test_score = 0
 * - Test suite failure → test_score = 0, log error
 * - LLM response invalid → retry once, then flag
 * - Missing rubric criteria → error, do not score
 * - EvalContainerError → permanent failure, no retry, record container_exit_code
 * - eval_image missing when mode is container/hybrid → permanent failure
 */

import { config } from "dotenv";
import { existsSync } from "fs";
if (existsSync(".env.local")) config({ path: ".env.local" });

import { Worker, Queue } from "bullmq";
import Dockerode from "dockerode";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import os from "os";
import {
  EVALUATION_LLM_MODEL,
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
  AUDIT_ACTION,
  EVAL_MODE,
  EVAL_CONTAINER_TIMEOUT_MS,
  EVAL_CONTAINER_MEMORY_LIMIT,
  EVAL_CONTAINER_CPU_LIMIT,
  EVAL_CONTAINER_OUTPUT_PATH,
  EVAL_CONTAINER_INPUT_PATH,
  EVAL_SCORE_JSON_FILENAME,
} from "@/constants";
import type { EvalMode } from "@/constants";
import { z } from "zod/v4";
import { TaskInvitationRepository } from "@/db/task-invitations";
import {
  dispatchWebhookFromWorker,
  dispatchNotificationFromWorker,
  dispatchNotificationToTaskOwnerFromWorker,
  writeAuditLog,
} from "./lib/dispatch";
import type { WebhookPayload } from "./lib/dispatch";

// ── Config ───────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error("Missing required env vars");
  process.exit(1);
}

const LLM_MAX_TOKENS = 4096;
const QUEUE_NAME = "evaluation";
const WEBHOOK_QUEUE_NAME = "webhook";
const STORAGE_BUCKET = "agent-outputs";
const MAX_OUTPUT_SIZE = 100_000; // 100K chars max for LLM context

// ── Clients ──────────────────────────────────────────────────

const docker = new Dockerode();
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);

const redisConnection = {
  host: new URL(REDIS_URL).hostname,
  port: Number(new URL(REDIS_URL).port) || 6379,
};

const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ── Error Types ───────────────────────────────────────────────

class EvalContainerError extends Error {
  constructor(
    message: string,
    public exitCode?: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "EvalContainerError";
  }
}

// ── LLM Response Schema ──────────────────────────────────────

const dimensionScoreSchema = z.object({
  criterion_name: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
});

const llmResponseSchema = z.object({
  dimensions: z.array(dimensionScoreSchema),
  overall_reasoning: z.string(),
});

type LLMResponse = z.infer<typeof llmResponseSchema>;

// ── Score.json Schema ─────────────────────────────────────────

const scoreJsonSchema = z.object({
  score: z.number().min(0).max(100),
  pass: z.boolean(),
  breakdown: z.record(z.string(), z.number()).optional(),
  notes: z.string().optional(),
});

type ScoreJson = z.infer<typeof scoreJsonSchema>;

// ── Job Types ────────────────────────────────────────────────

interface EvaluationJobData {
  submissionId: string;
  taskId: string;
  outputUrl: string;
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
}

interface ContainerEvalResult {
  score: number;
  pass: boolean;
  breakdown: Record<string, number> | undefined;
  notes: string | undefined;
  exitCode: number;
}

// ── Output Fetching (LLM path — returns combined text string) ────

async function fetchAgentOutput(outputUrl: string): Promise<string> {
  const { data: files, error: listError } = await db.storage
    .from(STORAGE_BUCKET)
    .list(outputUrl);

  if (listError) {
    console.error(`[eval] Failed to list output files: ${listError.message}`);
    return "";
  }

  if (!files || files.length === 0) {
    console.error(`[eval] No output files found at ${outputUrl}`);
    return "";
  }

  const outputs: string[] = [];

  for (const file of files) {
    if (file.metadata && file.metadata.size === 0) continue;

    const { data, error: downloadError } = await db.storage
      .from(STORAGE_BUCKET)
      .download(`${outputUrl}/${file.name}`);

    if (downloadError) {
      console.error(`[eval] Failed to download ${file.name}: ${downloadError.message}`);
      continue;
    }

    const text = await data.text();
    outputs.push(`--- ${file.name} ---\n${text}`);
  }

  const combined = outputs.join("\n\n");

  if (combined.length > MAX_OUTPUT_SIZE) {
    console.log(`[eval] Output truncated from ${combined.length} to ${MAX_OUTPUT_SIZE} chars`);
    return combined.slice(0, MAX_OUTPUT_SIZE) + "\n\n[Output truncated due to size]";
  }

  return combined;
}

// ── Output Download (container path — writes files to disk) ─────

/**
 * Download all files from `outputUrl` in the agent-outputs bucket to `destDir`.
 * Returns the number of files downloaded.
 */
async function downloadAgentOutputToDir(outputUrl: string, destDir: string): Promise<number> {
  const { data: files, error: listError } = await db.storage
    .from(STORAGE_BUCKET)
    .list(outputUrl);

  if (listError) {
    throw new EvalContainerError(
      `Failed to list agent output files: ${listError.message}`
    );
  }

  if (!files || files.length === 0) {
    console.warn(`[eval] No agent output files found at ${outputUrl}`);
    return 0;
  }

  fs.mkdirSync(destDir, { recursive: true });
  let downloaded = 0;

  for (const file of files) {
    // Skip zero-byte placeholder entries (Supabase storage creates these for folders)
    if (file.metadata && file.metadata.size === 0) continue;

    const { data, error: downloadError } = await db.storage
      .from(STORAGE_BUCKET)
      .download(`${outputUrl}/${file.name}`);

    if (downloadError || !data) {
      console.error(`[eval] Failed to download ${file.name}: ${downloadError?.message}`);
      continue;
    }

    const destPath = path.join(destDir, file.name);
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    downloaded++;
  }

  console.log(`[eval] Downloaded ${downloaded} agent output files to ${destDir}`);
  return downloaded;
}

/**
 * Read all files from a local directory and combine them into a single text string
 * (same format as fetchAgentOutput). Used in hybrid mode to avoid re-downloading from storage.
 */
function readLocalOutputAsText(dirPath: string): string {
  if (!fs.existsSync(dirPath)) return "";

  const files = fs.readdirSync(dirPath);
  if (files.length === 0) return "";

  const outputs: string[] = [];
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) continue;
    const text = fs.readFileSync(filePath, "utf8");
    outputs.push(`--- ${file} ---\n${text}`);
  }

  const combined = outputs.join("\n\n");
  if (combined.length > MAX_OUTPUT_SIZE) {
    return combined.slice(0, MAX_OUTPUT_SIZE) + "\n\n[Output truncated due to size]";
  }
  return combined;
}

// ── Eval Container ────────────────────────────────────────────

interface EvalContainerOptions {
  /** Allow network access (default: false) */
  network?: boolean;
  /** Memory limit in MB (default: 1024) */
  memoryMb?: number;
  /** Timeout in seconds (default: 600) */
  timeoutSeconds?: number;
}

/**
 * Pull `evalImage` if not present locally, then run it with company-configured constraints.
 * Mounts submission files at /submission:ro, results at /results.
 * Reads and validates /results/score.json after exit.
 */
async function runEvalContainer(
  evalImage: string,
  agentOutputPath: string,
  resultsPath: string,
  options?: EvalContainerOptions
): Promise<ContainerEvalResult> {
  const networkMode = options?.network ? "bridge" : "none";
  const memoryBytes = (options?.memoryMb ?? 1024) * 1024 * 1024;
  const timeoutMs = (options?.timeoutSeconds ?? 600) * 1000;
  fs.mkdirSync(resultsPath, { recursive: true });

  // Pull image if not present
  console.log(`[eval] Pulling eval image ${evalImage}...`);
  try {
    await pullDockerImage(evalImage);
  } catch (err) {
    throw new EvalContainerError(
      `Failed to pull eval image ${evalImage}: ${(err as Error).message}`,
      undefined,
      err
    );
  }

  // Create container
  console.log(`[eval] Creating eval container...`);
  const container = await docker.createContainer({
    Image: evalImage,
    HostConfig: {
      Memory: memoryBytes,
      NanoCpus: EVAL_CONTAINER_CPU_LIMIT,
      NetworkMode: networkMode,
      Binds: [
        `${agentOutputPath}:${EVAL_CONTAINER_INPUT_PATH}:ro`,
        `${resultsPath}:${EVAL_CONTAINER_OUTPUT_PATH}`,
      ],
      AutoRemove: false,
    },
  });

  await container.start();
  console.log(`[eval] Eval container started (network=${networkMode}, memory=${options?.memoryMb ?? 1024}MB, timeout=${(options?.timeoutSeconds ?? 600)}s)...`);

  let exitCode: number;
  try {
    exitCode = await waitForEvalContainer(container, timeoutMs);
  } catch (err) {
    // Timeout path — container already killed inside waitForEvalContainer
    try { await container.remove({ force: true }); } catch { /* best effort */ }
    if (err instanceof EvalContainerError) throw err;
    throw new EvalContainerError(
      `Eval container wait failed: ${(err as Error).message}`,
      undefined,
      err
    );
  }

  // Capture logs before removing container (for debugging eval failures)
  let containerLogs = "";
  try {
    const logs = await container.logs({ stdout: true, stderr: true, follow: false });
    containerLogs = logs.toString().slice(0, 10_000); // Cap at 10KB
  } catch {
    // Best effort — don't block on log capture failure
  }

  // Cleanup container
  try {
    await container.remove({ force: true });
  } catch {
    // Best effort
  }

  if (exitCode !== 0) {
    const detail = containerLogs ? `\n--- Container logs ---\n${containerLogs}` : "";
    throw new EvalContainerError(
      `Eval container exited with code ${exitCode}${detail}`,
      exitCode
    );
  }

  // Read and validate score.json
  const scoreJsonPath = path.join(resultsPath, EVAL_SCORE_JSON_FILENAME);
  if (!fs.existsSync(scoreJsonPath)) {
    throw new EvalContainerError(
      `Eval container did not produce ${EVAL_SCORE_JSON_FILENAME}`,
      exitCode
    );
  }

  let parsed: unknown;
  let rawContent = "";
  try {
    rawContent = fs.readFileSync(scoreJsonPath, "utf8");
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new EvalContainerError(
      `Failed to parse ${EVAL_SCORE_JSON_FILENAME}: ${(err as Error).message}. Content: ${rawContent.slice(0, 500)}`,
      exitCode
    );
  }

  const validated = scoreJsonSchema.safeParse(parsed);
  if (!validated.success) {
    throw new EvalContainerError(
      `Invalid ${EVAL_SCORE_JSON_FILENAME}: ${z.prettifyError(validated.error)}. Got: ${JSON.stringify(parsed).slice(0, 300)}`,
      exitCode
    );
  }

  const { score, pass, breakdown, notes } = validated.data;
  console.log(`[eval] Eval container score: ${score} (pass=${pass})`);

  return { score, pass, breakdown, notes, exitCode };
}

// ── Docker Helpers ────────────────────────────────────────────

async function pullDockerImage(image: string): Promise<void> {
  // Check if image exists locally first — avoids failing on local-only images
  try {
    await docker.getImage(image).inspect();
    console.log(`[eval] Image ${image} found locally, skipping pull`);
    return;
  } catch {
    // Image not found locally — pull from registry
  }

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

async function waitForEvalContainer(
  container: Dockerode.Container,
  timeoutMs: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      try {
        await container.kill({ signal: "SIGKILL" });
      } catch {
        // Container may have already exited
      }
      reject(new EvalContainerError("Eval container timed out", undefined));
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

// ── Worker ───────────────────────────────────────────────────

const worker = new Worker<EvaluationJobData>(
  QUEUE_NAME,
  async (job) => {
    const { submissionId, taskId, outputUrl } = job.data;
    console.log(`[eval] Evaluating submission ${submissionId}`);

    // 1. Fetch task and rubric criteria
    const { data: task, error: taskError } = await db
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const { data: criteria, error: criteriaError } = await db
      .from("rubric_criteria")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });

    if (criteriaError || !criteria || criteria.length === 0) {
      throw new Error(`No rubric criteria found for task ${taskId}`);
    }

    // Resolve eval mode, defaulting to 'llm'
    const evalMode: EvalMode = (task.eval_mode as EvalMode) ?? EVAL_MODE.LLM;

    // ── Route by eval mode ────────────────────────────────────

    if (evalMode === EVAL_MODE.CONTAINER || evalMode === EVAL_MODE.HYBRID) {
      await handleContainerEval(
        { submissionId, taskId, outputUrl, task, criteria, evalMode },
        webhookQueue
      );
      return;
    }

    // Default: EVAL_MODE.LLM — existing path unchanged
    await handleLlmEval(
      { submissionId, taskId, outputUrl, task, criteria },
      webhookQueue
    );
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// ── Handler: LLM eval (original path) ────────────────────────

interface LlmEvalContext {
  submissionId: string;
  taskId: string;
  outputUrl: string;
  task: Record<string, unknown>;
  criteria: RubricCriterion[];
}

async function handleLlmEval(
  ctx: LlmEvalContext,
  workerWebhookQueue: Queue
): Promise<void> {
  const { submissionId, taskId, outputUrl, task, criteria } = ctx;

  // Fetch agent output text
  const agentOutput = await fetchAgentOutput(outputUrl);
  if (!agentOutput) {
    console.error(`[eval] No output content for submission ${submissionId}`);
  }

  // Platform build check — download files to temp dir, attempt build, pass result to LLM
  let buildCheckResult: string = "";
  try {
    const { detectLanguage, runBuildCheck } = await import("@/services/build-check.service");
    const tmpDir = path.join(os.tmpdir(), `map-build-${submissionId}`);
    await downloadAgentOutputToDir(outputUrl, tmpDir);
    const lang = detectLanguage(tmpDir);
    if (lang) {
      console.log(`[eval] Build check: detected ${lang.name}, running ${lang.buildCommand}`);
      const result = runBuildCheck(tmpDir);
      buildCheckResult = result.success
        ? `Build check: SUCCESS (${result.detected}, ${result.durationMs}ms)`
        : `Build check: FAILED (${result.detected})\n${result.output}`;
      console.log(`[eval] Build check result: ${result.success ? "success" : "failed"} (${result.durationMs}ms)`);
    } else {
      buildCheckResult = "Build check: skipped (unknown language/framework)";
    }
    // Clean up
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  } catch (err) {
    console.error(`[eval] Build check failed:`, err);
    buildCheckResult = "Build check: error (could not run)";
  }

  // Phase 1: Automated testing
  let testScore: number | null = null;
  if (task.test_weight as number > 0) {
    testScore = await runAutomatedTests(task, outputUrl);
  }

  // Phase 2: LLM judge
  let llmScore: number | null = null;
  let llmReasoning: string | null = null;
  let dimensionScores: LLMResponse["dimensions"] = [];

  if (task.llm_weight as number > 0) {
    const llmResult = await evaluateWithLLM(task, criteria, agentOutput, buildCheckResult || undefined);
    if (llmResult) {
      dimensionScores = llmResult.dimensions;
      llmReasoning = llmResult.overall_reasoning;

      let totalWeightedScore = 0;
      let totalWeight = 0;
      for (const dim of dimensionScores) {
        const criterion = criteria.find(
          (c: RubricCriterion) => c.name === dim.criterion_name
        );
        if (criterion) {
          totalWeightedScore += dim.score * criterion.weight;
          totalWeight += criterion.weight;
        }
      }
      llmScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    } else {
      llmScore = 0;
      llmReasoning = "LLM evaluation failed after retry. Flagged for manual review.";
    }
  }

  // Phase 3: Calculate final score
  const finalScore = calculateFinalScore(
    testScore,
    llmScore,
    task.test_weight as number,
    task.llm_weight as number
  );

  // Write immutable evaluation result
  const { data: evalResult, error: evalError } = await db
    .from("evaluation_results")
    .insert({
      submission_id: submissionId,
      test_score: testScore,
      llm_score: llmScore !== null ? Math.round(llmScore * 100) / 100 : null,
      final_score: Math.round(finalScore * 100) / 100,
      llm_reasoning: llmReasoning,
      eval_mode: EVAL_MODE.LLM,
    })
    .select()
    .single();

  if (evalError) {
    throw new Error(`Failed to write evaluation result: ${evalError.message}`);
  }

  // Write dimension scores
  if (dimensionScores.length > 0 && evalResult) {
    const dimensionRows = dimensionScores
      .map((dim) => {
        const criterion = criteria.find(
          (c: RubricCriterion) => c.name === dim.criterion_name
        );
        if (!criterion) return null;
        return {
          evaluation_result_id: evalResult.id,
          rubric_criterion_id: criterion.id,
          score: dim.score,
          reasoning: dim.reasoning,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (dimensionRows.length > 0) {
      const { error: dimError } = await db
        .from("evaluation_dimensions")
        .insert(dimensionRows);

      if (dimError) {
        console.error(`[eval] Failed to write dimensions: ${dimError.message}`);
      }
    }
  }

  await finalizeEvaluation(
    submissionId,
    taskId,
    finalScore,
    testScore,
    llmScore !== null ? Math.round(llmScore * 100) / 100 : null,
    workerWebhookQueue
  );

  console.log(
    `[eval] Submission ${submissionId} scored: test=${testScore}, llm=${llmScore?.toFixed(1)}, final=${finalScore.toFixed(1)} mode=llm`
  );
}

// ── Handler: Container / Hybrid eval ─────────────────────────

interface ContainerEvalContext {
  submissionId: string;
  taskId: string;
  outputUrl: string;
  task: Record<string, unknown>;
  criteria: RubricCriterion[];
  evalMode: typeof EVAL_MODE.CONTAINER | typeof EVAL_MODE.HYBRID;
}

async function handleContainerEval(
  ctx: ContainerEvalContext,
  workerWebhookQueue: Queue
): Promise<void> {
  const { submissionId, taskId, outputUrl, task, criteria, evalMode } = ctx;

  // Validate that an eval image is configured
  if (!task.eval_image || typeof task.eval_image !== "string") {
    await markSubmissionFailed(
      submissionId,
      "No eval_image configured for container eval mode"
    );
    return;
  }

  const tmpDir = path.join(os.tmpdir(), `map-eval-${submissionId}`);
  const agentOutputDir = path.join(tmpDir, "agent_output");
  const resultsDir = path.join(tmpDir, "results");

  try {
    // Download agent output files to disk
    await downloadAgentOutputToDir(outputUrl, agentOutputDir);

    // Run the eval container
    let containerResult: ContainerEvalResult;
    try {
      containerResult = await runEvalContainer(task.eval_image, agentOutputDir, resultsDir, {
        network: task.eval_network as boolean | undefined,
        memoryMb: task.eval_memory_mb as number | undefined,
        timeoutSeconds: task.eval_timeout_seconds as number | undefined,
      });
    } catch (err) {
      if (err instanceof EvalContainerError) {
        console.error(`[eval] Eval container failed for submission ${submissionId}: ${err.message}`);
        await markSubmissionFailed(submissionId, err.message, err.exitCode);
        return; // Permanent failure — do not rethrow
      }
      throw err;
    }

    const finalScore = Math.round(containerResult.score * 100) / 100;

    // For LLM notes in hybrid mode — read from disk (already downloaded) instead of re-fetching from storage
    let llmReasoning: string | null = null;
    if (evalMode === EVAL_MODE.HYBRID) {
      const agentOutput = readLocalOutputAsText(agentOutputDir);
      const llmResult = await evaluateWithLLM(task, criteria, agentOutput);
      if (llmResult) {
        llmReasoning = llmResult.overall_reasoning;
      } else {
        llmReasoning = "LLM notes unavailable (evaluation failed after retry).";
      }
    }

    // Build dimension rows from container breakdown
    // For each rubric criterion, look up its score in the breakdown by name (default 0 if missing)
    const dimensionRows: Array<{
      rubric_criterion_id: string;
      score: number;
      reasoning: string;
    }> = [];

    if (containerResult.breakdown) {
      for (const criterion of criteria) {
        const score = containerResult.breakdown[criterion.name] ?? 0;
        dimensionRows.push({
          rubric_criterion_id: criterion.id,
          score,
          reasoning: `Score from eval container breakdown (criterion: ${criterion.name})`,
        });
      }
    }

    // Write immutable evaluation result
    const { data: evalResult, error: evalError } = await db
      .from("evaluation_results")
      .insert({
        submission_id: submissionId,
        final_score: finalScore,
        container_score: finalScore,
        container_exit_code: containerResult.exitCode,
        breakdown: containerResult.breakdown ?? null,
        llm_reasoning: llmReasoning,
        llm_score: null,
        test_score: null,
        eval_mode: evalMode,
      })
      .select()
      .single();

    if (evalError) {
      throw new Error(`Failed to write evaluation result: ${evalError.message}`);
    }

    // Write dimension scores
    if (dimensionRows.length > 0 && evalResult) {
      const rowsWithEvalId = dimensionRows.map((row) => ({
        ...row,
        evaluation_result_id: evalResult.id,
      }));

      const { error: dimError } = await db
        .from("evaluation_dimensions")
        .insert(rowsWithEvalId);

      if (dimError) {
        console.error(`[eval] Failed to write dimensions: ${dimError.message}`);
      }
    }

    await finalizeEvaluation(
      submissionId,
      taskId,
      finalScore,
      null, // test_score
      null, // llm_score
      workerWebhookQueue
    );

    console.log(
      `[eval] Submission ${submissionId} scored: container=${finalScore} mode=${evalMode}`
    );
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best effort
    }
  }
}

// ── Finalize: update submission + dispatch notifications ──────

async function finalizeEvaluation(
  submissionId: string,
  taskId: string,
  finalScore: number,
  testScore: number | null,
  llmScore: number | null,
  workerWebhookQueue: Queue
): Promise<void> {
  // Update submission status
  await db
    .from("submissions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", submissionId);

  // Fetch supplementary info for notifications
  const { data: sub } = await db
    .from("submissions")
    .select("agent_id")
    .eq("id", submissionId)
    .single();

  const { data: taskInfo } = await db
    .from("tasks")
    .select("company_id, title")
    .eq("id", taskId)
    .single();

  const roundedScore = Math.round(finalScore * 100) / 100;

  if (taskInfo?.company_id) {
    await dispatchWebhookFromWorker(
      db,
      workerWebhookQueue,
      taskInfo.company_id as string,
      "evaluation.completed",
      {
        event: "evaluation.completed",
        timestamp: new Date().toISOString(),
        data: {
          submission_id: submissionId,
          task_id: taskId,
          agent_id: sub?.agent_id ?? "",
          final_score: roundedScore,
        },
      }
    );
  }

  // Dispatch evaluation.completed webhook to the agent (for programmatic iteration)
  if (sub?.agent_id) {
    await dispatchWebhookFromWorker(
      db,
      workerWebhookQueue,
      sub.agent_id as string,
      "evaluation.completed",
      {
        event: "evaluation.completed",
        timestamp: new Date().toISOString(),
        data: {
          submission_id: submissionId,
          task_id: taskId,
          final_score: roundedScore,
        },
      }
    );
  }

  if (sub?.agent_id) {
    await dispatchNotificationFromWorker(
      db,
      NOTIFICATION_TYPE.EVALUATION_COMPLETED,
      sub.agent_id as string,
      "Evaluation complete",
      `Your submission scored ${roundedScore}/100.`,
      "submission",
      submissionId,
      {
        task_id: taskId,
        final_score: roundedScore,
        test_score: testScore,
        llm_score: llmScore,
      }
    );

    await writeAuditLog(
      db,
      AUDIT_ACTION.EVALUATION_COMPLETED,
      sub.agent_id as string,
      "submission",
      submissionId,
      { task_id: taskId, final_score: roundedScore }
    );
  }

  // Auto-close task if all submissions are now evaluated
  await tryAutoCloseTask(db, workerWebhookQueue, taskId);
}

// ── Mark submission failed (container eval permanent failures) ──

async function markSubmissionFailed(
  submissionId: string,
  message: string,
  containerExitCode?: number
): Promise<void> {
  await db
    .from("submissions")
    .update({
      status: SUBMISSION_STATUS.FAILED,
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (containerExitCode !== undefined) {
    // Record the exit code in the evaluation result for diagnostics.
    // We write a minimal failed eval record so the exit code is visible.
    const { error } = await db.from("evaluation_results").insert({
      submission_id: submissionId,
      final_score: 0,
      container_exit_code: containerExitCode,
      eval_mode: "container",
      llm_reasoning: message,
    });
    if (error) {
      console.error(`[eval] Failed to write failed eval result: ${error.message}`);
    }
  }

  console.error(
    `[eval] Submission ${submissionId} permanently failed: ${message}` +
    (containerExitCode !== undefined ? ` (exit code ${containerExitCode})` : "")
  );
}

// ── Auto-Close Task ────────────────────────────────────────

/**
 * Check if all submissions for a task are in a terminal state (completed + evaluated, or failed).
 * If so, transition the task from "evaluating" to "closed" using optimistic concurrency.
 * On success, dispatches webhooks, notifications, audit log, and expires pending invitations.
 */
async function tryAutoCloseTask(
  workerDb: typeof db,
  workerWebhookQueue: Queue,
  taskId: string
): Promise<void> {
  try {
    const { data: task } = await workerDb
      .from("tasks")
      .select("id, status, company_id, title")
      .eq("id", taskId)
      .single();

    if (!task || task.status !== TASK_STATUS.EVALUATING) return;

    const { data: allSubs } = await workerDb
      .from("submissions")
      .select("id, status")
      .eq("task_id", taskId);

    if (!allSubs || allSubs.length === 0) return;

    const allTerminal = allSubs.every(
      (s: { status: string }) =>
        s.status === SUBMISSION_STATUS.COMPLETED || s.status === SUBMISSION_STATUS.FAILED
    );
    if (!allTerminal) return;

    const completedIds = allSubs
      .filter((s: { status: string }) => s.status === SUBMISSION_STATUS.COMPLETED)
      .map((s: { id: string }) => s.id);

    if (completedIds.length > 0) {
      const { count: evalCount } = await workerDb
        .from("evaluation_results")
        .select("id", { count: "exact", head: true })
        .in("submission_id", completedIds);

      if ((evalCount ?? 0) < completedIds.length) return;
    }

    const { data: updated, error: updateError } = await workerDb
      .from("tasks")
      .update({ status: TASK_STATUS.CLOSED })
      .eq("id", taskId)
      .eq("status", TASK_STATUS.EVALUATING)
      .select("id")
      .single();

    if (updateError || !updated) return;

    console.log(`[eval] Task ${taskId} auto-closed — all evaluations complete`);

    if (task.company_id) {
      await dispatchWebhookFromWorker(
        workerDb,
        workerWebhookQueue,
        task.company_id as string,
        "task.status_changed",
        {
          event: "task.status_changed",
          timestamp: new Date().toISOString(),
          data: {
            task_id: taskId,
            old_status: TASK_STATUS.EVALUATING,
            new_status: TASK_STATUS.CLOSED,
          },
        }
      );

      await dispatchNotificationToTaskOwnerFromWorker(
        workerDb,
        taskId,
        NOTIFICATION_TYPE.TASK_CLOSED,
        "Task closed",
        `"${task.title}" has been closed — all evaluations are complete.`,
        "task",
        taskId
      );

      await writeAuditLog(
        workerDb,
        AUDIT_ACTION.TASK_CLOSED,
        task.company_id as string,
        "task",
        taskId,
        { reason: "all_evaluations_complete", previous_status: TASK_STATUS.EVALUATING }
      );
    }

    const invitationRepo = new TaskInvitationRepository(workerDb);
    const expired = await invitationRepo.expireByTask(taskId);
    if (expired > 0) {
      console.log(`[eval] Expired ${expired} pending invitations for task ${taskId}`);
    }
  } catch (err) {
    console.error(`[eval] Failed to auto-close task ${taskId}:`, err);
  }
}

// ── Phase 1: Automated Testing ───────────────────────────────

async function runAutomatedTests(
  task: Record<string, unknown>,
  outputUrl: string
): Promise<number> {
  if (!task.test_suite_url) {
    console.log(`[eval] No test suite for task ${task.id}, skipping automated tests`);
    return 0;
  }

  const testSuiteUrl = task.test_suite_url as string;
  console.log(`[eval] Running test suite for task ${task.id}...`);

  try {
    const { data: testSuiteData, error: downloadError } = await db.storage
      .from("test-suites")
      .download(testSuiteUrl);

    if (downloadError || !testSuiteData) {
      console.error(`[eval] Failed to download test suite: ${downloadError?.message}`);
      return 0;
    }

    const agentOutput = await fetchAgentOutput(outputUrl);
    if (!agentOutput) {
      console.log(`[eval] No agent output to test against`);
      return 0;
    }

    const testSuiteText = await testSuiteData.text();
    const testSuite = JSON.parse(testSuiteText) as TestSuite;

    return executeTests(testSuite, agentOutput);
  } catch (err) {
    console.error(`[eval] Test suite execution failed:`, err);
    return 0;
  }
}

interface TestCase {
  name: string;
  input: string;
  expected_output: string;
  match_type: "exact" | "contains" | "regex";
}

interface TestSuite {
  test_cases: TestCase[];
}

function executeTests(suite: TestSuite, agentOutput: string): number {
  if (!suite.test_cases || suite.test_cases.length === 0) {
    console.log(`[eval] Test suite has no test cases`);
    return 0;
  }

  let passed = 0;
  const total = suite.test_cases.length;

  for (const tc of suite.test_cases) {
    let match = false;

    switch (tc.match_type) {
      case "exact":
        match = agentOutput.includes(tc.expected_output);
        break;
      case "contains":
        match = agentOutput.toLowerCase().includes(tc.expected_output.toLowerCase());
        break;
      case "regex":
        try {
          match = new RegExp(tc.expected_output).test(agentOutput);
        } catch {
          console.error(`[eval] Invalid regex in test case "${tc.name}"`);
        }
        break;
    }

    if (match) {
      passed++;
    } else {
      console.log(`[eval] Test case failed: ${tc.name}`);
    }
  }

  const score = Math.round((passed / total) * 100);
  console.log(`[eval] Tests: ${passed}/${total} passed (score: ${score})`);
  return score;
}

// ── Phase 2: LLM Judge ───────────────────────────────────────

async function evaluateWithLLM(
  task: Record<string, unknown>,
  criteria: RubricCriterion[],
  agentOutput: string,
  buildResult?: string
): Promise<LLMResponse | null> {
  const prompt = buildEvaluationPrompt(task, criteria, agentOutput, buildResult);

  let result = await callLLM(prompt);
  if (result) return result;

  console.log(`[eval] LLM response validation failed, retrying...`);
  result = await callLLM(prompt);
  if (result) return result;

  console.error(`[eval] LLM evaluation failed after retry for task ${task.id}`);
  return null;
}

function extractSubmissionMd(agentOutput: string): { submissionMd: string; otherOutput: string } {
  // SUBMISSION.md content is formatted as "--- SUBMISSION.md ---\n<content>\n\n" by fetchAgentOutput/readLocalOutputAsText
  const marker = "--- SUBMISSION.md ---\n";
  const idx = agentOutput.indexOf(marker);
  if (idx === -1) return { submissionMd: "", otherOutput: agentOutput };

  const afterMarker = agentOutput.slice(idx + marker.length);
  const endIdx = afterMarker.indexOf("\n\n---");
  const submissionMd = endIdx === -1 ? afterMarker : afterMarker.slice(0, endIdx);
  const otherOutput = agentOutput.slice(0, idx) + (endIdx === -1 ? "" : afterMarker.slice(endIdx));

  return { submissionMd: submissionMd.trim(), otherOutput: otherOutput.trim() };
}

function buildEvaluationPrompt(
  task: Record<string, unknown>,
  criteria: RubricCriterion[],
  agentOutput: string,
  buildResult?: string
): string {
  const criteriaList = criteria
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (weight: ${c.weight}%)${c.description ? `: ${c.description}` : ""}`
    )
    .join("\n");

  const { submissionMd, otherOutput } = extractSubmissionMd(agentOutput);

  return `You are an expert evaluator scoring an AI agent's submission against a company's rubric.

## Task
Title: ${task.title}
Description: ${task.description}

## Input Specification
${task.input_spec}

## Output Specification
${task.output_spec}

## Rubric Criteria
${criteriaList}

${submissionMd ? `## Agent's SUBMISSION.md (their own claims about what they built)
${submissionMd}

IMPORTANT: Cross-reference every claim in SUBMISSION.md against the actual code/output below. If the agent claims a feature works but the code doesn't implement it, note that discrepancy and score accordingly. Honest self-assessment should be rewarded.
` : ""}
${buildResult ? `## Platform Build Check
${buildResult}
` : ""}
## Agent Output (code and files)
${otherOutput || "(No output was produced by the agent)"}

## Instructions
Score each rubric criterion independently on a scale of 0-100.
- 0 = completely failed, no useful output
- 25 = poor, major issues
- 50 = acceptable, meets basic requirements
- 75 = good, solid work with minor issues
- 100 = excellent, exceeds expectations

For each criterion, provide:
1. A score (0-100)
2. A brief reasoning (1-3 sentences)

Also provide overall reasoning summarizing the evaluation.

If no output was provided or the output is empty, score all dimensions 0.

Respond ONLY with valid JSON matching this exact schema:
{
  "dimensions": [
    {
      "criterion_name": "exact name from rubric",
      "score": 0-100,
      "reasoning": "brief explanation"
    }
  ],
  "overall_reasoning": "summary of evaluation"
}

Do not include any text outside the JSON.`;
}

function sanitizeJsonString(raw: string): string {
  // Strip markdown code fences
  let s = raw.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "");
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

async function callLLM(prompt: string): Promise<LLMResponse | null> {
  try {
    const model = gemini.getGenerativeModel({
      model: EVALUATION_LLM_MODEL,
      generationConfig: {
        maxOutputTokens: LLM_MAX_TOKENS,
        responseMimeType: "application/json",
      },
    });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[eval] No JSON found in LLM response");
      return null;
    }

    const sanitized = sanitizeJsonString(jsonMatch[0]);
    const parsed = JSON.parse(sanitized);
    const validated = llmResponseSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("[eval] LLM response validation failed:", z.prettifyError(validated.error));
      return null;
    }

    return validated.data;
  } catch (err) {
    console.error("[eval] LLM call failed:", err);
    return null;
  }
}

// ── Phase 3: Score Calculation ───────────────────────────────

export function calculateFinalScore(
  testScore: number | null,
  llmScore: number | null,
  testWeight: number,
  llmWeight: number
): number {
  const effectiveTestScore = testScore ?? 0;
  const effectiveLLMScore = llmScore ?? 0;
  return (effectiveTestScore * testWeight + effectiveLLMScore * llmWeight) / 100;
}

// ── Lifecycle ────────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[eval] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[eval] Job ${job?.id} failed:`, err.message);
});

console.log("[eval] Evaluation worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  console.log("[eval] Shutting down...");
  await worker.close();
  await webhookQueue.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[eval] Shutting down...");
  await worker.close();
  await webhookQueue.close();
  process.exit(0);
});
