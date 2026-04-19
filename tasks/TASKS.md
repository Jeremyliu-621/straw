# TASKS.md

## How to Use This File

Read this at the start of every session. Update it at the end of every session.

- Mark completed tasks `[x]`
- Write a one-line note under completed tasks explaining decisions made
- Add discovered tasks to the Discovered Tasks section
- Move `<!-- RESUME HERE -->` to the next incomplete task

If the next Claude instance can't pick up cleanly, you didn't update this well enough.

---

## Build Principles

- Schema and RLS mistakes compound. Get them right before building anything on top of them.
- The evaluation pipeline is the most important thing you will build. Prioritize correctness over speed.
- Tests are not optional. A task is not done until it has tests.
- Workers are separate Node.js processes. Plan their architecture before writing any code.
- Read UI_RULES.md before touching any frontend.

---

## Phase 0: Project Scaffold

Goal: a running Next.js project with all dependencies installed, tooling configured, and a placeholder home page. Nothing fancy — just a clean foundation.

- [x] Initialize Next.js 15 with TypeScript strict mode
- [x] Configure Tailwind CSS v4
- [x] Install all dependencies (Supabase, NextAuth, BullMQ, Redis, dockerode, Anthropic SDK, Zod, Lucide)
- [x] Install dev dependencies (Vitest, Playwright, Prettier, ESLint, tsx)
- [x] Configure path alias `@/` → `src/`
- [x] Create `src/lib/env.ts` — validate all env vars at startup with Zod, fail loudly if missing
- [x] Create `src/constants.ts` — all magic values live here
- [x] Configure Vitest
- [x] Configure Playwright
- [x] Configure ESLint + Prettier
- [x] Create `docker-compose.yml` for local Postgres + Redis
- [x] Create `.env.example` with all required variables documented
- [x] Replace default Next.js page with a minimal Map placeholder
- [x] Add npm scripts for `worker`, `eval-worker`, and `seed`
- [x] Write README with setup instructions
- [x] Verify: `npm run dev` shows Map placeholder
- [x] Verify: `npm run test` passes
- [x] Verify: `docker-compose up -d` starts cleanly

> Used create-next-app in temp dir, copied back. Geist font loaded via next/font. All env vars validated with Zod in env.ts, skipped in test env.

---

## Phase 1: Database Schema

Goal: a complete, correct schema with RLS that can be trusted as a foundation. Think carefully before writing SQL — schema changes are expensive later.

- [x] Plan the full schema before writing any migration
- [x] Write initial schema migration — all tables, foreign keys, check constraints, indexes
- [x] Write RLS migration — RLS enabled on every table
- [x] Add a DB-level constraint enforcing evaluation_results immutability (no updates)
- [x] Write TypeScript types matching the schema exactly (`src/types/database.ts`)
- [x] Build a typed repository layer (`src/db/`)
- [x] Write a seed script
- [x] Unit tests for repository functions (mock the Supabase client)
- [x] Verify: migrations apply cleanly to a fresh local Postgres

> 10 tables designed with full plan as SQL comment block. Immutability enforced via trigger. RLS policies ensure companies can't see other companies' rubrics, agents can't see other agents' submissions.

---

## Phase 2: Authentication + Onboarding

- [x] Configure NextAuth — GitHub (agent_builder), Google (company), dev credentials
- [x] Sync authenticated users to Supabase `users` table on first login
- [x] Extend session with Supabase user ID and role
- [x] Write middleware protecting all authenticated routes with role enforcement
- [x] Styled sign-in page
- [x] Onboarding flow for companies
- [x] Onboarding flow for agent builders
- [x] Role-based dashboard shell (layout + nav)
- [x] Unit tests: middleware logic, role assignment, session shape
- [ ] E2E test: full signup → onboarding → dashboard for both roles

> NextAuth v5 beta with JWT strategy. Provider type imported from @auth/core/providers. Module augmentation on @auth/core/jwt.

---

## Phase 3: Task Posting

- [x] Multi-step task creation form
- [x] Rubric builder — dynamic criteria + weights, live weight total, inline validation
- [x] Test suite upload to Supabase Storage
- [x] Task posting API route with full validation
- [x] Task status state machine — enforce valid transitions in a service layer
- [x] Company dashboard — task list with status, deadline, agent count
- [x] Task detail page — metadata + leaderboard placeholder + countdown
- [x] Unit tests: validation, state machine, rubric weight logic
- [ ] E2E test: full task posting flow

> Rubric builder validates weight sum inline (not toast). State machine: draft → open → evaluating → closed with no backward transitions.

---

## Phase 4: Agent Registration + Task Matching

- [x] Agent profile page
- [ ] Docker image validation on save
- [x] Task matching logic — match agents to tasks by category
- [ ] Task notification on post
- [x] Agent task feed — open tasks the agent is eligible for
- [x] Competition detail page
- [x] Enter competition action
- [x] Unit tests: matching logic
- [ ] E2E test: agent sees task, enters competition

> Category-based matching with case-insensitive comparison. Empty categories match all tasks.

---

## Phase 5: Execution Engine

- [x] Design the execution worker architecture
- [x] BullMQ execution queue
- [x] Execution worker — pull image, run container, capture output
- [x] Handle all failure modes explicitly
- [x] Submission status API (for polling)
- [x] Write a minimal test Docker image
- [x] Unit tests: worker logic with mocked dockerode
- [ ] Integration test: run test image through full pipeline

> Workers use BullMQ connection URL format. Removed standalone ioredis to avoid type conflicts with BullMQ's bundled version. Docker runs with --network none, 512MB memory, 1 CPU, 5min timeout.

---

## Phase 6: Evaluation Pipeline

- [x] Design the evaluation worker architecture
- [x] BullMQ evaluation queue
- [x] Phase 1: automated testing
- [x] Phase 2: LLM judge
- [x] Write the Claude evaluation prompt
- [x] Zod-validate Claude's response. Retry once on failure. Flag for manual review.
- [x] Phase 3: final score — weighted combination, write immutable result
- [x] Handle all edge cases
- [x] Unit tests: score calculation, prompt construction, response parsing
- [ ] Integration tests: known-good output → high score, empty output → zero score

> Evaluation worker uses claude-sonnet-4-6 with structured output schema. LLM response Zod-validated, retry once, flag for manual review on second failure. Scores immutable once written.

---

## Phase 7: Arena Leaderboard

- [x] Leaderboard service — sort, anonymize, reveal logic
- [x] Leaderboard API route (`/api/tasks/[id]/leaderboard`)
- [x] Leaderboard component — live polling, score bars, row transitions
- [x] Agent anonymization until deadline
- [x] Deadline countdown — live timer
- [x] Task close service — deadline-based transition logic
- [x] Task close API route
- [x] Unit tests: anonymization, sort order, tie-breaking
- [ ] E2E test: two agents submit, leaderboard updates, deadline fires

> Used polling (3s interval) instead of Supabase Realtime for simplicity. Leaderboard rows use 300ms ease transition per UI_RULES.md. Identity reveal is controlled by shouldRevealIdentities(deadline).

---

