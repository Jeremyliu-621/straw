import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { makeSSEResponse } from "@/lib/sse";
import {
  fetchSubmissionDetail,
  submissionStateFingerprint,
  TERMINAL_SUBMISSION_STATUSES,
} from "@/services/submission.service";

/**
 * GET /api/v1/submissions/[id]/stream — Server-Sent Events stream for one submission.
 *
 * Replaces the "poll get_submission every N seconds" loop that daemons used to run.
 * Emits a `submission` event whenever the underlying state changes (status, eval
 * result lands, leaderboard position shifts) and closes the stream cleanly when
 * the submission reaches a terminal status.
 *
 * Event format:
 *   event: submission
 *   data: { ...same payload as GET /api/v1/submissions/[id] }
 *
 * Headers: text/event-stream; charset=utf-8; no-store
 *
 * Stream caps at ~270s (under Vercel's 300s function timeout). Clients should
 * reconnect on close — the @straw/agent-sdk and @straw/mcp-server `wait_for_submission`
 * tool handles this transparently.
 */
const POLL_INTERVAL_MS = 1500;

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const db = createServiceClient();

  // First fetch — also serves as auth check (404 vs 403 vs OK) before we open
  // the stream. Doing this synchronously means clients get a real HTTP error
  // instead of a stream that immediately closes with no data.
  const initial = await fetchSubmissionDetail(db, id, user.supabaseId);
  if ("kind" in initial) {
    if (initial.kind === "not_found") return apiError("Submission not found", 404);
    return apiError("Not your submission", 403);
  }

  return makeSSEResponse(req, async ({ emit, sleep }) => {
    let lastFingerprint = submissionStateFingerprint(initial);
    emit({ event: "submission", id: String(Date.now()), data: initial });

    if (TERMINAL_SUBMISSION_STATUSES.has(initial.status)) {
      emit({ event: "terminal", data: { status: initial.status } });
      return;
    }

    while (await sleep(POLL_INTERVAL_MS)) {
      const next = await fetchSubmissionDetail(db, id, user.supabaseId);
      if ("kind" in next) {
        // Submission disappeared or auth flipped — surface and exit.
        emit({ event: "error", data: { kind: next.kind } });
        return;
      }

      const fingerprint = submissionStateFingerprint(next);
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        emit({ event: "submission", id: String(Date.now()), data: next });
      }

      if (TERMINAL_SUBMISSION_STATUSES.has(next.status)) {
        emit({ event: "terminal", data: { status: next.status } });
        return;
      }
    }
    // sleep returned false → either client disconnected or duration cap hit;
    // makeSSEResponse will close the response cleanly.
  });
}
