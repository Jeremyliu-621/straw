import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  SUBMISSION_STATUS,
  UPLOAD_MAX_FILE_SIZE_MB,
  UPLOAD_STORAGE_BUCKET,
  AUDIT_ACTION,
} from "@/constants";
import { createEvaluationQueue, type EvaluationJobData } from "@/lib/queue";
import { getSubmissionStoragePath } from "@/services/upload.service";
import { env } from "@/lib/env";
import { AuditLogRepository } from "@/db/audit-log";

/**
 * POST /api/v1/submissions/[id]/upload — Upload artifact for an upload-mode submission.
 *
 * Accepts the file as raw body (application/octet-stream or multipart/form-data).
 * Stores it in Supabase Storage, updates status, and enqueues evaluation.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
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
      `Cannot upload to a submission with status "${submission.status}". Expected "registered".`,
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

  // Check Content-Length if present
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (bytes > UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024) {
      return apiError(`File exceeds ${UPLOAD_MAX_FILE_SIZE_MB}MB limit`, 413, "FILE_TOO_LARGE");
    }
  }

  // Read the body
  let fileBuffer: Buffer;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // Handle multipart upload
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("Missing 'file' field in form data", 400);
    }
    if (file.size > UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024) {
      return apiError(`File exceeds ${UPLOAD_MAX_FILE_SIZE_MB}MB limit`, 413, "FILE_TOO_LARGE");
    }
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } else {
    // Handle raw body upload (application/octet-stream, application/json, etc.)
    const arrayBuffer = await req.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
    if (fileBuffer.length > UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024) {
      return apiError(`File exceeds ${UPLOAD_MAX_FILE_SIZE_MB}MB limit`, 413, "FILE_TOO_LARGE");
    }
  }

  if (fileBuffer.length === 0) {
    return apiError("Empty file", 400);
  }

  // Upload to Supabase Storage
  const storagePath = `${getSubmissionStoragePath(submission.id)}/agent_output`;
  const { error: uploadError } = await db.storage
    .from(UPLOAD_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: contentType.includes("multipart") ? "application/octet-stream" : contentType || "application/octet-stream",
    });

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    return apiError("Failed to store upload", 500);
  }

  // Update submission status
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
    console.error("Status update failed:", updateError);
    return apiError("Upload stored but status update failed", 500);
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
    // Upload succeeded, eval will need manual trigger
  }

  // Audit (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.SUBMISSION_UPLOADED,
      resource_type: "submission",
      resource_id: submission.id,
      metadata: { task_id: submission.task_id, size_bytes: fileBuffer.length },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      id: submission.id,
      status: "completed",
      output_url: outputUrl,
      message: "Upload received, evaluation queued",
    },
    { status: 202 }
  );
}
