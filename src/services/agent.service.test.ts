/**
 * Tests for agent service
 * Category matching, reputation, validation, etc.
 */

import { describe, it, expect } from "vitest";
import {
  isAgentEligibleForTask,
  getEligibleTasks,
  calculateReputation,
  deriveSpecializations,
  validateAgentProfile,
  validateDockerImageUrl,
  hasAgentSubmitted,
} from "./agent.service";
import { Task } from "@/types/database";

describe("Agent Service", () => {
  describe("Category Matching", () => {
    it("should match agents with task category", () => {
      const categories = ["code-generation", "debugging", "optimization"];
      expect(isAgentEligibleForTask(categories, "code-generation")).toBe(true);
      expect(isAgentEligibleForTask(categories, "debugging")).toBe(true);
    });

    it("should reject agents without task category", () => {
      const categories = ["code-generation"];
      expect(isAgentEligibleForTask(categories, "data-analysis")).toBe(false);
    });

    it("should handle empty category lists", () => {
      expect(isAgentEligibleForTask([], "code-generation")).toBe(false);
    });
  });

  describe("Eligible Tasks Filtering", () => {
    const mockTasks: Task[] = [
      {
        id: "1",
        company_id: "c1",
        title: "Task 1",
        description: "Code gen",
        category: "code-generation",
        status: "open",
        rubric: { criteria: [] },
        test_weight: 0.6,
        llm_weight: 0.4,
        deadline: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        budget: null,
        input_spec: null,
        output_spec: null,
        test_suite_url: null,
      },
      {
        id: "2",
        company_id: "c1",
        title: "Task 2",
        description: "Debugging",
        category: "debugging",
        status: "open",
        rubric: { criteria: [] },
        test_weight: 0.6,
        llm_weight: 0.4,
        deadline: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        budget: null,
        input_spec: null,
        output_spec: null,
        test_suite_url: null,
      },
      {
        id: "3",
        company_id: "c1",
        title: "Task 3",
        description: "Closed task",
        category: "code-generation",
        status: "closed",
        rubric: { criteria: [] },
        test_weight: 0.6,
        llm_weight: 0.4,
        deadline: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        budget: null,
        input_spec: null,
        output_spec: null,
        test_suite_url: null,
      },
    ];

    it("should return only eligible open tasks", () => {
      const categories = ["code-generation"];
      const eligible = getEligibleTasks(categories, mockTasks);
      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe("1");
    });

    it("should exclude closed tasks", () => {
      const categories = ["code-generation"];
      const eligible = getEligibleTasks(categories, mockTasks);
      expect(eligible.every((t) => t.status === "open")).toBe(true);
    });

    it("should handle multiple categories", () => {
      const categories = ["code-generation", "debugging"];
      const eligible = getEligibleTasks(categories, mockTasks);
      expect(eligible).toHaveLength(2);
    });
  });

  describe("Reputation Calculation", () => {
    it("should calculate reputation from score and wins", () => {
      const agent = {
        tasks_attempted: 10,
        tasks_won: 5,
        average_score: 80,
      };
      const reputation = calculateReputation(agent);
      // average_score (80) + (win_rate * 0.5) = 80 + (50 * 0.5) = 80 + 25 = 105, capped at 80 + 50 = 130
      expect(reputation).toBeGreaterThan(80);
      expect(reputation).toBeLessThanOrEqual(130);
    });

    it("should return 0 for new agents", () => {
      const agent = {
        tasks_attempted: 0,
        tasks_won: 0,
        average_score: 0,
      };
      expect(calculateReputation(agent)).toBe(0);
    });

    it("should cap win rate bonus at 50", () => {
      const agent = {
        tasks_attempted: 100,
        tasks_won: 100,
        average_score: 100,
      };
      const reputation = calculateReputation(agent);
      expect(reputation).toBe(150); // 100 + 50
    });
  });

  describe("Specialization Derivation", () => {
    it("should derive specializations from wins", () => {
      const wins = [
        { category: "code-generation" },
        { category: "code-generation" },
        { category: "debugging" },
      ];
      const specs = deriveSpecializations(wins);
      expect(specs[0]).toBe("code-generation"); // Most wins
      expect(specs[1]).toBe("debugging");
    });

    it("should handle single specialization", () => {
      const wins = [{ category: "code-generation" }];
      const specs = deriveSpecializations(wins);
      expect(specs).toEqual(["code-generation"]);
    });

    it("should return empty for no wins", () => {
      expect(deriveSpecializations([])).toEqual([]);
    });
  });

  describe("Validation", () => {
    it("should validate Docker image URLs", () => {
      expect(validateDockerImageUrl("https://docker.io/user/image:latest")).toBe(true);
      expect(validateDockerImageUrl("https://ghcr.io/org/image")).toBe(true);
      expect(validateDockerImageUrl("not-a-url")).toBe(false);
      expect(validateDockerImageUrl("")).toBe(false);
    });

    it("should validate agent profiles", () => {
      const valid = {
        display_name: "CodeMaster",
        docker_image_url: "https://ghcr.io/user/agent:latest",
        categories: ["code-generation"],
      };
      expect(validateAgentProfile(valid)).toHaveLength(0);
    });

    it("should reject invalid display names", () => {
      const invalid = {
        display_name: "A", // Too short
        docker_image_url: "https://ghcr.io/user/agent",
        categories: ["code-generation"],
      };
      const errors = validateAgentProfile(invalid);
      expect(errors.some((e) => e.includes("Display name"))).toBe(true);
    });

    it("should reject invalid Docker URLs", () => {
      const invalid = {
        display_name: "Agent",
        docker_image_url: "not-a-url",
        categories: ["code-generation"],
      };
      const errors = validateAgentProfile(invalid);
      expect(errors.some((e) => e.includes("Docker"))).toBe(true);
    });

    it("should reject empty categories", () => {
      const invalid = {
        display_name: "Agent",
        docker_image_url: "https://ghcr.io/user/agent",
        categories: [],
      };
      const errors = validateAgentProfile(invalid);
      expect(errors.some((e) => e.includes("category"))).toBe(true);
    });

    it("should reject too many categories", () => {
      const invalid = {
        display_name: "Agent",
        docker_image_url: "https://ghcr.io/user/agent",
        categories: ["code-generation", "debugging", "optimization", "architecture", "testing", "extra"],
      };
      const errors = validateAgentProfile(invalid);
      expect(errors.some((e) => e.includes("at most 5"))).toBe(true);
    });
  });

  describe("Submission Tracking", () => {
    it("should detect if agent has submitted", () => {
      const submissions = [
        { agent_builder_id: "agent1" },
        { agent_builder_id: "agent2" },
      ];
      expect(hasAgentSubmitted("agent1", submissions)).toBe(true);
      expect(hasAgentSubmitted("agent3", submissions)).toBe(false);
    });
  });
});
