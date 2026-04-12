import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  ROLE_AGENT_BUILDER,
  SUBMISSION_STATUS,
  AUDIT_ACTION,
} from "@/constants";
import { createEvaluationQueue, type EvaluationJobData } from "@/lib/queue";
import { verifyUploadExists, getSubmissionStoragePath } from "@/services/upload.service";
import { env } from "@/lib/env";
import { AuditLogRepository } from "@/db/audit-log";

/**
 * POST /api/v1/submissions/[id]/complete — Signal that an upload-mode submission is ready.
 *
 * For agents who uploaded their artifact directly via the presigned URL
 * (instead of POST /upload). Verifies the file exists in storage,
 * transitions status to completed, and enqueues evaluation.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId || user.role !== ROLE_AGENT_BUILDER) {
    return apiError("Only agent builders can complete submissions", 403);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch submission
  const { data: submission, error } = await db
    .from("submissions")
    .select("id, agent_id, task_id, status, mode")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return apiError("Submission not found", 404);
  }

  // Validate ownership
  if (submission.agent_id !== user.supabaseId) {
    return apiError("Not your submission", 403);
  }

  // Validate status
  if (submission.status !== SUBMISSION_STATUS.REGISTERED) {
    return apiError(
      `Cannot complete a submission with status "${submission.status}". Expected "registered".`,
      409,
      "INVALID_STATUS"
    );
  }

  // Validate deadline not passed
  const { data: task } = await db
    .from("tasks")
    .select("deadline")
    .eq("id", submission.task_id)
    .single();

  if (task?.deadline && new Date(task.deadline) < new Date()) {
    return apiError("Task deadline has passed", 410, "DEADLINE_PASSED");
  }

  // Verify file was uploaded via presigned URL
  const exists = await verifyUploadExists(db, submission.id);
  if (!exists) {
    return apiError(
      "No file found. Upload your artifact to the presigned URL before calling /complete.",
      400,
      "NO_UPLOAD_FOUND"
    );
  }

  // Update submission
  const outputUrl = getSubmissionStoragePath(submission.id);
  const { error: updateError } = await db
    .from("submissions")
    .update({
      status: SUBMISSION_STATUS.COMPLETED,
      output_url: outputUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateError) {
    return apiError("Failed to update submission status", 500);
  }

  // Enqueue evaluation
  try {
    const redisUrl = new URL(env.REDIS_URL);
    const evalQueue = createEvaluationQueue({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
    });

    const evalJob: EvaluationJobData = {
      submissionId: submission.id,
      taskId: submission.task_id,
      outputUrl,
    };

    await evalQueue.add(`eval-${submission.id}`, evalJob);
    await evalQueue.close();
  } catch (queueError) {
    console.error("Failed to enqueue evaluation:", queueError);
  }

  // Audit (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.SUBMISSION_UPLOADED,
      resource_type: "submission",
      resource_id: submission.id,
      metadata: { task_id: submission.task_id, via: "presigned_url" },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      id: submission.id,
      status: "completed",
      output_url: outputUrl,
      message: "Upload verified, evaluation queued",
    },
    { status: 202 }
  );
}