## Phase 8: Results + Acquisition Flow

- [x] Post-close results page — full leaderboard, winner featured, dimension breakdown, LLM reasoning
- [x] Platform inbox — threaded messaging between company and agent builder
- [x] Contact winner action — sends message via API
- [x] Deal completion flow — company records deal type and value, success fee calculated
- [x] Deals API with validation (task must be closed, agent must have submission)
- [x] Submission details API for evaluation dimensions
- [x] Results service — fee calculation, thread ID generation, score formatting
- [x] Unit tests: fee calculation, thread ID determinism, formatting
- [ ] E2E test: task closes → company contacts winner → marks deal complete

> Thread IDs are deterministic (sorted user IDs + task ID). Deals enforce one per task. Success fee calculated from PLATFORM_SUCCESS_FEE_PERCENT constant.

---

## Phase 9: Reputation + Public Profiles

- [x] Public agent builder profile page
- [x] Reputation stats: win rate, average score, tasks entered, tasks won
- [x] Competition history table
- [x] Category specializations derived from wins
- [x] Agent profile API with computed stats
- [x] Reputation service with win rate, average score, category derivation
- [x] Unit tests: reputation calculation, category derivation
- [ ] Agent browsing for companies (sorted by reputation)

> Stats computed on read, not denormalized. Categories sorted by wins then entries.

---

## Phase 10: Landing Page + Marketing Site

- [x] Landing page — hero (dark), how it works (3 steps), why it's different (2 columns), pricing, footer
- [ ] Pricing page (pricing is on landing page for now)
- [x] Styled auth pages (already done in Phase 2)
- [x] 404 and 500 error pages

> Landing page follows UI_RULES.md exactly: dark hero, no icons in steps, real numbers in the comparison, pricing using actual constants. No purple. No gradients. No stock photos.

---

## Phase 11: Pipeline Fix + End-to-End Demo

Goal: The execution → evaluation pipeline actually works end-to-end. One real submission goes through the full path: submit → execute → evaluate → score on leaderboard.

- [x] Fix execution worker → evaluation handoff: after successful run, enqueue eval job via BullMQ evaluation queue
- [x] Upload agent output to Supabase Storage instead of file:// URL. agent-outputs bucket, submissions/{id}/ paths.
- [x] Fix evaluation worker to actually fetch and read agent output before building the LLM prompt
- [x] Implement automated test runner — JSON test suite format with exact/contains/regex matching
- [x] Build test Docker images (4: good-agent, okay-agent, sloppy-agent, crash-agent) in test-agents/
- [x] Submission status polling API — GET /api/submissions/[id]/status (includes evaluated flag + final_score)
- [x] Wire POST /api/submissions to enqueue execution job via BullMQ (was a TODO)
- [ ] Run one real end-to-end submission locally: post task → submit agent → execute → evaluate → score appears on leaderboard

> Gemini (gemini-2.0-flash) is the intended LLM judge — this is correct, not a discrepancy.

---

## Phase 11.5: Competition Entry Refactor

Goal: Replace the broken "one Docker image per profile" model with a per-submission entry flow supporting both API endpoints and Docker images. This is a product-critical change — the current flow makes the platform unusable for builders with multiple agents. See DECISIONS.md for full rationale on every choice below.

### 11.5a: Database Migration — Submission Mode Support

- [x] Write migration `004_submission_mode.sql` (004 not 002 — existing migrations go up to 003)
- [x] Update TypeScript types in `src/types/database.ts`
- [x] Add `SUBMISSION_MODE` constant and `SubmissionMode` type to `src/constants.ts`
- [ ] Verify migration applies cleanly to local Postgres

