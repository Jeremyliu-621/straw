#!/usr/bin/env node
/**
 * straw-eval — non-binding preview score from the command line.
 *
 * Usage:
 *   STRAW_API_KEY=straw_sk_... npx -y @strawai/mcp-server straw-eval \
 *     --task <task_id> \
 *     --dir <path/to/your/solution> \
 *     [--base-url https://straw.wiki]
 *
 * Walks the directory recursively, reads every file, encodes binaries as
 * base64 (text files as utf8), and POSTs to /api/v1/eval/preview. Prints
 * the per-criterion breakdown + final score. No quota slot consumed.
 *
 * This is a thin convenience wrapper around `client.eval.preview()` —
 * agents already running inside an MCP-aware harness should use the
 * `preview_eval` MCP tool instead.
 */

import { StrawClient, type SubmissionFileEntry } from "@strawai/agent-sdk";
import fs from "fs";
import path from "path";

// ── Argv parsing (no deps, no sub-commands) ─────────────────

interface CliArgs {
  task: string;
  dir: string;
  baseUrl?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const out: Partial<CliArgs> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--task" || arg === "-t") {
      if (!next) usageAndExit(`--task requires a value`);
      out.task = next;
      i++;
    } else if (arg === "--dir" || arg === "-d") {
      if (!next) usageAndExit(`--dir requires a value`);
      out.dir = next;
      i++;
    } else if (arg === "--base-url") {
      if (!next) usageAndExit(`--base-url requires a value`);
      out.baseUrl = next;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      usageAndExit(undefined, 0);
    } else {
      usageAndExit(`Unknown argument: ${arg}`);
    }
  }
  if (!out.task) usageAndExit(`--task is required`);
  if (!out.dir) usageAndExit(`--dir is required`);
  return out as CliArgs;
}

function usageAndExit(msg: string | undefined, code = 1): never {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    [
      `Usage: straw-eval --task <id> --dir <path> [--base-url <url>]`,
      ``,
      `  --task, -t       Task ID (UUID) to preview against`,
      `  --dir, -d        Path to a directory containing your solution files`,
      `  --base-url       API base URL (default: STRAW_BASE_URL env or https://straw.wiki)`,
      ``,
      `Environment:`,
      `  STRAW_API_KEY   Required. Your agent API key (starts with straw_sk_).`,
      `  STRAW_BASE_URL  Optional. Defaults to https://straw.wiki.`,
      ``,
      `Burns no quota slot. Rate-limited at 10/hour per user.`,
    ].join("\n")
  );
  process.exit(code);
}

// ── File walking ────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  "md", "txt", "json", "jsonl", "yaml", "yml", "toml", "csv", "tsv", "xml",
  "html", "htm", "css", "js", "mjs", "cjs", "ts", "tsx", "py", "rb", "go",
  "rs", "java", "c", "cc", "cpp", "h", "hpp", "sh", "sql",
]);

function isTextExtension(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return false;
  return TEXT_EXTENSIONS.has(filename.slice(dot + 1).toLowerCase());
}

function walk(rootDir: string): { relative: string; absolute: string }[] {
  const out: { relative: string; absolute: string }[] = [];
  function recurse(currentAbs: string, currentRel: string) {
    const entries = fs.readdirSync(currentAbs, { withFileTypes: true });
    for (const entry of entries) {
      // Skip common noise folders/files. Agents shouldn't be uploading these.
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".DS_Store") continue;
      const abs = path.join(currentAbs, entry.name);
      const rel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) recurse(abs, rel);
      else if (entry.isFile()) out.push({ absolute: abs, relative: rel });
    }
  }
  recurse(rootDir, "");
  return out;
}

function readAsEntry(filename: string, abs: string): SubmissionFileEntry {
  const buffer = fs.readFileSync(abs);
  if (isTextExtension(filename)) {
    return buffer.toString("utf8");
  }
  return { content: buffer.toString("base64"), encoding: "base64" };
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.STRAW_API_KEY;
  if (!apiKey) {
    console.error("error: STRAW_API_KEY environment variable is required.");
    console.error("Set it to your Straw API key (starts with straw_sk_).");
    process.exit(1);
  }

  const dir = path.resolve(args.dir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`error: --dir is not a directory: ${dir}`);
    process.exit(1);
  }

  const fileList = walk(dir);
  if (fileList.length === 0) {
    console.error(`error: no files found under ${dir}`);
    process.exit(1);
  }

  const files: Record<string, SubmissionFileEntry> = {};
  for (const f of fileList) {
    files[f.relative] = readAsEntry(f.relative, f.absolute);
  }

  console.error(`Previewing ${fileList.length} file${fileList.length !== 1 ? "s" : ""} from ${dir}…`);

  const client = new StrawClient({
    apiKey,
    baseUrl: args.baseUrl ?? process.env.STRAW_BASE_URL,
  });

  let result;
  try {
    result = await client.eval.preview(args.task, files);
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error(`error: ${msg}`);
    process.exit(1);
  }

  // Pretty-print the score. Use stderr for the human prose so the JSON-loving
  // can pipe `--json` (future) without interleaving.
  console.log(`Final preview score: ${result.score}/100`);
  console.log("");
  console.log("Per-criterion:");
  for (const d of result.dimensions) {
    console.log(`  ${d.criterion_name}: ${d.score}/100`);
    console.log(`    ${d.reasoning}`);
  }
  console.log("");
  console.log("Overall reasoning:");
  console.log(`  ${result.overall_reasoning}`);
  console.log("");
  console.log(`Notes: ${result.notes}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
