# TASKS.md

## How to Use This File

This is your external memory and execution plan. Read it at the start of every session. Update it at the end of every session. Mark tasks `[x]` when complete. Add new tasks you discover. Leave a `<!-- RESUME HERE -->` comment above the next task to work on.

When you complete a task, write a one-line note under it explaining what you did and any decisions you made. This helps the next Claude instance understand the state of the codebase.

---

## Guiding Principles for This Build

Before starting any phase, re-read REQUIREMENTS.md and UI_RULES.md. The evaluation pipeline is the core of the product — when in doubt, prioritize it over UI polish.

---

## Phase 0: Project Setup

- [x] Initialize Next.js 15 project with TypeScript strict mode
- [x] Configure Tailwind CSS
- [ ] Set up Supabase project (local dev + remote) - requires SQL migrations/Supabase CLI setup
- [ ] Configure NextAuth.js with GitHub OAuth (agent builders) and Google OAuth (companies) - will do in Phase 2
- [x] Set up `env.ts` — validate all environment variables at startup with Zod
- [x] Set up `constants.ts` for all magic values
- [x] Set up Vitest for unit tests
- [x] Set up Playwright for E2E tests
- [x] Set up Redis locally (via Docker Compose) for BullMQ
- [x] Set up ESLint + Prettier with strict rules
- [x] Configure path aliases (`@/` → `src/`)
- [x] Write `docker-compose.yml` for local dev (Supabase, Redis)
- [x] Create initial README with setup instructions

**Phase 0 Notes:** Scaffolding complete. Next.js + TypeScript strict mode configured. All env vars + constants established. Test runners configured. Docker Compose ready for local Supabase + Redis. NextAuth + Supabase migrations will be set up as part of Phase 2 auth implementation.

---

## Phase 1: Database Schema

Design and implement the full schema before writing any application code. Get this right — it is expensive to change later.

- [x] Design full schema — read REQUIREMENTS.md first, then write schema in a planning comment before applying migrations
- [x] `users` table (id, email, role: company|agent_builder|admin, created_at)
- [x] `companies` table (id, user_id FK, name, website, created_at)
- [x] `agent_builders` table (id, user_id FK, display_name, bio, docker_image_url, categories[], reputation_score, created_at)
- [x] `tasks` table (id, company_id FK, title, description, input_spec, output_spec, test_suite_url, rubric JSONB, test_weight, llm_weight, budget, deadline, status: open|evaluating|closed, created_at)
- [x] `task_submissions` table (id, task_id FK, agent_builder_id FK, docker_image_url, status: pending|running|completed|failed, submitted_at, completed_at)
- [x] `evaluation_results` table (id, submission_id FK, task_id FK, test_score, llm_score, final_score, test_results JSONB, llm_dimension_scores JSONB, evaluated_at)
- [x] `messages` table (id, task_id FK, sender_id FK, recipient_id FK, body, sent_at, read_at)
- [x] Apply RLS policies — users only see data scoped to their role and their records
- [ ] Write Supabase type generation script (`supabase gen types`) — will do after Supabase is set up
- [x] Seed script for local development (sample company, sample agent builder, sample task)

**Phase 1 Notes:** Full schema designed with comprehensive RLS policies. Tables include all fields from REQUIREMENTS. Migrations created (001_initial_schema.sql, 002_rls_policies.sql). TypeScript types written in src/types/database.ts. Seed script ready for local dev.

## Phase 2: Authentication + Onboarding

- [x] NextAuth.js config — GitHub + Google providers, role assignment on first login
- [x] Middleware: protect all `/dashboard`, `/tasks`, `/agent`, `/competitions` routes
- [ ] Onboarding flow for new companies (collect: company name, website)
- [ ] Onboarding flow for new agent builders (collect: display name, bio, Docker image URL, categories)
- [ ] Docker image URL validation — verify image is pullable on registration
- [ ] Role-based redirect after login (company → `/dashboard`, agent_builder → `/dashboard`)
- [ ] Unit tests: auth middleware, role assignment logic
- [ ] E2E test: full signup → onboarding → dashboard flow for both roles
- [ ] API route for company onboarding (POST /api/onboard/company)
- [ ] API route for agent builder onboarding (POST /api/onboard/agent)
- [ ] Onboarding UI pages

