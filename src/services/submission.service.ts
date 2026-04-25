import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUBMISSION_STATUS,
  SUBMISSION_MODE,
  TASK_STATUS,
  TASK_DEFAULT_SUBMISSION_QUOTA,
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
