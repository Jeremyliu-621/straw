/**
 * Map Database Schema - Initial Migration
 *
 * This migration creates all core tables for the Map platform:
 * - User management (extends Supabase auth.users)
 * - Companies (demand side)
 * - Agent builders (supply side)
 * - Tasks (company-posted work)
 * - Task submissions (agent entries)
 * - Evaluation results (scored submissions)
 * - Messages (communication between parties)
 *
 * Design principles:
 * - All timestamps use UTC and are ISO 8601 formatted
 * - Foreign keys reference auth.users for auth'd users
 * - JSONB for flexible rubric and dimension scores
 * - UUID for all primary keys
 * - Immutable evaluation results (no updates, append-only)
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

/**
 * Users table extends Supabase's auth.users with application-specific data.
 * Each auth user has exactly one row here with their role.
 */
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('company', 'agent_builder', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPANIES (Demand Side)
-- ============================================================================

/**
 * Companies table stores company profiles.
 * One company per user (1:1 relationship via user_id).
 */
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AGENT BUILDERS (Supply Side)
-- ============================================================================

/**
 * Agent builders table stores agent profiles.
 * One builder per user (1:1 relationship via user_id).
 */
CREATE TABLE IF NOT EXISTS public.agent_builders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  docker_image_url TEXT NOT NULL,
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  reputation_score NUMERIC(5, 2) DEFAULT 0,
  tasks_attempted INTEGER DEFAULT 0,
  tasks_won INTEGER DEFAULT 0,
  average_score NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TASKS (Company-Posted Work)
-- ============================================================================

/**
 * Tasks table stores competition tasks posted by companies.
 * Includes task definition, test suite reference, rubric for evaluation.
 */
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  input_spec TEXT,
  output_spec TEXT,
  test_suite_url TEXT,
  rubric JSONB NOT NULL, -- { criteria: [{ name, weight }], ... }
  test_weight NUMERIC(3, 2) NOT NULL DEFAULT 0.6, -- 0-1
  llm_weight NUMERIC(3, 2) NOT NULL DEFAULT 0.4, -- 0-1
  budget TEXT, -- Free-form (can be "10,000 USD" or "equity" etc)
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'evaluating', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TASK SUBMISSIONS (Agent Entries)
-- ============================================================================

/**
 * Task submissions table tracks when agents enter a competition.
 * One submission per (task, agent_builder) pair.
 */
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_builder_id UUID NOT NULL REFERENCES public.agent_builders(id) ON DELETE CASCADE,
  docker_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, agent_builder_id) -- One submission per agent per task
);

-- ============================================================================
-- EVALUATION RESULTS (Immutable Scored Submissions)
-- ============================================================================

/**
 * Evaluation results table stores the final scores for submissions.
 * IMMUTABLE: Once written, never updated. Append-only for audit trail.
 * Stores both automated test scores and LLM judge scores.
 */
CREATE TABLE IF NOT EXISTS public.evaluation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.task_submissions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_builder_id UUID NOT NULL REFERENCES public.agent_builders(id) ON DELETE CASCADE,

  -- Test scores (0-100)
  test_score NUMERIC(5, 2),
  test_results JSONB, -- { passed, failed, errored, total }

  -- LLM judge scores (0-100)
  llm_score NUMERIC(5, 2),
  llm_dimension_scores JSONB, -- [{ dimension, score, reasoning }]

  -- Final computed score (0-100)
  final_score NUMERIC(5, 2),

  -- Audit trail
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MESSAGES (Acquisition Flow Communication)
-- ============================================================================

/**
 * Messages table stores communication between companies and agent builders.
 * After a task closes, the winning agent builder can be contacted.
 */
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- Agent builders
CREATE INDEX IF NOT EXISTS idx_agent_builders_user_id ON public.agent_builders(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_builders_categories ON public.agent_builders USING GIN(categories);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);

-- Task submissions
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_agent_id ON public.task_submissions(agent_builder_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON public.task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_at ON public.task_submissions(submitted_at);

-- Evaluation results
CREATE INDEX IF NOT EXISTS idx_evaluation_results_submission_id ON public.evaluation_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_task_id ON public.evaluation_results(task_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_agent_id ON public.evaluation_results(agent_builder_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_final_score ON public.evaluation_results(final_score DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON public.messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);
