# Service-Role Client Audit

**Status:** Inventory only — no code changes.
**Purpose:** Catalog every place the app uses `SUPABASE_SERVICE_ROLE_KEY` (via `createServiceClient()`), so the eventual C1 RLS-bypass remediation is bounded and scoped.

**Why this matters:** RLS is our last-line enforcement of the non-negotiables in REQUIREMENTS.md (agent isolation, rubric privacy, evaluation immutability). Every service-role call site bypasses RLS. Some are architecturally necessary (workers, cron, auth infra). Others exist because writing an RLS policy was more work than opting out. This audit separates the two and ranks the latter by risk.

**Scope:** Excludes `.claude/worktrees/` and `node_modules/`. Line numbers reflect the state of `overnight-scale-pass` branch.

---

## Summary

| Category | Count | Action |
|---|---|---|
| JUSTIFIED-INFRA (workers, cron, auth, helpers) | 7 | Keep |
| JUSTIFIED-SETUP (seed, dev/test) | 3 | Keep (non-prod) |
| BORDERLINE (authenticated routes with scoped reads/writes) | ~50 | Keep for now — RLS policies + anon client migration deferred to a dedicated sprint |
| RISKY (public endpoints using service-role to read public data) | 3 | **Top remediation targets** |
| UNCLEAR / DUAL-AUDIENCE | 1–2 | Investigate |

The RISKY category is what C1 is about. Moving those four call sites to anon-client + explicit RLS SELECT policies eliminates the largest bypass surface.

---

## Category 1 — JUSTIFIED-INFRA (keep as-is)

These cannot reasonably use anon + user JWT. They run without a user context, or they *are* the mechanism that creates user context.

| File:line | Operation | Justification |
|---|---|---|
| `src/lib/supabase.ts:~8` | `createServiceClient()` factory itself | Factory definition — not a call site. |
| `src/lib/env.ts:~7` | `SERVICE_ROLE_KEY` env declaration | Config plumbing. |
| `src/lib/auth-server.ts:~19` | User row upsert on first OAuth login | Executes *before* the user's session exists; cannot use user JWT. |
| `src/lib/auth-api-key.ts:~36` | Look up API key by SHA-256 hash | Key validation precedes user context for v1 API requests. |
| `src/lib/auth-api-key.ts:~58` | Update `last_used_at` on api_keys row | Fire-and-forget after successful validation. |
| `src/workers/evaluation-worker.ts:162` | Fetch task, write evaluation_result, dispatch webhooks/notifications | Background worker process; no user JWT on BullMQ job. |
| `src/workers/webhook-worker.ts:43` | Read + update webhook_deliveries | Background worker; same reasoning. |
| `src/app/api/cron/close-tasks/route.ts:50` | Scan expired tasks, move to evaluation | Cron endpoint triggered by Vercel scheduler; no user JWT. |
| `src/app/api/cron/deadline-reminders/route.ts:36` | Scan tasks + dispatch notifications | Same. |
| `src/app/api/health/route.ts:12` | DB liveness probe | Must work without user auth by definition. |

**Action:** Keep. These are the architectural commitment to use service-role.

---

## Category 2 — JUSTIFIED-SETUP (non-production)

| File:line | Operation | Notes |
|---|---|---|
| `src/db/seed.ts` | Seed script | Dev/CI only; not in prod code path. |
| `src/test/setup.ts` | Mock environment for Vitest | Test infrastructure. |
| `src/app/api/dev/reset-onboarding/route.ts` | Reset onboarding flag | Dev-only route. **TODO: ensure it's gated behind `NODE_ENV !== 'production'` before go-live.** |
| `src/app/api/dev/pipeline-test/route.ts` | Pipeline smoke test | Dev-only route. **Same gating TODO.** |

**Action:** Keep. Confirm dev routes are excluded from prod before cutover.

---

## Category 3 — RISKY (top remediation targets)

These use the service-role client in **unauthenticated** handlers to read data that *ought* to be exposed to everyone — i.e. they don't need service-role, they need an RLS policy that says "anonymous users can SELECT these rows." Today the service-role bypass is load-bearing; if we ever tighten the anon policies accidentally, these still work, which means RLS is not actually the last line of defense here.

| Rank | File:line | Operation | Why risky | Remediation |
|---|---|---|---|---|
| 1 | `src/app/api/public/leaderboard/route.ts:14` | Public leaderboard listing (tasks + submission counts + top_score) | No auth; reads cross-user data via service-role. If the anon RLS were misconfigured, we'd still return data. | Add RLS SELECT policies on `tasks WHERE status IN ('open','evaluating','closed')`, on `submissions` exposing `task_id` + `id` for those tasks, on `evaluation_results` exposing `final_score` where the joined submission is public. Switch to anon client. |
| 2 | `src/app/api/public/tasks/route.ts:13` | Public task list (open tasks + submission counts) | Same pattern: no auth, service-role for public data. | Extend the RLS policy from #1 to also expose the displayed columns: `title, description, category, budget_cents, deadline, eval_mode, created_at`. Switch to anon client. |
| 3 | `src/app/api/public/agents/route.ts:12` | Public agent directory + computed stats | Reads `agent_builder_profiles`, `submissions`, `deals`, `evaluation_results` across all users. | `agent_builder_profiles` already public; add SELECT policies for the aggregation joins. Switch to anon client. Note this route does N+1 queries (one round-trip per agent) — consider denormalizing reputation stats in a follow-up. |
| 4 | `src/lib/webhook-dispatch.ts:19` | `findActiveByUserEvent()` — "which webhooks for this user are subscribed to this event" | Called from authenticated route handlers but creates service-role client internally. If route forgets to scope by caller's user ID, this silently returns everyone else's webhook URLs. | Add RLS `users_see_own_webhooks` policy. Require caller to pass the authenticated `userId`; enforce at DB level. |

