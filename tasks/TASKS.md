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

### 14c: Worker Deployment (TODO — revised 2026-05-04, see D35/D36)

> **Order of ops changed.** Per D36, prove the loop locally before paying for a VPS. The deploy block below stays — but it is gated on "milestone in Phase 18a is green" (one real task scored end-to-end on the dev box).

**Step 1: Redis (already done locally, verify Vercel)**
- [x] Upstash Redis provisioned in ca-central-1 (Montreal). `REDIS_URL` set in `.env.local`.
- [ ] **Verify `REDIS_URL` is set in Vercel env** (`vercel env ls`, or check dashboard). Without this the web app on `straw.wiki` can't enqueue jobs.

**Step 2: VPS — Hetzner CX22 (~$4.50/mo, ~10 min). D35 supersedes the earlier OVH plan.**
- [ ] Create Hetzner CX22, Ubuntu 24.04 (or 25.04)
- [ ] SSH in and run:
  ```
  curl -fsSL https://get.docker.com | sh
  git clone https://github.com/Jeremyliu-621/straw.git && cd straw
  cp .env.prod.example .env.prod
  nano .env.prod  # REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GEMINI_API_KEY
  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml logs -f  # verify connected
  ```

**Step 3: Domain + buckets**
- [ ] Update GitHub OAuth callback URL → `https://straw.wiki/api/auth/callback/github`
- [ ] Update Google OAuth callback URL → `https://straw.wiki/api/auth/callback/google`
- [ ] Confirm `NEXT_PUBLIC_APP_URL=https://straw.wiki` is set in Vercel env
- [ ] Create `test-suites` bucket in Supabase Storage (Dashboard → Storage → New bucket, private)
- [ ] **SDK + MCP `baseUrl` sweep:** update `packages/agent-sdk/client.ts:40`, `packages/mcp-server/src/index.ts:12`, README snippets, and rebuild `dist/*`. Republish `@straw/agent-sdk` and `@straw/mcp-server` to npm. Default base URL must be `https://straw.wiki`.

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
- [x] `GET /api/v1/tasks/{id}` — task detail with criteria names + weights (D10) + agent quota
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

## Deployment: Hetzner CX22 + Local Bridge (revised 2026-05-04 — supersedes the earlier OVH plan)

Goal: Get Straw fully deployed. Web is on Vercel at `straw.wiki`. Workers are the last piece. **Per D36, prove the upload→score loop locally before paying for the VPS.**

**Decided architecture:** Vercel (web, `straw.wiki`) + Hetzner CX22 EU (workers, ~$4.50/mo — D35) + Upstash Montreal (Redis) + Supabase us-east-1 (DB). Full rationale in `tasks/DECISIONS.md` D13/D35/D36. Full walkthrough in `DEPLOY.md` Section 2 (host-agnostic; Hetzner is a one-line swap).

### Already done (as of 2026-05-04)

- [x] Vercel web app deployed at `straw.wiki` (was `straw.vercel.app` — D34)
- [x] OAuth apps configured (GitHub + Google) — production deployment serves callbacks from `https://straw.wiki/api/auth/callback/{github,google}` (verified live 2026-05-06). External OAuth-app dashboards (GitHub/Google) need straw.wiki added as an allowed redirect URI if not already; Jeremy must verify.
- [x] Upstash Redis provisioned in ca-central-1 (Montreal). `REDIS_URL` lives in `.env.local`. **Not yet verified in Vercel env.**
- [x] Supabase project `straw` (`ptvipiqorbqxoypbfeoj`) in us-east-1
- [x] Gemini API key provisioned
- [x] **Migration 030 applied** — RLS hardening on 6 public-schema tables (webhooks/webhook_deliveries/notifications/task_invitations/submission_artifacts/task_comments), tightened audit_log INSERT, pinned search_path on 3 trigger functions. Zero security lints remaining.
- [x] **OVH pre-order dropped (D35).** Hetzner CX22 chosen instead — 3.5× cheaper, instant provisioning, identical capability for eval-container mode.

### Honest production state (updated 2026-05-05)

**The pipeline works.** As of the 2026-05-05 smoke test:

- ✅ **Real Upstash URL works for BullMQ.** Eval-worker connects, drains queue, processes jobs without ECONNREFUSED. URL format: `rediss://default:<password>@smashing-krill-73558.upstash.io:6379` (TCP/TLS, NOT the REST URL).
- ✅ **Vercel REDIS_URL Production** is now set to the working Upstash URL (overrode previously-empty value 2026-05-05). Preview pending — needs `vercel env add REDIS_URL preview <gitbranch>` syntax fix.
- ✅ **`quick-submit` → Supabase Storage → Upstash → eval-worker** all healthy. Smoke test submission `09190436-eed1-40d4-a4eb-ab84fb09dac1` traversed the full pipeline.
- ✅ **Worker error handling is correct** — Gemini 403 retried 3×, marked `evaluation_failed`, no fake score written.

**The blocker:** `GOOGLE_GEMINI_API_KEY` returns `403 Forbidden — Your project has been denied access. Please contact support.` Same key on `.env.local` and Vercel. This is the only thing standing between us and a real score landing right now.

**Remaining gaps:**
- ✅ ~~Gemini API key denied~~ — **rotated 2026-05-05.** New key (`AIzaSyDe1...`) verified working against gemini-2.5-flash + scored a real submission. Pushed to Vercel Production. `.env.local` has stale denied key — should be updated for cleanliness, but the inline-export pattern works fine for the worker.
- ⏸ **No worker deployed 24/7.** Worker only runs when Jeremy starts it locally. Hetzner CX22 still needed for "live bounty board" (D35). But this is *after* the Gemini fix.
- ⏸ **OpenClaw bridge port closed.** Dog's Gateway binds to `127.0.0.1:18789`, not the Tailscale interface (`100.68.84.74`). See memory `project_openclaw_bridge.md` for the rebind instructions Jeremy needs to give Dog.
- ✅ ~~SDK + MCP defaults still point at `straw.vercel.app`~~ — **swept + republished 2026-05-06.** `@strawai/agent-sdk@0.2.0` and `@strawai/mcp-server@1.1.0` live on npm, both default to `https://straw.wiki`. Smoke-tested via `npx -y @strawai/mcp-server@1.1.0` end-to-end. (Note: `@straw` scope was unowned, so packages live under new org `@strawai` instead.)

<!-- RESUME HERE -->

### Right Now Milestone (D36) — Q1 PARTIAL, Q2 BLOCKED ON GEMINI

**Phase 18 already proved the upload→eval→score path on 2026-04-15** (see `tasks/research/phase18-results.md`: three quality tiers, scores 95.75/45.00/36.25). The 2026-05-05 smoke test confirmed the path still works at every layer except the LLM call.

**Two milestones, in order:**

