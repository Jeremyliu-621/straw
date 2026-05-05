# Evaluation Worker Hardening

> **⚠️ Context update (2026-04-25):** This hardening applies to the
> single-Gemini eval worker (`src/workers/evaluation-worker.ts`), which
> per D30 (`tasks/DECISIONS.md`) is moving from "the eval pipeline" to
> "the fallback eval pipeline." The new primary path is one OpenClaw
> judge daemon per task (Agent-as-Judge architecture). The hardening
> documented here remains valuable — the worker stays in the codebase
> as the degraded-mode fallback when the judge Gateway is unreachable.
> Operational playbook for the new architecture: memory file
> `project_eval_setup_openclaw_codex.md`.

Production reliability improvements to `src/workers/evaluation-worker.ts` after the first real end-to-end submission exposed fragility in LLM response handling.

---

## Changes Made

### 1. LLM Retry Logic (3x with exponential backoff)

**Before:** Retried once on JSON parse failure, no backoff.

**After:** `evaluateWithLLM` retries up to 3 times with exponential backoff (1s, 3s, 9s). Each failed attempt is logged with the attempt number and wait time. The `callLLM` function now also:
- Uses `responseMimeType: "application/json"` to nudge Gemini toward valid JSON
- Falls back to a `sanitizeJsonString` function on parse failure (handles smart quotes, trailing commas, control characters)
- Logs clearly at each stage of failure

### 2. Structured Logging

**Before:** Scattered `console.log`/`console.error` with inconsistent formatting.

**After:** All logging goes through a `log` object with three methods (`info`, `warn`, `error`). Every log line includes:
- ISO-8601 timestamp
- `[eval]` prefix
- Log level (`[INFO]`, `[WARN]`, `[ERROR]`)
- Submission ID when available (`sub=<uuid>`)

Example: `2026-04-14T12:34:56.789Z [eval] [INFO] sub=abc-123 Scored: test=85, llm=72.3, final=76.1 mode=llm`

### 3. Graceful Score Fallback

**Before:** When LLM judge failed completely, wrote `final_score=0` and `status="completed"`. This showed as a zero on the leaderboard, which is misleading.

**After:** When all LLM retries are exhausted:
- Sets submission status to `"evaluation_failed"` (new status added to `SUBMISSION_STATUS` in `constants.ts`)
- Writes the error reason to `submission.error_message`
- Does NOT write an `evaluation_results` record (since `final_score` is NOT NULL in the schema, writing 0 would be dishonest)
- Logs `MANUAL REVIEW NEEDED` clearly
- The `tryAutoCloseTask` function now considers `evaluation_failed` as a terminal state

### 4. Job Timeout (5 minutes)

**Before:** No job-level timeout. If Gemini was down, the BullMQ job could hang indefinitely.

**After:** BullMQ worker configured with `lockDuration: 300000` (5 minutes). If a job exceeds this, BullMQ will consider it stalled and can reassign it.

### 5. File Download Resilience

**Before:** Single attempt per file download. If Supabase Storage had a transient error, the file was skipped silently.

**After:** Both `fetchAgentOutput` and `downloadAgentOutputToDir` retry each file download up to 3 times with a 2-second delay between attempts. Failed downloads are logged at each attempt with the attempt number.

### 6. Memory Cleanup (try/finally)

**Before:** Build check temp directory (`/tmp/map-build-*`) was cleaned up inside a try/catch, but if the function threw before reaching cleanup, the directory leaked.

**After:** `handleLlmEval` wraps its entire body in `try/finally`. The temp directory is always cleaned up on exit, whether the evaluation succeeded, failed, or threw. (The container eval path already had this pattern.)

### 7. Health Check

**Before:** No external visibility into whether the worker was alive.

**After:** The worker writes a JSON heartbeat file to `/tmp/eval-worker-heartbeat` containing:
- Process PID
- Status (`"idle"` or `"processing"`)
- Current job ID (when processing)
- Last heartbeat timestamp

Written on startup, on each job start, on job completion, and on job failure. Deleted on graceful shutdown (SIGTERM/SIGINT). External monitoring can read this file to verify the worker is alive and processing.

---

## Files Changed

| File | Change |
|------|--------|
| `src/workers/evaluation-worker.ts` | All 7 hardening improvements |
| `src/constants.ts` | Added `EVALUATION_FAILED` to `SUBMISSION_STATUS` |

## Verification

- `npx tsc --noEmit` — zero type errors
- `npx vitest run src/workers/` — 83/83 tests passing
- No changes to core evaluation logic, scoring math, or Zod schemas
- `sanitizeJsonString` kept (newly added to this file as part of callLLM hardening)

## Constants Added

| Constant | Value | Purpose |
|----------|-------|---------|
| `LLM_MAX_RETRIES` | 3 | Max LLM evaluation attempts |
| `LLM_BACKOFF_BASE_MS` | 1000 | Base for exponential backoff (1s, 3s, 9s) |
| `DOWNLOAD_MAX_RETRIES` | 3 | Max file download attempts |
| `DOWNLOAD_RETRY_DELAY_MS` | 2000 | Delay between download retries |
| `JOB_LOCK_DURATION_MS` | 300000 | 5-minute BullMQ job lock timeout |
| `HEALTH_CHECK_PATH` | `/tmp/eval-worker-heartbeat` | Health check file location |
| `SUBMISSION_STATUS.EVALUATION_FAILED` | `"evaluation_failed"` | New terminal status for LLM judge failures |
