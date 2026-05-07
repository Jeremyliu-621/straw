# Lessons

Running log of patterns and anti-patterns discovered while working on Straw. Read at session start for relevant project context; append after any correction or a notable success.

---

## App constant added but DB enum value never migrated (2026-05-07)

`src/constants.ts:124` defined `SUBMISSION_STATUS.EVALUATION_FAILED = "evaluation_failed"` and the eval worker wrote that value when LLM judging failed fatally. But no migration ever ran `ALTER TYPE submission_status ADD VALUE 'evaluation_failed'`. The original enum (migration 001) had four values; migration 021 added `'registered'`; the fifth was never added. Postgres rejected every write with `invalid input value for enum`, so the worker logged "CRITICAL: failed to write evaluation_failed status" and **the submission stayed at whatever status it had before**. Silent stuck state, no surface to user, no retry.

Pattern: when adding a new enum value to a TypeScript constants file, grep for the literal string in `supabase/migrations/` to confirm an `ADD VALUE` exists. Same lesson applies to TypeScript union types that mirror DB enums — the type-checker won't catch this, the live DB will.

How this hid: tests mock the DB layer, so the "write status" call returned success in unit tests. The `evaluation-worker.test.ts` covered LLM-failure code paths but not against a real Postgres. Integration test against a live (or local docker-compose) Supabase would have caught it. Worth adding to TESTING.md.

Recovered with migration 039: one-line `ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'evaluation_failed';`. Idempotent. Applied via `supabase db query --linked --file <path>` (which works in linked-project mode without needing the local timestamp-format migration filenames that `supabase db push` insists on).

## Don't trust an old session's "✅" without re-testing the empirical state (2026-05-07)

`tasks/TASKS.md:833` claimed Q1 of D36 was "✅ YES (2026-05-05 evening)" — that the Gemini-judged loop scored a real submission. Today (2026-05-07) the same loop crashed at the LLM step with "API key expired." Investigation showed:

- 2026-05-05's "fix" only updated Vercel prod env, not `.env.local`. Line 820 even admitted the local was stale.
- Vercel's prod key churned again sometime between 2026-05-05 and 2026-05-07 — so even the remote-only fix was no longer good.

The doc said "green," but green-on-2026-05-05 is not the same as green-now. After two full days, the only real check is: re-run the smoke. The TASKS.md ✅ was load-bearing on assumptions that had decayed.

Pattern: at the start of a session, when a prior entry says "milestone X done," and X involves an external dependency (API key, third-party service, deployed infra), re-run the proof before building on top of it. Don't paper over with "should be fine."

Specific to API keys: rotate-then-verify is two steps. If you rotate, also `curl` the API once with the new key against a known-good endpoint, AND check `.env.local` mirrors prod. The cost of "I rotated, I think it works" is a debugged session like today's.

## `schema_migrations` rows ≠ DDL applied (2026-05-06)

The 2026-05-06 backfill on `supabase_migrations.schema_migrations` inserted rows for migrations 001–027 to make `supabase db push` think those were already applied. But the rows are just bookkeeping — they don't run the SQL. Migration 026's actual DDL (create `notification_preferences`, add `notifications.dismissed_at`, rename `webhook_deliveries` columns, add `task_invitations.company_id`) had never run on the live DB. The PGRST205 from the 2026-05-05 smoke test was the symptom; the deeper damage was that every webhook delivery write had been silently failing for ~3 weeks because code used new column names while the DB still had the old ones.

Pattern: when the *user-facing audit symptom* is one missing object, query for ALL the objects that migration was supposed to create. The bug usually isn't "this one operation failed" — it's "this whole migration was skipped." Spot-check the empirical DB state against the migration file, don't trust `schema_migrations` alone.

How to recover: re-running the migration via `mcp__supabase__execute_sql` works because every migration in this repo uses `IF NOT EXISTS` / `IF EXISTS` / `DO $$ ... EXISTS ... THEN` gates. Idempotent migrations are not just nice-to-have — they're what lets you survive an unreliable apply trail.

## DB DEFAULT silently overrides app-side fallback when the column is NOT NULL (2026-05-06)

