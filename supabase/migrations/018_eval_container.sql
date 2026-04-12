-- Migration 018: Executable evaluation (eval container model)
--
-- Adds eval configuration to tasks and enriches evaluation_results
-- with container-level scoring data.
--
-- Eval modes:
--   'llm'       — Gemini judge only (default, no eval container needed)
--   'container' — Company-shipped Docker eval container only
--   'hybrid'    — Container scores + LLM qualitative commentary

-- ── Tasks: eval configuration ────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS eval_mode text NOT NULL DEFAULT 'llm',
  ADD COLUMN IF NOT EXISTS eval_image text;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_mode_check
    CHECK (eval_mode IN ('llm', 'container', 'hybrid'));

ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_image_required_check
    CHECK (
      eval_mode = 'llm'
      OR (eval_mode IN ('container', 'hybrid') AND eval_image IS NOT NULL)
    );

-- ── Evaluation Results: container scoring data ───────────────

ALTER TABLE evaluation_results
  ADD COLUMN IF NOT EXISTS breakdown jsonb,
  ADD COLUMN IF NOT EXISTS container_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS container_exit_code integer,
  ADD COLUMN IF NOT EXISTS eval_mode text;

-- Index for filtering by eval_mode in analytics queries
CREATE INDEX IF NOT EXISTS idx_tasks_eval_mode ON tasks (eval_mode);
