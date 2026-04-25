import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@/constants";
import { TASK_STATUS } from "@/constants";

/**
 * Valid task status transitions.
 * draft → open (company publishes)
 * open → evaluating (deadline reached, submissions being evaluated)
 * evaluating → closed (all evaluations complete)
 */
const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  [TASK_STATUS.DRAFT]: [TASK_STATUS.OPEN],
  [TASK_STATUS.OPEN]: [TASK_STATUS.EVALUATING],
  [TASK_STATUS.EVALUATING]: [TASK_STATUS.CLOSED],
  [TASK_STATUS.CLOSED]: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function getValidTransitions(from: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

// ── Task Event Snapshot (read-side, shared by GET + SSE) ────

export interface TaskEventSnapshot {
  id: string;
  status: string;
  deadline: string;
  title: string;
  category: string | null;
  budget_cents: number;
  eval_mode: string;
  max_submissions_per_agent: number | null;
  updated_at: string | null;
  /** Server-time of this snapshot — clients use it to compute time-to-deadline. */
  server_time: string;
}

export type TaskEventFetchError = { kind: "not_found" };

/**
 * Snapshot the watchable fields of a task. Used by the events SSE stream
 * to detect change. Authentication is at the route layer; this is a
 * straight read of public-shaped fields.
 *
 * What's "watchable" today: status, deadline, max_submissions_per_agent,
 * eval_mode, and (when present) updated_at. Future Phase-20 additions —
 * amendments, eval_committee composition — slot in naturally because the
 * fingerprint is field-list driven.
 */
export async function fetchTaskEventSnapshot(
  db: SupabaseClient,
  taskId: string
): Promise<TaskEventSnapshot | TaskEventFetchError> {
  const { data, error } = await db
    .from("tasks")
    .select(
      "id, status, deadline, title, category, budget_cents, eval_mode, max_submissions_per_agent, updated_at"
    )
    .eq("id", taskId)
    .single();

  if (error || !data) return { kind: "not_found" };

  return {
    id: data.id,
    status: data.status,
    deadline: data.deadline,
    title: data.title,
    category: data.category ?? null,
    budget_cents: data.budget_cents,
    eval_mode: data.eval_mode,
    max_submissions_per_agent: data.max_submissions_per_agent ?? null,
    updated_at: (data.updated_at as string | null) ?? null,
    server_time: new Date().toISOString(),
  };
}

export const TERMINAL_TASK_STATUSES: ReadonlySet<string> = new Set([
  TASK_STATUS.CLOSED,
]);

/**
 * Fingerprint for change detection on a task. The SSE stream re-emits when
 * this changes between polls. Excludes `server_time` so a heartbeat-shaped
 * tick (no real change) doesn't fire a spurious event.
 */
export function taskEventFingerprint(snap: TaskEventSnapshot): string {
  return [
    snap.status,
    snap.deadline,
    snap.eval_mode,
    snap.max_submissions_per_agent ?? "",
    snap.updated_at ?? "",
  ].join("|");
}