Caught while verifying D15 quota wiring. The constants/docs/MCP all say "default 15." Application reads use `task.max_submissions_per_agent ?? TASK_DEFAULT_SUBMISSION_QUOTA` (15). Looks correct. But migration 019 set the column as `NOT NULL DEFAULT 5`. So when a task is created without the field, the DB inserts 5, the column reads back as 5 (not null), and the `?? 15` fallback never fires. Every quota-omitted task got 5, not 15.

Pattern: when an application uses `value ?? FALLBACK` to defend against a missing-or-null DB value, AND the DB column is `NOT NULL` with a different DEFAULT, the fallback is dead code. The DB default wins. Either:
1. Match the DB default to the app constant (single source of truth — what migration 038 does), OR
2. Make the column nullable so the fallback can fire, OR
3. Pass the constant explicitly on insert (not relying on either default).

Option 1 is the cleanest. Worth grepping for `NOT NULL DEFAULT` in migration files alongside `?? CONSTANT_DEFAULT` reads to find more of these.

## Security hardening (2026-04-21, session transcript link: see todo.md)

### When you write a security fix, have the agent that ran the original audit re-audit the fix
My first-pass fixes passed type-check and tests, but the re-audit caught:
- an IPv4-mapped IPv6 bypass I missed because my regex only matched decimal form (Node's URL parser normalises to hex)
- a duplicated symlink-read path in `readLocalOutputAsText` that I didn't realise existed (I'd fixed the sibling function `downloadAgentOutputToDir` but not this one)
- a still-leaking `agentId` in `/api/public/arena` that paralleled the leaderboard routes I did fix
- a documentation-vs-code drift where the rubric-transparency product decision only updated `.md` files, not the code

Pattern: security fixes have more surface area than they look, and "compiles + tests pass" is a weak signal. Always re-run the audit agents with the changes in front of them and a brief of what was claimed to be fixed. This caught 4 real issues in 15 minutes of re-audit time.

### `:ro` on a Unix socket mount is security theatre
`docker-compose.prod.yml` mounting `/var/run/docker.sock:ro` LOOKS like it restricts what the container can do, but `ro` only governs filesystem metadata on the bind. API calls through the socket are still read-write. Worse, on some runtime combinations a `:ro`-tagged socket breaks dockerode's create/pull entirely, trading a theatrical mitigation for real breakage. Document the ceiling, don't decorate it.

### When a product decision flips, grep for the OPPOSITE of the new behaviour
The rubric went from "hidden" to "public" per D10. The `.md` files got the update on master. But when I re-audited I found three code paths still selecting `"name, description, position"` (old behaviour) and one invariant test asserting `not.toContain("weight")` (also old behaviour). The fix: after updating a policy, `grep` the codebase for the OPPOSITE of the new state (`"not.toContain"`, `rubricColumns`, weight-filtering branches) to find the drift.

### Don't use `git add -A` on a branch with scratch dirs
My first commit on this branch swept in `.claude/worktrees/`, `_tmp_csv/`, `tmp_loadtester/`, and `.mcp.json` because `.gitignore` didn't cover them. Had to reset and re-commit with targeted paths. Defaults matter — stage files explicitly unless you've verified `.gitignore`.

### Git config is per-repo — the memory file says so, trust it
I almost added `--author "Jeremy Liu <jeremyliu621@gmail.com>"` out of habit, but memory/`feedback_commit_author.md` explicitly says config is already set per-repo and passing `--author` can override with the wrong email. Plain `git commit -m "..."` attributes correctly on its own. Read memory before acting.

### Tests that mutate `process.env.NODE_ENV` need a widened-view cast
TypeScript marks `process.env.NODE_ENV` as a read-only literal union. Direct assignment (`process.env.NODE_ENV = "production"`) in a test file fails type-check. Cast through `(process.env as Record<string, string | undefined>)` and go through that view. Do the cast once at module top, use `env.NODE_ENV = "..."` throughout.

### ESM namespaces can't be spied on with `vi.spyOn`
`vi.spyOn(await import("node:dns/promises"), "lookup")` fails with "Cannot redefine property: lookup" because ESM namespace exports are non-configurable. Injection at the API boundary (accept the function as a parameter with a default) is cleaner than trying to monkey-patch. Made `validatePublicUrlDynamic` take an optional `lookup` fn for exactly this reason.

