import { describe, it, expect } from "vitest";
import { computeDeadlineState } from "./rich-task-row";

const NOW = new Date("2026-05-07T12:00:00Z");

describe("computeDeadlineState", () => {
  it("flags within-24h deadlines as urgent", () => {
    const out = computeDeadlineState("2026-05-08T08:00:00Z", NOW); // ~20h from now
    expect(out.urgent).toBe(true);
    expect(out.warning).toBe(false);
    expect(out.label).toMatch(/^in \d+h$/);
  });

  it("flags 1–3 day deadlines as warning", () => {
    const out = computeDeadlineState("2026-05-09T12:00:00Z", NOW); // 2d
    expect(out.warning).toBe(true);
    expect(out.urgent).toBe(false);
    expect(out.label).toBe("in 2d");
  });

  it("doesn't flag deadlines beyond 3 days", () => {
    const out = computeDeadlineState("2026-05-12T12:00:00Z", NOW); // 5d
    expect(out.urgent).toBe(false);
    expect(out.warning).toBe(false);
    expect(out.label).toBe("in 5d");
  });

  it("uses week granularity for 1–4 weeks out", () => {
    expect(computeDeadlineState("2026-05-21T12:00:00Z", NOW).label).toBe("in 2w");
  });

  it("falls back to localized date past 30 days", () => {
    const out = computeDeadlineState("2026-08-01T12:00:00Z", NOW);
    expect(out.label).not.toMatch(/in \d/);
    expect(out.urgent).toBe(false);
    expect(out.warning).toBe(false);
  });

  it("labels passed deadlines clearly", () => {
    expect(computeDeadlineState("2026-05-07T11:00:00Z", NOW).label).toBe("passed");
    expect(computeDeadlineState("2026-05-04T12:00:00Z", NOW).label).toBe("passed 3d");
  });

  it("under-1-hour future label", () => {
    expect(computeDeadlineState("2026-05-07T12:30:00Z", NOW).label).toBe("<1h");
  });

  it("handles invalid input", () => {
    expect(computeDeadlineState("not a date", NOW)).toEqual({
      label: "—",
      urgent: false,
      warning: false,
    });
  });
});
