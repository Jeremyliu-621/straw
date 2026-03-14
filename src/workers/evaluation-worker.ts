/**
 * Evaluation Worker
 * Separate Node.js process that evaluates agent submissions
 *
 * Two-phase evaluation:
 * 1. Run automated tests against output
 * 2. LLM judge (Claude) scores against rubric
 *
 * Usage: npm run eval-worker
 */

import { Worker, Job } from "bullmq";
import { EvaluationJob, createEvaluationQueue } from "@/lib/queue";
import { env } from "@/lib/env";
import { QUEUE_CONFIG } from "@/constants";
import {
  calculateTestScore,
  calculateLLMScore,
  calculateFinalScore,
  validateTestResults,
  validateLLMDimensionScores,
  formatEvaluationResult,
} from "@/services/evaluation.service";
import { judgeSubmission } from "@/services/llm-judge.service";
import { TestResults, LLMDimensionScore } from "@/types/database";

/**
 * Run automated tests on agent output
 * In production, this would:
 * - Download test suite from Supabase Storage
 * - Download agent artifacts
 * - Run tests in isolated environment
 * - Parse results
 */
async function runAutomatedTests(
  job: Job<EvaluationJob>,
  _artifactsPath: string,
  _testSuitePath: string | undefined
): Promise<{ testScore: number; testResults: TestResults } | null> {
  try {
    job.updateProgress(20);

    // TODO: Download test suite from Supabase Storage
    // TODO: Download agent artifacts from Supabase Storage
    // TODO: Run Vitest/Jest with custom reporter
    // TODO: Parse test results

    // Mock: return reasonable test results for now
    const mockTestResults: TestResults = {
      passed: 7,
      failed: 2,
      errored: 1,
      total: 10,
      test_details: [
        { name: "test_basic_functionality", status: "passed" },
        { name: "test_edge_case_empty", status: "passed" },
        { name: "test_edge_case_null", status: "failed" },
        { name: "test_performance", status: "failed" },
        { name: "test_memory_usage", status: "errored" },
      ],
    };

    validateTestResults(mockTestResults);
    const testScore = calculateTestScore(mockTestResults);

    console.log(
      `Test results: ${mockTestResults.passed}/${mockTestResults.total} passed (score: ${testScore})`
    );

    return {
      testScore,
      testResults: mockTestResults,
    };
  } catch (error) {
    console.error("Error running tests:", error);
    // Don't fail entire evaluation if tests fail - just skip test score
    return null;
  }
}

/**
 * Score submission using LLM judge
 */
async function runLLMJudge(
  job: Job<EvaluationJob>,
  taskDescription: string,
  rubric: any,
  submissionContent: string
): Promise<{ llmScore: number; dimensionScores: LLMDimensionScore[] } | null> {
  try {
    job.updateProgress(50);

    console.log("Calling Claude for LLM judging...");
    const dimensionScores = await judgeSubmission(taskDescription, rubric, submissionContent);

    // Validate scores
    validateLLMDimensionScores(dimensionScores, rubric.criteria);

    // Calculate weighted score
    const llmScore = calculateLLMScore(dimensionScores, rubric.criteria);

    console.log(`LLM judgment complete: ${llmScore}/100`);

    return {
      llmScore,
      dimensionScores,
    };
  } catch (error) {
    console.error("Error in LLM judgment:", error);
    throw error; // Fail evaluation if LLM judge fails
  }
}

/**
 * Evaluate a submission
 *
 * Main evaluation function:
 * 1. Load submission data
 * 2. Run automated tests (Phase 1)
 * 3. Call Claude (Phase 2)
 * 4. Calculate final score
 * 5. Store results
 */
async function evaluateSubmission(job: Job<EvaluationJob>): Promise<{
  submissionId: string;
  taskId: string;
  testScore: number | null;
  testResults: TestResults | null;
  llmScore: number | null;
  llmDimensionScores: LLMDimensionScore[] | null;
  finalScore: number;
}> {
  const { submission_id, task_id, artifacts_path, test_suite_path } = job.data;

  console.log(`[${submission_id}] Starting evaluation...`);
  job.updateProgress(5);

  try {
    // TODO: Fetch task and submission details from Supabase
    // For now, use mock data
    const mockTask = {
      id: task_id,
      description: "Build a robust REST API with proper error handling and tests",
      rubric: {
        criteria: [
          {
            name: "Code Quality",
            weight: 30,
            description: "Code is well-organized and follows best practices",
          },
          {
            name: "Testing",
            weight: 25,
            description: "Comprehensive test coverage",
          },
          {
            name: "Documentation",
            weight: 20,
            description: "Clear and complete documentation",
          },
          {
            name: "API Design",
            weight: 25,
            description: "RESTful design principles and intuitive interface",
          },
        ],
        test_weight: 0.6,
        llm_weight: 0.4,
      },
    };

    const mockSubmissionContent = `
      // Simple REST API implementation
      const express = require('express');
      const app = express();

      app.get('/api/items', (req, res) => {
        res.json({ items: [] });
      });

      app.listen(3000);
    `;

    // Phase 1: Automated Testing
    console.log(`[${submission_id}] Running automated tests...`);
    const testResults = await runAutomatedTests(job, artifacts_path, test_suite_path);
    job.updateProgress(40);

    // Phase 2: LLM Judge
    console.log(`[${submission_id}] Running LLM judgment...`);
    const llmResults = await runLLMJudge(
      job,
      mockTask.description,
      mockTask.rubric,
      mockSubmissionContent
    );
    job.updateProgress(75);

    // Calculate final score
    const finalScore = calculateFinalScore(
      testResults?.testScore || null,
      llmResults?.llmScore || null,
      mockTask.rubric.test_weight,
      mockTask.rubric.llm_weight
    );

    const evaluationResult = {
      submissionId: submission_id,
      taskId: task_id,
      testScore: testResults?.testScore || null,
      testResults: testResults?.testResults || null,
      llmScore: llmResults?.llmScore || null,
      llmDimensionScores: llmResults?.dimensionScores || null,
      finalScore,
    };

    console.log(
      `[${submission_id}] Evaluation complete. Final score: ${finalScore}/100`
    );

    job.updateProgress(100);

    return evaluationResult;
  } catch (error) {
    console.error(`[${submission_id}] Evaluation failed:`, error);
    throw error;
  }
}

/**
 * Start the evaluation worker
 */
async function startWorker() {
  console.log("Starting evaluation worker...");

  const worker = new Worker<EvaluationJob>(
    QUEUE_CONFIG.EVALUATION_QUEUE,
    evaluateSubmission,
    {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || "6379"),
      },
      concurrency: 1, // One evaluation at a time
    }
  );

  worker.on("completed", (job) => {
    console.log(`[${job.data.submission_id}] Evaluation job completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${job?.data.submission_id}] Evaluation failed:`, err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down worker...");
    await worker.close();
    process.exit(0);
  });

  console.log("Evaluation worker running and listening for jobs...");
}

// Start worker if this is the main module
if (require.main === module) {
  startWorker().catch((error) => {
    console.error("Failed to start evaluation worker:", error);
    process.exit(1);
  });
}

export { evaluateSubmission };
