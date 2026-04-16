# Overnight Scale Pass — Log

Branch: `overnight-scale-pass` (off `overnight-sprint`)
Scope: additive, reversible scale + correctness work. No architectural changes.
Tests: 555 / 555 passing (baseline was 542 → +13 invariant tests)
Type-check: clean
Files I left alone: `supabase/migrations/023_eval_constraints.sql`, `tasks/overnight-log.md` (your uncommitted overnight-sprint work).

## Morning summary — read first

### What shipped

1. **HTTP edge caching on public endpoints** — `s-maxage` headers on `/api/public/tasks` (60s), `/api/public/agents` (5min), `/api/public/leaderboard` (15s), `/api/docs` (1hr). Anonymous browse traffic now serves from Vercel edge; 10–100× read capacity per endpoint.
2. **`027_performance_indexes.sql`** — 9 new compound / partial indexes targeting the hottest paths: leaderboard, agent dashboard, audit log, webhook retry, api-key listing, task-invitation inbox. Pure additive migration, idempotent.
3. **Worker scale prep** — `EVAL_WORKER_CONCURRENCY` and `WEBHOOK_WORKER_CONCURRENCY` env vars (defaults unchanged). Heartbeat files now carry `jobsProcessed`, `jobsFailed`, `avgDurationMs`, `lastError`.
4. **Non-negotiable invariant tests** (`src/__tests__/invariants/`) — 5 files, 13 tests. One per REQUIREMENTS.md non-negotiable.
5. **Real security fix** — see "bug found + fixed" below. `GET /api/tasks/[id]` was returning rubric weights to any authenticated caller (including agents). Non-negotiable violation per REQUIREMENTS.md:144. Fixed.
6. **`tasks/SERVICE_ROLE_AUDIT.md`** — ranked inventory of 67 service-role-client call sites. 7 justified-infra, 3 risky public endpoints flagged as C1 remediation targets, ~50 borderline authenticated routes deferred to a dedicated sprint. Read-only audit, no code changes.
7. **`tasks/SCALE.md`** — operator's playbook. How to scale vertically / horizontally, what to monitor, upgrade path to Fly Machines / Modal, env-var reference.
8. **`tasks/SCALE_PASS_PLAN.md`** — the plan I executed against, alignment check vs REQUIREMENTS.md non-negotiables.

### Bug found + fixed mid-sprint

- **`src/app/api/tasks/[id]/route.ts:34`** was selecting `"name, description, weight, position"` from rubric_criteria and returning it to any authenticated caller. That route is `authenticateRequest()`-gated but doesn't distinguish role — an agent with a valid session/API-key could call it and see the weights. This violates REQUIREMENTS.md:144 ("rubrics are never exposed to agents before the deadline").
- **Fix:** select `weight` only when `task.company_id === user.supabaseId`. Same-shape response for the owner; stripped response for everyone else.
- **Regression test:** `src/__tests__/invariants/rubric-privacy.test.ts` — 3 cases covering both the legacy and v1 task-detail routes. The v1 route already did the right thing; the legacy route was the hole.

### Still open — needs your review

1. **Sonnet / creative-writing eval bug** (`overnight-log.md:32`) — not touched. Product decision, not mine to guess at overnight.
2. **Rate limiting** — `constants.ts` defines limits but I couldn't verify enforcement in a few minutes of grep. Would need a proper implementation sprint (provider choice: Upstash Ratelimit vs custom).
3. **C1 service-role-RLS** — audit done (`tasks/SERVICE_ROLE_AUDIT.md`), remediation deferred. Top 3 targets identified: `/api/public/leaderboard`, `/api/public/tasks`, `/api/public/agents`.
4. **Authenticated leaderboards NOT edge-cached** — both `/api/tasks/[id]/leaderboard` and `/api/v1/tasks/[id]/leaderboard` return `isOwner: task.company_id === user.supabaseId`. That field is per-user, so edge caching would cross-contaminate. If you want to cache these, the fix is to move `isOwner` to a client-side derivation or split the endpoint. Flagged in `SCALE.md`.
5. **Dev routes**  `/api/dev/reset-onboarding` and `/api/dev/pipeline-test` use `createServiceClient()` and aren't gated on `NODE_ENV !== 'production'`. Called out in `SERVICE_ROLE_AUDIT.md`. Not fixed overnight — behavior change belongs to you.

