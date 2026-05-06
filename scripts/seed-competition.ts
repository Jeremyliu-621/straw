/**
 * Seed a real competition for testing with Claude or any agent.
 *
 * Creates:
 * - A company user + profile
 * - An open task with rubric criteria (real problem, not a toy)
 * - An agent builder user + profile
 * - An API key for the agent builder (printed to console)
 *
 * After running this, hand the API key to Claude Code or any agent and say:
 *   "Here's an API key: straw_sk_xxx. The platform is at http://localhost:3000.
 *    Read the docs at /api/docs. Find the open task, build a solution, zip it
 *    with a SUBMISSION.md, upload via the v1 API, and poll until you get a score."
 *
 * Usage: npm run seed:competition
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Make sure .env.local exists with these values.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const COMPANY_EMAIL = "competition-company@straw.wiki";
const AGENT_EMAIL = "competition-agent@straw.wiki";
const API_KEY_PREFIX = "straw_sk_";

function generateApiKey() {
  const randomHex = randomBytes(32).toString("hex");
  const plaintext = `${API_KEY_PREFIX}${randomHex}`;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  const prefix = plaintext.slice(0, 16);
  return { plaintext, hash, prefix };
}

async function upsertUser(email: string, name: string, role: string, authId: string): Promise<string> {
  const { data: byEmail } = await db.from("users").select("id").eq("email", email).maybeSingle();
  if (byEmail) return byEmail.id;

  const { data: byAuthId } = await db.from("users").select("id").eq("auth_provider_id", authId).maybeSingle();
  if (byAuthId) return byAuthId.id;

  const { data, error } = await db
    .from("users")
    .insert({ email, name, role, auth_provider_id: authId, onboarded: true })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  return data.id;
}

async function seed() {
  console.log("\n  Seeding competition...\n");

  // ── Company ────────────────────────────────────────────────
  const companyId = await upsertUser(COMPANY_EMAIL, "Demo Company", "company", "competition-company");
  await db.from("company_profiles").upsert({
    user_id: companyId,
    company_name: "Demo Company",
    industry: "Technology",
    description: "Testing the Straw platform.",
  }, { onConflict: "user_id" });
  console.log(`  Company:  ${companyId}`);

  // ── Agent builder ──────────────────────────────────────────
  const agentId = await upsertUser(AGENT_EMAIL, "Test Agent", "agent_builder", "competition-agent");
  await db.from("agent_builder_profiles").upsert({
    user_id: agentId,
    display_name: "Test Agent",
    bio: "An autonomous agent competing on Straw.",
    categories: ["code-generation"],
  }, { onConflict: "user_id" });
  console.log(`  Agent:    ${agentId}`);

  // ── API key (revoke old ones first) ────────────────────────
  await db.from("api_keys").update({ revoked_at: new Date().toISOString() })
    .eq("user_id", agentId).is("revoked_at", null);

  const { plaintext, hash, prefix } = generateApiKey();
  const { error: keyErr } = await db.from("api_keys").insert({
    user_id: agentId,
    key_hash: hash,
    prefix,
    name: "competition-seed",
  });
  if (keyErr) throw new Error(`Failed to create API key: ${keyErr.message}`);

  // ── Task ───────────────────────────────────────────────────
  // Delete old competition task if exists
  const { data: oldTasks } = await db.from("tasks").select("id").eq("company_id", companyId);
  for (const t of oldTasks ?? []) {
    // Clean up dependents
    const { data: subs } = await db.from("submissions").select("id").eq("task_id", t.id);
    const subIds = (subs ?? []).map(s => s.id);
    if (subIds.length > 0) {
      const { data: evals } = await db.from("evaluation_results").select("id").in("submission_id", subIds);
      const evalIds = (evals ?? []).map(e => e.id);
      if (evalIds.length > 0) {
        await db.from("evaluation_dimensions").delete().in("evaluation_result_id", evalIds);
        await db.from("evaluation_results").delete().in("submission_id", subIds);
      }
      await db.from("submissions").delete().eq("task_id", t.id);
    }
    await db.from("rubric_criteria").delete().eq("task_id", t.id);
    await db.from("tasks").delete().eq("id", t.id);
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .insert({
      company_id: companyId,
      title: "Build a Markdown-to-HTML converter",
      description: `Build a command-line tool that converts Markdown to HTML.

Requirements:
- Accept a Markdown string as input (via stdin or file argument)
- Output valid HTML to stdout
- Support at minimum: headings (h1-h6), bold, italic, code blocks (fenced with language hint), inline code, links, images, unordered lists, ordered lists, blockquotes, horizontal rules, and paragraphs
- Nested lists must work correctly
- Code blocks must preserve whitespace and escape HTML entities
- The output should be a complete HTML fragment (no <html>/<body> wrapper needed)

Bonus (not required):
- Tables
- Strikethrough
- Task lists (checkboxes)

You may use any language. Include a README explaining how to build and run it.`,
      category: "code-generation",
      input_spec: "A Markdown string provided as a .md file. Example:\n\n# Hello World\n\nThis is **bold** and *italic*.\n\n```python\nprint('hello')\n```\n\n- Item 1\n- Item 2\n  - Nested item",
      output_spec: "Valid HTML output to stdout. For the example input above, output should include <h1>, <strong>, <em>, <pre><code>, and nested <ul><li> elements.",
      test_weight: 0,
      llm_weight: 100,
      budget_cents: 50000,
      deadline: deadline.toISOString(),
      status: "open",
      eval_mode: "llm",
    })
    .select()
    .single();

  if (taskErr) throw new Error(`Failed to create task: ${taskErr.message}`);

  await db.from("rubric_criteria").insert([
    { task_id: task.id, name: "Correctness", description: "Does the converter handle all required Markdown syntax correctly? Are edge cases handled (nested lists, code blocks with special chars, adjacent elements)?", weight: 35, position: 0 },
    { task_id: task.id, name: "Code Quality", description: "Is the code well-structured, readable, and idiomatic for the chosen language? Good separation of concerns?", weight: 25, position: 1 },
    { task_id: task.id, name: "Completeness", description: "Are all required features implemented? Does it handle the full spec, not just the happy path?", weight: 25, position: 2 },
    { task_id: task.id, name: "Documentation", description: "Is there a clear README? Does SUBMISSION.md accurately describe what was built and any tradeoffs?", weight: 15, position: 3 },
  ]);

  console.log(`  Task:     ${task.id}`);
  console.log(`  Title:    ${task.title}`);
  console.log(`  Deadline: ${deadline.toISOString()}`);

  // ── Print results ──────────────────────────────────────────
  console.log(`
  ─────────────────────────────────────────────
  Competition ready!

  API Key (save this — shown once):
  ${plaintext}

  Base URL: http://localhost:3000

  To compete, give an agent this prompt:
  ─────────────────────────────────────────────
  Here's an API key: ${plaintext}
  The platform is at http://localhost:3000.
  Read the API docs at http://localhost:3000/api/docs.
  Find the open task, build a solution, package it
  as a zip with a SUBMISSION.md file, upload it via
  the v1 API, then poll until you get a score back.
  ─────────────────────────────────────────────
`);
}

seed().catch((err) => {
  console.error("\n  Seed failed:", err.message);
  process.exit(1);
});
