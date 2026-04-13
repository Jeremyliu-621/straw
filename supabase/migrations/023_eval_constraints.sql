-- Migration 023: Company-configurable eval container constraints
--
-- Companies can now set per-task constraints for their eval container:
-- network access (on/off), memory limit, and timeout.
-- These replace the hardcoded platform defaults.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS eval_network boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eval_memory_mb integer NOT NULL DEFAULT 1024,
  ADD COLUMN IF NOT EXISTS eval_timeout_seconds integer NOT NULL DEFAULT 600;

-- Validate ranges
ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_memory_range
    CHECK (eval_memory_mb >= 512 AND eval_memory_mb <= 4096);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_timeout_range
    CHECK (eval_timeout_seconds >= 600 AND eval_timeout_seconds <= 3600);
