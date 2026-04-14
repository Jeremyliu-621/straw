import { z } from "zod/v4";
import {
  TASK_TITLE_MIN_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_MIN_BUDGET_CENTS,
  TASK_MAX_BUDGET_CENTS,
  TASK_MIN_DEADLINE_HOURS,
  RUBRIC_MIN_CRITERIA,
  RUBRIC_MAX_CRITERIA,
  RUBRIC_WEIGHT_SUM,
  RUBRIC_MIN_WEIGHT,
  EVAL_MODE,
} from "@/constants";

export const rubricCriterionSchema = z.object({
  name: z.string().min(1, "Criterion name is required"),
  description: z.string().optional(),
  weight: z.number().int().min(RUBRIC_MIN_WEIGHT, `Weight must be at least ${RUBRIC_MIN_WEIGHT}%`),
  position: z.number().int().min(0),
});

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .min(TASK_TITLE_MIN_LENGTH, `Title must be at least ${TASK_TITLE_MIN_LENGTH} characters`)
      .max(TASK_TITLE_MAX_LENGTH, `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters`),
    description: z
      .string()
      .max(TASK_DESCRIPTION_MAX_LENGTH, `Description must be at most ${TASK_DESCRIPTION_MAX_LENGTH} characters`)
      .optional()
      .default(""),
    category: z.string().optional().default(""),
    input_spec: z.string().optional().default(""),
    output_spec: z.string().optional().default(""),
    test_weight: z.number().int().min(0).max(100),
    llm_weight: z.number().int().min(0).max(100),
    budget_cents: z.number().int().min(TASK_MIN_BUDGET_CENTS).max(TASK_MAX_BUDGET_CENTS),
    deadline: z.string().refine(
      (val) => {
        const date = new Date(val);
        const minDeadline = new Date(Date.now() + TASK_MIN_DEADLINE_HOURS * 60 * 60 * 1000);
        return date > minDeadline;
      },
      { message: `Deadline must be at least ${TASK_MIN_DEADLINE_HOURS} hours from now` }
    ),
    criteria: z
      .array(rubricCriterionSchema)
      .min(RUBRIC_MIN_CRITERIA, `At least ${RUBRIC_MIN_CRITERIA} criterion is required`)
      .max(RUBRIC_MAX_CRITERIA, `At most ${RUBRIC_MAX_CRITERIA} criteria allowed`),
    eval_mode: z
      .enum([EVAL_MODE.LLM, EVAL_MODE.CONTAINER, EVAL_MODE.HYBRID])
      .optional()
      .default(EVAL_MODE.LLM),
    eval_image: z.string().min(1).optional().nullable(),
    eval_network: z.boolean().optional().default(false),
    eval_memory_mb: z.number().int().min(512).max(4096).optional().default(1024),
    eval_timeout_seconds: z.number().int().min(600).max(3600).optional().default(600),
  })
  .refine((data) => data.test_weight + data.llm_weight === 100, {
    message: "Test weight + LLM weight must equal 100",
    path: ["test_weight"],
  })
  .refine(
    (data) => {
      const totalWeight = data.criteria.reduce((sum, c) => sum + c.weight, 0);
      return totalWeight === RUBRIC_WEIGHT_SUM;
    },
    {
      message: `Rubric criteria weights must sum to ${RUBRIC_WEIGHT_SUM}`,
      path: ["criteria"],
    }
  )
  .refine(
    (data) => {
      if (data.eval_mode !== EVAL_MODE.LLM && !data.eval_image) return false;
      return true;
    },
    {
      message: "An eval container image is required for container and hybrid eval modes",
      path: ["eval_image"],
    }
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ── Task Refinement (LLM generation) ────────────────────────
export const refineTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  inputFiles: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ),
  outputFiles: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    })
  ),
  criteria: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      weight: z.number(),
    })
  ),
  testWeight: z.number().int().min(0).max(100),
});

export type RefineTaskInput = z.infer<typeof refineTaskSchema>;
