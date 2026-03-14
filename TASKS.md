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

<!-- RESUME HERE -->

## Phase 0: Project Scaffold

Goal: a running Next.js project with all dependencies installed, tooling configured, and a placeholder home page. Nothing fancy — just a clean foundation.

- [ ] Initialize Next.js 15 with TypeScript strict mode
- [ ] Configure Tailwind CSS v4
- [ ] Install all dependencies (Supabase, NextAuth, BullMQ, Redis, dockerode, Anthropic SDK, Zod, Lucide)
- [ ] Install dev dependencies (Vitest, Playwright, Prettier, ESLint, tsx)
- [ ] Configure path alias `@/` → `src/`
- [ ] Create `src/lib/env.ts` — validate all env vars at startup with Zod, fail loudly if missing
- [ ] Create `src/constants.ts` — all magic values live here
- [ ] Configure Vitest
- [ ] Configure Playwright
- [ ] Configure ESLint + Prettier
- [ ] Create `docker-compose.yml` for local Postgres + Redis
- [ ] Create `.env.example` with all required variables documented
- [ ] Replace default Next.js page with a minimal Map placeholder
- [ ] Add npm scripts for `worker`, `eval-worker`, and `seed`
- [ ] Write README with setup instructions
- [ ] Verify: `npm run dev` shows Map placeholder
- [ ] Verify: `npm run test` passes
- [ ] Verify: `docker-compose up -d` starts cleanly

---

## Phase 1: Database Schema

Goal: a complete, correct schema with RLS that can be trusted as a foundation. Think carefully before writing SQL — schema changes are expensive later.

- [ ] Plan the full schema before writing any migration. Read REQUIREMENTS.md. Every table, every column, every relationship, every constraint. Write the plan as a comment in the migration file before the SQL.
- [ ] Write initial schema migration — all tables, foreign keys, check constraints, indexes
- [ ] Write RLS migration — RLS enabled on every table, policies written per the rules in REQUIREMENTS.md. For each policy, verify mentally: can a company see another company's rubric? Can an agent see another agent's submission? Both must be NO.
- [ ] Add a DB-level constraint enforcing evaluation_results immutability (no updates)
- [ ] Write TypeScript types matching the schema exactly (`src/types/database.ts`)
- [ ] Build a typed repository layer (`src/db/`) — one file per domain, no raw SQL in route handlers
- [ ] Write a seed script — one company, one agent builder, one open task. Idempotent.
- [ ] Unit tests for repository functions (mock the Supabase client)
- [ ] Verify: migrations apply cleanly to a fresh local Postgres

---

## Phase 2: Authentication + Onboarding

Goal: working auth for both roles, middleware protecting all routes, and onboarding flows that get users to a usable state.

- [ ] Configure NextAuth — GitHub (agent_builder), Google (company), dev credentials (local only)
- [ ] Sync authenticated users to Supabase `users` table on first login
- [ ] Extend session with Supabase user ID and role
- [ ] Write middleware protecting all authenticated routes with role enforcement
- [ ] Styled sign-in page (not the NextAuth default)
- [ ] Onboarding flow for companies — collect required profile data, store in Supabase
- [ ] Onboarding flow for agent builders — collect required profile data, store in Supabase
- [ ] Role-based dashboard shell (layout + nav, no real data yet)
- [ ] Unit tests: middleware logic, role assignment, session shape
- [ ] E2E test: full signup → onboarding → dashboard for both roles

---

## Phase 3: Task Posting

Goal: companies can post a complete task including rubric, and see their tasks in a dashboard.

- [ ] Multi-step task creation form — break it into logical steps, never one long form
- [ ] Rubric builder — dynamic criteria + weights, live weight total, inline validation (see UI_RULES.md)
- [ ] Test suite upload to Supabase Storage
- [ ] Task posting API route with full validation
- [ ] Task status state machine — enforce valid transitions in a service layer
- [ ] Company dashboard — task list with status, deadline, agent count
- [ ] Task detail page — metadata + leaderboard placeholder + countdown
- [ ] Unit tests: validation, state machine, rubric weight logic
- [ ] E2E test: full task posting flow

---

## Phase 4: Agent Registration + Task Matching

Goal: agent builders can register their Docker image, and get matched to relevant tasks.

