# ZeroClaw + Codex Judge Daemon — Build Research

**Status:** Research notes for the eventual build of the per-task judge daemon (D30). Captured 2026-04-25 so future sessions don't re-derive this from scratch.

This file pairs with:
- `tasks/DECISIONS.md` D30 (the architectural decision)
- Memory file `project_eval_setup_openclaw_codex.md` (the operational playbook)
- `tasks/TASKS.md` Phase 20d (the task list)

---

## ⚠️ Architectural correction surfaced during this research

While verifying the ZeroClaw API contract (per the build phasing plan below), I found that **two assumptions baked into D30 / the memory playbook are wrong** and need adjustment when we go to build:

### 1. The ZeroClaw HTTP Gateway does NOT expose agent create/destroy endpoints

D30 currently says *"Straw POSTs to `http://<gateway-host>:18789/api/agents/create` and `/api/agents/destroy` on task publish/close."* Per the actual ZeroClaw [Gateway API Reference (Wiki §10.2)](https://github.com/zeroclaw-labs/zeroclaw/wiki/10.2-Gateway-API-Reference), the Gateway exposes:

- `GET /health` — health check (no auth)
- `GET /metrics` — Prometheus metrics (no auth)
- `POST /pair` — initial bearer-token pairing (X-Pairing-Code)
- `POST /webhook` — accept a message (`{message: "string"}`) and return the agent's response (Authorization: Bearer)
- `GET/POST /whatsapp` — WhatsApp integration

**No agent CRUD endpoints.** No `/api/agents/*`. The Gateway is webhook-in / response-out, plus health and pairing.

### 2. ZeroClaw's "multi-agent" is delegation-based, not independent-peer

D30 currently says *"one ZeroClaw Gateway hosts N judge agents (one per task) via multi-agent routing — 200 judges fit on a CX22."* Per [config-reference.md](https://github.com/zeroclaw-labs/zeroclaw/blob/master/docs/reference/api/config-reference.md), `[agents.<name>]` sections define **sub-agents that the primary agent can delegate to via the `delegate` tool**, with bounded `max_depth` recursion.

This is a router/dispatcher pattern (one primary, many delegates), NOT an orchestration pattern (many independent peers). You can't spawn N independent top-level judge agents in one Gateway via config.

### What the architecture should actually be

**Option A — Single judge agent, called per-submission via webhook (recommended):**
- One ZeroClaw Gateway, one primary "straw-judge" agent
- Per-submission, Straw POSTs `/webhook` with `{message: "evaluate submission <id>"}`
- The judge reads task spec + rubric + submission from Straw via `straw-api` plugin tools (not pre-loaded into agent state)
- Per-task evolving understanding lives in Straw DB (KV or new table), not in ZeroClaw agent state
- Judge can delegate to a Codex CLI sub-agent for code investigation via the existing delegation pattern
- No per-task agent lifecycle — simpler

**Option B — Multiple Gateway processes (one per task):**
- Spawn a fresh ZeroClaw Gateway per task at task publish
- Each Gateway is its own ~10-20MB process (not just ~5MB — there's gateway overhead beyond the agent)
- 200 tasks = 200 Gateways = 2-4GB RAM — still fits CX22 but tight
- Process spawn/teardown latency on task publish/close
- Simpler conceptual model but more operational moving parts

**Recommendation: Option A.** Webhook-per-submission is what the API actually supports cleanly. Per-task state lives in Straw DB anyway (we already have the KV substrate). Don't fight the harness.

### What needs updating before/during the build

When we go to build Phase 20d:
- Update D30 to drop "multi-agent routing per task" framing
- Update the playbook to use webhook-per-submission, not agent-create/destroy
- Drop `STRAW_JUDGE_GATEWAY_URL` agent-CRUD wiring; use the `/webhook` URL instead
- Add a `judge_session_state` jsonb field on `tasks` (or use existing KV) for the judge's evolving per-task understanding

Cost model is unchanged — still ~$205/mo flat with Codex subscription.

---

## Verified ZeroClaw operational details

### Install & daemon

- Install via Cargo from source or prebuilt binary (3.4MB single binary)
- systemd-managed on Linux; binds to port 3000 by default (NOT 18789 — that was OpenClaw)
- Default binding: `127.0.0.1` localhost only. Set `allow_public_bind = true` in `[gateway]` only when behind a trusted tunnel/proxy.

### Codex OAuth (subscription mode)

```bash
# Device-code flow — works headlessly on a remote box, no browser callback needed
zeroclaw auth login --provider openai-codex --device-code

# Verify
zeroclaw auth status

# Refresh tokens when they near expiry
zeroclaw auth refresh --provider openai-codex --profile default

# Run agent against the subscription
zeroclaw agent --provider openai-codex -m "hello"
```

Profiles stored encrypted in `~/.zeroclaw/auth-profiles.json`. Multi-profile syntax: `<provider>:<profile_name>` (e.g. `openai-codex:work`).

### config.toml — top-level sections we care about

```toml
[provider]
default_provider = "openai-codex"
default_model = "gpt-5-codex"          # or whatever Codex maps to
default_temperature = 0.3              # lower than 0.7 default for judge consistency

[agent]                                 # primary agent
# system_prompt comes from workspace/AGENTS.md
# tools come from workspace/TOOLS.md + skills

[gateway]
port = 3000                            # default
host = "127.0.0.1"                     # default — change only if behind proxy
require_pairing = true                 # default — bearer-token after /pair
webhook_rate_limit_per_minute = 60     # default

[memory]
# SQLite + vector + FTS5 hybrid retrieval comes built-in

# Optional: delegation sub-agents the primary can call
[agents.code_investigator]
provider = "openai-codex"
model = "gpt-5-codex"                   # the actual code-investigation sub-agent
system_prompt = "You investigate submission code..."
max_depth = 1                          # don't let it nest further
```

### Workspace layout

```
~/.zeroclaw/
├── config.toml                    # the config above
├── auth-profiles.json             # encrypted, managed by `zeroclaw auth`
├── workspace/
│   ├── AGENTS.md                  # primary agent's system prompt + identity
│   ├── SOUL.md                    # personality / tone
│   ├── TOOLS.md                   # tool usage guidelines
│   ├── IDENTITY.md / USER.md      # user info — we'd put Straw context here
│   ├── MEMORY.md                  # curated long-term memory
│   ├── skills/
│   │   └── straw-judge/
│   │       └── SKILL.md           # judge-specific behavior
│   └── runtime/                   # SQLite + vector DBs auto-created
└── sessions/                      # per-session state, audit trail
```

### Tool trait (for the `straw-api` plugin)

Per [docs.rs/zeroclawlabs](https://docs.rs/zeroclawlabs/latest/zeroclaw/tools/index.html):

- Each tool implements the `Tool` trait
- Required: `name`, `description`, JSON parameter schema, async `execute` returning `ToolResult`
- Tools declare permissions upfront (file/network access, paths). Runtime enforces allowlists.
- Register via `all_tools_with_runtime` per AGENTS.md §7.3
- Default tool sets: `default_tools` (shell, file r/w), `all_tools` (memory, browser, cron, HTTP, delegation, optional integrations)

For `straw-api`: implement 4 tools — `straw_fetch_submission`, `straw_run_submission`, `straw_post_score`, `straw_subscribe_submissions`. Each is a thin HTTP wrapper around the Straw v1 API, declaring `network` permission scoped to `straw.vercel.app`.

### SKILL.md format (cross-compatible)

Per the OpenClaw + ZeroClaw + Codex / Claude Code shared format:

```markdown
---
name: straw-judge
description: Evaluate a Straw submission against the task's rubric.
metadata: zeroclaw
emoji: 🦀
requires:
  - straw-api
---

# When to use this skill
... (instructions to the LLM)

# Phases

## Phase 1 — Investigate
... mandatory pattern for spawning the code_investigator delegate
... wake trigger pattern

## Phase 2 — Reason
... rubric application heuristics
... uncertainty flagging rules

## Phase 3 — Emit
... straw_post_score tool call schema
```

Same SKILL.md works in OpenClaw + ZeroClaw + Codex CLI + Claude Code per the shared format spec. Write once, portable.

---

## Build phasing plan (the "what we'd do when we build" plan)

This is the plan I outlined to Jeremy on 2026-04-25. Captured here so it's not lost.

### Phase A — Verify ZeroClaw API contract (already done in this research, see above)

✅ Done. Findings: the Gateway is webhook-only; multi-agent is delegation-based; agent CRUD endpoints don't exist. D30 needs the corrections noted at the top of this file when we go to build.

### Phase B — Platform-side (Straw repo, ~2-3 hours, ships clean even before infra exists)

All TypeScript + tests, ~600-800 lines. Sits dormant until the judge Gateway is reachable.

1. **Schema migration** — add `assessment` (text), `reasoning_trace` (jsonb), `uncertainty` (numeric or enum) to `evaluation_results`. ~30 lines + test.
2. **`POST /api/v1/submissions/:id/eval-scores` endpoint** — receives the judge's posted assessment, writes to DB, transitions submission status. Bearer-token auth (the same secret the judge uses). ~150 lines + tests.
3. **`evaluator_context` field on task creation** — optional, encrypted at rest. Schema migration + validation + API/UI surface. ~80 lines.
4. **`judge_session_state` jsonb on `tasks`** (NEW per the architectural correction above) — holds the judge's evolving per-task understanding across submissions. Read/written via the `straw-api` plugin tools.
5. **Rich assessment in `GET /api/v1/submissions/:id`** — surface assessment + reasoning_trace + uncertainty alongside the score. ~50 lines.
6. **Webhook trigger from `task.service.ts`** — on submission `completed`, POST to the judge Gateway's `/webhook` with `{message: "evaluate submission <id> on task <id>"}`. New env vars: `STRAW_JUDGE_WEBHOOK_URL`, `STRAW_JUDGE_BEARER_TOKEN`. Per-submission, NOT per-task lifecycle. ~80 lines.
7. **`EVAL_FALLBACK_MODE` flag** — gate the existing Gemini worker as the fallback path when the judge Gateway is unreachable OR returns an error.

### Phase C — Scaffold judge artifacts (separate `judge-daemon/` directory in Straw repo, ~3-4 hours)

These don't ship into the running app but live in the repo for Jeremy to deploy.

8. **`judge-daemon/skills/straw-judge/SKILL.md`** — strong v1 prompt for the judge's behavior. Phases (investigate → reason → emit), wake-trigger pattern for the code_investigator delegate, rubric application heuristics, uncertainty rules. **This is where eval quality lives — iterate based on real evaluations.**
9. **`judge-daemon/plugins/straw-api/`** — Rust crate implementing 4 tools (`straw_fetch_submission`, `straw_run_submission`, `straw_post_score`, `straw_subscribe_submissions`). ~200-400 lines. Each tool declares network permission scoped to `straw.vercel.app`.
10. **`judge-daemon/config.toml.template`** — config file with placeholders for the bearer token + Codex provider settings. Jeremy fills in after `zeroclaw auth login`.
11. **`judge-daemon/README.md`** — deployment runbook. References the memory playbook for full context.

### Phase D — Deploy (Jeremy at the keyboard, ~1-2 hours)

12. Provision Hetzner CX22, install Rust toolchain, build ZeroClaw binary.
13. Subscribe to ChatGPT Pro ($200/mo).
14. Run `zeroclaw auth login --provider openai-codex --device-code` — paste the code on chat.openai.com on a different device.
15. Drop in the config.toml from the template, drop in the `straw-judge` skill, build + install the `straw-api` plugin.
16. Set Vercel env vars: `STRAW_JUDGE_WEBHOOK_URL`, `STRAW_JUDGE_BEARER_TOKEN`.
17. Smoke test: post a test task, submit one known-good and one known-bad solution, watch the full flow end-to-end.
18. Iterate the SKILL.md based on the first 5 real evaluations.

### Phase E — Cutover (later)

19. Once judge daemon is reliable for ~50+ submissions, flip `EVAL_FALLBACK_MODE` to "judge primary, Gemini fallback". Before that point, keep Gemini as the primary scoring path.

---

## Open questions for the build

Things I don't have answers for yet — would need to check ZeroClaw source or test directly:

1. **Bearer token rotation:** Does `zeroclaw auth refresh` happen automatically before token expiry, or does it need a cron? Affects whether we need a watchdog cron on the box.
2. **Webhook response time:** Does `POST /webhook` block until the agent finishes responding, or return 202 + send result via webhook-out? The judge doing a 5-30 min investigation can't be a synchronous response. May need to verify if ZeroClaw supports async/streaming responses on `/webhook`.
3. **Concurrent webhook handling:** Can the Gateway handle N concurrent `/webhook` requests, each spinning off its own agent run? The `webhook_rate_limit_per_minute = 60` default suggests yes, but the actual concurrency pattern (queue vs parallel execution) needs verification.
4. **Codex CLI invocation pattern:** Does `zeroclaw agent --provider openai-codex` shell out to a `codex` binary (so we'd need Codex CLI installed alongside), or use the OpenAI API directly with the OAuth token? Affects whether we need to install Codex CLI separately.
5. **Per-task evolving memory:** Best place to store this — Straw KV (we already have it) or ZeroClaw's MEMORY.md / runtime SQLite? Probably Straw KV since the daemon is stateless across webhook calls in the recommended Option A architecture.

These are research items for build day, not blockers for the platform-side work in Phase B.

---

## What I'm explicitly NOT doing in this research session

Per Jeremy's 2026-04-25 instruction ("just note all of this in tasks. just do research for the future for now"):

- NOT writing the schema migration
- NOT writing the new endpoint
- NOT writing the lifecycle wiring
- NOT scaffolding the SKILL.md
- NOT writing the Rust plugin
- NOT provisioning anything
- NOT updating D30 / memory file with the architectural correction (those are noted at the top of THIS file with a clear "needs adjustment when we build" pointer; future session should pick this up before writing code)

When build day comes, the first action is **re-read this file**, then update D30 + the memory playbook with the architectural corrections noted above, then proceed with Phase B.
