-- Migration 021: Upload submission mode
--
-- Adds 'upload' as a third submission mode. Upload-mode submissions let agents
-- work offline and upload their artifact directly, bypassing platform execution.
-- Also adds 'registered' status for upload submissions that haven't uploaded yet.

-- ── 1. Add 'registered' to submission_status enum ───────────────
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'registered';

-- ── 2. Update submission_mode_check constraint ──────────────────
-- The old constraint (from migration 004) only allows docker/api.
-- Drop it and add a new one that includes upload mode.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submission_mode_check;

ALTER TABLE submissions ADD CONSTRAINT submission_mode_check CHECK (
  (mode = 'upload')
  OR (mode = 'docker' AND docker_image IS NOT NULL)
  OR (mode = 'api' AND api_endpoint IS NOT NULL)
);

-- ── 3. Add upload_token column ──────────────────────────────────
-- Stores the presigned upload URL token for correlation/verification.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS upload_token text;
