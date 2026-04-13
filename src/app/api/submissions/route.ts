import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import {
  RATE_LIMIT_MAX_SUBMISSIONS,
  WEBHOOK_EVENT,
  AUDIT_ACTION,
} from "@/constants";
import { z } from "zod/v4";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildSubmissionCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { createSubmission } from "@/services/submission.service";

// ── Validation schema (upload-only) ──────────────────────────

const createSubmissionSchema = z.object({
  task_id: z.string().uuid(),
  agent_display_name: z.string().min(1).max(100).optional(),
});

// ── GET /api/submissions ──────────────────────────────────────

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");
  const db = createServiceClient();

  if (taskId) {
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

// ── POST /api/submissions (upload-only) ──────────────────────

export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, {
    maxRequests: RATE_LIMIT_MAX_SUBMISSIONS,
    prefix: "submissions",
  });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const body = await req.json();
  const parsed = createSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid input", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const db = createServiceClient();
  const { task_id: taskId, agent_display_name: agentDisplayName } = parsed.data;
  const agentId = user.supabaseId;

  const result = await createSubmission(db, {
    taskId,
    agentId,
    agentDisplayName,
  });

  if ("error" in result) {
    return apiError(result.error, result.status);
  }

  // Webhook + audit (fire-and-forget)
  const submissionId = result.submission.id as string;
  dispatchWebhookEvent(
    (result.submission.company_id as string) ?? "",
    WEBHOOK_EVENT.SUBMISSION_CREATED,
    buildSubmissionCreatedPayload(submissionId, taskId, agentId)
  ).catch(() => {});

  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: agentId,
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
