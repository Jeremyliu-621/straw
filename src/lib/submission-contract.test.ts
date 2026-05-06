import { describe, it, expect } from "vitest";
import {
  validateSubmissionAgainstContract,
  submissionContractSchema,
  type SubmissionContract,
} from "@/lib/submission-contract";

// Test helper — the contract validator now operates on decoded Buffers (so it
// can size binary uploads correctly). Tests still write fixture content as
// strings for readability; this wraps them at the boundary.
function toBuffers(files: Record<string, string>): Record<string, Buffer> {
  const out: Record<string, Buffer> = {};
  for (const [name, content] of Object.entries(files)) {
    out[name] = Buffer.from(content, "utf8");
  }
  return out;
}

describe("submissionContractSchema", () => {
  it("parses a full contract", () => {
    const result = submissionContractSchema.parse({
      required_files: [
        { path: "SUBMISSION.md", description: "Executive summary", max_size_kb: 50 },
        { path: "ARCHITECTURE.md" },
      ],
      required_patterns: [
        { glob: "src/**/*.ts", description: "Source code", min_files: 1 },
      ],
      optional_files: [
        { path: "DEMO.md", description: "Demo instructions" },
      ],
      max_total_size_mb: 100,
    });

    expect(result.required_files).toHaveLength(2);
    expect(result.required_patterns[0].min_files).toBe(1);
    expect(result.max_total_size_mb).toBe(100);
  });

  it("applies defaults for omitted fields", () => {
    const result = submissionContractSchema.parse({});

    expect(result.required_files).toEqual([]);
    expect(result.required_patterns).toEqual([]);
    expect(result.optional_files).toEqual([]);
    expect(result.max_total_size_mb).toBe(200);
  });

  it("rejects max_total_size_mb below floor", () => {
    expect(() => submissionContractSchema.parse({ max_total_size_mb: 5 })).toThrow();
  });

  it("rejects max_total_size_mb above ceiling", () => {
    expect(() => submissionContractSchema.parse({ max_total_size_mb: 999 })).toThrow();
  });
});

describe("validateSubmissionAgainstContract", () => {
  const baseContract: SubmissionContract = {
    required_files: [
      { path: "SUBMISSION.md", description: "Executive summary" },
      { path: "ARCHITECTURE.md", description: "Technical design" },
    ],
    required_patterns: [],
    optional_files: [],
    max_total_size_mb: 200,
  };

  it("passes when all required files are present", () => {
    const files = {
      "SUBMISSION.md": "# My submission",
      "ARCHITECTURE.md": "# Design",
      "main.py": "print('hello')",
    };

    const result = validateSubmissionAgainstContract(toBuffers(files), baseContract);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when a required file is missing", () => {
    const files = {
      "SUBMISSION.md": "# My submission",
      "main.py": "print('hello')",
    };

    const result = validateSubmissionAgainstContract(toBuffers(files), baseContract);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("ARCHITECTURE.md");
    expect(result.errors[0]).toContain("Technical design");
  });

  it("fails when multiple required files are missing", () => {
    const files = { "main.py": "print('hello')" };

    const result = validateSubmissionAgainstContract(toBuffers(files), baseContract);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("fails when a file exceeds its per-file size limit", () => {
    const contract: SubmissionContract = {
      required_files: [
        { path: "SUBMISSION.md", max_size_kb: 1 }, // 1KB limit
      ],
      required_patterns: [],
      optional_files: [],
      max_total_size_mb: 200,
    };

    const files = {
      "SUBMISSION.md": "x".repeat(2048), // 2KB
    };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("exceeds size limit");
  });

  it("passes when file is within per-file size limit", () => {
    const contract: SubmissionContract = {
      required_files: [
        { path: "SUBMISSION.md", max_size_kb: 10 },
      ],
      required_patterns: [],
      optional_files: [],
      max_total_size_mb: 200,
    };

    const files = { "SUBMISSION.md": "short" };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(true);
  });

  it("validates required patterns with min_files", () => {
    const contract: SubmissionContract = {
      required_files: [],
      required_patterns: [
        { glob: "src/**/*.ts", description: "Source code", min_files: 3 },
      ],
      optional_files: [],
      max_total_size_mb: 200,
    };

    const files = {
      "src/index.ts": "export {}",
      "src/app.ts": "export {}",
      // only 2, need 3
    };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("requires at least 3");
    expect(result.errors[0]).toContain("found 2");
  });

  it("passes when pattern has enough matching files", () => {
    const contract: SubmissionContract = {
      required_files: [],
      required_patterns: [
        { glob: "**/*.py", min_files: 2 },
      ],
      optional_files: [],
      max_total_size_mb: 200,
    };

    const files = {
      "main.py": "print(1)",
      "utils/helper.py": "def foo(): pass",
      "README.md": "# Project",
    };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(true);
  });

  it("fails when total size exceeds contract limit", () => {
    const contract: SubmissionContract = {
      required_files: [],
      required_patterns: [],
      optional_files: [],
      max_total_size_mb: 10, // 10MB limit
    };

    // Create a file just over the limit
    const bigContent = "x".repeat(11 * 1024 * 1024);
    const files = { "big.bin": bigContent };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("exceeds limit");
  });

  it("reports all errors at once", () => {
    const contract: SubmissionContract = {
      required_files: [
        { path: "SUBMISSION.md" },
        { path: "TESTING.md" },
      ],
      required_patterns: [
        { glob: "src/**/*.ts", min_files: 1 },
      ],
      optional_files: [],
      max_total_size_mb: 200,
    };

    const files = { "README.md": "# Hi" };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3); // 2 missing files + 1 pattern
  });

  it("ignores optional files", () => {
    const contract: SubmissionContract = {
      required_files: [{ path: "main.py" }],
      required_patterns: [],
      optional_files: [{ path: "DEMO.md" }],
      max_total_size_mb: 200,
    };

    const files = { "main.py": "print(1)" };

    const result = validateSubmissionAgainstContract(toBuffers(files), contract);
    expect(result.valid).toBe(true);
  });
});
