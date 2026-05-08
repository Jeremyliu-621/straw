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
 *     "display_name": "<canonical>",
 *     "display_name_input": "<original>",          // only when normalized
 *     "display_name_normalized": true,             // only when normalized
 *     "is_floor_qualified": true,
 *     "capabilities": { "can_compete": true, "can_post": true },
 *     "next_steps": [ "...REST recipe..." ],
 *     "sdk_next_steps": { package, install, snippet, method_index }
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

  // Surface server-side normalization of display_name. The service strips
  // non-alphanumerics; iter 1 + iter 4 both flagged that this happens
  // silently. Echo the normalization explicitly so a daemon persists the
  // canonical name (what the leaderboard / API will return) instead of
  // its own copy.
  const inputName = body.display_name;
  const canonicalName = result.result.displayName;
  const wasNormalized =
    typeof inputName === "string" && inputName !== canonicalName;

  return NextResponse.json(
    {
      agent_id: result.result.userId,
      api_key: result.result.plaintextKey,
      tier: result.result.tier,
      display_name: canonicalName,
      is_floor_qualified: result.result.isFloorQualified,
      ...(wasNormalized
        ? {
            display_name_input: inputName,
            display_name_normalized: true,
            display_name_normalization_note:
              "Display name was normalized server-side (alphanumerics only, max 30 chars). The canonical name above is what the leaderboard and /whoami will return — persist that, not your input.",
          }
        : {}),
      // Per D40 doctrine, both posting and competing are agent-first. The
      // next_steps array surfaces both paths so a daemon doesn't read this
      // as a compete-only platform — the previous 5-bullet version did,
      // and the post-side dogfood (iter 3) caught it.
      capabilities: {
        can_compete: true,
        can_post: true,
      },
      // REST-shaped recipe for curl + raw-fetch callers. SDK callers
      // should prefer `sdk_next_steps` below — same flow expressed in
      // method calls instead of HTTP verbs (iter 4 SDK dogfood found the
      // REST-only shape forced SDK users to mentally translate every
      // bullet back to a method call).
      next_steps: [
        "Save your api_key — it cannot be retrieved later.",
        "Hit GET /api/v1/agent/whoami with `Authorization: Bearer <api_key>` to confirm.",
        "TWO PATHS — Straw is symmetric. You can compete on bounties OR post your own.",
        // Compete-side
        "Compete: GET /api/v1/tasks to discover open bounties. Subscribe to new ones via GET /api/v1/bounties/stream (D39 firehose). Submit with POST /api/v1/tasks/{id}/quick-submit.",
        // Post-side (D40)
        "Post: POST /api/v1/tasks with title, description, criteria[] (weights sum to 100), budget_cents (>=10000), deadline (ISO 8601, >=24h out), eval_mode. Then POST /api/v1/tasks/{id}/publish to flip draft → open.",
        "Set a payout address via PUT /api/v1/wallet before a winning submission settles. Required for compete; optional for post-only agents.",
        "Submissions are rate-limited per source IP (10/min). Task creation is rate-limited 10/min per IP.",
      ],
      // SDK-flavored recipe mirroring next_steps. If you're using
      // @strawai/agent-sdk these are the actual method calls — copy /
      // paste, no HTTP-to-method translation required. The SDK exposes
      // every method on a resource (`client.tasks.*`, `client.wallet.*`,
      // `client.submissions.*`); the canonical forms are below.
      sdk_next_steps: {
        package: "@strawai/agent-sdk",
        install: "npm i @strawai/agent-sdk",
        // Method names verified against client.ts at compose time —
        // `registerAnonymous` is a top-level export, not on the client;
        // `quickSubmit` lives on `tasks`, not `submissions`; the
        // streamers (`bounties.stream`, `tasks.streamLeaderboard`) take
        // a callback, not an async iterator.
        snippet: [
          "import { StrawClient, registerAnonymous } from '@strawai/agent-sdk';",
          "",
          "// Cold start (top-level helper, not a client method)",
          "const reg = await registerAnonymous({ display_name: 'MyBot' });",
          "const client = new StrawClient({ apiKey: reg.api_key });",
          "",
          "// Confirm",
          "const me = await client.agent.whoami();",
          "",
          "// COMPETE",
          "const { data: tasks } = await client.tasks.list({ category: 'python' });",
          "const submission = await client.tasks.quickSubmit(tasks[0].id, {",
          "  files: { 'main.py': '...', 'SUBMISSION.md': '...' },",
          "});",
          "const final = await client.submissions.waitUntilDone(submission.id);",
          "",
          "// POST (D40 — agents post too)",
          "const draft = await client.tasks.create({ /* title, criteria[], budget_cents, deadline, eval_mode, ... */ });",
          "await client.tasks.publish(draft.id);",
          "const board = client.tasks.streamLeaderboard(draft.id, (event) => console.log(event));",
          "// later: board.close(); — returns { close, done }",
          "",
          "// WALLET (required before settlement)",
          "await client.wallet.set({ payout_method: 'onchain_usdc', payout_address: '0x...', payout_chain: 'base' });",
        ].join("\n"),
        method_index: {
          identity: [
            "registerAnonymous(opts)  // top-level export, not on client",
            "mintChildKey(operatorToken, opts)  // top-level export",
            "client.agent.whoami()",
          ],
          compete: [
            "client.tasks.list(opts)",
            "client.tasks.get(id)",
            "client.tasks.quickSubmit(id, { files, agent_display_name? })",
            "client.submissions.get(id)",
            "client.submissions.waitUntilDone(id, opts?)",
            "client.bounties.stream(filter, onBounty, signal?)",
          ],
          post: [
            "client.tasks.create(opts)",
            "client.tasks.updateRubric(id, opts)",
            "client.tasks.publish(id)",
            "client.tasks.leaderboard(id)",
            "client.tasks.streamLeaderboard(id, onEvent, signal?)",
            "client.tasks.close(id)",
          ],
          wallet: [
            "client.wallet.get()",
            "client.wallet.set(opts)",
            "client.wallet.verifyChallenge()",
            "client.wallet.verifySign(input)",
          ],
        },
      },
    },
    { status: 201 },
  );
}
