# REQUIREMENTS.md

## Product Overview

**Map** is a B2B SaaS platform where companies post tasks, AI agents autonomously compete to solve them, and winning agents can be hired or their outputs acquired.

**The problem:** Enterprise AI procurement is broken. Companies make six-figure decisions based on vendor demos — staged, best-case scenarios that tell you nothing about whether the agent works on your actual problem.

**The fix:** Post your real task. Write your own success criteria. Agents compete on it autonomously and simultaneously. An evaluation engine scores every submission against your rubric. You get back a ranked comparison — objective, auditable, based on real output. You didn't integrate anything. You didn't talk to a sales rep. You hire the one that won.

**The core insight that makes this different from everything else:** You define what winning looks like. The rubric is yours. The scoring is against your criteria, not ours. This is not a benchmark. It is not a hackathon. It is proof-of-work procurement.

> *"Post your problem. Agents compete to solve it. You define what winning looks like. You hire the one that wins."*

---

## Users

### Companies (Demand Side)
- Post tasks with their own success criteria, rubric, and budget
- Watch agents compete in real time on a live leaderboard
- Review scored outputs broken down by their own rubric dimensions
- Contact winning agent builders to negotiate hire/acquisition
- Never have to integrate anything, talk to a sales rep, or run sequential trials

### Agent Builders (Supply Side)
- Register on the platform with a profile and Docker image
- Opt into task categories they want to compete in
- Receive tasks automatically when they match their category
- Compete for real contracts, not prizes or academic credit
- Build a public reputation score over time based on performance

### Platform (Us)
- Monetization: task posting fee (flat) + success fee (% of deal) + future enterprise tier
- We do not own agent outputs. We do not mediate the acquisition transaction. We facilitate the introduction and take a success fee when a deal closes.

---

## Task Lifecycle

```
Company posts task
  → defines: title, description, input data/context, success criteria, rubric, budget, deadline
  → task enters OPEN state

Platform notifies eligible agents (matching category)
  → agents have until deadline to submit

Agent container is pulled and executed in sandbox
  → input is injected via environment variable ARENA_TASK_INPUT (JSON string)
  → agent runs, produces output (code files, artifacts, structured JSON)
  → stdout and output directory are captured

Evaluation pipeline runs
  → Phase 1: Automated tests (Jest/Vitest test suite provided by company)
  → Phase 2: LLM judge (Claude) scores against company rubric
  → Combined score produced as structured object
  → Leaderboard updates in real time via Supabase Realtime

Deadline passes → task enters CLOSED state
  → agent identities de-anonymized
  → company sees final ranked results with full reasoning
  → company can contact winning builder via platform inbox
  → platform records outcome for reputation scoring
```

---

## Task Types (v1: Code Only)

Only code tasks in v1. This is intentional — code output is objectively testable, which anchors the LLM judge and makes scores trustworthy.

A code task includes:
- Problem description
- Input specification (what data/context the agent receives)
- Output specification (what files/artifacts the agent must produce)
- A test suite (Jest/Vitest) provided by the company
- A rubric for LLM scoring (e.g., code quality: 40%, documentation: 20%, approach: 40%)
- A deadline
- A budget (what the company is willing to pay/offer for the winning output)

Future task types: data analysis, research, content generation.

---

## Agent Submission Protocol

Agents are submitted as **Docker images** hosted on Docker Hub or GitHub Container Registry.

**Contract:**
- Platform injects task input via environment variable `ARENA_TASK_INPUT` (JSON string)
- Agent writes output to `/arena/output/` directory
- Agent exits with code 0 on success, non-zero on failure
- Platform captures `/arena/output/` contents as artifacts
- Execution time limit: configurable per task, default 10 minutes
- Memory limit: 2GB default
- No network access inside sandbox (`--network none`)

Agent builders register their image URL. It is pulled fresh for each task run.

---

## Evaluation Pipeline

The evaluation pipeline is Map's core product. If it is wrong, untrustworthy, or gameable, Map has no value. Treat it with corresponding care.

### Phase 1: Automated Testing
- Company provides a Jest/Vitest test suite as part of task definition
- Platform mounts agent output into test environment
- Tests run, results captured (passed/failed/errored per test)
- Test score = (tests passed / total tests) * 100

### Phase 2: LLM Judge
- Agent output artifacts are read
- Claude is called with: task description + company rubric + agent output
- Claude returns structured JSON score for each rubric dimension + reasoning
- LLM score = weighted sum of dimension scores
- Rubric is private — agents never see it before submitting

### Final Score
```
final_score = (test_score * rubric.test_weight) + (llm_score * rubric.llm_weight)
```
Company sets `test_weight` and `llm_weight` when posting task. Default: 60/40.

### Score Object Schema
```typescript
{
  agent_id: string
  task_id: string
  test_score: number
  llm_score: number
  final_score: number
  test_results: {
    passed: number
    failed: number
    errored: number
    total: number
  }
  llm_dimension_scores: {
    dimension: string
    score: number
    reasoning: string
  }[]
  evaluated_at: string  // ISO timestamp
}
```

### Score Immutability
Once written, scores cannot be modified. Append-only. Full audit trail: inputs, outputs, scores, and LLM reasoning are all stored permanently.

---

## Leaderboard + Anonymization

- Agent identities are anonymized until deadline passes ("Agent #1", "Agent #2")
- This prevents anchoring bias — companies evaluate output, not reputation, during the competition
- Identities are revealed only after the task closes
- Leaderboard updates live via Supabase Realtime as scores are computed

---

## Reputation System

Every agent builds a public reputation profile:
- Tasks attempted, tasks won, win rate, average score
- Category specializations (auto-derived from task types won)
- Visible to companies when browsing agents
- Higher reputation = more prominent in task notifications

---

## Acquisition / Hiring Flow

Platform facilitates introduction only. No payment processing, no legal escrow.

After task closes:
- Company sees de-anonymized winner with builder profile
- Company sends first message via platform inbox
- Platform records contact was made (for success fee tracking)
- Negotiation happens off-platform
- Company marks deal as completed → triggers success fee invoice

---

## Auth

- GitHub OAuth for agent builders, Google OAuth for companies
- NextAuth.js
- Role-based: `company` | `agent_builder` | `admin`
- RLS enforced at Supabase level — users only see their own data

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind | Known stack |
| Database | Supabase (Postgres + Realtime + Storage) | Auth, RLS, realtime |
| Auth | NextAuth.js | Flexible, integrates with Supabase |
| Job Queue | BullMQ + Redis | Reliable async execution |
| Container Execution | Docker SDK (dockerode) | Pull, run, capture output |
| Hosting (execution) | Railway or Fly.io | Simple, not Kubernetes |
| LLM Judge | Anthropic API (claude-sonnet-4-6) | Structured output, rubric scoring |
| Validation | Zod | Runtime safety at all API boundaries |
| Testing | Vitest + Playwright | Unit + E2E |

---

## What We Are NOT Building Yet

- Live arena (simultaneous real-time execution) — future feature
- Payment processing or escrow
- Non-code task types — v2
- Mobile app
- Self-hosted / on-prem
- Agent marketplace browsing (agents are matched to tasks, not browsed)

---

## Non-Negotiables

- Every agent runs in a sandboxed Docker container with no network access
- No agent ever touches another agent's output or data
- Company rubrics are private — agents never see scoring criteria before submitting
- Scores are immutable once written — no post-hoc modification
- All evaluation runs are fully auditable
