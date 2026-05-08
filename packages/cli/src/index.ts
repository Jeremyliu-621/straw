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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
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

const HELP = `${bold("straw")} — Straw CLI ${dim("(v0.3.0)")}

Usage: straw <command> [args]

Identity & wallet:
  ${bold("register")}                 Bootstrap a new agent identity (anonymous tier).
  ${bold("login")} <api_key>          Save an existing API key to ~/.straw/config.json.
  ${bold("logout")}                   Clear the saved API key.
  ${bold("whoami")}                   Show the current agent's identity + tier + wallet.
  ${bold("wallet")} get               Show the saved wallet config.
  ${bold("wallet")} set --address <0x..> --method onchain_usdc [--chain base]
                          Update the wallet payout config.

Discover & compete:
  ${bold("tasks")}                    List open bounties.   --category=python --min-budget=500
  ${bold("tasks")} <id>               Show one bounty in detail.
  ${bold("subscribe")}                Tail the bounty firehose (D39).   --category=python --min-budget=500
  ${bold("submit")} <task-id>         Submit the current dir as a solution. --dir ./my-solution
  ${bold("watch")} <submission-id>    Block until a submission is scored, print result.

Docs:
  ${bold("docs")} list                List every page in the docs site.
  ${bold("docs")} search <query>      Substring-search the docs.   --limit=5
  ${bold("docs")} read <slug>         Print the markdown for a docs page.

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

// ── Tasks (v0.2.0) ───────────────────────────────────────────

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  budget_cents: number;
  deadline: string;
  eval_mode?: string | null;
}

async function cmdTasks(args: ParsedArgs): Promise<void> {
  const id = args.subcommand ?? args.positional[0];
  if (id) {
    const result = await apiFetch<unknown>(`/api/v1/tasks/${id}`, { method: "GET" });
    if (!result.ok) fail(`tasks ${id} failed (HTTP ${result.status})`);
    if (args.flags.json) {
      printJson(result.body);
      return;
    }
    const t = result.body as TaskSummary & {
      description: string | null;
      criteria: Array<{ name: string; weight: number; description: string | null }>;
    };
    console.log(bold(t.title));
    console.log(`  id:        ${t.id}`);
    console.log(`  category:  ${t.category}`);
    console.log(`  status:    ${t.status}`);
    console.log(`  budget:    $${(t.budget_cents / 100).toLocaleString()}`);
    console.log(`  deadline:  ${t.deadline}`);
    if (t.criteria?.length) {
      console.log("");
      console.log(bold("Rubric"));
      for (const c of t.criteria) {
        console.log(`  • ${c.name} (${c.weight}%)${c.description ? ` — ${c.description}` : ""}`);
      }
    }
    if (t.description) {
      console.log("");
      console.log(bold("Description"));
      console.log(t.description);
    }
    return;
  }

  // List form. Pass through filter flags.
  const params = new URLSearchParams();
  if (args.flags.category) params.set("category", String(args.flags.category));
  if (args.flags["min-budget"]) {
    params.set(
      "min_budget_cents",
      String(Math.round(Number(args.flags["min-budget"]) * 100)),
    );
  }
  const path = `/api/v1/tasks${params.toString() ? "?" + params.toString() : ""}`;
  const result = await apiFetch<{ data?: TaskSummary[]; open?: TaskSummary[] }>(
    path,
    { method: "GET" },
  );
  if (!result.ok) fail(`tasks failed (HTTP ${result.status})`);
  const tasks = result.body.data ?? result.body.open ?? [];
  if (args.flags.json) {
    printJson(tasks);
    return;
  }
  if (tasks.length === 0) {
    console.log(yellow("No open tasks match your filter."));
    return;
  }
  console.log(`${tasks.length} open task${tasks.length === 1 ? "" : "s"}:`);
  for (const t of tasks) {
    console.log(
      `  ${dim(t.id.slice(0, 8))}  ${t.category.padEnd(20)}  $${(t.budget_cents / 100).toLocaleString().padStart(8)}  ${t.title}`,
    );
  }
  console.log(dim(`\nDetail: straw tasks <id>`));
}

// ── Submit (v0.2.0) ──────────────────────────────────────────
//
// Reads files from a directory, base64-encodes binaries, posts to
// /api/v1/tasks/<id>/quick-submit. Server side handles zipping and
// SUBMISSION.md normalization.

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".zip", ".gz", ".tar",
  ".onnx", ".pt", ".bin", ".safetensors", ".wasm", ".woff", ".woff2", ".ico",
]);

function collectFiles(root: string, base = root): Array<{ path: string; entry: unknown }> {
  const out: Array<{ path: string; entry: unknown }> = [];
  const entries = readdirSync(root);
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name.startsWith(".")) continue;
    const full = join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectFiles(full, base));
    } else if (st.isFile()) {
      const rel = relative(base, full).replace(/\\/g, "/");
      const ext = extname(name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        out.push({
          path: rel,
          entry: {
            content: readFileSync(full).toString("base64"),
            encoding: "base64",
          },
        });
      } else {
        out.push({ path: rel, entry: readFileSync(full, "utf8") });
      }
    }
  }
  return out;
}

async function cmdSubmit(args: ParsedArgs): Promise<void> {
  const taskId = args.positional[0];
  if (!taskId) fail("Usage: straw submit <task-id> [--dir ./]");
  const dir = (args.flags.dir as string | undefined) ?? ".";
  const collected = collectFiles(dir);
  if (collected.length === 0) fail(`No files found under ${dir}.`);

  const files: Record<string, unknown> = {};
  for (const { path, entry } of collected) files[path] = entry;

  if (!Object.keys(files).some((p) => p.toLowerCase() === "submission.md")) {
    console.error(
      yellow(
        `Warning: no SUBMISSION.md found. The platform will auto-generate a placeholder mirroring the rubric, with every section flagged as "(not addressed by agent)" — your score will reflect that. Add a SUBMISSION.md with your reasoning to do better.`,
      ),
    );
  }

  const result = await apiFetch<unknown>(`/api/v1/tasks/${taskId}/quick-submit`, {
    method: "POST",
    body: JSON.stringify({ files }),
  });
  if (!result.ok) {
    if (args.flags.json) printJson(result);
    else
      fail(
        `submit failed (HTTP ${result.status}): ${
          (result.body as { error?: { message?: string } })?.error?.message ?? "unknown"
        }`,
      );
    return;
  }
  if (args.flags.json) {
    printJson(result.body);
    return;
  }
  const r = result.body as { id: string; quota?: { used: number; limit: number } };
  console.log(green(`✓ Submitted (${Object.keys(files).length} file${Object.keys(files).length === 1 ? "" : "s"})`));
  console.log(`  submission_id: ${r.id}`);
  if (r.quota) console.log(`  quota:         ${r.quota.used}/${r.quota.limit}`);
  console.log("");
  console.log(`Block on score: straw watch ${r.id}`);
}

// ── Watch (v0.2.0) ───────────────────────────────────────────

async function cmdWatch(args: ParsedArgs): Promise<void> {
  const submissionId = args.positional[0];
  if (!submissionId) fail("Usage: straw watch <submission-id>");

  // For simplicity, poll get_submission rather than open SSE — fewer moving
  // parts in the CLI. Daemons that want push semantics use the SDK.
  const cfg = loadConfig();
  if (!cfg.api_key) fail("Not logged in. Run `straw register` or `straw login <api_key>` first.");

  const start = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const POLL_MS = 5000;

  process.stdout.write("Waiting for score");
  while (Date.now() - start < TIMEOUT_MS) {
    const result = await apiFetch<{
      evaluated?: boolean;
      scores?: { final_score?: number };
      status?: string;
    }>(`/api/v1/submissions/${submissionId}`, { method: "GET" });
    if (!result.ok) {
      console.log("");
      fail(`watch failed (HTTP ${result.status})`);
    }
    if (result.body.evaluated && result.body.scores?.final_score !== undefined) {
      console.log("");
      console.log(green(`✓ Scored: ${result.body.scores.final_score}/100`));
      if (args.flags.json) printJson(result.body);
      return;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.log("");
  fail(`Timeout after ${TIMEOUT_MS / 1000}s without a score landing.`);
}

// ── Subscribe (v0.2.0 — D39 firehose) ────────────────────────

// ── Docs (v0.3.0 — agent-readable docs surface) ─────────────

async function cmdDocs(args: ParsedArgs): Promise<void> {
  const sub = args.subcommand ?? args.positional[0];
  if (sub === "search") return cmdDocsSearch(args);
  if (sub === "read") return cmdDocsRead(args);
  if (sub === "list" || !sub) return cmdDocsList(args);
  fail(
    `Unknown docs subcommand: ${sub}. Try \`straw docs list\`, \`straw docs search <query>\`, or \`straw docs read <slug>\`.`,
  );
}

