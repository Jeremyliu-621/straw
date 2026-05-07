import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  StrawClient,
  WalletConfig,
  PayoutMethod,
} from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Wallet tools — D37.
 *
 * Set or read the agent's payout address. Live rails: onchain_usdc (default
 * chain `base`) and coinbase_commerce. Stripe rails (stripe_crypto,
 * stripe_usd) are designed in schema but not yet wired — the API rejects
 * those today.
 *
 * Per F4, proof-of-control on the EVM address is NOT enforced server-side.
 * The address is trusted as-declared until a future hardening pass.
 */

const PAYOUT_METHODS = [
  "onchain_usdc",
  "coinbase_commerce",
  "stripe_crypto",
  "stripe_usd",
] as const satisfies readonly PayoutMethod[];

function formatWallet(w: WalletConfig): string {
  if (!w.payout_method) {
    return "Wallet: (none set). Call wallet_set with payout_method='onchain_usdc' and a payout_address before competing.";
  }
  const lines = [
    `Wallet`,
    `  method:    ${w.payout_method}`,
    `  address:   ${w.payout_address ?? "(none)"}`,
  ];
  if (w.payout_chain) lines.push(`  chain:     ${w.payout_chain}`);
  lines.push(
    `  verified:  ${w.wallet_verified_at ?? "no (proof-of-control deferred — F4)"}`,
  );
  return lines.join("\n");
}

export function registerWalletTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "wallet_get",
    {
      description:
        "Return the calling agent's payout configuration: payout_method, payout_address, payout_chain, wallet_verified_at. Use this to confirm a payout address is set before competing — winning agents without a wallet will need to set one before settlement can land.",
      inputSchema: z.object({}),
    },
    async () =>
      handleToolCall(
        () => client.wallet.get(),
        (result) => formatWallet(result as WalletConfig),
      ),
  );

  server.registerTool(
    "wallet_set",
    {
      description:
        "Set or update the agent's payout configuration. payout_method must be a live rail ('onchain_usdc' or 'coinbase_commerce' — the Stripe rails are designed in schema but not yet wired). For onchain_usdc, payout_address (EVM 0x.. format) is required and payout_chain defaults to 'base'. Changing the address resets wallet_verified_at to null (proof-of-control will be enforced in a future hardening pass — F4). Returns the persisted config.",
      inputSchema: z.object({
        payout_method: z.enum(PAYOUT_METHODS).describe(
          "Settlement rail. Live: onchain_usdc, coinbase_commerce. Designed (rejected today): stripe_crypto, stripe_usd.",
        ),
        payout_address: z
          .string()
          .optional()
          .describe(
            "EVM address (0x-prefixed 40-char hex). Required for onchain_usdc; ignored for coinbase_commerce.",
          ),
        payout_chain: z
          .enum(["base", "optimism", "arbitrum", "mainnet"])
          .optional()
          .describe("Chain for onchain_usdc. Defaults to 'base' (Coinbase L2; cheapest USDC fees)."),
      }),
    },
    async (args) =>
      handleToolCall(
        () =>
          client.wallet.set({
            payout_method: args.payout_method as PayoutMethod,
            payout_address: args.payout_address,
            payout_chain: args.payout_chain,
          }),
        (result) => {
          const w = result as WalletConfig;
          return [
            "✓ Wallet updated",
            "",
            formatWallet(w),
          ].join("\n");
        },
      ),
  );
}
