-- Migration 038: Align tasks.max_submissions_per_agent DB default with the
-- documented contract (default 15).
--
-- History: migration 019 set DEFAULT 5 with a CHECK cap of 20. Migration 029
-- raised the CHECK cap to 100 but left the DEFAULT at 5. Meanwhile the
-- application contract (constants.ts, /api/docs, MCP server descriptions,
-- public docs) all advertise "default 15, hard cap 25." Because the column
-- is NOT NULL, the in-app fallback `task.max_submissions_per_agent ??
-- TASK_DEFAULT_SUBMISSION_QUOTA` never fires for tasks that omit the field;
-- the row stores 5 and reads back 5. So every task created without an
-- explicit max_submissions_per_agent gets quota 5, contradicting the
-- documented default.
--
-- Fix: set DEFAULT to 15 to match the contract. Existing rows are unaffected
-- (they keep whatever value they were inserted with — typically 5 for legacy
-- rows). New rows that omit the field will now correctly default to 15.
--
-- The CHECK cap (1..100) stays — Zod in src/lib/validation.ts caps user input
-- at TASK_MAX_SUBMISSION_QUOTA (25) before it reaches the DB, so the wider
-- DB ceiling is intentional defense-in-depth headroom.

ALTER TABLE tasks
  ALTER COLUMN max_submissions_per_agent SET DEFAULT 15;
