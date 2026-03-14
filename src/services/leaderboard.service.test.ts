/**
 * Tests for leaderboard service
 * Anonymization, ranking, scoring, deadline logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  anonymizeAgentName,
  isDeadlinePassed,
  rankEntries,
  buildLeaderboard,
  getWinner,
  getEvaluatingAgents,
  getTimeRemaining,
  shouldAutoClose,
} from "./leaderboard.service";
import { Task } from "@/types/database";

describe("Leaderboard Service", () => {
  const mockTask: Task = {
    id: "task-123",
    company_id: "company-1",
    title: "Build Todo API",
    description: "Create a RESTful API",
    category: "code-generation",
    status: "open",
    rubric: { criteria: [] },
    test_weight: 0.6,
    llm_weight: 0.4,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    budget: "$5,000",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    input_spec: null,
    output_spec: null,
    test_suite_url: null,
  };

  const mockClosedTask: Task = {
    ...mockTask,
    deadline: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
  };

  describe("Anonymization", () => {
    it("should show agent numbers before deadline", () => {
      expect(anonymizeAgentName("agent-1", 1, false)).toBe("Agent #1");
      expect(anonymizeAgentName("agent-2", 2, false)).toBe("Agent #2");
    });

    it("should show agent name after deadline", () => {
      expect(anonymizeAgentName("agent-1", 1, true)).toBe("Agent Name");
    });

    it("should handle different ranks consistently", () => {
      const name1 = anonymizeAgentName("agent-1", 1, false);
      const name5 = anonymizeAgentName("agent-5", 5, false);
      expect(name1).toBe("Agent #1");
      expect(name5).toBe("Agent #5");
    });
  });

  describe("Deadline Logic", () => {
    it("should recognize future deadlines as not passed", () => {
      const futureDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(isDeadlinePassed(futureDeadline)).toBe(false);
    });

    it("should recognize past deadlines as passed", () => {
      const pastDeadline = new Date(Date.now() - 60 * 1000).toISOString();
      expect(isDeadlinePassed(pastDeadline)).toBe(true);
    });

    it("should calculate time remaining", () => {
      const futureDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      const timeRemaining = getTimeRemaining(futureDeadline);
      expect(timeRemaining).toBeGreaterThan(29 * 60 * 1000); // At least 29 minutes
      expect(timeRemaining).toBeLessThanOrEqual(30 * 60 * 1000); // At most 30 minutes
    });

    it("should return 0 time remaining for past deadline", () => {
      const pastDeadline = new Date(Date.now() - 60 * 1000).toISOString();
      expect(getTimeRemaining(pastDeadline)).toBe(0);
    });
  });

  describe("Ranking", () => {
    it("should rank entries by final score descending", () => {
      const entries = [
        {
          rank: 0,
          agent_builder_id: "agent-1",
          agent_name: "Agent #1",
          final_score: 80,
          test_score: 75,
          llm_score: 85,
          status: "completed" as const,
          submitted_at: new Date().toISOString(),
        },
        {
          rank: 0,
          agent_builder_id: "agent-2",
          agent_name: "Agent #2",
          final_score: 90,
          test_score: 95,
          llm_score: 85,
          status: "completed" as const,
          submitted_at: new Date().toISOString(),
        },
        {
          rank: 0,
          agent_builder_id: "agent-3",
          agent_name: "Agent #3",
          final_score: 70,
          test_score: 65,
          llm_score: 75,
          status: "completed" as const,
          submitted_at: new Date().toISOString(),
        },
      ];

      const ranked = rankEntries(entries);
      expect(ranked[0].agent_builder_id).toBe("agent-2"); // 90
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].agent_builder_id).toBe("agent-1"); // 80
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].agent_builder_id).toBe("agent-3"); // 70
      expect(ranked[2].rank).toBe(3);
    });

    it("should break ties with submission time", () => {
      const earlierTime = new Date(Date.now() - 60 * 1000).toISOString();
      const laterTime = new Date().toISOString();

      const entries = [
        {
          rank: 0,
          agent_builder_id: "agent-1",
          agent_name: "Agent #1",
          final_score: 85,
          test_score: 85,
          llm_score: 85,
          status: "completed" as const,
          submitted_at: laterTime,
        },
        {
          rank: 0,
          agent_builder_id: "agent-2",
          agent_name: "Agent #2",
          final_score: 85,
          test_score: 85,
          llm_score: 85,
          status: "completed" as const,
          submitted_at: earlierTime,
        },
      ];

      const ranked = rankEntries(entries);
      expect(ranked[0].agent_builder_id).toBe("agent-2"); // Submitted earlier
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].agent_builder_id).toBe("agent-1");
      expect(ranked[1].rank).toBe(2);
    });

    it("should handle single entry", () => {
      const entries = [
        {
          rank: 0,
          agent_builder_id: "agent-1",
          agent_name: "Agent #1",
          final_score: 85,
          test_score: 85,
          llm_score: 85,
          status: "completed" as const,
          submitted_at: new Date().toISOString(),
        },
      ];

      const ranked = rankEntries(entries);
      expect(ranked[0].rank).toBe(1);
    });

    it("should handle empty leaderboard", () => {
      const ranked = rankEntries([]);
      expect(ranked).toEqual([]);
    });
  });

  describe("Leaderboard Building", () => {
    it("should build leaderboard from submissions", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "CodeMaster",
          docker_image_url: "https://ghcr.io/codemaster:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 85,
          llm_score: 90,
          final_score: 87,
          evaluated_at: new Date().toISOString(),
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      expect(leaderboard.task_id).toBe(mockTask.id);
      expect(leaderboard.submission_count).toBe(1);
      expect(leaderboard.is_revealed).toBe(false); // Deadline not passed
      expect(leaderboard.entries[0].rank).toBe(1);
      expect(leaderboard.entries[0].final_score).toBe(87);
    });

    it("should anonymize agents before deadline", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "CodeMaster",
          docker_image_url: "https://ghcr.io/codemaster:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 85,
          llm_score: 90,
          final_score: 87,
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      expect(leaderboard.is_revealed).toBe(false);
      expect(leaderboard.entries[0].agent_name).toBe("Agent #1");
      expect(leaderboard.entries[0].docker_image_url).toBeUndefined();
    });

    it("should reveal agents after deadline", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "CodeMaster",
          docker_image_url: "https://ghcr.io/codemaster:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 85,
          llm_score: 90,
          final_score: 87,
        },
      ];

      const leaderboard = buildLeaderboard(mockClosedTask, submissions);
      expect(leaderboard.is_revealed).toBe(true);
      expect(leaderboard.entries[0].docker_image_url).toBeDefined();
    });

    it("should handle evaluating submissions", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "Agent1",
          docker_image_url: "https://ghcr.io/agent1:latest",
          submitted_at: new Date().toISOString(),
          status: "evaluating" as const,
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      expect(leaderboard.entries[0].status).toBe("evaluating");
      expect(leaderboard.entries[0].final_score).toBe(0);
    });
  });

  describe("Winner Detection", () => {
    it("should return top-ranked completed submission", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "Agent1",
          docker_image_url: "https://ghcr.io/agent1:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 85,
          llm_score: 90,
          final_score: 87,
        },
        {
          agent_builder_id: "agent-2",
          agent_name: "Agent2",
          docker_image_url: "https://ghcr.io/agent2:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 75,
          llm_score: 80,
          final_score: 77,
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      const winner = getWinner(leaderboard);
      expect(winner).not.toBeNull();
      expect(winner?.agent_builder_id).toBe("agent-1");
      expect(winner?.rank).toBe(1);
    });

    it("should return null if no completed submissions", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "Agent1",
          docker_image_url: "https://ghcr.io/agent1:latest",
          submitted_at: new Date().toISOString(),
          status: "evaluating" as const,
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      const winner = getWinner(leaderboard);
      expect(winner).toBeNull();
    });
  });

  describe("Evaluating Agents", () => {
    it("should filter agents currently evaluating", () => {
      const submissions = [
        {
          agent_builder_id: "agent-1",
          agent_name: "Agent1",
          docker_image_url: "https://ghcr.io/agent1:latest",
          submitted_at: new Date().toISOString(),
          status: "evaluating" as const,
        },
        {
          agent_builder_id: "agent-2",
          agent_name: "Agent2",
          docker_image_url: "https://ghcr.io/agent2:latest",
          submitted_at: new Date().toISOString(),
          status: "completed" as const,
          test_score: 85,
          llm_score: 90,
          final_score: 87,
        },
      ];

      const leaderboard = buildLeaderboard(mockTask, submissions);
      const evaluating = getEvaluatingAgents(leaderboard);
      expect(evaluating).toHaveLength(1);
      expect(evaluating[0].agent_builder_id).toBe("agent-1");
    });
  });

  describe("Auto-Close Logic", () => {
    it("should auto-close open task after deadline", () => {
      expect(shouldAutoClose(mockClosedTask)).toBe(true);
    });

    it("should not auto-close task before deadline", () => {
      expect(shouldAutoClose(mockTask)).toBe(false);
    });

    it("should not auto-close already closed task", () => {
      const closedTask = { ...mockClosedTask, status: "closed" as const };
      expect(shouldAutoClose(closedTask)).toBe(false);
    });

    it("should auto-close evaluating task after deadline", () => {
      const evaluatingClosedTask = {
        ...mockClosedTask,
        status: "evaluating" as const,
      };
      expect(shouldAutoClose(evaluatingClosedTask)).toBe(true);
    });
  });
});
