import { describe, it, expect } from "vitest";
import { redactInternalPaths } from "./redact";

describe("redactInternalPaths", () => {
  it("leaves plain messages unchanged", () => {
    expect(redactInternalPaths("eval container exited with code 1")).toBe(
      "eval container exited with code 1"
    );
    expect(redactInternalPaths("")).toBe("");
  });

  it("scrubs eval tmpdir paths", () => {
    const input =
      "Refusing to read /tmp/map-eval-abc-123/results/score.json: not a regular file (type=symlink)";
    const out = redactInternalPaths(input);
    expect(out).not.toContain("/tmp/map-eval");
    expect(out).toContain("<path>");
    expect(out).toContain("not a regular file");
  });

  it("scrubs build tmpdir paths", () => {
    const input = "pip install failed in /tmp/map-build-sub-abc/requirements.txt";
    const out = redactInternalPaths(input);
    expect(out).not.toContain("/tmp/map-build");
    expect(out).toContain("<path>");
  });

  it("scrubs generic /tmp/ paths", () => {
    const out = redactInternalPaths("cannot stat /tmp/foo-bar-baz/score.json");
    expect(out).not.toContain("/tmp/foo-bar-baz");
    expect(out).toContain("<path>");
  });

  it("scrubs Windows temp paths", () => {
    const input =
      "Error at C:\\Users\\jerem\\AppData\\Local\\Temp\\map-eval-xyz\\score.json";
    const out = redactInternalPaths(input);
    expect(out).not.toContain("map-eval");
    expect(out).not.toContain("AppData");
    expect(out).toContain("<path>");
  });

  it("redacts multiple occurrences in one message", () => {
    const input =
      "Could not read /tmp/map-eval-1/score.json nor /tmp/map-eval-2/score.json";
    const out = redactInternalPaths(input);
    const matches = out.match(/<path>/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(out).not.toMatch(/map-eval-[12]/);
  });

  it("handles non-string input without crashing", () => {
    // @ts-expect-error runtime guard
    expect(redactInternalPaths(42)).toBe(42);
    // @ts-expect-error runtime guard
    expect(redactInternalPaths(undefined)).toBeUndefined();
    // @ts-expect-error runtime guard
    expect(redactInternalPaths(null)).toBeNull();
  });

  it("does not scrub user-visible filenames or submission IDs", () => {
    // SUBMISSION.md and agent filenames shouldn't be redacted.
    const msg =
      "Your submission is missing SUBMISSION.md (uploaded as submission.md).";
    expect(redactInternalPaths(msg)).toBe(msg);
  });

  it("preserves messages that reference /api/ paths (HTTP URIs, not filesystem)", () => {
    const msg = "POST /api/v1/submissions/abc failed with 409";
    expect(redactInternalPaths(msg)).toBe(msg);
  });
});
