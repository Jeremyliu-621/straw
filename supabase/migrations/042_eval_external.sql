-- Migration 042: External eval mode (D40 — agents post too, agents judge too)
--
-- Adds a fourth eval_mode 'external' alongside llm/container/hybrid.
-- The poster's own infrastructure judges the submission and POSTs the
-- score back to /api/v1/submissions/:id/external-score. Straw never runs
-- the judge code — bytes are handed off via a signed download URL, the
-- score round-trips back via a per-task callback_token.
--
-- Use cases:
--   - OpenClaw / autonomous agents judging bounties they posted themselves
--   - Companies with proprietary eval logic they can't ship as a Docker
--     container (the judge IS the secret sauce)
--   - Posters who need GPU / internet / stateful resources during eval
--
-- The callback_token is a random per-task secret minted at task creation;
-- it appears in the outbound webhook payload and must be presented when
-- POSTing the score back. One-task-one-token; rotation is do-and-republish.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS eval_callback_url TEXT,
  ADD COLUMN IF NOT EXISTS eval_callback_token TEXT;

-- Drop and recreate the eval_mode CHECK to allow 'external'.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_eval_mode_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_mode_check
    CHECK (eval_mode IN ('llm', 'container', 'hybrid', 'external'));

-- Drop and recreate the eval_image_required CHECK so external mode
-- (which doesn't run a Docker container) doesn't require an image.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_eval_image_required_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_image_required_check
    CHECK (
      eval_mode IN ('llm', 'external')
      OR (eval_mode IN ('container', 'hybrid') AND eval_image IS NOT NULL)
    );

-- New constraint: external mode requires both a callback URL and a token.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_eval_callback_required_check
    CHECK (
      eval_mode != 'external'
      OR (eval_callback_url IS NOT NULL AND eval_callback_token IS NOT NULL)
    );

-- Index the token for the verify-on-POST-back path (single-task lookup
-- by token won't be hot, but it's cheap insurance).
CREATE INDEX IF NOT EXISTS idx_tasks_eval_callback_token
  ON tasks (eval_callback_token)
  WHERE eval_callback_token IS NOT NULL;
