import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServiceClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import { apiError, parseBody } from "@/lib/api-utils";
import { createCharge } from "@/services/coinbase-commerce.service";
import { STAKE_AMOUNT_USDC, STAKE_CHARGE_STATUS } from "@/constants";

/**
 * POST /api/v1/agent/stake/charge — D37 path A side 1.
 *
 * Creates a Coinbase Commerce charge for the stake-to-bootstrap amount
 * (5 USDC by default). Returns the hosted_url the agent (or its operator)
 * can pay at. Persists a `stake_charges` row in 'pending' state so the
 * webhook handler can transition it to 'confirmed' once paid.
 *
 * Returns 503 if `COINBASE_COMMERCE_API_KEY` isn't configured. No prior
 * auth required — anyone willing to pay 5 USDC can mint a key.
 *
 * Body (optional):
 *   {
 *     "metadata": { "purpose": "...", "..." }   // returned in webhook
 *   }
 */

const requestSchema = z
  .object({
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const apiKey = env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    return apiError(
      "Stake charge creation is not configured. COINBASE_COMMERCE_API_KEY missing.",
      503,
      "STAKE_NOT_CONFIGURED",
    );
  }

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const validation = requestSchema.safeParse(parsed.data ?? {});
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }

  const result = await createCharge(apiKey, {
    amountUsdc: STAKE_AMOUNT_USDC,
    metadata: validation.data.metadata,
  });

  if (!result.ok) {
    if (result.error.kind === "not_configured") {
      // Should be unreachable since we checked above, but defend.
      return apiError("Stake charge creation is not configured.", 503, "STAKE_NOT_CONFIGURED");
    }
    if (result.error.kind === "api_error") {
      return apiError(
        "Coinbase Commerce rejected the charge",
        502,
        "COINBASE_API_ERROR",
        { status: result.error.status, body: result.error.body },
      );
    }
    return apiError("Charge creation failed", 500, "CHARGE_FAILED", {
      detail: result.error.detail,
    });
  }

  // Persist the pending charge so the webhook can find it later.
  const db = createServiceClient();
  const { error: insertError } = await db.from("stake_charges").insert({
    charge_id: result.charge.id,
    amount_usdc: result.charge.amount_usdc,
    status: STAKE_CHARGE_STATUS.PENDING,
    raw_charge: result.charge.raw,
  });

  if (insertError) {
    // The charge exists at Coinbase but our row failed to write. Surface
    // the charge details so the operator can recover by hand if needed.
    return apiError(
      "Charge created at Coinbase but failed to persist locally — webhook will not find a matching row. Contact support with the charge_id below.",
      500,
      "STAKE_CHARGE_PERSIST_FAILED",
      {
        coinbase_charge_id: result.charge.id,
        hosted_url: result.charge.hosted_url,
      },
    );
  }

  return NextResponse.json(
    {
      charge_id: result.charge.id,
      hosted_url: result.charge.hosted_url,
      amount_usdc: result.charge.amount_usdc,
      status: STAKE_CHARGE_STATUS.PENDING,
      next_steps: [
        "Pay the hosted_url with USDC.",
        "Webhook fires `charge:confirmed` → status flips to 'confirmed'.",
        "Then call POST /api/v1/agent/stake/claim with this charge_id to mint your api_key.",
      ],
    },
    { status: 201 },
  );
}
