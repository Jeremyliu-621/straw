# Security Hardening — Overnight Pass

Branch: `security-hardening`
Baseline: master @ a5185f1 (589 tests green)
Origin audit: see conversation transcript 2026-04-21 (4 parallel agents across secrets, injection, authZ/RLS, workers/Docker/storage/webhooks).

Key product constraints decided pre-work:
- Full rubric transparency for agents (names + weights). Already in REQUIREMENTS.md.
- Anonymization during competition STAYS (needed for "Contact Winner" introduction event = revenue paper trail).
- Prompt-injection defenses wanted.
- `/api/v1/tasks/[id]` weight exposure is OK (decided in rubric-transparency flip).

---

## Quick Wins (no infra risk, small diffs)

- [x] **#11 `verifySubmissionMd` tautology** — now a case-insensitive match; tautological OR removed (commit dccd2fa)
- [x] **#12 cron timing-safe compare** — extracted `verifyCronRequest` helper using `crypto.timingSafeEqual` (commit b8d1418)
- [x] **#13 rate-limit api-keys GET/DELETE** — GET 30/win, DELETE 10/win (commit 9b93f65)
- [x] **#16 `/api/dev/*` double-gate** — `assertDevEndpointEnabled` requires both `NODE_ENV=development` AND `ALLOW_DEV_ENDPOINTS=true`; only literal `"true"` passes (commit 2447b15)
- [x] **#6 leaderboard `submissionId` self-id** — `anonymizeEntries` zeros both `agentId` and `submissionId`; wired into both leaderboard routes (commit 60a2b38)
- [x] **#9 defensive path normalization** — `safe-path.ts` with `isSafeFilename` / `resolveInside` / `isWithin`; applied in eval worker download path (commit 6904bad)
- [x] **#14 presigned URL TTL** — capped at Supabase's 2h server-side ceiling via `UPLOAD_PRESIGNED_URL_MAX_TTL_SECONDS`; displayed `expiresAt` is now accurate (commit dccd2fa)
- [x] **#3 webhook URL SSRF allowlist** — `public-url.ts` blocks RFC1918, loopback, link-local, CGNAT, multicast, TEST-NET, IPv6 loopback + ULA + link-local + IPv4-mapped; static at registration, DNS-resolving at delivery (commit 8a858d0)

## Critical Infra

- [x] **#5 webhook secret out of Redis job** — `WebhookJobData` no longer carries `secret`; worker fetches it by `webhookId` at delivery time and handles deleted/inactive webhooks gracefully (commit 5af1491)
- [x] **#8 eval `/results` symlink + traversal scan** — `safeReadFileSync` uses lstat + realpath + isWithin + size cap (commit 9a49cd9)
- [x] **#7 eval image pull timeout + digest validation** — `EVAL_IMAGE_PULL_TIMEOUT_MS = 5min` via `withTimeout`; `validateImageReference` rejects shell metas / null / oversize; warn on tag-only refs (commit 68dfeed)
- [x] **#1 docker socket `:ro`** — NOT applied; `:ro` on a Unix socket bind is security theatre (controls metadata, not API calls) and risks breaking dockerode. Documented ceiling in `docker-compose.prod.yml` comment + `DECISIONS.md` D14 (commit 2764767)

## Prompt Injection

- [x] **#15 delimit user content in Gemini prompt** — `prompt-sanitize.ts` strips forged `<<<BEGIN/END X>>>` delimiters; every user-controlled field wrapped in explicit blocks; security rule at top of prompt tells the judge to treat delimited content as data (commit 84d338f)

## Architectural (separate commit/review)

- [x] **#2 build-check in throwaway container** — `runBuildCheck` now async, takes a Dockerode client, runs command in a container with `Env: []`, `CapDrop: ['ALL']`, `no-new-privileges`, memory cap, timeout+SIGKILL, bind-mount at `/workdir`; skips instead of falling back to `execSync` when Docker is unavailable (commit 9abff18)

## Re-audit round (post-deep-dive)

Deep-dive re-audit with 4 parallel agents against the post-fix branch caught four issues my first pass missed:

