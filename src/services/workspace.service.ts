/**
 * Agent workspace KV service.
 *
 * Per the agent-first dream ([[agent-first-dream]], substrate primitive #3):
 * daemons that can remember things across submissions and tasks build up
 * knowledge over time. This service is the read/write layer for `agent_workspace_kv`.
 *
 * Quotas are enforced application-side here AND backed by a hard cap in the
 * DB if the values get too unreasonable (table-level CHECK could be added
 * later if needed). Today the constants live in src/constants.ts and the
 * service is the single source of truth for "what's allowed."
 *
 * RLS is on (migration 032) so even if the route layer forgets to scope by
 * agent_id, no agent can see another agent's KV. The service uses the
 * service-role client (bypasses RLS) and *must* always scope by agent_id
 * itself — that's the contract.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WORKSPACE_KV_MAX_KEYS_PER_AGENT,
  WORKSPACE_KV_MAX_VALUE_BYTES,
  WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT,
  WORKSPACE_KV_MAX_KEY_LENGTH,
  WORKSPACE_KV_KEY_REGEX,
} from "@/constants";
import { encodeCursor, decodeCursor } from "@/lib/cursor";

// ── Types ────────────────────────────────────────────────────

export interface WorkspaceEntry {
  key: string;
  value: unknown;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceQuotaSnapshot {
  keys_used: number;
  keys_limit: number;
  bytes_used: number;
  bytes_limit: number;
}

export type WorkspaceServiceError =
  | { kind: "invalid_key"; reason: string }
  | { kind: "value_too_large"; size_bytes: number; limit: number }
  | { kind: "key_quota_exceeded"; current: number; limit: number }
  | { kind: "byte_quota_exceeded"; current: number; would_be: number; limit: number }
  | { kind: "not_found" }
  | { kind: "internal" };

// ── Validation ───────────────────────────────────────────────

export function validateKey(key: string): { ok: true } | { ok: false; reason: string } {
  if (typeof key !== "string") return { ok: false, reason: "key must be a string" };
  if (key.length === 0) return { ok: false, reason: "key must not be empty" };
  if (key.length > WORKSPACE_KV_MAX_KEY_LENGTH) {
    return { ok: false, reason: `key exceeds max length (${WORKSPACE_KV_MAX_KEY_LENGTH})` };
  }
  if (!WORKSPACE_KV_KEY_REGEX.test(key)) {
    return { ok: false, reason: "key contains disallowed characters (allowed: alphanumerics, . _ - : /)" };
  }
  return { ok: true };
}

export function valueSizeBytes(value: unknown): number {
  // Match the generated column on the table — JSON text byte length.
  return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
}

// ── Read ─────────────────────────────────────────────────────

/**
 * Get a single workspace entry. Returns `not_found` if absent — daemons can
 * use this for "does this exist" checks without needing a separate exists().
 */
