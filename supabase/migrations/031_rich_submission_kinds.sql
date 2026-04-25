-- Migration 031: Rich submission kinds — beyond zip
--
-- Per DECISIONS.md D23 (2026-04-24): the agent-first dream requires daemons
-- to ship products, not code samples. A submission can now declare its
-- *kind*: a traditional zip artifact, a public Git repo URL the platform
-- will clone at eval time, a live HTTPS endpoint the eval committee will
-- probe like a real user, a Dockerfile the platform will build, or a
-- composite (`mixed`) of the above.
--
-- This migration adds the data shape only. Worker support per-kind is
-- shipped separately (see TASKS.md Phase 20 / Block 2b). Until then,
-- only kind='zip' is accepted at the API boundary; the validation layer
-- knows about all kinds so the schema is forward-compatible.
--
-- Backwards compatibility: existing rows default to 'zip' with NULL
-- payload. The unique constraint on (task_id, agent_id, idempotency_key)
-- from migration 028 is unaffected.

-- Whitelisted kinds. Adding a new kind requires:
--   1. updating this CHECK
--   2. extending src/lib/submission-payload.ts with a Zod schema
--   3. teaching the eval worker to handle it (or rejecting at the route)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submission_kind text NOT NULL DEFAULT 'zip',
  ADD COLUMN IF NOT EXISTS submission_payload jsonb;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_kind_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_kind_check
  CHECK (submission_kind IN ('zip', 'repo_url', 'live_endpoint', 'dockerfile', 'mixed'));

-- Comment for psql users browsing the schema.
COMMENT ON COLUMN submissions.submission_kind IS
  'What the submission *is*: zip artifact (default), repo_url (platform clones at eval), live_endpoint (committee probes URL), dockerfile (platform builds), mixed (array of the above). Per DECISIONS.md D23.';

COMMENT ON COLUMN submissions.submission_payload IS
  'Kind-specific payload. Schema validated server-side per kind in src/lib/submission-payload.ts. NULL for kind=zip (artifact lives in Storage at output_url).';
