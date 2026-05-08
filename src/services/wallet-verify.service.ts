/**
 * Wallet proof-of-control — F4 mitigation.
 *
 * Two-step EIP-191 sign-and-verify flow:
 *   1. Client requests a challenge: nonce + timestamp + HMAC.
 *   2. Client signs the human-readable challenge message with the EVM key
 *      that controls the declared payout address.
 *   3. Client posts the signature back. Server verifies the HMAC (so the
 *      challenge wasn't crafted client-side), checks freshness (≤ 5 min),
 *      verifies the EIP-191 signature recovers to the declared address,
 *      and sets `users.wallet_verified_at`.
 *
 * No DB state for the nonce — the HMAC is the integrity check, the
 * timestamp is the freshness check. Reuses AUTH_SECRET as the keying
 * material; if you ever rotate that secret, in-flight challenges become
 * invalid.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { verifyMessage } from "viem";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EVM_ADDRESS_REGEX } from "@/constants";

/**
 * Read AUTH_SECRET directly from process.env so this service stays
 * usable in test mode (where the lazy `env` proxy returns an empty
 * object). Fail loud if missing — there's no safe fallback.
 */
function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set; cannot compute wallet-verify HMAC");
  return s;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_BYTES = 16;

export interface Challenge {
  /** Random 32-hex-char nonce. */
  nonce: string;
  /** Unix-millis timestamp when the challenge was issued. */
  ts: number;
  /** HMAC-SHA256(secret, `${nonce}|${ts}|${userId}|${address}`). */
  sig: string;
  /** The exact human-readable message the user must sign. */
  message: string;
}

export type VerifyError =
  | { kind: "challenge_invalid_format" }
  | { kind: "challenge_bad_hmac" }
  | { kind: "challenge_expired" }
  | { kind: "address_mismatch" }
  | { kind: "signature_invalid" }
  | { kind: "user_not_found" }
  | { kind: "no_payout_address" }
  | { kind: "address_not_matched" }
  | { kind: "internal"; detail?: string };

/**
 * Issue a fresh challenge. The `address` arg is the lowercased EVM hex of
 * the agent's *declared* payout address (read by the route from
 * `users.payout_address` before calling).
 */
export function buildChallenge(userId: string, address: string): Challenge {
  const nonce = randomBytes(NONCE_BYTES).toString("hex");
  const ts = Date.now();
  const sig = computeHmac(nonce, ts, userId, address);
  const message = formatMessage(address, nonce, ts);
  return { nonce, ts, sig, message };
}

function formatMessage(address: string, nonce: string, ts: number): string {
  // EIP-191 signed message body. Human-readable so a wallet's signing UI
  // shows what the user is approving.
  return [
    `Straw — verify ownership of ${address}`,
    ``,
    `nonce: ${nonce}`,
    `issued_at: ${new Date(ts).toISOString()}`,
    `valid_for: 5 minutes`,
  ].join("\n");
}

function computeHmac(nonce: string, ts: number, userId: string, address: string): string {
  return createHmac("sha256", authSecret())
    .update(`${nonce}|${ts}|${userId}|${address}`)
    .digest("hex");
}

function timingEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export interface VerifyInput {
  userId: string;
  /** EVM address being verified (lowercased). */
  address: string;
  nonce: string;
  ts: number;
  /** HMAC handed back from buildChallenge. */
  sig: string;
  /** The hex-encoded EIP-191 signature produced by signing the challenge
   *  message with the address's private key. */
  signature: `0x${string}`;
}

/**
 * Verify a signed challenge. Returns null on success; an error variant
 * otherwise. Caller is responsible for setting `users.wallet_verified_at`
 * via `markWalletVerified` once this returns null.
 */
export async function verifyChallenge(input: VerifyInput): Promise<VerifyError | null> {
  if (!EVM_ADDRESS_REGEX.test(input.address)) {
    return { kind: "challenge_invalid_format" };
  }
  if (typeof input.nonce !== "string" || input.nonce.length !== NONCE_BYTES * 2) {
    return { kind: "challenge_invalid_format" };
  }
  if (typeof input.ts !== "number" || !Number.isFinite(input.ts)) {
    return { kind: "challenge_invalid_format" };
  }

  // 1. HMAC integrity — proves we issued this challenge.
  const expectedHmac = computeHmac(input.nonce, input.ts, input.userId, input.address);
  if (!timingEqualHex(expectedHmac, input.sig)) {
    return { kind: "challenge_bad_hmac" };
  }

  // 2. Freshness.
  const ageMs = Date.now() - input.ts;
  if (ageMs < 0 || ageMs > CHALLENGE_TTL_MS) {
    return { kind: "challenge_expired" };
  }

  // 3. EIP-191 signature recovery.
  const message = formatMessage(input.address, input.nonce, input.ts);
  let recovered: boolean;
  try {
    recovered = await verifyMessage({
      address: input.address as `0x${string}`,
      message,
      signature: input.signature,
    });
  } catch {
    return { kind: "signature_invalid" };
  }
  if (!recovered) return { kind: "signature_invalid" };

  return null;
}

/**
 * Mark the wallet verified for the given user. Asserts the address still
 * matches what's on the user row — guards against TOCTOU where the user
 * updates their wallet between challenge-issue and verify.
 */
export async function markWalletVerified(
  db: SupabaseClient,
  userId: string,
  address: string,
): Promise<{ ok: true; wallet_verified_at: string } | { ok: false; error: VerifyError }> {
  const { data: row, error: readError } = await db
    .from("users")
    .select("payout_address")
    .eq("id", userId)
    .single();
  if (readError || !row) return { ok: false, error: { kind: "user_not_found" } };

  if (!row.payout_address) return { ok: false, error: { kind: "no_payout_address" } };
  if ((row.payout_address as string).toLowerCase() !== address.toLowerCase()) {
    return { ok: false, error: { kind: "address_not_matched" } };
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await db
    .from("users")
    .update({ wallet_verified_at: verifiedAt })
    .eq("id", userId);
  if (updateError) {
    return { ok: false, error: { kind: "internal", detail: "update_failed" } };
  }

  return { ok: true, wallet_verified_at: verifiedAt };
}
