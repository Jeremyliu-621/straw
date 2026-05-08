# Handoff — feat/overnight-elevate-2026-05-08 (current)

> **You are here.** Autonomous elevation loop. Driven by a cron every 2h
> while Jeremy sleeps. Each iteration spawns a "naive agent customer"
> subagent against `https://straw.wiki`, collects friction, fixes the
> top item, and ships if `npm run build` passes.

**Worktree:** `C:/Users/jerem/code2026/personal-projects/mop-elevate`
**Branch:** `feat/overnight-elevate-2026-05-08`
**Loop policy:** broken builds stay on this branch and are documented;
master only fast-forwards on green.

## Mission rotation

The cron prompt picks the next un-probed facet from this list, then
crosses it off. When all are crossed, restart from the top.

- [x] **Compete-side journey**: register → discover → quick-submit → poll. Bash + curl. _(iter 1)_
- [x] **CLI dogfood**: `npx @strawai/cli` end-to-end. The customer agent acts as a developer. _(iter 2)_
- [x] **Post-side journey**: agent posts a bounty against its own funds (D40). MCP `create_task` + `publish_task`. _(iter 3)_
- [x] **SDK dogfood**: write a small TS daemon against `@strawai/agent-sdk`, exercise SSE auto-reconnect. _(iter 4)_
- [x] **Bounty firehose durability**: open `/api/v1/bounties/stream`, hold for 10min, confirm reconnect across the 270s server cap. _(iter 5)_
- [x] **Workspace primitives**: KV + Files. Upload, list, download, hit the per-agent caps. _(iter 6)_
- [ ] **Wallet F4 round-trip**: a fresh agent declares an address, signs the challenge with viem, submits the proof.
- [ ] **Docs surface from an agent's POV**: feed `/llms.txt` + `/docs/llms.txt` to a fresh model, ask "given this, write a working agent that competes on a python bounty." Audit what it generates.

## Iteration log

(Cron prompts append a new entry to the **bottom** of this list. Each
entry: timestamp, facet, top finding, fix shipped, follow-ups bumped to
the rotation list above.)

### Iter 1 — 2026-05-08 (compete-side journey)

Subagent ran the full external loop with `curl` + `npx @strawai/cli`. Got
from URL → registered → wallet → submitted artifact, then stalled at
the eval step. **Top three findings shipped this iteration:**

1. **SSE `terminal` fired before `evaluated:true`** (BLOCKER for daemons).
   `wait_for_submission` would return a "done" signal pointing at a row
   with no scores. Added `isSubmissionFullyTerminal()` in
   `submission.service.ts` that respects the two-field contract; SSE
   route now uses it. Terminal payload also now carries `evaluated`.
2. **`GET /api/v1/tasks` returned expired tasks** (every fresh agent's
   first pick is a dead task). Added `.gt("deadline", now)` in
   `src/app/api/v1/tasks/route.ts` — doc claim "Tasks past their
   deadline are filtered out automatically" is now true.
3. **Wallet endpoints absent from `/api/docs`**. Added GET/PUT
   `/wallet`, POST `/wallet/verify/{challenge,sign}` with full request
   shapes + error codes — the customer agent had to discover the
   `payout_method` enum by trial-and-error.

**Findings deferred (added to the rotation tail):**

- Eval pipeline doesn't finish — submissions stuck in
  `running` indefinitely. Out of scope tonight (worker not deployed,
  needs Hetzner per memory `project_only_vercel_deployed`).
- `register-anonymous` silently strips non-alphanumerics from
  `display_name` (no warning surfaced).
- `quick-submit` POST response uses ambiguous `status: "completed"`
  while internally the submission is still queued.
- `/api/docs` returns JSON only — a browser visit gets an unformatted
  blob. Could detect `Accept: text/html` and render.
- Anonymous-tier rate-limit copy contradicts `/api/docs` general
  60/min/IP cap.

### Iter 2 — 2026-05-08 (CLI dogfood)

Customer subagent installed `npx @strawai/cli` and walked register →
whoami → wallet set → tasks → submit → watch as a developer would.
**Top finding shipped this iteration:**

- **Argument parser greedy-consumed every first positional as a
  "subcommand"**, so the documented `straw submit <task-id> --dir .`
  errored with `Usage: ...` and `straw watch <id>` was unreachable.
  Root cause: `parseArgs` always shifted the first non-flag token
  into `subcommand`. Only `wallet` and `docs` actually have
  subcommands. Added a `COMMANDS_WITH_SUBCOMMANDS` allowlist; the
  parser now leaves the first positional alone for `submit`,
  `watch`, `tasks`, `register`, `login`, `subscribe`, etc. Smoke-
  tested locally — `watch <id>` and `submit <id> --dir .` now reach
  the API instead of bouncing on the parser. Plus dropped the false
  "every command maps 1:1 to an MCP tool" claim from agent.json,
  the CLI's package.json description, and the index.ts file
  docstring; replaced with an honest coverage map (CLI-only,
  MCP-only, shared).

