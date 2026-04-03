/**
 * End-to-End Pipeline Test Script
 *
 * Tests the full submission pipeline: seed data → submit agents → execute → evaluate → verify scores.
 *
 * Prerequisites:
 *   1. docker-compose up -d       (Redis + Postgres)
 *   2. Docker daemon running       (for agent containers)
 *   3. Test images built:          cd test-agents && bash build-all.sh
 *   4. npm run worker              (in separate terminal)
 *   5. npm run eval-worker         (in separate terminal)
 *   6. npm run dev                 (in separate terminal — needed for status polling)
 *
 * Usage: npx tsx scripts/e2e-pipeline.ts
 */

import { createClient } from "@supabase/supabase-js";
import { Queue } from "bullmq";

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const redisUrl = new URL(REDIS_URL);
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

const executionQueue = new Queue("execution", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ── Test Agents ─────────────────────────────────────────────

const TEST_AGENTS = [
  { name: "Good Agent", email: "e2e-good@test.dev", image: "straw-test/good-agent:latest", expectedOutcome: "high" },
  { name: "Okay Agent", email: "e2e-okay@test.dev", image: "straw-test/okay-agent:latest", expectedOutcome: "mid" },
  { name: "Sloppy Agent", email: "e2e-sloppy@test.dev", image: "straw-test/sloppy-agent:latest", expectedOutcome: "low" },
  { name: "Crash Agent", email: "e2e-crash@test.dev", image: "straw-test/crash-agent:latest", expectedOutcome: "fail" },
] as const;

const E2E_COMPANY_EMAIL = "e2e-company@test.dev";

// ── Helpers ─────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function pass(msg: string) {
  console.log(`  \u2713 ${msg}`);
}

function fail(msg: string) {
  console.log(`  \u2717 ${msg}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollStatus(
  submissionId: string,
  timeoutMs: number = 120_000
): Promise<{
  status: string;
  evaluated: boolean;
  final_score: number | null;
  error_message: string | null;
}> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${APP_URL}/api/submissions/${submissionId}/status`);
      if (res.ok) {
        const data = await res.json();

        // Done if failed or fully evaluated
        if (data.status === "failed") return data;
        if (data.evaluated && data.final_score !== null) return data;
      }
    } catch {
      // Server might not be ready yet
    }

    await sleep(2000);
  }

  throw new Error(`Submission ${submissionId} did not complete within ${timeoutMs / 1000}s`);
}

// ── Cleanup ─────────────────────────────────────────────────

async function cleanup() {
  log("Cleaning up previous E2E data...");

  const testEmails = [E2E_COMPANY_EMAIL, ...TEST_AGENTS.map((a) => a.email)];
  const { data: users } = await db.from("users").select("id").in("email", testEmails);
  const userIds = users?.map((u) => u.id) ?? [];

  if (userIds.length > 0) {
    // Delete in dependency order
    await db.from("evaluation_dimensions").delete().in(
      "evaluation_result_id",
      (await db.from("evaluation_results").select("id").in(
        "submission_id",
        (await db.from("submissions").select("id").in("agent_id", userIds)).data?.map((s) => s.id) ?? []
      )).data?.map((e) => e.id) ?? []
    );
    await db.from("evaluation_results").delete().in(
      "submission_id",
      (await db.from("submissions").select("id").in("agent_id", userIds)).data?.map((s) => s.id) ?? []
    );
    await db.from("submissions").delete().in("agent_id", userIds);
    await db.from("rubric_criteria").delete().in(
      "task_id",
      (await db.from("tasks").select("id").in("company_id", userIds)).data?.map((t) => t.id) ?? []
    );
    await db.from("tasks").delete().in("company_id", userIds);
    await db.from("company_profiles").delete().in("user_id", userIds);
    await db.from("agent_builder_profiles").delete().in("user_id", userIds);
    await db.from("users").delete().in("email", testEmails);
  }

  log("Cleanup done.");
}

// ── Setup ───────────────────────────────────────────────────

