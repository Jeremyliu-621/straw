/**
 * Platform Build Check Service
 *
 * Detects the language/framework from uploaded files and attempts a standard build.
 * The result (success/failure + output) is passed to the LLM judge as additional context.
 *
 * This runs inside the evaluation worker, NOT as a separate process.
 * For tasks with eval containers, the build check is skipped — the eval container
 * handles building and testing.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface BuildCheckResult {
  detected: string;       // "node" | "python" | "rust" | "go" | "unknown"
  buildCommand: string;   // the command that was attempted
  success: boolean;
  output: string;         // stdout + stderr, truncated
  durationMs: number;
}

const BUILD_OUTPUT_MAX_CHARS = 5000;
const BUILD_TIMEOUT_MS = 60_000; // 1 minute max for build check

interface LanguageDetection {
  name: string;
  marker: string;
  buildCommand: string;
}

const LANGUAGES: LanguageDetection[] = [
  { name: "node", marker: "package.json", buildCommand: "npm install --ignore-scripts && npm run build --if-present" },
  { name: "python", marker: "requirements.txt", buildCommand: "pip install -r requirements.txt 2>&1 && python -c 'print(\"build ok\")'" },
  { name: "rust", marker: "Cargo.toml", buildCommand: "cargo check 2>&1" },
  { name: "go", marker: "go.mod", buildCommand: "go build ./... 2>&1" },
];

/**
 * Detect the language/framework from files in a directory.
 */
export function detectLanguage(dirPath: string): LanguageDetection | null {
  if (!fs.existsSync(dirPath)) return null;

  for (const lang of LANGUAGES) {
    if (fs.existsSync(path.join(dirPath, lang.marker))) {
      return lang;
    }
  }

  return null;
}

/**
 * Attempt to build the submission.
 * Returns the result regardless of success/failure — the LLM judge uses this as context.
 *
 * Runs the build command in the submission directory with a timeout.
 * Does NOT use Docker — runs directly in the worker process.
 * For production, consider running this in a lightweight container for isolation.
 */
export function runBuildCheck(dirPath: string): BuildCheckResult {
  const lang = detectLanguage(dirPath);

  if (!lang) {
    return {
      detected: "unknown",
      buildCommand: "(none — could not detect language)",
      success: false,
      output: "Could not detect language/framework. No package.json, requirements.txt, Cargo.toml, or go.mod found.",
      durationMs: 0,
    };
  }

  const start = Date.now();

  try {
    const output = execSync(lang.buildCommand, {
      cwd: dirPath,
      timeout: BUILD_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024, // 10MB
      stdio: ["pipe", "pipe", "pipe"],
    });

    const durationMs = Date.now() - start;

    return {
      detected: lang.name,
      buildCommand: lang.buildCommand,
      success: true,
      output: truncateOutput(output),
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const execError = err as { stdout?: string; stderr?: string; message?: string };
    const output = [execError.stdout, execError.stderr, execError.message]
      .filter(Boolean)
      .join("\n");

    return {
      detected: lang.name,
      buildCommand: lang.buildCommand,
      success: false,
      output: truncateOutput(output),
      durationMs,
    };
  }
}

function truncateOutput(output: string): string {
  if (output.length <= BUILD_OUTPUT_MAX_CHARS) return output;
  return output.slice(0, BUILD_OUTPUT_MAX_CHARS) + "\n[output truncated]";
}
