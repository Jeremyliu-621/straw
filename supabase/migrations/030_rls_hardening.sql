-- Migration 030: RLS hardening
--
-- Fixes advisor-flagged issues discovered during deployment prep:
--
-- 1. Six public-schema tables had RLS disabled. Anyone with the anon key
--    could query them directly via PostgREST. Critically, `webhooks`
--    contains the `secret` column used to sign outbound HMAC payloads —
--    that exposure is a real credential leak.
--
-- 2. `audit_log_insert` had WITH CHECK (true), letting any role write
--    audit rows under any user_id. Tighten to owner-only.
--
-- 3. Three trigger functions had mutable search_path. Pin to public,pg_temp.
--
-- Security model stays consistent with migration 002:
--  - Service role bypasses RLS (workers + API routes that need it)
--  - Authenticated users see/modify their own rows only
--  - Cross-role access (e.g. company seeing agent's invitation) handled
--    via EXISTS joins against tasks/submissions ownership columns

-- ============================================================================
-- PART 1 — Enable RLS + owner policies on the six unprotected tables
-- ============================================================================

-- ── webhooks (CRITICAL: contains HMAC secrets) ───────────────
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_select ON webhooks;
DROP POLICY IF EXISTS webhooks_insert ON webhooks;
DROP POLICY IF EXISTS webhooks_update ON webhooks;
DROP POLICY IF EXISTS webhooks_delete ON webhooks;

CREATE POLICY webhooks_select ON webhooks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY webhooks_insert ON webhooks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY webhooks_update ON webhooks
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY webhooks_delete ON webhooks
  FOR DELETE USING (user_id = auth.uid());

-- ── webhook_deliveries (visible to webhook owner) ────────────
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_select ON webhook_deliveries;

CREATE POLICY webhook_deliveries_select ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks
      WHERE webhooks.id = webhook_deliveries.webhook_id
        AND webhooks.user_id = auth.uid()
    )
  );
-- INSERT/UPDATE/DELETE: service-role only (no authenticated policy = deny)

-- ── notifications (owner-only) ───────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own notifications read/unread
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- INSERT/DELETE: service-role only

-- ── task_invitations (agent or task-owner) ───────────────────
ALTER TABLE task_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_invitations_select ON task_invitations;
DROP POLICY IF EXISTS task_invitations_update ON task_invitations;

CREATE POLICY task_invitations_select ON task_invitations
  FOR SELECT USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_invitations.task_id
        AND tasks.company_id = auth.uid()
    )
  );

-- Agent accepts/declines their own invitation (updates status/responded_at)
CREATE POLICY task_invitations_update ON task_invitations
  FOR UPDATE USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());
-- INSERT/DELETE: service-role only (company sends invitations via API)

-- ── submission_artifacts (owner + task-owner) ────────────────
ALTER TABLE submission_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submission_artifacts_select ON submission_artifacts;

CREATE POLICY submission_artifacts_select ON submission_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions
      LEFT JOIN tasks ON tasks.id = submissions.task_id
      WHERE submissions.id = submission_artifacts.submission_id
        AND (submissions.agent_id = auth.uid() OR tasks.company_id = auth.uid())
    )
  );
-- INSERT/UPDATE/DELETE: service-role only (worker writes these)

-- ── task_comments (public-readable on visible tasks; authors edit own) ──
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_comments_select ON task_comments;
DROP POLICY IF EXISTS task_comments_insert ON task_comments;
DROP POLICY IF EXISTS task_comments_update ON task_comments;
DROP POLICY IF EXISTS task_comments_delete ON task_comments;

-- Readable if you can see the task (company owner always; others if open/evaluating/closed)
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND (
          tasks.company_id = auth.uid()
          OR tasks.status IN ('open', 'evaluating', 'closed')
        )
    )
  );

CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY task_comments_update ON task_comments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY task_comments_delete ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PART 2 — Tighten audit_log INSERT policy
-- ============================================================================
-- Previous policy had WITH CHECK (true), letting any role write audit rows
-- under any user_id. Service-role bypasses RLS, so tightening to owner-only
-- does not affect server-side writes; it only prevents cross-user forgery
-- from authenticated clients.

DROP POLICY IF EXISTS audit_log_insert ON audit_log;

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 3 — Pin search_path on trigger functions
-- ============================================================================
-- Mutable search_path lets a privileged user create a shadow object
-- (e.g. `public.users`) and have SECURITY DEFINER functions resolve to it.
-- Pin to public + pg_temp so resolution is deterministic.

ALTER FUNCTION public.prevent_evaluation_result_update()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_evaluation_dimension_update()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at()
  SET search_path = public, pg_temp;
