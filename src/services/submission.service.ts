import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBMISSION_STATUS,
  SUBMISSION_MODE,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
} from "@/constants";
import { generatePresignedUploadUrl } from "@/services/upload.service";

// ── Types ────────────────────────────────────────────────────

export interface SubmissionTask {
  id: string;
  status: string;
  input_spec: string | null;
  max_submissions_per_agent: number | null;
  company_id: string | null;
  deadline: string | null;
}

export interface SubmissionQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface CreateSubmissionInput {
  taskId: string;
  agentId: string;
  agentDisplayName?: string;
}

export interface CreateSubmissionResult {
  submission: Record<string, unknown>;
  quota: SubmissionQuota;
  uploadUrl?: string;
  uploadToken?: string;
  uploadExpiresAt?: string;
}

// ── Validation ───────────────────────────────────────────────

/**
 * Verify task exists and is accepting submissions.
 */
export async function validateTaskAcceptsSubmissions(
  db: SupabaseClient,
  taskId: string
): Promise<{ task: SubmissionTask } | { error: string; status: number; code: string }> {
  const { data: task, error } = await db
    .from("tasks")
    .select("id, status, input_spec, max_submissions_per_agent, company_id, deadline")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    return { error: "Task not found", status: 404, code: "NOT_FOUND" };
  }

  if (task.status !== TASK_STATUS.OPEN) {
    return { error: "Task is not accepting submissions", status: 400, code: "TASK_NOT_OPEN" };
  }

  return { task: task as SubmissionTask };
}

/**
 * Check how many submissions an agent has made and enforce quota.
 */
export async function checkSubmissionQuota(
  db: SupabaseClient,
  taskId: string,
  agentId: string,
  task: SubmissionTask
): Promise<{ quota: SubmissionQuota } | { error: string; status: number; code: string; details: SubmissionQuota }> {
  const { count, error } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("agent_id", agentId);

  if (error) {
    return { error: "Failed to check submission quota", status: 500, code: "INTERNAL_ERROR", details: { used: 0, limit: 0, remaining: 0 } };
  }

  const used = count ?? 0;
  const limit = task.max_submissions_per_agent ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  if (used >= limit) {
    return {
      error: `Submission quota exhausted. You have used ${used}/${limit} submissions for this task.`,
      status: 429,
      code: "QUOTA_EXHAUSTED",
      details: { used, limit, remaining: 0 },
    };
  }

  return { quota: { used, limit, remaining: limit - used } };
}

/**
 * Block if the agent has a submission currently in progress (pending, running, or registered).
 */
export async function checkNoActiveSubmission(
  db: SupabaseClient,
  taskId: string,
  agentId: string
): Promise<{ error: string; status: number; code: string } | null> {
  const { data: active } = await db
    .from("submissions")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("agent_id", agentId)
    .in("status", [
      SUBMISSION_STATUS.PENDING,
      SUBMISSION_STATUS.RUNNING,
      SUBMISSION_STATUS.REGISTERED,
    ])
    .limit(1)
    .maybeSingle();

  if (active) {
    return {
      error: "You already have a submission in progress for this task",
      status: 409,
      code: "SUBMISSION_IN_PROGRESS",
    };
  }

  return null;
}

/**
 * Create an upload-mode submission.
 * Returns the submission record + presigned upload URL.
 */
export async function createSubmission(
  db: SupabaseClient,
  input: CreateSubmissionInput
): Promise<CreateSubmissionResult | { error: string; status: number }> {
  const { taskId, agentId, agentDisplayName } = input;

  // Validate task
  const taskResult = await validateTaskAcceptsSubmissions(db, taskId);
  if ("error" in taskResult) {
    return { error: taskResult.error, status: taskResult.status };
  }
  const { task } = taskResult;

  // Check quota
  const quotaResult = await checkSubmissionQuota(db, taskId, agentId, task);
  if ("error" in quotaResult) {
    return { error: quotaResult.error, status: quotaResult.status };
  }
  const { quota } = quotaResult;

  // Check no active submission
  const activeCheck = await checkNoActiveSubmission(db, taskId, agentId);
  if (activeCheck) {
    return { error: activeCheck.error, status: activeCheck.status };
  }

  // Insert submission — always upload mode, always starts as registered
  const { data: submission, error: subError } = await db
    .from("submissions")
    .insert({
      task_id: taskId,
      agent_id: agentId,
      mode: SUBMISSION_MODE.UPLOAD,
      agent_display_name: agentDisplayName ?? null,
      status: SUBMISSION_STATUS.REGISTERED,
    })
    .select()
    .single();

  if (subError || !submission) {
    console.error("Failed to create submission:", subError);
    return { error: "Failed to enter competition", status: 500 };
  }

  // Generate presigned upload URL
  const presigned = await generatePresignedUploadUrl(db, submission.id as string, task.deadline);

  // Store token for verification
  await db
    .from("submissions")
    .update({ upload_token: presigned.token })
    .eq("id", submission.id);

  return {
    submission,
    quota: { used: quota.used + 1, limit: quota.limit, remaining: quota.remaining - 1 },
    uploadUrl: presigned.signedUrl,
    uploadToken: presigned.token,
    uploadExpiresAt: presigned.expiresAt,
  };
}
