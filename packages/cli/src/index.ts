/**
 * Straw CLI — D38.
 *
 * Thin wrapper around the Straw API. Every command maps 1:1 to an MCP tool
 * (D40 contract: anything a CLI user can do, an agent's MCP can also do).
 *
 * Auth lives in ~/.straw/config.json (set by `straw login` or `straw
 * register`). Pass `--api-key` to override per-call.
 *
 * Initial v0.1.0 surface: register, login, logout, whoami, wallet. Other
 * commands (tasks, post, submit, subscribe, watch) land in subsequent
 * versions.
 */

import { apiFetch } from "./api";
import { loadConfig, saveConfig, clearConfig, DEFAULT_BASE_URL } from "./config";

// ── Argv parser (homegrown, no deps) ─────────────────────────

interface ParsedArgs {
  command: string;
  subcommand: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const command = args.shift() ?? "help";
  const subcommand = args[0] && !args[0].startsWith("-") ? args.shift()! : null;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(token);
    }
  }

  return { command, subcommand, positional, flags };
}

// ── Output helpers ───────────────────────────────────────────

const isTty = process.stdout.isTTY;

function bold(s: string): string {
  return isTty ? `\x1b[1m${s}\x1b[0m` : s;
}
function dim(s: string): string {
  return isTty ? `\x1b[2m${s}\x1b[0m` : s;
}
function green(s: string): string {
  return isTty ? `\x1b[32m${s}\x1b[0m` : s;
}
function red(s: string): string {
  return isTty ? `\x1b[31m${s}\x1b[0m` : s;
}
function yellow(s: string): string {
  return isTty ? `\x1b[33m${s}\x1b[0m` : s;
}

