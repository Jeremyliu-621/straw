/**
 * Tests for results service
 * Winner determination, reputation updates, task closure
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getTaskResult,
  calculateWinnerReputation,
  shouldAutoNotifyWinner,
  formatTaskResult,
  areAllEvaluationsDone,
  prepareWinnerContact,
  prepareTaskClosure,
  calculateCompanyPayout,
  isResultsExpired,
} from "./results.service";
import { Leaderboard } from "./leaderboard.service";

describe("Results Service", () => {
  const mockLeaderboard: Leaderboard = {
    task_id: "task-123",
    task_title: "Build Todo API",
    deadline: new Date(Date.now() - 60 * 1000).toISOString(),
    is_revealed: true,
    submission_count: 5,
    entries: [
      {
        rank: 1,
        agent_builder_id: "agent-1",
        agent_name: "CodeMaster",
        docker_image_url: "https://ghcr.io/codemaster:latest",
        final_score: 87,
        test_score: 85,
        llm_score: 90,
        status: "completed",
        submitted_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        evaluated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        rank: 2,
        agent_builder_id: "agent-2",
        agent_name: "AlgoExpert",
        docker_image_url: "https://ghcr.io/algoexpert:latest",
        final_score: 81,
        test_score: 78,
        llm_score: 85,
        status: "completed",
        submitted_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        evaluated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ],
  };

  describe("Task Result Extraction", () => {
    it("should get winner from leaderboard", () => {
      const result = getTaskResult(
        mockLeaderboard,
        30 * 60 * 1000,
        "$5,000"
      );
      expect(result.winner_id).toBe("agent-1");
      expect(result.winner_name).toBe("CodeMaster");
      expect(result.winning_score).toBe(87);
    });

    it("should include task metadata", () => {
      const result = getTaskResult(
        mockLeaderboard,
        30 * 60 * 1000,
        "$5,000"
      );
      expect(result.task_id).toBe("task-123");
      expect(result.task_title).toBe("Build Todo API");
      expect(result.total_submissions).toBe(5);
    });

    it("should calculate completion time", () => {
      const completionMs = 45 * 60 * 1000; // 45 minutes
      const result = getTaskResult(
        mockLeaderboard,
        completionMs,
        "$5,000"
      );
      expect(result.completion_time_ms).toBe(completionMs);
    });

    it("should handle leaderboard with no submissions", () => {
      const emptyLeaderboard: Leaderboard = {
        ...mockLeaderboard,
        entries: [],
        submission_count: 0,
      };
      const result = getTaskResult(emptyLeaderboard, 0, "$0");
      expect(result.winner_id).toBeNull();
      expect(result.winning_score).toBeNull();
    });

    it("should handle leaderboard with only evaluating entries", () => {
      const evaluatingLeaderboard: Leaderboard = {
        ...mockLeaderboard,
        entries: [
          {
            rank: 1,
            agent_builder_id: "agent-1",
            agent_name: "Agent #1",
            final_score: 0,
            test_score: 0,
            llm_score: 0,
            status: "evaluating",
            submitted_at: new Date().toISOString(),
          },
        ],
      };
      const result = getTaskResult(evaluatingLeaderboard, 0, "$0");
      expect(result.winner_id).toBeNull();
    });
  });

  describe("Reputation Calculation", () => {
    it("should award reputation based on score", () => {
      const update = calculateWinnerReputation(85, 1);
      expect(update.reputation_score_delta).toBeGreaterThan(0);
      expect(update.tasks_won_delta).toBe(1);
      expect(update.average_score_contribution).toBe(85);
    });

    it("should give bonus for competitive victories", () => {
      const singleUpdate = calculateWinnerReputation(85, 1);
      const competitiveUpdate = calculateWinnerReputation(85, 10);
      expect(competitiveUpdate.reputation_score_delta).toBeGreaterThan(
        singleUpdate.reputation_score_delta
      );
    });

    it("should cap competition multiplier", () => {
      const manyUpdate = calculateWinnerReputation(85, 100);
      const reasonableUpdate = calculateWinnerReputation(85, 25);
      // Both should have same or similar reputation delta (capped at 2x)
      expect(manyUpdate.reputation_score_delta).toBeLessThanOrEqual(
        reasonableUpdate.reputation_score_delta * 1.2
      );
    });

    it("should increase reputation with higher scores", () => {
      const lowScoreUpdate = calculateWinnerReputation(60, 5);
      const highScoreUpdate = calculateWinnerReputation(95, 5);
      expect(highScoreUpdate.reputation_score_delta).toBeGreaterThan(
        lowScoreUpdate.reputation_score_delta
      );
    });

    it("should award exactly 1 win", () => {
      const update = calculateWinnerReputation(85, 5);
      expect(update.tasks_won_delta).toBe(1);
    });
  });

  describe("Auto-Notification Logic", () => {
    it("should handle small budgets", () => {
      // Currently always false - business rule not implemented
      expect(shouldAutoNotifyWinner("$100", 85)).toBe(false);
    });

    it("should handle perfect scores", () => {
      // Currently always false - business rule not implemented
      expect(shouldAutoNotifyWinner("$5,000", 100)).toBe(false);
    });
  });

  describe("Result Formatting", () => {
    it("should format task result for display", () => {
      const result = getTaskResult(
        mockLeaderboard,
        30 * 60 * 1000,
        "$5,000"
      );
      const formatted = formatTaskResult(result);
      expect(formatted.winner?.name).toBe("CodeMaster");
      expect(formatted.statistics.total_submissions).toBe(5);
      expect(formatted.statistics.budget).toBe("$5,000");
    });

    it("should calculate completion time in hours", () => {
      const result = getTaskResult(
        mockLeaderboard,
        2 * 60 * 60 * 1000, // 2 hours
        "$5,000"
      );
      const formatted = formatTaskResult(result);
      expect(formatted.statistics.completion_time_hours).toBe(2);
    });

    it("should handle null winner in formatted result", () => {
      const emptyLeaderboard: Leaderboard = {
        ...mockLeaderboard,
        entries: [],
      };
      const result = getTaskResult(emptyLeaderboard, 0, "$0");
      const formatted = formatTaskResult(result);
      expect(formatted.winner).toBeNull();
    });
  });

  describe("Evaluation Status Checking", () => {
    it("should detect all evaluations complete", () => {
      expect(areAllEvaluationsDone(mockLeaderboard)).toBe(true);
    });

    it("should detect incomplete evaluations", () => {
      const incompleteLeaderboard: Leaderboard = {
        ...mockLeaderboard,
        entries: [
          ...mockLeaderboard.entries,
          {
            rank: 3,
            agent_builder_id: "agent-3",
            agent_name: "Agent #3",
            final_score: 0,
            test_score: 0,
            llm_score: 0,
            status: "evaluating",
            submitted_at: new Date().toISOString(),
          },
        ],
      };
      expect(areAllEvaluationsDone(incompleteLeaderboard)).toBe(false);
    });

    it("should handle empty leaderboard", () => {
      const emptyLeaderboard: Leaderboard = {
        ...mockLeaderboard,
        entries: [],
      };
      expect(areAllEvaluationsDone(emptyLeaderboard)).toBe(true);
    });
  });

  describe("Winner Contact Preparation", () => {
    it("should prepare contact message", () => {
      const contact = prepareWinnerContact(
        "agent-1",
        "task-123",
        87
      );
      expect(contact.winner_id).toBe("agent-1");
      expect(contact.task_id).toBe("task-123");
      expect(contact.subject).toContain("87");
    });

    it("should include initial message", () => {
      const contact = prepareWinnerContact(
        "agent-1",
        "task-123",
        87
      );
      expect(contact.initial_message).toBeTruthy();
      expect(contact.initial_message.length).toBeGreaterThan(0);
    });
  });

  describe("Task Closure", () => {
    it("should prepare closure data", () => {
      const result = getTaskResult(
        mockLeaderboard,
        30 * 60 * 1000,
        "$5,000"
      );
      const closure = prepareTaskClosure(result);
      expect(closure.task_id).toBe("task-123");
      expect(closure.winner_id).toBe("agent-1");
      expect(closure.status).toBe("closed");
    });

    it("should include closure timestamp", () => {
      const result = getTaskResult(
        mockLeaderboard,
        30 * 60 * 1000,
        "$5,000"
      );
      const closure = prepareTaskClosure(result);
      expect(closure.closed_at).toBeTruthy();
      const closedDate = new Date(closure.closed_at);
      expect(closedDate.getTime()).toBeCloseTo(Date.now(), -3); // Within ~1 second
    });
  });

  describe("Company Payout Calculation", () => {
    it("should calculate payout with default fee", () => {
      const payout = calculateCompanyPayout("$5,000");
      expect(payout.company_payout).toBe(4250); // 85% of 5000
      expect(payout.platform_fee).toBe(750); // 15% of 5000
    });

    it("should calculate payout with custom fee", () => {
      const payout = calculateCompanyPayout("$5,000", 20);
      expect(payout.company_payout).toBe(4000); // 80% of 5000
      expect(payout.platform_fee).toBe(1000); // 20% of 5000
    });

    it("should sum to original budget", () => {
      const payout = calculateCompanyPayout("$10,000");
      expect(payout.company_payout + payout.platform_fee).toBe(10000);
    });

    it("should handle budget strings with commas", () => {
      const payout = calculateCompanyPayout("$15,000");
      expect(payout.company_payout + payout.platform_fee).toBe(15000);
    });

    it("should handle zero fee", () => {
      const payout = calculateCompanyPayout("$5,000", 0);
      expect(payout.company_payout).toBe(5000);
      expect(payout.platform_fee).toBe(0);
    });
  });

  describe("Results Expiration", () => {
    it("should detect fresh results as not expired", () => {
      const now = new Date().toISOString();
      expect(isResultsExpired(now, 90 * 24 * 60 * 60 * 1000)).toBe(false);
    });

    it("should detect old results as expired", () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      expect(isResultsExpired(oldDate, 90 * 24 * 60 * 60 * 1000)).toBe(true);
    });

    it("should detect edge case (exactly at expiration)", () => {
      const almostExpired = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      // Within milliseconds, so checking not expired
      expect(isResultsExpired(almostExpired, 90 * 24 * 60 * 60 * 1000)).toBe(false);
    });

    it("should use custom max age", () => {
      const oneMonthOld = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
      expect(isResultsExpired(oneMonthOld, 30 * 24 * 60 * 60 * 1000)).toBe(true);
      expect(isResultsExpired(oneMonthOld, 60 * 24 * 60 * 60 * 1000)).toBe(false);
    });
  });
});
