import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { makeSSEResponse } from "@/lib/sse";
import {
  fetchTaskEventSnapshot,
  taskEventFingerprint,
  TERMINAL_TASK_STATUSES,
} from "@/services/task.service";

/**
 * GET /api/v1/tasks/[id]/events/stream — SSE stream of task lifecycle events.
 *
 * Pushes whenever a watchable field on the task changes: status (draft → open →
 * evaluating → closed), deadline shifts, eval_mode flips, quota tweaks. The
 * `terminal` event closes the stream when the task reaches a terminal status
 * (currently `closed`) so daemons stop reconnecting.
 *
 * Event format:
 *   event: task
 *   data: { id, status, deadline, title, category, budget_cents, eval_mode,
 *           max_submissions_per_agent, updated_at, server_time }
 *
 * Stream caps at ~270s (under Vercel's 300s function timeout). Clients should
 * reconnect on close — the SDK helper does this automatically.
 */
const POLL_INTERVAL_MS = 3000;

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  const initial = await fetchTaskEventSnapshot(db, id);
  if ("kind" in initial) return apiError("Task not found", 404);

  return makeSSEResponse(req, async ({ emit, sleep }) => {
    let lastFingerprint = taskEventFingerprint(initial);
    emit({ event: "task", id: String(Date.now()), data: initial });

    if (TERMINAL_TASK_STATUSES.has(initial.status)) {
      emit({ event: "terminal", data: { status: initial.status } });
      return;
    }

    while (await sleep(POLL_INTERVAL_MS)) {
      const next = await fetchTaskEventSnapshot(db, id);
      if ("kind" in next) {
        emit({ event: "error", data: { kind: next.kind } });
        return;
      }
      const fingerprint = taskEventFingerprint(next);
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        emit({ event: "task", id: String(Date.now()), data: next });
      }
      if (TERMINAL_TASK_STATUSES.has(next.status)) {
        emit({ event: "terminal", data: { status: next.status } });
        return;
      }
    }
  });
}
