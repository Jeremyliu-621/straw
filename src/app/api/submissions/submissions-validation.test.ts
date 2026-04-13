import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

/**
 * Re-declare the upload-only submission schema from route.ts for isolated testing.
 */
const createSubmissionSchema = z.object({
  task_id: z.string().uuid(),
  agent_display_name: z.string().min(1).max(100).optional(),
});

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createSubmissionSchema (upload-only)", () => {
  it("accepts valid submission with task_id only", () => {
    const result = createSubmissionSchema.safeParse({ task_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("accepts submission with agent display name", () => {
    const result = createSubmissionSchema.safeParse({
      task_id: VALID_UUID,
      agent_display_name: "my-solver-v2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agent_display_name).toBe("my-solver-v2");
    }
  });

  it("rejects non-UUID task_id", () => {
    const result = createSubmissionSchema.safeParse({ task_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing task_id", () => {
    const result = createSubmissionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects display name over 100 chars", () => {
    const result = createSubmissionSchema.safeParse({
      task_id: VALID_UUID,
      agent_display_name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty display name", () => {
    const result = createSubmissionSchema.safeParse({
      task_id: VALID_UUID,
      agent_display_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts without display name (optional)", () => {
    const result = createSubmissionSchema.safeParse({ task_id: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agent_display_name).toBeUndefined();
    }
  });

  it("ignores unknown fields (mode, api_endpoint, docker_image)", () => {
    const result = createSubmissionSchema.safeParse({
      task_id: VALID_UUID,
      mode: "api",
      api_endpoint: "https://test.com",
      docker_image: "test:latest",
    });
    // Zod strips unknown fields by default
    expect(result.success).toBe(true);
  });
});

describe("extractSubmissionMd", () => {
  // Re-declare the extraction function for testing
  function extractSubmissionMd(agentOutput: string): { submissionMd: string; otherOutput: string } {
    const marker = "--- SUBMISSION.md ---\n";
    const idx = agentOutput.indexOf(marker);
    if (idx === -1) return { submissionMd: "", otherOutput: agentOutput };

    const afterMarker = agentOutput.slice(idx + marker.length);
    const endIdx = afterMarker.indexOf("\n\n---");
    const submissionMd = endIdx === -1 ? afterMarker : afterMarker.slice(0, endIdx);
    const otherOutput = agentOutput.slice(0, idx) + (endIdx === -1 ? "" : afterMarker.slice(endIdx));

    return { submissionMd: submissionMd.trim(), otherOutput: otherOutput.trim() };
  }

  it("extracts SUBMISSION.md from combined output", () => {
    const output = `--- SUBMISSION.md ---
# What I Built
A REST API

--- result.json ---
{"status": "ok"}`;

    const { submissionMd, otherOutput } = extractSubmissionMd(output);
    expect(submissionMd).toContain("What I Built");
    expect(otherOutput).toContain("result.json");
  });

  it("returns empty submissionMd when not present", () => {
    const output = "--- result.txt ---\nhello world";
    const { submissionMd, otherOutput } = extractSubmissionMd(output);
    expect(submissionMd).toBe("");
    expect(otherOutput).toBe(output);
  });

  it("handles SUBMISSION.md as the only file", () => {
    const output = "--- SUBMISSION.md ---\n# What I Built\nEverything.";
    const { submissionMd } = extractSubmissionMd(output);
    expect(submissionMd).toContain("Everything");
  });

  it("handles empty output", () => {
    const { submissionMd, otherOutput } = extractSubmissionMd("");
    expect(submissionMd).toBe("");
    expect(otherOutput).toBe("");
  });
});

describe("eval constraint validation", () => {
  const constraintSchema = z.object({
    eval_network: z.boolean().optional().default(false),
    eval_memory_mb: z.number().int().min(512).max(4096).optional().default(1024),
    eval_timeout_seconds: z.number().int().min(600).max(3600).optional().default(600),
  });

  it("accepts defaults", () => {
    const result = constraintSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eval_network).toBe(false);
      expect(result.data.eval_memory_mb).toBe(1024);
      expect(result.data.eval_timeout_seconds).toBe(600);
    }
  });

  it("accepts network enabled", () => {
    const result = constraintSchema.safeParse({ eval_network: true });
    expect(result.success).toBe(true);
  });

  it("accepts 4GB memory", () => {
    const result = constraintSchema.safeParse({ eval_memory_mb: 4096 });
    expect(result.success).toBe(true);
  });

  it("accepts 1 hour timeout", () => {
    const result = constraintSchema.safeParse({ eval_timeout_seconds: 3600 });
    expect(result.success).toBe(true);
  });

  it("rejects memory below 512MB", () => {
    const result = constraintSchema.safeParse({ eval_memory_mb: 256 });
    expect(result.success).toBe(false);
  });

  it("rejects memory above 4096MB", () => {
    const result = constraintSchema.safeParse({ eval_memory_mb: 8192 });
    expect(result.success).toBe(false);
  });

  it("rejects timeout below 10 minutes", () => {
    const result = constraintSchema.safeParse({ eval_timeout_seconds: 300 });
    expect(result.success).toBe(false);
  });

  it("rejects timeout above 1 hour", () => {
    const result = constraintSchema.safeParse({ eval_timeout_seconds: 7200 });
    expect(result.success).toBe(false);
  });
});
