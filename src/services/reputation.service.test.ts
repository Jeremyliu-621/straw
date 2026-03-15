import { describe, it, expect } from "vitest";
import {
  calculateWinRate,
  calculateAverageScore,
  deriveCategories,
} from "./reputation.service";

describe("reputation service", () => {
  describe("calculateWinRate", () => {
    it("calculates correct percentage", () => {
      expect(calculateWinRate(3, 10)).toBe(30);
    });

    it("returns 0 when no entries", () => {
      expect(calculateWinRate(0, 0)).toBe(0);
    });

    it("returns 100 for all wins", () => {
      expect(calculateWinRate(5, 5)).toBe(100);
    });

    it("rounds to nearest integer", () => {
      expect(calculateWinRate(1, 3)).toBe(33);
    });

    it("handles single entry win", () => {
      expect(calculateWinRate(1, 1)).toBe(100);
    });

    it("handles single entry loss", () => {
      expect(calculateWinRate(0, 1)).toBe(0);
    });
  });

  describe("calculateAverageScore", () => {
    it("calculates correct average", () => {
      expect(calculateAverageScore([80, 90, 70])).toBe(80);
    });

    it("returns 0 for empty array", () => {
      expect(calculateAverageScore([])).toBe(0);
    });

    it("rounds to one decimal", () => {
      expect(calculateAverageScore([85, 90, 88])).toBe(87.7);
    });

    it("handles single score", () => {
      expect(calculateAverageScore([95.5])).toBe(95.5);
    });

    it("handles zero scores", () => {
      expect(calculateAverageScore([0, 0, 0])).toBe(0);
    });

    it("handles perfect scores", () => {
      expect(calculateAverageScore([100, 100])).toBe(100);
    });
  });

  describe("deriveCategories", () => {
    it("sorts by wins first", () => {
      const history = [
        { category: "code", won: true },
        { category: "code", won: true },
        { category: "data", won: true },
        { category: "data", won: false },
        { category: "data", won: false },
      ];

      const cats = deriveCategories(history);
      expect(cats[0]).toBe("code");
      expect(cats[1]).toBe("data");
    });

    it("breaks ties by entry count", () => {
      const history = [
        { category: "code", won: true },
        { category: "data", won: true },
        { category: "data", won: false },
      ];

      const cats = deriveCategories(history);
      expect(cats[0]).toBe("data"); // 1 win, 2 entries
      expect(cats[1]).toBe("code"); // 1 win, 1 entry
    });

    it("returns empty for no history", () => {
      expect(deriveCategories([])).toEqual([]);
    });

    it("includes categories with no wins", () => {
      const history = [
        { category: "code", won: false },
        { category: "data", won: true },
      ];

      const cats = deriveCategories(history);
      expect(cats).toContain("code");
      expect(cats).toContain("data");
    });

    it("deduplicates categories", () => {
      const history = [
        { category: "code", won: true },
        { category: "code", won: false },
        { category: "code", won: true },
      ];

      expect(deriveCategories(history)).toEqual(["code"]);
    });
  });
});
