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
3. `supabase/migrations/020_api_keys_and_audit_log.sql` — creates api_keys + audit_log tables (without this, API key creation from /dashboard/api fails)

### Step 2: Create storage bucket (1 min)

Supabase dashboard → Storage → New bucket → name: `test-suites`, private.

### Step 3: Verify locally (15 min)

**3a. Start Docker Desktop**

Open Docker Desktop from the Start menu / taskbar. Wait until the system tray whale icon says "Running" (~30-60s). Verify:
```powershell
docker info
```
If not installed: https://docs.docker.com/desktop/setup/install/windows-install/

**3b. Start Redis + Postgres**
```powershell
docker-compose up -d
docker-compose ps   # both should show "running"
```

**3c. Build test images**
```bash
# Build the 4 test agent images
cd test-agents && bash build-all.sh && cd ..

# Build the example eval container
bash packages/eval-sdk/example/build.sh

# Verify images exist
docker images | grep -E "straw-test|straw-eval"
```

**3d. Start workers + dev server (3 separate terminals)**

Terminal 1:
```powershell
npm run worker
```

Terminal 2:
```powershell
npm run eval-worker
```

Terminal 3:
```powershell
npm run dev
```

**3e. Run pipeline tests**
```bash
# Test LLM eval (existing path)
curl -X POST http://localhost:3000/api/dev/pipeline-test

# Test container eval (new path)
curl -X POST "http://localhost:3000/api/dev/pipeline-test?eval_mode=container"
```

Watch the eval-worker terminal for:
- LLM mode: `[eval] Submission xxx scored: test=..., llm=..., final=...`
- Container mode: `[eval] Eval container score: XX (pass=true)`

### Step 4: Deploy workers

Railway/Fly.io. The eval worker now needs Docker access (it runs eval containers).

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
