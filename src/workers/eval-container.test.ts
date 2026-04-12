import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod/v4";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * Eval container unit tests.
 *
 * The evaluation worker is a standalone process with module-level side effects
 * (Dockerode, Supabase, Redis clients), so we replicate the testable logic
 * here and test it in isolation — same pattern as evaluation-worker.test.ts
 * and execution-worker.test.ts.
 *
 * Tested areas:
 *   1. scoreJsonSchema Zod validation
 *   2. Docker image reference regex from validate-eval route
 *   3. runEvalContainer logic with mocked Dockerode
 *   4. downloadAgentOutputToDir logic with mocked Supabase storage
 */

// ── 1. scoreJsonSchema — exact copy from evaluation-worker.ts ────

const scoreJsonSchema = z.object({
  score: z.number().min(0).max(100),
  pass: z.boolean(),
  breakdown: z.record(z.string(), z.number()).optional(),
  notes: z.string().optional(),
});

type ScoreJson = z.infer<typeof scoreJsonSchema>;

describe("scoreJsonSchema validation", () => {
  it("accepts a full valid score.json with all fields", () => {
    const input = {
      score: 85,
      pass: true,
      breakdown: { correctness: 90 },
      notes: "good",
    };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(85);
      expect(result.data.pass).toBe(true);
      expect(result.data.breakdown).toEqual({ correctness: 90 });
      expect(result.data.notes).toBe("good");
    }
  });

  it("accepts minimal valid score.json with only required fields", () => {
    const input = { score: 0, pass: false };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(0);
      expect(result.data.pass).toBe(false);
      expect(result.data.breakdown).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("accepts score at upper boundary (100)", () => {
    const input = { score: 100, pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects score greater than 100", () => {
    const input = { score: 101, pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects score less than 0", () => {
    const input = { score: -1, pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing pass field", () => {
    const input = { score: 50 };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects score as a string", () => {
    const input = { score: "85", pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects pass as a string", () => {
    const input = { score: 50, pass: "true" };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts breakdown with multiple keys", () => {
    const input = {
      score: 75,
      pass: true,
      breakdown: { correctness: 80, style: 70, performance: 75 },
    };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts empty breakdown object", () => {
    const input = { score: 50, pass: true, breakdown: {} };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects breakdown with non-number values", () => {
    const input = { score: 50, pass: true, breakdown: { correctness: "high" } };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts fractional scores", () => {
    const input = { score: 72.5, pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing score field entirely", () => {
    const input = { pass: true };
    const result = scoreJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ── 2. Docker image reference regex — from validate-eval route ───

// Exact copy from src/app/api/tasks/validate-eval/route.ts
const DOCKER_IMAGE_RE =
  /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?::\d{1,5})?)\/)?((?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*)(?::([a-zA-Z0-9._-]+))?(?:@sha256:[a-fA-F0-9]{64})?$/;

describe("Docker image reference validation", () => {
  // Valid references
  it("accepts org/repo:tag format", () => {
    expect(DOCKER_IMAGE_RE.test("myorg/myrepo:latest")).toBe(true);
  });

  it("accepts repo:tag without org", () => {
    expect(DOCKER_IMAGE_RE.test("myrepo:v1.2.3")).toBe(true);
  });

  it("accepts full registry/org/repo:tag format", () => {
    expect(DOCKER_IMAGE_RE.test("ghcr.io/myorg/myrepo:sha-abc123")).toBe(true);
  });

  it("accepts repo without tag", () => {
    expect(DOCKER_IMAGE_RE.test("ubuntu")).toBe(true);
  });

  it("accepts registry with port", () => {
    expect(DOCKER_IMAGE_RE.test("localhost:5000/myrepo:latest")).toBe(true);
  });

  it("accepts image with sha256 digest", () => {
    const digest = "a".repeat(64);
    expect(DOCKER_IMAGE_RE.test(`myrepo@sha256:${digest}`)).toBe(true);
  });

  it("accepts deeply nested path", () => {
    expect(DOCKER_IMAGE_RE.test("ghcr.io/myorg/sub/repo:v1")).toBe(true);
  });

  // Invalid references
  it("rejects image with spaces in name", () => {
    expect(DOCKER_IMAGE_RE.test("my repo:latest")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(DOCKER_IMAGE_RE.test("")).toBe(false);
  });

  it("rejects image with uppercase in repo path", () => {
    // Docker repo names must be lowercase
    expect(DOCKER_IMAGE_RE.test("MyRepo:latest")).toBe(false);
  });

  it("rejects image reference that is just a colon", () => {
    expect(DOCKER_IMAGE_RE.test(":")).toBe(false);
  });

  it("rejects image reference starting with a slash", () => {
    expect(DOCKER_IMAGE_RE.test("/myrepo:latest")).toBe(false);
  });
});

// ── 3. runEvalContainer logic with mocked Dockerode ──────────────

/**
 * EvalContainerError — exact copy from evaluation-worker.ts
 */
class EvalContainerError extends Error {
  constructor(
    message: string,
    public exitCode?: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "EvalContainerError";
  }
}

// Constants matching the worker
const EVAL_CONTAINER_TIMEOUT_MS = 10 * 60 * 1000;
const EVAL_CONTAINER_MEMORY_LIMIT = 1024 * 1024 * 1024;
const EVAL_CONTAINER_CPU_LIMIT = 2e9;
const EVAL_CONTAINER_OUTPUT_PATH = "/results";
const EVAL_CONTAINER_INPUT_PATH = "/agent_output";
const EVAL_SCORE_JSON_FILENAME = "score.json";

/**
 * Replicated runEvalContainer logic from evaluation-worker.ts.
 * Accepts injected docker client and filesystem functions so we can mock them.
 */
async function runEvalContainer(
  evalImage: string,
  agentOutputPath: string,
  resultsPath: string,
  deps: {
    docker: {
      createContainer: (opts: Record<string, unknown>) => Promise<MockContainer>;
      pull: (image: string, cb: (err: Error | null, stream: NodeJS.ReadableStream) => void) => void;
      modem: { followProgress: (stream: NodeJS.ReadableStream, cb: (err: Error | null) => void) => void };
    };
    fsExistsSync: (p: string) => boolean;
    fsReadFileSync: (p: string, enc: string) => string;
    fsMkdirSync: (p: string, opts: { recursive: boolean }) => void;
  }
): Promise<ScoreJson & { exitCode: number }> {
  deps.fsMkdirSync(resultsPath, { recursive: true });

  // Pull image
  try {
    await new Promise<void>((resolve, reject) => {
      deps.docker.pull(evalImage, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        deps.docker.modem.followProgress(stream, (followErr: Error | null) => {
          if (followErr) return reject(followErr);
          resolve();
        });
      });
    });
  } catch (err) {
    throw new EvalContainerError(
      `Failed to pull eval image ${evalImage}: ${(err as Error).message}`,
      undefined,
      err
    );
  }

  // Create container
  const container = await deps.docker.createContainer({
    Image: evalImage,
    HostConfig: {
      Memory: EVAL_CONTAINER_MEMORY_LIMIT,
      NanoCpus: EVAL_CONTAINER_CPU_LIMIT,
      NetworkMode: "none",
      Binds: [
        `${agentOutputPath}:${EVAL_CONTAINER_INPUT_PATH}:ro`,
        `${resultsPath}:${EVAL_CONTAINER_OUTPUT_PATH}`,
      ],
      AutoRemove: false,
    },
  });

  await container.start();

  // Wait with timeout
  let exitCode: number;
  try {
    exitCode = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try { await container.kill({ signal: "SIGKILL" }); } catch { /* best effort */ }
        reject(new EvalContainerError("Eval container timed out", undefined));
      }, EVAL_CONTAINER_TIMEOUT_MS);

      container
        .wait()
        .then((result: { StatusCode: number }) => {
          clearTimeout(timeout);
          resolve(result.StatusCode);
        })
        .catch((err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  } catch (err) {
    try { await container.remove({ force: true }); } catch { /* best effort */ }
    if (err instanceof EvalContainerError) throw err;
    throw new EvalContainerError(
      `Eval container wait failed: ${(err as Error).message}`,
      undefined,
      err
    );
  }

  // Cleanup
  try { await container.remove({ force: true }); } catch { /* best effort */ }

  if (exitCode !== 0) {
    throw new EvalContainerError(
      `Eval container exited with code ${exitCode}`,
      exitCode
    );
  }

  // Read and validate score.json
  const scoreJsonPath = path.join(resultsPath, EVAL_SCORE_JSON_FILENAME);
  if (!deps.fsExistsSync(scoreJsonPath)) {
    throw new EvalContainerError(
      `Eval container did not produce ${EVAL_SCORE_JSON_FILENAME}`,
      exitCode
    );
  }

  let parsed: unknown;
  try {
    const raw = deps.fsReadFileSync(scoreJsonPath, "utf8");
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new EvalContainerError(
      `Failed to parse ${EVAL_SCORE_JSON_FILENAME}: ${(err as Error).message}`,
      exitCode
    );
  }

  const validated = scoreJsonSchema.safeParse(parsed);
  if (!validated.success) {
    throw new EvalContainerError(
      `Invalid ${EVAL_SCORE_JSON_FILENAME}: ${z.prettifyError(validated.error)}`,
      exitCode
    );
  }

  const { score, pass, breakdown, notes } = validated.data;
  return { score, pass, breakdown, notes, exitCode };
}

// ── Mock container type ──────────────────────────────────────────

interface MockContainer {
  start: () => Promise<void>;
  wait: () => Promise<{ StatusCode: number }>;
  kill: (opts: { signal: string }) => Promise<void>;
  remove: (opts: { force: boolean }) => Promise<void>;
}

function createMockContainer(exitCode: number): MockContainer {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue({ StatusCode: exitCode }),
    kill: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDocker(container: MockContainer) {
  return {
    createContainer: vi.fn().mockResolvedValue(container),
    pull: vi.fn((_image: string, cb: (err: Error | null, stream: NodeJS.ReadableStream) => void) => {
      // Simulate a readable stream object
      const fakeStream = {} as NodeJS.ReadableStream;
      cb(null, fakeStream);
    }),
    modem: {
      followProgress: vi.fn((_stream: NodeJS.ReadableStream, cb: (err: Error | null) => void) => {
        cb(null);
      }),
    },
  };
}

function createMockFs(scoreJson: ScoreJson | null) {
  return {
    fsExistsSync: vi.fn().mockReturnValue(scoreJson !== null),
    fsReadFileSync: vi.fn().mockReturnValue(
      scoreJson !== null ? JSON.stringify(scoreJson) : ""
    ),
    fsMkdirSync: vi.fn(),
  };
}

describe("runEvalContainer integration", () => {
  const evalImage = "company/eval-runner:v1";
  const agentOutputPath = "/tmp/agent_output";
  const resultsPath = "/tmp/results";

  it("returns score data when container exits 0 with valid score.json", async () => {
    const scoreData: ScoreJson = {
      score: 85,
      pass: true,
      breakdown: { correctness: 90, style: 80 },
      notes: "Well done",
    };
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    const mockFs = createMockFs(scoreData);

    const result = await runEvalContainer(evalImage, agentOutputPath, resultsPath, {
      docker,
      ...mockFs,
    });

    expect(result.score).toBe(85);
    expect(result.pass).toBe(true);
    expect(result.breakdown).toEqual({ correctness: 90, style: 80 });
    expect(result.notes).toBe("Well done");
    expect(result.exitCode).toBe(0);

    // Verify container was created with correct config
    expect(docker.createContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        Image: evalImage,
        HostConfig: expect.objectContaining({
          Memory: EVAL_CONTAINER_MEMORY_LIMIT,
          NanoCpus: EVAL_CONTAINER_CPU_LIMIT,
          NetworkMode: "none",
        }),
      })
    );

    // Verify container lifecycle
    expect(container.start).toHaveBeenCalled();
    expect(container.wait).toHaveBeenCalled();
    expect(container.remove).toHaveBeenCalled();
  });

  it("throws EvalContainerError when container exits 0 but no score.json", async () => {
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    const mockFs = createMockFs(null); // score.json does not exist

    await expect(
      runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      })
    ).rejects.toThrow(EvalContainerError);

    await expect(
      runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      })
    ).rejects.toThrow(/did not produce score\.json/);
  });

  it("throws EvalContainerError with exit code when container exits non-zero", async () => {
    const container = createMockContainer(1);
    const docker = createMockDocker(container);
    const mockFs = createMockFs(null);

    try {
      await runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EvalContainerError);
      const evalErr = err as EvalContainerError;
      expect(evalErr.exitCode).toBe(1);
      expect(evalErr.message).toContain("exited with code 1");
    }
  });

  it("throws EvalContainerError on timeout (wait never resolves)", async () => {
    // Create a container whose wait() never resolves
    const container: MockContainer = {
      start: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockReturnValue(new Promise(() => {
        // Intentionally never resolves to simulate timeout
      })),
      kill: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const docker = createMockDocker(container);
    const mockFs = createMockFs(null);

    // Override the timeout constant for this test to avoid waiting 10 minutes.
    // We replicate the wait-with-timeout logic inline with a short timeout.
    const shortTimeoutMs = 50;

    // Directly test the timeout mechanism
    const timeoutPromise = new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try { await container.kill({ signal: "SIGKILL" }); } catch { /* best effort */ }
        reject(new EvalContainerError("Eval container timed out", undefined));
      }, shortTimeoutMs);

      container
        .wait()
        .then((result: { StatusCode: number }) => {
          clearTimeout(timeout);
          resolve(result.StatusCode);
        })
        .catch((err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
    });

    await expect(timeoutPromise).rejects.toThrow(EvalContainerError);
    await expect(
      // Re-create for the message check
      new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(async () => {
          reject(new EvalContainerError("Eval container timed out", undefined));
        }, shortTimeoutMs);
        container.wait().then((r: { StatusCode: number }) => {
          clearTimeout(timeout);
          resolve(r.StatusCode);
        }).catch((e: Error) => {
          clearTimeout(timeout);
          reject(e);
        });
      })
    ).rejects.toThrow(/timed out/);
  });

  it("throws EvalContainerError when docker pull fails", async () => {
    const container = createMockContainer(0);
    const docker = {
      createContainer: vi.fn().mockResolvedValue(container),
      pull: vi.fn((_image: string, cb: (err: Error | null, stream: NodeJS.ReadableStream) => void) => {
        cb(new Error("unauthorized: authentication required"), null as unknown as NodeJS.ReadableStream);
      }),
      modem: {
        followProgress: vi.fn(),
      },
    };
    const mockFs = createMockFs({ score: 50, pass: true });

    await expect(
      runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      })
    ).rejects.toThrow(/Failed to pull eval image/);
  });

  it("throws EvalContainerError when score.json has invalid content", async () => {
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    // score.json exists but has a score > 100
    const mockFs = {
      fsExistsSync: vi.fn().mockReturnValue(true),
      fsReadFileSync: vi.fn().mockReturnValue(JSON.stringify({ score: 200, pass: true })),
      fsMkdirSync: vi.fn(),
    };

    await expect(
      runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      })
    ).rejects.toThrow(/Invalid score\.json/);
  });

  it("throws EvalContainerError when score.json is malformed JSON", async () => {
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    const mockFs = {
      fsExistsSync: vi.fn().mockReturnValue(true),
      fsReadFileSync: vi.fn().mockReturnValue("not json {{{"),
      fsMkdirSync: vi.fn(),
    };

    await expect(
      runEvalContainer(evalImage, agentOutputPath, resultsPath, {
        docker,
        ...mockFs,
      })
    ).rejects.toThrow(/Failed to parse score\.json/);
  });

  it("creates results directory before running container", async () => {
    const scoreData: ScoreJson = { score: 50, pass: true };
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    const mockFs = createMockFs(scoreData);

    await runEvalContainer(evalImage, agentOutputPath, resultsPath, {
      docker,
      ...mockFs,
    });

    expect(mockFs.fsMkdirSync).toHaveBeenCalledWith(resultsPath, { recursive: true });
  });

  it("mounts agent output as read-only and results as read-write", async () => {
    const scoreData: ScoreJson = { score: 50, pass: true };
    const container = createMockContainer(0);
    const docker = createMockDocker(container);
    const mockFs = createMockFs(scoreData);

    await runEvalContainer(evalImage, agentOutputPath, resultsPath, {
      docker,
      ...mockFs,
    });

    const createCall = docker.createContainer.mock.calls[0][0];
    const binds = createCall.HostConfig.Binds as string[];
    expect(binds).toContain(`${agentOutputPath}:${EVAL_CONTAINER_INPUT_PATH}:ro`);
    expect(binds).toContain(`${resultsPath}:${EVAL_CONTAINER_OUTPUT_PATH}`);
  });
});