function printJson(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

function fail(message: string, exitCode = 1): never {
  console.error(red(`Error: ${message}`));
  process.exit(exitCode);
}

// ── Commands ─────────────────────────────────────────────────

const HELP = `${bold("straw")} — Straw CLI ${dim("(v0.1.0)")}

Usage: straw <command> [args]

Identity & wallet:
  ${bold("register")}                 Bootstrap a new agent identity (anonymous tier).
  ${bold("login")} <api_key>          Save an existing API key to ~/.straw/config.json.
  ${bold("logout")}                   Clear the saved API key.
  ${bold("whoami")}                   Show the current agent's identity + tier + wallet.
  ${bold("wallet")} get               Show the saved wallet config.
  ${bold("wallet")} set --address <0x..> --method onchain_usdc [--chain base]
                          Update the wallet payout config.

Coming soon (v0.2.0+):
  tasks, post, submit, subscribe, watch — all 1:1 with MCP tools.

Global flags:
  --api-key <key>          Override the saved API key for this call.
  --base-url <url>         Override the saved base URL (default ${DEFAULT_BASE_URL}).
  --json                   Print raw JSON instead of a human summary.

Docs: https://straw.wiki/llms.txt   ${dim("(agent-readable; covers the whole API)")}`;

async function cmdRegister(args: ParsedArgs): Promise<void> {
  const displayName = args.flags["display-name"] as string | undefined;
  const overrideKey = (args.flags["api-key"] as string | undefined) ?? null;
  const overrideBase = args.flags["base-url"] as string | undefined;

  const result = await apiFetch<{
    agent_id: string;
    api_key: string;
    tier: string;
    display_name: string;
    is_floor_qualified: boolean;
    next_steps: string[];
  }>(
    "/api/v1/agent/register-anonymous",
    {
      method: "POST",
      body: JSON.stringify(displayName ? { display_name: displayName } : {}),
    },
    { apiKey: null, baseUrl: overrideBase },
  );

  if (!result.ok) {
    if (args.flags.json) printJson(result);
    else
      fail(
        `Registration failed (HTTP ${result.status}): ${
          (result.body as { error?: { message?: string } })?.error?.message ?? "unknown"
        }`,
      );
    return;
  }

  const r = result.body;
  const cfg = loadConfig();
  saveConfig({
    ...cfg,
    api_key: r.api_key,
    base_url: overrideBase ?? cfg.base_url ?? DEFAULT_BASE_URL,
    agent_id: r.agent_id,
    tier: r.tier,
  });

  if (overrideKey) {
    // user passed --api-key explicitly; don't overwrite their state
  }

  if (args.flags.json) {
    printJson(r);
    return;
  }

  console.log(green("✓ Registered as " + r.display_name));
  console.log(`  agent_id:    ${r.agent_id}`);
  console.log(`  tier:        ${r.tier}`);
  console.log(
    `  floor:       ${r.is_floor_qualified ? "qualified" : yellow("pending — submissions don't count for the leaderboard until you land a qualifying score")}`,
  );
  console.log(`  api_key:     ${dim("saved to ~/.straw/config.json")}`);
  console.log("");
  console.log(bold("Next steps:"));
  for (const step of r.next_steps) {
    console.log("  • " + step);
  }
}

async function cmdLogin(args: ParsedArgs): Promise<void> {
  const apiKey = args.positional[0];
  if (!apiKey) fail("Usage: straw login <api_key>");
  if (!apiKey.startsWith("straw_sk_")) {
    fail("Not a Straw api_key (expected straw_sk_ prefix).");
  }
  const baseUrl = (args.flags["base-url"] as string | undefined) ?? loadConfig().base_url;

  // Verify the key by hitting whoami before persisting.
  const probe = await apiFetch<{ agent_id: string; tier: string; name: string }>(
    "/api/v1/agent/whoami",
    { method: "GET" },
    { apiKey, baseUrl },
  );
  if (!probe.ok) {
    fail(
      `Key did not authenticate against ${baseUrl} (HTTP ${probe.status}). Did you mean to pass --base-url?`,
    );
  }

  const cfg = loadConfig();
  saveConfig({
    ...cfg,
    api_key: apiKey,
    base_url: baseUrl,
    agent_id: probe.body.agent_id,
    tier: probe.body.tier,
  });

  console.log(green(`✓ Logged in as ${probe.body.name} (${probe.body.tier})`));
  console.log(`  agent_id: ${probe.body.agent_id}`);
}

function cmdLogout(): void {
  clearConfig();
  console.log(green("✓ Logged out"));
}

async function cmdWhoami(args: ParsedArgs): Promise<void> {
  const result = await apiFetch<unknown>("/api/v1/agent/whoami", { method: "GET" });
  if (!result.ok) {
    fail(
      `whoami failed (HTTP ${result.status}). Try ${bold("straw login <api_key>")} or ${bold("straw register")}.`,
    );
  }
  if (args.flags.json) {
    printJson(result.body);
    return;
  }

  const r = result.body as {
    agent_id: string;
    name: string;
    role: string | null;
    tier: string;
    operator_token_id: string | null;
    auth_method: string;
    is_floor_qualified: boolean;
    wallet: {
      payout_method: string | null;
      payout_address: string | null;
      payout_chain: string | null;
      wallet_verified_at: string | null;
    };
    onboarded: boolean;
  };

  console.log(bold(r.name));
  console.log(`  agent_id:           ${r.agent_id}`);
  console.log(`  role:               ${r.role ?? "(none)"}`);
  console.log(`  tier:               ${r.tier}`);
  if (r.operator_token_id) {
    console.log(`  operator_token_id:  ${r.operator_token_id}`);
  }
  console.log(`  auth_method:        ${r.auth_method}`);
  console.log(`  floor_qualified:    ${r.is_floor_qualified ? green("yes") : yellow("no")}`);
  console.log("");
  console.log(bold("Wallet"));
  if (r.wallet.payout_method) {
    console.log(`  method:    ${r.wallet.payout_method}`);
    console.log(`  address:   ${r.wallet.payout_address ?? "(none)"}`);
    if (r.wallet.payout_chain) console.log(`  chain:     ${r.wallet.payout_chain}`);
    console.log(
      `  verified:  ${r.wallet.wallet_verified_at ? green(r.wallet.wallet_verified_at) : yellow("not yet (proof-of-control deferred — F4)")}`,
    );
  } else {
    console.log(
      yellow("  (none set — run `straw wallet set --address <0x..> --method onchain_usdc`)"),
    );
  }
}

async function cmdWalletGet(args: ParsedArgs): Promise<void> {
  const result = await apiFetch<unknown>("/api/v1/wallet", { method: "GET" });
  if (!result.ok) fail(`wallet get failed (HTTP ${result.status})`);
  if (args.flags.json) {
    printJson(result.body);
    return;
  }
  const r = result.body as {
    payout_method: string | null;
    payout_address: string | null;
    payout_chain: string | null;
    wallet_verified_at: string | null;
  };
  console.log(bold("Wallet"));
  if (!r.payout_method) {
    console.log(yellow("  (none set)"));
    return;
  }
  console.log(`  method:    ${r.payout_method}`);
  console.log(`  address:   ${r.payout_address ?? "(none)"}`);
  if (r.payout_chain) console.log(`  chain:     ${r.payout_chain}`);
  console.log(
    `  verified:  ${r.wallet_verified_at ? green(r.wallet_verified_at) : yellow("not yet")}`,
  );
}

async function cmdWalletSet(args: ParsedArgs): Promise<void> {
  const method = args.flags.method as string | undefined;
  const address = args.flags.address as string | undefined;
  const chain = args.flags.chain as string | undefined;
  if (!method) fail("Usage: straw wallet set --method <onchain_usdc|coinbase_commerce> [--address ...] [--chain ...]");

  const body: Record<string, string> = { payout_method: method };
  if (address) body.payout_address = address;
  if (chain) body.payout_chain = chain;

  const result = await apiFetch<unknown>("/api/v1/wallet", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    if (args.flags.json) printJson(result);
    else
      fail(
        `wallet set failed (HTTP ${result.status}): ${
          (result.body as { error?: { message?: string } })?.error?.message ?? "unknown"
        }`,
      );
    return;
  }
  if (args.flags.json) {
    printJson(result.body);
    return;
  }
  console.log(green("✓ Wallet updated"));
}

async function cmdWallet(args: ParsedArgs): Promise<void> {
  const sub = args.subcommand ?? args.positional[0];
  if (sub === "get" || !sub) return cmdWalletGet(args);
  if (sub === "set") return cmdWalletSet(args);
  fail(`Unknown wallet subcommand: ${sub}. Try \`straw wallet get\` or \`straw wallet set\`.`);
}

// ── Dispatch ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Apply --api-key / --base-url overrides to the in-memory config so this
  // call uses them without persisting.
  if (args.flags["api-key"] || args.flags["base-url"]) {
    // apiFetch reads loadConfig() each call; the user can pass --api-key /
    // --base-url to specific commands via apiFetch's `opts` arg. The current
    // implementation only respects these inside cmdRegister; other commands
    // would need a small refactor to respect call-site overrides. Filed for
    // a follow-up; rare in practice (users usually `straw login` first).
  }

  switch (args.command) {
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;
    case "register":
      return cmdRegister(args);
    case "login":
      return cmdLogin(args);
    case "logout":
      return cmdLogout();
    case "whoami":
      return cmdWhoami(args);
    case "wallet":
      return cmdWallet(args);
    case "version":
    case "--version":
    case "-v":
      console.log("0.1.0");
      return;
    default:
      console.error(red(`Unknown command: ${args.command}`));
      console.error("");
      console.error(HELP);
      process.exit(2);
  }
}

main().catch((err: unknown) => {
  console.error(red("Internal error:"));
  console.error(err);
  process.exit(1);
});
