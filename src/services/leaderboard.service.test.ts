import { describe, it, expect, vi, afterEach } from "vitest";
import {
  anonymizeAgent,
  sortLeaderboard,
  shouldRevealIdentities,
  type LeaderboardEntry,
} from "./leaderboard.service";

describe("leaderboard service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("anonymizeAgent", () => {
    it("generates sequential anonymous names", () => {
      expect(anonymizeAgent("agent-1", 0)).toBe("Agent 1");
      expect(anonymizeAgent("agent-2", 1)).toBe("Agent 2");
      expect(anonymizeAgent("agent-3", 2)).toBe("Agent 3");
    });

    it("is deterministic for the same index", () => {
      expect(anonymizeAgent("any-id", 4)).toBe("Agent 5");
      expect(anonymizeAgent("different-id", 4)).toBe("Agent 5");
    });
  });

  describe("sortLeaderboard", () => {
    it("sorts by score descending", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ finalScore: 70, submittedAt: "2024-01-01T00:00:00Z" }),
        makeEntry({ finalScore: 95, submittedAt: "2024-01-02T00:00:00Z" }),
        makeEntry({ finalScore: 82, submittedAt: "2024-01-03T00:00:00Z" }),
      ];

      const sorted = sortLeaderboard(entries);
      expect(sorted[0].finalScore).toBe(95);
      expect(sorted[1].finalScore).toBe(82);
      expect(sorted[2].finalScore).toBe(70);
    });

    it("assigns rank numbers", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ finalScore: 90 }),
        makeEntry({ finalScore: 80 }),
      ];

      const sorted = sortLeaderboard(entries);
      expect(sorted[0].rank).toBe(1);
      expect(sorted[1].rank).toBe(2);
    });

    it("breaks ties by earlier submission time", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ agentId: "late", finalScore: 90, submittedAt: "2024-01-02T00:00:00Z" }),
        makeEntry({ agentId: "early", finalScore: 90, submittedAt: "2024-01-01T00:00:00Z" }),
      ];

      const sorted = sortLeaderboard(entries);
      expect(sorted[0].agentId).toBe("early");
      expect(sorted[1].agentId).toBe("late");
    });

    it("handles empty array", () => {
      expect(sortLeaderboard([])).toEqual([]);
    });

    it("does not mutate original array", () => {
      const entries: LeaderboardEntry[] = [
        makeEntry({ finalScore: 50 }),
        makeEntry({ finalScore: 90 }),
      ];

      sortLeaderboard(entries);
      expect(entries[0].finalScore).toBe(50);
    });
  });

  describe("shouldRevealIdentities", () => {
    it("returns false before deadline", () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(shouldRevealIdentities(future)).toBe(false);
    });

    it("returns true after deadline", () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      expect(shouldRevealIdentities(past)).toBe(true);
    });

    it("returns true exactly at deadline", () => {
      vi.useFakeTimers();
      const now = new Date("2024-06-15T12:00:00Z");
      vi.setSystemTime(now);

      expect(shouldRevealIdentities("2024-06-15T12:00:00Z")).toBe(true);
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
    submissionId: "sub-default",
    submittedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}