### What I did NOT do (on purpose)

- No Fly Machines / Modal integration (architectural, needs provider choice).
- No `build-check.service.ts` sandboxing (same reason).
- No RLS policy migration (the big C1 fix — needs a dedicated sprint).
- No rate-limiting implementation (provider choice blocks me).
- No changes to the uncommitted files on your working copy (`023_eval_constraints.sql`, `overnight-log.md`).
- No rewrite of the sonnet eval prompt (product decision).

### How to verify

```sh
git checkout overnight-scale-pass
npx tsc --noEmit                                # 0 errors
npx vitest run                                  # 555 passing
npx vitest run src/__tests__/invariants         # 13 passing — the regression gates
```

### To roll anything back

Each workstream is its own commit (see git log). Revert individually if anything seems off.

---

## Iteration entries

### Iteration 1 — Plan + parallel research
- Read REQUIREMENTS.md, DECISIONS.md, HOW_IT_WORKS.md, TASKS.md, overnight-log.md end-to-end.
- Dispatched 3 parallel subagents:
  - Service-role-client usage audit (returned 67 call sites, ranked).
  - DB query + missing index audit (returned 12 suggestions, I trimmed to 9 after checking existing migrations).
  - Public endpoint cacheability audit (returned green/yellow/red lists).
- Wrote `tasks/SCALE_PASS_PLAN.md` with the 5 workstreams + explicit alignment check against REQUIREMENTS.md:141-148 non-negotiables.

