# Overnight Handoff — feat/collab-philosophy

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

**An 8th commit is pending** — the `/api/docs` JSON spec gained the new SSE + workspace endpoints; this handoff doc is part of it.

---

## What shipped, in plain English

**The philosophy reframe (#2):** D15-D22 in `tasks/DECISIONS.md` lock in the collaborative-excellence model. Quota bumped 5 → 15 default, hard cap 25, poster-configurable. Pseudonym rationale reframed from "anti-gaming" to "blind-review fairness." Phase 20 added to `tasks/TASKS.md` for the still-unbuilt collaboration features (Q&A, chat, DMs, team submissions, multi-daemon committee eval, rich task posts).

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
6. **(this commit, last)** — docs page updates + this handoff. Trivial.

Recommended migration application order if you do them all at once:
```sh
supabase migration list      # confirm 030 is the highest applied
supabase db push             # applies 031 + 032 in order
```

---

## What's NOT done — natural next loops to pick up

Listed in the order I'd attack them:

1. **Block 2b — worker integration for rich submission types.** The schema + validation are ready (D23). Add eval-worker branches:
   - `repo_url`: clone with `git clone --depth 1` + `--branch <ref>`, then run existing build-check + LLM judge against the cloned tree.
   - `live_endpoint`: build a "prober" sub-routine that hits the URL with rubric-derived probes; second-line DNS-time SSRF check (defends against rebinding).
   - `dockerfile`: build via the existing dockerode integration in the eval-container sandbox.
   - `mixed`: parallel fan-out to per-part workers; weighted aggregation.
   - Then expose `kind` + `payload` in the quick-submit route + SDK + MCP.
2. **Block 3b — workspace files.** Schema + presigned uploads to Supabase Storage scoped to `agent_id`. 100MB-per-agent cap. Same RLS pattern as KV.
3. **Block 4 — dialogic eval.** `POST /api/v1/submissions/[id]/ask` (block on a clarifying question to the eval committee), `POST /api/v1/submissions/[id]/patch` (deltas instead of full re-zip), `POST /api/v1/submissions/[id]/request_re_eval`. The substrate primitive that makes the eval committee a collaborator instead of a dictator.
4. **Block 5 — multi-daemon eval committee** (Phase 20d in TASKS.md). The big one. `RemoteEvaluator` interface + 3-5 specialized daemons + reviewer + validator + per-daemon breakdown surfaced in `get_submission`. Worth doing AFTER block 2b so the new submission kinds are testable against the new committee.
5. **Block 6 — agent collaboration channels** (Phase 20b/c — Q&A, chat, DMs, team submissions). The visible substrate features. Best done in a focused session of their own; not loop-friendly.
6. **Cross-task semantic search** (substrate primitive #6). pgvector-backed embeddings on task descriptions + cosine-similarity search MCP tool.

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
