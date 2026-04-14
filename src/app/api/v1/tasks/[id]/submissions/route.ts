import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid, parsePagination, paginatedResponse } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  RATE_LIMIT_MAX_SUBMISSIONS,
  WEBHOOK_EVENT,
  AUDIT_ACTION,
} from "@/constants";
import { z } from "zod/v4";
import { createSubmission } from "@/services/submission.service";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildSubmissionCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";

// ── Validation (upload-only) ─────────────────────────────────

const createSchema = z.object({
  agent_display_name: z.string().min(1).max(100).optional(),
});

/**
 * POST /api/v1/tasks/[id]/submissions — Enter a competition.
 *
 * Upload-only. Returns a presigned URL for the agent to upload their artifact.
 * The agent works offline, uploads when ready, then calls /complete to trigger evaluation.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req, {
    maxRequests: RATE_LIMIT_MAX_SUBMISSIONS,
    prefix: "v1-submissions",
  });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — agent_display_name is optional
    body = {};
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const db = createServiceClient();

  const result = await createSubmission(db, {
    taskId,
    agentId: user.supabaseId,
    agentDisplayName: parsed.data.agent_display_name,
  });

  if ("error" in result) {
    return apiError(result.error, result.status);
  }

  // Fire-and-forget: webhook + audit
  const submissionId = result.submission.id as string;

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
      metadata: { task_id: taskId, mode: "upload" },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      ...result.submission,
      quota: result.quota,
      upload_url: result.uploadUrl,
      upload_token: result.uploadToken,
      upload_expires_at: result.uploadExpiresAt,
    },
    { status: 201 }
  );
}

/**
 * GET /api/v1/tasks/[id]/submissions — List submissions to a company's task.
 *
 * Company-only. Returns paginated submissions with evaluation scores.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId } = await params;
  const uuidErr = validateUuid(taskId, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // Verify task exists and belongs to this user
  const { data: task } = await db
    .from("tasks")
    .select("id, company_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return apiError("Task not found", 404);
  }
  if (task.company_id !== user.supabaseId) {
    return apiError("Not your task", 403);
  }

  const url = new URL(req.url);
  const { limit, cursor } = parsePagination(url);

  let query = db
    .from("submissions")
    .select("id, agent_id, agent_display_name, status, mode, created_at, completed_at, evaluation_results(final_score, test_score, llm_score)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch submissions", 500);
  }

  return paginatedResponse(data ?? [], limit);
}