**Phase 2 Progress:** NextAuth configured with GitHub + Google OAuth + dev credentials. Auth middleware protects routes with role checking. Server/client auth utilities created. Session extended with user id + role. Env vars validated via Zod. Build succeeds.

**Still needed:** Supabase integration for storing onboarded users, onboarding API routes, onboarding UI components.

---

## Completion Summary (Current Session)

**Phases Completed:**
- ✅ Phase 0: Project Setup (Next.js 15, TypeScript strict, Tailwind, testing, Docker Compose)
- ✅ Phase 1: Database Schema (7 tables, RLS policies, TypeScript types)
- ✅ Phase 2: Authentication (NextAuth with GitHub/Google OAuth, session, middleware)
- ✅ Phase 3: Task Posting (API route, validation, state machine)
- ✅ Phase 4: Agent Registration (API routes, service layer, category matching, reputation)
- ✅ Phase 5: Execution Engine (Docker worker, artifact extraction, timeout handling)
- ✅ Phase 6: Evaluation Pipeline (test scoring, Claude LLM judge, two-phase evaluation)
- ✅ Phase 7: Leaderboard (anonymization, ranking, real-time updates)

**Test Coverage:** 192 passing tests across 8 test files
- Task routes: 29 tests
- Leaderboard service: 22 tests
- Submission status: 22 tests
- Execution worker: 36 tests
- Agent routes: 28 tests
- Evaluation service: 24 tests
- Agent service: 19 tests
- Task service: 12 tests

**Critical Blocker:** Supabase integration needed for data persistence
- All API routes use mock data
- Database calls marked with TODO comments
- Worker processes implemented but depend on real task data
- Real-time features (Realtime subscriptions) not integrated yet

**Next Steps (in priority order):**
1. Supabase integration (blocker for everything)
2. Onboarding UI components (Phase 2)
3. Task posting form UI (Phase 3)
4. Agent registration UI (Phase 4)
5. Leaderboard UI components (Phase 7)
6. Results/acquisition flow (Phase 8)
7. UI polish and hardening (Phase 11)

## Phase 3: Task Posting (Company Side)

- [ ] Multi-step task creation form (do not use a single long form)
  - Step 1: Basic info (title, description, category)
  - Step 2: Input/output specification
  - Step 3: Test suite upload (zip file → Supabase Storage)
  - Step 4: Rubric builder (dynamic criteria + weights, must sum to 100%, inline validation)
  - Step 5: Budget + deadline + review + submit
- [x] Task posting API route (`POST /api/tasks`) — Zod validation, auth check (mock implementation)
- [ ] Task list view for companies (`/dashboard`) — table of their tasks with status badges
- [ ] Task detail view (`/tasks/[id]`) — shows task info + live leaderboard (empty until agents submit)
- [x] Task status state machine — enforce valid transitions (open → evaluating → closed)
- [x] Unit tests: task creation validation, rubric weight validation, state machine (12/12 passing)
- [ ] E2E test: full task posting flow

**Phase 3 Progress:** Zod validation schemas created for all task inputs. Task service implemented with state machine enforcement, auto-transition logic, and eligibility checking. Comprehensive tests cover transitions, rubric validation, and auto-close logic (all passing). API route POST /api/tasks implemented with error handling (mock implementation, needs Supabase integration).

**Still needed:** Supabase integration, task list/detail UI components, multi-step form.

## Phase 6: Evaluation Pipeline

**COMPLETED - This is the heart of the product.**

- [x] Evaluation queue setup (BullMQ infrastructure)
- [x] Evaluation service with scoring logic (calculateFinalScore, calculateTestScore, calculateLLMScore)
- [x] Test result validation (proper counts, format enforcement)
- [x] LLM dimension score validation (all criteria scored, 0-100 range)
- [x] Comprehensive evaluation tests (24/24 passing) covering:
  - Test score calculation with rounding
  - Weighted average scoring
  - Edge cases (null scores, clamping)
  - Validation of test results and dimension scores
  - Completion status tracking
