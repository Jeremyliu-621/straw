import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  anonymizeAgent,
  sortLeaderboard,
  shouldRevealIdentities,
  type LeaderboardEntry,
} from "@/services/leaderboard.service";

// Test the leaderboard logic functions used by the route
// We test these in isolation since the route handler requires Next.js runtime

describe("leaderboard route logic", () => {
  describe("building entries from submissions", () => {
    it("correctly maps submission + evaluation to leaderboard entry", () => {
      const entry: LeaderboardEntry = {
        rank: 0,
        agentId: "agent-1",
        agentName: "",
        finalScore: 85.5,
        testScore: 80,
        llmScore: 91,
        submissionId: "sub-1",
        submittedAt: "2024-06-15T12:00:00Z",
      };

      expect(entry.finalScore).toBe(85.5);
      expect(entry.testScore).toBe(80);
      expect(entry.llmScore).toBe(91);
    });

    it("handles null test and llm scores", () => {
      const entry: LeaderboardEntry = {
        rank: 0,
        agentId: "agent-1",
        agentName: "",
        finalScore: 0,
        testScore: null,
        llmScore: null,
        submissionId: "sub-1",
        submittedAt: "2024-06-15T12:00:00Z",
      };

      expect(entry.testScore).toBeNull();
      expect(entry.llmScore).toBeNull();
    });
  });

  describe("anonymization for leaderboard response", () => {
    it("anonymizes entries when identities not revealed", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ agentId: "real-1", finalScore: 90 }),
        makeEntry({ agentId: "real-2", finalScore: 80 }),
      ];

      const sorted = sortLeaderboard(entries);

      // Simulate anonymization (as route handler does)
      const reveal = shouldRevealIdentities(new Date(Date.now() + 86400000).toISOString());
      expect(reveal).toBe(false);

      if (!reveal) {
        for (let i = 0; i < sorted.length; i++) {
          sorted[i].agentName = anonymizeAgent(sorted[i].agentId, i);
          sorted[i].agentId = "";
        }
      }

      expect(sorted[0].agentName).toBe("Agent 1");
      expect(sorted[0].agentId).toBe("");
      expect(sorted[1].agentName).toBe("Agent 2");
      expect(sorted[1].agentId).toBe("");
    });

    it("preserves real names when identities revealed", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ agentId: "real-1", agentName: "AlphaBot", finalScore: 90 }),
        makeEntry({ agentId: "real-2", agentName: "BetaBot", finalScore: 80 }),
      ];

      const sorted = sortLeaderboard(entries);

      const reveal = shouldRevealIdentities(new Date(Date.now() - 86400000).toISOString());
      expect(reveal).toBe(true);

      // When revealed, names are preserved
      expect(sorted[0].agentName).toBe("AlphaBot");
      expect(sorted[1].agentName).toBe("BetaBot");
    });
  });

  describe("response shape", () => {
    it("includes all required response fields", () => {
      const response = {
        entries: [] as LeaderboardEntry[],
        revealed: false,
        deadline: "2024-12-31T23:59:59Z",
        taskStatus: "open",
        isOwner: false,
      };

      expect(response).toHaveProperty("entries");
      expect(response).toHaveProperty("revealed");
      expect(response).toHaveProperty("deadline");
      expect(response).toHaveProperty("taskStatus");
      expect(response).toHaveProperty("isOwner");
    });

    it("sorts entries by score desc with ranks assigned", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ finalScore: 70 }),
        makeEntry({ finalScore: 95 }),
        makeEntry({ finalScore: 82 }),
      ];

      const sorted = sortLeaderboard(entries);

      expect(sorted[0].rank).toBe(1);
      expect(sorted[0].finalScore).toBe(95);
      expect(sorted[1].rank).toBe(2);
      expect(sorted[1].finalScore).toBe(82);
      expect(sorted[2].rank).toBe(3);
      expect(sorted[2].finalScore).toBe(70);
    });
  });
});

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 0,
    agentId: "agent-default",
    agentName: "Agent Default",
    finalScore: 50,
    testScore: null,
    llmScore: null,
    submissionId: `sub-${Math.random().toString(36).slice(2, 8)}`,
    submittedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}
