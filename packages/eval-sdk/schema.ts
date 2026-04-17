import { z } from "zod";

export const testResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  duration_ms: z.number().optional(),
  error: z.string().max(2000).optional(),
});

export const scoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  pass: z.boolean(),
  breakdown: z.record(z.string(), z.number().min(0).max(100)).optional(),
  notes: z.string().max(2000).optional(),
  tests: z.array(testResultSchema).optional(),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

/**
 * Validate your score.json output locally before running in Straw.
 * Throws ZodError if invalid.
 */
export function validateScoreResult(data: unknown): ScoreResult {
  return scoreResultSchema.parse(data);
}
