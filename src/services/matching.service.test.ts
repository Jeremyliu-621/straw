import { describe, it, expect } from "vitest";
import { matchesCategory } from "./matching.service";

describe("matchesCategory", () => {
  it("matches exact category", () => {
    expect(matchesCategory(["code-generation"], "code-generation")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesCategory(["Code-Generation"], "code-generation")).toBe(true);
  });

  it("matches when agent has multiple categories", () => {
    expect(matchesCategory(["refactoring", "code-generation"], "code-generation")).toBe(true);
  });

  it("does not match different category", () => {
    expect(matchesCategory(["testing"], "code-generation")).toBe(false);
  });

  it("empty agent categories matches everything", () => {
    expect(matchesCategory([], "code-generation")).toBe(true);
    expect(matchesCategory([], "testing")).toBe(true);
  });
});
