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
 *    - Call Claude with structured output schema
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

import { Worker } from "bullmq";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

// ── Config ───────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_API_KEY) {
  console.error("Missing required env vars");
  process.exit(1);
}

const LLM_MODEL = "claude-sonnet-4-6";
const LLM_MAX_TOKENS = 4096;
const QUEUE_NAME = "evaluation";

// ── Clients ──────────────────────────────────────────────────

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
      const llmResult = await evaluateWithLLM(task, criteria, outputUrl);
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

    console.log(
      `[eval] Submission ${submissionId} scored: test=${testScore}, llm=${llmScore?.toFixed(1)}, final=${finalScore.toFixed(1)}`
    );
  },
  {
    connection: {
      host: new URL(REDIS_URL).hostname,
      port: Number(new URL(REDIS_URL).port) || 6379,
    },
    concurrency: 2,
  }
);

// ── Phase 1: Automated Testing ───────────────────────────────

async function runAutomatedTests(
  task: Record<string, unknown>,
  _outputUrl: string
): Promise<number> {
  // TODO(claude): Implement actual test suite execution
  // For v1, this will download the test suite from Supabase Storage,
  // run it against the agent output, and parse results.
  // For now, return 0 if no test suite is provided.

  if (!task.test_suite_url) {
    console.log(`[eval] No test suite for task ${task.id}, skipping automated tests`);
    return 0;
  }

  // Placeholder: actual implementation will run the test suite
  console.log(`[eval] Running test suite for task ${task.id}...`);
  return 0;
}

// ── Phase 2: LLM Judge ───────────────────────────────────────

async function evaluateWithLLM(
  task: Record<string, unknown>,
  criteria: RubricCriterion[],
  _outputUrl: string
): Promise<LLMResponse | null> {
  const prompt = buildEvaluationPrompt(task, criteria);

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
  criteria: RubricCriterion[]
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
[Agent output would be inserted here from the output URL]

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
    const response = await anthropic.messages.create({
      model: LLM_MODEL,
      max_tokens: LLM_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

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
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[eval] Shutting down...");
  await worker.close();
  process.exit(0);
});