---

## Category 4 — BORDERLINE (scoped reads/writes; defer)

~50 API routes use `createServiceClient()` to read or write data that *is* scoped to the authenticated user — e.g. "GET my submissions", "create a task I own", "list my API keys". They're not bugs in the strict sense — the routes verify ownership in application code before the query runs. But they rely on the route being correct rather than RLS enforcing the invariant.

Representative sample (not exhaustive):

| File | Pattern |
|---|---|
| `src/app/api/api-keys/route.ts` | List + create caller's own API keys |
| `src/app/api/tasks/route.ts` | Create task (caller = company); list own tasks |
| `src/app/api/submissions/route.ts` | Create submission (caller = agent); list own submissions |
| `src/app/api/v1/submissions/[id]/*` | Upload, complete, read scores — all caller-scoped |
| `src/app/api/v1/tasks/[id]/publish/route.ts` | Publish task (caller must own it) |
| `src/app/api/v1/tasks/[id]/close/route.ts` | Close task (caller must own it) |
| `src/app/api/deals/route.ts` | List + create deals (scoped to company or agent) |
| `src/app/api/messages/[threadId]/route.ts` | Thread participants only |
| `src/app/api/dashboard/*` | Caller's own stats / submissions |
| `src/app/api/onboarding/route.ts` | Caller's own profiles |
| `src/app/api/agents/me/route.ts` | Caller's own agent profile |
| `src/app/api/agents/profile/route.ts` | Update caller's own agent profile |

**Why defer:** The remediation is a multi-session sprint, not an overnight task. It requires:

1. Writing ~20 RLS SELECT/INSERT/UPDATE/DELETE policies (one per table × operation).
2. Replacing `createServiceClient()` with an anon client that carries the caller's JWT (or API key → JWT exchange).
3. Testing every route end-to-end to confirm behavior doesn't change.
4. Carefully handling the authenticated-via-API-key path — we'd need Supabase to accept a JWT minted from the API key, or mint a short-lived custom JWT.

This is tracked as "C1: service client bypasses RLS" in the overnight sprint log (`tasks/overnight-log.md:153`) and is explicitly architectural.

---

## Category 5 — UNCLEAR / DUAL-AUDIENCE (investigate)

| File:line | Uncertainty | Investigation step |
|---|---|---|
| `src/app/api/agents/[id]/route.ts` | Returns different data depending on whether caller is authenticated or anonymous (per the recent H1 fix). Service-role is currently used; anon might be enough if the gating logic moves fully to the route. | Confirm the auth branches still work if switched to anon client — especially the "aggregate stats only for unauthenticated" code path. |
| `src/app/api/tasks/[id]/route.ts` (GET) | Returns `rubric_criteria` including weights. **Per D10 (2026-04-21) and D15: weights are intentionally public — full rubric transparency is the product bet.** Original concern resolved; route is correct as-is. Service-role usage on this route is the only remaining audit question. | Confirm only the service-role bypass justification (RLS + storage signed-URLs) remains; weight visibility is no longer a violation. |

**Action:** Flag for follow-up. Both have product-correctness implications beyond RLS.

---

## Recommended order of operations

1. **Before prod launch:** gate the two `/api/dev/*` routes on `NODE_ENV !== 'production'` or remove them entirely. Smallest change, eliminates a real leak vector.
2. **Rank-1 to Rank-4 RISKY migrations:** one PR per route; each is ~100 LOC including the RLS policy. Landing these eliminates the bulk of the C1 surface area without touching authenticated routes.
3. **UNCLEAR items:** investigate weight exposure in `/api/tasks/[id]/route.ts` — this is a potential non-negotiable violation regardless of service-role status.
4. **BORDERLINE sprint:** the big one. Break by table, land in chunks of 3–5 routes per PR. Every PR adds RLS policies + migrates the corresponding routes.

## What this audit is not

- Not a list of bugs. Most of these work correctly today because route-level auth is in place.
- Not a performance concern. RLS adds microseconds per query; not the bottleneck.
- Not a prescription for *when* to do the migration. Depends on enterprise-contract pressure, audit findings, and whether we move to Fly Machines eval execution (which also needs to authenticate to Supabase and benefits from cleaner policies).

## Related docs

- `tasks/overnight-log.md:153` — original C1 finding ("service client bypasses RLS — architectural, not overnight")
- `tasks/REQUIREMENTS.md:141-148` — non-negotiables that RLS is meant to enforce
- `tasks/DECISIONS.md` — D12 security model (controlled per-task by company, not hardcoded)
