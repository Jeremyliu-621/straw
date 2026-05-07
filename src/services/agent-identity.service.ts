/**
 * Agent Identity Service — D37 (post-cleanup 2026-05-07).
 *
 * Two autonomous registration paths, both unrestricted (no rate limits, no
 * stake, no fingerprinting, no quality floor):
 *   - registerAnonymous: anyone hits the endpoint, gets a key.
 *   - mintOperatorChildKey: a fleet operator's daemon mints a child key
 *     against the operator's monthly quota.
 *
 * The original D37 spec carried a stake-to-bootstrap path A and an
 * anonymous-tier rate limit + floor gate. Both removed per user 2026-05-07.
 * Anyone, any volume, any time. Cost protection moves to the submission
 * side (per-IP rate limit on /quick-submit, already in place).
 *
 * Per D40 universal-roles: every autonomous registration creates an agent
 * that can both *post* and *compete*. There's no role gate distinguishing
 * the two — any agent with a key can call any endpoint.
 */

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  API_KEY_TIER,
  ROLE_AGENT_BUILDER,
  type ApiKeyTier,
} from "@/constants";
import { generateApiKey } from "@/services/api-key.service";
import {
  findOperatorTokenByPlaintext,
  type OperatorTokenRow,
} from "@/services/operator-token.service";

// ── Types ────────────────────────────────────────────────────

export interface RegistrationResult {
  /** The new user's id (= agent_id). */
  userId: string;
  /** The new api_key id (DB row id, not the secret). */
  apiKeyId: string;
  /** The plaintext API key. Show once, never log, never store. */
  plaintextKey: string;
  /** Display prefix (first 16 chars of the plaintext). */
  prefix: string;
  /** Tier the key was minted with. */
  tier: ApiKeyTier;
  /** Synthetic display name assigned at registration. */
  displayName: string;
  /** Always true since the floor gate was removed. Kept on the wire so the
   *  whoami response stays stable. */
  isFloorQualified: boolean;
}

export type RegisterAnonymousError = { kind: "internal"; detail?: string };

export interface RegisterAnonymousInput {
  /** Source IP (already extracted from x-forwarded-for / req.headers).
   *  Logged for audit but no longer used to gate. */
  sourceIp: string;
  /** UA-derived fingerprint hash. Logged for audit only. */
  uaFingerprint?: string;
  /** Optional display name hint. Sanitized + length-capped. */
  displayName?: string;
}

// ── Synthetic identity helpers ───────────────────────────────

/**
 * Synthetic email for autonomous identities. The `.invalid` TLD is reserved
 * (RFC 6761) so it can never collide with a real user. The format is grep-able
 * by tier prefix in DB audits.
 */
export function syntheticEmail(tier: ApiKeyTier, ident: string): string {
  return `${tier}-${ident}@autonomous.straw.invalid`;
}

/**
 * Synthetic auth_provider_id. Unique on the users table (NOT NULL UNIQUE), so
 * we use a tier prefix + opaque suffix.
 */
export function syntheticAuthProviderId(tier: ApiKeyTier, ident: string): string {
  return `straw_${tier}_${ident}`;
}

/**
 * Sanitize a hint into something safe to store as `users.name`. Strips
 * control characters, caps length, and falls back to a generic per-tier
 * default if the hint is empty.
 */
export function sanitizeDisplayName(hint: string | undefined, tier: ApiKeyTier): string {
  const cleaned = (hint ?? "")
    .replace(/[ -]/g, "")
    .trim()
    .slice(0, 60);
  if (cleaned.length > 0) return cleaned;
  switch (tier) {
    case API_KEY_TIER.ANONYMOUS:
      return "Anonymous Agent";
    case API_KEY_TIER.OPERATOR_CHILD:
      return "Operator Agent";
    default:
      return "Agent";
  }
}

// ── Anonymous register (unrestricted) ────────────────────────

/**
 * Register a fully anonymous agent. Creates user + api_key, writes an
 * audit row to anonymous_register_log. No rate limits, no fingerprint
 * checks, no stake — anyone hits the endpoint, anyone gets a key.
 *
 * The audit row is written for observability only.
 */
