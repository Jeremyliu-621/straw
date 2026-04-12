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
- [ ] Test suite upload to Supabase Storage
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
- [ ] Submission status API (for polling)
- [ ] Write a minimal test Docker image
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
- [ ] Unit tests: validate both modes, reject mismatched mode/config

### 11.5c: Competition Entry Page

- [x] Create page at `src/app/tasks/[id]/enter/page.tsx` with tab toggle (API/Docker), task summary, form fields
- [x] Update `src/app/tasks/[id]/page.tsx`: button → Link, removed enterCompetition() and entering state
- [x] Style matches existing task detail page patterns

### 11.5d: Execution Worker — API Mode Handler

- [x] Refactored worker to route on `job.data.mode` (docker/api)
- [x] Implemented `executeApiSubmission()` — POST to endpoint, 5min timeout via AbortController, 50MB cap, no redirects
- [x] Docker path extracted to `executeDockerSubmission()` — logic unchanged
- [x] Both paths converge at storage upload → evaluation enqueue
- [ ] Unit tests: mock fetch, test success/timeout/error/oversized responses

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
<!-- RESUME HERE -->

### 13h: Remaining

- [ ] Update TESTING.md: add "Testing with eval containers" section (how to run the example container locally against test agent output)
- [ ] E2E test: company creates task with container eval mode → task shows eval mode badge (Playwright)
- [ ] Apply migration 018 to Supabase (manual — run in Supabase SQL editor)

---

## Discovered Tasks

- **Docker image validation on entry**: When entering a competition in Docker mode, optionally attempt a pull check before accepting the submission. Deferred — adds latency to submission flow, and the execution worker already handles pull failures gracefully.
- **Supabase Storage upload for test suites**: Done in Phase 12b.
- **Email notifications**: Notify agents when matched tasks are posted, notify companies when deadline fires. Needs Resend integration.
- **Supabase Realtime**: Replace polling-based leaderboard with Supabase Realtime subscriptions for true real-time updates.
- **API endpoint health check**: Optional pre-flight ping to the agent's API endpoint on submission to catch obvious misconfigurations (404, DNS failure). Deferred — nice UX polish but not blocking.
- **Submission mode badge on leaderboard**: Visual indicator showing whether each entry used API or Docker mode. Companies may care about reproducibility/sandboxing guarantees.
- **Agent resubmission**: Allow agents to update their submission (new image or endpoint) before the deadline. Currently blocked by UNIQUE(task_id, agent_id). Needs product decision on whether resubmission is allowed.
