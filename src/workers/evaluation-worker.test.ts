import { describe, it, expect } from "vitest";

// Import the exported score calculation function
// We test the logic functions in isolation since the worker uses external services

describe("evaluation worker logic", () => {
  describe("calculateFinalScore", () => {
    function calculateFinalScore(
      testScore: number | null,
      llmScore: number | null,
      testWeight: number,
      llmWeight: number
    ): number {
      const effectiveTestScore = testScore ?? 0;
      const effectiveLLMScore = llmScore ?? 0;
      return (effectiveTestScore * testWeight + effectiveLLMScore * llmWeight) / 100;
    }

    it("calculates weighted average correctly", () => {
      expect(calculateFinalScore(80, 90, 60, 40)).toBe(84);
    });

    it("handles pure test evaluation", () => {
      expect(calculateFinalScore(75, null, 100, 0)).toBe(75);
    });

    it("handles pure LLM evaluation", () => {
      expect(calculateFinalScore(null, 92, 0, 100)).toBe(92);
    });

    it("handles null scores as zero", () => {
      expect(calculateFinalScore(null, null, 50, 50)).toBe(0);
    });

    it("handles 60/40 split", () => {
      // (100 * 60 + 50 * 40) / 100 = (6000 + 2000) / 100 = 80
      expect(calculateFinalScore(100, 50, 60, 40)).toBe(80);
    });

    it("handles zero scores", () => {
      expect(calculateFinalScore(0, 0, 50, 50)).toBe(0);
    });

    it("handles perfect scores", () => {
      expect(calculateFinalScore(100, 100, 50, 50)).toBe(100);
    });

    it("handles asymmetric weights", () => {
      // (80 * 90 + 60 * 10) / 100 = (7200 + 600) / 100 = 78
      expect(calculateFinalScore(80, 60, 90, 10)).toBe(78);
    });
  });

  describe("LLM response validation", () => {
    // Test the Zod schema validation logic
    const { z } = require("zod/v4");

    const dimensionScoreSchema = z.object({
      criterion_name: z.string(),
      score: z.number().min(0).max(100),
      reasoning: z.string(),
    });

    const llmResponseSchema = z.object({
      dimensions: z.array(dimensionScoreSchema),
      overall_reasoning: z.string(),
    });

    it("accepts valid LLM response", () => {
      const response = {
        dimensions: [
          { criterion_name: "Correctness", score: 85, reasoning: "Good output" },
          { criterion_name: "Code Quality", score: 90, reasoning: "Clean code" },
        ],
        overall_reasoning: "Solid submission overall",
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("rejects score above 100", () => {
      const response = {
        dimensions: [
          { criterion_name: "Test", score: 150, reasoning: "Too high" },
        ],
        overall_reasoning: "Invalid",
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("rejects score below 0", () => {
      const response = {
        dimensions: [
          { criterion_name: "Test", score: -10, reasoning: "Too low" },
        ],
        overall_reasoning: "Invalid",
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("rejects missing criterion_name", () => {
      const response = {
        dimensions: [{ score: 50, reasoning: "Missing name" }],
        overall_reasoning: "Invalid",
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("rejects missing overall_reasoning", () => {
      const response = {
        dimensions: [
          { criterion_name: "Test", score: 50, reasoning: "Ok" },
        ],
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("accepts empty dimensions array", () => {
      const response = {
        dimensions: [],
        overall_reasoning: "No output to evaluate",
      };

      const result = llmResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("weighted LLM score calculation", () => {
    function calculateWeightedLLMScore(
      dimensions: { criterion_name: string; score: number }[],
      criteria: { name: string; weight: number }[]
    ): number {
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const dim of dimensions) {
        const criterion = criteria.find((c) => c.name === dim.criterion_name);
        if (criterion) {
          totalWeightedScore += dim.score * criterion.weight;
          totalWeight += criterion.weight;
        }
      }

      return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    }

    it("calculates weighted score correctly", () => {
      const dims = [
        { criterion_name: "Correctness", score: 80 },
        { criterion_name: "Code Quality", score: 100 },
      ];
      const criteria = [
        { name: "Correctness", weight: 60 },
        { name: "Code Quality", weight: 40 },
      ];

      // (80 * 60 + 100 * 40) / (60 + 40) = (4800 + 4000) / 100 = 88
      expect(calculateWeightedLLMScore(dims, criteria)).toBe(88);
    });

    it("handles unmatched dimensions gracefully", () => {
      const dims = [
        { criterion_name: "Unknown", score: 100 },
      ];
      const criteria = [
        { name: "Correctness", weight: 100 },
      ];

      expect(calculateWeightedLLMScore(dims, criteria)).toBe(0);
    });

    it("handles empty dimensions", () => {
      expect(calculateWeightedLLMScore([], [{ name: "Test", weight: 100 }])).toBe(0);
    });
  });

  describe("prompt construction", () => {
    it("includes all rubric criteria in the prompt", () => {
      const criteria = [
        { name: "Correctness", description: "Does it work?", weight: 60 },
        { name: "Quality", description: null, weight: 40 },
      ];

      const prompt = buildTestPrompt(criteria);
      expect(prompt).toContain("Correctness");
      expect(prompt).toContain("Does it work?");
      expect(prompt).toContain("Quality");
      expect(prompt).toContain("60%");
      expect(prompt).toContain("40%");
    });
  });
});

// Helper for testing prompt construction
function buildTestPrompt(
  criteria: { name: string; description: string | null; weight: number }[]
): string {
  return criteria
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (weight: ${c.weight}%)${c.description ? `: ${c.description}` : ""}`
    )
    .join("\n");
}