**Caveat**: the parser fix lives in `packages/cli/src/index.ts` and
ships to users only via an `npm publish @strawai/cli` (Jeremy's 2FA).
The agent.json + package.json copy fixes ship to prod immediately on
merge. Add to wakeup-summary follow-ups: `npm publish` the CLI to
0.3.2 in the morning so external users get the parser fix.

**Findings deferred (added to backlog):**

- `wallet verify` (F4 round-trip) absent from CLI and from MCP tool
  list — D37 selling point inaccessible from either ergonomic
  surface. Adding requires the CLI to embed viem + design a
  key-source UX (env var? stdin? file path?). Bigger scope; bump
  to its own iteration when the F4 facet comes up in rotation.
- MCP server is missing identity (register/whoami/login/logout),
  wallet, and docs tools. Adding them needs an mcp-server bump
  (publish required).
- Subcommand `--help` is broken (`wallet --help` runs `wallet get`,
  `submit --help` errors). Add a centralized help dispatch.
- `npx @strawai/cli@0.3.1 --version` prints `0.3.0`. Confirm
  dist-tags + bin entry on the 0.3.1 tarball before users notice.
- `straw register` doesn't show plaintext key per agent.json's
  promise — only saves it to `~/.straw/config.json`. Add a "save
  this!" banner.

### Iter 3 — 2026-05-08 (post-side journey)

Customer subagent walked the full bounty-posting loop —
register → create task → set rubric → publish → list →
leaderboard — as a fully autonomous agent. End-to-end **did
succeed** (task `233f76fe-...` is live), but the path is loaded
with footguns where the platform reads as compete-only despite
D40 doctrine. **Top finding shipped this iteration:**

- **The post-side flow was undocumented at every agent-discovery
  surface.** `register-anonymous`'s `next_steps` was a 5-bullet
  compete-only list. `agent.json`'s `next_steps_for_a_new_agent`
  was likewise compete-only. `/api/docs`'s `guide` had
  `for_agents` (compete) and `for_companies` (post) — semantically
  wrong now since the calling identity is `agent_builder`, not
  `company`.

  **Shipped:**
  1. `register-anonymous` response now carries `capabilities:
     { can_compete: true, can_post: true }` and a 7-bullet
     `next_steps` that explicitly forks COMPETE / POST early. A
     daemon parsing this no longer reads it as a compete-only
     platform.
  2. `agent.json` likewise gets `capabilities` at the top level
     and a re-shaped `next_steps_for_a_new_agent` with the same
     fork.
  3. `/api/docs` gets a new `guide.for_posters` block — the full
     poster loop in plain English including the
     `test_weight`/`llm_weight` rule for each `eval_mode`,
     attachment caveat, and a heads-up that `company_id` is the
     legacy name for the task-owner UUID. `for_companies` kept
     as a deprecation pointer for backward compat.

**Findings deferred (added to backlog):**

- **`POST /api/tasks/:id/attachments` returns 500** — the
  Supabase Storage bucket `task-attachments` was never created
  by a migration. (Migration 024 created the metadata table;
  there's no parallel to migration 035 which created the
  `agent-workspace` bucket.) Fix: a new migration `041_task_
  attachments_bucket.sql` mirroring 035's shape — INSERT INTO
  storage.buckets + per-bucket RLS scaffolding. Out of scope
  per loop rules (no schema migrations from autonomous loop).
  This is the highest-value follow-up Jeremy can do in the
  morning — one ~30-line migration unblocks attachments
  end-to-end.
- **`role: "company"` annotations across `/api/docs`
  endpoints[]** are misleading — anonymous-tier agents
  succeed against POST /api/v1/tasks etc. Bulk rename to
  `role: "task_owner"` would more honestly describe the actual
  access constraint, but I haven't audited every endpoint to
  confirm none are still company-role-gated. Defer for a
  focused docs-only iteration.
- **`test_weight`/`llm_weight` are required** for create-task
  even when redundant with `eval_mode`. Could default from
  `eval_mode` (llm → 0/100, container → 100/0). Behavior
  change risk for existing API consumers; defer with care.
- **`/tasks/[id]` page is `"use client"` so per-task SEO
  (generateMetadata) doesn't fire** — every bounty's HTML
  shares the generic `<title>Straw</title>` and OG image.
  Needs a server-component shell wrap. Defer for a frontend
  iteration.
- **UTF-8 em-dash in task description got mangled to `�`**
  on the way to the DB. Encoding bug somewhere in
  `POST /api/v1/tasks` body parser. Defer.
- **`company_id` field naming** — rename to `owner_id` /
  `poster_id` is a column rename + cascading code change.
  Migration scope, defer.

### Iter 4 — 2026-05-08 (SDK dogfood)

Customer subagent built a real TS daemon against
`@strawai/agent-sdk@0.6.0`: registerAnonymous → StrawClient →
whoami → tasks.list → tasks.quickSubmit → submissions.waitUntilDone.
End-to-end the plumbing worked (submission landed, files uploaded);
score didn't materialize because the eval-worker upstream gap is
still in place.

**Top finding shipped this iteration:**

- **`registerAnonymous` returned a `next_steps` array of raw REST
  recipes** ("GET /api/v1/tasks", "POST /api/v1/tasks/{id}/quick-
  submit") even when the caller was using the SDK. SDK users had to
  mentally translate every bullet back to a method call.

  **Shipped:** `register-anonymous` response now carries a parallel
  `sdk_next_steps` object alongside the existing REST `next_steps`.
  It includes:
    - `package` + `install` (npm coordinates)
    - `snippet` — a verified, copy-pasteable end-to-end example
      covering registration → whoami → compete (list +
      quickSubmit + waitUntilDone) → post (create + publish +
      streamLeaderboard) → wallet (set). Every method name was
      grepped against `packages/agent-sdk/client.ts` at compose
      time so the snippet actually compiles — including the
      gotchas the customer found (registerAnonymous is a top-
      level export, quickSubmit is on `tasks` not `submissions`,
      streamers take a callback not an async iterator).
    - `method_index` — flat list of every method by facet
      (identity / compete / post / wallet). Daemons can pattern-
      match without parsing the snippet.
  Curl users still get the same REST `next_steps`. No backwards-
  compat break.

  **Plus:** the long-standing silent display_name normalization
  (flagged in iter 1, again in iter 4) now surfaces explicitly —
  if the input was rewritten, the response includes
  `display_name_input`, `display_name_normalized: true`, and a
  one-line note explaining the canonical name is what /whoami and
  the leaderboard will return.

**Findings deferred (added to backlog):**

- **`packages/agent-sdk/README.md` quick-start snippet doesn't
  compile** — uses `client.submissions.quickSubmit(taskId,
  filesObject)` but the actual signature is `client.tasks
  .quickSubmit(taskId, { files: filesObject })`. Source-only
  fix, ships only via npm publish (Jeremy's 2FA).
- **`waitUntilDone` reconnect contract is incomplete** — on an
  idle SSE that never emits `terminal` past the first
  `submission` event, the helper hangs to the user-supplied
  timeout instead of falling back to `submissions.get()`. Two
  fixes needed in `packages/agent-sdk/client.ts` (sse.ts is
  inlined): (a) on `WAIT_ABORTED` after at least one event,
  return the last snapshot instead of throwing; (b) add a 30s
  inactivity watchdog that closes + reconnects. Source-only.
- **`Submission.status` is typed as `string`** in
  `packages/agent-sdk/types.ts` — should be the literal union
  `'registered'|'running'|'completed'|'failed'|'evaluation_
  failed'`, with a JSDoc noting that `evaluated:true` is the
  truth signal (status='completed' alone is ambiguous, see
  iter 1). Source-only.
- **`StrawClientConfig` accepts only `apiKey` + `baseUrl`** — no
  retries, no per-request timeout, no User-Agent override, no
  injectable fetch. Daemons that want instrumentation have to
  wrap. Source-only.
- **`StrawApiError.details` is typed as `unknown`** — could be a
  per-error-code typed details map for ergonomic narrowing.
  Source-only.

### Iter 5 — 2026-05-08 (bounty firehose durability)

Customer subagent ran two anonymous identities, two full ~270s SSE
sessions, provoked real bounty events with one identity while
subscribed with the other, tested reconnect / Last-Event-ID
backfill / filter-validation / CORS / heartbeats.

**Top three findings shipped this iteration (all in
`src/app/api/v1/bounties/stream/route.ts` + `src/lib/sse.ts`):**

1. **No backfill mechanism — disconnected events were gone forever.**
   Every reconnect (the structural one at the 270s cap OR a network
   glitch) created a permanent blind spot. Now: route honors
   `Last-Event-ID` header. Treats it as a millis timestamp, rewinds
   the cursor, and the first poll iteration replays everything since.
   Connected event includes `resumed: true` + `resume_cursor` so the
   client knows the first batch is backfill, not live. Self-consistent
   because we already emit each `bounty` event with `id:
   <created_at_ms>` — a reconnect just hands that back.

2. **Filter parameters silently coerced to null** —
   `?min_budget_cents=-50` and `?deadline_after=not-a-date` were
   echoed as `null` with no signal. Subscribers with typos saw an
   empty stream forever and couldn't tell the difference from
   "subscribed correctly to a quiet category." Now: `parseFilter`
   returns rejected entries, surfaced on the `connected` event as
   `rejected_filters: [{ param, raw, reason }]`. No 400 (no behavior
   break for existing callers); just a structured warning the
   daemon can act on. Kept the existing freely-echoed `category`
   list since there's no authoritative category allowlist.

3. **Server hung up silently at 270s — no terminal event.** Clients
   couldn't distinguish "cleanly hit the cap" from "TCP died." Now:
   route runs a 265s budget timer (just under sse.ts's 270s cap)
   and emits `event: close` with `{ reason: "function_timeout",
   reconnect: true, last_event_id }` before exiting. The
   last_event_id is the latest cursor, so the client can pass it
   back as `Last-Event-ID` on the next connect for seamless resume.

**Bonus shipped:** CORS headers on every SSE response (added in
`makeSSEResponse`, so all 4 SSE routes inherit). Browser-based
agents on a different origin can now consume the firehose,
submission stream, leaderboard stream, and task-events stream.
`Last-Event-ID` is whitelisted in Allow-Headers + Expose-Headers
so resume-on-reconnect works from a browser too.

**Findings deferred (added to backlog):**

- **Bounty event payload is too thin** — only `{id, title,
  description, category, deadline, budget_cents, eval_mode, status,
  created_at}`. Missing `criteria[]`, `input_spec`, `output_spec`.
  Daemons must round-trip `GET /api/v1/tasks/{id}` to decide whether
  to compete, eroding the firehose's vs-polling cost advantage.
  Could include them — they're cheap. Defer to a payload-shape
  iteration.
- **Heartbeat cadence is 25s** — slightly long for corporate
  proxies (which often idle-timeout at 30s). Halving to 12-15s is
  trivial in `sse.ts`. Defer; not a real-world break yet.
- **OPTIONS preflight handler not added on SSE routes** — the
  Access-Control-Allow-Origin header on GET responses unblocks
  EventSource (which doesn't preflight), but browser fetch with
  `Authorization: Bearer ...` will preflight with OPTIONS and
  there's no handler. Per-route OPTIONS exports needed. Defer for
  a focused CORS iteration.
- **POST /api/v1/tasks requires undocumented fields** —
  `criteria[].position`, `test_weight`, `llm_weight`. Iter 3
  already documented these in `/api/docs guide.for_posters` but
  the create-task endpoint definition in `endpoints[]` doesn't
  echo the same advice. Could default `position` from array
  index + `test_weight`/`llm_weight` from `eval_mode`. Behavior
  change risk; defer.
- **UTF-8 em-dash mangling** in task descriptions persists from
  iter 3. Same root cause across compose path. Defer with care.

### Iter 6 — 2026-05-08 (workspace primitives)

Customer subagent walked KV + files end-to-end on a fresh agent:
PUT/GET/DELETE/LIST with prefix + cursor pagination, file upload via
both JSON-base64 and raw octet, cap enforcement, forbidden keys/paths,
quota endpoints. Found one BLOCKER (file size cap) and several
contained issues.

**Top fix shipped this iteration:**

- **Cursor pagination broke on URL-reserved chars**: `next_cursor`
  was the raw `updated_at` ISO timestamp containing `+00:00`. When a
  client passed it back as a query string, the `+` decoded to space
  and the next request 500'd `INTERNAL_ERROR`. The same bug applied
  to KV LIST, files LIST, AND the shared `paginatedResponse` helper
  (used by tasks list, deals, submissions, search — all
  `paginatedResponse<T extends { created_at: string }>` callers).

  **Shipped:** new `src/lib/cursor.ts` exporting `encodeCursor`
  (base64url) + `decodeCursor` (lenient — falls back to raw input
  for legacy ISO cursors so in-flight daemons survive the deploy).
  Wired into:
  - `src/lib/api-utils.ts` parsePagination + paginatedResponse —
    every `next_cursor` returned by the shared envelope is now
    base64url-encoded; legacy raw cursors still accepted.
  - `src/services/workspace.service.ts` listWorkspaceEntries
  - `src/services/workspace-files.service.ts` listWorkspaceFiles

  Plus 4 unit tests in `src/lib/cursor.test.ts` covering round-trip,
  legacy pass-through, and non-base64url fallback. All passing.

**Bonus shipped:** workspace DELETE response now returns
`{ deleted: true, was_present: boolean }` instead of `{ deleted:
boolean }`. Customer found `deleted: false` for absent keys read
like a failure to many clients despite idempotent semantics — the
post-state IS "no key" in both cases, what differs is whether work
happened. Both KV and Files. One stale test updated.

**Findings deferred (added to backlog):**

- **BLOCKER: 25MB documented file cap unreachable — Vercel platform
  413s at ~4.5MB.** Application-layer
  `WORKSPACE_FILES_MAX_PER_FILE_BYTES` (26MB) never fires because
  Vercel rejects the body first. Error envelope from Vercel is
  plaintext HTML, not the `{error:{code,details}}` JSON the rest of
  the API uses — SDKs that pattern-match on `error.code` will crash.
  Fix options: (a) raise body limit in vercel.json / route config;
  (b) add a presigned-PUT flow direct to Supabase Storage so bytes
  bypass the function entirely. (b) is the right answer; both are
  larger than one iteration's scope.
- **`If-None-Match: *` PUT returns 304 even when the value WAS
  updated.** Likely Next.js framework conditional-request handling
  on the response, but the route doesn't set ETag headers. Needs
  investigation. Source-side mystery.
- **No CAS / ETag / If-Match primitive on KV.** Multi-instance
  daemon coordination explicitly named in the workspace pitch
  ("share artifacts between runs") but absent. Add `version`
  column + If-Match → 412 path. Schema migration scope.
- **Top-level `null` value PUT returns 500.** Supabase's JS client
  sends JS null as SQL NULL, but the column is jsonb NOT NULL.
  Fix: detect at service boundary, either accept (need to
  serialize to JSON literal `'null'`) or 400 INVALID_VALUE.
- **Slash in KV key un-encoded → HTML 404.** Next.js dynamic
  route eats the path segment before validation. Either ban `/`
  in keys or use a `[...key]` catch-all route. Routing change.
- **No CLI workspace verbs.** `straw workspace …` commands
  (already on MCP, missing on CLI). Source-only — needs CLI
  republish.
- **Heartbeat 25s on SSE (iter 5 deferred)** — still on the
  list.
- **Vercel-native error envelope on file upload 413** —
  bundle with the file-cap fix; both go away when (b) lands.

---

# Historical handoff — feat/overnight-2026-05-07

> Older handoff from `feat/collab-philosophy` (2026-04-24) — kept for
> context but historical.

**Started:** 2026-05-07, afternoon
**Last commit:** 2026-05-07, evening
**Branch:** `feat/overnight-2026-05-07`
**Authoritative spec:** `tasks/proposals/agent-first-customer-2026-05-07.md`
**Doctrine:** `tasks/AGENT_FIRST_DREAM.md` (D40 reset)
**Security followups:** `tasks/strategy/agent-first-security-followups.md`

## Where we ended

The agent-first-customer epic (D37 + D38 + D39 + D40) is mostly shipped.
An autonomous agent can now go from zero → registered → wallet set →
discovered task → submitted → scored, with no human in the loop.

**Live end-to-end via CLI:**
```sh
npx @strawai/cli register
npx @strawai/cli wallet set --method onchain_usdc --address 0x...
npx @strawai/cli tasks --category python
npx @strawai/cli submit <task-id> --dir ./solution
npx @strawai/cli watch <submission-id>
```

**Live via API/MCP/SDK:** identical surface — every CLI command maps 1:1 to
an MCP tool and an SDK method.

## Commits in order (oldest → newest)

| # | SHA | What |
|---|---|---|
| 1 | `dfe80c0` | Dashboard polish — submission heatmap + dropdown trim. |
| 2 | `bb030f1` | **D40 doctrine reset** + D37/D38/D39 specs + security followups doc. |
| 3 | `79b400a` | Migration 040 — agent identity + wallet schema (8 tables/columns). NOT YET APPLIED to live DB. |
| 4 | `30fb482` | operator-token service + wallet validation lib + 45 tests. |
| 5 | `89c0a5c` | agent-identity service `registerAnonymous` + 13 tests. |
| 6 | `390e0cb` | Routes: `POST /agent/register-anonymous` + `GET /agent/whoami`; auth surfaces tier. |
| 7 | `4be9fca` | Routes: wallet GET/PUT + operator-tokens; service `mintOperatorChildKey` + 4 tests. |
| 8 | `8451a9e` | `@strawai/cli` v0.1.0 — register / login / whoami / wallet. |
| 9 | `53d0505` | D39 bounty firehose route — `GET /api/v1/bounties/stream`. |
| 10 | `f3d6019` | Docs: agent.json + llms.txt advertise the new surface. |
| 11 | `ab49dbf` | `@strawai/agent-sdk` 0.4.0 — `agent`, `wallet`, `operatorTokens`, `bounties` resources + standalone `registerAnonymous` / `mintChildKey`. |
| 12 | `9bac56c` | `@strawai/mcp-server` 1.4.0 — 5 new tools (whoami, wallet_get/set, operator_tokens_list/create, subscribe_bounties). |
| 13 | `0c143f0` | `@strawai/cli` 0.2.0 — `tasks`, `submit`, `watch`, `subscribe`. |

## What's verified

- TypeScript: clean across the new code (sidebar.tsx errors are parallel
  in-flight work, not mine).
- Tests: ~1057 passing, 0 regressions. Includes 62 new tests.
- Local SDK was built + dropped into node_modules so mcp-server source
  typechecks against 0.4.0. Not committed (just node_modules state).

## What's NOT shipped — natural pickup points

In rough priority order:

1. ✅ **Apply migration 040 to live DB.** **Done 2026-05-07**, verified via `information_schema` query.

2. ~~**D37 path A — USDC stake-to-bootstrap.**~~ **REMOVED 2026-05-07** per user. Code deleted (`stake/charge`, `stake/claim`, `webhooks/coinbase` routes; `coinbase-commerce.service`); schema (`stake_charges`, `coinbase_webhook_events`) remains as dead artifact of migration 040.

3. **Wallet payout pipeline (settlement worker).**
   - On submission win → enqueue payout job → settle via the agent's
     declared rail (onchain_usdc via viem + base RPC). Worker reads
     `agent_payouts WHERE status = 'pending'`, transitions through
     queued / sent / confirmed.
   - Service layer (`enqueuePayout`, status helpers) + the deal-create
     hook are shipped. Worker is not.
   - Coinbase Commerce sender API is no longer needed (webhook side
     was removed); on-chain via viem is the path forward.

4. ~~**F8 floor-gate enforcement.**~~ **CLOSED 2026-05-07** — gate intentionally removed; every agent counts on the leaderboard from day one. Companies can filter by `tier` if they want a cleaner signal.

5. **Build the docs site** at `straw.wiki/docs`. Plan in `tasks/research/docs-platform-research-2026-05-07.md`. ~6 days of focused work.

6. **Publish SDK + MCP + CLI to npm.**
   - `cd packages/agent-sdk && npm publish` (0.4.0)
   - `cd ../mcp-server && npm install && npm publish` (1.4.0)
   - `cd ../cli && npm publish --access public` (0.2.0; first publish)

7. **Smoke test the full vertical** against straw.wiki post-deploy. Initial smoke against local dev :3010 ran 2026-05-07 and passed (see `tasks/research/agent-first-customer-smoke-2026-05-07.md`).

8. **TASKS.md sweep** — keep current as work lands.

## Risks worth flagging

- **Migration 040 is applied to live DB** (verified 2026-05-07).
- **CLI is unpublished.** `npx @strawai/cli` works locally if the package
  is built, but `npm i -g @strawai/cli` won't resolve until publish.
- **mcp-server 1.4.0 typecheck depends on local SDK build.** The
  package.json declares `^0.4.0` but the installed `node_modules` was
  hand-patched. Running `npm install` in mcp-server/ before publish
  will fail until 0.4.0 is on npm. **Publish SDK first.**
- **No identity-side spam protection.** Per user decision, registration
  is unrestricted. If a sybil flood meaningfully degrades the leaderboard
  signal, the tier filter (now in the leaderboard response) is the
  mitigation.
- **Dead schema artifacts from removed stake-to-bootstrap.**
  `stake_charges`, `coinbase_webhook_events`, `stake_charge_status` enum,
  `STAKED` value in `api_key_tier` enum. Additive cost is zero; cleanup
  migration would be ~3 lines if we ever care.

---

# Older Handoff — feat/collab-philosophy (2026-04-24, archived)

**Started:** 2026-04-24, evening
**Last commit:** 2026-04-25, early am
**Branch:** `feat/collab-philosophy`
**Worktree:** `.claude/worktrees/overnight-collab`
**North star:** `tasks/AGENT_FIRST_DREAM.md`
**Running ledger (block-by-block):** `tasks/OVERNIGHT_LOG.md`

---

## What you should do first when you wake up

1. `cd .claude/worktrees/overnight-collab`
2. `git log --oneline security-hardening..HEAD` — see the 7 commits below
3. Read this doc + `tasks/OVERNIGHT_LOG.md` (block-level changelog)
4. If anything looks wrong: `git checkout security-hardening` undoes nothing — your main checkout is untouched.
5. To merge: `git checkout master && git merge feat/collab-philosophy --no-ff` (or cherry-pick individual commits — they're independently meaningful).

**Nothing was pushed to any remote.** Nothing was applied to prod. Two new migration files exist in `supabase/migrations/` but `supabase db push` was NOT run.

---

## Commits in order (oldest first)

| # | SHA | What |
|---|---|---|
| 1 | `36eef51` | `fix(layout): use NEXT_PUBLIC_APP_URL for metadataBase` — orphan diff from before this session, isolated. |
| 2 | `bc42616` | `feat(philosophy): collaborative-excellence model — D15-D22, quota 15/25, weights-public docs` — Pass 1. |
| 3 | `0f7b94d` | `feat(sse): submission stream + wait_for_submission MCP tool — kills the polling tax` — Block 1a. |
| 4 | `e27a8b8` | `feat(sse): leaderboard stream + wait_for_leaderboard_change — push semantics for standings` — Block 1b. |
| 5 | `a7aa670` | `feat(sse): task events stream + wait_for_task_event — third surface; polling tax dead` — Block 1c. |
| 6 | `099915f` | `feat(submissions): rich submission kinds — schema + validation foundation (D23, Block 2a)` |
| 7 | `d40f993` | `feat(workspace): persistent agent KV store — substrate primitive #3 (D24, Block 3a)` |
| 8 | `1749ee8` | `docs(api+handoff): expose new SSE + workspace endpoints in /api/docs; add HANDOFF.md` — Pass-1 polish. |
| 9 | `5f33ba5` | `feat(eval): dialogic eval — request_re_eval (D25, Block 4a)` — re-roll the eval against the same artifact, no quota hit. |
| 10 | `<TBD>` | `feat(workspace): persistent agent file storage — substrate primitive #3 done (D26, Block 3b)` — workspace files alongside KV. |
| 11 | `<TBD>` | `feat(search): cross-task FTS — substrate primitive #6 (D27, Block 6a)` — full-text search across tasks. |
| 12 | `<TBD>` | `docs: human /docs page covers SSE + workspace + search + re-eval (D24-D27)` — section 11 added with all new substrate APIs. |

**Block 4b (`ask`) was killed mid-design** — daemons already have rubric, weights, judge reasoning, dimensions, and their own files; routing a question through a stateless Gemini call adds no new information. Killed before commit. Documented in OVERNIGHT_LOG.

**Substrate primitive scoreboard** (from `tasks/AGENT_FIRST_DREAM.md`):

| # | Primitive | Status |
|---|---|---|
| 1 | Rich submission types | Schema + validation shipped (D23). Worker branches deferred (2b). |
| 2 | SSE everywhere | **Done.** |
| 3 | Persistent agent workspace | **Done.** KV (D24) + files (D26). |
| 4 | Dialogic eval | request_re_eval shipped (D25). `ask` killed. `patch` deferred. |
| 5 | Massive MCP surface | **~25 tools** (started at ~10). |
| 6 | Cross-task search | FTS shipped (D27). pgvector embeddings deferred (6b). |
| 7 | Long-running checkpoints | Not started. |

---

## What shipped, in plain English

**The philosophy reframe (#2):** D15-D22 in `tasks/DECISIONS.md` lock in the collaborative-excellence model. Quota bumped 5 → 15 default, hard cap 25, poster-configurable. Pseudonym rationale reframed from "anti-gaming" to "blind-review fairness." Phase 20 added to `tasks/TASKS.md` for the still-unbuilt collaboration features (Q&A, chat, DMs, team submissions, **per-task judge daemon (D30 — ZeroClaw + Codex CLI subscription, supersedes the earlier multi-committee idea)**, rich task posts).

**Three SSE streams (#3-5) — the polling tax is dead:**
- `GET /api/v1/submissions/[id]/stream` + MCP `wait_for_submission` — daemons block until score lands instead of polling every N seconds.
- `GET /api/v1/tasks/[id]/leaderboard/stream` + MCP `wait_for_leaderboard_change` — daemons react to opponent moves.
- `GET /api/v1/tasks/[id]/events/stream` + MCP `wait_for_task_event` — daemons react to task lifecycle changes.

All three use a shared SSE library (`src/lib/sse.ts`) with heartbeat + 270s duration cap. SDK has `openSSE` + `waitForStreamTerminal` + `waitForNextStreamChange` primitives so adding a 4th stream is one function call.

**Rich submission types — schema + validation foundation (#6, D23):**
- Migration `031_rich_submission_kinds.sql` — `submission_kind text` + `submission_payload jsonb` columns. CHECK constraint on the kind enum: `zip` (default), `repo_url`, `live_endpoint`, `dockerfile`, `mixed`.
- `src/lib/submission-payload.ts` — Zod schemas + SSRF guard (rejects loopback, RFC1918, IPv6 ULA, link-local, cloud metadata endpoints, non-https schemes). 35 unit tests covering the obvious attacks.
- **Worker integration is NOT yet shipped** (Block 2b). Routes still accept `zip`-only behavior. The schema + validation are forward-compatible groundwork.

**Persistent agent workspace (#7, D24):**
- Migration `032_agent_workspace_kv.sql` — `agent_workspace_kv (agent_id, key, value jsonb)` table with RLS owner-only policies.
- `src/services/workspace.service.ts` — KV CRUD with hard quotas: 10k keys / 1MB per value / 10MB total per agent.
- 5 routes: `GET/PUT/DELETE /api/v1/workspace/kv/[key]`, `GET /api/v1/workspace/kv` (list), `GET /api/v1/workspace/quota`.
- 5 MCP tools: `workspace_get/set/delete/list/quota`.
- File storage (Block 3b) is deferred.

---

## What's verified

- **Tests:** 824 green across 66 test files. Includes 35 new SSE/submission-payload/workspace unit tests + 11 new SSE-route tests + 8 new SDK SSE/SDK-flow tests + 5 task-events route tests.
- **Typecheck:** `npx tsc --noEmit` exit 0 across the whole repo.
- **No regressions:** existing 18 modified files (services, routes, SDK types) still pass their existing tests.

What's NOT verified:
- **Production build:** `npm run build` was not run (Next.js production build is slow and not needed to validate this work).
- **Real SSE end-to-end against a running server:** the route + SDK tests cover the wire format and lifecycle, but I never spun up `npm run dev` and hit the streams with curl. Worth doing as a smoke test before merging.
- **Migrations against a real Postgres:** the .sql files were not applied. They use `IF NOT EXISTS` and `IF NOT EXISTS` patterns + `DROP CONSTRAINT IF EXISTS` so re-runs should be safe, but the only honest verification is to apply them somewhere.

---

## What to merge first when you're ready

The commits are independently meaningful, but here's a sane order:

1. **`bc42616` (philosophy)** — pure docs + small code changes (constants, validation, SDK comments). Lowest risk. Merge first to lock in the philosophy.
2. **`36eef51` (layout fix)** — orphan diff, can go anywhere.
3. **`0f7b94d`, `e27a8b8`, `a7aa670` (the three SSE streams)** — additive new endpoints + service-layer refactors. Existing routes still pass tests. Safe to merge as a unit.
4. **`099915f` (rich submissions schema)** — adds DB columns and a validation library. Worker doesn't use the columns yet; routes still accept `zip`-only at the boundary. **Apply migration 031 to prod before merging this commit's behavior changes.**
5. **`d40f993` (workspace KV)** — adds DB table + 5 new routes + 5 new MCP tools. **Apply migration 032 to prod before merging.**
6. **`1749ee8`** — docs page (Pass-1) + initial HANDOFF. Trivial.
7. **`5f33ba5` (request_re_eval)** — pure additive: 1 new route, no schema change. Safe.
8. **Block 3b commit (workspace files)** — adds DB table + 5 new routes + 6 new MCP tools. **Apply migration 033 to prod before merging.** Also requires manual: create Storage bucket `agent-workspace` (private) in the Supabase dashboard.
9. **Block 6a commit (search)** — adds 1 generated column + GIN index + 1 new route. **Apply migration 034 to prod before merging.**
10. **(this commit, last)** — docs page substrate-APIs section + this updated handoff.

Recommended migration application order if you do them all at once:
```sh
supabase migration list      # confirm 030 is the highest applied
supabase db push             # applies 031–036 in order
```

**UPDATE (2026-04-25): Migrations 031–036 are already applied to prod** (project `straw`, `ptvipiqorbqxoypbfeoj`) via the Supabase MCP `apply_migration` tool. The Storage bucket `agent-workspace` was created in the same pass (migration 035 — `INSERT INTO storage.buckets`), so the manual dashboard step is no longer needed. Migration 036 fixed 8 `auth_rls_initplan` advisor warnings by wrapping `auth.uid()` calls in sub-selects so Postgres caches per-query instead of per-row.

Verified post-apply:
- `submissions` has `submission_kind` (text, NOT NULL, default 'zip') + `submission_payload` (jsonb).
- `agent_workspace_kv` + `agent_workspace_files` exist with RLS enabled and 4 policies each.
- `tasks.search_tsv` populated for existing rows; FTS index returns hits on real tasks.
- `storage.buckets` row for `agent-workspace` (private, 25MB cap) + 4 path-prefix scoped policies on `storage.objects`.
- Advisor lints on my new objects: 5 remaining (all `unused_index INFO` — expected, tables are empty); 0 warnings.

---

## What's NOT done — natural next loops to pick up

Listed in the order I'd attack them:

1. **Block 2b — worker integration for rich submission types.** The schema + validation are ready (D23). Add eval-worker branches:
   - `repo_url`: clone with `git clone --depth 1` + `--branch <ref>`, then run existing build-check + LLM judge against the cloned tree.
   - `live_endpoint`: build a "prober" sub-routine that hits the URL with rubric-derived probes; second-line DNS-time SSRF check (defends against rebinding).
   - `dockerfile`: build via the existing dockerode integration in the eval-container sandbox.
   - `mixed`: parallel fan-out to per-part workers; weighted aggregation.
   - Then expose `kind` + `payload` in the quick-submit route + SDK + MCP.
2. **Block 4c — patch submissions.** Server stores deltas (`{overwrites, deletes, adds}`), applies them to the prior submission's tree at re-eval time. Cheaper iteration than full re-zip. Requires worker-side delta application — touches the eval pipeline.
3. **Block 5 — Per-task judge daemon (Agent-as-Judge, D30 — supersedes the earlier multi-daemon committee plan).** The big one. **One ZeroClaw judge daemon per task, powered by Codex CLI in ChatGPT subscription mode** (~$0 marginal cost per eval). Spawned at task publish via ZeroClaw's multi-agent routing inside a single Gateway (<5MB per agent — 200 judges fit on a Hetzner CX22). Investigates each submission via a Codex sub-agent in a fresh context window; posts a rich assessment (score + written reasoning + uncertainty flag) back through a custom `straw-api` plugin (~200 lines of Rust). Architectural argument: Agent-as-Judge research = 90% human agreement vs 70% for LLM-as-judge. **Cost model: ~$205/mo flat ($5 Hetzner + $200 ChatGPT Pro) regardless of evaluation volume up to Codex Pro rate limits.** See D30 in `tasks/DECISIONS.md` and the operational playbook in memory file `project_eval_setup_openclaw_codex.md`. Implementation surface in Phase 20d (rewritten in TASKS.md). Worth doing AFTER Block 2b so the new submission kinds are testable against the new judge.
4. **Block 6b — pgvector semantic search.** Add `pgvector` extension. New `tasks_embedding (task_id, embedding vector)` table. Cron-or-on-create populates via OpenAI/Gemini embeddings. New endpoint `/api/v1/search/tasks/similar?task_id=…` for cosine-nearest. Same SDK shape; new `similar_tasks` MCP tool. Layer on top of D27's FTS.
5. **Block 7 — long-running checkpoints** (substrate primitive #7). Let an agent save a partial submission, get a non-binding sanity score, keep going. Without soft-scoring it reduces to "versioned files" (already covered by D26 workspace files); the value-add is the soft eval, which requires a sandboxed build-check exposed via API. Needs care — the build-check service runs `execSync` per D14, so exposing it via a route without proper sandboxing is a footgun.
6. **Block 6 collaboration channels** (Phase 20b/c — Q&A, chat, DMs, team submissions). The visible substrate features. Best done in a focused session of their own; not loop-friendly.
7. **Block 6a-stage-2 — real ts_rank in search**. Today the search route returns a synthetic position-based rank because supabase-js's typed builder doesn't expose `ts_rank`. Wire via a Postgres RPC; API contract stays the same.

---

## Risks worth flagging

- **SSE on Vercel:** the streams cap themselves at 270s under Vercel's 300s function timeout. Reconnect logic is in the SDK. If you see "stream open failed" 502s in prod, the cause is likely an intermediary buffering response chunks; the route already sets `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`. Vercel-specific gotcha to watch for.
- **Migration 031 quietly changes behavior:** the `submission_kind` column has a NOT NULL DEFAULT, so existing rows get `'zip'`. New inserts that don't specify a kind also get `'zip'`. No code is broken by this, but if you later add an index assuming the column is always set, that assumption is correct.
- **Migration 032's RLS uses `auth.uid()`:** if any worker process queries `agent_workspace_kv` via the service role (bypassing RLS), be careful — the service must always scope by `agent_id` itself. The service.ts file does this; new callers must too.
- **Per-stream rate limiting:** the SSE endpoints intentionally don't rate-limit (rate-limit-on-poll doesn't make sense when the whole point is push). If you see a single agent hammering the stream surface (opening + closing repeatedly), per-agent open-stream count is the right control. Not a problem at today's volume.

---

## How to use the new SSE/MCP tools end-to-end (smoke test)

```bash
# In the worktree, with .env.local populated:
npm run dev

# In another terminal, with a Straw API key:
export KEY="straw_sk_..."

# Submit something quick (existing flow):
SUB=$(curl -s -X POST https://localhost:3000/api/v1/tasks/<task-id>/quick-submit \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"files":{"main.py":"print(\"hi\")","SUBMISSION.md":"# What I Built\nhello"}}' | jq -r .id)

# Stream the submission status — should see `event: submission` then `event: terminal` once eval finishes:
curl -N -H "Authorization: Bearer $KEY" \
  https://localhost:3000/api/v1/submissions/$SUB/stream

# Workspace round-trip:
curl -X PUT -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"value":{"hello":"world"}}' \
  https://localhost:3000/api/v1/workspace/kv/test-key
curl -H "Authorization: Bearer $KEY" \
  https://localhost:3000/api/v1/workspace/kv/test-key
curl -H "Authorization: Bearer $KEY" \
  https://localhost:3000/api/v1/workspace/quota
```

If any of those don't behave: the route + service + SDK are all unit-tested, so the failure is most likely environmental (DB migration not applied, env vars missing, dev server not running on the assumed port).

---

## What I deliberately didn't touch

- `master`, `security-hardening`, `feat/landing-uses-tuner-arena` — all untouched per the no-other-branches rule.
- `.claude/settings.local.json` — left as-is per your earlier "your call" comment.
- Any arena 3D code — separate canonical branch per memory.
- Production migrations — `.sql` files written but not applied.
- Any networked secret rotation, deploy infra, or external service config.
- Eval worker code — too invasive for tonight; Block 2b will need to touch it.
- `tasks/PRODUCT_VISION.md` and other gitignored docs — they remain on disk in your main checkout (with edits from earlier in the session) but were never staged for commit since they're gitignored by `.gitignore:81 *.md` with only `!README.md` exception. The 2 strategic docs I added (`AGENT_FIRST_DREAM.md`, `OVERNIGHT_LOG.md`, this `HANDOFF.md`) were force-added past the ignore rule on a per-file basis since they're load-bearing for future loops.
