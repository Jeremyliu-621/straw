/**
 * Zod validation schemas for all API inputs
 * Centralized validation to prevent invalid data entering the system
 */

import { z } from "zod";
import { TASK_CONFIG, EVALUATION_CONFIG } from "@/constants";

// ============================================================================
// TASK VALIDATION
// ============================================================================

/**
 * Rubric criterion schema - single evaluation dimension
 */
export const rubricCriterionSchema = z.object({
  name: z.string().min(1).max(100),
  weight: z.number().min(0).max(100),
  description: z.string().optional(),
});

/**
 * Full rubric schema - collection of criteria that must sum to 100%
 */
export const rubricSchema = z.object({
  criteria: z.array(rubricCriterionSchema).min(1).max(10),
  test_weight: z.number().min(0).max(1).optional().default(TASK_CONFIG.DEFAULT_TEST_WEIGHT),
  llm_weight: z.number().min(0).max(1).optional().default(TASK_CONFIG.DEFAULT_LLM_WEIGHT),
}).refine(
  (data) => {
    const totalWeight = data.criteria.reduce((sum, c) => sum + c.weight, 0);
    return totalWeight === 100;
  },
  {
    message: "Rubric weights must sum to exactly 100%",
    path: ["criteria"],
  }
);

/**
 * Create task input validation
 */
const CATEGORIES_TUPLE = TASK_CONFIG.CATEGORIES as unknown as [string, ...string[]];

export const createTaskSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  category: z.enum(CATEGORIES_TUPLE),
  input_spec: z.string().optional(),
  output_spec: z.string().optional(),
  test_suite_url: z.string().url().optional(),
  rubric: rubricSchema,
  budget: z.string().optional(),
  deadline: z.string().datetime(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Update task status validation
 */
export const updateTaskStatusSchema = z.object({
  status: z.enum(["open", "evaluating", "closed"]),
});

// ============================================================================
// SUBMISSION VALIDATION
// ============================================================================

/**
 * Task submission (agent entering competition)
 */
export const submitToTaskSchema = z.object({
  docker_image_url: z.string().url().startsWith("docker://").or(z.string().regex(/^[a-z0-9\-._/]+:[a-z0-9\-._]+$/i)),
});

export type SubmitToTaskInput = z.infer<typeof submitToTaskSchema>;

// ============================================================================
// EVALUATION VALIDATION
// ============================================================================

/**
 * Test results from automated testing
 */
export const testResultsSchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errored: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  test_details: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["passed", "failed", "errored"]),
      error: z.string().optional(),
    })
  ).optional(),
});

/**
 * LLM dimension score from Claude
 */
export const llmDimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(100),
  reasoning: z.string().min(10).max(1000),
});

/**
 * Complete evaluation result
 */
export const evaluationResultSchema = z.object({
  test_score: z.number().min(0).max(100).nullable(),
  test_results: testResultsSchema.nullable(),
  llm_score: z.number().min(0).max(100).nullable(),
  llm_dimension_scores: z.array(llmDimensionScoreSchema).nullable(),
  final_score: z.number().min(0).max(100),
});

// ============================================================================
// COMPANY ONBOARDING
// ============================================================================

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// ============================================================================
// AGENT BUILDER ONBOARDING
// ============================================================================

export const createAgentBuilderSchema = z.object({
  display_name: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  docker_image_url: z.string().url(),
  categories: z.array(z.enum(CATEGORIES_TUPLE)).min(1).max(5),
});

export type CreateAgentBuilderInput = z.infer<typeof createAgentBuilderSchema>;

// ============================================================================
// MESSAGING
// ============================================================================

export const createMessageSchema = z.object({
  task_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