// ── 4. downloadAgentOutputToDir with mocked Supabase ─────────────

const STORAGE_BUCKET = "agent-outputs";

/**
 * Replicated downloadAgentOutputToDir logic from evaluation-worker.ts.
 * Accepts injected storage and filesystem for testing.
 */
async function downloadAgentOutputToDir(
  outputUrl: string,
  destDir: string,
  deps: {
    storage: {
      from: (bucket: string) => {
        list: (path: string) => Promise<{ data: Array<{ name: string; metadata?: { size: number } }> | null; error: { message: string } | null }>;
        download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
      };
    };
    fsMkdirSync: (p: string, opts: { recursive: boolean }) => void;
    fsWriteFileSync: (p: string, data: Buffer) => void;
  }
): Promise<number> {
  const bucket = deps.storage.from(STORAGE_BUCKET);
  const { data: files, error: listError } = await bucket.list(outputUrl);

  if (listError) {
    throw new EvalContainerError(
      `Failed to list agent output files: ${listError.message}`
    );
  }

  if (!files || files.length === 0) {
    return 0;
  }

  deps.fsMkdirSync(destDir, { recursive: true });
  let downloaded = 0;

  for (const file of files) {
    if (file.metadata && file.metadata.size === 0) continue;

    const { data, error: downloadError } = await bucket.download(
      `${outputUrl}/${file.name}`
    );

    if (downloadError || !data) {
      continue;
    }

    const destPath = path.join(destDir, file.name);
    const buffer = Buffer.from(await data.arrayBuffer());
    deps.fsWriteFileSync(destPath, buffer);
    downloaded++;
  }

  return downloaded;
}

