-- Migration 019: Allow multiple submissions per agent per task
--
-- Drops the UNIQUE(task_id, agent_id) constraint so agents can submit
-- multiple times (up to the task's submission quota).
-- The quota is enforced at the application layer, not the DB level,
-- because the limit is configurable per-task.
--
-- Leaderboard deduplication: only the highest-scoring submission per
-- agent appears on the leaderboard (handled in the API, not here).

-- Drop the one-submission-per-agent constraint
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS unique_agent_per_task;

-- Add per-task submission limit (default: 5 per agent)
-- The submissions API already references this column name.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS max_submissions_per_agent integer NOT NULL DEFAULT 5;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_max_submissions_range
    CHECK (max_submissions_per_agent >= 1 AND max_submissions_per_agent <= 20);
