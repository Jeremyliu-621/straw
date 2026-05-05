# Overnight Scale Pass — Plan

> **Historical note (2026-04-21+):** This plan was authored when rubric weights were still hidden from agents. D10 flipped weights to **public** (and D15 ratifies the new collaborative-excellence philosophy). The "rubrics never exposed pre-deadline" / "leak rubric weights" / "Grep for `weight` in agent-facing endpoints" invariants below are **superseded** — weights are now expected to be returned to agents. Identity anonymization during the build window remains.

Branch: `overnight-scale-pass` (from `overnight-sprint`)

Goal: additive, reversible changes that unlock horizontal read/write scale without touching product semantics, security invariants, or architectural tent poles (microVM isolation, build-check sandboxing, C1 RLS bypass — all deferred with user sign-off).

Every change is measurable and revertible with a single `git revert`. No behavior change for existing users.

---

## Alignment with REQUIREMENTS.md non-negotiables

Every item below was checked against the non-negotiables list at REQUIREMENTS.md:141–148:

- Eval containers run with company-configured constraints → **untouched**
- No agent accesses another agent's data → **reinforced by invariant tests (W4)**
- Rubrics never exposed pre-deadline → **reinforced by invariant tests + caching audit excludes weights**
- Every submission requires SUBMISSION.md → **reinforced by invariant tests**
- Evaluation results append-only, DB-enforced → **reinforced by invariant test**
- Full audit trail → **untouched**

RLS on every table is reinforced indirectly: the service-role audit (W5) surfaces every place the app bypasses RLS, ranked by risk.

---

## Workstreams

### W1 — HTTP edge caching on public + leaderboard endpoints

Research: subagent audits every public API route + leaderboard routes, classifies green / yellow / red for cacheability (does it vary per-user? leak rubric weights? reveal pre-deadline identities?).

Implementation:
- Green endpoints → `Cache-Control: public, s-maxage=N, stale-while-revalidate=M` (shared cache only; TTL per endpoint).
- Leaderboard → shortest TTL (~3s) matching existing poll interval.
- ETag on detail endpoints so pollers get 304s.
- Red endpoints → leave alone, document why.

Verification:
- Every header change accompanied by a test that asserts the endpoint does not leak rubric weights or pre-deadline identities.
- Grep response shapes for `weight` in agent-facing endpoints.

Scale impact: 10–100× read capacity for anonymous browse + 5–20× for leaderboard polling.

Files touched: `src/app/api/public/*/route.ts`, leaderboard routes under `src/app/api/**/leaderboard/route.ts`.

---

### W2 — `027_performance_indexes.sql` migration

Research: subagent scans `src/app/api/`, `src/db/`, `src/workers/`, `src/services/` for all Supabase queries. Cross-references columns used in `.eq()` / `.order()` / `.in()` against existing indexes in migrations 001–026.

Target query patterns:
- Leaderboard: `evaluation_results` join `submissions` on `task_id + status='completed'`
- Reputation (computed on read): `submissions(agent_id)` + join evaluation_results
- Task matching on publish: `agent_builder_profiles(categories)` array (likely GIN)
- Webhook delivery / retry: `webhook_deliveries(status, created_at)`
- Notifications: `notifications(user_id, read_at)`
- Messages: `messages(thread_id, created_at)`

