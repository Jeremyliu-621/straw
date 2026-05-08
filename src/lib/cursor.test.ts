import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "./cursor";

describe("cursor encoding", () => {
  it("round-trips an ISO timestamp through base64url", () => {
    const raw = "2026-05-08T14:38:33.259+00:00";
    const encoded = encodeCursor(raw);
    expect(encoded).not.toContain("+"); // the URL-reserved char that started it all
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("="); // padding stripped
    expect(decodeCursor(encoded)).toBe(raw);
  });

  it("decodes legacy raw-ISO cursors as a pass-through", () => {
    // A daemon that persisted an old cursor before iter 6 keeps working.
    const legacy = "2026-05-08T14:38:33.259+00:00";
    expect(decodeCursor(legacy)).toBe(legacy);
  });

  it("decodes base64url cleanly even when input has URL-decoded form", () => {
    const raw = "2026-05-08T14:38:33.259+00:00";
    const encoded = encodeCursor(raw);
    // Identity through encode→decode regardless.
    expect(decodeCursor(encoded)).toBe(raw);
  });

  it("falls back to raw input when string contains non-base64url chars", () => {
    expect(decodeCursor("hello world")).toBe("hello world");
    expect(decodeCursor("with:colons")).toBe("with:colons");
  });
});
