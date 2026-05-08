/**
 * On-chain USDC settlement — viem-based.
 *
 * Reads the platform hot wallet's private key + per-chain RPC URLs from
 * env. If env isn't configured, every send returns `{ kind: "not_configured" }`
 * and the caller can fall back to a clear "settlement disabled" failure
 * mode instead of crashing.
 *
 * USDC has 6 decimals — convert from cents to atomic USDC carefully
 * (`1 USDC = 100 cents = 1_000_000 atomic`).
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Hash,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, optimism, arbitrum, mainnet } from "viem/chains";
import {
  USDC_CONTRACTS,
  USDC_DECIMALS,
  type PayoutChain,
} from "@/constants";

// Standard ERC-20 transfer ABI fragment.
const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const CHAIN_BY_NAME = {
  base,
  optimism,
  arbitrum,
  mainnet,
} as const;

export interface SettleInput {
  chain: PayoutChain;
  toAddress: `0x${string}`;
  amountCents: number;
}

export type SettleResult =
  | { kind: "ok"; txHash: Hash; amountUsdcAtomic: bigint }
  | { kind: "not_configured"; reason: string }
  | { kind: "send_failed"; reason: string }
  | { kind: "invalid_input"; reason: string };

function rpcUrlFor(chain: PayoutChain): string | null {
  const map = {
    base: process.env.SETTLEMENT_RPC_URL_BASE,
    optimism: process.env.SETTLEMENT_RPC_URL_OPTIMISM,
    arbitrum: process.env.SETTLEMENT_RPC_URL_ARBITRUM,
    mainnet: process.env.SETTLEMENT_RPC_URL_MAINNET,
  };
  return map[chain] ?? null;
}

function buildWalletClient(chain: PayoutChain): WalletClient | null {
  const pk = process.env.SETTLEMENT_HOT_WALLET_PRIVATE_KEY;
  const rpc = rpcUrlFor(chain);
  if (!pk || !rpc) return null;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: CHAIN_BY_NAME[chain],
    transport: http(rpc),
  });
}

/**
 * Convert cents to USDC atomic units. Cents have 2 decimals, USDC has 6,
 * so 1 cent = 10^4 atomic units of USDC.
 */
export function centsToUsdcAtomic(cents: number): bigint {
  // parseUnits handles the decimal expansion safely.
  // 100 cents = "1.00" USDC = 1_000_000 atomic.
  return parseUnits((cents / 100).toFixed(2), USDC_DECIMALS);
}

export function formatUsdcAtomic(atomic: bigint): string {
  return formatUnits(atomic, USDC_DECIMALS);
}

/**
 * Send USDC on-chain. The platform's hot wallet is the sender; the
 * agent's `payout_address` is the recipient.
 *
 * Returns a discriminated result:
 * - `ok` — broadcast succeeded; `txHash` is the transaction hash. The
 *   caller should mark the payout `sent`, not `confirmed`. Confirmation
 *   tracking is a separate concern (poll `getTransactionReceipt`).
 * - `not_configured` — env is missing; settlement disabled.
 * - `send_failed` — the broadcast itself rejected (insufficient funds,
 *   gas, RPC down, etc.). Retryable.
 * - `invalid_input` — bad amount/address. Not retryable.
 */
export async function sendUsdc(input: SettleInput): Promise<SettleResult> {
  if (input.amountCents <= 0) {
    return { kind: "invalid_input", reason: "amount_must_be_positive" };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.toAddress)) {
    return { kind: "invalid_input", reason: "invalid_address_format" };
  }

  const client = buildWalletClient(input.chain);
  if (!client) {
    return {
      kind: "not_configured",
      reason: `settlement disabled — set SETTLEMENT_HOT_WALLET_PRIVATE_KEY + SETTLEMENT_RPC_URL_${input.chain.toUpperCase()}`,
    };
  }

  const usdcContract = USDC_CONTRACTS[input.chain];
  const atomic = centsToUsdcAtomic(input.amountCents);

  try {
    // viem's writeContract on a wallet client with an embedded account
    // signs + broadcasts in one call. Returns the tx hash.
    const txHash = await client.writeContract({
      address: usdcContract,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [input.toAddress, atomic],
      chain: CHAIN_BY_NAME[input.chain],
      // viem requires `account` even when the wallet client has one
      // bound — pass it explicitly.
      account: client.account!,
    });
    return { kind: "ok", txHash, amountUsdcAtomic: atomic };
  } catch (err) {
    return {
      kind: "send_failed",
      reason: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * Poll for transaction confirmation. Returns true once the tx has at
 * least 1 confirmation. Caller is responsible for backoff between calls.
 */
export async function isConfirmed(chain: PayoutChain, txHash: Hash): Promise<boolean> {
  const rpc = rpcUrlFor(chain);
  if (!rpc) return false;
  const publicClient = createPublicClient({
    chain: CHAIN_BY_NAME[chain],
    transport: http(rpc),
  });
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    return receipt.status === "success";
  } catch {
    return false;
  }
}
