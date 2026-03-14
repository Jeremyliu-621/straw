/**
 * LLM Judge Service
 * Calls Claude to score submissions against company rubric
 * This is the second phase of evaluation
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { LLMDimensionScore, TaskRubric } from "@/types/database";
import { z } from "zod";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

/**
 * Response schema from Claude - must be valid JSON
 */
const claudeResponseSchema = z.object({
  dimension_scores: z.array(
    z.object({
      dimension: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string(),
    })
  ),
  overall_observations: z.string().optional(),
});

type ClaudeScoreResponse = z.infer<typeof claudeResponseSchema>;

/**
 * Score a submission using Claude as judge
 *
 * @param taskDescription - What the task was asking for
 * @param rubric - Scoring criteria and weights from the company
 * @param submissionContent - The agent's output/artifacts
 * @returns Array of dimension scores with reasoning
 */
export async function judgeSubmission(
  taskDescription: string,
  rubric: TaskRubric,
  submissionContent: string
): Promise<LLMDimensionScore[]> {
  // Build scoring instructions from rubric
  const criteriaText = rubric.criteria
    .map((c) => `- ${c.name} (${c.weight}% weight): ${c.description || ""}`)
    .join("\n");

  const systemPrompt = `You are an expert technical evaluator scoring software submissions.

You will score a submission against these criteria:
${criteriaText}

Score each dimension from 0-100. Provide honest, specific reasoning for each score.
Do NOT inflate scores. Be critical but fair.

Return ONLY valid JSON, no other text.`;

  const userPrompt = `Task Description:
${taskDescription}

Submission Output:
${submissionContent}

Score this submission across the specified dimensions. Return JSON only.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract text response
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("");

    // Parse JSON response
    let parsed: ClaudeScoreResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        `Failed to parse Claude response as JSON: ${responseText.substring(0, 200)}`
      );
    }

    // Validate response schema
    const validated = claudeResponseSchema.parse(parsed);

    // Convert to LLMDimensionScore format
    return validated.dimension_scores.map((score) => ({
      dimension: score.dimension,
      score: score.score,
      reasoning: score.reasoning,
    }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid Claude response format: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Batch score multiple submissions
 * Useful for scoring all agents on a task
 */
export async function judgeSubmissionsBatch(
  judgingJobs: Array<{
    submissionId: string;
    taskDescription: string;
    rubric: TaskRubric;
    content: string;
  }>
): Promise<
  Array<{
    submissionId: string;
    scores: LLMDimensionScore[];
  }>
> {
  const results: Array<{
    submissionId: string;
    scores: LLMDimensionScore[];
  }> = [];

  // Process sequentially to avoid rate limits
  for (const job of judgingJobs) {
    try {
      const scores = await judgeSubmission(job.taskDescription, job.rubric, job.content);
      results.push({
        submissionId: job.submissionId,
        scores,
      });
    } catch (error) {
      console.error(`Failed to judge submission ${job.submissionId}:`, error);
      // Continue with next submission instead of failing entire batch
      throw error; // For now, fail fast - can change to continue-on-error later
    }
  }

  return results;
}

/**
 * Test Claude connection and scoring format
 */
export async function testLLMJudge(): Promise<boolean> {
  try {
    const testRubric: TaskRubric = {
      criteria: [
        { name: "Correctness", weight: 50, description: "Does the solution work?" },
        { name: "Code Quality", weight: 50, description: "Is the code well-written?" },
      ],
    };

    const scores = await judgeSubmission(
      "Write a function that returns the sum of two numbers",
      testRubric,
      `function sum(a, b) {
  return a + b;
}`
    );

    return scores.length === 2 && scores.every((s) => s.score >= 0 && s.score <= 100);
  } catch (error) {
    console.error("LLM judge test failed:", error);
    return false;
  }
}
