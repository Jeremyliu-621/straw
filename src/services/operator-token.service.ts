/**
 * Operator Token Service — D37 path B.
 *
 * An operator token is a credential held by a human or autonomous agent that
 * runs a fleet of daemons. The operator's daemons mint *child* api_keys
 * against the operator's quota; each child has its own user identity (so
 * submissions and reputation attribute to the daemon, not the operator) but
 * counts against the operator's monthly quota.
 *
 * Mirrors `src/services/api-key.service.ts`: pure crypto + DB primitives, no
 * route concerns. The orchestration (create-user-then-create-key) lives in
 * `agent-identity.service.ts`.
 *
 * Token format: straw_op_<32 hex chars from 16 random bytes>. The prefix lets
 * logs and grep distinguish operator tokens from api_keys at a glance.
 *
 * Storage: only the SHA-256 hash. Plaintext is returned once at creation.
 *
 * Per F3 (security follow-ups), each operator token has a `child_quota_pct`
 * (default 100 = no per-child gate). When less than 100, no single child key
 * may consume more than that percent of `monthly_quota_submissions`. The
 * enforcement lives in submission count guards, not here.
 */

import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OPERATOR_TOKEN_PREFIX,
  OPERATOR_TOKEN_RANDOM_BYTES,
  OPERATOR_TOKEN_DEFAULT_MONTHLY_QUOTA,
  OPERATOR_TOKEN_DEFAULT_CHILD_QUOTA_PCT,
  OPERATOR_TOKEN_MAX_PER_USER,
} from "@/constants";

// ── Types ────────────────────────────────────────────────────

export interface GeneratedOperatorToken {
  /** The full plaintext token — shown to the operator once, never stored. */
  plaintext: string;
  /** SHA-256 of the plaintext. Stored. */
  hash: string;
  /** First 16 chars of the plaintext. Stored for display. */
  prefix: string;
}