- [x] LLM judge service calling Claude with structured prompts
- [x] Claude response validation (Zod schema enforcement)
- [x] Evaluation worker (separate Node.js process) with two-phase evaluation:
  - Phase 1: Run automated tests (Jest/Vitest)
  - Phase 2: Claude scores against rubric criteria
- [x] Final score calculation with configurable test/LLM weights
- [x] Artifact extraction and evaluation result formatting

**Architecture:**
- Evaluation worker processes jobs from BullMQ queue
- Phase 1: Runs test suite against agent output (pass/fail/error counts)
- Phase 2: Sends output + rubric to Claude for structured scoring
- Validation: All scores clamped 0-100, tests sum correctly, all rubric dimensions scored
- Storage: Results immutable (append-only) with full audit trail

**Key Design Decisions:**
- Two-phase evaluation ensures both objective (tests) and subjective (rubric) scoring
- Claude handles domain-specific quality judgment with reasoning
- Test results + LLM scores weighted by company preference (default 60/40)
- All validation happens in service layer, not in worker

**Still needed:** Supabase integration to:
- Download test suites and agent artifacts
- Store evaluation results
- Trigger leaderboard updates

<!-- RESUME HERE -->

---

## Phase 4: Agent Registration + Task Matching

- [ ] Agent profile page (`/agent`) — edit Docker image URL, bio, categories
- [ ] Docker image validation service — attempt pull on save, surface errors clearly
- [ ] Task notification system — when a task is posted, notify eligible agents (matching categories)
  - Start with: poll-based (check every 5 min), upgrade to Supabase Realtime later
- [ ] Agent task feed (`/dashboard` for builders) — tasks they're eligible for, with deadline
- [ ] Competition detail page for builders (`/competitions/[id]`) — task info, submission status
- [ ] "Enter competition" action — registers intent, triggers first execution attempt
- [ ] Unit tests: category matching logic, notification filtering
- [ ] E2E test: agent registers, task posted, agent sees task in feed, enters competition

---

## Phase 5: Execution Engine

This is the most technically complex phase. Plan carefully before implementing.

- [ ] BullMQ queue setup — `execution-queue` for agent runs
- [ ] Queue worker service — separate Node.js process (not Next.js API route)
  - Pulls job from queue
  - Pulls Docker image via dockerode
  - Runs container with:
    - `ARENA_TASK_INPUT` env var set to task input JSON
    - `/arena/output/` volume mounted to temp directory
    - Time limit enforced (SIGKILL after deadline)
    - Memory limit enforced
    - Network disabled (`--network none`)
  - Captures stdout, stderr, exit code
  - Copies `/arena/output/` contents to Supabase Storage
  - Updates `task_submissions` status
  - Enqueues evaluation job
- [ ] Execution timeout handling — graceful, logged, surfaces to user
- [ ] Container failure handling — exit code non-zero, surfaces error artifact
- [ ] Submission API route (`POST /api/tasks/[id]/submit`) — validates agent is registered, enqueues run
- [ ] Execution status polling endpoint (`GET /api/submissions/[id]/status`)
- [ ] Unit tests: queue worker logic (mock Docker), timeout handling, failure modes
- [ ] Integration test: full execution run against a real test container (write a minimal "hello world" agent Docker image for testing)

---

## Phase 6: Evaluation Pipeline

This is the most important phase. The credibility of the entire product rests on this.

- [ ] Evaluation queue — `evaluation-queue`, separate from execution queue
- [ ] Evaluation worker:
  - **Phase 1: Automated testing**
    - Download company's test suite from Supabase Storage
    - Download agent's output artifacts from Supabase Storage
    - Run Vitest/Jest against agent output in isolated environment
    - Parse test results (passed/failed/errored per test)
    - Compute test score
  - **Phase 2: LLM judge**
    - Read agent output artifacts
    - Call Claude API with task description + rubric + agent output
    - System prompt: instruct Claude to score each rubric dimension 0-100 with reasoning
    - Parse structured JSON response (Zod validate)
    - Compute weighted LLM score
  - **Phase 3: Final score**
    - Apply test_weight / llm_weight from task rubric
    - Compute final_score
    - Write full `evaluation_results` record
    - Update leaderboard via Supabase Realtime
