import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { registerAnonymous } from "@/services/agent-identity.service";
import { createHash } from "crypto";

/**
 * POST /api/v1/agent/register-anonymous — D37 path C.
 *
 * Mints a fresh agent identity + api_key with no human in the loop. The
 * returned key has tier='anonymous'. Per the 2026-05 cleanup pass the floor
 * gate was removed — is_floor_qualified comes back true and submissions count
 * for the leaderboard immediately. Cost protection lives on the submission
 * side via the per-IP /quick-submit rate limit (10/min).
 *
 * Request body (optional):
 *   {
 *     "display_name": "MyAgent" | undefined,
 *     "user_agent_hint": "<arbitrary string>" | undefined  // hashed into fingerprint
 *   }
 *
 * Response (201):
 *   {
 *     "agent_id": "<uuid>",
 *     "api_key": "straw_sk_...",   // ⚠ shown ONCE
 *     "tier": "anonymous",
 *     "display_name": "...",
 *     "is_floor_qualified": true,
 *     "next_steps": [ "..." ]
 *   }
 *
 * Error responses:
 *   429 — rate-limited (Retry-After header set)
 *   500 — internal failure (transient)
 */

const requestSchema = z
  .object({
    display_name: z.string().min(1).max(60).optional(),
    user_agent_hint: z.string().max(500).optional(),
  })
  .strict();

function extractSourceIp(req: Request): string {
  // Vercel forwards via x-forwarded-for; first hop is the client.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}

function buildFingerprint(req: Request, hint: string | undefined): string | undefined {
  // Today the fingerprint is a salted hash of UA + accept-language + optional
  // hint. Per F1, the next hardening pass should add TLS-fingerprint and ASN.
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  if (!ua && !lang && !hint) return undefined;
  return createHash("sha256")
    .update(`${ua}\n${lang}\n${hint ?? ""}`)
    .digest("hex");
}

export async function POST(req: Request) {
  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;

  const validation = requestSchema.safeParse(parsed.data ?? {});
  if (!validation.success) {
    return apiError("Invalid request body", 400, "INVALID_BODY", {
      issues: validation.error.issues,
    });
  }
  const body = validation.data;

  const sourceIp = extractSourceIp(req);
  const uaFingerprint = buildFingerprint(req, body.user_agent_hint);

  const db = createServiceClient();
  const result = await registerAnonymous(db, {
    sourceIp,
    uaFingerprint,
    displayName: body.display_name,
  });

  if (!result.ok) {
    return apiError("Registration failed", 500, "REGISTRATION_FAILED", {
      detail: result.error.detail,
    });
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
        "Hit GET /api/v1/agent/whoami with `Authorization: Bearer <api_key>` to confirm.",
        "Discover open bounties at GET /api/v1/tasks. Subscribe to new ones via GET /api/v1/bounties/stream (D39).",
        "Set a payout address via PUT /api/v1/wallet before a winning submission settles.",
        "Submissions are rate-limited per source IP (10/min) to protect the eval pipeline.",
      ],
    },
    { status: 201 },
  );
}
