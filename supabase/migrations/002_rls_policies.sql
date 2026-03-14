-- ============================================================================
-- MAP PLATFORM — ROW LEVEL SECURITY POLICIES
-- ============================================================================
--
-- Security model:
-- - auth.uid() returns the Supabase user ID (maps to users.id)
-- - Companies can only see their own tasks, rubrics, and submissions to their tasks
-- - Agent builders can only see their own submissions
-- - Companies NEVER see other companies' rubrics
-- - Agents NEVER see other agents' submissions
-- - Evaluation results are visible to: the agent who submitted, the company who posted the task
-- - Messages are visible only to sender and recipient
-- - Deals are visible only to the involved company and agent
--
-- RLS is enforced even if the application layer has a bug.
-- ============================================================================

-- Enable RLS on every table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_builder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- ── Users ────────────────────────────────────────────────────
-- Users can read their own record. Service role handles creation.
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- ── Company Profiles ─────────────────────────────────────────
-- Companies see and edit only their own profile.
-- Agent builders can read company profiles (to see who posted a task).
CREATE POLICY company_profiles_select ON company_profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agent_builder')
  );

CREATE POLICY company_profiles_insert ON company_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY company_profiles_update ON company_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ── Agent Builder Profiles ───────────────────────────────────
-- Agent builders see and edit their own profile.
-- Companies can read agent builder profiles (to see who competed).
CREATE POLICY agent_builder_profiles_select ON agent_builder_profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'company')
  );

CREATE POLICY agent_builder_profiles_insert ON agent_builder_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_builder_profiles_update ON agent_builder_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ── Tasks ────────────────────────────────────────────────────
-- Companies see their own tasks (any status).
-- Agent builders see tasks with status 'open', 'evaluating', or 'closed'.
CREATE POLICY tasks_select_company ON tasks
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY tasks_select_agents ON tasks
  FOR SELECT USING (
    status IN ('open', 'evaluating', 'closed')
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agent_builder')
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'company')
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (company_id = auth.uid());

-- ── Rubric Criteria ──────────────────────────────────────────
-- CRITICAL: Only the company that owns the task can see rubric criteria.
-- Agents NEVER see rubrics before the deadline.
-- After task is closed, agents who submitted can see rubric criteria for transparency.
CREATE POLICY rubric_criteria_select_company ON rubric_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = rubric_criteria.task_id
      AND tasks.company_id = auth.uid()
    )
  );

CREATE POLICY rubric_criteria_select_agent_after_close ON rubric_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN submissions ON submissions.task_id = tasks.id
      WHERE tasks.id = rubric_criteria.task_id
      AND tasks.status = 'closed'
      AND submissions.agent_id = auth.uid()
    )
  );

CREATE POLICY rubric_criteria_insert ON rubric_criteria
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = rubric_criteria.task_id
      AND tasks.company_id = auth.uid()
    )
  );

CREATE POLICY rubric_criteria_update ON rubric_criteria
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = rubric_criteria.task_id
      AND tasks.company_id = auth.uid()
      AND tasks.status = 'draft'
    )
  );

CREATE POLICY rubric_criteria_delete ON rubric_criteria
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = rubric_criteria.task_id
      AND tasks.company_id = auth.uid()
      AND tasks.status = 'draft'
    )
  );

-- ── Submissions ──────────────────────────────────────────────
-- Agents see only their own submissions.
-- Companies see submissions to their tasks.
CREATE POLICY submissions_select_agent ON submissions
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY submissions_select_company ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = submissions.task_id
      AND tasks.company_id = auth.uid()
    )
  );

CREATE POLICY submissions_insert ON submissions
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agent_builder')
    AND EXISTS (SELECT 1 FROM tasks WHERE id = submissions.task_id AND status = 'open')
  );

-- ── Evaluation Results ───────────────────────────────────────
-- Agents see evaluation results for their own submissions.
-- Companies see evaluation results for submissions to their tasks.
-- No UPDATE policy — immutability enforced by trigger.
CREATE POLICY evaluation_results_select_agent ON evaluation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = evaluation_results.submission_id
      AND submissions.agent_id = auth.uid()
    )
  );

CREATE POLICY evaluation_results_select_company ON evaluation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions
      JOIN tasks ON tasks.id = submissions.task_id
      WHERE submissions.id = evaluation_results.submission_id
      AND tasks.company_id = auth.uid()
    )
  );

-- ── Evaluation Dimensions ────────────────────────────────────
-- Same visibility as evaluation results.
CREATE POLICY evaluation_dimensions_select_agent ON evaluation_dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluation_results
      JOIN submissions ON submissions.id = evaluation_results.submission_id
      WHERE evaluation_results.id = evaluation_dimensions.evaluation_result_id
      AND submissions.agent_id = auth.uid()
    )
  );

CREATE POLICY evaluation_dimensions_select_company ON evaluation_dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluation_results
      JOIN submissions ON submissions.id = evaluation_results.submission_id
      JOIN tasks ON tasks.id = submissions.task_id
      WHERE evaluation_results.id = evaluation_dimensions.evaluation_result_id
      AND tasks.company_id = auth.uid()
    )
  );

-- ── Messages ─────────────────────────────────────────────────
-- Users can only see messages they sent or received.
CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY messages_update_read ON messages
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ── Deals ────────────────────────────────────────────────────
-- Only the involved company and agent can see deals.
CREATE POLICY deals_select ON deals
  FOR SELECT USING (
    company_id = auth.uid() OR agent_id = auth.uid()
  );

CREATE POLICY deals_insert ON deals
  FOR INSERT WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'company')
  );
