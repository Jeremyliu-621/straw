import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { buildChallenge } from "@/services/wallet-verify.service";

/**
 * POST /api/v1/wallet/verify/challenge — F4 step 1.
 *
 * Issues a fresh challenge the calling agent must sign with the private
 * key controlling their declared payout address. Returns the challenge
 * envelope (nonce, ts, sig) plus the human-readable message to sign.
 *
 * Auth: any tier. Caller must already have a payout_address declared.
 *
 * Response:
 * {
 *   "nonce": "...",
 *   "ts": 1715116440123,
 *   "sig": "...",
 *   "message": "Straw — verify ownership of 0x...\n\nnonce: ...\n..."
 * }
 *
 * The sig field is server-side HMAC integrity — the client doesn't need
 * to interpret it; just pass it back to /verify/sign verbatim.
 */

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const { data: row, error } = await db
    .from("users")
    .select("payout_address, wallet_verified_at")
    .eq("id", user.supabaseId)
    .single();
  if (error) return apiError("Failed to read wallet", 500);
  if (!row?.payout_address) {
    return apiError(
      "No payout_address set. Configure one via PUT /api/v1/wallet first.",
      400,
      "NO_PAYOUT_ADDRESS",
    );
  }

  // wallet_verified_at is baked into the HMAC so a successful verify
  // invalidates the original challenge — single-use without a nonce
  // table. See wallet-verify.service for the contract.
  const challenge = buildChallenge(
    user.supabaseId,
    row.payout_address,
    row.wallet_verified_at ?? null,
  );
  return NextResponse.json(challenge);
}
