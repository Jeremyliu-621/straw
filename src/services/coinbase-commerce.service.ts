/**
 * Coinbase Commerce service — D37 path A.
 *
 * Three responsibilities:
 *   1. Verify incoming Coinbase Commerce webhooks (HMAC SHA-256, timing-safe).
 *   2. Persist a confirmed charge to `stake_charges` once the webhook lands.
 *   3. Orchestrate the claim flow: when an agent presents a confirmed
 *      charge_id, mint a new user + api_key with tier='staked' and link
 *      the api_key back to the charge.
 *
 * Outbound charge creation (POST to commerce.coinbase.com) is stubbed for
 * now — needs `COINBASE_COMMERCE_API_KEY` env to wire up. The schema and
 * webhook side are complete so a future commit can drop the Coinbase SDK
 * in without further migration.
 *
 * Per F7, every webhook event is recorded to `coinbase_webhook_events`
 * (PRIMARY KEY on event_id) before being processed. Duplicate events are
 * rejected as replays. Per F2, the refund flow is one-shot today; staged
 * refund is a future hardening pass.
 */

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  API_KEY_TIER,
  ROLE_AGENT_BUILDER,
  STAKE_AMOUNT_USDC,
  STAKE_CHARGE_STATUS,
} from "@/constants";
import { generateApiKey } from "@/services/api-key.service";
import {
  syntheticEmail,
  syntheticAuthProviderId,
  sanitizeDisplayName,
  type RegistrationResult,
} from "@/services/agent-identity.service";

// ── Webhook signature verification ───────────────────────────

/**
 * Verify a Coinbase Commerce webhook signature against its shared secret.
 * Coinbase sends a single HMAC-SHA256 of the raw body in `X-CC-Webhook-Signature`.
 *
 * Returns true on match, false otherwise. Uses timingSafeEqual to avoid
 * leaking timing info if a partial match could be inferred.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  if (signature.length === 0) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  // Both sides must be the same byte length for timingSafeEqual.
  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    // Signature wasn't valid hex.
    return false;
  }
}

// ── Webhook event types we care about ────────────────────────

export interface CoinbaseWebhookEvent {
  id: string;
  type: string;
  data: {
    id: string; // charge_id
    code?: string;
    pricing?: {
      local: { amount: string; currency: string };
    };
    timeline?: Array<{ status: string; time: string }>;
    [k: string]: unknown;
  };
}

export type CoinbaseEventResult =
  | { kind: "ok" }
  | { kind: "replay"; event_id: string }
  | { kind: "invalid_signature" }
  | { kind: "irrelevant"; reason: string }
  | { kind: "internal"; detail?: string };

/**
 * Process a Coinbase Commerce webhook event. Idempotent on event_id (F7).
 * For `charge:confirmed`, marks the matching stake_charges row as
 * 'confirmed' so the agent can subsequently claim it.
 *
 * Other event types are recorded but otherwise ignored.
 */
export async function processWebhookEvent(
  db: SupabaseClient,
  event: CoinbaseWebhookEvent,
  rawPayload: unknown,
): Promise<CoinbaseEventResult> {
  // 1. Replay protection — INSERT with conflict-handling.
  const { error: dedupeError } = await db
    .from("coinbase_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      charge_id: event.data?.id ?? null,
      payload: rawPayload,
    });

  if (dedupeError) {
    // PRIMARY KEY collision = replay.
    const message = dedupeError.message?.toLowerCase() ?? "";
    if (message.includes("duplicate") || message.includes("unique")) {
      return { kind: "replay", event_id: event.id };
    }
    return { kind: "internal", detail: "webhook_log_insert_failed" };
  }

  // 2. Process by event type.
  if (event.type === "charge:confirmed") {
    const chargeId = event.data?.id;
    if (!chargeId) {
      return { kind: "irrelevant", reason: "missing_charge_id" };
    }
    // Mark the stake_charges row as confirmed. UPDATE-only — this should
    // never CREATE a row; the row was inserted at charge-create time.
    const { error: updateError } = await db
      .from("stake_charges")
      .update({
        status: STAKE_CHARGE_STATUS.CONFIRMED,
        confirmed_at: new Date().toISOString(),
        raw_charge: rawPayload,
      })
      .eq("charge_id", chargeId)
      .eq("status", STAKE_CHARGE_STATUS.PENDING);
    if (updateError) {
      return { kind: "internal", detail: "stake_charge_update_failed" };
    }
    return { kind: "ok" };
  }

  if (event.type === "charge:failed" || event.type === "charge:resolved") {
    // resolved = expired / cancelled. Both terminal-not-claimable.
    const chargeId = event.data?.id;
    if (chargeId) {
      await db
        .from("stake_charges")
        .update({ status: STAKE_CHARGE_STATUS.EXPIRED })
        .eq("charge_id", chargeId)
        .eq("status", STAKE_CHARGE_STATUS.PENDING);
    }
    return { kind: "ok" };
  }

  return { kind: "irrelevant", reason: `unhandled_type:${event.type}` };
}

