import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createEvaluationQueue } from "@/lib/queue";
import { env } from "@/lib/env";

/**
 * POST /api/dev/pipeline-test — Trigger an E2E pipeline test.
 *
 * Creates test data, simulates agent uploads (writes output directly to storage),
 * and enqueues evaluation jobs. Tests the evaluation pipeline without needing
 * the execution worker (which no longer exists — agents upload their own work).
 *
 * Dev-only endpoint — returns 403 in production.
 */

const TEST_AGENTS = [
  {
    name: "Good Agent",
    email: "devtest-good@test.dev",
    output: '# SUBMISSION.md\n\n## What I Built\nA comprehensive JSON schema validator with recursive validation, type checking, and detailed error reporting.\n\n## How To Run\nnpm install && npm start\n\n## Architecture\nParser → Validator → Reporter pipeline. Uses recursive descent for nested schemas.\n\n## What Works\n- Full JSON Schema draft-07 support\n- Recursive validation\n- Detailed error paths\n\n## Known Limitations\n- No $ref resolution\n\n## Tradeoffs\nChose completeness over performance. Validates correctly but could be faster.',
  },
  {
    name: "Okay Agent",
    email: "devtest-okay@test.dev",
    output: '# SUBMISSION.md\n\n## What I Built\nA basic JSON validator that checks types.\n\n## How To Run\npython validate.py\n\n## Architecture\nSingle file script.\n\n## What Works\n- Basic type checking\n- Required field validation\n\n## Known Limitations\n- No nested schema support\n- No enum or pattern validation\n\n## Tradeoffs\nKept it simple.',
  },
  {
    name: "Sloppy Agent",
    email: "devtest-sloppy@test.dev",
    output: '# SUBMISSION.md\n\n## What I Built\nValidator.\n\n## How To Run\nrun it\n\n## Architecture\nOne function.\n\n## What Works\nSome things.\n\n## Known Limitations\nMany.\n\n## Tradeoffs\nSpeed.',
  },
  {
    name: "Crash Agent",
    email: "devtest-crash@test.dev",
    output: "", // Empty submission — should score poorly
  },
];

const COMPANY_EMAIL = "devtest-company@test.dev";
const STORAGE_BUCKET = "agent-outputs";

export async function GET() {
  return NextResponse.json({
    message: "Pipeline test endpoint. Use POST to trigger.",
    usage: {
      default: "POST /api/dev/pipeline-test",
      container_mode: "POST /api/dev/pipeline-test?eval_mode=container",
      powershell: "Invoke-WebRequest -Method POST -Uri http://localhost:3000/api/dev/pipeline-test",
    },
  });
}

export async function POST(req: Request) {
  if (env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

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
        title: "Dev Pipeline Test: JSON Schema Validator",
        description: "Build a JSON schema validator. Read the input specification and produce a working implementation.",
        category: "code-generation",
        input_spec: "Validate JSON data against the provided schema definition.",
        output_spec: "A working JSON schema validator with documentation.",
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
      { task_id: task.id, name: "Correctness", description: "Does the solution work correctly?", weight: 40, position: 0 },
      { task_id: task.id, name: "Completeness", description: "Are all requirements addressed?", weight: 30, position: 1 },
      { task_id: task.id, name: "Quality", description: "Is the code/documentation well-structured?", weight: 30, position: 2 },
    ]);

    // Create agents, simulate uploads, enqueue evaluation
    const redisUrl = new URL(env.REDIS_URL);
    const evalQueue = createEvaluationQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    // Ensure storage bucket exists
    const { data: buckets } = await db.storage.listBuckets();
    if (!buckets?.some((b) => b.name === STORAGE_BUCKET)) {
      await db.storage.createBucket(STORAGE_BUCKET, { public: false });
    }

    const submissions: Array<{ id: string; agentName: string }> = [];

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
        bio: `Dev test: ${agent.name}`,
        categories: ["code-generation"],
      });

      // Create submission in upload mode — simulate the agent having already uploaded
      const status = agent.output ? "completed" : "failed";

      const { data: submission, error: subErr } = await db
        .from("submissions")
        .insert({
          task_id: task.id,
          agent_id: user.id,
          mode: "upload",
          status,
          agent_display_name: agent.name,
          error_message: agent.output ? null : "Empty submission — no output uploaded",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (subErr) throw new Error(`Submission for ${agent.name} failed: ${subErr.message}`);

      // Upload simulated output to storage
      if (agent.output) {
        const storagePath = `submissions/${submission.id}`;

        await db.storage
          .from(STORAGE_BUCKET)
          .upload(`${storagePath}/SUBMISSION.md`, agent.output, {
            upsert: true,
            contentType: "text/markdown",
          });

        // Update output_url
        await db
          .from("submissions")
          .update({ output_url: storagePath })
          .eq("id", submission.id);

        // Enqueue evaluation
        await evalQueue.add(`eval-${submission.id}`, {
          submissionId: submission.id,
          taskId: task.id,
          outputUrl: storagePath,
        });
      }

      submissions.push({ id: submission.id, agentName: agent.name });
    }

    await evalQueue.close();

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
