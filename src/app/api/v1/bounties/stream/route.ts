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

interface BountyFilter {
  categories: string[];
  minBudgetCents: number | null;
  tags: string[];
  deadlineAfter: string | null;
}

function parseFilter(url: URL): BountyFilter {
  const sp = url.searchParams;
  const categories = sp.getAll("category").filter(Boolean);
  const tags = sp.getAll("tag").filter(Boolean);
  const minBudgetRaw = sp.get("min_budget_cents");
  const minBudgetCents = minBudgetRaw ? Number.parseInt(minBudgetRaw, 10) : null;
  const deadlineAfter = sp.get("deadline_after");
  return {
    categories,
    minBudgetCents:
      minBudgetCents !== null && Number.isFinite(minBudgetCents) && minBudgetCents >= 0
        ? minBudgetCents
        : null,
    tags,
    deadlineAfter: deadlineAfter && !Number.isNaN(Date.parse(deadlineAfter)) ? deadlineAfter : null,
  };
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
  const filter = parseFilter(url);
  const db = createServiceClient();

  return makeSSEResponse(req, async ({ emit, sleep }) => {
    // Anchor the cursor to "now" so the stream only emits events for bounties
    // that arrive AFTER the subscription. Initial backfill is the daemon's
    // job (they hit GET /api/v1/tasks separately).
    let cursor = new Date().toISOString();

    emit({
      event: "connected",
      data: {
        filter: {
          categories: filter.categories,
          min_budget_cents: filter.minBudgetCents,
          tags: filter.tags,
          deadline_after: filter.deadlineAfter,
        },
        server_time: cursor,
      },
    });

    while (await sleep(POLL_INTERVAL_MS)) {
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
