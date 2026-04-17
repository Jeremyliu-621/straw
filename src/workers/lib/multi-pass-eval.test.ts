import { describe, it, expect, vi } from "vitest";
import { multiPassLlmEval, type FileIndexEntry, type RubricCriterion } from "./multi-pass-eval";
import type { SubmissionContract } from "@/lib/submission-contract";

// ── Test Fixtures ──────────────────────────────────────────

const mockTask = {
  id: "task-1",
  title: "Build a REST API",
  description: "Build a REST API that handles CRUD for users",
  input_spec: "JSON requests",
  output_spec: "JSON responses",
};

const mockCriteria: RubricCriterion[] = [
  { id: "c1", name: "Correctness", description: "Does it work?", weight: 60 },
  { id: "c2", name: "Code Quality", description: "Clean, readable code", weight: 40 },
];

const mockContract: SubmissionContract = {
  required_files: [
    { path: "SUBMISSION.md", description: "Executive summary" },
    { path: "ARCHITECTURE.md", description: "Design decisions" },
  ],
  required_patterns: [{ glob: "src/**/*.ts", min_files: 1 }],
  optional_files: [],
  max_total_size_mb: 200,
};

const mockFileIndex: FileIndexEntry[] = [
  { name: "SUBMISSION.md", sizeBytes: 2000 },
  { name: "ARCHITECTURE.md", sizeBytes: 1500 },
  { name: "src/index.ts", sizeBytes: 3000 },
  { name: "src/routes/users.ts", sizeBytes: 5000 },
];

const mockFiles: Record<string, string> = {
  "SUBMISSION.md": "# My Submission\nI built a REST API with Express.\nSee `src/routes/users.ts` for the main logic.",
  "ARCHITECTURE.md": "# Architecture\nExpress + TypeScript. Routes in src/routes/.",
  "src/index.ts": "import express from 'express';\nconst app = express();\napp.listen(3000);",
  "src/routes/users.ts": "export function getUsers() { return [{id: 1}]; }",
};

function mockFetchFile(filename: string): Promise<string | null> {
  return Promise.resolve(mockFiles[filename] ?? null);
}

// ── Tests ──────────────────────────────────────────────────

