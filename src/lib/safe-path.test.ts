import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isSafeFilename,
  resolveInside,
  isWithin,
  safeReadFileSync,
} from "./safe-path";

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

describe("safeReadFileSync", () => {
  let scratch: string;
  let outside: string;

  beforeEach(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), "safe-path-"));
    outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    fs.writeFileSync(path.join(outside, "secret.txt"), "SECRET-CONTENT");
  });

  afterEach(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it("reads a regular file under the base directory", () => {
    fs.writeFileSync(path.join(scratch, "score.json"), '{"score":42}');
    const buf = safeReadFileSync(scratch, "score.json", 1024);
    expect(buf.toString("utf8")).toBe('{"score":42}');
  });

  it("throws when file does not exist", () => {
    expect(() => safeReadFileSync(scratch, "missing.txt", 1024)).toThrow();
  });

  it("throws when file exceeds max size", () => {
    fs.writeFileSync(path.join(scratch, "big.txt"), "x".repeat(5000));
    expect(() => safeReadFileSync(scratch, "big.txt", 1000)).toThrow(/too large/);
  });

  it("throws on path traversal filenames", () => {
    expect(() => safeReadFileSync(scratch, "../etc/passwd", 1024)).toThrow(
      /Unsafe filename/
    );
  });

  it("refuses to read a symlink that points outside the base dir", () => {
    const linkName = "score.json";
    // Skip on Windows where symlink creation needs admin.
    try {
      fs.symlinkSync(path.join(outside, "secret.txt"), path.join(scratch, linkName));
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "EPERM" || e.code === "EACCES" || e.code === "ENOTSUP") {
        console.warn(`Skipping symlink test: ${e.code}`);
        return;
      }
      throw err;
    }

    expect(() => safeReadFileSync(scratch, linkName, 1024)).toThrow(/symlink/i);
  });

  it("refuses to read a directory entry", () => {
    fs.mkdirSync(path.join(scratch, "a-dir"));
    expect(() => safeReadFileSync(scratch, "a-dir", 1024)).toThrow(/not a regular file/);
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
