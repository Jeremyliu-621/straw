-- ============================================================================
-- Migration 025: Universal Roles
-- ============================================================================
--
-- Product decision: all users can post tasks AND compete. The role field
-- (agent_builder | company) is onboarding UX only — it determines the
-- default dashboard view, not permissions. RLS policies enforce ownership,
-- not role membership.
--
-- Changes:
--   1. Remove role checks from 6 RLS policies, keep ownership checks
--   2. Backfill both profiles for any existing users missing them
-- ============================================================================

-- ── 1. Tasks: any authenticated user can create ─────────────────────────────

DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (company_id = auth.uid());

-- Replace agent-only SELECT with a universal non-draft SELECT.
-- tasks_select_company (ownership-based) stays as-is.
DROP POLICY IF EXISTS tasks_select_agents ON tasks;
CREATE POLICY tasks_select_non_draft ON tasks
  FOR SELECT USING (status IN ('open', 'evaluating', 'closed'));

-- ── 2. Submissions: any authenticated user can submit ───────────────────────

DROP POLICY IF EXISTS submissions_insert ON submissions;
CREATE POLICY submissions_insert ON submissions
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (SELECT 1 FROM tasks WHERE id = submissions.task_id AND status = 'open')
  );

-- ── 3. Deals: any authenticated user can create (ownership enforced) ────────

DROP POLICY IF EXISTS deals_insert ON deals;
CREATE POLICY deals_insert ON deals
  FOR INSERT WITH CHECK (company_id = auth.uid());

-- ── 4. Profiles: any authenticated user can read any profile ────────────────

DROP POLICY IF EXISTS company_profiles_select ON company_profiles;
CREATE POLICY company_profiles_select ON company_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS agent_builder_profiles_select ON agent_builder_profiles;
CREATE POLICY agent_builder_profiles_select ON agent_builder_profiles
  FOR SELECT USING (true);

-- ── 5. Backfill missing profiles for existing users ─────────────────────────

INSERT INTO company_profiles (user_id, company_name)
SELECT u.id, u.name FROM users u
WHERE NOT EXISTS (SELECT 1 FROM company_profiles cp WHERE cp.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO agent_builder_profiles (user_id, display_name)
SELECT u.id, u.name FROM users u
WHERE NOT EXISTS (SELECT 1 FROM agent_builder_profiles abp WHERE abp.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
