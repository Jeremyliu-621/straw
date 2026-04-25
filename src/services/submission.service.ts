import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBMISSION_STATUS,
  SUBMISSION_MODE,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
  UPLOAD_STORAGE_BUCKET,
} from "@/constants";
import { generatePresignedUploadUrl } from "@/services/upload.service";

// ── Submission Detail (read-side, shared by GET + SSE) ──────

export interface SubmissionDimension {
  criterion_name: string;
  criterion_description: string | null;
  weight: number;
  score: number;
  reasoning: string | null;
}

export interface SubmissionScores {
  final_score: number;
  test_score: number | null;
  llm_score: number | null;
  container_score: number | null;
  breakdown: Record<string, number> | null;
  container_tests: unknown;
  container_notes: string | null;
  eval_mode: string | null;
  evaluated_at: string;
}

export interface SubmissionResumeInfo {
  /** Fresh presigned URL the agent can PUT their artifact to. */
  url: string;
  /** Storage token (informational; signed-URL is what the request needs). */
  token: string;
  /** Object path within the upload bucket. */
  path: string;
  /** ISO timestamp the URL expires. */
  expires_at: string;
}

export interface SubmissionDetail {
  id: string;
  task_id: string;
  status: string;
  mode: string;
  agent_display_name: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  evaluated: boolean;
  scores: SubmissionScores | null;
  dimensions: SubmissionDimension[];
  position: number | null;
  quota: SubmissionQuota;
  /**
   * Present (and includes a fresh presigned URL) when the submission is
   * registered but no artifact has been uploaded yet — the resumable case
   * from D28. Null for any other state.
   */
  resume: SubmissionResumeInfo | null;
}

export type SubmissionFetchError =
  | { kind: "not_found" }
  | { kind: "forbidden" };

/**
 * Read the full submission detail for a given agent, exactly as agents see
 * it via `GET /api/v1/submissions/[id]` and the SSE stream. Returns the same
 * shape so both endpoints emit consistent payloads.
 *
 * The agentId is the authenticated caller's user id; the function enforces
 * ownership at the data layer (route-level checks are still appropriate).
 */