### Keep operator-facing and customer-facing error strings separate
Third-pass audit caught two info-leakage channels where the same error message was logged to stderr (fine) AND persisted to a column readable by end users (not fine):
- `safeReadFileSync` error messages containing `/tmp/map-eval-<uuid>` paths landed in `submissions.error_message`, which agents read via `GET /api/submissions/[id]/status`.
- `validatePublicUrlDynamic` reason strings containing resolved IPs (`Hostname X resolved to blocked address 10.1.2.3`) landed in `webhook_deliveries.response_body`, which webhook owners read via RLS.

Pattern: if an error message is going into a DB column that is later returned to a user, redact it OR replace it with a generic customer-facing string. Keep the detailed version in stderr for ops. `src/lib/redact.ts::redactInternalPaths` is the ours; it scrubs `/tmp/*`, our `map-{eval,build}-<uuid>` markers, and Windows temp paths.

### Security audits ≠ dependency audits — run both
Three rounds of code-level security review missed 8 `npm audit` findings including a critical RCE in a transitively-required package (`protobufjs` via `dockerode`) and a null-origin Server Actions CSRF bypass in Next.js. The code-focused agent prompts never hit "run npm audit" as a step. Pattern: budget one audit pass specifically for supply-chain / dependency CVEs, separate from code review. A one-minute `npm audit` can turn up findings that an hour of reading source won't.

### Three code passes + one dep pass is the right dial
Pass 1 (code) caught 13 big findings. Pass 2 (code, same agents) caught 4. Pass 3 (code, narrower scope) caught 2. Pass 4 (deps + fresh surfaces) caught 2 more. Marginal returns drop fast within a category, but category-shifting (code → deps, or code → infra config) can unlock a new batch. Stop when (a) the remaining code findings are theoretical / defense-in-depth, AND (b) there's no unchecked category left.

### Verify agent findings against product intent before fixing
Round 6 agent flagged "role manipulation during onboarding" as a blocker. On inspection it was a false positive against the committed-and-tested Universal Roles product decision (migration 025, `src/app/api/v1/universal-roles.test.ts` is the regression gate, zero role checks in any route handler). If I'd trusted the agent and added a role-enforcement gate, I'd have *introduced* a bug that contradicts shipped product behaviour.

Pattern: when an audit agent says "can Alice impersonate Bob via X", the question to ask first isn't "is X exploitable" — it's "is X actually a permission boundary in this product?" Grep for enforcement, read the adjacent tests, check DECISIONS.md / MEMORY.md. Auth-adjacent fixes are MORE dangerous than missing bugs because they break user flows that may have been deliberately open.

### Zero finds is a scope-miss signal, not an exhaustion signal — confirm with a second empty pass
Updated heuristic after round 7: 13 → 4 → 2 → 2 → 2 → 0 → 1. Pass 6 returned empty, but pass 7 (scoped to the `packages/*` SDK + MCP server that prior passes had never touched) found a real HTTPS-enforcement gap on the customer SDK's baseUrl. One zero-find pass means the CURRENT scope is exhausted, not that the whole codebase is. Rotate to a new unchecked surface and re-run. Call true exhaustion only after TWO consecutive empty passes on distinct scopes — or when you genuinely can't think of a surface you haven't touched.

### Every cross-boundary "enforce at construction" decision is load-bearing
The `packages/agent-sdk` `StrawClient` constructor previously accepted any baseUrl string. That's fine in isolation, but the SDK ships into customer environments (Claude Code, Cursor, OpenCode, custom agents) and runs with the customer's own API key. Any env-var or config-file injection in THOSE environments — which we don't control — could redirect traffic to an attacker. Constructor-time validation is the right layer because it's the first place the value becomes load-bearing; by the time it's used in `fetch()` the auth header is already being composed.

Lesson: when a class or function takes a config value that will carry a secret (auth token, API key, session cookie) to a downstream sink, assume the value is adversarial and validate at the boundary, not at the sink.

---

## Smoke test setup, debugging the eval loop (2026-05-05)

