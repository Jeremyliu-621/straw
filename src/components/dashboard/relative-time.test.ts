import { describe, it, expect } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = new Date("2026-05-07T12:00:00Z");

describe("relativeTime", () => {
  it("returns 'just now' for sub-minute differences", () => {
    expect(relativeTime("2026-05-07T11:59:30Z", NOW)).toBe("just now");
  });

  it("formats minutes", () => {
    expect(relativeTime("2026-05-07T11:55:00Z", NOW)).toBe("5m ago");
    expect(relativeTime("2026-05-07T11:01:00Z", NOW)).toBe("59m ago");
  });

  it("formats hours", () => {
    expect(relativeTime("2026-05-07T09:00:00Z", NOW)).toBe("3h ago");
    expect(relativeTime("2026-05-06T13:00:00Z", NOW)).toBe("23h ago");
  });

  it("formats days", () => {
    expect(relativeTime("2026-05-04T12:00:00Z", NOW)).toBe("3d ago");
    expect(relativeTime("2026-05-01T12:00:00Z", NOW)).toBe("6d ago");
  });

  it("formats weeks", () => {
    expect(relativeTime("2026-04-30T12:00:00Z", NOW)).toBe("1w ago");
    expect(relativeTime("2026-04-16T12:00:00Z", NOW)).toBe("3w ago");
  });

  it("formats months", () => {
    expect(relativeTime("2026-03-07T12:00:00Z", NOW)).toBe("2mo ago");
    expect(relativeTime("2025-09-07T12:00:00Z", NOW)).toBe("8mo ago");
  });

  it("formats years", () => {
    expect(relativeTime("2024-05-07T12:00:00Z", NOW)).toBe("2y ago");
  });

  it("formats future times with 'in ' prefix", () => {
    expect(relativeTime("2026-05-07T12:05:00Z", NOW)).toBe("in 5m");
    expect(relativeTime("2026-05-08T12:00:00Z", NOW)).toBe("in 1d");
    expect(relativeTime("2026-05-10T12:00:00Z", NOW)).toBe("in 3d");
  });

  it("handles invalid input", () => {
    expect(relativeTime("not a date", NOW)).toBe("—");
    expect(relativeTime("", NOW)).toBe("—");
  });

  it("accepts a Date object", () => {
    expect(relativeTime(new Date("2026-05-07T11:00:00Z"), NOW)).toBe("1h ago");
  });
});