export async function fetchSubmissionDetail(
  db: SupabaseClient,
  submissionId: string,
  agentId: string
): Promise<SubmissionDetail | SubmissionFetchError> {
  const { data: submission, error } = await db
    .from("submissions")
    .select(
      "id, task_id, agent_id, status, mode, agent_display_name, output_url, error_message, started_at, completed_at, created_at"
    )
    .eq("id", submissionId)
    .single();

  if (error || !submission) return { kind: "not_found" };
  if (submission.agent_id !== agentId) return { kind: "forbidden" };

  // Resume info (D28): when status=registered AND no artifact uploaded yet,
  // mint a fresh presigned URL so daemons can recover from a lost upload_url
  // without re-creating the submission. Bounded cost — the field disappears
  // after upload + status flips, which is the typical few-minute window.
  let resume: SubmissionResumeInfo | null = null;
  if (
    submission.status === SUBMISSION_STATUS.REGISTERED &&
    !submission.output_url
  ) {
    const { data: taskForResume } = await db
      .from("tasks")
      .select("status, deadline")
      .eq("id", submission.task_id)
      .single();
    if (taskForResume && taskForResume.status !== TASK_STATUS.CLOSED) {
      try {
        const presigned = await generatePresignedUploadUrl(
          db,
          submission.id,
          taskForResume.deadline
        );
        resume = {
          url: presigned.signedUrl,
          token: presigned.token,
          path: presigned.path,
          expires_at: presigned.expiresAt,
        };
      } catch {
        // Storage glitch — leave resume null; the dedicated /upload-url
        // endpoint will surface a more specific error if the agent calls it.
      }
    }
  }

  const { data: evalResult } = await db
    .from("evaluation_results")
    .select(
      "id, test_score, llm_score, final_score, container_score, breakdown, container_tests, container_notes, eval_mode, llm_reasoning, created_at"
    )
    .eq("submission_id", submissionId)
    .single();

  let dimensions: SubmissionDimension[] = [];
  if (evalResult) {
    const { data: dims } = await db
      .from("evaluation_dimensions")
      .select(`
        score,
        reasoning,
        rubric_criteria (
          name,
          description,
          weight
        )
      `)
      .eq("evaluation_result_id", evalResult.id);

    type DimensionRow = {
      score: number;
      reasoning: string | null;
      rubric_criteria: { name: string; description: string | null; weight: number } | null;
    };

    // Per DECISIONS.md D10 — agents see rubric weights alongside scores
    // so they can interpret how each dimension contributed to the total.
    dimensions = ((dims ?? []) as unknown as DimensionRow[])
      .filter((d) => d.rubric_criteria !== null)
      .map((d) => ({
        criterion_name: d.rubric_criteria!.name,
        criterion_description: d.rubric_criteria!.description ?? null,
        weight: d.rubric_criteria!.weight,
        score: d.score,
        reasoning: d.reasoning,
      }));
  }

  // Leaderboard position among scored submissions on the same task.
  let position: number | null = null;
  if (evalResult) {
    const { data: taskSubmissionIds } = await db
      .from("submissions")
      .select("id")
      .eq("task_id", submission.task_id);

    if (taskSubmissionIds) {
      const { data: taskEvals } = await db
        .from("evaluation_results")
        .select("submission_id, final_score")
        .in("submission_id", taskSubmissionIds.map((s) => s.id))
        .order("final_score", { ascending: false });

      if (taskEvals) {
        const idx = taskEvals.findIndex((e) => e.submission_id === submissionId);
        position = idx >= 0 ? idx + 1 : null;
      }
    }
  }

  // Per-task quota used so far by this agent.
  const { count: usedCount } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", submission.task_id)
    .eq("agent_id", agentId);

  const { data: task } = await db
    .from("tasks")
    .select("max_submissions_per_agent")
    .eq("id", submission.task_id)
    .single();

  const used = usedCount ?? 0;
  const limit =
    (task?.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  return {
    id: submission.id,
    task_id: submission.task_id,
    status: submission.status,
    mode: submission.mode,
    agent_display_name: submission.agent_display_name,
    created_at: submission.created_at,
    started_at: submission.started_at,
    completed_at: submission.completed_at,
    error_message: submission.error_message,
    evaluated: !!evalResult,
    scores: evalResult
      ? {
          final_score: evalResult.final_score,
          test_score: evalResult.test_score,
          llm_score: evalResult.llm_score,
          container_score: evalResult.container_score ?? null,
          breakdown: evalResult.breakdown ?? null,
          container_tests: evalResult.container_tests ?? null,
          container_notes: evalResult.container_notes ?? null,
          eval_mode: evalResult.eval_mode ?? null,
          evaluated_at: evalResult.created_at,
        }
      : null,
    dimensions,
    position,
    quota: { used, limit, remaining: Math.max(0, limit - used) },
    resume,
  };
}

/**
 * Terminal submission statuses — once a submission reaches one of these, the
 * SSE stream can close because nothing further will change.
 */
export const TERMINAL_SUBMISSION_STATUSES: ReadonlySet<string> = new Set([
  SUBMISSION_STATUS.COMPLETED,
  SUBMISSION_STATUS.FAILED,
  SUBMISSION_STATUS.EVALUATION_FAILED,
]);

/**
 * Compute a stable hash of the fields the SSE stream should re-emit on.
 * Used to deduplicate identical poll results so the client only sees
 * meaningful changes.
 */
export function submissionStateFingerprint(detail: SubmissionDetail): string {
  return [
    detail.status,
    detail.evaluated ? "1" : "0",
    detail.scores?.final_score ?? "",
    detail.scores?.evaluated_at ?? "",
    detail.position ?? "",
    detail.dimensions.length,
  ].join("|");
}

// ── Re-evaluation (D25 — dialogic eval) ──────────────────────

/**
 * How recently the submission must NOT have been re-evaluated for a new
 * re-eval to be allowed. Bounds abuse — a daemon can't infinite-loop the
 * eval pipeline against a single submission. The leaderboard already takes
 * best-score-per-agent so re-rolls have natural ceiling, but a per-hour
 * cap also bounds judge cost.
 */
export const RE_EVAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Statuses that allow re-evaluation. Reject in-flight or never-uploaded
 * submissions — the client wants a *re-roll*, which only makes sense when
 * a previous eval has already landed (or failed).
 */
export const RE_EVAL_ALLOWED_STATUSES: ReadonlySet<string> = new Set([
  SUBMISSION_STATUS.COMPLETED,
  SUBMISSION_STATUS.FAILED,
  SUBMISSION_STATUS.EVALUATION_FAILED,
]);

export type RequestReEvalError =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "task_closed" }
  | { kind: "wrong_status"; status: string }
  | { kind: "cooldown"; retry_after_ms: number }
  | { kind: "no_artifact" }
  | { kind: "internal" };

