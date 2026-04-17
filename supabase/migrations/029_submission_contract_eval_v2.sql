-- Migration 029: Submission contracts, expanded eval feedback, quota expansion
--
-- Three additions for the eval redesign:
--
-- 1. submission_contract (jsonb) on tasks — lets companies define required
--    deliverables (files, patterns, size limits). NULL = no enforcement.
--
-- 2. Raise max_submissions_per_agent cap from 20 to 100 for serious
--    iterative competitions where agents need many attempts.
--
-- 3. Structured container feedback columns on evaluation_results:
--    container_tests (per-test pass/fail), container_notes (freeform),
--    eval_pass_data (multi-pass LLM audit trail).
--
-- All changes are additive. Existing tasks/submissions/results unaffected.

-- ── Submission contracts ─────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS submission_contract jsonb;

-- ── Quota expansion ──────────────────────────────────────────

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_max_submissions_range;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_max_submissions_range
    CHECK (max_submissions_per_agent >= 1 AND max_submissions_per_agent <= 100);

-- ── Structured eval feedback ─────────────────────────────────

ALTER TABLE evaluation_results
  ADD COLUMN IF NOT EXISTS container_tests jsonb;

ALTER TABLE evaluation_results
  ADD COLUMN IF NOT EXISTS container_notes text;

ALTER TABLE evaluation_results
  ADD COLUMN IF NOT EXISTS eval_pass_data jsonb;