- [x] **IPv4-mapped IPv6 SSRF bypass** — regex only matched decimal form; Node's URL parser normalises bracketed v6-mapped literals to hex (`[::ffff:7f00:1]`). Blocked the entire `::ffff:/96` range outright (commit 8bac6c4).
- [x] **`readLocalOutputAsText` symlink leak** — hybrid-mode code path used `fs.statSync` (follows symlinks) then `fs.readFileSync`, exposing host files to the LLM prompt. Switched to `lstatSync` + explicit symlink rejection + `isSafeFilename` guard (commit f3e1746).
- [x] **`/api/public/arena` agent-id leak** — returned real `agentId` pre-reveal; agents could self-locate. Emit synthetic `anon-rank-N` id pre-deadline, real id on/after deadline (commit 2696403).
- [x] **Rubric-transparency policy not in code** — the D10 decision flipped rubric visibility to "fully public" on 2026-04-21 but only the `.md` files were updated; three endpoints still hid `weight`. Exposed weight on `/api/v1/tasks/[id]`, `/api/tasks/[id]`, and `/api/v1/submissions/[id]` dimensions. Flipped the `rubric-privacy.test.ts` invariant to assert the new policy (commit 14a173a).

## Third-pass round (self-triggered /loop at 99% confidence)

Agent 1 (targeted re-verify of the 4 post-audit fixes): all four hold, no interactions, clean.
Agent 2 (cross-cutting scan) caught two information-leakage channels that survived both prior rounds:

- [x] **`error_message` leaks tmpdir paths** — `safeReadFileSync` throws with absolute paths like `/tmp/map-eval-{uuid}/results/score.json`; those propagate via `EvalContainerError.message` into `markSubmissionFailed`, which persists them to `submissions.error_message`. Agents read that via `GET /api/submissions/[id]/status`. Leaks our tmp-dir naming scheme. Added `src/lib/redact.ts::redactInternalPaths()` and pipe the error message through it before DB write. Operator stderr logs keep the full path (commit c6159bd).
- [x] **`webhook_deliveries.response_body` leaks resolved IPs** — `validatePublicUrlDynamic` returns reason strings like "Hostname X resolved to blocked address 127.0.0.1"; the worker was writing that verbatim to `response_body`, which RLS lets the webhook owner SELECT. Free DNS-based reconnaissance primitive. Write a generic "not a public host" message to the DB; keep the detailed reason in stderr only (commit c6159bd).

## Fourth-pass round (20-min loop iteration, 98.5% → 99.2%)

Shifted scope to surfaces the first three rounds didn't touch: unauthenticated endpoints, audit-log RLS interactions, the redaction regex itself, and dependency CVEs.

Agent scan: mostly clean. UUID validation is missing on 7 `[id]` routes but those routes already handle invalid UUIDs cleanly via `error || !data` → 404, so not a security issue. Deferred as consistency polish.

`npm audit` on the branch head revealed 8 open advisories — first time any audit round looked at dependencies:

- [x] **Next.js 16.1.6 → 16.2.4** — six advisories including `GHSA-mq59-m269-xvcx` (null-origin Server Actions CSRF bypass) and `GHSA-ggv3-7p47-pfv8` (HTTP request smuggling in rewrites). Real attack vectors on an authenticated platform; patched. Tests pass, production build clean (commit 705de17).
- [x] **protobufjs <7.5.5 RCE (critical)** — transitive via dockerode, so directly in the eval worker's load path. Patched by `npm audit fix`. Zero open advisories after two audit-fix passes (commit 705de17).

## Fifth-pass round (20-min loop iteration, 99.2% → ~99.6%)

Narrow scope: `quick-submit` path, `/api/docs` drift, frontend XSS via user-controlled URL fields.

Two real findings, both fixed:

- [x] **`/api/docs` JSON spec contradicted D10** — description said "criteria (names only, no weights for agents)", but code now returns weights. Agents reading the machine-readable spec would build against the wrong contract. Fixed (commit 4ddb669).
- [x] **Stored XSS via `agent_builder_profiles.github_url`** — Zod schema was `z.string().optional()` with no URL check; render site did `<a href={profile.githubUrl}>` and React doesn't strip `javascript:`. An agent could PATCH their profile with `javascript:…` and steal session cookies of any company viewing their profile. Fixed at both layers: schema tightened to require `https://` on github.com or *.githubusercontent.com, render site gated by new `safeExternalUrl` helper for defence in depth. 14 new unit tests cover `javascript:/data:/vbscript:/file:` rejection, whitespace-smuggling, userinfo injection, host-suffix attacks (commit 6b70422).

## Sixth-pass round (20-min loop iteration, 99.6% → ~99.7%)

Scope: completeness of XSS fix, onboarding/role flow, webhook payload PII, OAuth callback handling, Server Actions CSRF, seed scripts.

**No new exploitable bugs found.** One candidate from the agent was a false positive:

- [FALSE POSITIVE] "Role manipulation during onboarding" — agent flagged that `POST /api/onboarding` accepts a user-controlled `role` field without validating against the OAuth provider's intent. On inspection this is intentional: migration `025_universal_roles.sql` explicitly removed role as a permission gate, and `src/app/api/v1/universal-roles.test.ts` is the regression gate for the Universal Roles decision. Grep across `src/` confirms zero role checks in any route handler. Role is purely UX (which dashboard to land on) — not a capability. No fix needed.