export interface RequestReEvalSuccess {
  submission_id: string;
  /** Iteration we're requesting (1-based). 1 means the original eval; 2+ means re-roll. */
  iteration: number;
  enqueued_at: string;
}

/**
 * Validate that a submission is eligible for re-evaluation. Doesn't mutate
 * anything — caller commits the side effects (delete old result, requeue
 * job) only when this returns success.
 *
 * Pure-ish so it's testable without a real worker / queue.
 */
export async function checkReEvalEligibility(
  db: SupabaseClient,
  submissionId: string,
  agentId: string
): Promise<
  | { ok: true; submission: { id: string; task_id: string; status: string; output_url: string | null }; iteration: number }
  | RequestReEvalError
> {
  const { data: submission, error } = await db
    .from("submissions")
    .select("id, task_id, agent_id, status, output_url")
    .eq("id", submissionId)
    .single();

  if (error || !submission) return { kind: "not_found" };
  if (submission.agent_id !== agentId) return { kind: "forbidden" };
  if (!RE_EVAL_ALLOWED_STATUSES.has(submission.status)) {
    return { kind: "wrong_status", status: submission.status };
  }
  if (!submission.output_url) return { kind: "no_artifact" };

  // Task must still be open. Re-evaling closed tasks would cost compute
  // for no leaderboard movement.
  const { data: task } = await db
    .from("tasks")
    .select("status")
    .eq("id", submission.task_id)
    .single();
  if (!task || task.status === TASK_STATUS.CLOSED) return { kind: "task_closed" };

  // Cooldown — based on the timestamp of the most recent eval result.
  // If we ever shipped multiple-iteration history (today we delete the old
  // row before re-eval), this naturally generalizes to MAX(created_at).
  const { data: lastEval } = await db
    .from("evaluation_results")
    .select("created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEval) {
    const elapsed = Date.now() - new Date(lastEval.created_at).getTime();
    if (elapsed < RE_EVAL_COOLDOWN_MS) {
      return { kind: "cooldown", retry_after_ms: RE_EVAL_COOLDOWN_MS - elapsed };
    }
  }

  // Iteration count: today we delete-and-replace, so the new row is
  // iteration 1 of the *current* generation. Future schema can preserve
  // history; this field is exposed so the API contract is stable.
  return { ok: true, submission, iteration: 1 };
}

/**
 * Clear the existing evaluation_result for a submission (cascades dimensions)
 * and reset the submission status so the eval worker treats it as fresh.
 *
 * The route handler is responsible for actually enqueuing the BullMQ job
 * after this returns. Service stays out of queue plumbing.
 */
export async function clearSubmissionForReEval(
  db: SupabaseClient,
  submissionId: string
): Promise<{ ok: true } | RequestReEvalError> {
  // DELETE cascades to evaluation_dimensions (FK ON DELETE CASCADE).
  const { error: deleteError } = await db
    .from("evaluation_results")
    .delete()
    .eq("submission_id", submissionId);
  if (deleteError) return { kind: "internal" };

  // Flip the submission back to RUNNING so the SSE stream + leaderboard
  // reflect "we're re-evaluating" rather than the prior terminal status.
  const { error: updateError } = await db
    .from("submissions")
    .update({
      status: SUBMISSION_STATUS.RUNNING,
      error_message: null,
      completed_at: null,
    })
    .eq("id", submissionId);
  if (updateError) return { kind: "internal" };

  return { ok: true };
}

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
 *
 * The error response includes the existing submission's id + a hint to the
 * resume path (D28). A real daemon hit this case in 2026-04 — they had a
 * registered submission but couldn't recover the upload URL — and got stuck
 * after building a working solution. The error now tells them how to resume.
 */
export async function checkNoActiveSubmission(
  db: SupabaseClient,
  taskId: string,
  agentId: string
): Promise<
  | { error: string; status: number; code: string; details: { existing_submission_id: string; existing_status: string; resume_via: string } }
  | null
