/**
 * INVARIANT: Evaluation results are append-only. Enforced at the database level.
 *
 * REQUIREMENTS.md:147 non-negotiable:
 *   "Evaluation results are append-only. No updates after writing.
 *    Enforce at the DB level."
 *
 * This is a layered guarantee:
 *   1. Migration 001 installs a trigger that raises on UPDATE to evaluation_results.
 *   2. No application code attempts to UPDATE evaluation_results.
 *
 * These tests are static / grep-based — they verify the layered guarantee
 * without a live database. A test that needs a running Postgres belongs in
 * integration; these are regression gates that catch the common mistakes
 * (dropping the trigger, introducing an UPDATE somewhere in the app).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".claude") continue;
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full, out);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
        out.push(full);
      }
    } catch {
      // ignore unreadable paths (symlinks, permission, etc.)
    }
  }
  return out;
}

describe("invariant: evaluation results are append-only", () => {
  it("database trigger blocking UPDATE exists in migrations", () => {
    // We expect migration 001 (or any later migration) to register a trigger or
    // function that raises on UPDATE to evaluation_results. Grep migrations for
    // a RULE / TRIGGER / FUNCTION tied to that table name.
    const migrationsDir = join(repoRoot, "supabase", "migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

    const combinedSql = files
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n");

    // Either a TRIGGER or a RULE attached to evaluation_results that prevents updates.
    const lower = combinedSql.toLowerCase();
    const hasBlockingMechanism =
      // Trigger pattern: CREATE TRIGGER ... BEFORE UPDATE ON evaluation_results
      /before\s+update\s+on\s+evaluation_results/i.test(combinedSql) ||
      // Rule pattern: ON UPDATE TO evaluation_results DO INSTEAD
      /on\s+update\s+to\s+evaluation_results/i.test(combinedSql) ||
      // Function raising on update (less structured — look for combo of keywords)
      (lower.includes("evaluation_results") &&
        lower.includes("immutable") &&
        lower.includes("raise"));

    expect(
      hasBlockingMechanism,
      "Migrations must contain a trigger/rule/function that blocks UPDATE on evaluation_results. " +
        "See REQUIREMENTS.md non-negotiable: evaluation results are append-only, enforced at DB level."
    ).toBe(true);
  });

  it("no application code attempts UPDATE on evaluation_results", () => {
    const srcDir = join(repoRoot, "src");
    const files = walk(srcDir).filter((f) => !f.endsWith(".test.ts"));

    const violations: Array<{ file: string; match: string }> = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      // Look for patterns like:
      //   .from("evaluation_results").update(
      //   db.from('evaluation_results').update(
      // Allow whitespace/newlines between .from(...) and .update(.
      const pattern =
        /\.from\(\s*["']evaluation_results["']\s*\)\s*(?:\.[a-z]+\([^)]*\)\s*)*\.update\(/gi;
      const matches = content.match(pattern);
      if (matches) {
        for (const m of matches) {
          violations.push({ file, match: m });
        }
      }
    }

    expect(
      violations,
      `Application code must not UPDATE evaluation_results. Found: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });

  it("no repository or service layer exposes an updateEvaluationResult method", () => {
    const srcDir = join(repoRoot, "src");
    const files = walk(srcDir).filter((f) => !f.endsWith(".test.ts"));

    const violations: Array<{ file: string; match: string }> = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      // Watch for method names that suggest an update path on evaluation_results
      const patterns = [
        /updateEvaluation(?:Result|Score|Dimensions)\s*[(:]/g,
        /evaluationResults?\.update\s*\(/g,
      ];
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const m of matches) {
            violations.push({ file, match: m });
          }
        }
      }
    }

    expect(
      violations,
      `No code should expose a method that updates evaluation_results. Found: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });
});
