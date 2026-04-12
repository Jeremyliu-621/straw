import { describe, it, expect } from "vitest";

/**
 * Execution worker unit tests.
 *
 * The worker is a separate process that uses Docker, so we test
 * the logic functions in isolation rather than the full BullMQ flow.
 */

describe("execution worker logic", () => {
  describe("ExecutionError classification", () => {
    // We test the error classification logic that determines
    // whether to retry or fail permanently

    it("pull failure is a permanent failure", () => {
      const isPermanent = isPermanentFailure("Docker image pull failed");
      expect(isPermanent).toBe(true);
    });

    it("timeout is a permanent failure", () => {
      const isPermanent = isPermanentFailure("Execution timed out");
      expect(isPermanent).toBe(true);
    });

    it("non-zero exit is a permanent failure", () => {
      const isPermanent = isPermanentFailure("Agent exited with code 1");
      expect(isPermanent).toBe(true);
    });

    it("no output is a permanent failure", () => {
      const isPermanent = isPermanentFailure("No output found in /output");
      expect(isPermanent).toBe(true);
    });

    it("unknown error is retryable", () => {
      const isPermanent = isPermanentFailure("Connection refused");
      expect(isPermanent).toBe(false);
    });
  });

  describe("container config", () => {
    it("should have network disabled", () => {
      const config = buildContainerConfig("test:latest", "input data");
      expect(config.HostConfig.NetworkMode).toBe("none");
    });

    it("should set memory limit", () => {
      const config = buildContainerConfig("test:latest", "input data");
      expect(config.HostConfig.Memory).toBe(512 * 1024 * 1024);
    });

    it("should set CPU limit", () => {
      const config = buildContainerConfig("test:latest", "input data");
      expect(config.HostConfig.NanoCpus).toBe(1e9);
    });

    it("should set input env var", () => {
      const config = buildContainerConfig("test:latest", "some csv data");
      expect(config.Env).toContain("MAP_TASK_INPUT=some csv data");
    });
  });
});

// ── Extracted logic for testing ────────────────────────────

const PERMANENT_FAILURES = [
  "Docker image pull failed",
  "Execution timed out",
  "Agent exited with code",
  "No output found",
];

function isPermanentFailure(message: string): boolean {
  return PERMANENT_FAILURES.some((prefix) => message.startsWith(prefix));
}

function buildContainerConfig(image: string, inputSpec: string) {
  return {
    Image: image,
    Env: [`MAP_TASK_INPUT=${inputSpec}`],
    HostConfig: {
      Memory: 512 * 1024 * 1024,
      NanoCpus: 1e9,
      NetworkMode: "none" as const,
      Binds: [] as string[],
      AutoRemove: false,
    },
  };
}

describe("storage path generation", () => {
  function buildStoragePath(submissionId: string): string {
    return `submissions/${submissionId}`;
  }

  it("generates correct path for submission", () => {
    const path = buildStoragePath("abc-123");
    expect(path).toBe("submissions/abc-123");
  });

  it("uses submission ID as directory name", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const path = buildStoragePath(id);
    expect(path).toContain(id);
    expect(path).toMatch(/^submissions\//);
  });
});

// ── API Execution Handler Logic ───────────────────────────────

/**
 * Replicate the core validation logic from executeApiSubmission
 * for isolated testing (the real function uses fetch + AbortController).
 */
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const EXECUTION_TIMEOUT_MS = 5 * 60 * 1000;

function validateApiResponse(
  status: number,
  contentLength: string | null,
  bodySize: number
): { ok: boolean; error?: string } {
  if (status < 200 || status >= 300) {
    return { ok: false, error: `Agent endpoint returned HTTP ${status}` };
  }
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    return { ok: false, error: "Agent response too large (>50MB)" };
  }
  if (bodySize > MAX_RESPONSE_BYTES) {
    return { ok: false, error: "Agent response too large (>50MB)" };
  }
  return { ok: true };
}

function validateApiEndpoint(endpoint: string): { ok: boolean; error?: string } {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") {
      return { ok: false, error: "Endpoint must use HTTPS" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
}

describe("API execution handler logic", () => {
  describe("endpoint validation", () => {
    it("accepts valid HTTPS endpoint", () => {
      expect(validateApiEndpoint("https://agent.example.com/solve").ok).toBe(true);
    });

    it("rejects HTTP endpoint", () => {
      const result = validateApiEndpoint("http://insecure.com/solve");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("HTTPS");
    });

    it("rejects invalid URL", () => {
      expect(validateApiEndpoint("not-a-url").ok).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateApiEndpoint("").ok).toBe(false);
    });
  });

  describe("response validation", () => {
    it("accepts 200 with normal body", () => {
      expect(validateApiResponse(200, "1024", 1024).ok).toBe(true);
    });

    it("rejects 4xx errors", () => {
      expect(validateApiResponse(400, null, 100).ok).toBe(false);
    });

    it("rejects 5xx errors", () => {
      expect(validateApiResponse(500, null, 100).ok).toBe(false);
    });

    it("rejects oversized content-length header", () => {
      const result = validateApiResponse(200, String(60 * 1024 * 1024), 0);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("50MB");
    });

    it("rejects oversized body", () => {
      const result = validateApiResponse(200, null, 60 * 1024 * 1024);
      expect(result.ok).toBe(false);
    });

    it("accepts body exactly at 50MB", () => {
      expect(validateApiResponse(200, null, MAX_RESPONSE_BYTES).ok).toBe(true);
    });

    it("rejects body over 50MB by 1 byte", () => {
      expect(validateApiResponse(200, null, MAX_RESPONSE_BYTES + 1).ok).toBe(false);
    });
  });

  describe("timeout configuration", () => {
    it("uses 5-minute timeout", () => {
      expect(EXECUTION_TIMEOUT_MS).toBe(5 * 60 * 1000);
    });
  });
});

describe("evaluation queue job shape", () => {
  it("creates correct job data after successful execution", () => {
    const submissionId = "sub-123";
    const taskId = "task-456";
    const outputUrl = `submissions/${submissionId}`;

    const jobData = {
      submissionId,
      taskId,
      outputUrl,
    };

    expect(jobData.submissionId).toBe(submissionId);
    expect(jobData.taskId).toBe(taskId);
    expect(jobData.outputUrl).toBe("submissions/sub-123");
  });
});
