import { describe, it, expect } from "vitest";
import { formatBytes } from "./workspace-usage";

describe("formatBytes", () => {
  it("formats 0 explicitly", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes without a unit", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats KB to one decimal", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats MB to one decimal", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(3.2 * 1024 * 1024)).toBe("3.2 MB");
  });

  it("formats GB to one decimal", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });

  it("returns '—' for invalid input", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-5)).toBe("—");
    expect(formatBytes(Infinity)).toBe("—");
  });
});
