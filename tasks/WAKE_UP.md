# Wake-Up Briefing — 2026-04-12

## What Was Built Tonight

**Two features + hardening across 24 commits.**

### 1. Phase 13: Executable Evaluation (Eval Container Model)

Companies ship a Docker eval container (their own test suite). Platform mounts agent output at `/agent_output`, runs it, reads `/results/score.json`. Three modes: LLM (default), Container, Hybrid (container score + LLM notes).

What was built:
- Migration 018 (eval_mode, eval_image on tasks; breakdown, container_score on evaluation_results)
- Eval worker rewrite: `runEvalContainer()`, `downloadAgentOutputToDir()`, `readLocalOutputAsText()`, mode routing
- Eval container log capture + detailed error messages on failure
- Task form: eval mode selector, conditional field visibility, validate-eval on blur
- Results page: container score breakdown display
- Eval mode badge on: task detail, enter page, company dashboard, public task listing, leaderboard
- Leaderboard: adapts columns (hides Test/LLM for container mode)
- Submission status API: returns container_score, breakdown, eval_mode
- PATCH /api/tasks/[id]: edit draft tasks (including eval_mode/eval_image)
- Validate-eval endpoint: Docker image format validation
- Eval SDK: packages/eval-sdk/ (types, schema, run-local.sh, example container)
- Docs: "Writing an eval container" section
- Pipeline test supports `?eval_mode=container`

### 2. Agent Resubmission

Agents can now submit multiple times per task (up to `max_submissions_per_agent`, default 5).

- Migration 019: drops UNIQUE(task_id, agent_id), adds max_submissions_per_agent column
- Leaderboard deduplicates: shows only the best score per agent
- Task detail: "Submit Again" button when task is open + agent has existing submission
- Enter page: shows "X of Y submissions used"
- Fixed latent bug: submissions API returns array but page treated as single object

### 3. Security + Quality

- Rate limiting on submissions (10/min), API keys (10/min), messages (30/min)
- 317 tests (99+ new): eval container runner, score.json schema, submission validation, API execution, PATCH schema, Docker image regex, eval mode routing
- Production build: zero warnings, zero errors
- verify-local.sh script for E2E verification

---

## What You Need To Do

### Step 1: Apply migrations (5 min)

Run these SQL files **in order** in the Supabase SQL editor:
1. `supabase/migrations/018_eval_container.sql` — eval container columns
2. `supabase/migrations/019_agent_resubmission.sql` — drops UNIQUE, adds quota

### Step 2: Create storage bucket (1 min)

Supabase dashboard → Storage → New bucket → name: `test-suites`, private.

### Step 3: Verify locally (10 min, needs Docker)

```bash
# Automated prereq checks + image builds
bash scripts/verify-local.sh

# Then in 3 terminals:
npm run worker
npm run eval-worker
npm run dev

# Test LLM eval pipeline
curl -X POST http://localhost:3000/api/dev/pipeline-test

# Test container eval pipeline
curl -X POST "http://localhost:3000/api/dev/pipeline-test?eval_mode=container"
# → Watch eval worker for: "[eval] Eval container score: XX (pass=true)"
```

### Step 4: Deploy workers

Railway/Fly.io. The eval worker now needs Docker access.

---

## File Quick-Reference

| File | What |
|------|------|
| `supabase/migrations/018_eval_container.sql` | Eval container DB columns |
| `supabase/migrations/019_agent_resubmission.sql` | Drop UNIQUE, add quota |
| `src/workers/evaluation-worker.ts` | Eval container runner + mode routing |
| `src/app/tasks/new/page.tsx` | Task form with eval mode selector |
| `src/app/api/tasks/[id]/route.ts` | GET + PATCH for task detail/editing |
| `src/app/api/tasks/validate-eval/route.ts` | Image format validation |
| `packages/eval-sdk/` | Types, schema, example container, run-local.sh |
| `src/app/docs/page.tsx` | Eval container documentation |
| `scripts/verify-local.sh` | Automated local verification |
| `tasks/TESTING.md` | Eval container testing guide |
