/**
 * Tests for task service - state machine, transitions, and validation
 */

import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  enforceTransition,
  validateRubricWeights,
  shouldAutoTransitionToEvaluating,
  isAgentEligibleForTask,
} from "./task.service";

describe("Task Service", () => {
  describe("State Machine Transitions", () => {
    it("should allow valid transitions", () => {
      expect(isValidTransition("open", "evaluating")).toBe(true);
      expect(isValidTransition("open", "closed")).toBe(true);
      expect(isValidTransition("evaluating", "closed")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(isValidTransition("evaluating", "open")).toBe(false);
      expect(isValidTransition("closed", "open")).toBe(false);
      expect(isValidTransition("closed", "evaluating")).toBe(false);
    });

    it("should enforce transitions and throw on invalid", () => {
      expect(() => enforceTransition("open", "evaluating")).not.toThrow();
      expect(() => enforceTransition("closed", "open")).toThrow();
      expect(() => enforceTransition("evaluating", "open")).toThrow();
    });
  });

  describe("Rubric Weight Validation", () => {
    it("should accept rubric weights that sum to 100", () => {
      const validRubric = {
        criteria: [
          { name: "Quality", weight: 50 },
          { name: "Speed", weight: 50 },
        ],
      };
      expect(() => validateRubricWeights(validRubric)).not.toThrow();
    });

    it("should reject rubric weights that don't sum to 100", () => {
      const invalidRubric = {
        criteria: [
          { name: "Quality", weight: 60 },
          { name: "Speed", weight: 30 },
        ],
      };
      expect(() => validateRubricWeights(invalidRubric)).toThrow();
    });

    it("should handle complex rubrics", () => {
      const rubric = {
        criteria: [
          { name: "Code Quality", weight: 30 },
          { name: "Testing", weight: 25 },
          { name: "Documentation", weight: 20 },
          { name: "Performance", weight: 25 },
        ],
      };
      expect(() => validateRubricWeights(rubric)).not.toThrow();
    });
  });

  describe("Auto-transition Logic", () => {
    it("should not auto-transition if deadline hasn't passed", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const task = {
        status: "open" as const,
        deadline: futureDate.toISOString(),
      };
      expect(shouldAutoTransitionToEvaluating(task as any)).toBe(false);
    });

    it("should auto-transition when deadline passes", () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const task = {
        status: "open" as const,
        deadline: pastDate.toISOString(),
      };
      expect(shouldAutoTransitionToEvaluating(task as any)).toBe(true);
    });

    it("should not auto-transition if not in open state", () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60);
      const task = {
        status: "evaluating" as const,
        deadline: pastDate.toISOString(),
      };
      expect(shouldAutoTransitionToEvaluating(task as any)).toBe(false);
    });
  });

  describe("Agent Eligibility", () => {
    it("should match agents with task category", () => {
      const agentCategories = ["code-generation", "debugging", "optimization"];
      expect(isAgentEligibleForTask(agentCategories, "code-generation")).toBe(true);
      expect(isAgentEligibleForTask(agentCategories, "debugging")).toBe(true);
    });

    it("should reject agents without task category", () => {
      const agentCategories = ["code-generation"];
      expect(isAgentEligibleForTask(agentCategories, "data-analysis")).toBe(false);
    });

    it("should handle empty category lists", () => {
      expect(isAgentEligibleForTask([], "code-generation")).toBe(false);
    });
  });
});
