import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import {
  ROLE_AGENT_BUILDER,
  SUBMISSION_STATUS,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
  WEBHOOK_EVENT,
  AUDIT_ACTION,
} from "@/constants";
import { z } from "zod/v4";
import { createExecutionQueue, type ExecutionJobData } from "@/lib/queue";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-utils";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildSubmissionCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";

const createSubmissionSchema = z.object({
  task_id: z.string().uuid(),
  docker_image: z
    .string()
    .min(1, "Docker image name cannot be empty")
    .optional(),
});

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");

  const db = createServiceClient();

  if (taskId && user.role === ROLE_AGENT_BUILDER) {
    // Get agent's submissions for a specific task (returns array for multi-submission model)
    const { data, error } = await db
      .from("submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("agent_id", user.supabaseId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("Failed to fetch submissions", 500);
    }
    return NextResponse.json(data ?? []);
  }

  // List all submissions for the user
  const { data, error } = await db
    .from("submissions")
    .select("*")
    .eq("agent_id", user.supabaseId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("Failed to fetch submissions", 500);
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId || user.role !== ROLE_AGENT_BUILDER) {
    return apiError("Only agent builders can submit", 403);
  }

  const body = await req.json();
  const parsed = createSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid input", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const db = createServiceClient();
  const taskId = parsed.data.task_id;
  const agentId = user.supabaseId;

  // Check task exists and is open, including quota setting
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, input_spec, max_submissions_per_agent, company_id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return apiError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.OPEN) {
    return apiError("Task is not accepting submissions", 400, "TASK_NOT_OPEN");
  }

  // Determine Docker image: use per-submission override or fall back to profile default
  let dockerImage = parsed.data.docker_image;

  if (!dockerImage) {
    const { data: profile } = await db
      .from("agent_builder_profiles")
      .select("docker_image")
      .eq("user_id", agentId)
      .single();

    dockerImage = profile?.docker_image ?? undefined;
  }

  if (!dockerImage) {
    return apiError(
      "No Docker image specified. Either pass docker_image in the request body or set a default in your profile.",
      400,
      "NO_DOCKER_IMAGE"
    );
  }

  // Count agent's existing submissions for this task
  const { count, error: countError } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("agent_id", agentId);

  if (countError) {
    return apiError("Failed to check submission quota", 500);
  }

  const used = count ?? 0;
  const quota = (task.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  // Check quota
  if (used >= quota) {
    return apiError(
      `Submission quota exhausted. You have used ${used}/${quota} submissions for this task.`,
      429,
      "QUOTA_EXHAUSTED",
      { used, limit: quota, remaining: 0 }
    );
  }

  // Check for active submission (pending or running) to prevent concurrent runs
  const { data: activeSubmission } = await db
    .from("submissions")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("agent_id", agentId)
    .in("status", [SUBMISSION_STATUS.PENDING, SUBMISSION_STATUS.RUNNING])
    .limit(1)
    .maybeSingle();

  if (activeSubmission) {
    return apiError(
      "You already have a submission in progress for this task",
      409,
      "SUBMISSION_IN_PROGRESS"
    );
  }

  // Create new submission (always insert, never update)
  const { data: submission, error: subError } = await db
    .from("submissions")
    .insert({
      task_id: taskId,
      agent_id: agentId,
      docker_image: dockerImage,
      status: SUBMISSION_STATUS.PENDING,
    })
    .select()
    .single();

  if (subError) {
    console.error("Failed to create submission:", subError);
    return apiError("Failed to enter competition", 500);
  }

  // Enqueue execution job
  try {
    await enqueueExecution(submission.id, taskId, dockerImage, task.input_spec);
  } catch (queueError) {
    console.error("Failed to enqueue execution job:", queueError);
    await db
      .from("submissions")
      .update({ status: SUBMISSION_STATUS.FAILED, error_message: "Failed to enqueue execution" })
      .eq("id", submission.id);
    return apiError("Competition entered but execution failed to start", 500);
  }

  // Dispatch webhook event (fire-and-forget)
  dispatchWebhookEvent(
    task.company_id as string,
    WEBHOOK_EVENT.SUBMISSION_CREATED,
    buildSubmissionCreatedPayload(submission.id, taskId, agentId)
  ).catch(() => {
    // Intentionally swallowed — dispatchWebhookEvent already handles errors
  });

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: agentId,
      action: AUDIT_ACTION.SUBMISSION_CREATED,
      resource_type: "submission",
      resource_id: submission.id,
      metadata: { task_id: taskId, docker_image: dockerImage },
    })
    .catch((err) => console.error("[audit] Failed to log submission creation:", err));

  return NextResponse.json(
    {
      ...submission,
      quota: { used: used + 1, limit: quota, remaining: quota - used - 1 },
    },
    { status: 201 }
  );
}

async function enqueueExecution(
  submissionId: string,
  taskId: string,
  dockerImage: string,
  inputSpec: string
): Promise<void> {
  const redisUrl = new URL(env.REDIS_URL);
  const executionQueue = createExecutionQueue({
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  });

  const jobData: ExecutionJobData = {
    submissionId,
    taskId,
    dockerImage,
    inputSpec,
  };

  await executionQueue.add(`exec-${submissionId}`, jobData);
  await executionQueue.close();
}
