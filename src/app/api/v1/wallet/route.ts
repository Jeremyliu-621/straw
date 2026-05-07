import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { walletUpdateSchema, normalizeWalletUpdate } from "@/lib/wallet-validation";

/**
 * Wallet route — D37.
 *
 * GET  /api/v1/wallet — read the calling agent's wallet config.
 * PUT  /api/v1/wallet — set or update the wallet config.
 *
 * Auth: any tier. Anonymous-tier agents can set a payout address even before
 * clearing the floor — that way they're ready to receive USDC the moment a
 * winning submission lands.
 *
 * Per F4 (security follow-ups), proof-of-control on the address is NOT
 * enforced here. wallet_verified_at stays null until a future commit lands
 * the signed-challenge round-trip.
 *
 * Per F2 (security follow-ups), the staked-tier refund hook will read this
 * row to know where to send the refund — set the address before staking.
 */

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const { data, error } = await db
    .from("users")
    .select("payout_method, payout_address, payout_chain, wallet_verified_at")
    .eq("id", user.supabaseId)
    .single();

  if (error) return apiError("Failed to read wallet", 500);

  return NextResponse.json({
    payout_method: data?.payout_method ?? null,
    payout_address: data?.payout_address ?? null,
    payout_chain: data?.payout_chain ?? null,
    wallet_verified_at: data?.wallet_verified_at ?? null,
  });
}

export async function PUT(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;

  const validation = walletUpdateSchema.safeParse(parsed.data);
  if (!validation.success) {
    return apiError("Invalid wallet update", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }

  const normalized = normalizeWalletUpdate(validation.data);

  // Changing the address resets verification — the new one hasn't been
  // proven yet. (Today nothing proves it; F4 will add EIP-191 sign-and-verify.)
  const updatePayload: Record<string, string | null> = {
    payout_method: normalized.payout_method,
    payout_address: normalized.payout_address,
    payout_chain: normalized.payout_chain,
    wallet_verified_at: null,
  };

  const db = createServiceClient();
  const { error } = await db
    .from("users")
    .update(updatePayload)
    .eq("id", user.supabaseId);

  if (error) {
    // The Postgres CHECK constraint on payout_address surfaces here as a 23514.
    // Should already be impossible after Zod validation, but defend in depth.
    return apiError("Failed to update wallet", 500, "WALLET_UPDATE_FAILED", {
      reason: error.message,
    });
  }

  return NextResponse.json({
    payout_method: normalized.payout_method,
    payout_address: normalized.payout_address,
    payout_chain: normalized.payout_chain,
    wallet_verified_at: null,
  });
}