> Used z.union with two literal-mode schemas instead of discriminated union (Zod v4 doesn't support discriminatedUnion). CHECK constraint enforces mode/config consistency at the DB level.

### 11.5b: Submission API Refactor

- [x] Update `createSubmissionSchema` with Zod union for docker/api modes
- [x] Remove profile docker_image lookup from POST handler
- [x] Update submission INSERT to use request body fields
- [x] Update execution job enqueue to pass mode + correct image/endpoint
- [x] Update `ExecutionJobData` in `src/lib/queue.ts`
- [x] Unit tests: validate both modes, reject mismatched mode/config

### 11.5c: Competition Entry Page

- [x] Create page at `src/app/tasks/[id]/enter/page.tsx` with tab toggle (API/Docker), task summary, form fields
- [x] Update `src/app/tasks/[id]/page.tsx`: button → Link, removed enterCompetition() and entering state
- [x] Style matches existing task detail page patterns

### 11.5d: Execution Worker — API Mode Handler

- [x] Refactored worker to route on `job.data.mode` (docker/api)
- [x] Implemented `executeApiSubmission()` — POST to endpoint, 5min timeout via AbortController, 50MB cap, no redirects
- [x] Docker path extracted to `executeDockerSubmission()` — logic unchanged
- [x] Both paths converge at storage upload → evaluation enqueue
- [x] Unit tests: mock fetch, test success/timeout/error/oversized responses

### 11.5e: Profile Cleanup

- [x] Write migration `005_remove_profile_docker_image.sql`
- [x] Updated `AgentBuilderProfile` and `AgentBuilderProfileInsert` types
- [x] Removed Docker image from profile page and profile API schema
- [x] Updated all references: `src/db/users.ts`, `src/db/seed.ts`, `src/db/submissions.test.ts`, `src/app/api/dev/pipeline-test/route.ts`

> All 166 existing tests pass. Zero type errors in src/.

### 11.5f: Update Downstream References

Ensure everything that reads submissions handles both modes correctly.

- [x] Leaderboard component (`src/components/leaderboard.tsx`): display `agent_display_name` if present, fall back to anonymized name
- [x] Leaderboard API (`src/app/api/tasks/[id]/leaderboard/route.ts`): include `mode` and `agent_display_name` in response
- [x] Submission status API (`src/app/api/submissions/[id]/status/route.ts`): include `mode` in response
- [x] Results page (`src/app/tasks/[id]/results/page.tsx`): show submission mode badge (API / Docker) next to each entry
- [x] Public agent profile: competition history should show which mode was used per entry
- [x] HOW_IT_WORKS.md: update to reflect both submission modes
- [x] REQUIREMENTS.md: update "Agents are Docker images" section to include API mode (done earlier)

### 11.5g: Tests

- [x] Unit tests for Zod schema validation (both modes, edge cases, discriminated union)
- [x] Unit tests for API execution handler (success, timeout, error, oversized response)
- [x] Unit tests for Docker execution handler still works unchanged
- [ ] Integration test: API-mode submission → output stored → evaluation enqueued — **deferred to Phase 12** (requires running Redis, Supabase, mock HTTP server)
- [ ] Integration test: Docker-mode submission → output stored → evaluation enqueued (regression) — **deferred to Phase 12** (requires running Redis, Supabase, Docker daemon + test images)

> 57 new tests across 4 files: submissions-validation.test.ts (19), execution-worker-api.test.ts (20), queue-modes.test.ts (9), execution-worker.test.ts (+9). All 223 tests pass. Integration tests deferred — Phase 12 builds the real test images and infra needed.

---

## Phase 12: Leaderboard Verification + Test Suite Upload + E2E Tests

Goal: Verify the full product loop works end-to-end visually, add test suite upload so automated scoring actually works, and write Playwright E2E tests covering the core flows. This is the "is the product real?" phase.

### 12a: Leaderboard Verification

The pipeline test runs but we haven't verified the leaderboard surface. The task created by the pipeline test has status="open" and a future deadline, so identities should be anonymized.

- [x] Code review: leaderboard API, component, task detail page, execution/evaluation workers all wired correctly
- [ ] Run TESTING.md pipeline test, grab the task ID from the response (requires Docker + Redis)
- [ ] Navigate to `/tasks/[id]` and confirm the Leaderboard component renders with scores
- [ ] Confirm anonymized agent names (e.g. "Agent #1") appear before deadline
- [ ] Mark Phase 11's last task as done

> Code review (2026-04-11): Full pipeline verified correct. Leaderboard API filters by status="completed" and joins evaluation_results. Component polls every 3s, stops on task close. Minor issues: redundant status update in evaluation worker, N+1 profile queries on identity reveal, tiny race window (handled by skipping entries without results). No breaking issues.

### 12b: Test Suite Upload

Companies currently can't upload test suites — tasks always evaluate with LLM-only scoring. This is a product-critical gap: "the score doesn't lie" means nothing if there's no automated ground truth.

**Schema**: test suite is a JSON file uploaded to Supabase Storage at `test-suites/{task_id}/suite.json`. The evaluation worker fetches it before running automated tests. If no suite exists, test_weight is forced to 0 and only LLM scoring runs.

- [x] `test_suite_url` column already exists in schema (migration 001) and evaluation worker already reads it
- [x] New API route `POST /api/tasks/[id]/test-suite` — validates JSON schema, uploads to `test-suites` bucket at `tasks/{taskId}/suite.json`, updates task row
- [x] Task creation form Step 2: file upload UI appears when `testWeight > 0`, blocks Next until a valid `.json` is provided
- [x] `handleSubmit()`: after task creation, uploads test suite to the new route using task ID from response
- [x] Client-side validation: `.json` only, under 5MB, non-empty `test_cases` array
- [x] Unit tests: schema validation (valid/invalid suites, all match types), storage path convention, fallback behavior (19 tests)
- [ ] Create `test-suites` bucket in Supabase Storage (manual step — do in Supabase dashboard: Storage → New bucket → name: `test-suites`, private)
- [x] Update TESTING.md to document how to attach a test suite to a pipeline test run

> `test_suite_url` stores the storage path (e.g. `tasks/{id}/suite.json`), not a public URL. Evaluation worker calls `db.storage.from("test-suites").download(path)`. Upload happens after task creation so we have the task ID. 242 tests pass.

### 12c: E2E Tests (Playwright)

Write Playwright tests covering the core product flows. Use dev credentials (already configured in NextAuth). Tests should be runnable with `npm run test:e2e`.

**Scope** — one test per flow, no exhaustive edge-case coverage here:

- [x] Auth flow: sign in with dev agent_builder credentials → lands on dashboard
- [x] Auth flow: sign in with dev company credentials → lands on dashboard
- [x] Task posting: company signs in → creates task with rubric → publishes → task appears in company dashboard (refine step mocked with `page.route()`)
- [x] Agent feed: agent signs in → sees published task → task detail page loads with Enter button
- [x] Competition entry: agent navigates to entry page → submits API/Docker entry → submission API called with correct body (submissions API mocked to avoid real BullMQ jobs per test run)
- [ ] Leaderboard display: after pipeline test runs → task detail page shows leaderboard with ranked entries — **deferred to 12a manual verification**

> 4 test files: `e2e/auth.spec.ts` (4 tests), `e2e/task-posting.spec.ts` (3 tests), `e2e/agent-feed.spec.ts` (4 tests), `e2e/competition-entry.spec.ts` (4 tests). Shared helper at `e2e/helpers/auth.ts`. Tests that require open tasks use `test.skip()` gracefully if none exist.

---

## Phase 13: Executable Evaluation (Eval Container Model)

Goal: Replace the JSON pattern-matching test runner with executable evaluation. Companies ship a Docker eval container (their own test harness). Platform mounts agent output, runs it, reads `/results/score.json`. For simple tasks, LLM-only path remains default.

**The score.json contract:**
```json
{ "score": 0-100, "pass": true|false, "breakdown": { "criterion": 0-100, ... }, "notes": "..." }
```

**Three eval modes:**
- `llm` (default) — existing Gemini judge, no eval container needed
- `container` — eval container only, no LLM call
- `hybrid` — container scores + LLM qualitative notes (best for complex tasks)

### 13a: Database Schema ✅

- [x] Migration 018: `eval_mode` + `eval_image` on tasks, `breakdown` + `container_score` + `container_exit_code` + `eval_mode` on evaluation_results
- [x] CHECK constraint: eval_mode IN ('llm','container','hybrid'), eval_image required when mode != 'llm'
- [x] TypeScript types updated (Task, TaskInsert, EvaluationResult, EvaluationResultInsert)
- [x] Constants: EVAL_MODE, EVAL_CONTAINER_TIMEOUT_MS, EVAL_CONTAINER_MEMORY_LIMIT, etc.

### 13b: Eval Container Runner ✅

- [x] `downloadAgentOutputToDir(outputUrl, destDir)` — downloads files from Supabase Storage to a temp dir
- [x] `runEvalContainer(evalImage, agentOutputPath, resultsPath)` — pulls image, runs with `--network none`, mounts agent output as `/agent_output:ro`, results as `/results`, 1GB mem, 2 CPU, 10min SIGKILL timeout
- [x] Reads + Zod-validates `/results/score.json` after exit
- [x] `EvalContainerError` class for permanent failures (no retry)
- [x] Worker routes on `task.eval_mode`: llm→existing path, container→container only, hybrid→container then LLM for notes
- [x] 48 unit tests: score.json schema, Docker image regex, mocked container runner, download helper, mode routing

> Design decision: did NOT change the storage format to zip. Eval container gets the same individual files via temp dir mount. No breaking change to existing submissions. Zip can be added later if storage costs warrant it.

### 13c: Task API + Validation ✅

- [x] `createTaskSchema` accepts `eval_mode` + `eval_image` with cross-field refinement
- [x] `POST /api/tasks` passes `eval_mode`/`eval_image` through to DB insert
- [x] `GET /api/tasks/[id]` already returns `...task` which includes both fields
- [x] `POST /api/tasks/validate-eval` — validates Docker image reference format (regex-based, no Docker pull in web request)
- [x] Task form calls validate-eval on blur with inline error display

> Design decision: validate-eval does format checks only, not a full pull+run. Pulling a Docker image in a form submit takes 30s+ and times out unpredictably. The eval worker handles pull failures gracefully at evaluation time.

### 13d: Task Creation Form ✅

- [x] Three eval mode cards (LLM Judge / Container Eval / Hybrid) in Step 2
- [x] Eval image input with inline validation when container/hybrid selected
- [x] Info box explaining `/agent_output`, `/results` mounts and score.json contract
- [x] `canAdvance()` blocks if mode != llm and image is empty
- [x] Review step shows eval method + eval image

### 13e: Eval SDK ✅

- [x] `packages/eval-sdk/` — types.ts, schema.ts, index.ts, run-local.sh, example/Dockerfile + eval.js
- [x] `/docs` page: "Writing an eval container" section with schema, mounts, example, constraints

### 13f: Results + Task Detail Display ✅

- [x] Results page shows per-criterion breakdown bars from container eval
- [x] EvalModeBadge component (LLM Judge / Container Eval / Hybrid)
- [x] Submission details API returns `container_score`, `breakdown`, `eval_mode`
- [x] Task detail page shows eval_mode badge + eval_image in EVALUATION section
- [ ] Leaderboard: hover tooltip showing per-criterion breakdown (deferred — minor polish)

### 13g: Documentation ✅

- [x] HOW_IT_WORKS.md: rewritten Evaluation Worker section with all three modes, updated architecture diagram
- [x] DECISIONS.md: D9 documenting the eval container decision + what was rejected
- [x] REQUIREMENTS.md: Evaluation section updated with three modes + score.json contract
### 13h: Remaining

- [x] Update TESTING.md: add "Testing with eval containers" section
- [ ] E2E test: company creates task with container eval mode → task shows eval mode badge (Playwright)
- [x] Apply migrations 018, 019, 020 to Supabase

---

## Phase 14: Deployment + Docs

### 14a: Docs Rewrite ✅

- [x] Rewrite /docs page for agent readability (structured, every field documented, Python + Node.js examples)
- [x] New "How You're Scored" section (three eval modes from agent POV)
- [x] Updated API reference with all current fields (eval_mode, container_score, breakdown, max_submissions_per_agent, leaderboard, PATCH tasks)
- [x] GET /api/docs — machine-readable JSON API spec for programmatic agent access

### 14b: Deployment Infra ✅

- [x] Vercel: auto-deploys from master, all 11 env vars configured, production live
- [x] Worker Dockerfiles (workers/execution.Dockerfile, workers/evaluation.Dockerfile) with Docker CLI
- [x] docker-compose.prod.yml for VPS deployment (Docker socket mount)
- [x] .env.prod.example template
- [x] DEPLOY.md step-by-step guide
- [x] Conditional dotenv loading in workers (dev vs production)

<!-- RESUME HERE -->
### 14c: Worker Deployment (TODO)

**Step 1: Redis (free, 5 min)**
- [ ] Create free Redis at upstash.com → copy `REDIS_URL` (`rediss://default:xxx@xxx.upstash.io:6379`)
- [ ] Add `REDIS_URL` to Vercel env vars (web app needs it to enqueue jobs)

**Step 2: VPS ($4-12/mo, 10 min)**
- [ ] Create VPS: Hetzner CX22 ($4.50/mo) or DigitalOcean ($12/mo), Ubuntu 24.04
- [ ] SSH in and run:
  ```
  curl -fsSL https://get.docker.com | sh
  git clone https://github.com/Jeremyliu-621/mop.git && cd mop
  cp .env.prod.example .env.prod
  nano .env.prod  # REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GEMINI_API_KEY
  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml logs -f  # verify connected
  ```

**Step 3: Remaining**
- [ ] Update GitHub OAuth callback URL → `https://your-domain.vercel.app/api/auth/callback/github`
- [ ] Update Google OAuth callback URL → `https://your-domain.vercel.app/api/auth/callback/google`
- [ ] Create `test-suites` bucket in Supabase Storage (Dashboard → Storage → New bucket, private)

---

## Phase 14: Agent-First API + Upload Submission Mode

Goal: Make the platform usable by autonomous AI agents. Add a third submission mode ("upload") for offline work, and build a v1 API (`/api/v1/`) so agents can programmatically discover tasks, enter competitions, upload artifacts, read scores, and iterate.

### 14a: Database Migration (021)

- [x] Migration 021: add `registered` to `submission_status` enum, update `submission_mode_check` for upload mode, add `upload_token` column
- [x] Apply migration 021 to Supabase (manual — run in Supabase SQL editor)

### 14b: Constants + Types

- [x] Add `UPLOAD` mode, `REGISTERED` status, upload constants to `src/constants.ts`
- [x] Update `Submission`/`SubmissionInsert` interfaces in `src/types/database.ts`

### 14c: Upload Service

- [x] `src/services/upload.service.ts`: presigned URL generation, upload verification, storage path helper

### 14d: Submission Service Extraction

- [x] `src/services/submission.service.ts`: extracted shared validation (task open, quota, active check) + creation logic
- [x] Updated `src/app/api/submissions/route.ts` to use service, added upload mode branch

### 14e: v1 API Routes

- [x] `GET /api/v1/tasks` — list open tasks with category/eval_mode filters
- [x] `GET /api/v1/tasks/{id}` — task detail with criteria names (no weights) + agent quota
- [x] `POST /api/v1/tasks/{id}/submissions` — enter competition (api/docker/upload)
- [x] `GET /api/v1/submissions` — list agent's submissions
- [x] `GET /api/v1/submissions/{id}` — scores + per-criterion feedback + position + quota
- [x] `POST /api/v1/submissions/{id}/upload` — upload artifact (server-mediated)
- [x] `POST /api/v1/submissions/{id}/complete` — signal presigned upload is done

### 14f: Tests

- [x] Upload service tests (8 tests): presigned URL, verification, placeholder filtering, error handling
- [x] Submission service tests (7 tests): task validation, quota check, active submission blocking

### 14g: Documentation

- [x] HOW_IT_WORKS.md: upload mode section, v1 API section with iteration loop diagram
- [x] DECISIONS.md: D10 documenting upload mode + v1 API rationale
- [x] REQUIREMENTS.md: updated Agents section with upload mode + agent-first API

> Upload mode bypasses execution worker entirely. Agents work offline and upload artifacts via presigned URL or POST. Evaluation runs immediately on upload (Option A). v1 routes are thin wrappers over the existing service/repo layer. 332 tests pass, zero type errors.

### 14h: Remaining

- [ ] E2E test: agent creates API key → discovers task → enters with upload mode → uploads → gets score (Playwright)
- [x] Apply migration 021 to Supabase (manual)
- [ ] Entry page UI: add "Upload" as third tab alongside "Connect API" and "Docker Image"
- [ ] Agent SDK package (optional): TypeScript/Python wrapper around v1 API

---

## Phase 15: Agent Event System — Webhooks + Task Match Notifications

Goal: Let autonomous agents react to platform events. Generalize webhooks for both roles, wire task matching to dispatch events, build webhook management endpoints, and create the delivery worker.

### 15a: Migration 022

- [x] Rename `company_id` → `user_id` on webhooks table, update indexes + RLS
- [x] Apply migration 022 to Supabase (manual)

### 15b: Constants + Types

- [x] Added `TASK_MATCHED` to `WEBHOOK_EVENT` and `NOTIFICATION_TYPE`
- [x] Added `WEBHOOK_MAX_PER_USER`, `Webhook`/`WebhookInsert`/`WebhookDelivery` types

### 15c-d: Generalize Dispatch + Update Call Sites

- [x] Renamed `companyId` → `userId` in `webhook-dispatch.ts` and `workers/lib/dispatch.ts`
- [x] Added `dispatchWebhookToManyUsers()` for bulk task matching dispatch
- [x] Fixed bug in v1 submissions route (was passing `""` as userId)
- [x] All existing call sites updated (values unchanged, just parameter rename)

### 15e-f: Task Match Dispatch + Wire to Publish

- [x] `src/services/task-match-dispatch.ts`: matches agents by category, dispatches webhooks + notifications
- [x] `buildTaskMatchedPayload()` added to webhook service
- [x] Wired into task status route: draft→open fires `dispatchTaskMatchedNotifications()`

### 15g: Agent Evaluation Webhooks

- [x] Evaluation worker now dispatches `evaluation.completed` webhook to the agent (in addition to company)

### 15h: Webhook Management API

- [x] `POST /api/v1/webhooks` — register webhook (url + events), returns secret once
- [x] `GET /api/v1/webhooks` — list user's webhooks (no secrets)
- [x] `DELETE /api/v1/webhooks/{id}` — soft deactivate
- [x] `POST /api/v1/webhooks/{id}/test` — send test delivery

### 15i: Webhook Delivery Worker

- [x] `src/workers/webhook-worker.ts` — BullMQ worker with HMAC-SHA256 signing, 10s timeout, concurrency 10
- [x] Added `"webhook-worker"` npm script

### 15j: Tests

- [x] Task match dispatch tests (4): matching, no agents, no match, error handling
- [x] Webhook service tests (5): signature generation, payload builders

> Generalized webhooks from company-only to both roles via `user_id` rename. Task matching fires on publish (draft→open) — queries all agent profiles, filters by category, dispatches webhooks + in-app notifications. Webhook worker delivers with HMAC-SHA256 signatures. 341 tests pass, zero type errors.

### 15k: Remaining

- [x] Apply migration 022 to Supabase (manual)
- [ ] E2E test: agent registers webhook → company publishes task → agent receives task.matched delivery

---

## Phase 16: Agent SDK (`@straw/agent-sdk`)

Goal: Zero-dependency TypeScript client for the v1 API. Wraps HTTP, auth, and error handling into `client.tasks`, `client.submissions`, `client.webhooks`.

- [x] `packages/agent-sdk/package.json`
- [x] `packages/agent-sdk/types.ts` — all response types matching v1 API
- [x] `packages/agent-sdk/errors.ts` — `StrawApiError` with status, code, details
- [x] `packages/agent-sdk/client.ts` — `StrawClient` with tasks/submissions/webhooks resources
- [x] `packages/agent-sdk/index.ts` — re-exports
- [x] `packages/agent-sdk/examples/compete.ts` — full agent loop example
- [x] `packages/agent-sdk/client.test.ts` — 13 tests (all resources + error handling)
- [x] Updated `vitest.config.ts` to include `packages/**/*.test.ts`
- [x] Updated HOW_IT_WORKS.md with SDK section

> Zero dependencies. Uses native `fetch`. Throws `StrawApiError` on failures. 354 tests pass, zero type errors.

---

## Phase 17: Upload-Only Simplification + Structured Submissions

Goal: Simplify to one submission mode (upload). Remove API and Docker agent execution. Add required SUBMISSION.md, platform build check, and company-configurable eval constraints. See `tasks/ARCHITECTURE_DECISION.md` for full rationale.

### 17a: Remove API + Docker Agent Execution ✅

- [x] Removed `ExecutionJobData` + `createExecutionQueue` from queue.ts
- [x] Removed `enqueueExecution()`, API/Docker branching from submission.service.ts — always upload mode
- [x] Updated `POST /api/submissions` — upload-only schema (task_id + optional display name)
- [x] Updated `POST /api/v1/tasks/[id]/submissions` — upload-only, returns presigned URL
- [x] Rewrote enter competition page for upload flow (register → build → upload → score)
- [x] Rewrote pipeline test to simulate uploads instead of Docker execution
- [x] Removed execution-worker service from docker-compose.prod.yml, added webhook-worker
- [x] Removed `npm run worker` script from package.json

> Execution worker file (`src/workers/execution-worker.ts`) and Dockerfile (`workers/execution.Dockerfile`) kept as legacy but no longer referenced. -312 net lines.

### 17b: Required SUBMISSION.md ✅

- [x] `verifySubmissionMd()` in upload.service.ts — checks for SUBMISSION.md in uploaded files
- [x] `POST /api/v1/submissions/[id]/complete` validates SUBMISSION.md before accepting (400 MISSING_SUBMISSION_MD)
- [x] Enter competition page mentions SUBMISSION.md requirement in success state + how-it-works section

### 17d: Company-Configurable Eval Constraints ✅

- [x] Migration 023: `eval_network` (bool), `eval_memory_mb` (512-4096), `eval_timeout_seconds` (600-3600) on tasks
- [x] Types updated (Task + TaskInsert)
- [x] Eval worker: `runEvalContainer` accepts dynamic constraints from task (replaces hardcoded values)
- [x] Task form: network checkbox, memory dropdown, timeout dropdown when container/hybrid selected
- [x] Validation schema: accepts + validates constraint fields with defaults
- [x] Task API: passes constraints through to DB

### 17e: Update Eval Worker ✅

- [x] `extractSubmissionMd()` separates SUBMISSION.md from other output
- [x] `buildEvaluationPrompt()` includes SUBMISSION.md as separate section with cross-referencing instruction
- [x] LLM judge explicitly told to verify claims in SUBMISSION.md against actual code

### 17g: Tests ✅

- [x] Submission schema tests rewritten for upload-only (8 tests)
- [x] extractSubmissionMd tests (4 tests)
- [x] Eval constraint validation tests (8 tests)

> 357 tests passing. Production build clean. Zero TS errors.

### 17c: Platform Build Check ✅

- [x] `build-check.service.ts`: `detectLanguage()` (Node/Python/Rust/Go), `runBuildCheck()` with 60s timeout
- [x] Eval worker (LLM path): downloads to temp dir, runs build check, passes result to LLM prompt
- [x] `buildEvaluationPrompt()` includes "Platform Build Check" section
- [x] Skipped for eval container path (container does its own build)
- [x] 8 tests for language detection

> Runs directly in eval worker process. For production hardening, could be moved to a lightweight container.

### 17f: Update Docs + SDK ✅

- [x] /docs page rewritten: removed API/Docker submission, upload-only flow, SUBMISSION.md template, build check section
- [x] /api/docs JSON endpoint: upload-only submission_modes, new error codes, SUBMISSION.md template
- [x] DEPLOY.md: removed execution worker, updated architecture diagram

> Phase 17 complete. 9 commits on feat/phase-17-upload-only. 365 tests. Zero errors. Clean build.

---

## Cleanup: Dead Code + Essential Gaps

Goal: Remove clearly-dead code from the upload-only simplification, write legally-required pages, fix footer placeholders, clean up misleading TODOs.

- [x] Deleted execution worker (`src/workers/execution-worker.ts`, test, Dockerfile) — fully replaced in Phase 17
- [x] Removed EXECUTION_* and QUEUE_EXECUTION constants — only used by dead worker
- [x] Removed unused feature constants (EXPORT, TEMPLATE, COMPARISON, COMMENT, ARTIFACT) — zero backing code
- [x] Deleted unused FeatureShowcase component — built but never imported by any page
- [x] Replaced terms/privacy "Coming Soon" stubs with real legal pages
- [x] Fixed footer social links (were pointing to generic domain roots like `https://twitter.com`)
- [x] Cleaned up reputation TODO — reputation is computed on-read, no denormalized counters needed
- [x] Cleaned up TASKS.md discovered/unbuilt sections

> Kept DealRepository, MessageRepository, WebhookInsert, NotificationPreferenceInsert — plausibly useful soon. All deleted code is recoverable from git history.

---

## Phase 19: API-First — Full Programmatic Access for Both Roles

Goal: Make every endpoint API-key-friendly. Companies and agents can do everything programmatically — no browser required.

### 19a: Extract Shared Schemas ✅

- [x] Extracted `updateTaskSchema`, `testSuiteSchema`, `testCaseSchema`, `createDealSchema` to `src/lib/validation.ts`
- [x] Added `TEST_SUITE_BUCKET`, `TEST_SUITE_MAX_FILE_SIZE_BYTES` to `src/constants.ts`
- [x] Updated importers: `tasks/[id]/route.ts`, `test-suite/route.ts`, `deals/route.ts`, both test files

### 19b: Migrate Session-Only Routes to Unified Auth ✅

Swapped `auth()` → `authenticateRequest()`, added rate limiting and `apiError()` on 7 routes:

- [x] `GET/POST /api/tasks` — task listing + creation (+ added audit log on POST)
- [x] `POST /api/tasks/[id]/close` — task closure (+ added ownership check, UUID validation)
- [x] `GET /api/tasks/[id]/leaderboard` — leaderboard access
- [x] `POST /api/tasks/[id]/test-suite` — test suite upload
- [x] `GET /api/dashboard/stats` — dashboard stats
- [x] `GET /api/dashboard/submissions` — company submission list
- [x] `GET /api/submissions/[id]/details` — evaluation dimensions

### 19c: New v1 Company Routes ✅

9 new endpoints giving companies full programmatic access:

- [x] `POST /api/v1/tasks` — create draft task with rubric criteria
- [x] `PATCH /api/v1/tasks/[id]` — update draft task fields
- [x] `PUT /api/v1/tasks/[id]/rubric` — replace rubric criteria (atomic)
- [x] `POST /api/v1/tasks/[id]/publish` — publish draft → open (validates weights, dispatches webhooks + agent notifications)
- [x] `POST /api/v1/tasks/[id]/close` — close task early from open/evaluating (dispatches webhooks, expires invitations)
- [x] `GET /api/v1/tasks/[id]/leaderboard` — ranked results with anonymization
- [x] `GET /api/v1/tasks/[id]/submissions` — paginated submissions to company's task
- [x] `POST /api/v1/tasks/[id]/test-suite` — upload test suite JSON
- [x] `GET/POST /api/v1/deals` — list + create deals with webhook/audit

### 19d: Update API Documentation ✅

- [x] `/api/docs` updated to v1.1 with all 30+ endpoints, roles section, new error codes
- [x] Every endpoint documented with auth requirements, role restrictions, request/response fields

> Phase 19 complete. Zero type errors. 341 tests pass. All routes follow identical patterns: authenticateRequest, rateLimitResponse, apiError, ownership checks, audit logging, webhook dispatch.

---

## Phase 18: Prove It Works — Real Tasks + Real Agents

Goal: Create real tasks and competing agents to prove the full loop works end-to-end. You are both the company and the agent builder. This produces demo content (screenshots, leaderboard, score breakdowns) that's more convincing than any pitch deck.

### 18a: Remove Blockers

~~Task creation + API key creation required browser OAuth.~~ **Fixed in Phase 19** — full v1 API for task creation, publishing, and all company workflows.

Remaining:
- [ ] **Write `npm run seed:competition` script** — creates a test company user, publishes a real task with rubric, creates an agent builder user + API key, prints the key. One command, no browser needed.
- [ ] **Deploy eval worker (see 14c above)** OR run locally: `docker-compose up -d` (Redis) + `npm run eval-worker`
- [ ] **Verify:** run seed script → hand API key to Claude Code → Claude discovers task, uploads, gets scored

### 18b: Create 2-3 Real Tasks

Use the seed script or sign in as company via browser. Post actual tasks:

- [ ] **Task 1: "Build a URL shortener API"** — input: OpenAPI spec, output: working code. Eval: LLM judge.
- [ ] **Task 2: "Parse and normalize messy CSV data"** — input: sample CSV with edge cases, output: clean JSON. Eval: LLM judge or simple eval container.
- [ ] **Task 3: "Build a CLI tool that summarizes git repos"** — input: repo URL, output: markdown summary. Eval: LLM judge.

### 18c: Compete with Claude as the Agent

Once a task exists and you have an API key, open Claude Code and tell it:
> "Here's an API key: straw_sk_xxx. The platform is at http://localhost:3000.
> Read the docs at /api/docs. Find an open task, build a solution, zip it
> with a SUBMISSION.md, upload it via the v1 API, and poll until you get a score."

Do this 3 times with different prompts to get a leaderboard:
- [ ] **Run 1:** "Try your hardest. Write clean, thorough code."
- [ ] **Run 2:** "Do a quick job. Get something working but don't overthink it."
- [ ] **Run 3:** "Minimal effort. Just get something submitted."

### 18d: Validate the Loop

- [ ] All 3 submissions scored and ranked on leaderboard
- [ ] Score ordering makes sense (thorough > quick > lazy)
- [ ] Per-criterion breakdowns show meaningful LLM reasoning
- [ ] Resubmission works: agent improves and scores higher on 2nd attempt

### 18e: Capture Demo Content

- [ ] Screenshots: leaderboard with ranked agents, score breakdowns, iteration loop
- [ ] Write a short blog post or Twitter thread showing the full flow
- [ ] Record a 2-min screen recording of an agent competing end-to-end

---

## Friction Reduction Pass (2026-04-14)

Goal: Reduce the highest-friction points across the platform. 8 workstreams addressing UX gaps that block real users.

- [x] W3: Role-aware dashboard redirect — middleware now checks `session.user.role`, sends agent builders to `/dashboard/agent`
- [x] W5: Dev sign-in supports both roles — two buttons (Company / Agent) instead of hardcoded company
- [x] W8: API key page shows key count — `{n}/10` counter next to "Secret Keys" label
- [x] W4: Landing page fixes — CTA links to `/tasks/new` when authenticated, headline clarified, ProcessFlow copy updated for upload-only model
- [x] W2: Task creation validation feedback — `getBlockers()` shows human-readable reasons below disabled "Continue" button
- [x] W7: Attachment failure warnings — failed uploads shown in warning banner instead of swallowed by console.error
- [x] W6: Entry page upload instructions — presigned URL displayed, curl commands with copy buttons for both upload flows
- [x] W1: Browser file upload UI — drag-and-drop .zip upload zone on entry page, POSTs to `/api/v1/submissions/{id}/upload`, shows progress and success/error state

> 7 files changed, +433 -124 lines. Zero type errors. 341 tests pass. Clean production build.

---

## Deployment: OVH VPS + Local Bridge (2026-04-18 → in progress)

Goal: Get Straw fully deployed. Web is on Vercel. Workers are the last piece.

**Decided architecture:** Vercel (web) + OVH VPS-2 Beauharnois (workers) + Upstash Montreal (Redis) + Supabase us-east-1 (DB). Full rationale in `tasks/DECISIONS.md` D13. Full walkthrough in `DEPLOY.md` Section 2.

### Already done (as of 2026-04-18)

- [x] Vercel web app deployed at `straw.vercel.app`
- [x] OAuth apps configured (GitHub + Google)
- [x] Upstash Redis provisioned in ca-central-1 (Montreal)
- [x] Supabase project `straw` (`ptvipiqorbqxoypbfeoj`) in us-east-1
- [x] Gemini API key provisioned
- [x] **Migration 030 applied** — RLS hardening on 6 public-schema tables (webhooks/webhook_deliveries/notifications/task_invitations/submission_artifacts/task_comments), tightened audit_log INSERT, pinned search_path on 3 trigger functions. Zero security lints remaining.

<!-- RESUME HERE -->

### Next up — finish the OVH pre-order

- [ ] **Complete OVH VPS-2 Beauharnois checkout** at the page where we stopped (No commitment, Ubuntu 25.04, skip all add-ons — automated backup is already included free). $16 CAD/mo, 7-day delivery.
- [ ] While waiting for the VPS, run workers on the dev machine per `DEPLOY.md` Bridge Plan — test end-to-end with real Upstash/Supabase (`npm run eval-worker` + `npm run webhook-worker` in two terminals).

### When the VPS arrives (within ~7 days of order)

- [ ] SSH in, run UFW + swap + Docker install per `DEPLOY.md` Section 2 Step 2
- [ ] Clone repo, fill `.env.prod` with same values as Vercel env (especially `REDIS_URL` must match exactly)
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`, verify both workers log "waiting for jobs"
- [ ] Trigger `POST /api/dev/pipeline-test`, confirm an eval runs on the VPS (not laptop) and writes to Supabase
- [ ] Stop local worker processes on laptop
- [ ] Remove or auth-gate `/api/dev/pipeline-test` before any public announce

### Pre-launch polish (do before announcing to the world)

- [ ] Buy a real domain + point at Vercel, update `NEXT_PUBLIC_APP_URL`, update OAuth callback URLs
- [ ] Backfill `supabase_migrations.schema_migrations` for migrations 001–027 (currently only 028–030 are tracked; `supabase db push` will try to re-apply 001–027 and may fail until this is fixed)
- [ ] Verify submission quota is hard-capped at 5/agent/task per commit `6b988c6`

---

## Agent Integration Friction (2026-04-16)

Goal: make "paste the API/MCP into your agent daemon (OpenCode, Claude Code, Cursor, custom dispatch) and run" actually work. Ranked by leverage (impact ÷ effort). Deployment and Redis/Upstash setup are tracked separately.

**P0 — blocks paste-and-go**
- [x] **Publish pipeline for `@straw/agent-sdk` + `@straw/mcp-server`** (2026-04-16). Added npm workspaces at root, tsup build for both packages, `prepublishOnly` hooks, workspace-resolved dep between them. `npm pack --dry-run` confirms clean tarballs (9.8 KB + 24.4 KB). Remaining: `npm login` with 2FA + `npm publish -w @straw/agent-sdk --access public && npm publish -w @straw/mcp-server --access public`.
- [ ] **Add HTTP/SSE MCP transport** at `/api/v1/mcp` using the same tool handlers as stdio. Unblocks sandboxed daemons (VMs, remote runners, Docker agents) that can't co-locate a stdio process. Users configure `{ url, headers: { Authorization: Bearer ... } }`.
- [ ] **Streamlined key bootstrap.** After GitHub/Google sign-in, redirect straight to the API key page and surface the generated key once in a copyable block. Follow up with `npx @straw/cli login` device flow that writes `~/.straw/credentials`; MCP/SDK read it if `STRAW_API_KEY` unset.
- [x] **Unify base URL** (2026-04-16). Both SDK and MCP now default to `https://straw.vercel.app`. Landing-page mockup strings (`ProcessFlow.tsx`, `ArenaProvider.tsx`) left for the eventual brand sweep.

**P1 — per-loop tax**
- [ ] **Kill the polling tax on `get_submission`.** Options (any one): SSE stream on `GET /api/v1/submissions/[id]/stream`; MCP tool that blocks internally with backoff so the model sees one tool call; stronger webhook path for daemons that have callbacks.
- [x] **Idempotency keys on `quick-submit`** (2026-04-16). `Idempotency-Key` header in `src/app/api/v1/tasks/[id]/quick-submit/route.ts`; retries return the original submission with `idempotent_retry: true`. Storage: new column on `submissions` with partial unique index (migration 028). SDK exposes `idempotencyKey` option. 4 unit tests cover validation + cached-retry path.
- [ ] **Make SUBMISSION.md contract explicit.** Document in the `quick_submit` tool description and `get_task` response that SUBMISSION.md is scored; upgrade the auto-generated template to mirror the rubric criteria (route.ts:121).
- [ ] **Binary-safe file uploads.** Quick-submit currently uploads every file as UTF-8 `text/plain` (route.ts:169). Accept `{ path, content, encoding: "base64" | "utf8" }`; sniff MIME from extension.

**P2 — annoyances with clean workarounds**
- [ ] Surface `quota_remaining` in `get_task` and `quick_submit` responses; add a `check_quota` MCP tool. Kills mid-loop 429 surprises.
- [ ] Ship `straw eval --local ./solution --task <id>` that runs the evaluator harness locally against the agent's files, non-binding score, no quota hit.
- [ ] Validate `files` shape against `task.output_spec` when one is defined; return `expected: [...], got: [...]` on mismatch instead of a generic evaluator failure.
- [ ] Let task owners submit with `exclude_from_leaderboard=true` so dogfooding doesn't trip `route.ts:83`.
- [ ] ESLint rule in `packages/mcp-server` that bans `console.log` (stdout poisons MCP protocol); expose `strawLog` helper that writes to stderr.
- [ ] Collapse MCP tool surface from 8 → ~4: merge `list_tasks`/`get_task` into one tool with optional `id`; same for submission tools. Reduces tool-catalog crowding in harnesses that already have filesystem/shell/browser MCPs.

---

## Phase 19: Platform-Native Deployment (proposed, not yet started)

Goal: Move from "Vercel + VPS + docker-compose" to a fully platform-native architecture that scales to week-long competitions with 200+ agents and bursts of hundreds of concurrent evaluations, with zero servers we SSH into.

**Why this phase exists:** Current `DEPLOY.md` is Vercel (web) + Hetzner/DigitalOcean VPS (workers, with `/var/run/docker.sock` mounted for eval container execution). That works at MVP volume but has a fixed concurrency ceiling, a single-region SPOF, ops burden, and a security ceiling on the build-check (`src/services/build-check.service.ts` runs `execSync` on the worker host — see `SCALE.md:62`). A week-long task with 200 agents and a deadline burst breaks all four limits.

**End-state architecture:**
- **Vercel** — web app (already there) + workers as Functions on Fluid Compute (Node 24, 300s default timeout, instance reuse)
- **Modal** — eval container execution. Firecracker microVMs, autoscale to thousands concurrent, billed per-millisecond. (Vercel Sandbox is the eventual swap once verified to support arbitrary user-supplied Docker images with mount + network constraints — that's why the abstraction exists.)
- **Vercel Workflow DevKit (WDK)** — durable orchestration for evals. Pause/resume so a 1-hour eval doesn't tie up function compute. Crash-safe.
- **Upstash Redis** — BullMQ queue, serverless, multi-region, pay-per-request, TLS by default
- **Supabase** — DB + Storage. Unchanged.

**Why not Railway:** Railway services don't expose a host Docker socket and don't allow privileged containers, so the eval worker can't spawn eval containers there. To run on Railway you'd do the sandbox-API refactor anyway, at which point Railway adds a third platform with no capability that Vercel + Upstash don't already give you. See conversation 2026-04-17 for full reasoning.

**Why not stay on the VPS:** Fixed concurrency cap, single region, ops burden (patching/monitoring/SSH), single point of failure, and the build-check security ceiling. Hetzner is cheaper at <100 evals/day but more expensive at scale (must over-provision to absorb deadline bursts).

### Open decisions before starting

- [ ] **Sandbox provider:** Modal (mature, recommended) vs verify Vercel Sandbox can pull arbitrary Docker images with `--network none`, volume mounts, and per-task memory/timeout config. Pick before step 19a.
- [ ] **Cutover timing:** Do this refactor now, or ship Path B (Vercel + Hetzner + Upstash) first to get to live and circle back in 2–3 weeks?

### 19a: `RemoteSandbox` interface refactor

- [ ] Define `interface Sandbox { run(image, mounts, limits, network): Promise<SandboxResult> }` in `src/lib/sandbox/`
- [ ] Implement `LocalDockerSandbox` that wraps current `dockerode` calls — no behavior change
- [ ] Wire `evaluation-worker.ts` and `build-check.service.ts` through the interface, gated by `SANDBOX_PROVIDER=local|modal` env var
- [ ] Tests: existing eval tests still pass against `LocalDockerSandbox`

### 19b: `ModalSandbox` implementation

- [ ] Provision Modal account, capture API key + workspace ID into env scaffold
- [ ] Implement `ModalSandbox` — submits container job, returns call ID, polls or registers webhook for completion
- [ ] Side-by-side test: same eval submission against both `LocalDockerSandbox` and `ModalSandbox`, diff `score.json` output for parity
- [ ] Verify Modal image cache hits during burst (200 evals pulling same eval image should not 429)

### 19c: WDK workflow for eval orchestration

- [ ] Add `@vercel/workflow` (or current WDK package), set up workflow runtime
- [ ] Convert `evaluation-worker.ts` job handler into a WDK workflow: `evaluateSubmission(submissionId)` with steps `kickOff` → `wait` → `ingest` → `notify`
- [ ] Idempotency key = `submission_id` so BullMQ redelivery doesn't double-evaluate
- [ ] Crash-resume test: kill the worker mid-eval, verify workflow resumes and writes a single `evaluation_result`

### 19d: Workers → Vercel Functions

- [ ] Convert `evaluation-worker.ts` from long-running BullMQ worker to a Vercel Function that consumes jobs and kicks off WDK workflows
- [ ] Convert `webhook-worker.ts` from long-running worker to a Vercel Function (still BullMQ consumer, but as a Function with Fluid Compute instance reuse)
- [ ] Verify heartbeat/observability still works — replace `/tmp/eval-worker-heartbeat` with a Vercel-native equivalent (queue depth metric, function logs)

### 19e: Redis → Upstash

- [ ] Provision Upstash Redis (multi-region, TLS-enabled `rediss://` URL)
- [ ] Migrate `REDIS_URL` in Vercel env + worker env
- [ ] Drain in-flight jobs from old Redis before cutover
- [ ] Verify BullMQ queue depths and retries behave the same against Upstash

### 19f: Storage lifecycle + quota verification

- [ ] Verify `submission_quota` enforcement is hard-capped at 5 successful submissions per agent per task (per recent commit `6b988c6`)
- [ ] Add Supabase Storage lifecycle policy: keep agent artifact + `score.json` for 90 days post-deadline (for disputes), delete raw artifact after that. Score record is immutable forever.
- [ ] Add presigned URL expiry = `task.deadline + 5 min grace window`. Deadline check at evaluation time, not at upload time.

### 19g: Cutover + cleanup

- [ ] Run both architectures in parallel for one week (Hetzner workers + new Vercel Function workers, dual-write to a `migration_check` table, reconcile)
- [ ] Cut traffic to new architecture, monitor for 48h
- [ ] Delete `docker-compose.prod.yml` and `workers/evaluation.Dockerfile`
- [ ] Rewrite `DEPLOY.md` to describe the platform-native architecture
- [ ] Decommission VPS

### Verification (must pass before declaring 19 complete)

- [ ] Synthetic load test: 200 concurrent eval submissions in <5 minutes, all complete, no failures, no double-evaluations
- [ ] Long-eval test: eval container that runs for 45 minutes completes correctly via WDK workflow without function timeout
- [ ] Crash test: kill all workers mid-eval, verify zero data loss and full recovery
- [ ] Cost report: actual $/eval at the test load matches the estimate (~$0.05–0.15/eval)
- [ ] Security: confirm Modal microVM isolation by attempting a known container-escape technique inside an eval container; should be contained

---

## Discovered Tasks

- **Email notifications**: Notify agents when matched tasks are posted, companies when deadline fires. Needs Resend integration.
- **Supabase Realtime**: Replace polling-based leaderboard with Realtime subscriptions.
- **Custom domain**: Point straw.dev (or similar) at Vercel deployment.
- **Agent reputation API**: Expose reputation stats via v1 API for programmatic agent discovery.
- **CSV/JSON export**: Let companies export leaderboard/results data.
- **Submission comparison**: Side-by-side comparison of agent outputs — high-value feature for companies.
- **Task templates**: Save and reuse task configurations for repeat posters.
- **Task comments**: Discussion threads on task pages.
- **Analytics dashboard**: Historical score/activity trends for company dashboard.

## Unmerged Work

_All stale agent branches deleted (2026-04-13). Valuable patterns were cherry-picked into master commit d64f813._
