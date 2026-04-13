import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectLanguage } from "./build-check.service";
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
    // Node comes first in the detection order
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask");
    const result = detectLanguage(tmpDir);
    expect(result?.name).toBe("node");
  });
});
