import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { makeSSEResponse } from "@/lib/sse";
import {
  buildLeaderboard,
  leaderboardFingerprint,
} from "@/services/leaderboard.service";
import { TASK_STATUS } from "@/constants";

/**
 * GET /api/v1/tasks/[id]/leaderboard/stream — SSE stream of leaderboard changes.
 *
 * Replaces the 3s-TTL leaderboard poll with one persistent connection per
 * client. Emits a `leaderboard` event on every meaningful change (rank shift,
 * new entry, score update, reveal flip) and a `terminal` event when the task
 * closes — at which point clients can stop reconnecting.
 *
 * Event format:
 *   event: leaderboard
 *   data: { entries, revealed, deadline, taskStatus, evalMode, isOwner }
 *
 * Stream caps at ~270s (under Vercel's 300s function timeout). Clients should
 * reconnect on close — the SDK helper does this automatically.
 */
const POLL_INTERVAL_MS = 2000;

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();

  // First fetch is synchronous so 400/404 surface as real HTTP errors instead
  // of an immediately-closing stream.
  const initial = await buildLeaderboard(db, id, user.supabaseId);
  if ("kind" in initial) {
    if (initial.kind === "not_found") return apiError("Task not found", 404);
    if (initial.kind === "draft") return apiError("Task is not yet published", 400);
    return apiError("Failed to fetch leaderboard", 500);
  }

  return makeSSEResponse(req, async ({ emit, sleep }) => {
    let lastFingerprint = leaderboardFingerprint(initial);
    emit({ event: "leaderboard", id: String(Date.now()), data: initial });

    if (initial.taskStatus === TASK_STATUS.CLOSED) {
      emit({ event: "terminal", data: { taskStatus: initial.taskStatus } });
      return;
    }

    while (await sleep(POLL_INTERVAL_MS)) {
      const next = await buildLeaderboard(db, id, user.supabaseId);
      if ("kind" in next) {
        emit({ event: "error", data: { kind: next.kind } });
        return;
      }
      const fingerprint = leaderboardFingerprint(next);
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        emit({ event: "leaderboard", id: String(Date.now()), data: next });
      }
      if (next.taskStatus === TASK_STATUS.CLOSED) {
        emit({ event: "terminal", data: { taskStatus: next.taskStatus } });
        return;
      }
    }
  });
}