Migration uses `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — zero downtime, safe to re-run.

Verification: EXPLAIN plans for the target queries should prefer new indexes on non-empty data.

Files touched: `supabase/migrations/027_performance_indexes.sql` (new only).

---

### W3 — Worker scale prep

Add env vars:
- `EVAL_WORKER_CONCURRENCY` (default 2, current hardcoded in evaluation-worker.ts:623)
- `WEBHOOK_WORKER_CONCURRENCY` (default 10, current hardcoded in webhook-worker.ts:150)

Extend heartbeat file (evaluation-worker.ts:109-151) with counters:
- `jobs_processed` (cumulative)
- `jobs_failed` (cumulative)
- `avg_duration_ms` (rolling window, last 50)
- `last_error` (truncated message)

Update `src/lib/env.ts` schema with optional fields + sensible defaults so existing deployments are unaffected.

Scale impact: enables operators to tune per-instance throughput, supports horizontal scaling against same Redis.

Files touched: `src/workers/evaluation-worker.ts`, `src/workers/webhook-worker.ts`, `src/lib/env.ts`, `src/constants.ts`.

---

### W4 — Non-negotiable invariant test suite

New folder: `src/__tests__/invariants/`

One test file per non-negotiable from REQUIREMENTS.md:141–148:
- `rubric-privacy.test.ts` — weights never present in any v1 API response for an agent
- `evaluation-immutability.test.ts` — DB trigger rejects UPDATE on evaluation_results (uses seeded test DB or mocks)
- `cross-agent-isolation.test.ts` — agent A's API key cannot fetch agent B's submission
- `pre-deadline-anonymization.test.ts` — leaderboard returns anonymized names pre-deadline
- `submission-md-required.test.ts` — `/complete` without SUBMISSION.md returns 400 MISSING_SUBMISSION_MD

Scope: thin, fast, clearly named. These are regression gates, not new coverage. Where a test requires a live DB, use the existing test harness patterns already in the repo.

Scale impact: indirect — prevents future refactors (e.g., the eventual C1 fix, the Fly Machines migration) from silently breaking product invariants. At scale, a broken invariant is catastrophic.

Files touched: new only.

---

### W5 — `tasks/SERVICE_ROLE_AUDIT.md`

Research: subagent greps every `SUPABASE_SERVICE_ROLE_KEY` and `createClient(...serviceRoleKey)` call site. Categorizes each:
- **Justified (worker / cron / presigned URL generation)** — keep, document why.
- **Borderline (API route doing bulk operation / admin action)** — flag, recommend RLS policy + anon client migration.
- **Risky (route that could use anon + authenticated user's JWT)** — rank high, recommend migration path.

Output doc: ranked inventory + migration recommendations. No code changes — this unblocks the eventual C1 fix without attempting it overnight.

---

### W6 — `tasks/SCALE.md` playbook

Plain-English guide for operators:
- How to scale workers horizontally (N replicas against same Redis).
- How to scale vertically (bump `EVAL_WORKER_CONCURRENCY`).
- What to monitor (heartbeat metrics, BullMQ queue depth, Supabase connection count).
- Upgrade path from single VPS → Fly Machines / Modal for eval execution.
- When to add Supavisor pooling.
- Rough capacity math (current: ~12–24 evals/hr per replica).

---

## Explicitly deferred

Reason: each needs your input or is architectural.

- **Sonnet / creative-writing eval prompt** (overnight-log.md:32) — product decision, not a code fix.
- **Rate-limiting implementation** — provider choice (Upstash vs custom).
- **Fly Machines / Modal integration** — large architectural change.
- **build-check.service.ts sandboxing** — same; needs provider choice.
- **C1 service-role RLS bypass fix** — architectural per overnight-log.md:153; audit only.
- **Streaming Supabase Storage downloads** — premature; 50MB cap keeps memory bounded.

---

## Branch hygiene

- Branch: `overnight-scale-pass` off `overnight-sprint`.
- Does NOT touch the 2 uncommitted files from user's overnight-sprint work (`supabase/migrations/023_eval_constraints.sql`, `tasks/overnight-log.md`).
- Commits authored as `Jeremy Liu <137456762+Jeremyliu-621@users.noreply.github.com>` per memory.
- Each workstream committed separately so user can cherry-pick or revert individually.

---

## Execution order

1. W1 research + W2 research + W5 research (parallel subagents)
2. W3 implementation (self-contained, runs while subagents work)
3. W6 playbook (depends on nothing)
4. W1 implementation (needs W1 research)
5. W2 migration (needs W2 research)
6. W5 audit doc (needs W5 research)
7. W4 invariant tests (reads product code, benefits from W1/W2 understanding)
8. Full test suite + type check
9. Overnight log entries
10. Commit each workstream