**Q1 — Does the loop work end-to-end against real Upstash, today?** ✅ **YES (2026-05-05 evening)**
- ✅ Worker connects to real Upstash (no ECONNREFUSED — was failing earlier with stale `redis://localhost` in `.env.local`)
- ✅ `quick-submit` accepted, enqueued, dequeued, artifact downloaded, prompt built
- ✅ Gemini scoring works (after Jeremy rotated the dead key 2026-05-05)
- ✅ **Score landed: `final=45.5` on submission `09190436-eed1-40d4-a4eb-ab84fb09dac1`** for the minimal Markdown→HTML submission. Consistent with Phase 18 tier-2 quick baseline (45.00).
- 🔧 Re-runnable any time: `/tmp/submission-body.json` has the known-good body. Curl POST to `/api/v1/tasks/<id>/quick-submit` (or use `/request_re_eval` on the existing submission).

**Q2 — Does it work for an autonomous agent?** Phase 18 used a hardcoded driver. The agent-first test (give Dog/Claude API key + base URL + nothing else, watch it discover via `/api/docs` and compete) has never been run. Brief composed; pasted to Jeremy this session for OpenClaw. Bridge to Dog blocked on port-rebind (see `project_openclaw_bridge.md`).

### Exact next steps for the next session

**1. Ask Jeremy** for:
- Confirmation that Dog's Gateway port is rebound to `0.0.0.0:18789` (or `tailscale serve` is set up)
- The OpenClaw Gateway auth token (only after the rebind — see `project_openclaw_bridge.md`)

**2. ~~Re-run smoke test~~ — DONE (2026-05-05 evening, score 45.5 landed).**

**3. Run agent-first test (Q2) via OpenClaw bridge:**
- Once Dog's Gateway is reachable: test with `curl -sS -H "Authorization: Bearer $OPENCLAW_TOKEN" http://100.68.84.74:18789/v1/chat/completions -d '{"model":"openclaw/default","messages":[{"role":"user","content":"ping"}]}'`
- If responsive, send Dog the agent-first brief (composed this session — see chat or `project_openclaw_bridge.md` "Use Dog as a collaborator")
- Have Dog compete on task `c36a63d7-5373-4f24-8c59-63b60b8c7f73` with the API key in `/tmp/seed-out.txt` (or rerun seed if expired)
- Worker startup command: `REDIS_URL='rediss://default:<pw>@smashing-krill-73558.upstash.io:6379' GOOGLE_GEMINI_API_KEY='<new key>' npm run eval-worker` (both inline because `.env.local` is stale on both)
- Dev server (only needed if Dog hits localhost; can also hit `straw.wiki` directly): same env-var prefix, then `npm run dev`

**4. Once Q2 finds something interesting:**
- Capture Dog's transcript + any audit findings in a new `tasks/research/openclaw-agent-first-test-<date>.md`
- Buy Hetzner CX22 (D35), deploy `docker-compose.prod.yml` there with the same `REDIS_URL` and rotated `GOOGLE_GEMINI_API_KEY`
- Address the Code Hygiene Backlog (below)

### After the milestone — buy Hetzner CX22 (D35)

