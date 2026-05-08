import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import {
  createOperatorToken,
  listOperatorTokens,
} from "@/services/operator-token.service";
import { OPERATOR_TOKEN_DEFAULT_MONTHLY_QUOTA } from "@/constants";

/**
 * GET  /api/v1/operator-tokens — list the caller's operator tokens.
 * POST /api/v1/operator-tokens — create a new operator token.
 *
 * Auth: D37 path B requires the caller to be a "human-attached" identity
 * (verified tier or operator-child of a verified operator). Anonymous and
 * staked tiers cannot create operator tokens — that would invert the trust
 * model (an operator token is a quota-grant from a known account).
 *
 * Returns the plaintext ONCE on POST. On GET, only metadata + prefix.
 */

const createSchema = z
  .object({
    label: z.string().min(1).max(100).optional(),
    monthly_quota_submissions: z
      .number()
      .int()
      .min(1)
      .max(100_000)
      .optional()
      .describe(
        `Maximum submissions across all child keys per month. Default ${OPERATOR_TOKEN_DEFAULT_MONTHLY_QUOTA}.`,
      ),
    child_quota_pct: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Per-child cap as percent of monthly quota. 100 = any child can use the full operator quota. Lower values limit blast radius if a child key is compromised.",
      ),
  })
  .strict();

export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const tokens = await listOperatorTokens(db, user.supabaseId);

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      label: t.label,
      prefix: t.prefix,
      monthly_quota_submissions: t.monthly_quota_submissions,
      used_quota_submissions: t.used_quota_submissions,
      child_quota_pct: t.child_quota_pct,
      last_used_at: t.last_used_at,
      created_at: t.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const user = await authenticateRequest(req);
  if (!user) return apiError("Unauthorized", 401);

  // D37: only verified-tier callers can create operator tokens. Anonymous /
  // staked / operator-child callers can't — that would break the trust model.
  if (user.tier !== "verified") {
    return apiError(
      "Operator tokens can only be created by verified accounts",
      403,
      "TIER_FORBIDDEN",
      { your_tier: user.tier },
    );
  }

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;

  const validation = createSchema.safeParse(parsed.data ?? {});
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }

  const db = createServiceClient();
  const result = await createOperatorToken(db, user.supabaseId, {
    label: validation.data.label,
    monthlyQuotaSubmissions: validation.data.monthly_quota_submissions,
    childQuotaPct: validation.data.child_quota_pct,
  });

  if (!result.ok) {
    if (result.error.kind === "max_per_user") {
      return apiError(
        `You've reached the maximum of ${result.error.limit} active operator tokens`,
        409,
        "MAX_OPERATOR_TOKENS",
        { current: result.error.current, limit: result.error.limit },
      );
    }
    return apiError("Failed to create operator token", 500, "OPERATOR_TOKEN_CREATE_FAILED");
  }

  return NextResponse.json(
    {
      id: result.token.id,
      label: result.token.label,
      prefix: result.token.prefix,
      monthly_quota_submissions: result.token.monthly_quota_submissions,
      child_quota_pct: result.token.child_quota_pct,
      // ⚠ shown ONCE — operator must save this; never returned again.
      operator_token: result.plaintext,
      next_steps: [
        "Save the operator_token — it cannot be retrieved later.",
        "Daemons mint child api_keys via POST /api/v1/operator-tokens/{id}/mint-child-key with `Authorization: Bearer <operator_token>`.",
        "Each child key has its own user identity (and thus its own reputation), but counts against this operator's monthly quota.",
        "Revoke this token via DELETE /api/v1/operator-tokens/{id} to invalidate all children.",
      ],
    },
    { status: 201 },
  );
}
