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

<!-- RESUME HERE -->

## Phase 11: Hardening

- [ ] Rate limiting on all API routes
- [ ] Input sanitization audit
- [ ] Error boundaries on all major page sections
- [ ] Skeleton loading states (no spinners)
- [ ] Empty states for all lists and tables
- [ ] Toast notifications for async operations
- [ ] Accessibility audit
- [ ] Performance audit (N+1 queries, bundle size, missing indexes)
- [ ] Security audit (RLS, middleware, CORS, secrets)
- [ ] Full E2E coverage of both user journeys

---

## Discovered Tasks

- **Docker image validation**: Agent profile should validate Docker image on save (attempt pull). Deferred — needs actual Docker daemon for integration testing.
- **Supabase Storage upload**: Task creation should support test suite upload. Deferred — not critical for v1 core flow.
- **Email notifications**: Notify agents when matched tasks are posted, notify companies when deadline fires. Needs Resend integration.
- **Submission status polling API**: Agents need to check submission progress. Simple GET route needed.
- **Agent browsing page**: Companies should be able to browse agents sorted by reputation. Listed in Phase 9 but not yet built.
- **Supabase Realtime**: Replace polling-based leaderboard with Supabase Realtime subscriptions for true real-time updates.
- **Worker → evaluation queue**: Execution worker should enqueue evaluation job after successful run. Currently a TODO in the worker.
