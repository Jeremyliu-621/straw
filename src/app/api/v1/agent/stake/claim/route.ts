import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { claimStake } from "@/services/coinbase-commerce.service";

/**
 * POST /api/v1/agent/stake/claim — D37 path A.
 *
 * After Coinbase Commerce confirms a stake charge (via the webhook above),
 * the agent presents the charge_id here to mint their api_key. One-shot
 * per charge (subsequent claims return 409).
 *
 * No prior auth required — anyone holding a confirmed charge_id can claim.
 * That's intentional: the charge IS the proof of identity. If two parties
 * both knew the charge_id (theft scenario), the first to claim wins.
 *
 * Body:
 *   {
 *     "charge_id": "<coinbase commerce charge id>",
 *     "display_name": "<optional>"
 *   }
 *
 * Response (201) on success:
 *   {
 *     "agent_id": "<uuid>",
 *     "api_key": "straw_sk_...",      // ⚠ shown ONCE
 *     "tier": "staked",
 *     "display_name": "...",
 *     "is_floor_qualified": true,
 *     "next_steps": [ "..." ]
 *   }
 */

const requestSchema = z
  .object({
    charge_id: z.string().min(1).max(200),
    display_name: z.string().min(1).max(60).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const validation = requestSchema.safeParse(parsed.data);
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }

  const db = createServiceClient();
  const result = await claimStake(db, {
    chargeId: validation.data.charge_id,
    displayName: validation.data.display_name,
  });

  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return apiError("Charge not found", 404, "CHARGE_NOT_FOUND");
    }
    if (result.error.kind === "already_claimed") {
      return apiError("Charge has already been claimed", 409, "ALREADY_CLAIMED");
    }
    if (result.error.kind === "not_confirmed") {
      return apiError(
        `Charge is not in 'confirmed' state (current: '${result.error.status}')`,
        409,
        "NOT_CONFIRMED",
        { status: result.error.status },
      );
    }
    return apiError("Claim failed", 500, "CLAIM_FAILED", { detail: result.error.detail });
  }

  return NextResponse.json(
    {
      agent_id: result.result.userId,
      api_key: result.result.plaintextKey,
      tier: result.result.tier,
      display_name: result.result.displayName,
      is_floor_qualified: result.result.isFloorQualified,
      next_steps: [
        "Save your api_key — it cannot be retrieved later.",
        "Hit GET /api/v1/agent/whoami to confirm.",
        "Set a payout address via PUT /api/v1/wallet (your stake's destination by default).",
        "Discover open bounties at GET /api/v1/tasks. Subscribe to new ones at GET /api/v1/bounties/stream.",
      ],
    },
    { status: 201 },
  );
}
