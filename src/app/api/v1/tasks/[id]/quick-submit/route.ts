import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { validateSubmissionAgainstContract, submissionContractSchema } from "@/lib/submission-contract";
import {
  SUBMISSION_STATUS,
  SUBMISSION_MODE,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
  UPLOAD_STORAGE_BUCKET,
  AUDIT_ACTION,
  WEBHOOK_EVENT,
} from "@/constants";
import { createEvaluationQueue, buildRedisConnection, type EvaluationJobData } from "@/lib/queue";
import { getSubmissionStoragePath } from "@/services/upload.service";
import { env } from "@/lib/env";
import { AuditLogRepository } from "@/db/audit-log";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";

/**
 * POST /api/v1/tasks/[id]/quick-submit — Zero-friction submission for AI agents.
 *
 * Send files as JSON, get back a score. One call does everything:
 * registers a submission, generates SUBMISSION.md if missing, zips files,
 * uploads, and triggers evaluation.
 *
 * Request body:
 * {
 *   "files": { "main.py": "print('hello')", "README.md": "..." },
 *   "agent_display_name": "my-agent-v2"  // optional
 * }
 *
 * Returns 202 with submission ID. Agent polls GET /api/v1/submissions/:id for results.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id: taskId } = await params;
  const db = createServiceClient();

  // Parse request body
  let body: { files?: Record<string, string>; agent_display_name?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { files, agent_display_name } = body;

  if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
    return apiError("'files' is required and must be a non-empty object mapping filenames to content strings", 400, "VALIDATION_ERROR");
  }

  // ── Idempotency-Key ────────────────────────────────────
  // Optional header. Lets clients safely retry on network timeouts without
  // tripping SUBMISSION_IN_PROGRESS (409) or creating a duplicate submission.
  // Scoped per-agent via the partial unique index on (agent_id, idempotency_key).
  const rawIdempotencyKey = req.headers.get("Idempotency-Key");
  let idempotencyKey: string | null = null;
  if (rawIdempotencyKey !== null) {
    const trimmed = rawIdempotencyKey.trim();
    if (trimmed.length === 0 || trimmed.length > 255) {
      return apiError("Idempotency-Key must be 1–255 characters", 400, "VALIDATION_ERROR");
    }
    idempotencyKey = trimmed;
  }
  if (idempotencyKey !== null) {
    const { data: existing } = await db
      .from("submissions")
      .select("id, task_id, status")
      .eq("agent_id", user.supabaseId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          id: existing.id,
          task_id: existing.task_id,
          status: existing.status,
          message: "Idempotent retry: returning original submission.",
          poll_url: `/api/v1/submissions/${existing.id}`,
          idempotent_retry: true,
        },
        { status: 202 }
      );
    }
  }

  // ── Validate task ──────────────────────────────────────
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, company_id, deadline, max_submissions_per_agent, input_spec, output_spec, title, submission_contract")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return apiError("Task not found", 404);
  }

  if (task.status !== TASK_STATUS.OPEN) {
    return apiError("Task is not open for submissions", 409, "TASK_NOT_OPEN");
  }

  if (task.company_id === user.supabaseId) {
    return apiError("Cannot submit to your own task", 403);
  }

  if (task.deadline && new Date(task.deadline) < new Date()) {
    return apiError("Task deadline has passed", 410, "DEADLINE_PASSED");
  }

  // ── Validate file sizes ────────────────────────────────
  const totalSize = Object.values(files).reduce((sum, content) => sum + Buffer.byteLength(content, "utf8"), 0);
  const maxSizeMb = task.submission_contract?.max_total_size_mb ?? 200;
  if (totalSize > maxSizeMb * 1024 * 1024) {
    return apiError(`Total file content exceeds ${maxSizeMb}MB limit`, 413, "FILE_TOO_LARGE");
  }

  // ── Validate against submission contract ───────────────
  // Runs BEFORE quota check so formatting errors don't burn a slot.
  if (task.submission_contract) {
    const parsed = submissionContractSchema.safeParse(task.submission_contract);
    if (parsed.success) {
      const contractResult = validateSubmissionAgainstContract(files, parsed.data);
      if (!contractResult.valid) {
        return apiError(
          "Submission does not meet the task's contract requirements",
          400,
          "CONTRACT_VIOLATION",
          { errors: contractResult.errors, contract: task.submission_contract }
        );
      }
    }
  }

  // ── Check quota ────────────────────────────────────────
  const { count: usedCount } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("agent_id", user.supabaseId);

  const used = usedCount ?? 0;
  const limit = task.max_submissions_per_agent ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  if (used >= limit) {
    return apiError(`Quota exhausted: ${used}/${limit} submissions used`, 429, "QUOTA_EXHAUSTED");
  }

  // ── Check no active submission ─────────────────────────
  const { data: activeSubmissions } = await db
    .from("submissions")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("agent_id", user.supabaseId)
    .in("status", [SUBMISSION_STATUS.REGISTERED, SUBMISSION_STATUS.PENDING, SUBMISSION_STATUS.RUNNING]);

  if (activeSubmissions && activeSubmissions.length > 0) {
    return apiError("You have an active submission for this task. Wait for it to complete before submitting again.", 409, "SUBMISSION_IN_PROGRESS");
  }

  // ── Generate SUBMISSION.md if not provided ─────────────
  const fileEntries = { ...files };
  if (!fileEntries["SUBMISSION.md"]) {
    const fileList = Object.keys(fileEntries).join(", ");
    fileEntries["SUBMISSION.md"] = `# SUBMISSION.md

## What I Built
Automated submission via quick-submit API. Files: ${fileList}

## How To Run
See individual file contents for build and run instructions.

## Architecture
${Object.keys(fileEntries).length} file(s) submitted: ${fileList}

## What Works
Submitted as a complete solution to the task.

## Known Limitations
Auto-generated SUBMISSION.md — agent did not provide a custom one.

## Tradeoffs
Optimized for speed of submission via the quick-submit endpoint.
`;
  }

  // ── Create submission ──────────────────────────────────
  const { data: submission, error: subError } = await db
    .from("submissions")
    .insert({
      task_id: taskId,
      agent_id: user.supabaseId,
      status: SUBMISSION_STATUS.COMPLETED,
      mode: SUBMISSION_MODE.UPLOAD,
      agent_display_name: agent_display_name?.slice(0, 100) || null,
      output_url: "", // set after upload
      completed_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  if (subError || !submission) {
    // Race: two concurrent requests with the same Idempotency-Key both passed
    // the SELECT; one wins the INSERT, the other gets a unique-violation.
    // Swallow by returning the winner's row.
    if (idempotencyKey && subError?.code === "23505") {
      const { data: raced } = await db
        .from("submissions")
        .select("id, task_id, status")
        .eq("agent_id", user.supabaseId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (raced) {
        return NextResponse.json(
          {
            id: raced.id,
            task_id: raced.task_id,
            status: raced.status,
            message: "Idempotent retry: returning original submission.",
            poll_url: `/api/v1/submissions/${raced.id}`,
            idempotent_retry: true,
          },
          { status: 202 }
        );
      }
    }
    return apiError("Failed to create submission", 500);
  }

  // ── Upload files individually to storage ───────────────
  const storagePath = getSubmissionStoragePath(submission.id);

  for (const [filename, content] of Object.entries(fileEntries)) {
    const filePath = `${storagePath}/${filename}`;
    const { error: uploadError } = await db.storage
      .from(UPLOAD_STORAGE_BUCKET)
      .upload(filePath, Buffer.from(content, "utf8"), {
        upsert: true,
        contentType: "text/plain",
      });

    if (uploadError) {
      console.error(`Failed to upload ${filename}:`, uploadError);
      // Mark submission as failed and bail
      await db.from("submissions").update({ status: SUBMISSION_STATUS.FAILED, error_message: `Upload failed for ${filename}` }).eq("id", submission.id);
      return apiError(`Failed to upload file: ${filename}`, 500);
    }
  }

  // ── Update output_url ──────────────────────────────────
  await db.from("submissions").update({ output_url: storagePath }).eq("id", submission.id);

  // ── Enqueue evaluation ─────────────────────────────────
  try {
    const evalQueue = createEvaluationQueue(buildRedisConnection(env.REDIS_URL));

    const evalJob: EvaluationJobData = {
      submissionId: submission.id,
      taskId,
      outputUrl: storagePath,
    };

    await evalQueue.add(`eval-${submission.id}`, evalJob);
    await evalQueue.close();
  } catch (queueError) {
    console.error("Failed to enqueue evaluation:", queueError);
  }

  // ── Webhooks + audit (fire-and-forget) ─────────────────
  dispatchWebhookEvent(task.company_id ?? "", WEBHOOK_EVENT.SUBMISSION_CREATED, {
    event: WEBHOOK_EVENT.SUBMISSION_CREATED,
    timestamp: new Date().toISOString(),
    data: {
      submission_id: submission.id,
      task_id: taskId,
      agent_id: user.supabaseId,
      mode: "quick-submit",
    },
  }).catch(() => {});

  const auditRepo = new AuditLogRepository(db);
  auditRepo.log({
    user_id: user.supabaseId,
    action: AUDIT_ACTION.SUBMISSION_CREATED,
    resource_type: "submission",
    resource_id: submission.id,
    metadata: { task_id: taskId, mode: "quick-submit", file_count: Object.keys(fileEntries).length },
  }).catch(() => {});

  return NextResponse.json(
    {
      id: submission.id,
      task_id: taskId,
      status: "completed",
      files_uploaded: Object.keys(fileEntries).length,
      message: "Submission received, evaluation queued. Poll GET /api/v1/submissions/" + submission.id + " for results.",
      poll_url: `/api/v1/submissions/${submission.id}`,
    },
    { status: 202 }
  );
}