export async function registerAnonymous(
  db: SupabaseClient,
  input: RegisterAnonymousInput,
): Promise<{ ok: true; result: RegistrationResult } | { ok: false; error: RegisterAnonymousError }> {
  const tier = API_KEY_TIER.ANONYMOUS;
  const ident = randomUUID();
  const displayName = sanitizeDisplayName(input.displayName, tier);

  // 1. Create the user row. is_floor_qualified=true since the floor gate
  // was removed; every agent counts on the leaderboard from day one.
  const { data: userRow, error: userError } = await db
    .from("users")
    .insert({
      email: syntheticEmail(tier, ident),
      name: displayName,
      role: ROLE_AGENT_BUILDER,
      auth_provider_id: syntheticAuthProviderId(tier, ident),
      onboarded: true,
      is_floor_qualified: true,
    })
    .select("id")
    .single();
  if (userError || !userRow) {
    return { ok: false, error: { kind: "internal", detail: "user_insert_failed" } };
  }

  // 2. Mint the api_key.
  const { plaintext, hash, prefix } = generateApiKey();
  const { data: keyRow, error: keyError } = await db
    .from("api_keys")
    .insert({
      user_id: userRow.id,
      key_hash: hash,
      prefix,
      tier,
      name: "anonymous-bootstrap",
    })
    .select("id")
    .single();

  if (keyError || !keyRow) {
    await db.from("users").delete().eq("id", userRow.id);
    return { ok: false, error: { kind: "internal", detail: "api_key_insert_failed" } };
  }

  // 3. Audit log entry — always accepted now (the table is observability,
  // not a gate).
  await db.from("anonymous_register_log").insert({
    source_ip: input.sourceIp,
    ua_fingerprint: input.uaFingerprint ?? null,
    user_id: userRow.id,
    api_key_id: keyRow.id,
    rejected: false,
  });

  return {
    ok: true,
    result: {
      userId: userRow.id,
      apiKeyId: keyRow.id,
      plaintextKey: plaintext,
      prefix,
      tier,
      displayName,
      isFloorQualified: true,
    },
  };
}

// ── Operator-child mint (D37 path B) ─────────────────────────

export type MintOperatorChildError =
  | { kind: "operator_token_invalid" }
  | { kind: "operator_token_revoked" }
  | { kind: "internal"; detail?: string };

export interface MintOperatorChildInput {
  /** Plaintext operator token (already extracted from Authorization header). */
  operatorTokenPlaintext: string;
  /** Optional display name hint for the child agent. */
  displayName?: string;
}

/**
 * Mint a child api_key from an operator token. Creates a new user identity
 * (so submissions and reputation attribute to the daemon, not the operator)
 * and a new api_key with tier=operator_child and operator_token_id linking
 * back to the parent.
 */
export async function mintOperatorChildKey(
  db: SupabaseClient,
  input: MintOperatorChildInput,
): Promise<
  | { ok: true; result: RegistrationResult; operatorToken: OperatorTokenRow }
  | { ok: false; error: MintOperatorChildError }
> {
  const lookup = await findOperatorTokenByPlaintext(db, input.operatorTokenPlaintext);
  if (!lookup.ok) {
    if (lookup.error.kind === "revoked") {
      return { ok: false, error: { kind: "operator_token_revoked" } };
    }
    return { ok: false, error: { kind: "operator_token_invalid" } };
  }
  const operatorToken = lookup.token;

  const tier = API_KEY_TIER.OPERATOR_CHILD;
  const ident = randomUUID();
  const displayName = sanitizeDisplayName(input.displayName, tier);

  const { data: userRow, error: userError } = await db
    .from("users")
    .insert({
      email: syntheticEmail(tier, ident),
      name: displayName,
      role: ROLE_AGENT_BUILDER,
      auth_provider_id: syntheticAuthProviderId(tier, ident),
      onboarded: true,
      is_floor_qualified: true,
    })
    .select("id")
    .single();
  if (userError || !userRow) {
    return { ok: false, error: { kind: "internal", detail: "user_insert_failed" } };
  }

  const { plaintext, hash, prefix } = generateApiKey();
  const { data: keyRow, error: keyError } = await db
    .from("api_keys")
    .insert({
      user_id: userRow.id,
      key_hash: hash,
      prefix,
      tier,
      operator_token_id: operatorToken.id,
      name: `${operatorToken.prefix}-child`,
    })
    .select("id")
    .single();

  if (keyError || !keyRow) {
    await db.from("users").delete().eq("id", userRow.id);
    return { ok: false, error: { kind: "internal", detail: "api_key_insert_failed" } };
  }

  return {
    ok: true,
    operatorToken,
    result: {
      userId: userRow.id,
      apiKeyId: keyRow.id,
      plaintextKey: plaintext,
      prefix,
      tier,
      displayName,
      isFloorQualified: true,
    },
  };
}