export interface OperatorTokenRow {
  id: string;
  operator_user_id: string;
  token_hash: string;
  prefix: string;
  label: string | null;
  monthly_quota_submissions: number;
  used_quota_submissions: number;
  child_quota_pct: number;
  revoked_at: string | null;
  revoked_reason: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OperatorTokenError =
  | { kind: "max_per_user"; current: number; limit: number }
  | { kind: "invalid_format" }
  | { kind: "not_found" }
  | { kind: "revoked" }
  | { kind: "internal" };

// ── Crypto + Validation ──────────────────────────────────────

export function generateOperatorToken(): GeneratedOperatorToken {
  const randomHex = randomBytes(OPERATOR_TOKEN_RANDOM_BYTES).toString("hex");
  const plaintext = `${OPERATOR_TOKEN_PREFIX}${randomHex}`;
  const hash = hashOperatorToken(plaintext);
  const prefix = plaintext.slice(0, 16);
  return { plaintext, hash, prefix };
}

export function hashOperatorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidOperatorTokenFormat(token: string): boolean {
  // straw_op_ (9 chars) + 32 hex chars = 41 total.
  return (
    token.startsWith(OPERATOR_TOKEN_PREFIX) &&
    token.length === OPERATOR_TOKEN_PREFIX.length + OPERATOR_TOKEN_RANDOM_BYTES * 2
  );
}

// ── Read ─────────────────────────────────────────────────────

/**
 * Look up an operator token by its plaintext value. Used by the mint-child-key
 * route to authenticate the operator. Returns the row or a typed error.
 *
 * Bumps `last_used_at` fire-and-forget on success.
 */
export async function findOperatorTokenByPlaintext(
  db: SupabaseClient,
  plaintext: string,
): Promise<{ ok: true; token: OperatorTokenRow } | { ok: false; error: OperatorTokenError }> {
  if (!isValidOperatorTokenFormat(plaintext)) {
    return { ok: false, error: { kind: "invalid_format" } };
  }
  const tokenHash = hashOperatorToken(plaintext);
  const { data, error } = await db
    .from("operator_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();
  if (error || !data) return { ok: false, error: { kind: "not_found" } };
  const row = data as OperatorTokenRow;
  if (row.revoked_at) return { ok: false, error: { kind: "revoked" } };

  // Fire-and-forget last_used_at bump.
  void db
    .from("operator_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return { ok: true, token: row };
}

/**
 * List the operator's own tokens. Used by the dashboard. Returns rows ordered
 * by created_at desc; revoked tokens excluded.
 */
export async function listOperatorTokens(
  db: SupabaseClient,
  operatorUserId: string,
): Promise<OperatorTokenRow[]> {
  const { data, error } = await db
    .from("operator_tokens")
    .select("*")
    .eq("operator_user_id", operatorUserId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as OperatorTokenRow[];
}

// ── Write ────────────────────────────────────────────────────

export interface CreateOperatorTokenInput {
  label?: string | null;
  monthlyQuotaSubmissions?: number;
  childQuotaPct?: number;
}

/**
 * Mint a new operator token for the given user. Caps per-user count to
 * OPERATOR_TOKEN_MAX_PER_USER active tokens. Returns the plaintext (caller
 * shows once) and the row.
 */
export async function createOperatorToken(
  db: SupabaseClient,
  operatorUserId: string,
  input: CreateOperatorTokenInput,
): Promise<
  | { ok: true; token: OperatorTokenRow; plaintext: string }
  | { ok: false; error: OperatorTokenError }
> {
  // Enforce per-user cap. Counts active (non-revoked) tokens.
  const { count, error: countError } = await db
    .from("operator_tokens")
    .select("id", { count: "exact", head: true })
    .eq("operator_user_id", operatorUserId)
    .is("revoked_at", null);

  if (countError) return { ok: false, error: { kind: "internal" } };
  if ((count ?? 0) >= OPERATOR_TOKEN_MAX_PER_USER) {
    return {
      ok: false,
      error: { kind: "max_per_user", current: count ?? 0, limit: OPERATOR_TOKEN_MAX_PER_USER },
    };
  }

  const { plaintext, hash, prefix } = generateOperatorToken();
  const { data, error } = await db
    .from("operator_tokens")
    .insert({
      operator_user_id: operatorUserId,
      token_hash: hash,
      prefix,
      label: input.label ?? null,
      monthly_quota_submissions:
        input.monthlyQuotaSubmissions ?? OPERATOR_TOKEN_DEFAULT_MONTHLY_QUOTA,
      child_quota_pct: input.childQuotaPct ?? OPERATOR_TOKEN_DEFAULT_CHILD_QUOTA_PCT,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: { kind: "internal" } };
  return { ok: true, token: data as OperatorTokenRow, plaintext };
}

/**
 * Revoke an operator token. Idempotent: revoking an already-revoked token
 * succeeds without changing `revoked_at`.
 */
export async function revokeOperatorToken(
  db: SupabaseClient,
  tokenId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: OperatorTokenError }> {
  const { data: existing } = await db
    .from("operator_tokens")
    .select("id, revoked_at")
    .eq("id", tokenId)
    .single();
  if (!existing) return { ok: false, error: { kind: "not_found" } };
  if (existing.revoked_at) return { ok: true };

  const { error } = await db
    .from("operator_tokens")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason ?? null,
    })
    .eq("id", tokenId);
  if (error) return { ok: false, error: { kind: "internal" } };
  return { ok: true };
}

/**
 * Per-child quota check. Given the operator's monthly cap and the per-child
 * percent, returns the maximum submissions a single child key may make. The
 * actual enforcement (counting submissions per child) happens in the
 * submission flow; this helper returns the budget number.
 */
export function childSubmissionBudget(token: OperatorTokenRow): number {
  return Math.floor(
    (token.monthly_quota_submissions * token.child_quota_pct) / 100,
  );
}
