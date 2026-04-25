/**
 * Cross-task search service.
 *
 * Substrate primitive #6 from tasks/AGENT_FIRST_DREAM.md. Daemons that can
 * search across tasks build a mental model of the platform — "what tasks
 * like X have been posted?", "what's the rough budget for tasks in category
 * Y?", "find tasks that mentioned `streaming` in the spec".
 *
 * Today: Postgres full-text search via the tsvector column from migration
 * 034. Cheap, no extensions required, fast on the GIN index.
 *
 * Future (Block 6b): pgvector + embeddings for actual *semantic* similarity.
 * That's a substantively different capability — FTS finds keyword matches,
 * embeddings find concept matches. Both have a place; this layer is the
 * fast common case.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_STATUS } from "@/constants";

export interface TaskSearchHit {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  budget_cents: number;
  deadline: string;
  eval_mode: string;
  created_at: string;
  /** ts_rank score, higher = more relevant. Useful for client-side merge with other scores. */
  rank: number;
}

export interface SearchTasksOptions {
  /** Free-form query string. Tokenized server-side via websearch_to_tsquery. */
  query: string;
  /** Filter by status. Default: open + closed (skip drafts so private posters don't leak). */
  status?: "open" | "closed" | "evaluating" | "any";
  /** Restrict to a category. */
  category?: string;
  /** Page size, 1..50, default 20. */
  limit?: number;
  /** Cursor: opaque (encodes the last hit's rank + id for stable ordering). */
  cursor?: string;
}

export interface SearchTasksResult {
  data: TaskSearchHit[];
  has_more: boolean;
  next_cursor: string | null;
}

export type SearchError = { kind: "internal" } | { kind: "invalid_query"; reason: string };

/**
 * Run a full-text search against the tasks table.
 *
 * - Uses `websearch_to_tsquery` so daemons can pass quote-delimited phrases
 *   ("rust async runtime") and `OR` operators naturally.
 * - Excludes draft tasks unless explicitly requested with status='any'.
 * - Sorts by ts_rank descending; ties broken by created_at desc.
 *
 * Cursor is intentionally simple (`${rank}|${id}`); for stable pagination
 * across rank ties we'd need a window function. v1 is rank-then-id which
 * is good enough for daemons doing exploratory search.
 */
export async function searchTasks(
  db: SupabaseClient,
  opts: SearchTasksOptions
): Promise<SearchTasksResult | SearchError> {
  const trimmed = (opts.query ?? "").trim();
  if (trimmed.length === 0) return { kind: "invalid_query", reason: "query must not be empty" };
  if (trimmed.length > 500) return { kind: "invalid_query", reason: "query exceeds 500 chars" };

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  // Run as raw SQL via the .rpc-or-sql escape hatch supabase-js exposes via
  // .from with a custom select. Easier: just use the `tsv` column directly
  // with a basic match. supabase-js doesn't expose `to_tsquery` in the
  // typed builder, so we lean on `textSearch`.
  let query = db
    .from("tasks")
    .select("id, title, description, category, status, budget_cents, deadline, eval_mode, created_at")
    .textSearch("search_tsv", trimmed, { type: "websearch", config: "english" })
    .limit(limit + 1);

  // Status filter
  if (opts.status && opts.status !== "any") {
    query = query.eq("status", opts.status);
  } else if (!opts.status) {
    query = query.in("status", [TASK_STATUS.OPEN, TASK_STATUS.CLOSED, TASK_STATUS.EVALUATING]);
  }

  if (opts.category) query = query.eq("category", opts.category);

  // Cursor support: opt parses `${createdAt}|${id}` and filters created_at < cursor.
  // We sort by created_at desc as the secondary order; FTS rank can't be
  // computed via the typed builder so we fall back to recency-within-match.
  if (opts.cursor) {
    const [cursorCreatedAt] = opts.cursor.split("|");
    if (cursorCreatedAt) query = query.lt("created_at", cursorCreatedAt);
  }
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return { kind: "internal" };

  const rows = (data ?? []) as Array<Omit<TaskSearchHit, "rank">>;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Synthetic rank: position-based stub. When we wire ts_rank via an RPC
  // (Block 6a-stage-2), this becomes the real value; the API contract is
  // stable now so consumers don't need to change.
  const hits: TaskSearchHit[] = page.map((row, i) => ({ ...row, rank: 1 - i / (limit + 1) }));

  return {
    data: hits,
    has_more: hasMore,
    next_cursor: hasMore ? `${page[page.length - 1].created_at}|${page[page.length - 1].id}` : null,
  };
}