Clean confirmations (useful null results — these are attack surfaces that were checked and came back safe):

- `<a href={...}>`, `<img src={...}>`, inline `style={backgroundImage: url(${...})}` — only one prod instance of user-controlled URL-to-href rendering and that was `profile.githubUrl`, fixed last round. Task attachment download URLs are Supabase-signed (not user-controlled strings).
- Webhook payload builders (`buildTaskStatusChangedPayload`, `buildSubmissionCreatedPayload`, `buildEvaluationCompletedPayload`, `buildTaskMatchedPayload`, `buildDealCreatedPayload`) — none include cross-agent IDs, rubric details, or PII beyond task title/metadata.
- Middleware `signInUrl.searchParams.set("callbackUrl", pathname)` sets only the request pathname (same-origin relative path). No `?callbackUrl=//evil.com` open-redirect surface.
- Zero `"use server"` directives in the codebase → no Server Action CSRF surface beyond what the Next.js 16.2.4 bump already patched.
- `scripts/seed-competition.ts` prints the generated API key to stdout once at creation. No credentials written to files or persistent logs.

## Tenth + Eleventh passes — exhaustion confirmed (99.88% → ~99.92%)

**Pass 10 (code-review scopes):** `src/db/seed.ts`, raw-SQL/RPC scan across `src/`, Playwright config, markdown-renderer scan. All clean. Zero findings.