describe("multiPassLlmEval", () => {
  it("returns null when no doc files can be fetched", async () => {
    const emptyFetcher = () => Promise.resolve(null);

    const result = await multiPassLlmEval({
      task: mockTask,
      criteria: mockCriteria,
      submissionContract: mockContract,
      fileIndex: mockFileIndex,
      fetchFile: emptyFetcher,
      llm: { call: vi.fn().mockResolvedValue(null) },
    });

    expect(result).toBeNull();
  });

  it("returns null when Pass 1 fails", async () => {
    const llm = { call: vi.fn().mockResolvedValue(null) };

    const result = await multiPassLlmEval({
      task: mockTask,
      criteria: mockCriteria,
      submissionContract: mockContract,
      fileIndex: mockFileIndex,
      fetchFile: mockFetchFile,
      llm,
    });

    expect(result).toBeNull();
    // Pass 1 retries 3 times
    expect(llm.call).toHaveBeenCalledTimes(3);
  });

  it("completes all three passes with valid LLM responses", async () => {
    const pass1Response = {
      thesis_score: 85,
      thesis_reasoning: "Good documentation with clear structure",
      file_references: ["src/routes/users.ts"],
      claims: ["Built REST API with Express", "Handles CRUD for users"],
    };

    const pass2Response = {
      code_score: 78,
      code_reasoning: "Code is functional but basic",
      claim_verification: [
        { claim: "Built REST API with Express", verified: true, evidence: "Express imported in index.ts" },
        { claim: "Handles CRUD for users", verified: false, evidence: "Only getUsers implemented, no create/update/delete" },
      ],
    };

    const pass3Response = {
      dimensions: [
        { criterion_name: "Correctness", score: 70, reasoning: "Only GET implemented, missing CUD operations" },
        { criterion_name: "Code Quality", score: 80, reasoning: "Clean code but minimal structure" },
      ],
      overall_reasoning: "Solid start but incomplete CRUD coverage.",
    };

    let callCount = 0;
    const llm = {
      call: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(pass1Response);
        if (callCount === 2) return Promise.resolve(pass2Response);
        if (callCount === 3) return Promise.resolve(pass3Response);
        return Promise.resolve(null);
      }),
    };

    const result = await multiPassLlmEval({
      task: mockTask,
      criteria: mockCriteria,
      submissionContract: mockContract,
      fileIndex: mockFileIndex,
      fetchFile: mockFetchFile,
      buildResult: "Build check: SUCCESS",
      llm,
    });

    expect(result).not.toBeNull();
    expect(result!.dimensions).toHaveLength(2);
    expect(result!.dimensions[0].criterion_name).toBe("Correctness");
    expect(result!.dimensions[0].score).toBe(70);
    expect(result!.dimensions[1].criterion_name).toBe("Code Quality");
    expect(result!.dimensions[1].score).toBe(80);
    expect(result!.overall_reasoning).toContain("incomplete");
    expect(result!.pass_data.pass1.thesis_score).toBe(85);
    expect(result!.pass_data.pass1.file_references).toContain("src/routes/users.ts");
    expect(result!.pass_data.pass2.code_score).toBe(78);
    expect(result!.pass_data.pass2.claim_verification).toHaveLength(2);
    expect(result!.pass_data.pass2.files_reviewed).toContain("src/routes/users.ts");
    expect(llm.call).toHaveBeenCalledTimes(3);
  });

  it("returns null when Pass 2 fails (Pass 1 succeeds)", async () => {
    const pass1Response = {
      thesis_score: 80,
      thesis_reasoning: "Good docs",
      file_references: ["src/index.ts"],
      claims: ["Works well"],
    };

    let callCount = 0;
    const llm = {
      call: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(pass1Response);
        return Promise.resolve(null); // Pass 2 + 3 fail
      }),
    };

    const result = await multiPassLlmEval({
      task: mockTask,
      criteria: mockCriteria,
      submissionContract: mockContract,
      fileIndex: mockFileIndex,
      fetchFile: mockFetchFile,
      llm,
    });

    expect(result).toBeNull();
  });

  it("truncates large files at 20K chars", async () => {
    const bigContent = "x".repeat(25000);
    const bigFetcher = (name: string) => {
      if (name === "SUBMISSION.md") return Promise.resolve(bigContent);
      return Promise.resolve(mockFiles[name] ?? null);
    };

    const pass1Response = {
      thesis_score: 50,
      thesis_reasoning: "Truncated but readable",
      file_references: [],
      claims: [],
    };
    const pass2Response = {
      code_score: 50,
      code_reasoning: "No code referenced",
      claim_verification: [],
    };
    const pass3Response = {
      dimensions: [
        { criterion_name: "Correctness", score: 50, reasoning: "Average" },
        { criterion_name: "Code Quality", score: 50, reasoning: "Average" },
      ],
      overall_reasoning: "Average submission",
    };

    let callCount = 0;
    const llm = {
      call: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(pass1Response);
        if (callCount === 2) return Promise.resolve(pass2Response);
        if (callCount === 3) return Promise.resolve(pass3Response);
        return Promise.resolve(null);
      }),
    };

    const result = await multiPassLlmEval({
      task: mockTask,
      criteria: mockCriteria,
      submissionContract: mockContract,
      fileIndex: mockFileIndex,
      fetchFile: bigFetcher,
      llm,
    });

    expect(result).not.toBeNull();
    // Verify the prompt sent to Pass 1 contained truncation notice
    const firstCallPrompt = llm.call.mock.calls[0][0] as string;
    expect(firstCallPrompt).toContain("[File truncated at 20000 chars");
  });
});
