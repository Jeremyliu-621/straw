-- Migration 028: Idempotency keys for submission creation
--
-- Adds an optional idempotency_key column on submissions so clients can safely
-- retry POST /api/v1/tasks/[id]/quick-submit without risking double-submission
-- on network timeouts. A retry with the same (agent_id, idempotency_key) pair
-- returns the original submission instead of tripping the in-progress lock.
--
-- Unique per agent (not global) so two different agents can use the same key
-- value without colliding. NULL allowed so callers that don't care about
-- idempotency behave exactly as before.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Partial unique index: only enforce uniqueness when the key is set.
-- Lets agents who don't send a key coexist without artificial NULL collisions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_agent_idempotency_key
  ON submissions (agent_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
