-- Migration 027: Performance indexes for scale
--
-- Adds missing composite / compound indexes to accelerate hot query paths
-- identified by the overnight scale-pass audit. Purely additive — no schema
-- changes, no data changes, no behavioral changes.
--
-- All indexes use IF NOT EXISTS so the migration is idempotent and safe
-- to re-run. Naming follows the existing idx_<table>_<shortname> convention.
--
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction. This
-- migration uses plain CREATE INDEX (matches migrations 001–026). At today's
-- table sizes the brief AccessShareLock during build is acceptable. If tables
-- grow to the point where build locks are painful, drop + re-create the
-- specific index with CONCURRENTLY from a psql session outside the
-- migration runner.
--
-- See [[scale-pass-plan]] for the full rationale.

-- ============================================================================
-- submissions — leaderboard, agent dashboard
-- ============================================================================

-- Leaderboard: WHERE task_id = ? AND status = 'completed' (ordered by score
-- via evaluation_results join). Current indexes on task_id alone and status
-- alone each cover only one predicate; compound skips the intersect.
-- Called from: /api/tasks/[id]/leaderboard, /api/v1/tasks/[id]/leaderboard,
-- /api/public/leaderboard, evaluation worker's "all siblings terminal?" check.
CREATE INDEX IF NOT EXISTS idx_submissions_task_status
  ON submissions (task_id, status);

-- Agent dashboard + profile view: WHERE agent_id = ? ORDER BY created_at DESC.
-- Current idx_submissions_agent is single-column; compound fuses ORDER BY.
-- Called from: src/db/submissions.ts findByAgent, /api/agents/me, agent profile page.
CREATE INDEX IF NOT EXISTS idx_submissions_agent_created
  ON submissions (agent_id, created_at DESC);

-- ============================================================================
-- messages — thread + sender history
-- ============================================================================

-- Sender side of thread listing: WHERE sender_id = ? ORDER BY created_at DESC.
-- Existing idx_messages_sender is single-column.
-- Called from: src/db/messages.ts findThreadsForUser (sender branch).
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages (sender_id, created_at DESC);

-- ============================================================================
-- audit_log — compliance + forensics
-- ============================================================================

-- Filter by user + action, ordered recent-first.
-- Existing: idx_audit_log_user, idx_audit_log_action, idx_audit_log_created
-- separately. Compound eliminates bitmap-and then sort.
-- Called from: src/db/audit-log.ts query() when both user_id and action set.
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action_created
  ON audit_log (user_id, action, created_at DESC);

-- Filter by resource, ordered recent-first. Existing idx_audit_log_resource
-- is (resource_type, resource_id) without created_at.
-- Called from: src/db/audit-log.ts getByResource() for per-resource audit trail.
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_created
  ON audit_log (resource_type, resource_id, created_at DESC);

-- ============================================================================
-- webhook_deliveries — retry queue + inspection
-- ============================================================================

-- Deliveries for a webhook, filtered by status (pending/failed/delivered).
-- Existing idx_webhook_deliveries_webhook and idx_webhook_deliveries_status
-- separately require two index scans + bitmap AND for the common filter.
-- Called from: webhook-worker status update path, webhook inspection APIs.
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_status
  ON webhook_deliveries (webhook_id, status);

-- ============================================================================
-- api_keys — listing active keys
-- ============================================================================

-- Active keys for a user (WHERE user_id = ? AND revoked_at IS NULL).
-- Partial index keeps size small — only ever a handful of active keys per user.
-- Called from: src/app/api/api-keys/route.ts GET list.
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
  ON api_keys (user_id, created_at DESC)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- task_invitations — agent inbox
-- ============================================================================

-- Pending invitations for an agent.
-- Existing idx_task_invitations_agent is single-column; compound + partial
-- is a thin slice (pending-only) that stays hot.
-- Called from: src/services/task-match-dispatch.ts, agent invitation inbox.
CREATE INDEX IF NOT EXISTS idx_task_invitations_agent_pending
  ON task_invitations (agent_id, created_at DESC)
  WHERE status = 'pending';
