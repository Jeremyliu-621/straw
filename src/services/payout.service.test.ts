import { describe, it, expect } from "vitest";
import { calculateAgentPayoutCents } from "./payout.service";

describe("calculateAgentPayoutCents", () => {
  it("deducts the platform fee at the standard 5% rate", () => {
    // $50,000 → 5% fee → $47,500 → 4_750_000 cents
    expect(calculateAgentPayoutCents(5_000_000)).toBe(4_750_000);
  });

  it("handles small amounts with rounding", () => {
    // $1.00 → 5% fee = $0.05 → $0.95
    expect(calculateAgentPayoutCents(100)).toBe(95);
    // $0.10 → 5% fee = $0.005 → rounds to 1c → $0.09
    expect(calculateAgentPayoutCents(10)).toBe(9);
  });

  it("respects an explicit fee override", () => {
    // Custom $1,000 fee on a $50,000 deal.
    expect(calculateAgentPayoutCents(5_000_000, 100_000)).toBe(4_900_000);
  });

  it("never returns negative", () => {
    // Pathological: fee bigger than gross.
    expect(calculateAgentPayoutCents(1000, 5000)).toBe(0);
  });

  it("returns 0 for zero gross", () => {
    expect(calculateAgentPayoutCents(0)).toBe(0);
  });
});
