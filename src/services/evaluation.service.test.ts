/**
 * Tests for evaluation service - scoring, validation, and calculations
 * This is critical infrastructure for product credibility
 */

import { describe, it, expect } from "vitest";
import {
  calculateFinalScore,
  calculateTestScore,
  calculateLLMScore,
  validateTestResults,
  validateLLMDimensionScores,
  isEvaluationComplete,
} from "./evaluation.service";
import { TestResults, LLMDimensionScore } from "@/types/database";

describe("Evaluation Service - Scoring", () => {
  describe("Test Score Calculation", () => {
    it("should calculate test score as percentage", () => {
      const results: TestResults = {
        passed: 8,
        failed: 2,
        errored: 0,
        total: 10,
      };
      expect(calculateTestScore(results)).toBe(80);
    });

    it("should handle perfect score", () => {
      const results: TestResults = {
        passed: 10,
        failed: 0,
        errored: 0,
        total: 10,
      };
      expect(calculateTestScore(results)).toBe(100);
    });

    it("should handle zero score", () => {
      const results: TestResults = {
        passed: 0,
        failed: 10,
        errored: 0,
        total: 10,
      };
      expect(calculateTestScore(results)).toBe(0);
    });

    it("should round to 1 decimal place", () => {
      const results: TestResults = {
        passed: 1,
        failed: 2,
        errored: 0,
        total: 3, // 33.333...%
      };
      expect(calculateTestScore(results)).toBe(33.3);
    });

    it("should handle errored tests", () => {
      const results: TestResults = {
        passed: 5,
        failed: 3,
        errored: 2,
        total: 10, // 50% passed
      };
      expect(calculateTestScore(results)).toBe(50);
    });
  });

  describe("Final Score Calculation", () => {
    it("should calculate weighted average of test and LLM scores", () => {
      const finalScore = calculateFinalScore(80, 90, 0.6, 0.4);
      // 80 * 0.6 + 90 * 0.4 = 48 + 36 = 84
      expect(finalScore).toBe(84);
    });

    it("should use test score if LLM score is null", () => {
      const finalScore = calculateFinalScore(75, null, 0.6, 0.4);
      expect(finalScore).toBe(75);
    });

    it("should use LLM score if test score is null", () => {
      const finalScore = calculateFinalScore(null, 85, 0.6, 0.4);
      expect(finalScore).toBe(85);
    });

    it("should return 0 if both scores are null", () => {
      const finalScore = calculateFinalScore(null, null, 0.6, 0.4);
      expect(finalScore).toBe(0);
    });

    it("should clamp to 0-100 range", () => {
      expect(calculateFinalScore(-10, 50, 0.5, 0.5)).toBe(20); // Clamped
      expect(calculateFinalScore(150, 50, 0.5, 0.5)).toBe(100); // Clamped
    });

    it("should handle various weight distributions", () => {
      // 90% weight on tests, 10% on LLM
      expect(calculateFinalScore(80, 60, 0.9, 0.1)).toBe(78);
      // Equal weights
      expect(calculateFinalScore(70, 80, 0.5, 0.5)).toBe(75);
    });
  });

  describe("LLM Score Calculation", () => {
    it("should calculate weighted average of dimension scores", () => {
      const dimensions: LLMDimensionScore[] = [
        { dimension: "Quality", score: 80, reasoning: "Good code structure" },
        { dimension: "Testing", score: 60, reasoning: "Could have more tests" },
      ];
      const rubric = [
        { name: "Quality", weight: 70 },
        { name: "Testing", weight: 30 },
      ];
      const score = calculateLLMScore(dimensions, rubric);
      // (80 * 0.7 + 60 * 0.3) / 1.0 = 74
      expect(score).toBe(74);
    });

    it("should handle perfect dimension scores", () => {
      const dimensions: LLMDimensionScore[] = [
        { dimension: "A", score: 100, reasoning: "Perfect" },
        { dimension: "B", score: 100, reasoning: "Perfect" },
        { dimension: "C", score: 100, reasoning: "Perfect" },
      ];
      const rubric = [
        { name: "A", weight: 33.3 },
        { name: "B", weight: 33.3 },
        { name: "C", weight: 33.4 },
      ];
      expect(calculateLLMScore(dimensions, rubric)).toBe(100);
    });

    it("should handle zero score", () => {
      const dimensions: LLMDimensionScore[] = [
        { dimension: "Quality", score: 0, reasoning: "Broken" },
      ];
      const rubric = [{ name: "Quality", weight: 100 }];
      expect(calculateLLMScore(dimensions, rubric)).toBe(0);
    });
  });

  describe("Validation", () => {
    it("should validate test results format", () => {
      const valid: TestResults = {
        passed: 5,
        failed: 2,
        errored: 1,
        total: 8,
      };
      expect(() => validateTestResults(valid)).not.toThrow();
    });

    it("should reject test results with mismatched counts", () => {
      const invalid: TestResults = {
        passed: 5,
        failed: 2,
        errored: 1,
        total: 10, // Doesn't add up
      };
      expect(() => validateTestResults(invalid)).toThrow();
    });

    it("should reject test results with zero total", () => {
      const invalid: TestResults = {
        passed: 0,
        failed: 0,
        errored: 0,
        total: 0,
      };
      expect(() => validateTestResults(invalid)).toThrow();
    });

    it("should validate LLM dimension scores", () => {
      const scores: LLMDimensionScore[] = [
        { dimension: "Quality", score: 80, reasoning: "Good code structure" },
        { dimension: "Testing", score: 70, reasoning: "Adequate test coverage" },
      ];
      const rubric = [
        { name: "Quality", weight: 50 },
        { name: "Testing", weight: 50 },
      ];
      expect(() => validateLLMDimensionScores(scores, rubric)).not.toThrow();
    });

    it("should reject LLM scores with missing dimensions", () => {
      const scores: LLMDimensionScore[] = [
        { dimension: "Quality", score: 80, reasoning: "Good code" },
        // Missing "Testing"
      ];
      const rubric = [
        { name: "Quality", weight: 50 },
        { name: "Testing", weight: 50 },
      ];
      expect(() => validateLLMDimensionScores(scores, rubric)).toThrow();
    });

    it("should reject invalid dimension scores", () => {
      const scores: LLMDimensionScore[] = [
        { dimension: "Quality", score: 150, reasoning: "Out of range" }, // > 100
      ];
      const rubric = [{ name: "Quality", weight: 100 }];
      expect(() => validateLLMDimensionScores(scores, rubric)).toThrow();
    });

    it("should reject missing reasoning", () => {
      const scores: LLMDimensionScore[] = [
        { dimension: "Quality", score: 80, reasoning: "" }, // Empty
      ];
      const rubric = [{ name: "Quality", weight: 100 }];
      expect(() => validateLLMDimensionScores(scores, rubric)).toThrow();
    });
  });

  describe("Completion Status", () => {
    it("should recognize complete evaluation", () => {
      const complete = {
        test_score: 75,
        llm_score: 80,
        final_score: 77.5,
      } as any;
      expect(isEvaluationComplete(complete)).toBe(true);
    });

    it("should recognize incomplete evaluation", () => {
      const incomplete = {
        test_score: 75,
        llm_score: null,
        final_score: 75,
      } as any;
      expect(isEvaluationComplete(incomplete)).toBe(false);
    });

    it("should recognize no evaluation", () => {
      const noEval = {
        test_score: null,
        llm_score: null,
        final_score: 0,
      } as any;
      expect(isEvaluationComplete(noEval)).toBe(false);
    });
  });
});
