/**
 * Platform Build Check Service
 *
 * Detects the language/framework from uploaded files and attempts a
 * standard build. The result (success/failure + output) is passed to
 * the LLM judge as additional context.
 *
 * SECURITY: the build command runs untrusted, agent-uploaded code (a
 * hostile `package.json` can run arbitrary code in `npm run build`;
 * pip installs can run setup.py scripts; cargo builds run `build.rs`).
 * We run it inside a throwaway Docker container with:
 *
 *   - no worker env vars (Env: []) — can't exfil SUPABASE_SERVICE_ROLE_KEY,
 *     GOOGLE_GEMINI_API_KEY, REDIS_URL, etc.
 *   - all capabilities dropped, no-new-privileges
 *   - 60s hard timeout, 1 GB memory cap, AutoRemove
 *   - bind-mounted agent dir at /workdir (not /tmp, no host paths)
 *   - bridge network (required for `npm install` etc. to reach the
 *     registry) — this is the only remaining attack surface from
 *     inside the container
 *
 * If Docker is unavailable we SKIP the build check rather than fall
 * back to running on the host. The build result is advisory (it
 * flavors the LLM prompt); missing it degrades eval quality but does
 * not block scoring.
 */

import fs from "fs";
import path from "path";
import type Dockerode from "dockerode";

export interface BuildCheckResult {
  detected: string;       // "node" | "python" | "rust" | "go" | "unknown"
  buildCommand: string;   // the command that was attempted
  success: boolean;
  output: string;         // stdout + stderr, truncated
  durationMs: number;
  skipped?: boolean;      // true when Docker was unavailable
}

export const BUILD_OUTPUT_MAX_CHARS = 5000;
export const BUILD_TIMEOUT_MS = 60_000; // 1 minute max for build check
export const BUILD_MEMORY_BYTES = 1024 * 1024 * 1024; // 1 GB
export const BUILD_MAX_LOG_BYTES = 128 * 1024; // 128 KB (raw container log)

interface LanguageDetection {
  name: string;
  marker: string;
  /**
   * The image pulled for this language. All are small alpine / slim
   * bases so pull cost is minimal on first run and cached thereafter.
   */
  image: string;
  /**
   * The shell command invoked inside the container. CWD is /workdir.
   */
  buildCommand: string;
}

const LANGUAGES: LanguageDetection[] = [
  {
    name: "node",
    marker: "package.json",
    image: "node:20-alpine",
    buildCommand: "npm install --ignore-scripts && npm run build --if-present",
  },
  {
    name: "python",
    marker: "requirements.txt",
    image: "python:3.12-slim",
    buildCommand:
      "pip install --no-input -r requirements.txt 2>&1 && python -c 'print(\"build ok\")'",
  },
  {
    name: "rust",
    marker: "Cargo.toml",
    image: "rust:1.82-slim",
    buildCommand: "cargo check 2>&1",
  },
  {
    name: "go",
    marker: "go.mod",
    image: "golang:1.23-alpine",
    buildCommand: "go build ./... 2>&1",
  },
];

/**
 * Detect the language/framework from files in a directory. Pure
 * function — safe to call on untrusted input (just checks for file
 * existence).
 */
export function detectLanguage(dirPath: string): LanguageDetection | null {
  if (!fs.existsSync(dirPath)) return null;
  for (const lang of LANGUAGES) {
    if (fs.existsSync(path.join(dirPath, lang.marker))) return lang;
  }
  return null;
}

/**
 * Run a build check for the agent's submission, isolated from the
 * worker host. Returns a BuildCheckResult regardless of
 * success/failure — the LLM judge uses this as prompt context.
 *
 * Passing `docker: null` (or the call erroring on Docker init) yields
 * a `skipped: true` result. Callers can treat a skipped result the
 * same as "unknown language" — the eval still proceeds without the
 * build signal.
 */
export async function runBuildCheck(
  dirPath: string,
  docker: Dockerode | null
): Promise<BuildCheckResult> {
  const lang = detectLanguage(dirPath);

  if (!lang) {
    return {
      detected: "unknown",
      buildCommand: "(none — could not detect language)",
      success: false,
      output:
        "Could not detect language/framework. No package.json, requirements.txt, Cargo.toml, or go.mod found.",
      durationMs: 0,
    };
  }

  if (!docker) {
    return {
      detected: lang.name,
      buildCommand: lang.buildCommand,
      success: false,
      output: "Build check skipped: Docker not available on this worker.",
      durationMs: 0,
      skipped: true,
    };
  }

  const absDir = path.resolve(dirPath);
  const start = Date.now();

  try {
    await ensureImage(docker, lang.image);

    const container = await docker.createContainer({
      Image: lang.image,
      Cmd: ["sh", "-c", lang.buildCommand],
      WorkingDir: "/workdir",
      // Explicitly empty — worker env vars (Supabase service key,
      // Gemini key, Redis URL) must not leak into the build.
      Env: [],
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`${absDir}:/workdir`],
        Memory: BUILD_MEMORY_BYTES,
        NetworkMode: "bridge", // needed for `npm install` etc.
        AutoRemove: false, // we do the remove manually so logs survive
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
      },
    });

    await container.start();

    let exitCode: number;
    try {
      exitCode = await waitWithTimeout(container, BUILD_TIMEOUT_MS);
    } catch (err) {
      // Timeout — kill, capture whatever logs we have, return failure.
      try { await container.kill({ signal: "SIGKILL" }); } catch { /* already gone */ }
      const partialLogs = await safeFetchLogs(container);
      try { await container.remove({ force: true }); } catch { /* best effort */ }
      return {
        detected: lang.name,
        buildCommand: lang.buildCommand,
        success: false,
        output: truncateOutput(
          `Build check timed out after ${BUILD_TIMEOUT_MS}ms.\n${partialLogs}\n(${(err as Error).message})`
        ),
        durationMs: Date.now() - start,
      };
    }

    const logOutput = await safeFetchLogs(container);
    try { await container.remove({ force: true }); } catch { /* best effort */ }

    return {
      detected: lang.name,
      buildCommand: lang.buildCommand,
      success: exitCode === 0,
      output: truncateOutput(logOutput),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    // Docker API failure (image pull, container create, etc.). Skip
    // rather than silently corrupt the eval context.
    return {
      detected: lang.name,
      buildCommand: lang.buildCommand,
      success: false,
      output: `Build check skipped: Docker error — ${(err as Error).message}`,
      durationMs: Date.now() - start,
      skipped: true,
    };
  }
}

async function ensureImage(docker: Dockerode, image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
    return; // already local
  } catch {
    // not present — pull below
  }

  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (followErr: Error | null) => {
        if (followErr) return reject(followErr);
        resolve();
      });
    });
  });
}

async function waitWithTimeout(
  container: Dockerode.Container,
  timeoutMs: number
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`build-check container exceeded ${timeoutMs}ms`));
    }, timeoutMs);

    container
      .wait()
      .then((result) => {
        clearTimeout(timer);
        resolve(result.StatusCode);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function safeFetchLogs(container: Dockerode.Container): Promise<string> {
  try {
    const logs = await container.logs({ stdout: true, stderr: true, follow: false });
    return logs.toString("utf8").slice(0, BUILD_MAX_LOG_BYTES);
  } catch {
    return "(no logs captured)";
  }
}

function truncateOutput(output: string): string {
  if (output.length <= BUILD_OUTPUT_MAX_CHARS) return output;
  return output.slice(0, BUILD_OUTPUT_MAX_CHARS) + "\n[output truncated]";
}
