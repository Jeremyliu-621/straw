import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import {
  verifyWebhookSignature,
  processWebhookEvent,
  type CoinbaseWebhookEvent,
} from "@/services/coinbase-commerce.service";

/**
 * POST /api/v1/wallet/webhooks/coinbase — D37 path A.
 *
 * Coinbase Commerce delivers events here when a stake charge confirms,
 * fails, or expires. Signature verified via shared secret; replays
 * deduped on event.id (F7). The signature gates everything: an unsigned
 * or wrong-signed request is rejected before any DB work.
 *
 * Returns 200 on accepted (real or replay), 4xx on bad signature, 5xx on
 * internal error. Coinbase retries non-200 responses, so it's important
 * that replays return 200 (the dedupe is the point).
 *
 * Required env (validates lazily via the wallet env block):
 *   COINBASE_COMMERCE_WEBHOOK_SECRET
 */

export async function POST(req: Request) {
  const secret = env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret) {
    // Service not configured — fail-closed. 503 so Coinbase retries; admin
    // sets the env var and the next attempt succeeds.
    return NextResponse.json(
      { error: { message: "COINBASE_COMMERCE_WEBHOOK_SECRET not configured" } },
      { status: 503 },
    );
  }

  // Read the raw body for HMAC. Don't use req.json() — that consumes the
  // stream and we lose the byte-exact text that Coinbase signed.
  const rawBody = await req.text();
  const sig = req.headers.get("x-cc-webhook-signature");

  if (!verifyWebhookSignature(rawBody, sig, secret)) {
    return NextResponse.json(
      { error: { message: "Invalid signature" } },
      { status: 401 },
    );
  }

  let parsed: { event?: CoinbaseWebhookEvent };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { message: "Body is not valid JSON" } },
      { status: 400 },
    );
  }

  const event = parsed.event;
  if (!event?.id || !event?.type) {
    return NextResponse.json(
      { error: { message: "Missing event.id or event.type" } },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const result = await processWebhookEvent(db, event, parsed);

  // Replay = 200 (the dedupe is intentional — Coinbase shouldn't retry).
  if (result.kind === "replay") {
    return NextResponse.json({ ok: true, replay: true, event_id: result.event_id });
  }
  if (result.kind === "ok" || result.kind === "irrelevant") {
    return NextResponse.json({ ok: true });
  }

  // result.kind === "internal" — fail-soft. Coinbase will retry.
  return NextResponse.json(
    {
      error: {
        message: "Internal error",
        detail: result.kind === "internal" ? result.detail : undefined,
      },
    },
    { status: 500 },
  );
}
