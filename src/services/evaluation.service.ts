/**
 * Evaluation service - core business logic for scoring agent submissions
 *
 * The evaluation pipeline has two phases:
 * 1. Automated tests: Run Jest/Vitest test suite against agent output
 * 2. LLM judge: Claude scores based on company rubric
 *
 * Final score = (test_score * test_weight) + (llm_score * llm_weight)
 */

import { Task, EvaluationResult, TestResults, LLMDimensionScore } from "@/types/database";

/**
 * Calculate final score from component scores
 */
export function calculateFinalScore(
  testScore: number | null,
  llmScore: number | null,
  testWeight: number,
  llmWeight: number
): number {
  // If both scores exist, use weighted average
  if (testScore !== null && llmScore !== null) {
    const weighted = testScore * testWeight + llmScore * llmWeight;
    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(weighted * 10) / 10));
  }

  // If only one score exists, normalize it
  if (testScore !== null) {
    return Math.max(0, Math.min(100, testScore));
  }
  if (llmScore !== null) {
    return Math.max(0, Math.min(100, llmScore));
  }

  // No scores - evaluation failed
  return 0;
}

/**
 * Calculate test score from test results
 */
export function calculateTestScore(testResults: TestResults): number {
  if (testResults.total === 0) {
    return 0;
  }

  const score = (testResults.passed / testResults.total) * 100;
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Validate test results format
 */
export function validateTestResults(results: TestResults): void {
  if (
    typeof results.passed !== "number" ||
    typeof results.failed !== "number" ||
    typeof results.errored !== "number" ||
    typeof results.total !== "number"
  ) {
    throw new Error("Invalid test results format");
  }

  if (results.passed + results.failed + results.errored !== results.total) {
    throw new Error(
      `Test counts don't add up: ${results.passed} + ${results.failed} + ${results.errored} !== ${results.total}`
    );
  }

  if (results.total === 0) {
    throw new Error("Test suite has no tests");
  }
}

/**
 * Validate LLM dimension scores
 */
export function validateLLMDimensionScores(
  scores: LLMDimensionScore[],
  rubricCriteria: Array<{ name: string; weight: number }>
): void {
  if (!Array.isArray(scores)) {
    throw new Error("LLM scores must be an array");
  }

  // Check that all rubric criteria have scores
  const scoredDimensions = new Set(scores.map((s) => s.dimension));
  const rubricDimensions = new Set(rubricCriteria.map((c) => c.name));

  for (const dim of rubricDimensions) {
    if (!scoredDimensions.has(dim)) {
      throw new Error(`Missing score for rubric dimension: ${dim}`);
    }
  }

  // Validate individual scores
  for (const score of scores) {
    if (typeof score.score !== "number" || score.score < 0 || score.score > 100) {
      throw new Error(`Invalid dimension score: ${score.dimension} = ${score.score}`);
    }
    if (!score.reasoning || score.reasoning.length < 5) {
      throw new Error(`Missing or too-short reasoning for: ${score.dimension}`);
    }
  }
}

/**
 * Calculate weighted LLM score from dimension scores and rubric
 */
export function calculateLLMScore(
  dimensionScores: LLMDimensionScore[],
  rubricCriteria: Array<{ name: string; weight: number }>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const criterion of rubricCriteria) {
    const dimScore = dimensionScores.find((s) => s.dimension === criterion.name);
    if (dimScore) {
      weightedSum += dimScore.score * (criterion.weight / 100);
      totalWeight += criterion.weight / 100;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  const score = weightedSum / totalWeight;
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Format evaluation results for storage
 */
export function formatEvaluationResult(
  submissionId: string,
  taskId: string,
  agentBuilderId: string,
  testScore: number | null,
  testResults: TestResults | null,
  llmScore: number | null,
  llmDimensionScores: LLMDimensionScore[] | null,
  testWeight: number,
  llmWeight: number
): EvaluationResult {
  const finalScore = calculateFinalScore(testScore, llmScore, testWeight, llmWeight);

  return {
    id: crypto.randomUUID(),
    submission_id: submissionId,
    task_id: taskId,
    agent_builder_id: agentBuilderId,
    test_score: testScore,
    test_results: testResults,
    llm_score: llmScore,
    llm_dimension_scores: llmDimensionScores,
    final_score: finalScore,
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * Check if evaluation is complete (both phases done)
 */
export function isEvaluationComplete(result: EvaluationResult): boolean {
  return result.test_score !== null && result.llm_score !== null;
}

/**
 * Determine next action after evaluation
 */
export function getEvaluationNextAction(
  evaluationComplete: boolean,
  deadline: Date
): "update_leaderboard" | "close_task" | "waiting" {
  if (!evaluationComplete) {
    return "waiting";
  }

  const now = new Date();
  if (now >= deadline) {
    return "close_task";
  }

  return "update_leaderboard";
}