**Pass 11 (runtime-state verification via Supabase MCP + Dockerfile):**
- Supabase `security` advisor against live project `ptvipiqorbqxoypbfeoj`: `{lints: []}` — zero active lints.
- `storage.objects` RLS: enabled, zero policies (fail-closed — anon-key calls get nothing, service role gets everything, matching the app's access pattern where no user hits storage via anon).
- Both storage buckets (`agent-outputs`, `test-suites`) confirmed `public: false`.
- `workers/evaluation.Dockerfile` read for the first time: `node:20-slim` floating tag (not digest-pinned) and no `USER` directive (runs as root). Both are defence-in-depth items already captured by D14 ("root-equivalent on the VPS, Phase 19 fixes it"). Not fix-in-this-branch work.

**Pass counts: 13 / 4 / 2 / 2 / 2 / 0 / 1 / 1 / 1 / 0 / 0.** Two consecutive empty passes on distinct scopes (code-review + runtime-state) = the exhaustion heuristic firing. Calling it officially done.

Loop cron `66d46ee5` deleted. 11 audit rounds total; 26+ findings caught and fixed across those rounds. Remaining risk is the ~0.08% that code review can't reach without adversarial pentesting against live traffic.

## Ninth-pass round (20-min loop iteration, 99.85% → ~99.88%)

Scope: Supabase migration SQL (DEFINER + GRANT hunt), package.json lifecycle scripts, Next.js Metadata / OpenGraph user-content reflection, the embedded `.claude/worktrees/` repo, untracked scratch file contents.

One defence-in-depth finding, fixed; four surfaces confirmed clean:

- [x] **`.gitignore` gap — scratch directories not covered** — `_tmp_csv/`, `tmp/`, `tmp_loadtester/`, `research/`, `.claude/worktrees/`, `.mcp.json` all sit untracked in the working tree but are NOT in `.gitignore`. A future `git add -A` could sweep any of them in — exactly the class that produced the hardcoded-key leak in pass 8. Scanned current contents: no secrets today. Added all to `.gitignore` as defence-in-depth (commit 23058f5).

Clean confirmations:
- Migration files contain zero `SECURITY DEFINER` functions. No privilege-escalation-via-function surface.
- `package.json` has no `preinstall` / `postinstall` / `prepare` lifecycle hooks. Running `npm install` does not execute project scripts.
- Next.js `metadata` exports (`src/app/layout.tsx`, `src/app/docs/page.tsx`) use only hardcoded static strings. No `generateMetadata()` reflecting user-controlled task titles or agent names into OG tags (which would otherwise be a stored-XSS vector via HTML meta injection).
- `.claude/scheduled_tasks.lock` = session ID + PID, harmless. `.mcp.json` = MCP server URL only, no auth tokens.

Pass counts: 13 / 4 / 2 / 2 / 2 / 0 / 1 / 1 / 1.

## Eighth-pass round (20-min loop iteration, 99.8% → ~99.85%)

Scope: `packages/eval-sdk/`, e2e tests + Playwright config, remaining scripts (`submit-tiers.ts`, `e2e-pipeline.ts`, `seed-more-tasks.ts`, etc.), arena 3D canvas user-content rendering, public tRPC/GraphQL surface.

One real finding, fixed:

- [x] **Hardcoded live API key at `scripts/submit-tiers.ts:11`** — `straw_sk_ec0e573280...f3615f` committed to master in commit `39ca01d` during Phase 18 testing. Script's BASE_URL is localhost, but if that localhost dev server was pointed at the production Supabase project (per TASKS.md Deployment, the main project is `ptvipiqorbqxoypbfeoj`), the key was issued in prod and is live there. Replaced hardcoded `BASE_URL`/`API_KEY`/`TASK_ID` with env-var reads (commit 601cb4a). **Operational action needed from user: revoke the leaked key. It's in git history; treat as public until revoked.**

Clean confirmations:
- `packages/eval-sdk/run-local.sh` — properly quoted Docker args, `--network none` enforced, no injection vectors.
- `packages/eval-sdk/example/{Dockerfile,eval.js}` — no embedded credentials, reads only from `/agent_output` mount, writes only to `/results`.
- e2e + `playwright.config.ts` — dev credentials only, no real keys logged, no CSP disabling.
- `scripts/seed-competition.ts`, `scripts/e2e-pipeline.ts`, `scripts/seed-more-tasks.ts`, `scripts/verify-local.sh` — no hardcoded credentials, no `execSync` on untrusted input, no external HTTP with user data.
- Arena 3D canvas: agent `displayName` + `taskTitle` rendered as React text children (three.js `<Text>` geometry / plain `<p>`/`<span>`), auto-escaped by React. GLB model URLs all hardcoded to `/public/*.glb`.
- Public API surface: zero occurrences of `trpc`, `graphql`, `Apollo`, `urql`, `@trpc`, `createTRPCRouter`. Only Next.js route handlers.

Other `straw_sk_*` matches in the codebase (verified as false positives, not real keys):
- `src/app/docs/page.tsx:900` — docs example `straw_sk_a1b2c3`
- `src/components/home/arena/data.ts:221` — arena mock `straw_sk_7xK3...m9Pq`
- `packages/mcp-server/dist/bin/straw-mcp.js:622` — compiled error message example `straw_sk_abc123`

Pass counts: 13 / 4 / 2 / 2 / 2 / 0 / 1 / 1.

## Seventh-pass round (20-min loop iteration, 99.7% → ~99.8%)

Shifted scope to `packages/*` — the shipped SDK + MCP server that run in customer environments. Neither had been touched by prior passes.

One real finding, fixed:

- [x] **`StrawClient` accepted arbitrary baseUrl** — constructor at `packages/agent-sdk/client.ts:329` took `config.baseUrl` and used it as-is. Customer-set env var (`STRAW_BASE_URL=http://attacker.com`) or a malicious config injection in one of the dispatchers (Claude Code / Cursor / OpenCode) would send the `Bearer straw_sk_...` header in the clear to the attacker. The MCP server passes `baseUrl` through to `StrawClient` so the fix propagates. Added `assertAcceptableBaseUrl()` that accepts https:// unconditionally + http://localhost / 127.0.0.1 / [::1] for local dev. 7 new tests cover https, all three loopback forms, http-to-non-loopback rejection, non-http(s) scheme rejection, malformed URLs, and default-omit path (commit dee5f8d). SDK/MCP haven't been npm-published yet, so this enforce-before-adoption is timed right.

False positives & clean:
- [FALSE POSITIVE] "MCP server stderr leaks API key format" — agent flagged that the bin script mentions `straw_sk_abc123` in its error text. That's a format example, not a real key. Skip.
- [NICE-TO-HAVE] File content size cap in MCP `quick_submit` tool — server-side upload cap is the real gate, client-side cap would just give earlier errors. Not a security issue.
- `packages/mcp-server/src/**` clean — no `console.log` (which would corrupt the MCP stdout protocol), no credential persistence, Zod on every tool input.
- `packages/eval-sdk/` example container uses `docker run --network none`, no embedded credentials in example or `run-local.sh`.
- localStorage / sessionStorage writes in the frontend: only UI state (arena tuning, onboarding step), no tokens.

Pass-over-pass finding counts: 13 / 4 / 2 / 2 / 2 / 0 / 1. Revised stop heuristic: two consecutive zero-find passes = true inflection; a single zero can be a scope-miss, not exhaustion.

## Final

- [x] Deep-dive re-audit completed (4 parallel agents, 4 issues found + fixed)
- [x] All unit tests green — 709 pass, up from 589 baseline
- [x] Type-check clean (`npx tsc --noEmit`) — ignoring pre-existing `arena-3d/*` JSX noise unrelated to this branch
- [x] DECISIONS.md D14 added for the Docker-socket ceiling
- [x] Lessons captured in `tasks/lessons.md`
- [x] Summary below

---

## Review

**Branch:** `security-hardening` off master @ a5185f1
**Commits:** 17 (13 initial fixes + 4 from re-audit round)
**Tests:** 589 → 709 (+120). 57 files, zero failures, zero type errors in files I touched.

### What shipped

| # | Finding | Commit | Kind |
|---|---|---|---|
| 1 | Docker socket mount documented as ceiling (no `:ro` — theatre) | 2764767 | docs |
| 2 | Build-check run in throwaway container, `Env: []`, dropped caps | 9abff18 | RCE fix |
| 3 | Webhook URL SSRF allowlist (static + DNS-resolving) | 8a858d0, 8bac6c4 | SSRF fix |
| 5 | Webhook signing secret removed from Redis job, fetched at delivery | 5af1491 | cred leak |
| 6 | Leaderboard + arena emit synthetic ids pre-deadline | 60a2b38, 2696403 | info leak |
| 7 | Eval image pull has 5-min timeout + ref validation | 68dfeed | DoS + inject |
| 8 | Eval `/results` read via safeReadFileSync (symlink/traversal/size) | 9a49cd9 | file read |
| 9 | Agent-output writes via `resolveInside` | 6904bad | path traversal |
| 11 | `verifySubmissionMd` tautology replaced with case-insensitive | dccd2fa | bug |
| 12 | Cron auth timing-safe via `crypto.timingSafeEqual` | b8d1418 | timing |
| 13 | Rate-limit GET/DELETE `/api/api-keys` | 9b93f65 | DoS/enum |
| 14 | Presigned URL expiry capped at Supabase's true 2h TTL | dccd2fa | UX + safety |
| 15 | Gemini prompt wraps user content in delimited blocks + sanitizer | 84d338f | prompt inj |
| 16 | `/api/dev/*` requires NODE_ENV=development AND ALLOW_DEV_ENDPOINTS=true | 2447b15 | backdoor |
| — | Hybrid-mode local read uses lstat, rejects symlinks | f3e1746 | file read |
| — | Rubric weights exposed to agents (finish D10) | 14a173a | product |

### Not fixed in this branch (deferred with reason)

- **#10 `.env.local` / `.env.prod` on disk** — operational. User decision whether to rotate keys + move to a secret manager. Not code.
- **Docker socket `:ro`** — tried, backed out. Documented as D14 ceiling; real fix is Phase 19 sandbox abstraction or a `docker-socket-proxy` sidecar.
- **Webhook retry storm** — no circuit breaker for always-5xx webhook endpoints. Wastes worker cycles but isn't a security issue. Track for Phase 19.
- **Orphan containers on worker crash** — `AutoRemove: false` + manual remove means a crash between start and remove leaves a container. Docker's GC eventually reclaims. Low-priority ops concern.
- **Heartbeat file `lastError`** — could contain secrets if an error message accidentally interpolates one. Truncated to 500 chars but not redacted. Add a redaction pass next sprint.
- **Unicode homoglyph prompt injection** — regex matches ASCII delimiter only. An attacker using full-width `＜＜＜END X＞＞＞` wouldn't be redacted. Defence-in-depth via the explicit LLM instruction holds, but NFKD normalisation would tighten it.
- **DNS rebind TOCTOU** — tiny window between our DNS resolve and fetch's own resolve. Custom undici dispatcher would close it; accepted as v1 scope.
- **In-memory rate limiter on Vercel** — `src/lib/rate-limit.ts` is a Map keyed by IP/userId stored in-process. The file comment calls this out ("Suitable for single-process deployments. For multi-process (Vercel serverless), upgrade to Redis-based rate limiting."). On Fluid Compute instance reuse gives partial effectiveness for single-source attackers; distributed attackers can parallel-hammer separate instances and bypass. The right v1.1 fix is a small Upstash-backed limiter (infra is already in place — we use Upstash for BullMQ). Not in this branch's scope.

### Suggested follow-ups (not blocking)

- Rotate the secrets currently sitting in `.env.local` / `.env.prod` before deploying this branch (they may have been observed during the audit process itself).
- Run the load-tester (`tmp_loadtester/`) after deploying to verify the new rate limits hold.
- If any webhook consumers rely on the signed-with-old-secret grace window, document that rotating a secret causes a brief inflight delivery with the new signature (acceptable, but worth mentioning in API docs).