- [ ] Agent profile page — edit profile and Docker image URL
- [ ] Docker image validation on save — attempt pull, surface result inline
- [ ] Task matching logic — match agents to tasks by category
- [ ] Task notification on post — notify eligible agents (email via Resend)
- [ ] Agent task feed — open tasks the agent is eligible for
- [ ] Competition detail page — task info + submission status
- [ ] Enter competition action — creates submission, enqueues execution job
- [ ] Unit tests: matching logic, Docker validation (mock dockerode)
- [ ] E2E test: agent sees task, enters competition

---

## Phase 5: Execution Engine

Goal: agent Docker images run in a sandboxed environment, output is captured, evaluation is triggered.

Plan this phase's architecture carefully before writing any code. The worker, the queue, the Docker contract, and the failure modes all need to be designed together. Read the agent submission protocol in REQUIREMENTS.md.

- [ ] Design the execution worker architecture — document the design in a comment block at the top of the worker file before implementation
- [ ] BullMQ execution queue
- [ ] Execution worker — pull image, run container, capture output, upload artifacts, enqueue evaluation
- [ ] Handle all failure modes explicitly: pull failure, non-zero exit, timeout, no output produced
- [ ] Submission status API (for polling)
- [ ] Write a minimal test Docker image for integration testing
- [ ] Unit tests: worker logic with mocked dockerode, each failure mode
- [ ] Integration test: run test image through full execution pipeline

---

## Phase 6: Evaluation Pipeline

Goal: every submission gets a score that companies can trust.

This is the most important phase. Correctness matters more than speed. Think through the edge cases before implementing.

- [ ] Design the evaluation worker architecture — document the design before implementation
- [ ] BullMQ evaluation queue (separate from execution)
- [ ] Phase 1: automated testing — run company test suite against agent output, parse results
- [ ] Phase 2: LLM judge — call Claude with task + rubric + output, parse structured scores
- [ ] Write the Claude evaluation prompt carefully — it must score independently per dimension, return only valid JSON, handle missing output gracefully, and never hallucinate
- [ ] Zod-validate Claude's response. Retry once on failure. Flag for manual review if retry fails.
- [ ] Phase 3: final score — weighted combination, write immutable result
- [ ] Handle all edge cases: no output, test suite failure, LLM response failure
- [ ] Unit tests: score calculation, prompt construction, response parsing, all edge cases
- [ ] Integration tests: known-good output → high score, empty output → zero score

---

## Phase 7: Arena Leaderboard

Goal: companies watch agents compete in real time, with identities hidden until deadline.

- [ ] Supabase Realtime subscription on evaluation results per task
- [ ] Leaderboard component — live updates, smooth row reordering, score bars
- [ ] Agent anonymization until deadline — design this to be reversible at close time
- [ ] Deadline countdown — live timer, triggers task close on zero
- [ ] Task close worker — updates status, reveals identities, notifies company, updates reputation
- [ ] Unit tests: anonymization logic, sort order, tie-breaking
- [ ] E2E test: two agents submit, leaderboard updates, deadline fires

---

## Phase 8: Results + Acquisition Flow

Goal: after a task closes, companies can see full results and contact the winner.

- [ ] Post-close results page — full leaderboard, winner featured, output downloads, LLM reasoning
- [ ] Platform inbox — threaded messaging between company and agent builder
- [ ] Contact winner action — opens message thread, records contact for success fee tracking
- [ ] Deal completion flow — company marks deal done, enters value, success fee generated
- [ ] Unit tests: message permissions, fee calculation
- [ ] E2E test: task closes → company contacts winner → marks deal complete

---

## Phase 9: Reputation + Public Profiles

Goal: agent builders have a public track record that compounds over time.

- [ ] Public agent builder profile page
- [ ] Reputation stats: win rate, average score, tasks entered, tasks won
- [ ] Competition history table
- [ ] Category specializations derived from wins
- [ ] Agent browsing for companies (sorted by reputation)
- [ ] Unit tests: reputation calculation, category derivation

---

## Phase 10: Landing Page + Marketing Site

Read UI_RULES.md completely before building anything in this phase.

- [ ] Landing page — hero, how it works, why it's different, pricing, footer
- [ ] Pricing page
- [ ] Styled auth pages
- [ ] 404 and 500 error pages

---

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

_Add tasks here as you discover them. Format: description + reason._
