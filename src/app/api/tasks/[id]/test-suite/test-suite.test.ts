import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

// ── Re-declare the schemas from route.ts for isolated testing ──

const testCaseSchema = z.object({
  name: z.string().min(1, "Test case name is required"),
  input: z.string(),
  expected_output: z.string().min(1, "Expected output is required"),
  match_type: z.enum(["exact", "contains", "regex"]),
});

const testSuiteSchema = z.object({
  test_cases: z
    .array(testCaseSchema)
    .min(1, "Test suite must have at least one test case"),
});

// ── Storage path convention ────────────────────────────────────

function buildStoragePath(taskId: string): string {
  return `tasks/${taskId}/suite.json`;
}

describe("test suite schema validation", () => {
  describe("valid suites", () => {
    it("accepts a minimal valid suite", () => {
      const suite = {
        test_cases: [
          {
            name: "basic test",
            input: "some input",
            expected_output: "expected result",
            match_type: "exact",
          },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(true);
    });

    it("accepts all match types", () => {
      const matchTypes = ["exact", "contains", "regex"] as const;
      for (const mt of matchTypes) {
        const suite = {
          test_cases: [
            {
              name: "test",
              input: "input",
              expected_output: "output",
              match_type: mt,
            },
          ],
        };
        expect(testSuiteSchema.safeParse(suite).success).toBe(true);
      }
    });

    it("accepts multiple test cases", () => {
      const suite = {
        test_cases: [
          { name: "test 1", input: "a", expected_output: "b", match_type: "exact" },
          { name: "test 2", input: "c", expected_output: "d", match_type: "contains" },
          { name: "test 3", input: "e", expected_output: "\\d+", match_type: "regex" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(true);
    });

    it("accepts empty input field", () => {
      // input is intentionally allowed to be empty (some tasks don't vary input per test)
      const suite = {
        test_cases: [
          { name: "test", input: "", expected_output: "result", match_type: "contains" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(true);
    });
  });

  describe("invalid suites", () => {
    it("rejects empty test_cases array", () => {
      const suite = { test_cases: [] };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects missing test_cases key", () => {
      const suite = { cases: [] };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects unknown match_type", () => {
      const suite = {
        test_cases: [
          { name: "t", input: "i", expected_output: "o", match_type: "fuzzy" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects missing name", () => {
      const suite = {
        test_cases: [
          { input: "i", expected_output: "o", match_type: "exact" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects empty name", () => {
      const suite = {
        test_cases: [
          { name: "", input: "i", expected_output: "o", match_type: "exact" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects empty expected_output", () => {
      const suite = {
        test_cases: [
          { name: "t", input: "i", expected_output: "", match_type: "exact" },
        ],
      };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });

    it("rejects non-array test_cases", () => {
      const suite = { test_cases: "not an array" };
      expect(testSuiteSchema.safeParse(suite).success).toBe(false);
    });
  });
});

describe("storage path convention", () => {
  it("uses tasks/{id}/suite.json path", () => {
    const path = buildStoragePath("abc-123");
    expect(path).toBe("tasks/abc-123/suite.json");
  });

  it("path includes task ID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const path = buildStoragePath(id);
    expect(path).toContain(id);
  });

  it("path starts with tasks/", () => {
    expect(buildStoragePath("any-id")).toMatch(/^tasks\//);
  });

  it("path ends with suite.json", () => {
    expect(buildStoragePath("any-id")).toMatch(/\/suite\.json$/);
  });
});

describe("fallback behavior when test suite missing", () => {
  // Mirror the evaluation worker's fallback: if no test_suite_url, skip tests and return 0
  function shouldSkipAutomatedTests(testSuiteUrl: string | null | undefined): boolean {
    return !testSuiteUrl;
  }

  it("skips tests when test_suite_url is null", () => {
    expect(shouldSkipAutomatedTests(null)).toBe(true);
  });

  it("skips tests when test_suite_url is undefined", () => {
    expect(shouldSkipAutomatedTests(undefined)).toBe(true);
  });

  it("skips tests when test_suite_url is empty string", () => {
    expect(shouldSkipAutomatedTests("")).toBe(true);
  });

  it("runs tests when test_suite_url is present", () => {
    expect(shouldSkipAutomatedTests("tasks/abc/suite.json")).toBe(false);
  });
});