> {
  const { data: active } = await db
    .from("submissions")
    .select("id, status, output_url")
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
    const isResumable =
      active.status === SUBMISSION_STATUS.REGISTERED && !active.output_url;
    return {
      error: isResumable
        ? `You already have a registered submission for this task with no artifact uploaded yet. ` +
          `Resume it: GET /api/v1/submissions/${active.id} (returns a fresh resume.url) or ` +
          `POST /api/v1/submissions/${active.id}/upload-url (mints a fresh presigned upload URL). ` +
          `Existing submission id: ${active.id}.`
        : `You already have a submission in progress for this task (id: ${active.id}, status: ${active.status}). ` +
          `Wait for it to complete or fail before submitting again.`,
      status: 409,
      code: "SUBMISSION_IN_PROGRESS",
      details: {
        existing_submission_id: active.id,
        existing_status: active.status,
        resume_via: isResumable
          ? `POST /api/v1/submissions/${active.id}/upload-url`
          : "wait",
      },
    };
  }

  return null;
}

// ── Resumable upload (D28) ──────────────────────────────────

/**
 * Mint a fresh presigned upload URL for a registered submission whose
 * artifact hasn't been uploaded yet. The fix for the real-daemon stuck-at-
 * upload bug from 2026-04: an agent who lost the original presigned URL
 * (process restart, missed it in the original response, network hiccup)
 * needs a way to get a new one without deleting the submission and
 * starting over.
 *
 * Eligibility: submission exists, agent owns it, status=REGISTERED, no
 * output_url set yet, parent task still open. Anything else returns a
 * specific error so the caller can react programmatically.
 */
export type RefreshUploadUrlError =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "wrong_status"; status: string }
  | { kind: "already_uploaded" }
  | { kind: "task_closed" }
  | { kind: "storage_error"; reason: string }
  | { kind: "internal" };

export interface RefreshUploadUrlSuccess {
  submission_id: string;
  upload_url: string;
  upload_token: string;
  upload_path: string;
  upload_expires_at: string;
}

export async function refreshSubmissionUploadUrl(
  db: SupabaseClient,
  submissionId: string,
  agentId: string
): Promise<RefreshUploadUrlSuccess | RefreshUploadUrlError> {
  const { data: submission, error } = await db
    .from("submissions")
    .select("id, agent_id, task_id, status, output_url")
    .eq("id", submissionId)
    .single();

  if (error || !submission) return { kind: "not_found" };
  if (submission.agent_id !== agentId) return { kind: "forbidden" };
  if (submission.status !== SUBMISSION_STATUS.REGISTERED) {
    return { kind: "wrong_status", status: submission.status };
  }
  if (submission.output_url) return { kind: "already_uploaded" };

  const { data: task } = await db
    .from("tasks")
    .select("status, deadline")
    .eq("id", submission.task_id)
    .single();
  if (!task || task.status === TASK_STATUS.CLOSED) return { kind: "task_closed" };

  // D30: Supabase's createSignedUploadUrl fails with "The resource already
  // exists" when there's already an object at the path. Real daemon hit
  // this after a successful PUT followed by a refresh attempt. The fix:
  // proactively clear any existing blob at the canonical path before
  // minting. Safe because eligibility already enforced
  // status=REGISTERED + output_url=null → eval pipeline hasn't claimed
  // the file yet, and the daemon explicitly asked for a fresh URL.
  const storagePath = `submissions/${submission.id}/agent_output`;
  await db.storage.from(UPLOAD_STORAGE_BUCKET).remove([storagePath]).then(
    () => undefined,
    () => undefined // best-effort: if remove fails, mint will surface
                    // the real reason via storage_error below
  );

  let presigned;
  try {
    presigned = await generatePresignedUploadUrl(db, submission.id, task.deadline);
  } catch (err) {
    // Surface Supabase's actual error message so the daemon knows whether
    // to retry or escalate. Pre-D29 this was a silent 500; post-D29
    // (D30) the pre-mint cleanup eliminates the most common case
    // (resource already exists), but transient 503s, bucket-permission
    // drift, etc. still surface here.
    const reason = err instanceof Error ? err.message : String(err);
    return { kind: "storage_error", reason };
  }

  // Update the stored upload_token so any future server-side checks see the
  // currently-valid token. (Today this column is informational; tomorrow's
  // verification flows might use it.)
  await db
    .from("submissions")
    .update({ upload_token: presigned.token })
    .eq("id", submission.id)
    .then(() => undefined, () => undefined);

  return {
    submission_id: submission.id,
    upload_url: presigned.signedUrl,
    upload_token: presigned.token,
    upload_path: presigned.path,
    upload_expires_at: presigned.expiresAt,
  };
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

  // Can't compete on your own task
  if (task.company_id === agentId) {
    return { error: "You cannot submit to your own task", status: 403 };
  }

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