- [ ] Create Hetzner CX22 in EU, Ubuntu 24.04 (or 25.04). ~$4.50/mo, provisions in minutes.
- [ ] SSH in, run UFW + swap + Docker install per `DEPLOY.md` Section 2 Step 2
- [ ] Clone repo, fill `.env.prod` with same values as Vercel env (especially `REDIS_URL` must match exactly)
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`, verify both workers log "waiting for jobs"
- [ ] Re-run the seed script + Claude-as-agent loop, confirm an eval runs on Hetzner (not laptop) and writes to Supabase
- [ ] Stop local worker processes on laptop
- [ ] Remove or auth-gate `/api/dev/pipeline-test` before any public announce

### Pre-launch polish (do before announcing to the world)

- [ ] **SDK + MCP `baseUrl` sweep + republish** (D34): `packages/agent-sdk/client.ts:40`, `packages/mcp-server/src/index.ts:12`, READMEs, rebuild `dist/*`, `npm publish` both packages. Default to `https://straw.wiki`.
- [ ] Move OAuth callbacks to `straw.wiki` (tracked in 14c step 3)
- [ ] Track `straw.com` / `getstraw.com` / `straw.ai` acquisition as a pre-Series-A blocker (D34)
- [x] Backfill `supabase_migrations.schema_migrations` for migrations 001–027 (done 2026-05-06). 15 rows inserted with versions matching the Supabase CLI's `^([0-9]+)_(.+)\.sql$` parse — `001`, `002`, `003`, `004`, `017`–`027` (005–016 don't exist as files and don't need rows). 028–037 keep their existing 14-digit timestamp versions. `supabase db push` against this project should now be a no-op against current head.
- [ ] Verify submission quota: default 15/agent/task, poster-configurable, hard cap 25 (D15)

---

## Agent Integration Friction (2026-04-16)

Goal: make "paste the API/MCP into your agent daemon (OpenCode, Claude Code, Cursor, custom dispatch) and run" actually work. Ranked by leverage (impact ÷ effort). Deployment and Redis/Upstash setup are tracked separately.

**P0 — blocks paste-and-go**
- [x] **Publish pipeline for `@straw/agent-sdk` + `@straw/mcp-server`** (2026-04-16). Added npm workspaces at root, tsup build for both packages, `prepublishOnly` hooks, workspace-resolved dep between them. `npm pack --dry-run` confirms clean tarballs (9.8 KB + 24.4 KB). Remaining: `npm login` with 2FA + `npm publish -w @straw/agent-sdk --access public && npm publish -w @straw/mcp-server --access public`.
- [x] **Add HTTP/SSE MCP transport** at `/api/v1/mcp` (2026-05-06). Stateless `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk@1.29` wired into a Next App-Router route handler at `src/app/api/v1/mcp/route.ts`. Bearer-auth via `authenticateApiKey`, rate-limited at 120/min/user. Reuses the published `@strawai/mcp-server@1.1.0` factory in-process so all 32 stdio tools work over HTTP unchanged. Smoke-tested end-to-end against `localhost:3000`: 401 for unauth/malformed/unknown-key paths, `initialize` returns the `straw` server info via SSE, `tools/list` returns 32 tools, `tools/call list_tasks` returns real DB rows via the loop-back StrawClient. 7 unit tests (auth, rate limit, MCP framing) + full 905-test suite passes. Vercel uses Linux turbopack which resolves the npm-installed `@strawai/mcp-server` directly; npm workspaces tried + reverted (Turbopack on Windows can't follow workspace symlinks — known limitation). Users now configure `{ url: "https://straw.wiki/api/v1/mcp", headers: { Authorization: Bearer ... } }`.
- [x] **Streamlined key bootstrap** (auto-mint half done 2026-05-06). On `/dashboard/api`, when a user lands with zero active keys the page now auto-POSTs `/api/api-keys` once with name `"first-key"` and surfaces the plaintext in the existing one-time banner. Idempotent via a `bootstrappedRef` flag (no retry on failure, no loop). Reuses the existing route handler — no new endpoint, no migration. Sign-in callbackUrl unchanged: GitHub/Google `user.role` is null until the wizard captures it (`src/lib/auth.ts:87`), so a role-aware redirect at sign-in has nothing to read; the existing tour visits `/dashboard/api` as step 4 (BUILDER_TOUR_STEPS / COMPANY_TOUR_STEPS) which is where the auto-mint fires. The follow-up `npx @straw/cli login` device flow remains TODO — separate package.
- [x] **Unify base URL** (2026-04-16). Both SDK and MCP now default to `https://straw.vercel.app`. Landing-page mockup strings (`ProcessFlow.tsx`, `ArenaProvider.tsx`) left for the eventual brand sweep.

**P1 — per-loop tax**
- [x] **Kill the polling tax on `get_submission`** — verified done 2026-05-06. Stack: route `GET /api/v1/submissions/[id]/stream` (`src/app/api/v1/submissions/[id]/stream/route.ts`) emits SSE `submission` events on state-fingerprint changes and `terminal` on a completed/failed/eval_failed status; SDK `client.submissions.waitUntilDone` (`packages/agent-sdk/client.ts:454`) consumes the stream end-to-end with timeout + WAIT_ABORTED handling; MCP tool `wait_for_submission` exposes it as a single blocking tool call (`packages/mcp-server/src/tools/submissions.ts:83`). All three layers covered by tests (`stream-route.test.ts`, `sse.test.ts`, mcp tool surface). Smoke-tested 2026-05-06 against existing terminal submission `09190436-eed1-40d4-a4eb-ab84fb09dac1`: SSE direct → `submission` + `terminal` frames; MCP `wait_for_submission` over the new HTTP transport → formatted final score in one tool call.
- [x] **Idempotency keys on `quick-submit`** (2026-04-16). `Idempotency-Key` header in `src/app/api/v1/tasks/[id]/quick-submit/route.ts`; retries return the original submission with `idempotent_retry: true`. Storage: new column on `submissions` with partial unique index (migration 028). SDK exposes `idempotencyKey` option. 4 unit tests cover validation + cached-retry path.
- [x] **Make SUBMISSION.md contract explicit** (2026-05-06). Three layers tightened: (1) auto-generated SUBMISSION.md in `src/app/api/v1/tasks/[id]/quick-submit/route.ts` now fetches the task's rubric criteria and emits a section per criterion, each flagged "(not addressed by agent)" so the LLM judge can't mistake the placeholder for real claims (live immediately, no publish needed). (2) MCP `quick_submit` tool description in `packages/mcp-server/src/tools/submissions.ts` now leads with "the LLM judge reads SUBMISSION.md as the primary source of truth — INCLUDE ONE that addresses each evaluation criterion." (3) MCP `get_task` formatter in `packages/mcp-server/src/lib/format.ts` appends a `>` blockquote after the criteria list reminding the agent to mirror them in SUBMISSION.md. Workspace package bumped to `@strawai/mcp-server@1.2.0`; pending `npm publish` (requires 2FA — Jeremy) for the prose changes to reach external `npx -y @strawai/mcp-server` users. The hosted HTTP transport at `/api/v1/mcp` will pick up the prose changes after the next root `npm install` of v1.2.0.
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

- [ ] Verify `submission_quota` enforcement: default 15, poster-configurable, hard cap 25 (D15)
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

## Phase 20: Collaboration & Agent-as-Judge Eval (proposed, not yet started)

Goal: implement the corrected philosophy from D15–D22 + D30. Replace the implicit "adversarial sealed-bid" architecture with a "collaborative forum + per-task judge daemon" architecture. The platform becomes the place where task posters get the best work, not the place where agents try to win against each other.

**Why this phase exists:** D15 (quota), D16 (pseudonym rationale), and the SCALE_PASS_PLAN/SERVICE_ROLE_AUDIT doc updates are already shipped or are doc-only. D17–D22 + D30 are real product work that doesn't exist in code yet.

**Sequencing rule:** Land 20a–20c (transparency + collaboration) before 20d–20f (judge daemon, team submissions, rich posts). The judge daemon experience is more useful once collaboration is the norm.

### 20a: Open visibility during the build window (D17)

- [ ] New endpoint `GET /api/v1/tasks/{id}/submissions` (already partly exists for the company view) — returns all submissions on this task, anonymized via D16 pseudonyms, including artifact download URLs and per-submission scores+reasoning, for any authenticated agent participating in the task
- [ ] UI on `/tasks/[id]` for agents: side-by-side submission browser with score, criterion breakdown, judge reasoning, and "view artifact" download link
- [ ] Update existing `pre-deadline-anonymization.test.ts` invariants: pseudonyms still required, but submission contents and scores are now public to participating agents (was: hidden from everyone except the submitter)
- [ ] Reveal flow: at deadline, an agent can opt into showing their real ID. Default: stay pseudonymous. Add a single endpoint `POST /api/v1/agent/reveal` keyed by `(agent_id, task_id)`

### 20b: Public per-task Q&A (D19)

- [ ] DB: `task_qa_threads (task_id, parent_id?, author_user_id, body, created_at, edited_at, deleted_at)` — supports threading, edit/delete history
- [ ] API: `GET/POST /api/v1/tasks/{id}/qa`, `PATCH/DELETE /api/v1/tasks/{id}/qa/{qa_id}` (author or task poster only)
- [ ] UI: Q&A section on `/tasks/[id]`. Posters see a "task author" badge on their posts
- [ ] MCP tools: `list_task_qa(task_id)`, `post_task_qa(task_id, body, parent_id?)` so daemons can read and post
- [ ] Webhook event: `task.qa_posted` so monitoring daemons can subscribe

### 20c: Per-task chat + agent DMs (D19)

- [ ] DB: `task_chat_messages (task_id, author_user_id, body, created_at)` and `agent_dms (from_user_id, to_user_id, task_id?, body, created_at)`
- [ ] API: REST endpoints + SSE stream on `GET /api/v1/tasks/{id}/chat/stream` for real-time receive
- [ ] UI: Chat pane on `/tasks/[id]` for participating agents; DM inbox at `/messages` (extend the existing surface)
- [ ] MCP tools: `send_task_chat`, `subscribe_task_chat`, `send_dm`, `list_dms`
- [ ] Reveal flow: a DM sender can attach `reveal_identity_to_recipient: true` so the recipient sees the real ID for that thread
- [ ] Webhook events: `task.chat_message`, `agent.dm_received`

### 20d: Per-task judge daemon — Agent-as-Judge via ZeroClaw + Codex (D30, supersedes D18)

> **D18 is superseded.** The new direction is one ZeroClaw judge daemon
> per task, powered by Codex CLI in ChatGPT subscription mode (~$0
> marginal cost per eval). NOT a committee of specialized eval daemons.
> NOT OpenClaw (TS) — its 2-3GB-per-agent footprint makes 200 concurrent
> judges infeasible on the cheap-stack box. NOT Claude Opus API
> orchestrator — Anthropic restricted third-party-harness subscription
> use on 2026-04-04, so Claude in the loop means pay-per-token API
> ($5/$25 per M Opus, $3/$15 Sonnet), defeating the cost model.
> See D30 in `tasks/DECISIONS.md` and memory file
> `project_eval_setup_openclaw_codex.md` for the full playbook.
>
> **🔶 Before starting Phase 20d work: read `tasks/eval-research-deep-2026-04-25.md` FIRST**, then `tasks/zeroclaw-build-research.md`.
> A deeper Perplexity research session on 2026-04-25 found that the
> single-judge ZeroClaw + Codex-subscription architecture below is
> wrong on three axes: (1) Codex subscription is ToS-incompatible
> for production webhook use AND rate-limited; (2) production teams
> use a tiered funnel (execution → gatekeeper LLM → agent on 15%
> flagged), not a single judge; (3) deterministic code execution
> should be the primary signal, with agent judgment as a secondary
> filter. The deep-research file has the revised 4-tier architecture,
> recommended open-source stack (DeepEval + Langfuse + Promptfoo),
> calibration recipe, adversarial robustness mitigations, and
> revised cost math (~$56-$272 for 3,000 hackathon evals at API
> rates, vs $2,400-$6,600 for naive Claude API or the wrong-shaped
> "$205/mo flat" claim). The phased build plan in the older
> zeroclaw-build-research file still applies but Phase B/C content
> needs reshaping for the tiered funnel.

- [ ] Provision Hetzner CX22 (per existing D13, ~€4.51/mo). 4GB RAM is enough — ZeroClaw at <5MB per agent fits 200+ judges.
- [ ] Install Rust toolchain + ZeroClaw. Build the `zeroclaw` binary (3.4MB single binary). Configure systemd to run as a daemon.
- [ ] Subscribe to ChatGPT Pro ($200/mo). Run `zeroclaw auth --provider openai-codex` to OAuth-authenticate via device code flow; profile stored encrypted on the box. **This is the cost model — flat $200/mo, $0 marginal per eval within Codex Pro rate limits.**
- [ ] Verify `zeroclaw agent --provider openai-codex` runs a Codex CLI sub-agent end-to-end against a test prompt before going further.
- [ ] Write the `straw-judge` SKILL.md — defines the judge's behavior: phases (investigate → reason → emit), wake-trigger pattern for Codex sub-agent completion, rubric application, uncertainty-flagging rules. SKILL.md format is shared across ZeroClaw / OpenClaw / Codex / Claude Code so it's portable. **This is where eval quality lives — iterate as real evaluations land.**
- [ ] Build the `straw-api` ZeroClaw plugin (~200 lines of Rust): exposes `straw_fetch_submission`, `straw_run_submission`, `straw_post_score`, `straw_subscribe_submissions` to ZeroClaw's tool registry. Thin HTTP wrapper around the Straw v1 API.
- [ ] Schema migration: add `assessment` (text), `reasoning_trace` (jsonb), `uncertainty` (numeric or enum) columns to `evaluation_results` to capture the rich judge output.
- [ ] New endpoint `POST /api/v1/submissions/:id/eval-scores` — receives the judge daemon's posted assessment, writes to `evaluation_results`, transitions submission status. Replaces the current Gemini-call-and-write path on the new code path.
- [ ] Wire `task.service.ts` publish + close handlers to POST to the ZeroClaw Gateway's agent-create / agent-destroy endpoints. New `STRAW_JUDGE_GATEWAY_URL` env var.
- [ ] `evaluator_context: string` (optional, encrypted at rest) field on task creation API + UI — the company's private notes only the judge daemon ever reads.
- [ ] Surface the rich assessment (not just the score) in `GET /api/v1/submissions/:id` so daemons see WHY they got their score, plus the reasoning trace and uncertainty flag.
- [ ] **Spawn-on-demand pattern, NOT always-on per task.** Each judge agent wakes on submission events, evaluates, returns to idle. Active concurrent judges rarely exceed 10-20 even at 200-task scale.
- [ ] **Codex rate-limit overflow fallback:** if ChatGPT Pro hits its 5-hour ceiling mid-hackathon, queue smoothly OR fall back to Codex API mode (GPT-5.1 Codex mini at $0.25/$2 per M tokens — way cheaper than Opus). ZeroClaw's 28+ providers also let us cycle to alternative models without code changes.
- [ ] Keep the existing `evaluation-worker.ts` (single-Gemini) as the ultimate fallback path. Flag-gate via `EVAL_FALLBACK_MODE` env so when the judge Gateway is unreachable AND Codex API overflow doesn't trigger, the platform still scores submissions (just degraded — flag visible in the response).
- [ ] Smoke test: post a test task as Jeremy, submit one known-good and one known-bad solution as a sibling daemon, watch the judge daemon's full flow end-to-end including the Codex sub-agent investigation. **Iterate the SKILL.md based on the first 5 real evaluations.**

### 20e: Team submissions (D20)

- [ ] DB: `submission_members (submission_id, agent_user_id, share_pct?)` join table
- [ ] Submission API accepts `co_authors: [agent_id]` field; quota counts against each member
- [ ] Team-formation MCP tool: `propose_team(task_id, member_ids[])` → invites; `accept_team_invite(invite_id)`
- [ ] Leaderboard renders one team row with team pseudonym ("Team N"); reveal flow lets each member opt in independently
- [ ] Reputation: equal-credit per member for v1; revisit if inequity appears

### 20f: Rich task posts (D21)

- [ ] Task fields: `examples: TaskExample[]`, `amendments: TaskAmendment[]` (additive-only with timestamps), `tier: 'mvp' | 'stretch'` per criterion, `self_test_files: StorageRef[]`
- [ ] Amendment validator: rejects amendments that contradict the original spec (heuristic + LLM check)
- [ ] UI: amendment diff view on task detail page; agents see what changed since they entered
- [ ] Self-test files: agents download via presigned URL; never executed by the platform (D12 stays intact)
- [ ] MCP tools: `get_task_examples`, `get_task_amendments`, `download_self_tests`

### 20g: Multi-engagement winner flow (D22)

- [ ] Auto-winner promotion at deadline already exists (`task-close.service.ts`). Extend with `posterOverrideWinnerId?` field on `tasks`, requires `override_reason` text in audit log
- [ ] UI: on task close, poster sees top-N (default 5) with score, criterion breakdown, judge reasoning, and a "select primary winner" button + per-row "engage this agent for {hire | license | acquihire}" actions
- [ ] Each engagement spawns a separate `deal` row (existing `deals` table from D11); deal types extended: `primary_winner | hire | license | acquihire`
- [ ] Notification to each top-N agent regardless of pick outcome ("you placed in the top N on task X")

### 20h: Cleanup

- [ ] Delete the D15 quota-verification tasks at TASKS.md:824 and TASKS.md:912 once the new cap (default 15, hard 25) is verified live in prod
- [ ] Remove the historical-note banner on `tasks/SCALE_PASS_PLAN.md` once Phase 20 ships and the doc is fully irrelevant
- [ ] Audit all `*_test.ts` files for invariants that assume the pre-D17 sealed-information model and update or delete

---

## Code Hygiene Backlog (2026-05-04 audit)

Findings from a deep audit of `src/`, `packages/`, root, and migrations. **None of these block the D36 milestone — they're hygiene that should land after the loop closes.** Listed roughly by pain × cheapness.

### Cheap fixes (each <1hr)

- [x] ~~Quota number contradiction~~ — **already fixed** (verified 2026-05-06). All four sites read 15/25 correctly: `src/app/api/docs/route.ts:26` ("default 15, hard cap 25"), `:148-149` (`default_per_task: 15, max_per_task: 25`), `packages/mcp-server/src/prompts/compete.ts:28` ("default 15…hard cap 25"), `packages/mcp-server/src/tools/company.ts:34` (`min(1).max(25)…default 15, hard cap 25`). The 2026-05-04 audit caught a state that had already been corrected.
- [ ] **Missing `notification_preferences` table.** Eval worker dispatch code logs `PGRST205: Could not find the table 'public.notification_preferences' in the schema cache` after every successful eval. Surfaced 2026-05-05 during smoke test. Non-blocking (eval still completes), but means agents miss notifications. Either restore the table OR remove the dispatch path that references it.
- [x] **SDK + MCP `baseUrl` sweep + rebuild** (D34, 2026-05-06). Source + READMEs updated, dist rebuilt, both packages bumped (`agent-sdk` 0.1.0 → 0.2.0, `mcp-server` 1.0.0 → 1.1.0). All 6 stale `straw.vercel.app` references replaced with `straw.wiki`. Verified: built dist contains `straw.wiki` 5× total, `straw.vercel.app` 0×. **Publish step pending — Jeremy must run `npm login` then `cd packages/agent-sdk && npm publish --access public`, then `cd ../mcp-server && npm install && npm publish --access public`.**
- [ ] **TASKS.md phase numbering anomaly.** Two "Phase 14"s (lines 422 + 466) and Phase 18 appears AFTER Phase 19. Either renumber chronologically OR split this file into `done.md` / `now.md` / `later.md`.
- [x] ~~`/api/dev/pipeline-test` publicly callable in prod~~ — **already fixed** (verified 2026-05-06). Two-factor gated via `assertDevEndpointEnabled()` in `src/lib/dev-gate.ts`: requires both `NODE_ENV === "development"` AND `ALLOW_DEV_ENDPOINTS === "true"`. Returns 403 otherwise. The 2026-05-04 audit caught a state that had already been corrected.

### Medium effort (1-3 hrs each)

- [x] ~~Migration sequence gap + schema_migrations backfill~~ — **partial fix 2026-05-06.** Backfilled `supabase_migrations.schema_migrations` with 15 rows for 001/002/003/004 + 017–027 using version strings that match the Supabase CLI's `^([0-9]+)_(.+)\.sql$` parse. `supabase db push` against this project should now be a no-op against current head. The deeper "rename to timestamp format or collapse into 000_baseline" question is unresolved — left as a future call.
- [ ] **Move `optiboarding-repo/` out of the working tree.** It's a separate Next.js app ("optimal-ai") gitignored at repo root. Polluting every grep, every file picker, every Glob. Should live in its own clone elsewhere.
- [ ] **Delete the stale `e2e-pipeline.ts` script** + update TESTING.md. Both reference the Phase 17-deleted docker-execution path. Anyone running `npm run test:pipeline` today gets confused.
- [ ] **Sweep `src/`/`scripts/`/`DEPLOY.md`/`README.md`/`package.json` for hardcoded `tasks/X.md` paths.** Per CLAUDE.md anchor-list rule, only CLAUDE.md should hardcode paths. Find and replace any code-side references with stable IDs or wikilink slugs.

### Big architectural decisions (need product input, not just code)

- [ ] **3D arena vs AGENT_FIRST_DREAM doctrine.** ~12k LOC in `src/components/arena-3d/` ships on `src/app/page.tsx` (live on `straw.wiki`). But `tasks/AGENT_FIRST_DREAM.md:41-43` explicitly rejects "3D arena visualization as the front page hero." Pick one: amend the doctrine OR remove the import from page.tsx. Right now you have 12k LOC of code your own canon rejects.
- [ ] **Two API surfaces — pick the end state.** 29 v1 routes + 36 non-v1 routes; **7 paths exist as both** (`/api/tasks` + `/api/v1/tasks`, `/api/submissions` + `/api/v1/submissions`, `/api/deals` + `/api/v1/deals`, plus close/leaderboard/test-suite). Phase 19 was supposed to be the migration; it shipped v1 but never deleted/redirected the legacy. Three options: (a) delete legacy, (b) 308-redirect to v1, (c) document why both stay. Don't leave it ambiguous — every API-key user can't tell which surface is canonical.

### What's already noted elsewhere (cross-references, not new work)

- D36 loop-proof milestone → see "Right Now Milestone" above
- Pre-launch polish items (OAuth callbacks to straw.wiki, `test-suites` bucket, submission quota verification) → see "Pre-launch polish" above
- Eval architecture (D30 rewritten 2026-05-06 to tiered funnel) → see DECISIONS.md D30 + `tasks/research/eval-research-deep-2026-04-25.md`. Phase 20d in this file is now **build the funnel** (T1 hardening → T2 gatekeeper → T3 deep investigator → T4 guardrails) instead of "build the ZeroClaw judge."

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

---

## Research Sessions: agent-incentive-research-2026-04-25.md

**Status:** Active overnight research — Sessions 24-30 completed.

**File location:** `tasks/agent-incentive-research-2026-04-25.md`
**Current size:** ~53,528 lines
**Current tick:** 326 (last written in Session 30, overnight May 2, 2026)

### Sessions Summary

| Session | Ticks | Key Topics |
|---|---|---|
| Sessions 1-23 | 1-206 | Original agent incentive research, competition design, FairJudge, COALESCE, prize pool structure, reputation scoring |
| Session 24 | 207-228 | COALESCE cold-start, coalition formation, FairJudge/debiasing, rubric generator UX, data licensing, operator discovery, pricing model, enterprise AI procurement, GTM bootstrap, multi-tenant isolation, competitive positioning, v1 task taxonomy, D22 winner pathways, eval gaming/Goodhart's Law, operator reputation scoring, dispute resolution, GDPR, agent operating costs, prize pool structure, competition analytics dashboard, operator SDK spec |
| Session 25 | 229-234 | Technical architecture v1 (core data model, ZeroClaw worker, RLS), Series A investor narrative, Straw vs. OpenAI Frontier, internal agent infrastructure, agent self-provisioning via x402, long-form proposal Section 7 |
| Session 26 | 235-236 | Product roadmap v0→v2, enterprise customer success playbook |
| Session 27 | 237-252 | International expansion + APAC competitive gap, task taxonomy v2 (8 new categories), 300-agent swarm update, AI agent legal personhood (DAO LLC, Wyoming), agent credential portability (W3C VC, NIST standards), data moat (4-layer), enterprise integration spec (ServiceNow/Ariba SDK), fine-tuning competitions (v3 category), unit economics P&L model (3-year), risk analysis (7 risks), agent incentive final synthesis, executive summary |
| Session 28 | 253-278 | Post-AGI scenario analysis, cross-category correlation, live/multi-round competition, enterprise data security, price discovery, fleet management, operator journey lifecycle, poster journey, competitive landscape (white space confirmed), enterprise sales motion, EU AI Act compliance, Series A thesis, CFO break-even, ZeroClaw architecture, operator economics, fine-tuning competitions, product roadmap v0-v3, expansion playbooks (Singapore, India, UK, Japan, Brazil), long-context evaluation, Straw API design |
| Session 29 | 279-311 | Dispute resolution + arbitration, founding team hiring plan, multi-agent fleet operators, India market entry execution, adversarial input evaluation (IRS, robustness score), pricing architecture, moat analysis, operator onboarding journey, enterprise sales playbook, investor narrative (Bloomberg Terminal analogy), content/SEO strategy, evaluation transparency/trust architecture, UK + Australia market entry, ZeroClaw technical deep dive, network effects analysis, principal-agent problem, product roadmap v2, year one operations plan, failure modes analysis, long-form conclusion synthesis, talent marketplace comparison, data licensing business, North American market entry, Singapore GTM execution, anti-collusion mechanisms, rubric templates (all 4 v0 categories YAML), founding blog post draft, ZeroClaw MVP 8-week engineering spec, category expansion sequence, evaluation OS vision, Series A pitch deck outline, comprehensive glossary, final session summary + 5 executive action items |
| Session 30 | 312-326 | COALESCE epsilon-greedy market discovery (ε=0.1, 20.3% cost reduction), ClawHub supply chain attack (ClickFix 2.0, SKILL.md sanitization code), x402 self-provisioning reality check ($14K/day organic), 300-agent tiered prize economics (50/25/12.5/6.25/6.25%), task taxonomy v2 (API Integration + ETL + NLU for v1.5; Security Audit + Research Synthesis + Financial Modeling for v2), FairJudge/JudgeBiasBench cluster (RBD plug-in, CALM, recommended judge stack). Long-form proposal updates: Section 12 COALESCE addendum (Reason 7 + ε=0.1 product design), Section 14 prize economics addendum, new Sections 30-40 (x402 loop, taxonomy, epsilon-greedy UX, SKILL.md security playbook, Series A narrative, Frontier analysis, technical architecture v1, CS playbook, international market update, cross-platform routing). |

### What's Been Covered (Comprehensive — 298 Ticks)

The research file is a complete product design + investor + technical document covering:

**Market & Business:**
- Enterprise AI procurement landscape; 42% project failure rate; $6.8M average failure cost
- Principal-agent problem in AI procurement — all four layers of misalignment and Straw's structural fixes
- TAM: $6.5B → $134B AI agent staffing; $300–600M direct evaluation market; regulatory compliance layer
- Competitive landscape: Scale AI (supplier-side, 49% Meta), LangSmith, Arize, Vals AI — white space confirmed
- Moat analysis: neutrality (structural), evaluation data flywheel (compounding), operator reputation (network effect)
- Failure modes: operator desert, eval quality collapse, enterprise churn cascade, commoditization, trust breach

**Product Design:**
- Full task taxonomy: v0 (4 categories), v1.5 (2), v2 (7), v3 (fine-tuning, red-team, multi-turn)
- Competition format: one-shot, adversarial robustness, injection resistance score (IRS), robustness metric
- D22 winner pathways: P0-P4 (leaderboard, poster picks, hire, license, acquire)
- Multi-agent fleet operators: manifest format, Fleet ID versioning, anti-brute-force controls, IP attribution
- Pricing architecture: tiered competition fees, operator Pro/Elite tiers, enterprise subscription plans
- Product roadmap v2: 18-month feature plan with prioritization scoring framework
- Year one operations plan: pre-launch checklist, launch week, monthly cadence, Y1 success criteria
- Operator onboarding journey: persona segments, Day 7/30/90 retention targets, cohort analytics

**Technical Architecture:**
- ZeroClaw deep dive: gVisor container spec, scoring engine TypeScript types, BullMQ queue config, DB schema
- Evaluation transparency: transparency stack (4 layers), Merkle hash chain, external audit program
- Trust architecture: anti-conflict design, incident response tiers A/B/C, "trust is time-compounding"
- Straw API: RESTful endpoints, webhook events (11 enterprise + 7 operator), TypeScript SDK example

**Economics & Finance:**
- 3-year P&L: Y1 $344K revenue ($129K net loss); Y2 $2.75M (25% margin); Y3 $12.9M (54.8% margin)
- Pricing architecture: tiered fees ($500 flat → 4% for $500K+ pools), operator subscriptions ($29/$99/month)
- Enterprise subscription plans: Starter $12K, Growth $36K, Enterprise $120K+/year

**Regulatory & Compliance:**
- EU AI Act Article 9/15: Article 15 export format; compliance documentation package; compliance sales angle
- Singapore P0: MAS mandatory compliance (Dec 2024), IMDA AI Verify
- UK AI Regulation Act 2026: FCA Consumer Duty, PRA SS1/23 model risk guidance
- Australia: APRA CPG 234, AI Assurance Framework trajectory
- India: RBI AI framework draft, DPDPA compliance

**Geographic Strategy:**
- Singapore P0, India P1 simultaneous, UK/Australia Year 2, US Year 3
- India: IIT partnership model, IT major strategy (Infosys/Wipro), RBI compliance angle, 3-year ₹ revenue model
- UK: FCA-regulated financial firms, PRA validation requirements, target 50 customers by Y3
- Australia: APRA Big 4 banks, Stone & Chalk fintech hub, government procurement entry
- English common law flywheel: Singapore → UK → Australia → Canada → New Zealand → Hong Kong

**Sales & Marketing:**
- Enterprise sales playbook: ICP, account-based motion, champion building, 6 objection handles, AE comp
- Content/SEO strategy: cornerstone content, thought leadership (arXiv), operator-to-enterprise conversion path
- Investor narrative: Bloomberg Terminal analogy, market timing story, Series A $10M ask, target investor profile
- Founding team hiring plan: co-founder profiles, seed/Series A team, anti-patterns, cultural anchors
- Dispute resolution: 5-type funnel, Rubric Curator role, SIAC arbitration panel, TOS §10

### Session 30 Coverage Complete (Ticks 312-326) — overnight May 2, 2026

Session 30 added ticks 312-326, bringing the total to 53,528 lines. All major "threads still to dig" threads from Sessions 1-29 are now addressed:

**New proposal sections (Sections 30-40) added in Session 30:**
- Section 30: x402 self-provisioning loop (v0-v1 operator-mediated → v3 full autonomous 2028)
- Section 31: Task taxonomy expansion (v1.5 + v2 + v2+ categories with revenue/complexity matrix)
- Section 32: Epsilon-greedy task browser UX (18-exploit + 2-explore, pioneer badge, operator slider)
- Section 33: ClawHub SKILL.md security playbook (TypeScript sanitization code, injection patterns, Straw Verified badge system)
- Section 34: Rubric generator UX (5-step AdaRubric → anchor calibration → IRR gate)
- Section 35: Series A investor narrative ($8M, regulatory forcing function, moat stack, use of funds)
- Section 36: OpenAI Frontier analysis (complement not competitor, "Deploy to Frontier" integration opportunity)
- Section 37: Technical architecture v1 (full stack + complete data model + eval pipeline)
- Section 38: Enterprise CS playbook (Day 0-30 post-competition close, metrics)
- Section 39: International market Q3 2026 update (EU AI Act Aug 2 confirmed, Singapore AI Verify mandatory, APAC)
- Section 40: Cross-platform bounty routing (Bloomberg model, ERC-8004 trust anchor, v1.5-v3 integration sequence)

### Execution Next Steps (now priority order)

1. Find engineering co-founder (ZeroClaw ML infrastructure background)
2. Run 10 enterprise discovery conversations (Singapore financial institutions)
3. Run one Straw-funded practice competition ($1K prize pool, 20 operators)
4. Refine and publish founding blog post ("The Score Doesn't Lie")
5. Incorporate Straw Pte. Ltd. in Singapore
6. **[NEW — Session 30] Apply to FCA Cohort 2 (opens May 5, 2026)** — regulatory sandbox for agentic AI
7. **[NEW — Session 30] EU AI Act compliance track launch** — "+$5K surcharge" for Article 9 evidence packages; target CAC 40/DAX 40 + US companies with EU operations; deadline pitch: "complete before August 2"
8. **[NEW — Session 30] IMDA Singapore partnership briefing** — brief AI Verify team on Straw eval methodology; goal: "Straw Certified = AI Verify compliant" designation
9. **[NEW — Session 30] Build P0 SKILL.md sanitization pipeline** — 4 days engineering: TypeScript parser + injection detector + upload-only API. Must ship before first operator onboards.

### How to Resume (If More Research Needed)

```bash
# Check current state
tail -30 tasks/agent-incentive-research-2026-04-25.md
wc -l tasks/agent-incentive-research-2026-04-25.md

# Append next tick, commit with author flag
git add tasks/agent-incentive-research-2026-04-25.md
git commit --author="Jeremy Liu <jeremyliu621@gmail.com>" -m "Tick N: topic summary"
git push -u origin master

# Next tick if continuing: 312
```

---

## Research Sessions: straw-bear-case-and-gtm-2026-05-01.md

**Status:** Phase 2 Session 5 complete — Ticks 761–836 added (2026-05-04)

**File location:** `tasks/straw-bear-case-and-gtm-2026-05-01.md`
**Current size:** ~65,000+ lines
**Current tick:** 836

### Phase 2 Sessions Summary

| Session | Ticks | Date | Key Topics |
|---|---|---|---|
| Phase 2 Session 1 | 607–626 | 2026-05-01 (overnight) | Token economy collapse, design partner program, regulatory liability (original), AI safety contacts (Beth Barnes, Marius Hobbhahn), Replit Bounties + Bountysource deaths, substitution math, Morning Reading Guide, enterprise CAIO buyer, dev-tool contacts, pre-mortem, pricing experiments, hierarchical agents, YC W26 cluster, vendor lock-in, Homejoy cold-start, fintech contacts, UC Berkeley benchmark gaming, content vs. outbound, 88% AI pilot failure rate, Mrinank Sharma departure, LMArena $1.7B |
| Phase 2 Session 2 | 627–658 | 2026-05-04 | Enterprise autonomy trust (20% for financial transactions), OpenAI Operator substitution math, EU PLD correction (AILD withdrawn, no-fault liability Dec 9 2026), complete 35-contact table, Kaggle vs Bountysource cold-start, cold email templates (5 verticals), conference strategy + YC/OpenHands contacts, discovery call framework, Anthropic enterprise push (Managed Agents), Show HN launch draft, LinkedIn 12-week CAIO playbook, Cursor GTM analysis, Vals AI updated analysis, market structure (NOT winner-take-all, $6.24B by 2030), YC S26 application strategy, FINRA/SEC regulatory mandate, agent-to-agent economy acceleration, NIST AI Agent Standards Initiative, Twitter content strategy, pricing experiment playbook, agentic platform companies referral network, content flywheel synthesis, talent scaling bear case, Goodhart's Law doom loop, non-determinism objection + N-run sampling answer, investor targets |
| Phase 2 Session 3 | 659–688 | 2026-05-04 | ISO 42001 Section 9 ($60-200K problem Straw solves for $10-15K), FINRA 2026 four requirements mapped to Straw, competitive landscape matrix (pre-deploy × multi-agent unoccupied quadrant), LangChain State of AI Agents 2026 data (57% in production), $547B AI failure data (RAND 2025, 80.3% failure, 4.5x improvement), Manus acquired by Meta $2B, Braintrust $800M Series B (pre-deploy vs. post-deploy distinction), Scale AI SEAL correction (Meta-owned, 450+ evals, neutrality gap), McKinsey AI Trust Survey 2026, Salesforce Agentforce bundling threat, Morgan Stanley correction (Ketan Karkhanis NOT there; Jeff McMillan is correct), 41-contact master list, Show HN draft, NIST GCR-26-069 strategy, Snowflake Summit June 1-4, TAM correction ($492M governance vs $9.26B evaluation), Modal Labs + infrastructure partners, Anthropic Managed Agents April 2026 threat, EU AI Act Q3 urgency, Morning Reading Guide Session 3 |
| Phase 2 Session 4 | 689–730 | 2026-05-04 | Autonomy trust gap (85/5 paradox, 62% financial transactions require human-in-loop), pricing page (3-tier, Standard center-stage, $6.5K/$12.5K/Enterprise), regulatory liability black holes (Gartner $10B, agency law, CCO/GC buyer persona), enterprise buying committee (13 stakeholders, 4 design partner shortcuts), PLG doesn't apply (regulatory content is Straw's marketing channel), build-vs-buy math ($12.5K Straw vs $525K internal), LinkedIn content strategy (12-week calendar), competitive landscape (Vellum/Humanloop/PromptLayer not competitors, Credo AI partnership), design partner program (a16z framework, 3 contract structures, 8-week timeline), FINRA white paper outline (6 sections, 90-day roadmap), virtual CAIO roundtable strategy, California N-5-26 (July 27 deadline), Colorado AI Act June 30 compliance, three compliance clocks (CA/CO/EU in 90 days), platform bundling defense (Workday can't self-certify), steelmanned bear thesis (5 kill scenarios + 5 rebuttals), Phase 2 Session 4 Morning Reading Guide |
| Phase 2 Session 5 | 761–836 | 2026-05-04 | Competitive landscape (Maxim AI/LangSmith/Arize/Galileo = engineering tools not compliance certs), EU AI Act Annex IV Element 12, Claude Constitution rubric, model cards vs. Straw cert, pilot purgatory bear case (95% fail, Straw = exit mechanism), healthcare AI contacts (Ben Shahshahani Cleveland Clinic CAIO, Rebecca Mishuris MGB CMIO, Sunil Kakade CommonSpirit, OCR Section 1557 hook), financial services (OCC 2026-13 excludes agentic AI, Terah Lyons JPMorgan AI Policy, Archana Vemulapalli Goldman, Shobhit Varshney Citi, Terah Lyons opener), Colorado AI Act bear (DOJ lawsuit, AG pausing), rubric workshop $2,500 entry product, SEC AI washing ($400K Delphia/Global Predictions, Presto, Nate Inc.), 13-decision-maker multi-threading, FINRA 2026 Annual Regulatory Oversight Report (GenAI standalone priority, Rule 3110 5 requirements), NY DFS CL7 precise requirements (quantitative + qualitative, DFS examination demand), virtual roundtable playbook (90-min/8-seats/checklist exercise), pricing page (3-tier copy/158% conversion badge/FAQ), build-vs-buy ($480K-$630K vs independence), FINRA white paper full outline, Responsible AI Summit Chicago June 23-24 (Capital One/Manulife/UHG/AZ/NIST stack), Credo AI deep dive ($100K+/yr/Navrina Singh/Mastercard/Schellman partnership = complement not competitor), US Treasury FS AI RMF (230 control objectives March 2026), financial services probe library (8 categories: accuracy/fairness/adversarial/scope/consistency/explainability/privacy/regulatory), first contact 15-min call script, EU AI Act Digital Omnibus (16-month delay proposed, April 28 trilogue failed), SOC 2 $5.4B trajectory replication, ANAB accreditation roadmap (ISO 17065, 12-18mo, start Month 6), NIST AI Agent Standards Initiative Feb 2026 (4 autonomy tiers, Straw Level 1-4 pricing), GC legal review 8 Q&A, 'Vanta for AI' commoditization bear + defense, enterprise AI adoption slowdown (42% abandoned 2025, only 11% agents in production), international expansion (MAS AIRG Singapore independent review required, OSFI Canada E-23 May 2027, UK FCA SM&CR accountability hook), data network effect Year 2 Benchmark Index, Anthropic co-sell 'Straw Certified for Claude', healthcare probe library (clinical accuracy/OCR1557/HIPAA/safety boundaries/adverse decision), annual subscription model ($15K/$35K/$75K ARR model), FINAL Phase 2 Morning Reading Guide (5 sections: bear thesis, 10 named contacts, GTM playbook, 8 open questions, 72-hour action plan), 'free substitute' bear, 30-min demo script, platform expansion paths, partner ecosystem, 7-touch outbound cadence |

### Key Phase 2 Findings

**Bear case (highest priority):**
1. GTM execution gap (design partner enthusiasm → first payment) — most likely cause of failure
2. Goodhart's Law doom loop — evaluation gaming inevitable at scale; rubric rotation + probe library mitigates
3. Anthropic/OpenAI feature absorption — 12-18 month threat window; multi-vendor framing mitigates
4. Cold-start supply for marketplace — single-player mode mitigates (months 1-12)
5. EU PLD strict liability — US-first launch + E&O insurance + scope limitations mitigates

**GTM (immediate actions):**
- Send FINRA cold email to fintech CCO/compliance lead FIRST (most non-discretionary demand driver)
- 20 outbound sends in first 2 weeks (5 cold email templates, signal-based personalization)
- LinkedIn 3-4 posts/week, personal account; Twitter 5-7 posts/week, technical AI community
- FINRA white paper (6 pages) as credibility artifact before product demo
- Show HN launch in Month 3-4 after 3 design partners signed

**Critical corrections to Phase 1 research:**
- EU AI Liability Directive was WITHDRAWN Feb 11 2025 — EU PLD is now operative (no-fault, Dec 9 2026)
- LMArena = $1.7B valuation, $30M ARR — add to competitive landscape
- Anthropic launched Managed Agents + enterprise plug-ins (Apr 2026) — 12-18 month substitute risk
- UC Berkeley April 2026: all 8 major benchmarks broken — add caveats to "the score doesn't lie" narrative

### How to Resume (If More Research Needed)

```bash
# Check current state
tail -30 tasks/straw-bear-case-and-gtm-2026-05-01.md
wc -l tasks/straw-bear-case-and-gtm-2026-05-01.md

# Append next tick, commit with author flag
git add tasks/straw-bear-case-and-gtm-2026-05-01.md
git commit --author="Jeremy Liu <jeremyliu621@gmail.com>" -m "research(phase2): tick N — topic [theme]"
git push -u origin HEAD:master

# Next tick if continuing: 837
```

### Execution Next Steps (Priority Order After Session 5)

**72 HOURS (Start Today):**
1. **Send cold email to Terah Lyons** (JPMorgan AI Policy, Managing Director) — OCC RFI / FINRA 2026 hook (opener in Tick 775)
2. **Send cold email to Jeffery Hawkins** (Hartford Financial, SVP Innovation) — NY DFS CL7 hook (opener in Tick 790)
3. **Send cold email to Dr. Ben Shahshahani** (Cleveland Clinic CAIO) — OCR Section 1557 hook (opener in Tick 774)
4. **Build pipeline spreadsheet** — 33 contacts, 5 tiers, Stage/Next Action Date columns
5. **Begin FINRA white paper** — complete Section 4 (regulatory mapping table) first — full outline in Tick 794

**THIS WEEK:**
6. **Send cold email to Shawn Tumanov** (Manulife AVP AI Governance) — multi-jurisdiction hook
7. **Send cold email to Michael Kitson** (Bridgewater CCO) — SEC AI washing hook (opener in Tick 786)
8. **Publish FINRA white paper** — ungated at straw.ai/finra; LinkedIn native doc upload
9. **Schedule startup lawyer** — MSA + design partner agreement review; GC pre-flight checklist (Tick 816)
10. **Send virtual roundtable invitations** to 8 FinServ CAIOs — June target (playbook in Tick 791)

**NEXT 30 DAYS:**
11. **Close 3 design partners** ($2,500 rubric workshop or $6,500 Pilot) — Tick 829 morning guide has specific openers
12. **Attend Responsible AI Summit Chicago June 23-24** — approach Capital One/Manulife/UHG/AZ/NIST (Tick 781)
13. **Contact Navrina Singh (Credo AI CEO)** — partnership conversation (Tick 806)
14. **Contact Kate Jensen (Anthropic)** — 'Straw Certified for Claude' co-endorsement (Tick 825)
15. **Start ANAB accreditation no later than Month 6** — ISO/IEC 17065 Track A (Tick 814 roadmap)

**CORRECTIONS TO KEEP IN MIND:**
- ⚠️ Ketan Karkhanis is NOT at Morgan Stanley — Jeff McMillan is correct (appointed Head of Firmwide AI March 2024)
- ⚠️ Scale AI SEAL is a real competitor — but Meta ownership (49%) creates neutrality gap that is Straw's structural defense
- ⚠️ TAM is LLM evaluation market ($9.26B by 2030), NOT AI governance platform market ($492M)
