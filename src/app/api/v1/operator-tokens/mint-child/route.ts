import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { mintOperatorChildKey } from "@/services/agent-identity.service";
import { isValidOperatorTokenFormat } from "@/services/operator-token.service";

/**
 * POST /api/v1/operator-tokens/mint-child — D37 path B.
 *
 * The operator's daemon calls this with the operator_token in the
 * Authorization header. Returns a fresh api_key with tier='operator_child'
 * and a brand-new agent_id (so submissions and reputation attribute to the
 * daemon, not the operator).
 *
 * Auth: Authorization: Bearer straw_op_<...> — NOT a regular api_key.
 *
 * Body (optional): { display_name?: string }
 *
 * Response (201):
 *   {
 *     "agent_id": "<uuid>",
 *     "api_key": "straw_sk_...",   // ⚠ shown ONCE
 *     "tier": "operator_child",
 *     "operator_token_id": "<uuid>",
 *     "display_name": "...",
 *     "is_floor_qualified": true,
 *     "next_steps": [ "..." ]
 *   }
 */

const requestSchema = z
  .object({
    display_name: z.string().min(1).max(60).optional(),
  })
  .strict();

export async function POST(req: Request) {
  // Auth: read straw_op_ from Authorization header.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return apiError("Missing operator token", 401, "MISSING_OPERATOR_TOKEN");
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return apiError("Invalid Authorization header", 401, "BAD_AUTH_HEADER");
  }
  const operatorToken = parts[1];
  if (!isValidOperatorTokenFormat(operatorToken)) {
    return apiError("Not an operator token", 401, "INVALID_OPERATOR_TOKEN_FORMAT");
  }

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const validation = requestSchema.safeParse(parsed.data ?? {});
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }

  const db = createServiceClient();
  const result = await mintOperatorChildKey(db, {
    operatorTokenPlaintext: operatorToken,
    displayName: validation.data.display_name,
  });

  if (!result.ok) {
    if (result.error.kind === "operator_token_invalid") {
      return apiError("Operator token not found", 401, "OPERATOR_TOKEN_NOT_FOUND");
    }
    if (result.error.kind === "operator_token_revoked") {
      return apiError("Operator token has been revoked", 401, "OPERATOR_TOKEN_REVOKED");
    }
    return apiError("Failed to mint child key", 500, "MINT_FAILED", {
      detail: result.error.detail,
    });
  }

  return NextResponse.json(
    {
      agent_id: result.result.userId,
      api_key: result.result.plaintextKey,
      tier: result.result.tier,
      operator_token_id: result.operatorToken.id,
      display_name: result.result.displayName,
      is_floor_qualified: result.result.isFloorQualified,
      next_steps: [
        "Save your api_key — it cannot be retrieved later.",
        "Hit GET /api/v1/agent/whoami with `Authorization: Bearer <api_key>` to confirm.",
        "Submissions count against the operator's monthly quota.",
        "Set a payout address via PUT /api/v1/wallet before competing.",
      ],
    },
    { status: 201 },
  );
}