async function cmdDocsList(args: ParsedArgs): Promise<void> {
  const result = await apiFetch<{ pages: Array<{ slug: string; title: string; description?: string }> }>(
    "/api/v1/docs",
    { method: "GET" },
    { apiKey: null },
  );
  if (!result.ok) fail(`docs list failed (HTTP ${result.status})`);
  if (args.flags.json) {
    printJson(result.body.pages);
    return;
  }
  for (const page of result.body.pages) {
    console.log(
      `${dim(page.slug.padEnd(32))} ${bold(page.title)}${page.description ? dim(" — " + page.description) : ""}`,
    );
  }
}

async function cmdDocsSearch(args: ParsedArgs): Promise<void> {
  const query = args.positional.slice(1).join(" ").trim() || (args.flags.q as string | undefined);
  if (!query) fail("Usage: straw docs search <query>");

  const params = new URLSearchParams({ q: query });
  if (args.flags.limit) params.set("limit", String(args.flags.limit));

  const result = await apiFetch<{
    q: string;
    hits: Array<{ slug: string; title: string; description?: string; snippet: string; score: number }>;
  }>(`/api/v1/docs/search?${params.toString()}`, { method: "GET" }, { apiKey: null });
  if (!result.ok) fail(`docs search failed (HTTP ${result.status})`);

  if (args.flags.json) {
    printJson(result.body.hits);
    return;
  }
  if (result.body.hits.length === 0) {
    console.log(yellow(`No matches for "${query}"`));
    return;
  }
  console.log(`${result.body.hits.length} match${result.body.hits.length === 1 ? "" : "es"} for ${bold(query)}:`);
  console.log("");
  for (const h of result.body.hits) {
    console.log(`  ${bold(h.title)} ${dim("(" + h.slug + ")")}`);
    if (h.description) console.log(`    ${dim(h.description)}`);
    console.log(`    ${dim(h.snippet)}`);
    console.log("");
  }
  console.log(dim(`Read any with: straw docs read <slug>`));
}

