# Handoff — feat/overnight-2026-05-07 (current)

> **You are here.** Below this section is the older handoff from
> `feat/collab-philosophy` (2026-04-24) — kept for context but historical.

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

1. **Apply migration 040 to live DB.**
   ```sh
   npx supabase link --project-ref ptvipiqorbqxoypbfeoj
   npx supabase db query --linked --file supabase/migrations/040_agent_identity_and_wallet.sql
   ```
   Until this runs, the new routes will fail at the DB layer.

2. **D37 path A — USDC stake-to-bootstrap.**
   - Coinbase Commerce client (charge create + webhook handler).
   - `POST /api/v1/agent/stake/charge` (creates a charge, returns hosted URL).
   - `POST /api/v1/wallet/webhooks/coinbase` (verifies signature, marks
     stake_charges row as confirmed). Idempotent on event_id (F7).
   - `POST /api/v1/agent/stake/claim` (after confirmed, mints api_key).
   - Schema is already there (stake_charges + coinbase_webhook_events
     tables, stake_charge_status enum).

3. **Wallet payout pipeline.**
   - On submission win → enqueue payout job → settle via the agent's
     declared rail (onchain_usdc via viem + base RPC, or Coinbase
     Commerce sender API). Worker reads `agent_payouts WHERE status =
     'pending'`, transitions through queued / sent / confirmed.
   - Schema is there (agent_payouts table). Service layer + worker is not.

4. **F8 floor-gate enforcement in submission flow.**
   - `users.is_floor_qualified` defaults true; `registerAnonymous` sets
     it false. The submission flow needs to check and flag
     `quality_floor_pending` for leaderboard exclusion until it flips
     true. Today the flag is read by `whoami` but not by submit.
   - Tracked as F8 in `tasks/strategy/agent-first-security-followups.md`.

5. **Publish SDK + MCP + CLI to npm.**
   - `cd packages/agent-sdk && npm publish` (0.4.0)
   - `cd ../mcp-server && npm install && npm publish` (1.4.0)
   - `cd ../cli && npm publish` (0.2.0; first publish — needs `--access public`)

6. **Smoke test the full vertical**, then capture findings in
   `tasks/research/agent-first-customer-smoke-2026-05-XX.md`.

7. **TASKS.md sweep** — see updates this commit; add anything missing.

## Risks worth flagging

- **Migration 040 has not been applied.** Existing `register-anonymous`,
  `whoami`, `wallet`, `operator-tokens`, `mint-child` routes will fail
  on missing columns/tables/enums until the migration lands.
- **CLI is unpublished.** `npx @strawai/cli` works locally if the package
  is built, but `npm i -g @strawai/cli` won't resolve until publish.
- **mcp-server 1.4.0 typecheck depends on local SDK build.** The
  package.json declares `^0.4.0` but the installed `node_modules` was
  hand-patched. Running `npm install` in mcp-server/ before publish
  will fail until 0.4.0 is on npm.
- **Trust-delegation gap.** Anonymous tier registers without any
  attestation. F1 fingerprinting is UA-only; sybil-resistant
  mitigations (TLS fingerprint, ASN, Cloudflare Turnstile) are deferred.

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
