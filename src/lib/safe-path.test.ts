import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";
import { isSafeFilename, resolveInside, isWithin } from "./safe-path";

describe("isSafeFilename", () => {
  it("accepts plain filenames", () => {
    expect(isSafeFilename("agent_output")).toBe(true);
    expect(isSafeFilename("score.json")).toBe(true);
    expect(isSafeFilename("SUBMISSION.md")).toBe(true);
    expect(isSafeFilename("file-with-dashes.txt")).toBe(true);
    expect(isSafeFilename("file.with.dots.ext")).toBe(true);
  });

  it("rejects empty and non-string", () => {
    expect(isSafeFilename("")).toBe(false);
    // @ts-expect-error testing runtime guard
    expect(isSafeFilename(undefined)).toBe(false);
    // @ts-expect-error testing runtime guard
    expect(isSafeFilename(null)).toBe(false);
  });

  it("rejects dot segments", () => {
    expect(isSafeFilename(".")).toBe(false);
    expect(isSafeFilename("..")).toBe(false);
  });

  it("rejects names with separators (traversal sequences)", () => {
    expect(isSafeFilename("../etc/passwd")).toBe(false);
    expect(isSafeFilename("..\\windows\\system32")).toBe(false);
    expect(isSafeFilename("subdir/file")).toBe(false);
    expect(isSafeFilename("subdir\\file")).toBe(false);
    expect(isSafeFilename("/absolute/path")).toBe(false);
    expect(isSafeFilename("\\absolute\\path")).toBe(false);
  });

  it("rejects null-byte injection", () => {
    expect(isSafeFilename("safe.txt\0evil.sh")).toBe(false);
  });
});

describe("resolveInside", () => {
  const base = os.tmpdir();

  it("returns a path inside the base for safe names", () => {
    const out = resolveInside(base, "file.txt");
    expect(out).toBe(path.join(path.resolve(base), "file.txt"));
  });

  it("throws for unsafe names", () => {
    expect(() => resolveInside(base, "../escape.txt")).toThrow(/Unsafe filename/);
    expect(() => resolveInside(base, "sub/file")).toThrow(/Unsafe filename/);
    expect(() => resolveInside(base, "")).toThrow(/Unsafe filename/);
  });
});

describe("isWithin", () => {
  it("true for same path", () => {
    expect(isWithin("/tmp", "/tmp")).toBe(true);
  });

  it("true for descendants", () => {
    expect(isWithin("/tmp", "/tmp/sub/file")).toBe(true);
  });

  it("false for siblings with shared prefix", () => {
    // Regression for the classic bug where a naive startsWith says
    // "/tmp/evil" is inside "/tmp/e".
    expect(isWithin("/tmp/e", "/tmp/evil")).toBe(false);
  });

  it("false for unrelated paths", () => {
    expect(isWithin("/tmp", "/etc/passwd")).toBe(false);
  });
});
