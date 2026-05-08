import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { makeSSEResponse } from "@/lib/sse";
import { TASK_STATUS } from "@/constants";

/**
 * GET /api/v1/bounties/stream — D39 bounty firehose.
 *
 * SSE stream of *new* bounties matching the caller's filter. Closes the
 * "discovery polling tax" — agents subscribe and react when a matching
 * bounty lands instead of polling /api/v1/tasks every N seconds.
 *
 * Per D40 (universal roles), this is symmetric: humans subscribing in the
 * dashboard and autonomous agents calling via SDK / CLI / MCP hit the same
 * route. Today the dashboard doesn't use it; the agent flows will.
 *
 * Filters (all optional, all repeatable):
 *   ?category=python&category=data
 *   ?min_budget_cents=50000
 *   ?tag=ml&tag=research
 *   ?deadline_after=<iso8601>      — only bounties with deadline AFTER this
 *
 * Wire format (one event per match):
 *   event: bounty
 *   id:    <created_at-millis>
 *   data:  { id, title, description, category, deadline, budget_cents,
 *            eval_mode, status, created_at }
 *
 * Initial event:
 *   event: connected
 *   data:  { filter: { ... }, server_time: <iso8601> }
 *
 * Per F5 (security follow-ups), per-agent concurrent-stream caps are
 * deferred. A single agent can open many streams today.
 */

const POLL_INTERVAL_MS = 3000;
// Emit `close` a few seconds under the SSE library's 270s cap so the
// terminal event is on the wire BEFORE the platform tears the function
// down. Iter 5 dogfood found the cap was hit silently — clients couldn't
// distinguish "server cleanly hung up at the cap" from "TCP died."
const STREAM_BUDGET_MS = 265_000;

interface BountyFilter {
  categories: string[];
  minBudgetCents: number | null;
  tags: string[];
  deadlineAfter: string | null;
}

interface FilterRejection {
  param: string;
  raw: string;
  reason: string;
}

function parseFilter(url: URL): { filter: BountyFilter; rejected: FilterRejection[] } {
  const sp = url.searchParams;
  const rejected: FilterRejection[] = [];

  const categories = sp.getAll("category").filter(Boolean);
  const tags = sp.getAll("tag").filter(Boolean);

  const minBudgetRaw = sp.get("min_budget_cents");
  let minBudgetCents: number | null = null;
  if (minBudgetRaw !== null && minBudgetRaw !== "") {
    const parsed = Number.parseInt(minBudgetRaw, 10);
    if (!Number.isFinite(parsed)) {
      rejected.push({ param: "min_budget_cents", raw: minBudgetRaw, reason: "not a number" });
    } else if (parsed < 0) {
      rejected.push({ param: "min_budget_cents", raw: minBudgetRaw, reason: "negative not allowed" });
    } else {
      minBudgetCents = parsed;
    }
  }

  const deadlineAfterRaw = sp.get("deadline_after");
  let deadlineAfter: string | null = null;
  if (deadlineAfterRaw !== null && deadlineAfterRaw !== "") {
    if (Number.isNaN(Date.parse(deadlineAfterRaw))) {
      rejected.push({ param: "deadline_after", raw: deadlineAfterRaw, reason: "not a valid ISO 8601 timestamp" });
    } else {
      deadlineAfter = deadlineAfterRaw;
    }
  }

  return {
    filter: { categories, minBudgetCents, tags, deadlineAfter },
    rejected,
  };
}

/**
 * Honor the SSE-spec `Last-Event-ID` header for backfill. Iter 5 dogfood
 * found that without backfill, every disconnect (the structural one at
 * 270s OR a network glitch) creates a permanent blind spot — bounties
 * published in that window are gone forever. Treating the id as a millis
 * timestamp and rewinding the cursor restores continuity.
 *
 * The id we emit on each `bounty` event is `String(created_at_millis)`,
 * so a reconnecting client passes back the millis of its last-seen event
 * and we replay everything since.
 */
function parseLastEventIdAsCursor(req: Request): string | null {
  const lastId = req.headers.get("last-event-id");
  if (!lastId) return null;
  const ms = Number.parseInt(lastId, 10);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

interface BountyRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  deadline: string;
  budget_cents: number;
  eval_mode: string | null;
  status: string;
  created_at: string;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const { filter, rejected } = parseFilter(url);
  const resumeCursor = parseLastEventIdAsCursor(req);
  const db = createServiceClient();

  return makeSSEResponse(req, async ({ emit, sleep }) => {
    const startedAt = Date.now();
    const nowIso = new Date().toISOString();

    // If the client passed Last-Event-ID, rewind the cursor to that
    // moment so the first poll backfills. Otherwise anchor to now and
    // only stream events that arrive AFTER the subscription.
    let cursor = resumeCursor ?? nowIso;
    const isResume = resumeCursor !== null;

    emit({
      event: "connected",
      data: {
        filter: {
          categories: filter.categories,
          min_budget_cents: filter.minBudgetCents,
          tags: filter.tags,
          deadline_after: filter.deadlineAfter,
        },
        // Surface filter values that were dropped at parse time so the
        // daemon doesn't sit on an empty stream wondering whether its
        // typo was the reason. Empty array when nothing was rejected.
        rejected_filters: rejected,
        // True iff a Last-Event-ID was honored — the first batch of
        // events after this is backfill, not "live."
        resumed: isResume,
        resume_cursor: isResume ? cursor : null,
        server_time: nowIso,
      },
    });

    while (await sleep(POLL_INTERVAL_MS)) {
      // Budget out before the SSE library's 270s cap fires so we can emit
      // an authoritative `close` event the client can act on. Without
      // this, clients see EOF and have to guess whether to reconnect.
      if (Date.now() - startedAt >= STREAM_BUDGET_MS) {
        emit({
          event: "close",
          data: {
            reason: "function_timeout",
            reconnect: true,
            // Echo the latest cursor so a reconnecting client can pass
            // it back as Last-Event-ID and resume cleanly.
            last_event_id: String(new Date(cursor).getTime()),
          },
        });
        return;
      }

      // Pull new tasks since the cursor that match the filter.
      let q = db
        .from("tasks")
        .select(
          "id, title, description, category, deadline, budget_cents, eval_mode, status, created_at",
        )
        .eq("status", TASK_STATUS.OPEN)
        .gt("created_at", cursor)
        .order("created_at", { ascending: true })
        .limit(100);

      if (filter.categories.length > 0) {
        q = q.in("category", filter.categories);
      }
      if (filter.minBudgetCents !== null) {
        q = q.gte("budget_cents", filter.minBudgetCents);
      }
      if (filter.deadlineAfter) {
        q = q.gt("deadline", filter.deadlineAfter);
      }

      const { data, error } = await q;
      if (error) {
        emit({ event: "error", data: { message: "query_failed" } });
        continue;
      }

      const rows = (data ?? []) as BountyRow[];
      for (const row of rows) {
        emit({
          event: "bounty",
          id: String(new Date(row.created_at).getTime()),
          data: row,
        });
        if (row.created_at > cursor) cursor = row.created_at;
      }
    }
  });
}
