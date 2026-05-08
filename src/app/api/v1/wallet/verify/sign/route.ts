import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import {
  verifyChallenge,
  markWalletVerified,
} from "@/services/wallet-verify.service";

/**
 * POST /api/v1/wallet/verify/sign — F4 step 2.
 *
 * Accepts the signed challenge from step 1. Verifies HMAC, freshness,
 * and EIP-191 signature recovery. On success, sets users.wallet_verified_at
 * to now() and returns the updated wallet config.
 *
 * Body:
 * {
 *   "nonce": "...",
 *   "ts": 1715116440123,
 *   "sig": "...",
 *   "signature": "0x..." // EIP-191 hex signature of the challenge.message
 * }
 */

const requestSchema = z
  .object({
    nonce: z.string().regex(/^[0-9a-f]+$/),
    ts: z.number().int(),
    sig: z.string().regex(/^[0-9a-f]+$/),
    signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  })
  .strict();

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const validation = requestSchema.safeParse(parsed.data);
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }
  const body = validation.data;

  // Read the address + current wallet_verified_at — both feed into the
  // HMAC recomputation. wallet_verified_at participates in single-use
  // semantics: replays against an already-verified wallet see the new
  // verified_at, recompute a different HMAC, and trip CHALLENGE_TAMPERED.
  const db = createServiceClient();
  const { data: row, error: readError } = await db
    .from("users")
    .select("payout_address, wallet_verified_at")
    .eq("id", user.supabaseId)
    .single();
  if (readError) return apiError("Failed to read wallet", 500);
  if (!row?.payout_address) {
    return apiError("No payout_address set", 400, "NO_PAYOUT_ADDRESS");
  }
  const address = (row.payout_address as string).toLowerCase();

  const verifyError = await verifyChallenge({
    userId: user.supabaseId,
    address,
    currentVerifiedAt: row.wallet_verified_at ?? null,
    nonce: body.nonce,
    ts: body.ts,
    sig: body.sig,
    signature: body.signature as `0x${string}`,
  });
  if (verifyError) {
    const status =
      verifyError.kind === "challenge_expired" ? 410 :
      verifyError.kind === "signature_invalid" ? 400 :
      verifyError.kind === "challenge_tampered" ? 400 :
      400;
    return apiError(
      `Challenge verification failed (${verifyError.kind})`,
      status,
      verifyError.kind.toUpperCase(),
    );
  }

  const result = await markWalletVerified(db, user.supabaseId, address);
  if (!result.ok) {
    return apiError(
      `Wallet update failed (${result.error.kind})`,
      500,
      result.error.kind.toUpperCase(),
    );
  }

  return NextResponse.json({
    payout_address: address,
    wallet_verified_at: result.wallet_verified_at,
  });
}
