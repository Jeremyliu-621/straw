import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createExecutionQueue } from "@/lib/queue";
import { env } from "@/lib/env";

/**
 * POST /api/dev/pipeline-test — Trigger an E2E pipeline test.
 * Creates test data, submits agents, and returns submission IDs for polling.
 *
 * Dev-only endpoint — returns 403 in production.
 */

const TEST_AGENTS = [
  { name: "Good Agent", email: "devtest-good@test.dev", image: "straw-test/good-agent:latest" },
  { name: "Okay Agent", email: "devtest-okay@test.dev", image: "straw-test/okay-agent:latest" },
  { name: "Sloppy Agent", email: "devtest-sloppy@test.dev", image: "straw-test/sloppy-agent:latest" },
  { name: "Crash Agent", email: "devtest-crash@test.dev", image: "straw-test/crash-agent:latest" },
];

const COMPANY_EMAIL = "devtest-company@test.dev";

export async function GET() {
  return NextResponse.json({
    message: "Pipeline test endpoint. Use POST to trigger.",
    usage: {
      llm_mode: "POST /api/dev/pipeline-test",
      container_mode: "POST /api/dev/pipeline-test?eval_mode=container",
      powershell: 'Invoke-WebRequest -Method POST -Uri http://localhost:3000/api/dev/pipeline-test',
    },
  });
}

export async function POST(req: Request) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  // Optional: pass ?eval_mode=container to test the eval container pipeline
  const url = new URL(req.url);
  const evalMode = url.searchParams.get("eval_mode") ?? "llm";
  const evalImage = url.searchParams.get("eval_image") ?? "straw-eval-example:latest";

  const db = createServiceClient();

  try {
    // Clean up previous test data
    const allEmails = [COMPANY_EMAIL, ...TEST_AGENTS.map((a) => a.email)];
    const { data: existingUsers } = await db.from("users").select("id").in("email", allEmails);
    const existingIds = existingUsers?.map((u) => u.id) ?? [];

    if (existingIds.length > 0) {
      // Cascade cleanup
      const { data: subs } = await db.from("submissions").select("id").in("agent_id", existingIds);
      const subIds = subs?.map((s) => s.id) ?? [];
      if (subIds.length > 0) {
        const { data: evals } = await db.from("evaluation_results").select("id").in("submission_id", subIds);
        const evalIds = evals?.map((e) => e.id) ?? [];
        if (evalIds.length > 0) {
          await db.from("evaluation_dimensions").delete().in("evaluation_result_id", evalIds);
        }
        await db.from("evaluation_results").delete().in("submission_id", subIds);
      }
      await db.from("submissions").delete().in("agent_id", existingIds);
      const { data: tasks } = await db.from("tasks").select("id").in("company_id", existingIds);
      const taskIds = tasks?.map((t) => t.id) ?? [];
      if (taskIds.length > 0) {
        await db.from("rubric_criteria").delete().in("task_id", taskIds);
      }
      await db.from("tasks").delete().in("company_id", existingIds);
      await db.from("company_profiles").delete().in("user_id", existingIds);
      await db.from("agent_builder_profiles").delete().in("user_id", existingIds);
      await db.from("users").delete().in("email", allEmails);
    }

    // Create company
    const { data: company, error: companyErr } = await db
      .from("users")
      .insert({
        email: COMPANY_EMAIL,
        name: "Pipeline Test Company",
        role: "company",
        auth_provider_id: "devtest-company",
        onboarded: true,
      })
      .select()
      .single();

    if (companyErr) throw new Error(`Company creation failed: ${companyErr.message}`);

    await db.from("company_profiles").insert({
      user_id: company.id,
      company_name: "Pipeline Test Co",
      industry: "Testing",
      website: "https://test.dev",
      description: "Dev pipeline test",
    });

    // Create task
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const { data: task, error: taskErr } = await db
      .from("tasks")
      .insert({
        company_id: company.id,
        title: evalMode === "llm"
          ? "Dev Pipeline Test: JSON Schema Validator"
          : "Dev Pipeline Test: Container Eval Mode",
        description: "Build a JSON schema validator. Read input from MAP_TASK_INPUT, produce structured output.",
        category: "code-generation",
        input_spec: "Validate JSON data against the provided schema definition.",
        output_spec: "JSON file at /output/result.json with validation results.",
        test_weight: 0,
        llm_weight: 100,
        budget_cents: 10000,
        deadline: deadline.toISOString(),
        status: "open",
        eval_mode: evalMode,
        eval_image: evalMode !== "llm" ? evalImage : null,
      })
      .select()
      .single();

    if (taskErr) throw new Error(`Task creation failed: ${taskErr.message}`);

    await db.from("rubric_criteria").insert([
      { task_id: task.id, name: "Correctness", description: "Is the output correct?", weight: 40, position: 0 },
      { task_id: task.id, name: "Completeness", description: "Are all requirements addressed?", weight: 30, position: 1 },
      { task_id: task.id, name: "Quality", description: "Is the output well-structured?", weight: 30, position: 2 },
    ]);

    // Create agents and submit
    const redisUrl = new URL(env.REDIS_URL);
    const queue = createExecutionQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    const submissions: Array<{ id: string; agentName: string; dockerImage: string }> = [];

    for (const agent of TEST_AGENTS) {
      const { data: user, error: userErr } = await db
        .from("users")
        .insert({
          email: agent.email,
          name: agent.name,
          role: "agent_builder",
          auth_provider_id: `devtest-${agent.email}`,
          onboarded: true,
        })
        .select()
        .single();

      if (userErr) throw new Error(`Agent ${agent.name} creation failed: ${userErr.message}`);

      await db.from("agent_builder_profiles").insert({
        user_id: user.id,
        display_name: agent.name,
        docker_image: agent.image,
        bio: `Dev test: ${agent.name}`,
        categories: ["code-generation"],
      });

      const { data: submission, error: subErr } = await db
        .from("submissions")
        .insert({
          task_id: task.id,
          agent_id: user.id,
          docker_image: agent.image,
          status: "pending",
        })
        .select()
        .single();

      if (subErr) throw new Error(`Submission for ${agent.name} failed: ${subErr.message}`);

      await queue.add(`exec-${submission.id}`, {
        submissionId: submission.id,
        taskId: task.id,
        mode: "docker" as const,
        dockerImage: agent.image,
        inputSpec: task.input_spec,
      });

      submissions.push({ id: submission.id, agentName: agent.name, dockerImage: agent.image });
    }

    await queue.close();

    return NextResponse.json({
      taskId: task.id,
      companyId: company.id,
      submissions,
    });
  } catch (err) {
    console.error("Pipeline test setup failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
