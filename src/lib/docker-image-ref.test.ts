import { describe, it, expect } from "vitest";
import { validateImageReference, imageUsesDigest } from "./docker-image-ref";

describe("validateImageReference", () => {
  const cases: Array<[string, boolean]> = [
    // ok
    ["alpine", true],
    ["alpine:3.19", true],
    ["library/alpine", true],
    ["myorg/my-image:latest", true],
    ["ghcr.io/myorg/my-image:sha-abc123", true],
    ["registry.example.com:5000/org/image:v1.2.3", true],
    ["myorg/my-image@sha256:" + "a".repeat(64), true],
    // not ok
    ["", false],
    ["alpine with space", false],
    ["alpine;rm -rf /", false],
    ["alpine$(whoami)", false],
    ["alpine`id`", false],
    ["alpine|cat", false],
    ["alpine&cat", false],
    ["alpine<file", false],
    ["alpine>file", false],
    ["alpine(paren)", false],
    ["alpine{brace}", false],
    ["alpine\\backslash", false],
    ["alpine\x00null", false],
    ["alpine" + "x".repeat(520), false],
  ];

  for (const [ref, expected] of cases) {
    it(`${expected ? "accepts" : "rejects"}: ${JSON.stringify(ref.length > 60 ? ref.slice(0, 40) + "…" : ref)}`, () => {
      const result = validateImageReference(ref);
      if (expected) {
        expect(result).toBeNull();
      } else {
        expect(typeof result).toBe("string");
      }
    });
  }

  it("rejects non-strings", () => {
    // @ts-expect-error runtime guard
    expect(validateImageReference(undefined)).not.toBeNull();
    // @ts-expect-error runtime guard
    expect(validateImageReference(123)).not.toBeNull();
  });
});

describe("imageUsesDigest", () => {
  it("detects @sha256:HEX pins", () => {
    expect(imageUsesDigest("org/img@sha256:" + "a".repeat(64))).toBe(true);
    expect(imageUsesDigest("registry.example.com/org/img@sha256:" + "0".repeat(64))).toBe(true);
  });

  it("rejects short or wrong-length hex", () => {
    expect(imageUsesDigest("org/img@sha256:" + "a".repeat(63))).toBe(false);
    expect(imageUsesDigest("org/img@sha256:" + "a".repeat(65))).toBe(false);
  });

  it("returns false for tag-only refs", () => {
    expect(imageUsesDigest("alpine")).toBe(false);
    expect(imageUsesDigest("alpine:3.19")).toBe(false);
    expect(imageUsesDigest("alpine:latest")).toBe(false);
  });

  it("rejects other hash algorithms", () => {
    expect(imageUsesDigest("org/img@sha512:" + "a".repeat(128))).toBe(false);
    expect(imageUsesDigest("org/img@md5:" + "a".repeat(32))).toBe(false);
  });
});
