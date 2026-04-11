/**
 * EVALUATION WORKER — Architecture
 *
 * This is a separate Node.js process. It NEVER imports Next.js internals.
 * It connects to Redis via BullMQ and processes evaluation jobs.
 *
 * Flow:
 * 1. Receive job with { submissionId, taskId, outputUrl }
 * 2. Fetch the task (including rubric criteria) and agent output
 * 3. Phase 1: Run automated tests (company test suite against agent output)
 *    - If test_weight is 0, skip
 *    - Parse test results → test_score (0-100)
 * 4. Phase 2: LLM judge
 *    - Build prompt: task description + rubric criteria + agent output
 *    - Call Gemini with structured output schema
 *    - Zod-validate response
 *    - Retry once on validation failure
 *    - Flag for manual review if retry fails
 * 5. Phase 3: Calculate final score
 *    - final_score = (test_score * test_weight + llm_score * llm_weight) / 100
 * 6. Write immutable evaluation_result + evaluation_dimensions
 * 7. Update submission status
 *
 * Edge cases:
 * - No output → llm_score = 0, test_score = 0
 * - Test suite failure → test_score = 0, log error
 * - LLM response invalid → retry once, then flag
 * - Missing rubric criteria → error, do not score
 *
 * The evaluation result is IMMUTABLE once written. No updates.
 */

import { Worker, Queue } from "bullmq";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  EVALUATION_LLM_MODEL,
  TASK_STATUS,
  SUBMISSION_STATUS,
  NOTIFICATION_TYPE,
  AUDIT_ACTION,
} from "@/constants";
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

// ── Output Fetching ─────────────────────────────────────────

