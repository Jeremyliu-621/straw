# Wake-Up Briefing — 2026-04-12

## What Was Built Tonight

**Phase 13: Executable Evaluation (Eval Container Model)** is code-complete.

Companies can now ship a Docker eval container (their own test suite in any language/framework). The platform runs it against agent output, reads `/results/score.json`, and records the score. Three modes: LLM judge only (default, unchanged), Container eval (Docker only), Hybrid (container score + LLM notes).

---

## What's Committed

All on `master`. 4 commits:

| Commit | What |
|--------|------|
| `855a472` | Foundation: migration 018, constants, types, validation, task API, eval worker rewrite, validate-eval endpoint, eval SDK, 48 new tests |
| `a6a083c` | UI: task form eval mode selector, results breakdown display, submission details API, docs page |
| `08600b4` | Task detail eval mode badge + form validate-eval on blur |
| `9b4aa8c` | Docs: TASKS.md updated, TESTING.md eval section, E2E test file, DECISIONS.md/HOW_IT_WORKS.md/REQUIREMENTS.md |

**266 unit tests passing. Zero TypeScript errors.**

---

## What's Left Before This Is Live

1. **Apply migration 018 to Supabase** — Run the SQL in `supabase/migrations/018_eval_container.sql` in the Supabase SQL editor. Without this, the new columns don't exist and task creation with eval_mode/eval_image will fail.

2. **Create `test-suites` bucket** (from Phase 12, still pending) — Supabase dashboard → Storage → New bucket → `test-suites`, private.

3. **Deploy workers** — Execution and evaluation workers need to run somewhere (Railway/Fly.io). The eval worker now needs Docker access (it runs eval containers), so it needs to run on infra with Docker available.

---

## Known Issues / Edge Cases

- **Leaderboard breakdown tooltip** — not implemented (minor polish, deferred)
- **Hybrid mode LLM call** — re-downloads agent output text even though files are already on disk. Minor inefficiency, not wrong.
- **Eval container key mismatch** — if breakdown keys don't match rubric criterion names exactly, those criteria score 0. Documented in SDK, working as designed.
- **E2E tests** — Written (6 tests in `e2e/eval-container.spec.ts`) but require a running dev server to execute. They use `page.route()` mocking so they don't need real backend state.

---

## Architecture (the key insight)

The platform does ONE thing: **run two containers and read one file.**

```
Agent container  →  output files  →  mounted into  →  Eval container  →  score.json
```

The platform never understands what "correct" means. That knowledge lives in the eval container, which the company owns. Scaling is horizontal: every task is just "pull image, run, read result."

---

## Next Steps (in priority order)

1. Apply migration + create bucket (5 min manual work)
2. Run one real eval container locally against a test agent — verify the full path works with Docker
3. Deploy workers somewhere with Docker access
4. Actually run a competition with a real task + real eval container

---

## File Quick-Reference

| File | What it does |
|------|-------------|
| `supabase/migrations/018_eval_container.sql` | New columns: eval_mode, eval_image, breakdown, container_score, container_exit_code |
| `src/workers/evaluation-worker.ts` | Routes on eval_mode, runs Docker eval containers, reads score.json |
| `src/app/tasks/new/page.tsx` | Eval mode selector in task creation form |
| `src/app/api/tasks/validate-eval/route.ts` | Image format validation endpoint |
| `packages/eval-sdk/` | Company-facing types + schema + example + run-local.sh |
| `src/app/docs/page.tsx` | "Writing an eval container" documentation |
| `tasks/TESTING.md` | How to test eval containers locally |
