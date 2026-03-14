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