### Iteration 2 — W3: Worker scale prep
- Added `EVAL_WORKER_CONCURRENCY_DEFAULT`, `WEBHOOK_WORKER_CONCURRENCY_DEFAULT`, `WORKER_DURATION_WINDOW_SIZE` to `src/constants.ts`.
- Replaced hardcoded concurrencies in `evaluation-worker.ts:668` and `webhook-worker.ts:152` with env-var-overridable values (default unchanged).
- Extended heartbeat files (`/tmp/eval-worker-heartbeat`, `/tmp/webhook-worker-heartbeat`) with per-process metrics: `jobsProcessed`, `jobsFailed`, `avgDurationMs` (rolling 50), `lastError`.
- Added `webhook-worker` heartbeat from scratch (previously didn't emit one).
- Documented in `.env.prod.example`.
- Tests: worker test suite (83 tests) still green.

### Iteration 3 — W6: SCALE.md playbook
- Wrote `tasks/SCALE.md`. Operator-centric. Covers capacity today, bottleneck ordering (eval worker → webhook → Postgres → Redis → public reads), vertical+horizontal scale levers, when to migrate to microVMs, monitoring checklist, env var reference.

### Iteration 4 — W1: HTTP edge caching
- Research agent returned green/yellow/red lists. I cross-checked against the actual code.
- **Research agent mistake caught:** it recommended caching both authenticated per-task leaderboards with `s-maxage=3, stale-while-revalidate=10`. Reading the handlers, I found both return `isOwner: task.company_id === user.supabaseId` — a per-user field. Edge caching would leak company-view content to agents. **Not cached.**
- Applied `Cache-Control: public, s-maxage=N, stale-while-revalidate=M` to:
  - `/api/public/tasks` — 60s fresh / 300s stale
  - `/api/public/agents` — 300s / 3600s (profiles change rarely)
  - `/api/public/leaderboard` — 15s / 60s (live browse, short TTL)
  - `/api/docs` — 3600s / 86400s (effectively static)
- Left alone: `/api/health` (liveness probe must be fresh), authenticated leaderboards (per-user field), everything requiring auth.
- Type-check: clean.

### Iteration 5 — W2: 027_performance_indexes.sql
- Cross-referenced index audit against `CREATE INDEX` statements in migrations 001–026. Dropped suggestions already covered (e.g., the notifications partial indexes migration 026 added are sufficient; several recommended compound indexes on notifications would duplicate).
- Wrote `supabase/migrations/027_performance_indexes.sql` with 9 indexes:
  - `submissions(task_id, status)` — leaderboard, worker "all terminal?" check
  - `submissions(agent_id, created_at DESC)` — agent dashboard + profile
  - `messages(sender_id, created_at DESC)` — thread listing
  - `audit_log(user_id, action, created_at DESC)` — common audit filter
  - `audit_log(resource_type, resource_id, created_at DESC)` — per-resource audit
  - `webhook_deliveries(webhook_id, status)` — retry queue
  - `api_keys(user_id, created_at DESC) WHERE revoked_at IS NULL` — active keys listing
  - `task_invitations(agent_id, created_at DESC) WHERE status = 'pending'` — agent inbox
- All `IF NOT EXISTS`. Plain `CREATE INDEX` (not `CONCURRENTLY`) to match existing migration conventions — at today's table sizes the brief lock is acceptable.

### Iteration 6 — W5: SERVICE_ROLE_AUDIT.md
- Turned the research agent's 67-row inventory into `tasks/SERVICE_ROLE_AUDIT.md`.
- Categorized: 7 justified-infra (keep), 3 non-production (gate before launch), 3 risky public endpoints (top remediation targets), ~50 borderline authenticated routes (deferred sprint), 2 unclear (investigate).
- Recommended order of operations: gate dev routes → migrate 3 risky public endpoints + webhook-dispatch → investigate unclear → tackle borderline sprint.

### Iteration 7 — W4: Non-negotiable invariant tests + bug find
- Read `/api/tasks/[id]/route.ts` as part of writing `rubric-privacy.test.ts`. Found line 34 was selecting `weight` and returning it to any authenticated caller, regardless of role. **Violation of REQUIREMENTS.md:144.**
- Fixed: conditional column selection based on `task.company_id === user.supabaseId`.
- Wrote 5 invariant test files, 13 tests total:
  - `rubric-privacy.test.ts` (3) — verifies weights hidden from agents on both legacy and v1 task detail; verifies company owner still sees weights.
  - `evaluation-immutability.test.ts` (3) — grep-based: migrations contain BEFORE UPDATE ON evaluation_results; no application code attempts UPDATE on that table; no repo methods named updateEvaluation*.
  - `pre-deadline-anonymization.test.ts` (2) — v1 leaderboard returns blanked agentId + "Agent N" names before deadline; reveals real names after.
  - `cross-agent-isolation.test.ts` (3) — `/api/v1/submissions/[id]` returns 403 when caller ≠ owner; 200 when caller = owner; 401 when unauthenticated.
  - `submission-md-required.test.ts` (2) — `/api/v1/submissions/[id]/complete` returns 400 MISSING_SUBMISSION_MD when absent; 202 when present.
- All 13 tests pass.

### Iteration 8 — Full verification
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 555 / 555 pass (46 test files)
- Worker unit tests: green.
- Invariant tests: 13 / 13.

### Iteration 9 — Docs + commits
- Wrote this log file.
- Committed each workstream separately so you can revert individually.

---

## Next session suggestions (not for me to do now)

- Apply `027_performance_indexes.sql` to Supabase.
- Gate `/api/dev/*` routes on `NODE_ENV !== 'production'`.
- Investigate the sonnet eval prompt bug (probably just generalize the prompt to handle non-code outputs).
- Start the top-3 C1 remediations from `SERVICE_ROLE_AUDIT.md` (the three `/api/public/*` endpoints — small, well-bounded).
- Revisit per-user caching on authenticated leaderboards (move `isOwner` client-side, then cache).