async function fetchAgentOutput(outputUrl: string): Promise<string> {
  // outputUrl is a storage path like "submissions/{id}"
  // List all files in the path and download them
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

  // Truncate if too large for LLM context
  if (combined.length > MAX_OUTPUT_SIZE) {
    console.log(`[eval] Output truncated from ${combined.length} to ${MAX_OUTPUT_SIZE} chars`);
    return combined.slice(0, MAX_OUTPUT_SIZE) + "\n\n[Output truncated due to size]";
  }

  return combined;
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

    // 1.5. Fetch the actual agent output from storage
    const agentOutput = await fetchAgentOutput(outputUrl);
    if (!agentOutput) {
      console.error(`[eval] No output content for submission ${submissionId}`);
    }

    // 2. Phase 1: Automated testing
    let testScore: number | null = null;
    if (task.test_weight > 0) {
      testScore = await runAutomatedTests(task, outputUrl);
    }

    // 3. Phase 2: LLM judge
    let llmScore: number | null = null;
    let llmReasoning: string | null = null;
    let dimensionScores: LLMResponse["dimensions"] = [];

    if (task.llm_weight > 0) {
      const llmResult = await evaluateWithLLM(task, criteria, agentOutput);
      if (llmResult) {
        dimensionScores = llmResult.dimensions;
        llmReasoning = llmResult.overall_reasoning;

        // Calculate weighted LLM score from dimension scores
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

    // 4. Phase 3: Calculate final score
    const finalScore = calculateFinalScore(
      testScore,
      llmScore,
      task.test_weight,
      task.llm_weight
    );

    // 5. Write immutable evaluation result
    const { data: evalResult, error: evalError } = await db
      .from("evaluation_results")
      .insert({
        submission_id: submissionId,
        test_score: testScore,
        llm_score: llmScore !== null ? Math.round(llmScore * 100) / 100 : null,
        final_score: Math.round(finalScore * 100) / 100,
        llm_reasoning: llmReasoning,
      })
      .select()
      .single();

    if (evalError) {
      throw new Error(`Failed to write evaluation result: ${evalError.message}`);
    }

    // 6. Write dimension scores
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

    // 7. Update submission status
    await db
      .from("submissions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", submissionId);

    // 8. Dispatch evaluation.completed webhook + notification + audit
    const { data: sub } = await db
      .from("submissions")
      .select("agent_id")
      .eq("id", submissionId)
      .single();

    const roundedScore = Math.round(finalScore * 100) / 100;

    if (task.company_id) {
      await dispatchWebhookFromWorker(
        db,
        webhookQueue,
        task.company_id as string,
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

    // Notify the agent that evaluation is done
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
          llm_score: llmScore !== null ? Math.round(llmScore * 100) / 100 : null,
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

    console.log(
      `[eval] Submission ${submissionId} scored: test=${testScore}, llm=${llmScore?.toFixed(1)}, final=${finalScore.toFixed(1)}`
    );

    // 9. Auto-close task if all submissions are now evaluated
    await tryAutoCloseTask(db, webhookQueue, taskId);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

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
    // Get task status — only auto-close if currently "evaluating"
    const { data: task } = await workerDb
      .from("tasks")
      .select("id, status, company_id, title")
      .eq("id", taskId)
      .single();

    if (!task || task.status !== TASK_STATUS.EVALUATING) return;

    // Get all submissions for this task
    const { data: allSubs } = await workerDb
      .from("submissions")
      .select("id, status")
      .eq("task_id", taskId);

    if (!allSubs || allSubs.length === 0) return;

    // Check if all submissions are in terminal states
    const allTerminal = allSubs.every(
      (s: { status: string }) => s.status === SUBMISSION_STATUS.COMPLETED || s.status === SUBMISSION_STATUS.FAILED
    );
    if (!allTerminal) return;

    // Check all completed submissions have evaluation results
    const completedIds = allSubs
      .filter((s: { status: string }) => s.status === SUBMISSION_STATUS.COMPLETED)
      .map((s: { id: string }) => s.id);

    if (completedIds.length > 0) {
      const { count: evalCount } = await workerDb
        .from("evaluation_results")
        .select("id", { count: "exact", head: true })
        .in("submission_id", completedIds);

      if ((evalCount ?? 0) < completedIds.length) return; // Not all evaluated yet
    }

    // Optimistic concurrency: only update if still "evaluating"
    const { data: updated, error: updateError } = await workerDb
      .from("tasks")
      .update({ status: TASK_STATUS.CLOSED })
      .eq("id", taskId)
      .eq("status", TASK_STATUS.EVALUATING)
      .select("id")
      .single();

    if (updateError || !updated) return; // Another process already closed it

    console.log(`[eval] Task ${taskId} auto-closed — all evaluations complete`);

    // Dispatch task.closed webhook
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

      // Notify task owner
      await dispatchNotificationToTaskOwnerFromWorker(
        workerDb,
        taskId,
        NOTIFICATION_TYPE.TASK_CLOSED,
        "Task closed",
        `"${task.title}" has been closed — all evaluations are complete.`,
        "task",
        taskId
      );

      // Audit log
      await writeAuditLog(
        workerDb,
        AUDIT_ACTION.TASK_CLOSED,
        task.company_id as string,
        "task",
        taskId,
        { reason: "all_evaluations_complete", previous_status: TASK_STATUS.EVALUATING }
      );
    }

    // Expire pending invitations
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

  // Download test suite from storage
  const testSuiteUrl = task.test_suite_url as string;
  console.log(`[eval] Running test suite for task ${task.id}...`);

  try {
    // Download the test suite file
    const { data: testSuiteData, error: downloadError } = await db.storage
      .from("test-suites")
      .download(testSuiteUrl);

    if (downloadError || !testSuiteData) {
      console.error(`[eval] Failed to download test suite: ${downloadError?.message}`);
      return 0;
    }

    // Download agent output for testing
    const agentOutput = await fetchAgentOutput(outputUrl);
    if (!agentOutput) {
      console.log(`[eval] No agent output to test against`);
      return 0;
    }

    // Parse test suite — expects JSON with test cases
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
  agentOutput: string
): Promise<LLMResponse | null> {
  const prompt = buildEvaluationPrompt(task, criteria, agentOutput);

  // Attempt 1
  let result = await callLLM(prompt);
  if (result) return result;

  // Retry once
  console.log(`[eval] LLM response validation failed, retrying...`);
  result = await callLLM(prompt);
  if (result) return result;

  // Flag for manual review
  console.error(`[eval] LLM evaluation failed after retry for task ${task.id}`);
  return null;
}

function buildEvaluationPrompt(
  task: Record<string, unknown>,
  criteria: RubricCriterion[],
  agentOutput: string
): string {
  const criteriaList = criteria
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (weight: ${c.weight}%)${c.description ? `: ${c.description}` : ""}`
    )
    .join("\n");

  return `You are an expert evaluator scoring an AI agent's output against a company's rubric.

## Task
Title: ${task.title}
Description: ${task.description}

## Input Specification
${task.input_spec}

## Output Specification
${task.output_spec}

## Rubric Criteria
${criteriaList}

## Agent Output
${agentOutput || "(No output was produced by the agent)"}

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

async function callLLM(prompt: string): Promise<LLMResponse | null> {
  try {
    const model = gemini.getGenerativeModel({ model: EVALUATION_LLM_MODEL });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: LLM_MAX_TOKENS },
    });

    const text = response.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[eval] No JSON found in LLM response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
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