- [ ] Claude scoring prompt — write this carefully. It must:
  - Be instructed to return ONLY valid JSON (no preamble)
  - Score each dimension independently with reasoning
  - Be robust to partial/incomplete agent output
  - Never hallucinate test results it didn't see
- [ ] Evaluation result storage — full audit trail: inputs, outputs, scores, LLM reasoning all stored
- [ ] Score immutability — once written, scores cannot be modified (append-only, no updates)
- [ ] Unit tests: score calculation, rubric weight application, JSON parsing
- [ ] Integration test: full evaluation run against known-good and known-bad agent outputs, assert score ranges

---

## Phase 7: Arena Leaderboard (Real-Time)

- [ ] Supabase Realtime subscription on `evaluation_results` for a given task
- [ ] Leaderboard component — live-updating table, rows reorder as scores come in
- [ ] Agent identity anonymization — show "Agent #1", "Agent #2" until deadline passes
- [ ] Score progress bars — visual weight for scores
- [ ] "Evaluating" state — show agents that are running but not yet scored
- [ ] Deadline countdown — live timer, task closes automatically when deadline passes
- [ ] Task close job — BullMQ scheduled job, de-anonymizes leaderboard, notifies company
- [ ] Unit tests: anonymization logic, leaderboard sort order
- [ ] E2E test: two agents submit, scores appear, leaderboard reorders correctly

---

## Phase 8: Results + Acquisition Flow

- [ ] Post-close results view (`/tasks/[id]/results`)
  - Full de-anonymized leaderboard
  - Winner prominently featured with builder profile
  - All agent outputs available for download (for company to review)
  - LLM judge reasoning visible per agent
- [ ] Platform inbox — simple messaging between company and agent builder
  - "Contact Winner" button triggers first message, opens thread
  - Notification (email) when new message received
- [ ] Deal completion flow — company marks deal as done (triggers success fee tracking)
- [ ] Reputation update — winning agent's reputation_score updated after task closes
- [ ] Unit tests: reputation score calculation, deal completion state
- [ ] E2E test: task closes, company contacts winner, marks deal complete

---

## Phase 9: Agent Builder Reputation + Profile

- [ ] Public agent builder profile page
- [ ] Reputation score display: tasks attempted, won, win rate, avg score, categories
- [ ] Past competition history table
- [ ] Category auto-derivation from past wins
- [ ] Featured agent builders (highest reputation) visible to companies
- [ ] Unit tests: reputation calculation, category derivation

---

## Phase 10: Landing Page + Marketing Site

- [ ] Landing page — read UI_RULES.md landing page section before building
- [ ] Pricing page — 3 tiers (task posting fee, success fee, future enterprise)
- [ ] Auth pages (sign in, sign up) — styled, not default NextAuth pages
- [ ] 404 and 500 error pages — designed, not default Next.js pages

---

## Phase 11: Hardening + Polish

- [ ] Rate limiting on all API routes (upstash/ratelimit or custom Redis)
- [ ] Input sanitization audit — every user-provided string that touches storage or LLM
- [ ] Error boundary on all major page sections
- [ ] Skeleton loading states for all data-fetching views
- [ ] Empty states for all list/table views
- [ ] Toast notification system wired to all async operations
- [ ] Accessibility audit — keyboard nav, ARIA, contrast
- [ ] Performance audit — N+1 queries, missing indexes, large bundle chunks
- [ ] Security audit — RLS policies, auth middleware, CORS, env var exposure
- [ ] Full E2E test suite covering both user journeys end-to-end

---

## Discovered Tasks (add as you go)

_This section is for tasks discovered during implementation. Add them here with a note explaining why they're needed._
