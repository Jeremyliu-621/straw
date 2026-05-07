import { describe, it, expect } from "vitest";
import { computeSparkline } from "./sparkline-points";

const baseOpts = { width: 120, height: 32 };

describe("computeSparkline", () => {
  it("returns hasShape=false for empty input", () => {
    const out = computeSparkline([], baseOpts);
    expect(out.hasShape).toBe(false);
    expect(out.points).toBe("");
    expect(out.areaPath).toBe("");
  });

  it("returns hasShape=false for a single point", () => {
    expect(computeSparkline([42], baseOpts).hasShape).toBe(false);
  });

  it("renders a non-empty points string for a normal series", () => {
    const out = computeSparkline([1, 2, 3, 4, 5], baseOpts);
    expect(out.hasShape).toBe(true);
    expect(out.points.split(" ")).toHaveLength(5);
    expect(out.trendDirection).toBe("up");
  });

  it("detects down-trending series", () => {
    const out = computeSparkline([10, 8, 6, 4, 2], baseOpts);
    expect(out.trendDirection).toBe("down");
  });

  it("flat-lines an all-equal series at the vertical midpoint", () => {
    const out = computeSparkline([5, 5, 5, 5], { width: 100, height: 20 });
    expect(out.trendDirection).toBe("flat");
    // Middle of inner area (height=20, padding=1) → y ≈ 10
    const ys = out.points.split(" ").map((p) => Number(p.split(",")[1]));
    for (const y of ys) {
      expect(y).toBeCloseTo(10, 1);
    }
  });

  it("respects maxPoints by taking the most recent", () => {
    // 20 points, maxPoints=5 → only the last 5 should be reflected.
    const data = Array.from({ length: 20 }, (_, i) => i);
    const out = computeSparkline(data, { ...baseOpts, maxPoints: 5 });
    const xs = out.points.split(" ").map((p) => Number(p.split(",")[0]));
    expect(xs).toHaveLength(5);
    // Spans the full inner width (padding=1, width=120 → inner 118, 4 steps of 29.5).
    expect(xs[0]).toBeCloseTo(1, 1);
    expect(xs[xs.length - 1]).toBeCloseTo(119, 1);
  });

  it("scales y to the data window, not absolute zero", () => {
    // Series 100..104 — should NOT compress to a flat line just because
    // 100 is far from 0. The window auto-fits [100, 104].
    const out = computeSparkline([100, 101, 102, 103, 104], baseOpts);
    const ys = out.points.split(" ").map((p) => Number(p.split(",")[1]));
    expect(ys[0]).not.toBeCloseTo(ys[ys.length - 1], 1);
    expect(out.trendDirection).toBe("up");
  });

  it("handles negative values", () => {
    const out = computeSparkline([-5, -3, -1, 1, 3], baseOpts);
    expect(out.hasShape).toBe(true);
    expect(out.trendDirection).toBe("up");
    expect(out.points).toMatch(/^[-\d.,\s]+$/);
  });

  it("areaPath closes back to baseline", () => {
    const out = computeSparkline([1, 5, 3, 7, 2], baseOpts);
    expect(out.areaPath).toMatch(/^M /);
    expect(out.areaPath).toMatch(/Z$/);
    // Should reference the baseline (height - padding = 31) twice — start and end
    expect(out.areaPath.includes("31")).toBe(true);
  });

  it("respects custom padding", () => {
    const out = computeSparkline([1, 2, 3, 4], { ...baseOpts, padding: 4 });
    const xs = out.points.split(" ").map((p) => Number(p.split(",")[0]));
    expect(xs[0]).toBeCloseTo(4, 1);
    expect(xs[xs.length - 1]).toBeCloseTo(116, 1);
  });

  it("handles defaults sensibly when maxPoints not provided", () => {
    // 20 points, no maxPoints → defaults to 14 → keeps last 14
    const data = Array.from({ length: 20 }, (_, i) => i);
    const out = computeSparkline(data, baseOpts);
    expect(out.points.split(" ")).toHaveLength(14);
  });
});