// ── Stake claim ──────────────────────────────────────────────

export type ClaimStakeError =
  | { kind: "not_found" }
  | { kind: "not_confirmed"; status: string }
  | { kind: "already_claimed" }
  | { kind: "internal"; detail?: string };

export interface ClaimStakeInput {
  /** Coinbase Commerce charge_id (NOT the stake_charges row id). */
  chargeId: string;
  displayName?: string;
}

/**
 * Claim a confirmed stake charge: create user + api_key with tier='staked',
 * mark stake_charges as claimed. Idempotent at the row level — claiming the
 * same charge twice returns `already_claimed`.
 *
 * Per F2, the refund pipeline (which would mark the charge 'refunded' after
 * the agent's first qualifying submission) is NOT wired here. That's a
 * future hardening pass with the staged-refund mitigation.
 */
export async function claimStake(
  db: SupabaseClient,
  input: ClaimStakeInput,
): Promise<{ ok: true; result: RegistrationResult } | { ok: false; error: ClaimStakeError }> {
  // 1. Find the charge row.
  const { data: row, error: findError } = await db
    .from("stake_charges")
    .select("*")
    .eq("charge_id", input.chargeId)
    .single();
  if (findError || !row) return { ok: false, error: { kind: "not_found" } };

  if (row.status === STAKE_CHARGE_STATUS.CLAIMED) {
    return { ok: false, error: { kind: "already_claimed" } };
  }
  if (row.status !== STAKE_CHARGE_STATUS.CONFIRMED) {
    return { ok: false, error: { kind: "not_confirmed", status: row.status } };
  }

  const tier = API_KEY_TIER.STAKED;
  const ident = randomUUID();
  const displayName = sanitizeDisplayName(input.displayName, tier);

  // 2. Create the user.
  const { data: userRow, error: userError } = await db
    .from("users")
    .insert({
      email: syntheticEmail(tier, ident),
      name: displayName,
      role: ROLE_AGENT_BUILDER,
      auth_provider_id: syntheticAuthProviderId(tier, ident),
      onboarded: true,
      // Staked agents are floor-qualified — they put up real economic stake,
      // so leaderboard inclusion is immediate.
      is_floor_qualified: true,
    })
    .select("id")
    .single();
  if (userError || !userRow) {
    return { ok: false, error: { kind: "internal", detail: "user_insert_failed" } };
  }

  // 3. Mint the api_key.
  const { plaintext, hash, prefix } = generateApiKey();
  const { data: keyRow, error: keyError } = await db
    .from("api_keys")
    .insert({
      user_id: userRow.id,
      key_hash: hash,
      prefix,
      tier,
      name: `staked-${input.chargeId.slice(0, 8)}`,
    })
    .select("id")
    .single();
  if (keyError || !keyRow) {
    await db.from("users").delete().eq("id", userRow.id);
    return { ok: false, error: { kind: "internal", detail: "api_key_insert_failed" } };
  }

  // 4. Mark the stake_charges row claimed and link.
  const { error: updateError } = await db
    .from("stake_charges")
    .update({
      status: STAKE_CHARGE_STATUS.CLAIMED,
      claimed_user_id: userRow.id,
      claimed_api_key_id: keyRow.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (updateError) {
    // Roll back the user / key — the claim atomicity matters for refunds
    // and for "didn't get a key but charge says claimed" support cases.
    await db.from("api_keys").delete().eq("id", keyRow.id);
    await db.from("users").delete().eq("id", userRow.id);
    return { ok: false, error: { kind: "internal", detail: "stake_charge_claim_failed" } };
  }

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

// ── Outbound charge creation (stub) ──────────────────────────

export interface CreateChargeInput {
  amountUsdc?: number;
  metadata?: Record<string, string>;
}

/**
 * Create a Coinbase Commerce charge for the stake-to-bootstrap flow.
 *
 * STUB. Wires up once `COINBASE_COMMERCE_API_KEY` lands in env. The wire
 * format is documented at https://commerce.coinbase.com/docs/api/.
 *
 * Until then, callers can still seed a `stake_charges` row by hand for
 * testing the claim flow against a synthetic charge_id, and the webhook
 * verification + replay protection above are fully usable.
 */
export async function createCharge(
  _input: CreateChargeInput = {},
): Promise<{ id: string; hosted_url: string; amount_usdc: number }> {
  throw new Error(
    `Coinbase Commerce charge creation not wired. ` +
      `Need COINBASE_COMMERCE_API_KEY in env. Until then, ` +
      `seed a stake_charges row directly for testing the claim flow. ` +
      `Default stake amount: ${STAKE_AMOUNT_USDC} USDC.`,
  );
}
