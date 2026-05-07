/**
 * Wallet validation — D37.
 *
 * Zod schemas + helpers for the wallet PUT/POST surface. Validates that the
 * declared payout method is supported, the address format matches the method,
 * and (where applicable) the chain is one we route to.
 *
 * Per F4 (security follow-ups), proof-of-control on the address is NOT
 * enforced here. That's a future hardening pass — set `wallet_verified_at`
 * only after a signed challenge round-trip lands.
 */

import { z } from "zod";
import {
  PAYOUT_METHOD,
  PAYOUT_METHOD_LIVE,
  PAYOUT_SUPPORTED_CHAINS,
  EVM_ADDRESS_REGEX,
  type PayoutMethod,
  type PayoutChain,
} from "@/constants";

// ── Primitive schemas ────────────────────────────────────────

export const evmAddressSchema = z
  .string()
  .regex(EVM_ADDRESS_REGEX, "Must be a 0x-prefixed 40-character hex EVM address");

export const payoutMethodSchema = z.enum([
  PAYOUT_METHOD.ONCHAIN_USDC,
  PAYOUT_METHOD.COINBASE_COMMERCE,
  PAYOUT_METHOD.STRIPE_CRYPTO,
  PAYOUT_METHOD.STRIPE_USD,
]);

export const payoutChainSchema = z.enum(PAYOUT_SUPPORTED_CHAINS);

// ── PUT /api/v1/wallet body ──────────────────────────────────
//
// Three shapes, one per supported live rail. `superRefine` enforces the
// per-method requirements that the schema's discriminated union doesn't catch
// (e.g., on-chain USDC must include both address + chain).

export const walletUpdateSchema = z
  .object({
    payout_method: payoutMethodSchema.describe(
      "Which rail to settle winnings through. Two rails are live (onchain_usdc, coinbase_commerce); the Stripe options are designed but not wired yet.",
    ),
    payout_address: z
      .string()
      .optional()
      .describe(
        "EVM address for on-chain USDC payouts. Required if method is onchain_usdc; otherwise ignored.",
      ),
    payout_chain: payoutChainSchema
      .optional()
      .describe(
        "Which EVM chain to settle on. Required if method is onchain_usdc; defaults to 'base' if omitted.",
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    // Must use a live rail.
    if (!isLiveMethod(value.payout_method)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payout_method"],
        message: `Method '${value.payout_method}' is not a live rail. Live rails: ${PAYOUT_METHOD_LIVE.join(", ")}`,
      });
      return;
    }

    // On-chain USDC requires address + chain.
    if (value.payout_method === PAYOUT_METHOD.ONCHAIN_USDC) {
      if (!value.payout_address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payout_address"],
          message: "payout_address is required for onchain_usdc",
        });
      } else if (!EVM_ADDRESS_REGEX.test(value.payout_address)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payout_address"],
          message: "Must be a 0x-prefixed 40-character hex EVM address",
        });
      }
    }

    // Coinbase Commerce: address optional (Coinbase routes to the merchant
    // account); chain not needed.
  });

export type WalletUpdate = z.infer<typeof walletUpdateSchema>;

// ── Helpers ──────────────────────────────────────────────────

export function isLiveMethod(method: PayoutMethod): boolean {
  return (PAYOUT_METHOD_LIVE as readonly PayoutMethod[]).includes(method);
}

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address);
}

export function defaultChainForMethod(method: PayoutMethod): PayoutChain | null {
  if (method === PAYOUT_METHOD.ONCHAIN_USDC) return "base";
  return null;
}

/**
 * Normalize a wallet update before persisting:
 * - lowercases the payout_address (EVM addresses are case-insensitive; storing
 *   lowercase keeps lookups consistent).
 * - fills in default chain if not provided for on-chain rails.
 * - drops fields that don't apply to the chosen method.
 */
export function normalizeWalletUpdate(input: WalletUpdate): {
  payout_method: PayoutMethod;
  payout_address: string | null;
  payout_chain: PayoutChain | null;
} {
  if (input.payout_method === PAYOUT_METHOD.ONCHAIN_USDC) {
    return {
      payout_method: input.payout_method,
      payout_address: input.payout_address!.toLowerCase(),
      payout_chain: input.payout_chain ?? defaultChainForMethod(input.payout_method)!,
    };
  }
  if (input.payout_method === PAYOUT_METHOD.COINBASE_COMMERCE) {
    return {
      payout_method: input.payout_method,
      payout_address: input.payout_address?.toLowerCase() ?? null,
      payout_chain: null,
    };
  }
  // Stripe rails (designed only) — should be rejected upstream by isLiveMethod.
  return {
    payout_method: input.payout_method,
    payout_address: input.payout_address?.toLowerCase() ?? null,
    payout_chain: null,
  };
}