### `vercel env pull` masks sensitive variables to empty — don't conclude "the value is empty"
Pulling a Vercel-managed env (Production, Preview) returns `KEY=""` for any variable Vercel has classified as **Sensitive** (high entropy, looks secret-y, OR explicitly added with `--sensitive`). The variable IS set on the server; you just can't read it back via the CLI. I burned ~30 minutes this session concluding "Vercel REDIS_URL is empty" based on `vercel env pull` output, when it was actually set the whole time.

How to diagnose: `vercel env ls` shows the var as "Encrypted" → it's set and sensitive. The ONLY reliable way to verify the *value* is to redeploy and exercise the code path that uses it, OR overwrite with `vercel env add KEY env --value <new> --force --yes`.

To opt out of sensitive-by-default: add `--no-sensitive` when creating the var. Then it's pullable. Don't do this for credentials; it's only for non-secret config that needs to be auditable.

### BullMQ needs the Redis-protocol URL, not the REST URL
Upstash exposes two endpoints on the same database:
- **REST API**: `UPSTASH_REDIS_REST_URL=https://<db>.upstash.io` + `UPSTASH_REDIS_REST_TOKEN=...`. HTTP+JSON. For serverless/edge code that can't speak Redis protocol.
- **TCP/Redis protocol**: `REDIS_URL=rediss://default:<password>@<db>.upstash.io:6379`. What ioredis (and therefore BullMQ) speaks.

These have **different credentials** (the REST token and the TCP password are not interchangeable, even when they LOOK structurally similar). Always check the user's pasted credential — if it starts with `https://` or `UPSTASH_REDIS_REST_*=`, it's REST and won't work for BullMQ.

In the Upstash console: Connect section → **TCP** tab (not REST tab) → reveal + copy the URL.

### Worker debugging path: dotenv override semantics
`dotenv` defaults to **NOT overriding** existing process env. So when debugging "wrong REDIS_URL," the order matters: `REDIS_URL=<prod_value> npm run eval-worker` overrides whatever's in `.env.local`. Don't edit `.env.local` for one-off debugging — use the inline override.

If `.env.local` REDIS_URL is `redis://localhost:6379` (stale dev value) and you want to test against prod, just inline. Don't touch the file. The worker reads dotenv first, then sees your shell-set REDIS_URL via `process.env.REDIS_URL` (because dotenv didn't override).

### "Missing required env vars" is misleading when only one is missing
`evaluation-worker.ts:105` checks `if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY)` and prints "Missing required env vars" — without saying *which*. When debugging, write a small script that loads dotenv and prints each var's status (length, prefix). `scripts/check-env.ts` is committed for exactly this. Use it before guessing.

### Phase 18 ran fully-local — the prod stack has separate gaps
Phase 18 (2026-04-15) proved the loop with `docker-compose redis` + `npm run dev` + worker + submit-tiers, all on one machine. It did NOT exercise the Vercel-deployed web app or the real Upstash queue. Don't conflate "Phase 18 passed" with "prod works." They're separate paths, separate failure modes, separate test budgets.

### Vercel env changes only apply to NEW deployments — `vercel env add` doesn't update the running prod
Confirmed 2026-05-06 when Dog's submission sat with `evaluated:false`. Cause: I'd updated `REDIS_URL` on Vercel via `vercel env add` the previous session, but the running prod web app was 2 days old (predating my env change). Web app enqueued to whatever REDIS_URL it was deployed with — different from the Upstash my eval-worker was draining. Result: submission accepted, status flipped to `completed`, but the job landed in a queue we couldn't reach.

Fix: `vercel deploy --prod --yes` after any env-var change that the web app depends on. Don't assume env changes propagate to running deployments. They don't — only to new builds.

Diagnostic: `vercel ls` shows the age of the latest Production deployment. If it's older than your last env edit, redeploy.

### The Gemini API key can fail with 403 "project denied" without warning
Sometime between 2026-04-15 (Phase 18) and 2026-05-05 (this session), `GOOGLE_GEMINI_API_KEY` started returning `403 Forbidden — Your project has been denied access. Please contact support.` This isn't a quota error or a rate-limit — it's a project-level lockout. Causes: billing failure, project deletion, key revocation, account suspension. There's no monitoring on this — the worker quietly retries 3× and marks `evaluation_failed`. Worth a future hook: if N consecutive evaluation_failed all due to LLM 403/401, ping someone.
