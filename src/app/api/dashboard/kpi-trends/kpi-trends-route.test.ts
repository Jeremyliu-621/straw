import { describe, it, expect } from "vitest";
import { bucketCount, bucketSum, bucketAverage } from "@/lib/bucket-trend";

const NOW = new Date("2026-05-07T12:00:00Z");

describe("bucketCount", () => {
  it("returns series of length `days` with zeros when no data", () => {
    const out = bucketCount([], 14, NOW);
    expect(out.series).toHaveLength(14);
    expect(out.series.every((v) => v === 0)).toBe(true);
    expect(out.delta.direction).toBe("flat");
  });

  it("buckets one event per day correctly", () => {
    const days = 7;
    // Generate one event per day for the last 7 days
    const ts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(NOW.getTime() - i * 24 * 60 * 60 * 1000);
      return d.toISOString();
    });
    const out = bucketCount(ts, days, NOW);
    expect(out.series).toHaveLength(7);
    // Each of the last 7 days should have exactly 1 event.
    expect(out.series.every((v) => v === 1)).toBe(true);
  });

  it("places older events into the prior window (and out of series)", () => {
    const days = 7;
    // Event 10 days ago — should land in prior window, not in `series`.
    const oldTs = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const out = bucketCount([oldTs], days, NOW);
    expect(out.series.every((v) => v === 0)).toBe(true);
    // Prior window had one event, current zero → direction = "down"
    expect(out.delta.direction).toBe("down");
  });

  it("flags up direction when current period exceeds prior", () => {
    const days = 7;
    const recent = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(NOW.getTime() - i * 24 * 60 * 60 * 1000);
      return d.toISOString();
    });
    const out = bucketCount(recent, days, NOW);
    expect(out.delta.direction).toBe("up");
    expect(out.delta.value).toBe(100); // 0 prior → 5 current = "infinite"-rendered as 100
  });

  it("ignores invalid timestamps", () => {
    const out = bucketCount(["not a date", "garbage"], 7, NOW);
    expect(out.series.every((v) => v === 0)).toBe(true);
    expect(out.delta.direction).toBe("flat");
  });
});

describe("bucketSum", () => {
  it("sums values per day", () => {
    const days = 7;
    const ts = NOW.toISOString();
    const out = bucketSum(
      [
        { ts, value: 10 },
        { ts, value: 5 },
      ],
      days,
      NOW
    );
    // Today's bucket = 15
    expect(out.series[out.series.length - 1]).toBe(15);
  });
});

describe("bucketAverage", () => {
  it("averages values per day, ignoring empty days", () => {
    const days = 7;
    const today = NOW.toISOString();
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const out = bucketAverage(
      [
        { ts: today, value: 90 },
        { ts: today, value: 80 },
        { ts: yesterday, value: 60 },
      ],
      days,
      NOW
    );

    // Today's bucket = avg(90, 80) = 85
    expect(out.series[out.series.length - 1]).toBe(85);
    // Yesterday's bucket = avg(60) = 60
    expect(out.series[out.series.length - 2]).toBe(60);
    // Other days flat at 0 (empty in avg mode renders as 0 in the bucket value
    // but is excluded from the delta calculation).
    expect(out.series[0]).toBe(0);
  });
});
