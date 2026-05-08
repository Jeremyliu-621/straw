/**
 * Payout service — D37 wallet pipeline.
 *
 * Enqueues an `agent_payouts` row when an agent wins (today: at deal-create
 * time; future: also at task-close-with-auto-pick). The row sits in 'pending'
 * state; a settlement worker picks it up and routes through the agent's
 * declared rail.
 *
 * Settlement itself is OUT of scope here. This service writes rows; the
 * worker reads them. The worker integration (viem/base RPC for on-chain,
 * Coinbase Commerce sender for hosted USDC) is the next session's work.
 *
 * Per F2 (security follow-ups), the staked-tier refund pipeline ALSO writes
 * here — same primitives, just a different `payout_method` and source. Not
 * yet wired.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PAYOUT_STATUS,
  PAYOUT_METHOD_LIVE,
  PLATFORM_SUCCESS_FEE_PERCENT,
  type PayoutStatus,
  type PayoutMethod,
} from "@/constants";

// ── Types ────────────────────────────────────────────────────

export interface EnqueuePayoutInput {
  agentUserId: string;
  taskId: string | null;
  submissionId?: string | null;
  /** Gross deal value in cents. The platform fee is deducted before the
   *  payout amount is computed. */
  grossAmountCents: number;
  /** Already-deducted fee in cents (caller does the math). If omitted,
   *  the standard PLATFORM_SUCCESS_FEE_PERCENT is applied here. */
  platformFeeCents?: number;
  currency?: string;
}

export type EnqueuePayoutError =
  | { kind: "no_wallet" }
  | { kind: "stripe_rail_unsupported"; method: PayoutMethod }
  | { kind: "user_not_found" }
  | { kind: "internal"; detail?: string };

export interface PendingPayout {
  id: string;
  agent_user_id: string;
  task_id: string | null;
  submission_id: string | null;
  amount_cents: number;
  currency: string;
  payout_method: PayoutMethod;
  payout_address: string | null;
  payout_chain: string | null;
  status: PayoutStatus;
  failure_count: number;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────

export function calculateAgentPayoutCents(
  grossCents: number,
  platformFeeCents?: number,
): number {
  const fee = platformFeeCents ?? Math.round(grossCents * (PLATFORM_SUCCESS_FEE_PERCENT / 100));
  return Math.max(0, grossCents - fee);
}

// ── Enqueue ──────────────────────────────────────────────────

/**
 * Create a pending payout row. Idempotent guard: callers should pass a
 * unique (task_id, submission_id, agent_user_id) tuple; today the schema
 * doesn't have a UNIQUE on those, so this fn doesn't enforce — that's
 * the caller's contract.
 *
 * Reads the agent's wallet config from `users` and snapshots
 * payout_method/address/chain into the row, so the settlement worker
 * doesn't need to re-read (and the agent rotating their wallet later
 * doesn't redirect an in-flight payout).
 */
export async function enqueuePayout(
  db: SupabaseClient,
  input: EnqueuePayoutInput,
): Promise<{ ok: true; payoutId: string } | { ok: false; error: EnqueuePayoutError }> {
  // 1. Read the agent's wallet config.
  const { data: walletRow, error: walletError } = await db
    .from("users")
    .select("payout_method, payout_address, payout_chain")
    .eq("id", input.agentUserId)
    .single();
  if (walletError || !walletRow) return { ok: false, error: { kind: "user_not_found" } };

  if (!walletRow.payout_method) {
    return { ok: false, error: { kind: "no_wallet" } };
  }

  const method = walletRow.payout_method as PayoutMethod;
  if (!(PAYOUT_METHOD_LIVE as readonly PayoutMethod[]).includes(method)) {
    // Stripe rails are designed but not wired. Refuse to enqueue here so we
    // never accumulate un-settle-able rows.
    return { ok: false, error: { kind: "stripe_rail_unsupported", method } };
  }

  const amountCents = calculateAgentPayoutCents(
    input.grossAmountCents,
    input.platformFeeCents,
  );
  if (amountCents <= 0) {
    return { ok: false, error: { kind: "internal", detail: "amount_must_be_positive" } };
  }

  // 2. Insert.
  const { data: row, error: insertError } = await db
    .from("agent_payouts")
    .insert({
      agent_user_id: input.agentUserId,
      task_id: input.taskId,
      submission_id: input.submissionId ?? null,
      amount_cents: amountCents,
      currency: input.currency ?? "USD",
      payout_method: method,
      payout_address: walletRow.payout_address ?? null,
      payout_chain: walletRow.payout_chain ?? null,
      status: PAYOUT_STATUS.PENDING,
    })
    .select("id")
    .single();
  if (insertError || !row) {
    return { ok: false, error: { kind: "internal", detail: "payout_insert_failed" } };
  }

  return { ok: true, payoutId: row.id };
}

// ── Status transitions ───────────────────────────────────────

/**
 * Pull the next pending payout for a worker to process. Sets `queued_at`
 * and transitions status to 'queued' atomically (well — as atomically as
 * supabase-js allows — see comment).
 *
 * Without `FOR UPDATE SKIP LOCKED` (which supabase-js doesn't expose on
 * its query builder), two workers can race here and both grab the same
 * row. The downstream settlement worker should be idempotent on the
 * payout_id (e.g., check if a tx has already been broadcast for this
 * row before sending) until we move to a proper queue.
 */
export async function claimNextPendingPayout(
  db: SupabaseClient,
): Promise<PendingPayout | null> {
  const { data: rows, error } = await db
    .from("agent_payouts")
    .select(
      "id, agent_user_id, task_id, submission_id, amount_cents, currency, payout_method, payout_address, payout_chain, status, failure_count, created_at",
    )
    .eq("status", PAYOUT_STATUS.PENDING)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !rows || rows.length === 0) return null;
  const row = rows[0] as PendingPayout;

