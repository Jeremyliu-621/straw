import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import {
  ROLE_AGENT_BUILDER,
  SUBMISSION_STATUS,
  SUBMISSION_MODE,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
  RATE_LIMIT_MAX_SUBMISSIONS,
  WEBHOOK_EVENT,
  AUDIT_ACTION,
} from "@/constants";
import { z } from "zod/v4";
import { createExecutionQueue, type ExecutionJobData } from "@/lib/queue";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildSubmissionCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";

// ── Validation schemas ────────────────────────────────────────

const baseFields = {
  task_id: z.string().uuid(),
  agent_display_name: z.string().min(1).max(100).optional(),
};

const apiSubmissionSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.API),
  api_endpoint: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), "Endpoint must use HTTPS"),
});

const dockerSubmissionSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.DOCKER),
  docker_image: z.string().min(1, "Docker image cannot be empty"),
});

const createSubmissionSchema = z.union([apiSubmissionSchema, dockerSubmissionSchema]);

// ── GET /api/submissions ──────────────────────────────────────

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");
  const db = createServiceClient();

  if (taskId && user.role === ROLE_AGENT_BUILDER) {
    const { data, error } = await db
      .from("submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("agent_id", user.supabaseId)
      .order("created_at", { ascending: false });

    if (error) return apiError("Failed to fetch submissions", 500);
    return NextResponse.json(data ?? []);
  }

  const { data, error } = await db
    .from("submissions")
    .select("*")
    .eq("agent_id", user.supabaseId)
    .order("created_at", { ascending: false });

  if (error) return apiError("Failed to fetch submissions", 500);
  return NextResponse.json(data);
}

// ── POST /api/submissions ─────────────────────────────────────

export async function POST(req: Request) {
  // Stricter rate limit for submissions — these trigger real compute (Docker/API execution)
  const rateLimited = rateLimitResponse(req, {
    maxRequests: RATE_LIMIT_MAX_SUBMISSIONS,
    prefix: "submissions",
  });
  if (rateLimited) return rateLimited;

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
  const { task_id: taskId, mode, agent_display_name } = parsed.data;
  const agentId = user.supabaseId;

  // Verify task exists and is open
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, input_spec, max_submissions_per_agent, company_id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) return apiError("Task not found", 404);
  if (task.status !== TASK_STATUS.OPEN) {
    return apiError("Task is not accepting submissions", 400, "TASK_NOT_OPEN");
  }

  // Enforce submission quota
  const { count, error: countError } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("agent_id", agentId);

  if (countError) return apiError("Failed to check submission quota", 500);

  const used = count ?? 0;
  const quota = (task.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  if (used >= quota) {
    return apiError(
      `Submission quota exhausted. You have used ${used}/${quota} submissions for this task.`,
      429,
      "QUOTA_EXHAUSTED",
      { used, limit: quota, remaining: 0 }
    );
  }

  // Block concurrent active submissions
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

  // Build insert payload based on mode
  const insertPayload =
    parsed.data.mode === SUBMISSION_MODE.API
      ? {
          task_id: taskId,
          agent_id: agentId,
          mode: SUBMISSION_MODE.API,
          api_endpoint: parsed.data.api_endpoint,
          agent_display_name: agent_display_name ?? null,
          status: SUBMISSION_STATUS.PENDING,
        }
      : {
          task_id: taskId,
          agent_id: agentId,
          mode: SUBMISSION_MODE.DOCKER,
          docker_image: parsed.data.docker_image,
          agent_display_name: agent_display_name ?? null,
          status: SUBMISSION_STATUS.PENDING,
        };

  const { data: submission, error: subError } = await db
    .from("submissions")
    .insert(insertPayload)
    .select()
    .single();

  if (subError) {
    console.error("Failed to create submission:", subError);
    return apiError("Failed to enter competition", 500);
  }

  // Enqueue execution job
  try {
    await enqueueExecution(submission.id, taskId, mode, parsed.data, task.input_spec as string);
  } catch (queueError) {
    console.error("Failed to enqueue execution job:", queueError);
    await db
      .from("submissions")
      .update({ status: SUBMISSION_STATUS.FAILED, error_message: "Failed to enqueue execution" })
      .eq("id", submission.id);
    return apiError("Competition entered but execution failed to start", 500);
  }

  // Webhook + audit (fire-and-forget)
  dispatchWebhookEvent(
    task.company_id as string,
    WEBHOOK_EVENT.SUBMISSION_CREATED,
    buildSubmissionCreatedPayload(submission.id, taskId, agentId)
  ).catch(() => {});

  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: agentId,
      action: AUDIT_ACTION.SUBMISSION_CREATED,
      resource_type: "submission",
      resource_id: submission.id,
      metadata: { task_id: taskId, mode },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      ...submission,
      quota: { used: used + 1, limit: quota, remaining: quota - used - 1 },
    },
    { status: 201 }
  );
}

// ── Queue helper ──────────────────────────────────────────────

async function enqueueExecution(
  submissionId: string,
  taskId: string,
  mode: string,
  data: z.infer<typeof createSubmissionSchema>,
  inputSpec: string
): Promise<void> {
  const redisUrl = new URL(env.REDIS_URL);
  const executionQueue = createExecutionQueue({
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  });

  const jobData: ExecutionJobData =
    mode === SUBMISSION_MODE.API
      ? {
          submissionId,
          taskId,
          inputSpec,
          mode: "api",
          apiEndpoint: (data as { api_endpoint: string }).api_endpoint,
          agentDisplayName: data.agent_display_name,
        }
      : {
          submissionId,
          taskId,
          inputSpec,
          mode: "docker",
          dockerImage: (data as { docker_image: string }).docker_image,
          agentDisplayName: data.agent_display_name,
        };

  await executionQueue.add(`exec-${submissionId}`, jobData);
  await executionQueue.close();
}