async function createCompany(): Promise<string> {
  const { data, error } = await db
    .from("users")
    .insert({
      email: E2E_COMPANY_EMAIL,
      name: "E2E Test Company",
      role: "company",
      auth_provider_id: "e2e-company-auth",
      onboarded: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create company: ${error.message}`);

  await db.from("company_profiles").insert({
    user_id: data.id,
    company_name: "E2E Test Company",
    industry: "Testing",
    website: "https://e2e-test.dev",
    description: "End-to-end test company",
  });

  return data.id;
}

async function createAgents(): Promise<Array<{ id: string; email: string; image: string; name: string; expectedOutcome: string }>> {
  const agents = [];

  for (const agent of TEST_AGENTS) {
    const { data, error } = await db
      .from("users")
      .insert({
        email: agent.email,
        name: agent.name,
        role: "agent_builder",
        auth_provider_id: `e2e-${agent.email}`,
        onboarded: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create agent ${agent.name}: ${error.message}`);

    await db.from("agent_builder_profiles").insert({
      user_id: data.id,
      display_name: agent.name,
      docker_image: agent.image,
      bio: `E2E test agent: ${agent.name}`,
      categories: ["code-generation"],
    });

    agents.push({ id: data.id, email: agent.email, image: agent.image, name: agent.name, expectedOutcome: agent.expectedOutcome });
  }

  return agents;
}

async function createTask(companyId: string): Promise<string> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const { data: task, error } = await db
    .from("tasks")
    .insert({
      company_id: companyId,
      title: "E2E Test: Build a JSON validator with error reporting",
      description:
        "Build a JSON validator that checks input against a schema and produces clear error messages for each violation found. Output should be structured JSON with pass/fail status and error details.",
      category: "code-generation",
      input_spec: "A JSON schema definition provided via MAP_TASK_INPUT. Validate sample data against it.",
      output_spec: "A JSON file at /output/result.json with validation results.",
      test_weight: 0,
      llm_weight: 100,
      budget_cents: 25000,
      deadline: deadline.toISOString(),
      status: "open",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);

  await db.from("rubric_criteria").insert([
    { task_id: task.id, name: "Correctness", description: "Does the output correctly address the task?", weight: 40, position: 0 },
    { task_id: task.id, name: "Completeness", description: "Are all requirements addressed?", weight: 30, position: 1 },
    { task_id: task.id, name: "Code Quality", description: "Is the output well-structured and clear?", weight: 30, position: 2 },
  ]);

  return task.id;
}

// ── Submit + Enqueue ────────────────────────────────────────