export async function getWorkspaceEntry(
  db: SupabaseClient,
  agentId: string,
  key: string
): Promise<WorkspaceEntry | WorkspaceServiceError> {
  const keyCheck = validateKey(key);
  if (!keyCheck.ok) return { kind: "invalid_key", reason: keyCheck.reason };

  const { data, error } = await db
    .from("agent_workspace_kv")
    .select("key, value, size_bytes, created_at, updated_at")
    .eq("agent_id", agentId)
    .eq("key", key)
    .maybeSingle();

  if (error) return { kind: "internal" };
  if (!data) return { kind: "not_found" };

  return {
    key: data.key,
    value: data.value,
    size_bytes: data.size_bytes,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * List the agent's keys with optional prefix filter and pagination.
 * Sorted by updated_at descending so daemons see their most-recent edits
 * first. Returns key + size + timestamps but NOT the value (callers fetch
 * specific values they care about — keeps list responses bounded).
 */
export interface ListWorkspaceOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListWorkspaceResult {
  data: Array<Omit<WorkspaceEntry, "value">>;
  has_more: boolean;
  next_cursor: string | null;
}

export async function listWorkspaceEntries(
  db: SupabaseClient,
  agentId: string,
  opts: ListWorkspaceOptions = {}
): Promise<ListWorkspaceResult | WorkspaceServiceError> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  let query = db
    .from("agent_workspace_kv")
    .select("key, size_bytes, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (opts.prefix) {
    const sanitized = opts.prefix.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.like("key", `${sanitized}%`);
  }
  if (opts.cursor) {
    // Cursor is the updated_at of the last row from the previous page.
    // Decode in case the client passes back the base64url-encoded form
    // we hand out (iter 6 — the raw-ISO form mangled `+` → space when
    // round-tripped through URL query strings). decodeCursor is lenient
    // so legacy raw-ISO cursors still work.
    const decoded = decodeCursor(opts.cursor);
    query = query.lt("updated_at", decoded);
  }

  const { data, error } = await query;
  if (error) return { kind: "internal" };

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page.map((r) => ({
      key: r.key,
      size_bytes: r.size_bytes,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    has_more: hasMore,
    next_cursor: hasMore ? encodeCursor(page[page.length - 1].updated_at) : null,
  };
}

// ── Write ────────────────────────────────────────────────────

/**
 * Upsert a workspace entry. Enforces:
 *   - key shape (validateKey)
 *   - per-value size limit (WORKSPACE_KV_MAX_VALUE_BYTES)
 *   - per-agent key-count limit (only on insert of a new key)
 *   - per-agent total-bytes limit (computed against the post-write delta)
 *
 * Returns the resulting entry on success.
 */
export async function setWorkspaceEntry(
  db: SupabaseClient,
  agentId: string,
  key: string,
  value: unknown
): Promise<WorkspaceEntry | WorkspaceServiceError> {
  const keyCheck = validateKey(key);
  if (!keyCheck.ok) return { kind: "invalid_key", reason: keyCheck.reason };

  const newSize = valueSizeBytes(value);
  if (newSize > WORKSPACE_KV_MAX_VALUE_BYTES) {
    return { kind: "value_too_large", size_bytes: newSize, limit: WORKSPACE_KV_MAX_VALUE_BYTES };
  }

  // Read existing row (if any) to compute byte delta and decide
  // whether the key-count cap applies (insert vs update).
  const { data: existing } = await db
    .from("agent_workspace_kv")
    .select("size_bytes")
    .eq("agent_id", agentId)
    .eq("key", key)
    .maybeSingle();

  // Aggregate quota check.
  const { data: quotaRows, error: quotaError } = await db
    .from("agent_workspace_kv")
    .select("size_bytes")
    .eq("agent_id", agentId);

  if (quotaError) return { kind: "internal" };

  const currentKeys = (quotaRows ?? []).length;
  const currentBytes = (quotaRows ?? []).reduce((acc, r) => acc + (r.size_bytes ?? 0), 0);

  if (!existing && currentKeys >= WORKSPACE_KV_MAX_KEYS_PER_AGENT) {
    return {
      kind: "key_quota_exceeded",
      current: currentKeys,
      limit: WORKSPACE_KV_MAX_KEYS_PER_AGENT,
    };
  }

  const wouldBeBytes = currentBytes - (existing?.size_bytes ?? 0) + newSize;
  if (wouldBeBytes > WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT) {
    return {
      kind: "byte_quota_exceeded",
      current: currentBytes,
      would_be: wouldBeBytes,
      limit: WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT,
    };
  }

  const { data, error } = await db
    .from("agent_workspace_kv")
    .upsert(
      { agent_id: agentId, key, value, updated_at: new Date().toISOString() },
      { onConflict: "agent_id,key" }
    )
    .select("key, value, size_bytes, created_at, updated_at")
    .single();

  if (error || !data) return { kind: "internal" };

  return {
    key: data.key,
    value: data.value,
    size_bytes: data.size_bytes,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Delete a workspace entry. Idempotent — returns ok even if the key didn't
 * exist (mirrors typical KV semantics; daemons don't need a pre-check).
 *
 * Response shape: `{ deleted: true, was_present: boolean }`. `deleted` is
 * always `true` because the post-state is the same — there is no key.
 * `was_present` reports whether work actually happened. Iter 6 customer
 * dogfood found `deleted: false` for absent keys read like a failure to
 * many clients despite the idempotent semantic; surfacing both fields
 * eliminates the ambiguity without breaking the contract.
 */
export async function deleteWorkspaceEntry(
  db: SupabaseClient,
  agentId: string,
  key: string
): Promise<{ deleted: true; was_present: boolean } | WorkspaceServiceError> {
  const keyCheck = validateKey(key);
  if (!keyCheck.ok) return { kind: "invalid_key", reason: keyCheck.reason };

  const { error, count } = await db
    .from("agent_workspace_kv")
    .delete({ count: "exact" })
    .eq("agent_id", agentId)
    .eq("key", key);

  if (error) return { kind: "internal" };
  return { deleted: true, was_present: (count ?? 0) > 0 };
}

// ── Quota ────────────────────────────────────────────────────

export async function getWorkspaceQuota(
  db: SupabaseClient,
  agentId: string
): Promise<WorkspaceQuotaSnapshot | WorkspaceServiceError> {
  const { data, error } = await db
    .from("agent_workspace_kv")
    .select("size_bytes")
    .eq("agent_id", agentId);

  if (error) return { kind: "internal" };
  const rows = data ?? [];
  return {
    keys_used: rows.length,
    keys_limit: WORKSPACE_KV_MAX_KEYS_PER_AGENT,
    bytes_used: rows.reduce((acc, r) => acc + (r.size_bytes ?? 0), 0),
    bytes_limit: WORKSPACE_KV_MAX_TOTAL_BYTES_PER_AGENT,
  };
}
