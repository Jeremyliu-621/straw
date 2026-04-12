import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  ROLE_AGENT_BUILDER,
  SUBMISSION_MODE,
  RATE_LIMIT_MAX_SUBMISSIONS,
  WEBHOOK_EVENT,
  AUDIT_ACTION,
} from "@/constants";
import { z } from "zod/v4";
import { createSubmission } from "@/services/submission.service";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildSubmissionCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";

// ── Validation ────────────────────────────────────────────────

const baseFields = {
  agent_display_name: z.string().min(1).max(100).optional(),
};

const apiSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.API),
  api_endpoint: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), "Endpoint must use HTTPS"),
});

const dockerSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.DOCKER),
  docker_image: z.string().min(1, "Docker image cannot be empty"),
});

const uploadSchema = z.object({
  ...baseFields,
  mode: z.literal(SUBMISSION_MODE.UPLOAD),
});

const createSchema = z.union([apiSchema, dockerSchema, uploadSchema]);

/**
 * POST /api/v1/tasks/[id]/submissions — Enter a competition.
 *
 * Supports all three modes: api, docker, upload.
 * Upload mode returns a presigned URL for the agent to PUT their artifact.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, {
    maxRequests: RATE_LIMIT_MAX_SUBMISSIONS,
    prefix: "v1-submissions",
  });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId || user.role !== ROLE_AGENT_BUILDER) {
    return apiError("Only agent builders can submit", 403);
  }

  const { id: taskId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const db = createServiceClient();
  const { mode, agent_display_name: agentDisplayName } = parsed.data;

  const result = await createSubmission(db, {
    taskId,
    agentId: user.supabaseId,
    mode,
    agentDisplayName,
    dockerImage: "docker_image" in parsed.data ? parsed.data.docker_image : undefined,
    apiEndpoint: "api_endpoint" in parsed.data ? parsed.data.api_endpoint : undefined,
  });

  if ("error" in result) {
    return apiError(result.error, result.status);
  }

  // Fire-and-forget: webhook + audit
  const submissionId = result.submission.id as string;

  // Look up task owner for company webhook
  const { data: taskData } = await db
    .from("tasks")
    .select("company_id")
    .eq("id", taskId)
    .single();

  if (taskData?.company_id) {
    dispatchWebhookEvent(
      taskData.company_id as string,
      WEBHOOK_EVENT.SUBMISSION_CREATED,
      buildSubmissionCreatedPayload(submissionId, taskId, user.supabaseId)
    ).catch(() => {});
  }

  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.SUBMISSION_CREATED,
      resource_type: "submission",
      resource_id: submissionId,
      metadata: { task_id: taskId, mode },
    })
    .catch(() => {});

  // Build response
  const response: Record<string, unknown> = {
    ...result.submission,
    quota: result.quota,
  };

  if (result.uploadUrl) {
    response.upload_url = result.uploadUrl;
    response.upload_token = result.uploadToken;
    response.upload_expires_at = result.uploadExpiresAt;
  }

  return NextResponse.json(response, { status: 201 });
}