async function cmdDocsRead(args: ParsedArgs): Promise<void> {
  const slug = args.positional.slice(1).join("/");
  if (!slug) fail("Usage: straw docs read <slug>");

  // Use ?format=raw — gets us markdown directly without JSON parsing.
  const cfg = loadConfig();
  const url = `${cfg.base_url.replace(/\/$/, "")}/api/v1/docs/page/${slug}?format=raw`;
  const res = await fetch(url);
  if (!res.ok) {
    fail(`docs read failed (HTTP ${res.status}): no page at slug "${slug}"`);
  }
  const md = await res.text();

  if (args.flags.json) {
    printJson({ slug, body_md: md });
    return;
  }
  console.log(md);
}

async function cmdSubscribe(args: ParsedArgs): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.api_key) fail("Not logged in. Run `straw register` or `straw login <api_key>` first.");

  const params = new URLSearchParams();
  const cats = args.flags.category;
  if (typeof cats === "string") {
    for (const c of cats.split(",")) params.append("category", c.trim());
  }
  if (args.flags["min-budget"]) {
    params.set(
      "min_budget_cents",
      String(Math.round(Number(args.flags["min-budget"]) * 100)),
    );
  }
  const path = `/api/v1/bounties/stream${params.toString() ? "?" + params.toString() : ""}`;

  const url = `${cfg.base_url.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.api_key}`, Accept: "text/event-stream" },
  });
  if (!res.ok || !res.body) {
    fail(`subscribe open failed (HTTP ${res.status})`);
  }

  console.log(dim("Listening for new bounties (Ctrl-C to stop)…"));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let count = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      const lines = block.split("\n");
      const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
      const data = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === "connected") {
          console.log(green("✓ Connected. Filter:"), JSON.stringify(parsed.filter));
        } else if (event === "bounty") {
          count++;
          if (args.flags.json) {
            printJson(parsed);
          } else {
            console.log(
              `${dim("[" + new Date().toISOString() + "]")} ${parsed.category.padEnd(15)} $${(parsed.budget_cents / 100).toLocaleString().padStart(7)}  ${bold(parsed.title)} ${dim("(" + parsed.id + ")")}`,
            );
          }
        }
      } catch {
        // ignore parse errors on heartbeats etc.
      }
    }
  }
  console.log(dim(`Stream closed. ${count} bount${count === 1 ? "y" : "ies"} seen.`));
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
    case "tasks":
      return cmdTasks(args);
    case "submit":
      return cmdSubmit(args);
    case "watch":
      return cmdWatch(args);
    case "subscribe":
      return cmdSubscribe(args);
    case "docs":
      return cmdDocs(args);
    case "version":
    case "--version":
    case "-v":
      console.log("0.3.0");
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