async function submitAgent(
  taskId: string,
  agent: { id: string; image: string; name: string },
  inputSpec: string
): Promise<string> {
  const { data: submission, error } = await db
    .from("submissions")
    .insert({
      task_id: taskId,
      agent_id: agent.id,
      docker_image: agent.image,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create submission for ${agent.name}: ${error.message}`);

  await executionQueue.add(`exec-${submission.id}`, {
    submissionId: submission.id,
    taskId,
    dockerImage: agent.image,
    inputSpec,
  });

  return submission.id;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("\n========================================");
  console.log("  Straw E2E Pipeline Test");
  console.log("========================================\n");

  let failures = 0;

  try {
    // 1. Cleanup
    await cleanup();

    // 2. Create test data
    log("Creating test company...");
    const companyId = await createCompany();
    pass(`Company created: ${companyId}`);

    log("Creating test agents...");
    const agents = await createAgents();
    pass(`${agents.length} agents created`);

    log("Creating test task...");
    const taskId = await createTask(companyId);
    pass(`Task created: ${taskId}`);

    // 3. Get task input spec for jobs
    const { data: task } = await db.from("tasks").select("input_spec").eq("id", taskId).single();

    // 4. Submit all agents
    log("Submitting agents to competition...");
    const submissions: Array<{ id: string; agentName: string; expectedOutcome: string }> = [];

    for (const agent of agents) {
      const subId = await submitAgent(taskId, agent, task!.input_spec);
      submissions.push({ id: subId, agentName: agent.name, expectedOutcome: agent.expectedOutcome });
      pass(`${agent.name} submitted: ${subId}`);
    }

    // 5. Poll all submissions until complete
    log("Waiting for execution + evaluation (this may take a few minutes)...");
    console.log("");

    const results: Array<{
      agentName: string;
      expectedOutcome: string;
      status: string;
      evaluated: boolean;
      final_score: number | null;
      error_message: string | null;
    }> = [];

    for (const sub of submissions) {
      process.stdout.write(`  Polling ${sub.agentName}...`);
      try {
        const result = await pollStatus(sub.id);
        results.push({ agentName: sub.agentName, expectedOutcome: sub.expectedOutcome, ...result });
        if (result.evaluated) {
          process.stdout.write(` score=${result.final_score}\n`);
        } else if (result.status === "failed") {
          process.stdout.write(` FAILED: ${result.error_message}\n`);
        } else {
          process.stdout.write(` status=${result.status}\n`);
        }
      } catch (err) {
        process.stdout.write(` TIMEOUT\n`);
        results.push({
          agentName: sub.agentName,
          expectedOutcome: sub.expectedOutcome,
          status: "timeout",
          evaluated: false,
          final_score: null,
          error_message: "Polling timed out",
        });
      }
    }

    // 6. Verify results
    console.log("\n========================================");
    console.log("  Verification");
    console.log("========================================\n");

    // Check crash agent failed
    const crash = results.find((r) => r.expectedOutcome === "fail");
    if (crash?.status === "failed") {
      pass("Crash agent failed as expected");
    } else {
      fail(`Crash agent should have failed, got status=${crash?.status}`);
      failures++;
    }

    // Check good/okay/sloppy agents were evaluated
    const scored = results.filter((r) => r.expectedOutcome !== "fail");
    for (const r of scored) {
      if (r.evaluated && r.final_score !== null) {
        pass(`${r.agentName} evaluated with score ${r.final_score}`);
      } else {
        fail(`${r.agentName} was not evaluated (status=${r.status}, evaluated=${r.evaluated})`);
        failures++;
      }
    }

    // Check score ordering: good > okay > sloppy
    const good = results.find((r) => r.agentName === "Good Agent");
    const okay = results.find((r) => r.agentName === "Okay Agent");
    const sloppy = results.find((r) => r.agentName === "Sloppy Agent");

    if (good?.final_score != null && okay?.final_score != null && sloppy?.final_score != null) {
      if (good.final_score >= okay.final_score && okay.final_score >= sloppy.final_score) {
        pass(`Score ordering correct: good(${good.final_score}) >= okay(${okay.final_score}) >= sloppy(${sloppy.final_score})`);
      } else {
        fail(`Score ordering wrong: good(${good.final_score}), okay(${okay.final_score}), sloppy(${sloppy.final_score})`);
        failures++;
      }
    }

    // Check evaluation results exist in DB
    for (const sub of submissions) {
      if (results.find((r) => r.agentName === sub.agentName)?.expectedOutcome === "fail") continue;

      const { data: evalResult } = await db
        .from("evaluation_results")
        .select("id, final_score, llm_score, llm_reasoning")
        .eq("submission_id", sub.id)
        .single();

      if (evalResult) {
        pass(`${sub.agentName}: eval result in DB (score=${evalResult.final_score}, has reasoning=${!!evalResult.llm_reasoning})`);
      } else {
        fail(`${sub.agentName}: no eval result in DB`);
        failures++;
      }
    }

    // Check leaderboard API
    const leaderboardRes = await fetch(`${APP_URL}/api/tasks/${taskId}/leaderboard`);
    if (leaderboardRes.ok) {
      const leaderboard = await leaderboardRes.json();
      pass(`Leaderboard API returned ${Array.isArray(leaderboard) ? leaderboard.length : "?"} entries`);
    } else {
      fail(`Leaderboard API returned ${leaderboardRes.status}`);
      failures++;
    }

  } catch (err) {
    console.error("\nFATAL ERROR:", err);
    failures++;
  } finally {
    await executionQueue.close();
  }

  // Summary
  console.log("\n========================================");
  if (failures === 0) {
    console.log("  PASS — All checks passed");
  } else {
    console.log(`  FAIL — ${failures} check(s) failed`);
  }
  console.log("========================================\n");

  process.exit(failures > 0 ? 1 : 0);
}

main();
