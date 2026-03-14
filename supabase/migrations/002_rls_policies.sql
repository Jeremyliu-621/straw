/**
 * Map Database - RLS Policies
 *
 * Row Level Security ensures users only see their own data.
 *
 * Security model:
 * - Companies: Can see only their own company and related tasks/submissions
 * - Agent builders: Can see only their own profile and tasks they're eligible for
 * - Admins: Can see everything
 * - Public (anon): Can only read from public pages (landing page, public profiles)
 */

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own user record
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own record
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

-- Companies can read their own company
CREATE POLICY "companies_select_own"
  ON public.companies FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Agents can read company info (for public profiles/past competitions)
CREATE POLICY "companies_select_agent"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'agent_builder'
    )
  );

-- Companies can insert their own company (during onboarding)
CREATE POLICY "companies_insert_own"
  ON public.companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Companies can update their own company
CREATE POLICY "companies_update_own"
  ON public.companies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- AGENT BUILDERS TABLE POLICIES
-- ============================================================================

-- Agent builders can read their own profile
CREATE POLICY "agent_builders_select_own"
  ON public.agent_builders FOR SELECT
  USING (user_id = auth.uid());

-- Companies can read agent builder profiles (for recruitment/review)
CREATE POLICY "agent_builders_select_company"
  ON public.agent_builders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'company'
    )
  );

-- Agent builders can insert their own profile (onboarding)
CREATE POLICY "agent_builders_insert_own"
  ON public.agent_builders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Agent builders can update their own profile
CREATE POLICY "agent_builders_update_own"
  ON public.agent_builders FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

-- Companies can read their own tasks
CREATE POLICY "tasks_select_own_company"
  ON public.tasks FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE user_id = auth.uid()
    )
  );

-- Agent builders can read open tasks (for task feed)
CREATE POLICY "tasks_select_agent"
  ON public.tasks FOR SELECT
  USING (
    status = 'open' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'agent_builder'
    )
  );

-- Companies can insert tasks
CREATE POLICY "tasks_insert_company"
  ON public.tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE user_id = auth.uid()
    )
  );

-- Companies can update their own tasks
CREATE POLICY "tasks_update_own_company"
  ON public.tasks FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM public.companies
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TASK SUBMISSIONS TABLE POLICIES
-- ============================================================================

-- Agent builders can read their own submissions
CREATE POLICY "task_submissions_select_own_agent"
  ON public.task_submissions FOR SELECT
  USING (
    agent_builder_id IN (
      SELECT id FROM public.agent_builders
      WHERE user_id = auth.uid()
    )
  );

-- Companies can read submissions to their tasks
CREATE POLICY "task_submissions_select_company"
  ON public.task_submissions FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE user_id = auth.uid()
      )
    )
  );

-- Agent builders can insert submissions (enter competition)
CREATE POLICY "task_submissions_insert_agent"
  ON public.task_submissions FOR INSERT
  WITH CHECK (
    agent_builder_id IN (
      SELECT id FROM public.agent_builders
      WHERE user_id = auth.uid()
    )
  );

-- Agent builders can update their own submissions
CREATE POLICY "task_submissions_update_own_agent"
  ON public.task_submissions FOR UPDATE
  USING (
    agent_builder_id IN (
      SELECT id FROM public.agent_builders
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_builder_id IN (
      SELECT id FROM public.agent_builders
      WHERE user_id = auth.uid()
    )
  );

-- System/service role can update submission status (from worker processes)
-- This is handled via service role key (not row-level)

-- ============================================================================
-- EVALUATION RESULTS TABLE POLICIES
-- ============================================================================

-- Agent builders can read their own evaluation results
CREATE POLICY "evaluation_results_select_own_agent"
  ON public.evaluation_results FOR SELECT
  USING (
    agent_builder_id IN (
      SELECT id FROM public.agent_builders
      WHERE user_id = auth.uid()
    )
  );

-- Companies can read evaluation results for their tasks
CREATE POLICY "evaluation_results_select_company"
  ON public.evaluation_results FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE company_id IN (
        SELECT id FROM public.companies
        WHERE user_id = auth.uid()
      )
    )
  );

-- System/service role inserts evaluation results (not via RLS)

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Users can read messages they sent or received
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- Users can insert messages
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update messages they sent (mark as read)
CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
