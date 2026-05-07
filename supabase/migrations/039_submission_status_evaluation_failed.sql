-- Migration 039: Add 'evaluation_failed' to submission_status enum
--
-- Surfaced 2026-05-07 during the local-loop proof (D36): when the LLM judge
-- fails fatally, the eval worker tries to write `submission_status =
-- 'evaluation_failed'` and Postgres rejects it with:
--   invalid input value for enum submission_status: "evaluation_failed"
--
-- The worker then logs "MANUAL REVIEW NEEDED" and the submission stays stuck
-- at whatever status it had before (typically `completed` from the upload
-- step). Silent stuck state — no surface to the user, no retry path.
--
-- The constant has lived in src/constants.ts:124 since SUBMISSION_STATUS was
-- factored out, but no migration ever added the value to the DB enum.
-- Migration 001 created the enum as ('pending', 'running', 'completed',
-- 'failed'); migration 021 added 'registered'. This migration adds the
-- missing fourth.
--
-- Idempotent: ADD VALUE IF NOT EXISTS is a no-op if the value already exists.

ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'evaluation_failed';
