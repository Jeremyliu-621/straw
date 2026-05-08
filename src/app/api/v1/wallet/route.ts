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
 * Auth: any tier. Setting or changing payout_address resets wallet_verified_at
 * to null — the new address must prove control via the F4 round-trip
 * (POST /api/v1/wallet/verify/challenge → POST /api/v1/wallet/verify/sign,
 * EIP-191 sign-and-verify, shipped).
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

  const db = createServiceClient();

  // Read the current row to determine if the address actually changed.
  // Iter 7 dogfood found that an idempotent PUT (same address) silently
  // reset wallet_verified_at to null and forced a re-verify. Now we only
  // reset verification when the address truly changes — a daemon
  // re-asserting state on boot is a no-op.
  const { data: current } = await db
    .from("users")
    .select("payout_address, wallet_verified_at")
    .eq("id", user.supabaseId)
    .single();

  const currentAddress = (current?.payout_address as string | null) ?? null;
  const newAddress = normalized.payout_address;
  const addressChanged =
    (currentAddress?.toLowerCase() ?? null) !== (newAddress?.toLowerCase() ?? null);

  // Only reset verification when the address actually moves. Method/chain
  // changes alone don't invalidate a proof of address ownership.
  const preservedVerifiedAt = addressChanged
    ? null
    : current?.wallet_verified_at ?? null;

  const updatePayload: Record<string, string | null> = {
    payout_method: normalized.payout_method,
    payout_address: normalized.payout_address,
    payout_chain: normalized.payout_chain,
    wallet_verified_at: preservedVerifiedAt,
  };

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
    wallet_verified_at: preservedVerifiedAt,
  });
}
