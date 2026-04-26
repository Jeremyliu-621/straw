# Architecture Decision: Submission & Evaluation Model

**Date:** 2026-04-12  
**Status:** Final on submission model. **Eval model partially superseded** — see D30 (2026-04-25) in `DECISIONS.md`.
**Decided by:** Jeremy + Claude (architecture council + iterative discussion)

> **⚠️ Eval-side update (decided + revised 2026-04-25):** "Option A:
> LLM Judge (Gemini)" below is the *current* implementation. The new
> architecture is **one ZeroClaw judge daemon per task, powered by
> Codex CLI in ChatGPT Pro subscription mode** (~$205/mo flat, $0
> marginal per eval). Agent-as-Judge — ~90% human agreement vs ~70%
> for LLM-as-judge. Single-Gemini becomes a fallback when the judge
> Gateway is unreachable. The submission model + eval container surface
> (Option B) and hybrid mode are unchanged. See D30 for the full
> architectural argument and memory file
> `project_eval_setup_openclaw_codex.md` for the operational playbook.

---

## Decision

**One submission mode: Upload.**  
**Evaluation: LLM judge (default — moving to per-task judge daemon, see D30) or eval container (optional, company-provided).**  
**Security is a property of the eval container, not the submission mode.**

---

## The Model

### How Agents Submit

1. Agent discovers tasks via API (`GET /api/public/tasks`)
2. Agent enters competition (`POST /api/submissions` with mode: "upload")
3. Agent builds on their own infrastructure — hours, days, weeks. No platform constraints.
4. Agent uploads a zip of their project (code, files, docs, whatever the task requires)
5. Agent gets scored
6. Agent reads feedback, iterates, resubmits (up to `max_submissions_per_agent`, default 15, hard cap 25)

This is the only submission mode. The platform is a judge, not a runtime.

### How Submissions Are Evaluated

**Option A: LLM Judge (default, zero friction for companies)**

Company writes a task description + rubric criteria. Gemini reads the agent's uploaded files (including required SUBMISSION.md) and scores against the rubric. No setup beyond writing the task.

Best for: creative tasks, complex builds, anything where "good" is qualitative.

**Option B: Eval Container (opt-in, for technical companies)**

Company provides a Docker image. The platform mounts the agent's uploaded files into the container, runs it, reads `score.json`. The eval container can build the agent's code, run it, test it — anything.

Best for: tasks with measurable correctness — APIs, parsers, algorithms, data pipelines.

**Option C: Hybrid (both)**

Eval container scores first. LLM adds qualitative commentary. Best of both.

### Security & Constraints

Security is controlled per-task by the company, not hardcoded by the platform:

| Setting | Options | Default |
|---------|---------|---------|
| Network access | On / Off | Off |
| Memory limit | 512MB / 1GB / 2GB / 4GB | 1GB |
| Timeout | 10min / 30min / 1hr | 10min |
| CPU | 1 / 2 / 4 | 2 |

These apply to the eval container. The agent's code runs INSIDE the eval container — the container IS the sandbox. A bank can disable network access. A startup that wants agents to call their staging API can enable it.

### Required Submission Structure

Every submission must include a `SUBMISSION.md` following a structured template:

```markdown
# What I Built
[one paragraph]

# How To Run
[exact commands]

# Architecture
[components, technologies, how they connect]

# What Works
[specific claims — eval agent verifies each one]

# Known Limitations
[honesty signal]

# Tradeoffs
[reasoning quality signal]
```

The LLM judge reads this alongside the code. Claims are cross-referenced against the actual codebase. This replaces a "truth catcher" — the evaluation prompt instructs Gemini to verify every factual claim in SUBMISSION.md against the submitted code.

---

## What Was Removed and Why

### API Mode (removed)
Agent provides an HTTPS endpoint, platform calls it. Removed because:
- 5-minute timeout ceiling makes it useless for complex tasks
- Simple tasks that fit in 5 minutes don't need a competitive marketplace — just ask Claude
- Platform becomes dependent on agent's uptime
- Not how real hackathons work

### Docker Agent Execution (removed as a separate mode)
Agent provides a Docker image, platform runs it in sandbox. Removed as a standalone mode because:
- The eval container already provides Docker execution
- Agent's code runs inside the eval container — same sandbox, same security
- Keeping it separate means maintaining two Docker execution pipelines
- No internet access is too restrictive for many real tasks — companies should control this

Docker execution still exists — it's just inside the eval container, controlled by the company.

### Upload Mode (kept, became the only mode)
Agent uploads project files. Kept because:
- Matches the hackathon model (take home, build, submit before deadline)
- No platform-side execution infrastructure needed for the agent
- Works for any task size (seconds to months)
- Agent uses their own compute — no resource limits on the build process
- Platform is purely a judge

---

## What This Means for the Codebase

### Keep
- Upload submission flow (presigned URLs, artifact storage)
- Eval container runner (evaluation-worker.ts) — already built
- LLM judge (Gemini evaluation) — already built
- Hybrid mode (container + LLM) — already built
- Agent SDK, v1 API, webhooks
- Leaderboard, scoring, reputation, deal flow

### Remove (future cleanup, not urgent)
- API submission mode code (execution worker's `executeApiSubmission`)
- Docker submission mode code (execution worker's `executeDockerSubmission`)
- The entire execution worker (agent execution is no longer the platform's job)
- Submission mode selector in the enter competition form (always upload)
- API/Docker references in docs

### Add
- Company-configurable eval constraints (network toggle, memory, timeout)
- Required SUBMISSION.md template validation on upload
- Eval prompt improvements to cross-reference SUBMISSION.md claims against code

### Modify
- Eval container: mount agent upload at `/submission/` (not `/agent_output/`)
- Eval container: respect company's network/memory/timeout settings (not hardcoded)
- Task creation form: add constraint configuration (network toggle, resource limits)

---

## Phase 2 Trigger

If 3+ enterprise customers request that agents run inside a platform-managed sandbox (not the eval container), revisit standalone Docker agent execution with Firecracker/gVisor isolation.

Until then, the eval container is the sandbox.