describe("downloadAgentOutputToDir", () => {
  const outputUrl = "submissions/sub-123";
  const destDir = "/tmp/agent_output";

  function createMockStorage(
    files: Array<{ name: string; metadata?: { size: number } }> | null,
    listError: { message: string } | null,
    fileContents?: Map<string, string>
  ) {
    return {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: files, error: listError }),
        download: vi.fn().mockImplementation(async (filePath: string) => {
          const fileName = filePath.split("/").pop()!;
          const content = fileContents?.get(fileName) ?? "file content";
          const blob = new Blob([content]);
          return { data: blob, error: null };
        }),
      }),
    };
  }

  it("returns 0 when no files found", async () => {
    const storage = createMockStorage([], null);
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    const count = await downloadAgentOutputToDir(outputUrl, destDir, {
      storage,
      fsMkdirSync: mockFsMkdir,
      fsWriteFileSync: mockFsWrite,
    });

    expect(count).toBe(0);
    // Should not try to create dest dir when no files
    expect(mockFsWrite).not.toHaveBeenCalled();
  });

  it("returns 0 when files is null", async () => {
    const storage = createMockStorage(null, null);
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    const count = await downloadAgentOutputToDir(outputUrl, destDir, {
      storage,
      fsMkdirSync: mockFsMkdir,
      fsWriteFileSync: mockFsWrite,
    });

    expect(count).toBe(0);
  });

  it("downloads files to destDir when files exist", async () => {
    const files = [
      { name: "output.json" },
      { name: "log.txt" },
    ];
    const fileContents = new Map([
      ["output.json", '{"result": "hello"}'],
      ["log.txt", "execution log"],
    ]);
    const storage = createMockStorage(files, null, fileContents);
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    const count = await downloadAgentOutputToDir(outputUrl, destDir, {
      storage,
      fsMkdirSync: mockFsMkdir,
      fsWriteFileSync: mockFsWrite,
    });

    expect(count).toBe(2);
    expect(mockFsMkdir).toHaveBeenCalledWith(destDir, { recursive: true });
    expect(mockFsWrite).toHaveBeenCalledTimes(2);

    // Verify file paths
    const writePaths = mockFsWrite.mock.calls.map((call: unknown[]) => call[0]);
    expect(writePaths).toContain(path.join(destDir, "output.json"));
    expect(writePaths).toContain(path.join(destDir, "log.txt"));
  });

  it("throws EvalContainerError on list error", async () => {
    const storage = createMockStorage(null, { message: "Permission denied" });
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    await expect(
      downloadAgentOutputToDir(outputUrl, destDir, {
        storage,
        fsMkdirSync: mockFsMkdir,
        fsWriteFileSync: mockFsWrite,
      })
    ).rejects.toThrow(EvalContainerError);

    await expect(
      downloadAgentOutputToDir(outputUrl, destDir, {
        storage,
        fsMkdirSync: mockFsMkdir,
        fsWriteFileSync: mockFsWrite,
      })
    ).rejects.toThrow(/Failed to list agent output files/);
  });

  it("skips zero-byte files (Supabase folder placeholders)", async () => {
    const files = [
      { name: ".emptyFolderPlaceholder", metadata: { size: 0 } },
      { name: "real-file.txt" },
    ];
    const storage = createMockStorage(files, null);
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    const count = await downloadAgentOutputToDir(outputUrl, destDir, {
      storage,
      fsMkdirSync: mockFsMkdir,
      fsWriteFileSync: mockFsWrite,
    });

    expect(count).toBe(1);
    const writePaths = mockFsWrite.mock.calls.map((call: unknown[]) => call[0]);
    expect(writePaths).toContain(path.join(destDir, "real-file.txt"));
    expect(writePaths).not.toContain(path.join(destDir, ".emptyFolderPlaceholder"));
  });

  it("skips files that fail to download without throwing", async () => {
    const files = [
      { name: "good.txt" },
      { name: "bad.txt" },
    ];
    const storage = {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: files, error: null }),
        download: vi.fn().mockImplementation(async (filePath: string) => {
          const fileName = filePath.split("/").pop()!;
          if (fileName === "bad.txt") {
            return { data: null, error: { message: "Not found" } };
          }
          return { data: new Blob(["content"]), error: null };
        }),
      }),
    };
    const mockFsMkdir = vi.fn();
    const mockFsWrite = vi.fn();

    const count = await downloadAgentOutputToDir(outputUrl, destDir, {
      storage,
      fsMkdirSync: mockFsMkdir,
      fsWriteFileSync: mockFsWrite,
    });

    expect(count).toBe(1);
  });
});

