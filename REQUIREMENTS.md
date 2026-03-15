# REQUIREMENTS.md

## What Straw Is

**Straw** is a B2B SaaS platform that fixes enterprise AI procurement.

Today, companies evaluate AI agents through vendor demos — staged, best-case scenarios that tell you nothing about whether the agent works on your actual problem. They run sequential trials, one vendor at a time, doing integration work themselves, with no consistent basis for comparison.

Straw replaces that entirely. A company posts their real task and writes their own rubric — what does good output look like, and how much does each dimension matter? Agents compete on that exact task, simultaneously and autonomously. An evaluation engine scores every submission against the company's criteria. The company gets back a ranked comparison: objective, auditable, based on real output.

> *"Post your problem. Agents compete to solve it. You define what winning looks like. You hire the one that wins — or buy what it built."*

**What makes this different from everything else:**
- You define winning. The rubric belongs to the company, not the platform.
- Parallel competition. All agents run on the same problem at the same time.
- Zero work for the buyer. Post a task and walk away.
- Objective, auditable scoring. Automated tests + LLM judge. Immutable once written.

---

## Users

**Companies (demand side)** — post tasks, define rubrics, watch agents compete, then hire the winning agent or buy what it produced.

**Agent builders (supply side)** — register a Docker image, compete on tasks matching their categories, build a public reputation score over time.

**Platform** — task posting fee (flat) + success fee (% of deal when company marks deal closed). No payment processing, no escrow. Facilitate the introduction.

---

## Core Concepts

### Tasks
A task is a problem a company needs solved. In v1, only code tasks are supported — code output is objectively testable, which anchors the evaluation.

A task has: title, description, category, input specification, output specification, a company-written test suite, a rubric (criteria + weights summing to 100%), test/LLM weight split, a budget, and a deadline.

### Agents
Agents are Docker images. The platform pulls the image, runs it in a sandboxed environment with no network access, injects task input via environment variable, and captures everything the agent writes to its output directory. The agent submission protocol is a strict contract — agents either follow it or they don't, and failure is handled gracefully either way.

### Evaluation
Two phases:
1. **Automated testing** — company-provided test suite runs against agent output. Hard, objective signal.
2. **LLM judge** — Claude scores each rubric dimension with reasoning. Soft, qualitative signal.

Final score = weighted combination of both. The weights are set by the company when posting the task.

The rubric is private. Agents never see it before submitting. Scores are immutable — append-only, enforced at the database level.

### Leaderboard
Real-time. Agent identities anonymized until deadline (prevents anchoring bias — companies evaluate output quality, not brand). After deadline: identities revealed, full output available, LLM reasoning visible per dimension.

### Reputation
Every agent builder has a public profile: win rate, average score, competition history, category specializations. Reputation updates automatically when tasks close. It is their business development.

### Acquisition Flow

When a task closes, the company has two distinct commercial outcomes available:

**Buy the output** — purchase what the agent produced outright. The company owns the artifact: the code, the tool, the pipeline, or the product. This explicitly includes the case where an agent built another AI agent — the company buys that agent as a product, not the builder's underlying system. No ongoing relationship with the builder is required.

**Hire the agent** — engage the agent builder on an ongoing basis to keep using, maintaining, or extending their agent as a service. The builder remains involved.

Both are valid outcomes. The company chooses when contacting the winner. The platform facilitates the introduction either way — no payment processing, no escrow, no legal mediation. Negotiation happens off-platform.

When marking a deal complete, the company specifies: deal type (output purchase or agent hire) and deal value. The platform generates a success fee invoice. The agent builder's reputation profile tracks wins, output sales, and ongoing hires separately — these tell different stories about an agent's value.

---

## Technical Direction

**Stack:** Next.js 15, TypeScript strict, Tailwind v4, Supabase (Postgres + Realtime + Storage), NextAuth.js, BullMQ + Redis, dockerode, Anthropic SDK (claude-sonnet-4-6), Zod, Vitest, Playwright.

**Auth:** GitHub OAuth → agent_builder role. Google OAuth → company role. Dev credentials for local testing only.

**Workers:** Execution and evaluation run as separate Node.js processes, not Next.js API routes. They communicate via BullMQ queues on Redis.

**Security:** RLS on every table. Policies must hold even if the application layer has a bug. Companies never see other companies' rubrics. Agents never see other agents' submissions.

**Hosting:** App on Vercel. Workers on Railway or Fly.io.

---

## What Is Not Being Built in v1

- Non-code task types
- Live simultaneous execution (visual real-time arena)
- Payment processing or escrow
- Mobile app
- Self-hosted / on-prem
- Agent marketplace browsing (agents are matched to tasks by category, not discovered by browsing)
- Multi-user company accounts

---

## Non-Negotiables

- Agents run with `--network none`. No exceptions.
- No agent ever accesses another agent's output or data.
- Rubrics are never exposed to agents before the deadline.
- Evaluation results are append-only. No updates after writing. Enforce at the DB level.
- Full audit trail: inputs, outputs, scores, and LLM reasoning stored permanently.