  const { error: updateError } = await db
    .from("agent_payouts")
    .update({ status: PAYOUT_STATUS.QUEUED, queued_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", PAYOUT_STATUS.PENDING); // race guard
  if (updateError) return null;

  return { ...row, status: PAYOUT_STATUS.QUEUED };
}

export async function markPayoutSent(
  db: SupabaseClient,
  payoutId: string,
  txid: string,
  rawProviderResponse?: unknown,
): Promise<void> {
  await db
    .from("agent_payouts")
    .update({
      status: PAYOUT_STATUS.SENT,
      sent_at: new Date().toISOString(),
      txid,
      raw_provider_response: rawProviderResponse ?? null,
    })
    .eq("id", payoutId);
}

export async function markPayoutConfirmed(
  db: SupabaseClient,
  payoutId: string,
  rawProviderResponse?: unknown,
): Promise<void> {
  await db
    .from("agent_payouts")
    .update({
      status: PAYOUT_STATUS.CONFIRMED,
      confirmed_at: new Date().toISOString(),
      raw_provider_response: rawProviderResponse ?? null,
    })
    .eq("id", payoutId);
}

export async function markPayoutFailed(
  db: SupabaseClient,
  payoutId: string,
  errorMessage: string,
  rawProviderResponse?: unknown,
): Promise<void> {
  // Increment failure_count via a sub-select so we don't need to read first.
  // supabase-js doesn't have an atomic increment, so we pull and write back.
  const { data } = await db
    .from("agent_payouts")
    .select("failure_count")
    .eq("id", payoutId)
    .single();

  await db
    .from("agent_payouts")
    .update({
      status: PAYOUT_STATUS.FAILED,
      error_message: errorMessage,
      failure_count: (data?.failure_count ?? 0) + 1,
      raw_provider_response: rawProviderResponse ?? null,
    })
    .eq("id", payoutId);
}