// ── 5. Worker routing logic ──────────────────────────────────────

describe("eval mode routing", () => {
  // Test that the routing decision selects the correct handler
  const EVAL_MODE = {
    LLM: "llm",
    CONTAINER: "container",
    HYBRID: "hybrid",
  } as const;

  type EvalMode = (typeof EVAL_MODE)[keyof typeof EVAL_MODE];

  function resolveEvalMode(taskEvalMode: string | null | undefined): EvalMode {
    return (taskEvalMode as EvalMode) ?? EVAL_MODE.LLM;
  }

  function routeEval(evalMode: EvalMode): "container" | "llm" {
    if (evalMode === EVAL_MODE.CONTAINER || evalMode === EVAL_MODE.HYBRID) {
      return "container";
    }
    return "llm";
  }

  it("defaults to LLM mode when eval_mode is null", () => {
    expect(resolveEvalMode(null)).toBe("llm");
  });

  it("defaults to LLM mode when eval_mode is undefined", () => {
    expect(resolveEvalMode(undefined)).toBe("llm");
  });

  it("preserves explicit LLM mode", () => {
    expect(resolveEvalMode("llm")).toBe("llm");
  });

  it("preserves container mode", () => {
    expect(resolveEvalMode("container")).toBe("container");
  });

  it("preserves hybrid mode", () => {
    expect(resolveEvalMode("hybrid")).toBe("hybrid");
  });

  it("routes LLM mode to llm handler", () => {
    expect(routeEval(EVAL_MODE.LLM)).toBe("llm");
  });

  it("routes container mode to container handler", () => {
    expect(routeEval(EVAL_MODE.CONTAINER)).toBe("container");
  });

  it("routes hybrid mode to container handler", () => {
    expect(routeEval(EVAL_MODE.HYBRID)).toBe("container");
  });
});
