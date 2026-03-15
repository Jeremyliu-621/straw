import { describe, it, expect } from "vitest";
import {
  calculateSuccessFee,
  generateThreadId,
  formatScore,
  formatCurrency,
} from "./results.service";
import { PLATFORM_SUCCESS_FEE_PERCENT } from "@/constants";

describe("results service", () => {
  describe("calculateSuccessFee", () => {
    it("calculates correct percentage", () => {
      // $10,000 deal at 5% = $500
      expect(calculateSuccessFee(1_000_000)).toBe(50_000);
    });

    it("rounds to nearest cent", () => {
      // $33.33 at 5% = $1.67 (rounded)
      expect(calculateSuccessFee(3_333)).toBe(167);
    });

    it("handles zero value", () => {
      expect(calculateSuccessFee(0)).toBe(0);
    });

    it("handles small values", () => {
      // $1.00 at 5% = $0.05 = 5 cents
      expect(calculateSuccessFee(100)).toBe(PLATFORM_SUCCESS_FEE_PERCENT);
    });

    it("handles large values", () => {
      // $1,000,000 at 5% = $50,000
      expect(calculateSuccessFee(100_000_000)).toBe(5_000_000);
    });
  });

  describe("generateThreadId", () => {
    it("produces deterministic IDs regardless of user order", () => {
      const id1 = generateThreadId("user-a", "user-b", "task-1");
      const id2 = generateThreadId("user-b", "user-a", "task-1");
      expect(id1).toBe(id2);
    });

    it("produces different IDs for different tasks", () => {
      const id1 = generateThreadId("user-a", "user-b", "task-1");
      const id2 = generateThreadId("user-a", "user-b", "task-2");
      expect(id1).not.toBe(id2);
    });

    it("produces different IDs for different users", () => {
      const id1 = generateThreadId("user-a", "user-b", "task-1");
      const id2 = generateThreadId("user-a", "user-c", "task-1");
      expect(id1).not.toBe(id2);
    });

    it("includes thread prefix", () => {
      const id = generateThreadId("user-a", "user-b", "task-1");
      expect(id).toMatch(/^thread_/);
    });
  });

  describe("formatScore", () => {
    it("formats with one decimal place", () => {
      expect(formatScore(87.4)).toBe("87.4");
    });

    it("adds decimal to whole numbers", () => {
      expect(formatScore(100)).toBe("100.0");
    });

    it("rounds to one decimal", () => {
      expect(formatScore(85.67)).toBe("85.7");
    });

    it("handles zero", () => {
      expect(formatScore(0)).toBe("0.0");
    });
  });

  describe("formatCurrency", () => {
    it("formats cents to dollars", () => {
      expect(formatCurrency(10_000)).toBe("$100");
    });

    it("formats large amounts with commas", () => {
      expect(formatCurrency(1_000_000_00)).toBe("$1,000,000");
    });

    it("handles zero", () => {
      expect(formatCurrency(0)).toBe("$0");
    });
  });
});
