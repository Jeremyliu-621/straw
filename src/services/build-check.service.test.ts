import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectLanguage, runBuildCheck } from "./build-check.service";
import fs from "fs";
import path from "path";
import os from "os";

describe("detectLanguage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-check-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects Node.js from package.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("node");
  });

  it("detects Python from requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("python");
  });

  it("detects Rust from Cargo.toml", () => {
    fs.writeFileSync(path.join(tmpDir, "Cargo.toml"), "[package]");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("rust");
  });

  it("detects Go from go.mod", () => {
    fs.writeFileSync(path.join(tmpDir, "go.mod"), "module test");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("go");
  });

  it("returns null for unknown language", () => {
    fs.writeFileSync(path.join(tmpDir, "main.zig"), "const std = @import(\"std\");");
    const result = detectLanguage(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null for non-existent directory", () => {
    const result = detectLanguage("/nonexistent/path");
    expect(result).toBeNull();
  });

  it("returns null for empty directory", () => {
    const result = detectLanguage(tmpDir);
    expect(result).toBeNull();
  });

  it("prioritizes Node.js when multiple markers present", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("node");
  });
});

describe("runBuildCheck", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-check-run-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 'unknown' result when no language marker is present", async () => {
    const result = await runBuildCheck(tmpDir, null);
    expect(result.detected).toBe("unknown");
    expect(result.success).toBe(false);
    expect(result.output).toMatch(/could not detect/i);
    expect(result.skipped).toBeUndefined();
  });

  it("returns a skipped result when Docker is null and language IS detected", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    const result = await runBuildCheck(tmpDir, null);
    expect(result.detected).toBe("node");
    expect(result.skipped).toBe(true);
    expect(result.output).toMatch(/docker not available/i);
  });

  it("runs container and captures exit=0 as success", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");

    const mockContainer = {
      start: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
      logs: vi.fn().mockResolvedValue(Buffer.from("ok installed\n", "utf8")),
      remove: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn(),
    };
    const mockDocker = {
      getImage: vi.fn().mockReturnValue({ inspect: vi.fn().mockResolvedValue({}) }),
      createContainer: vi.fn().mockResolvedValue(mockContainer),
      pull: vi.fn(),
      modem: { followProgress: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any;

    const result = await runBuildCheck(tmpDir, mockDocker);

    expect(result.detected).toBe("node");
    expect(result.success).toBe(true);
    expect(result.output).toContain("ok installed");
    expect(mockContainer.remove).toHaveBeenCalled();

    // Contract: we pass Env: [] so worker env doesn't leak. Verify.
    const createArgs = mockDocker.createContainer.mock.calls[0][0];
    expect(createArgs.Env).toEqual([]);
    expect(createArgs.HostConfig.CapDrop).toContain("ALL");
    expect(createArgs.HostConfig.SecurityOpt).toContain("no-new-privileges");
  });

  it("captures exit!=0 as failure with logs", async () => {
    fs.writeFileSync(path.join(tmpDir, "go.mod"), "module t");

    const mockContainer = {
      start: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue({ StatusCode: 1 }),
      logs: vi.fn().mockResolvedValue(Buffer.from("compile error\n", "utf8")),
      remove: vi.fn().mockResolvedValue(undefined),
      kill: vi.fn(),
    };
    const mockDocker = {
      getImage: vi.fn().mockReturnValue({ inspect: vi.fn().mockResolvedValue({}) }),
      createContainer: vi.fn().mockResolvedValue(mockContainer),
      pull: vi.fn(),
      modem: { followProgress: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any;

    const result = await runBuildCheck(tmpDir, mockDocker);

    expect(result.success).toBe(false);
    expect(result.detected).toBe("go");
    expect(result.output).toContain("compile error");
  });

  it("returns skipped=true when Docker throws on image pull", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");

    // Inspect rejects (image not local) → fallthrough to pull → pull throws.
    const mockDocker = {
      getImage: vi.fn().mockReturnValue({
        inspect: vi.fn().mockRejectedValue(new Error("no such image")),
      }),
      pull: vi.fn().mockImplementation((_image, cb) => {
        cb(new Error("cannot connect to daemon"));
      }),
      modem: { followProgress: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any;

    const result = await runBuildCheck(tmpDir, mockDocker);

    expect(result.skipped).toBe(true);
    expect(result.output).toMatch(/cannot connect to daemon/);
  });
});
