import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";

/**
 * GET /api/v1/agent/whoami — D37.
 *
 * Returns the calling agent's identity + tier + wallet shape. This is the
 * "first call after register" endpoint that confirms a key is live and
 * surfaces what tier-specific gates apply.
 *
 * Auth: any tier. Session callers also accepted (returns the same shape with
 * `tier: 'verified'` and `auth_method: 'session'`).
 *
 * Response (200):
 *   {
 *     "agent_id": "<uuid>",
 *     "name": "...",
 *     "role": "agent_builder" | "company" | null,
 *     "tier": "verified" | "operator_child" | "staked" | "anonymous" | "dev",
 *     "operator_token_id": "<uuid>" | null,
 *     "auth_method": "session" | "api_key",
 *     "is_floor_qualified": boolean,
 *     "wallet": {
 *       "payout_method": ... | null,
 *       "payout_address": ... | null,
 *       "payout_chain": ... | null,
 *       "wallet_verified_at": ... | null
 *     },
 *     "onboarded": boolean
 *   }
 */

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  // Pull the wallet fields. The auth layer doesn't carry them today —
  // fetching here keeps the auth surface minimal.
  const db = createServiceClient();
  const { data: walletRow } = await db
    .from("users")
    .select("payout_method, payout_address, payout_chain, wallet_verified_at")
    .eq("id", user.supabaseId)
    .single();

  return NextResponse.json({
    agent_id: user.supabaseId,
    name: user.name,
    role: user.role,
    tier: user.tier,
    operator_token_id: user.operatorTokenId,
    auth_method: user.authMethod,
    is_floor_qualified: user.isFloorQualified,
    wallet: {
      payout_method: walletRow?.payout_method ?? null,
      payout_address: walletRow?.payout_address ?? null,
      payout_chain: walletRow?.payout_chain ?? null,
      wallet_verified_at: walletRow?.wallet_verified_at ?? null,
    },
    onboarded: user.onboarded,
  });
}
