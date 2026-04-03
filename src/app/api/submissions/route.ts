import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ROLE_AGENT_BUILDER, SUBMISSION_STATUS, TASK_STATUS } from "@/constants";
import { z } from "zod/v4";
import { createExecutionQueue, type ExecutionJobData } from "@/lib/queue";
import { env } from "@/lib/env";

const createSubmissionSchema = z.object({
  task_id: z.string().uuid(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");

  const db = createServiceClient();

  if (taskId && session.user.role === ROLE_AGENT_BUILDER) {
    // Get agent's submission for a specific task
    const { data, error } = await db
      .from("submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("agent_id", session.user.supabaseId)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json(null);
    }
    if (error) {
      return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // List all submissions for the user
  const { data, error } = await db
    .from("submissions")
    .select("*")
    .eq("agent_id", session.user.supabaseId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId || session.user.role !== ROLE_AGENT_BUILDER) {
    return NextResponse.json({ error: "Only agent builders can submit" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = createServiceClient();

  // Check task exists and is open
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, input_spec")
    .eq("id", parsed.data.task_id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status !== TASK_STATUS.OPEN) {
    return NextResponse.json({ error: "Task is not accepting submissions" }, { status: 400 });
  }

  // Check agent has a docker image
  const { data: profile } = await db
    .from("agent_builder_profiles")
    .select("docker_image")
    .eq("user_id", session.user.supabaseId)
    .single();

  if (!profile?.docker_image) {
    return NextResponse.json(
      { error: "You must set a Docker image in your profile before competing" },
      { status: 400 }
    );
  }

  // Check for existing submission
  const { data: existing } = await db
    .from("submissions")
    .select("id")
    .eq("task_id", parsed.data.task_id)
    .eq("agent_id", session.user.supabaseId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You have already entered this competition" }, { status: 409 });
  }

  // Create submission
  const { data: submission, error: subError } = await db
    .from("submissions")
    .insert({
      task_id: parsed.data.task_id,
      agent_id: session.user.supabaseId,
      docker_image: profile.docker_image,
      status: SUBMISSION_STATUS.PENDING,
    })
    .select()
    .single();

  if (subError) {
    console.error("Failed to create submission:", subError);
    return NextResponse.json({ error: "Failed to enter competition" }, { status: 500 });
  }

  // Enqueue execution job
  try {
    const redisUrl = new URL(env.REDIS_URL);
    const executionQueue = createExecutionQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    const jobData: ExecutionJobData = {
      submissionId: submission.id,
      taskId: parsed.data.task_id,
      dockerImage: profile.docker_image,
      inputSpec: task.input_spec,
    };

    await executionQueue.add(`exec-${submission.id}`, jobData);
    await executionQueue.close();
  } catch (queueError) {
    console.error("Failed to enqueue execution job:", queueError);
    // Submission is created but execution won't start — update status
    await db
      .from("submissions")
      .update({ status: SUBMISSION_STATUS.FAILED, error_message: "Failed to enqueue execution" })
      .eq("id", submission.id);
    return NextResponse.json(
      { error: "Competition entered but execution failed to start" },
      { status: 500 }
    );
  }

  return NextResponse.json(submission, { status: 201 });
}
