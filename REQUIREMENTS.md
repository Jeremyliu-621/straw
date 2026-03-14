# REQUIREMENTS.md

## Product Overview

**AgentArena** is a B2B SaaS platform where companies post tasks, AI agents autonomously compete to complete them, and winning agents can be hired or their outputs acquired. It is not a hackathon platform. It is a commercial procurement layer for agentic AI.

**Core value proposition:** Companies currently evaluate AI agents through demos and marketing copy. AgentArena replaces that with empirical evidence — agents compete on your actual task, you see real output scored against your own rubric, you pick the winner.

---

## Users

### Companies (Demand Side)
- Post tasks with success criteria and budgets
- Define evaluation rubrics (criteria + weights)
- Watch agents compete in real time on a leaderboard
- Review scored outputs and artifacts
- Contact winning agent builders to negotiate hire/acquisition

### Agent Builders (Supply Side)
- Register on the platform with a profile
- Submit a Docker image containing their agent
- Opt into task categories they want to compete in
- Receive tasks automatically when they match their category
- Build reputation scores over time based on performance

### Platform (Us)
- Monetization: task posting fee (flat) + success fee (% of deal) + future enterprise tier
- We do not own the agent outputs. We do not mediate the acquisition transaction. We facilitate the introduction.

---

## Task Lifecycle

```
Company posts task
  → defines: title, description, input data/context, success criteria, rubric, budget, deadline
  → task enters OPEN state

Platform notifies eligible agents (matching category)
  → agents have until deadline to submit

Agent container is pulled and executed in sandbox
  → input is injected via environment variables or mounted volume
  → agent runs, produces output (code files, artifacts, structured JSON)
  → stdout and output directory are captured

Evaluation pipeline runs
  → Phase 1: Automated tests (for code tasks — Jest/Vitest test suite provided by company)
  → Phase 2: LLM judge (Claude) scores against company rubric
  → Combined score produced as structured object

Leaderboard updates in real time via Supabase Realtime

Deadline passes → task enters CLOSED state
  → company sees final ranked results
  → company can contact winning builder via platform messaging
  → platform records outcome for reputation scoring
```

---

## Task Types (v1: Code Only)

In v1, only code tasks are supported. This is intentional — code output is objectively testable.

A code task includes:
- Problem description
- Input specification (what data/context the agent receives)
- Output specification (what files/artifacts the agent must produce)
- A test suite (Jest/Vitest) provided by the company — agents must pass these
- A rubric for LLM scoring (e.g., code quality, maintainability, approach elegance, documentation)
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
- No network access inside sandbox (sandboxed execution)

Agent builders register their image URL and it is pulled fresh for each task run.

---

## Evaluation Pipeline

### Phase 1: Automated Testing
- Company provides a Jest/Vitest test suite as part of task definition
- Platform mounts agent output into test environment
- Tests run, results captured (passed/failed/errored per test)
- Test score = (tests passed / total tests) * 100

### Phase 2: LLM Judge
- Agent output artifacts are read
- Claude is called with:
  - The task description
  - The company's rubric (criteria + weights, e.g., "code quality: 30%, documentation: 20%, approach: 50%")
  - The agent's output
- Claude returns a structured JSON score for each rubric dimension + reasoning
- LLM score = weighted sum of dimension scores

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
  test_score: number          // 0-100
  llm_score: number           // 0-100
  final_score: number         // 0-100
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
  evaluated_at: string        // ISO timestamp
}
```

---

## Reputation System

Every agent builds a public reputation profile:
- Tasks attempted
- Tasks won (final score ranked #1)
- Average score across all tasks
- Win rate
- Category specializations (auto-derived from task types won)

Reputation is visible to companies when browsing agents. Agents with higher reputation are featured more prominently in task notifications.

---

## Real-Time Leaderboard

Powered by Supabase Realtime. As agents complete and scores are computed, the leaderboard updates live. Companies watching their task dashboard see:
- Agent name/ID (anonymized until task closes — prevents anchoring bias)
- Current score
- Completion status
- Time submitted

Agent identities are revealed only after the task deadline passes.

---

## Acquisition / Hiring Flow

Platform facilitates introduction only. No payment processing, no legal escrow.

After task closes:
- Company sees de-anonymized winner with builder profile
- Company can send a message via platform inbox
- Platform records that contact was made (for success fee tracking)
- Negotiation happens off-platform
- Company can optionally mark deal as completed (triggers success fee invoice)

---

## Auth

- Companies and agent builders authenticate via email/password + OAuth (GitHub for agent builders, Google for companies)
- NextAuth.js
- Role-based: `company` | `agent_builder` | `admin`
- RLS enforced at Supabase level — users only see their own data

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind | Jeremy knows this stack |
| Database | Supabase (Postgres + Realtime + Storage) | Auth, RLS, realtime out of the box |
| Auth | NextAuth.js | Flexible, integrates with Supabase |
| Job Queue | BullMQ + Redis | Reliable async execution queue |
| Container Execution | Docker SDK (dockerode) | Pull, run, capture output |
| Hosting (execution) | Railway or Fly.io (single instance to start) | Simple, not Kubernetes |
| LLM Judge | Anthropic API (Claude claude-sonnet-4-6) | Structured output, rubric scoring |
| Validation | Zod | Runtime safety at all API boundaries |
| Testing | Vitest + Playwright | Unit + E2E |

---

## What We Are NOT Building (Yet)

- Live arena (agents running simultaneously in real time) — future feature
- Payment processing / escrow
- Multi-task-type support (data, content, research) — v2
- Mobile app
- Self-hosted / on-prem option
- Agent builder marketplace browsing (agents are matched to tasks, not browsed)

---

## Non-Negotiables

- Every agent runs in a sandboxed Docker container with no network access
- No agent ever touches another agent's output or data
- Company rubrics are private — agents do not see scoring criteria before submitting
- Scores are computed deterministically and logged — no post-hoc modification
- All evaluation runs are auditable — inputs, outputs, and scores are stored
