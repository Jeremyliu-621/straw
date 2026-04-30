/**
 * Seed script — creates test data for local development.
 * Idempotent: safe to run multiple times.
 *
 * Creates:
 * - One company user + profile
 * - One agent builder user + profile
 * - One open task with rubric criteria
 *
 * Usage: npm run seed
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const SEED_COMPANY_EMAIL = "seed-company@straw.dev";
const SEED_AGENT_EMAIL = "seed-agent@straw.dev";

async function seed() {
  console.log("Seeding database...");

  // ── Company user ─────────────────────────────────────────
  const { data: existingCompany } = await db
    .from("users")
    .select("id")
    .eq("email", SEED_COMPANY_EMAIL)
    .single();

  let companyId: string;

  if (existingCompany) {
    companyId = existingCompany.id;
    console.log(`Company user already exists: ${companyId}`);
  } else {
    const { data: company, error } = await db
      .from("users")
      .insert({
        email: SEED_COMPANY_EMAIL,
        name: "Acme Corp",
        role: "company",
        auth_provider_id: "seed-company-auth-id",
        onboarded: true,
      })
      .select()
      .single();

    if (error) throw error;
    companyId = company.id;

    await db.from("company_profiles").insert({
      user_id: companyId,
      company_name: "Acme Corp",
      industry: "Technology",
      website: "https://acme.example.com",
      description: "A technology company looking for AI solutions.",
    });

    console.log(`Created company user: ${companyId}`);
  }

  // ── Agent builder user ───────────────────────────────────
  const { data: existingAgent } = await db
    .from("users")
    .select("id")
    .eq("email", SEED_AGENT_EMAIL)
    .single();

  let agentId: string;

  if (existingAgent) {
    agentId = existingAgent.id;
    console.log(`Agent builder already exists: ${agentId}`);
  } else {
    const { data: agent, error } = await db
      .from("users")
      .insert({
        email: SEED_AGENT_EMAIL,
        name: "Jane Builder",
        role: "agent_builder",
        auth_provider_id: "seed-agent-auth-id",
        onboarded: true,
      })
      .select()
      .single();

    if (error) throw error;
    agentId = agent.id;

    await db.from("agent_builder_profiles").insert({
      user_id: agentId,
      display_name: "Jane Builder",
      docker_image: "ghcr.io/jane/code-agent:latest",
      bio: "Building AI agents for code generation tasks.",
      categories: ["code-generation", "refactoring"],
    });

    console.log(`Created agent builder: ${agentId}`);
  }

  // ── Task with rubric ─────────────────────────────────────
  const { data: existingTask } = await db
    .from("tasks")
    .select("id")
    .eq("company_id", companyId)
    .limit(1)
    .single();

  if (existingTask) {
    console.log(`Task already exists: ${existingTask.id}`);
  } else {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const { data: task, error: taskError } = await db
      .from("tasks")
      .insert({
        company_id: companyId,
        title: "Build a CSV parser that handles edge cases correctly",
        description:
          "We need a robust CSV parser that handles quoted fields, escaped characters, multiline values, and various delimiters. The parser should return structured data with proper type inference.",
        category: "code-generation",
        input_spec: "A CSV file path provided via MAP_TASK_INPUT environment variable.",
        output_spec:
          "A JSON file at /output/result.json containing the parsed data as an array of objects.",
        test_weight: 60,
        llm_weight: 40,
        budget_cents: 50000,
        deadline: deadline.toISOString(),
        status: "open",
      })
      .select()
      .single();

    if (taskError) throw taskError;

    await db.from("rubric_criteria").insert([
      {
        task_id: task.id,
        name: "Correctness",
        description: "Does the parser handle all standard CSV edge cases?",
        weight: 40,
        position: 0,
      },
      {
        task_id: task.id,
        name: "Error Handling",
        description: "Does it fail gracefully with malformed input?",
        weight: 25,
        position: 1,
      },
      {
        task_id: task.id,
        name: "Code Quality",
        description: "Is the code clean, well-structured, and idiomatic?",
        weight: 20,
        position: 2,
      },
      {
        task_id: task.id,
        name: "Performance",
        description: "Can it handle large files efficiently?",
        weight: 15,
        position: 3,
      },
    ]);

    console.log(`Created task: ${task.id}`);
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
