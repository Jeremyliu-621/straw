/**
 * Payout settlement worker.
 *
 * Polls `agent_payouts` for `pending` rows, settles via the configured
 * rail, transitions through `queued → sent → confirmed` (or `failed`).
 *
 * Run as a separate Node process:
 *   tsx src/workers/payout-worker.ts
 *
 * Required env:
 *   - SETTLEMENT_HOT_WALLET_PRIVATE_KEY (0x-prefixed 64-hex)
 *   - SETTLEMENT_RPC_URL_BASE (and optionally _OPTIMISM, _ARBITRUM, _MAINNET)
 *   - SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *
 * Without env, the worker logs a warning at startup and runs in
 * "dry-run" mode — pending payouts are marked failed with a clear
 * not_configured reason. Useful for staging while keys aren't deployed.
 *
 * Loop interval: 10s. Confirmation polling: 15s. Both tunable via env
 * (SETTLEMENT_POLL_MS, SETTLEMENT_CONFIRM_POLL_MS) once needed.
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import {
  claimNextPendingPayout,
  markPayoutSent,
  markPayoutConfirmed,
  markPayoutFailed,
} from "@/services/payout.service";
import { sendUsdc, isConfirmed } from "@/services/onchain-usdc.service";
import { PAYOUT_METHOD, type PayoutChain } from "@/constants";

if (existsSync(".env.local")) loadEnv({ path: ".env.local" });
else loadEnv();

const POLL_MS = Number.parseInt(process.env.SETTLEMENT_POLL_MS ?? "10000", 10);
const CONFIRM_POLL_MS = Number.parseInt(process.env.SETTLEMENT_CONFIRM_POLL_MS ?? "15000", 10);

function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const line = `[payout-worker] ${level.toUpperCase()} ${message}`;
  if (data) console.log(line, data);
  else console.log(line);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    log("error", "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Exiting.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const hasHotWallet = !!process.env.SETTLEMENT_HOT_WALLET_PRIVATE_KEY;
  if (!hasHotWallet) {
    log("warn", "SETTLEMENT_HOT_WALLET_PRIVATE_KEY not set — dry-run mode. Pending payouts will be marked failed with a not_configured reason.");
  } else {
    log("info", `Hot wallet configured. Polling every ${POLL_MS}ms.`);
  }

  // Graceful shutdown.
  let shouldStop = false;
  process.on("SIGINT", () => { shouldStop = true; });
  process.on("SIGTERM", () => { shouldStop = true; });

  // Cast once — supabase-js's createClient default generics differ from
  // the service-layer SupabaseClient type. Runtime is identical.
  const castDb = db as unknown as DB;

  while (!shouldStop) {
    try {
      await tick(castDb);
    } catch (err) {
      log("error", "tick failed", { err: err instanceof Error ? err.message : String(err) });
    }
    await sleep(POLL_MS);
  }

  log("info", "Shutting down.");
}

type DB = Parameters<typeof claimNextPendingPayout>[0];

async function tick(db: DB) {
  const payout = await claimNextPendingPayout(db);
  if (!payout) return;

  log("info", `Picked up payout ${payout.id}`, {
    agent: payout.agent_user_id,
    amount_cents: payout.amount_cents,
    method: payout.payout_method,
  });

  if (payout.payout_method === PAYOUT_METHOD.ONCHAIN_USDC) {
    await settleOnchain(db, payout);
    return;
  }

  if (payout.payout_method === PAYOUT_METHOD.COINBASE_COMMERCE) {
    await markPayoutFailed(
      db,
      payout.id,
      "coinbase_commerce sender not implemented — use onchain_usdc",
    );
    return;
  }

  // Stripe rails — designed but not wired. Should never reach here
  // because enqueuePayout rejects them, but defend.
  await markPayoutFailed(
    db,
    payout.id,
    `unsupported payout_method: ${payout.payout_method}`,
  );
}

async function settleOnchain(
  db: DB,
  payout: { id: string; payout_address: string | null; payout_chain: string | null; amount_cents: number },
) {
  if (!payout.payout_address) {
    await markPayoutFailed(db, payout.id, "missing payout_address");
    return;
  }
  const chain = (payout.payout_chain ?? "base") as PayoutChain;

  const result = await sendUsdc({
    chain,
    toAddress: payout.payout_address as `0x${string}`,
    amountCents: payout.amount_cents,
  });

  if (result.kind === "not_configured") {
    await markPayoutFailed(db, payout.id, result.reason);
    return;
  }
  if (result.kind === "invalid_input") {
    await markPayoutFailed(db, payout.id, `invalid_input: ${result.reason}`);
    return;
  }
  if (result.kind === "send_failed") {
    await markPayoutFailed(db, payout.id, `send_failed: ${result.reason}`);
    return;
  }

  // result.kind === "ok"
  log("info", `Broadcast txHash=${result.txHash} for payout ${payout.id}`);
  await markPayoutSent(db, payout.id, result.txHash, { broadcast: true });

  // Spin a one-shot confirmation watcher. Doesn't block the main loop.
  void watchConfirmation(db, payout.id, chain, result.txHash);
}

async function watchConfirmation(
  db: DB,
  payoutId: string,
  chain: PayoutChain,
  txHash: `0x${string}`,
) {
  // Cap at 30 attempts (~7.5 min at 15s) — beyond that it's a manual
  // review case anyway.
  for (let i = 0; i < 30; i++) {
    await sleep(CONFIRM_POLL_MS);
    const confirmed = await isConfirmed(chain, txHash);
    if (confirmed) {
      log("info", `Confirmed ${txHash} for payout ${payoutId}`);
      await markPayoutConfirmed(db, payoutId);
      return;
    }
  }
  log("warn", `Timed out waiting for confirmation of ${txHash} (payout ${payoutId})`);
  // Leave the row in "sent" state — manual review will close it out.
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  log("error", `fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
