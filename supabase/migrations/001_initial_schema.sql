-- ============================================================================
-- MAP PLATFORM — INITIAL SCHEMA
-- ============================================================================
--
-- SCHEMA PLAN (read before modifying):
--
-- users
--   id (uuid, PK, default gen_random_uuid())
--   email (text, unique, not null)
--   name (text, not null)
--   role ('company' | 'agent_builder', not null)
--   avatar_url (text, nullable)
--   auth_provider_id (text, unique, not null) — external auth ID from NextAuth
--   onboarded (boolean, default false) — has completed onboarding flow
--   created_at, updated_at
--
-- company_profiles
--   id (uuid, PK, default gen_random_uuid())
--   user_id (uuid, FK → users, unique, not null)
--   company_name (text, not null)
--   industry (text, nullable)
--   website (text, nullable)
--   description (text, nullable)
--   created_at, updated_at
--
-- agent_builder_profiles
--   id (uuid, PK, default gen_random_uuid())
--   user_id (uuid, FK → users, unique, not null)
--   display_name (text, not null)
--   docker_image (text, nullable) — validated on save
--   bio (text, nullable)
--   github_url (text, nullable)
--   categories (text[], default '{}') — specializations
--   created_at, updated_at
--
-- tasks
--   id (uuid, PK)
--   company_id (uuid, FK → users, not null) — the company that posted it
--   title (text, not null, 10-200 chars)
--   description (text, not null)
--   category (text, not null) — for agent matching
--   input_spec (text, not null) — what the agent receives
--   output_spec (text, not null) — what the agent must produce
--   test_suite_url (text, nullable) — Supabase Storage URL
--   test_weight (integer, not null, 0-100) — % weight for automated tests
--   llm_weight (integer, not null, 0-100) — % weight for LLM judge
--   CHECK (test_weight + llm_weight = 100)
--   budget_cents (integer, not null)
--   deadline (timestamptz, not null)
--   status ('draft' | 'open' | 'evaluating' | 'closed', default 'draft')
--   created_at, updated_at
--
-- rubric_criteria
--   id (uuid, PK)
--   task_id (uuid, FK → tasks, not null)
--   name (text, not null)
--   description (text, nullable)
--   weight (integer, not null, 1-100)
--   position (integer, not null) — display order
--   Constraint: weights per task must sum to 100 (enforced at app layer, validated on task publish)
--
-- submissions
--   id (uuid, PK)
--   task_id (uuid, FK → tasks, not null)
--   agent_id (uuid, FK → users, not null) — the agent builder
--   status ('pending' | 'running' | 'completed' | 'failed', default 'pending')
--   docker_image (text, not null) — snapshot of image at submission time
--   output_url (text, nullable) — Supabase Storage URL for agent output
--   error_message (text, nullable) — if execution failed
--   started_at (timestamptz, nullable)
--   completed_at (timestamptz, nullable)
--   created_at
--   UNIQUE (task_id, agent_id) — one submission per agent per task
--
-- evaluation_results
--   id (uuid, PK)
--   submission_id (uuid, FK → submissions, unique, not null)
--   test_score (numeric(5,2), nullable) — 0-100, from automated tests
--   llm_score (numeric(5,2), nullable) — 0-100, from LLM judge
--   final_score (numeric(5,2), not null) — weighted combination
--   llm_reasoning (text, nullable) — full LLM response for audit
--   created_at
--   NO UPDATE — append-only, enforced by trigger
--
-- evaluation_dimensions
--   id (uuid, PK)
--   evaluation_result_id (uuid, FK → evaluation_results, not null)
--   rubric_criterion_id (uuid, FK → rubric_criteria, not null)
--   score (numeric(5,2), not null) — 0-100
--   reasoning (text, nullable) — LLM reasoning for this dimension
--   created_at
--   NO UPDATE — append-only
--
-- messages
--   id (uuid, PK)
--   thread_id (uuid, not null) — groups messages in a conversation
--   sender_id (uuid, FK → users, not null)
--   recipient_id (uuid, FK → users, not null)
--   task_id (uuid, FK → tasks, nullable) — optional context
--   body (text, not null)
--   read_at (timestamptz, nullable)
--   created_at
--
-- deals
--   id (uuid, PK)
--   task_id (uuid, FK → tasks, not null)
--   company_id (uuid, FK → users, not null)
--   agent_id (uuid, FK → users, not null)
--   deal_type ('output_purchase' | 'agent_hire', not null)
--   deal_value_cents (integer, not null)
--   platform_fee_cents (integer, not null) — calculated at creation
--   created_at
--
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('company', 'agent_builder');

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  name            text NOT NULL,
  role            user_role NOT NULL,
  avatar_url      text,
  auth_provider_id text UNIQUE NOT NULL,
  onboarded       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_email ON users (email);

-- ── Company Profiles ─────────────────────────────────────────

CREATE TABLE company_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name  text NOT NULL,
  industry      text,
  website       text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Agent Builder Profiles ───────────────────────────────────

CREATE TABLE agent_builder_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  docker_image  text,
  bio           text,
  github_url    text,
  categories    text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Tasks ────────────────────────────────────────────────────

CREATE TYPE task_status AS ENUM ('draft', 'open', 'evaluating', 'closed');

CREATE TABLE tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 10 AND 200),
  description     text NOT NULL,
  category        text NOT NULL,
  input_spec      text NOT NULL,
  output_spec     text NOT NULL,
  test_suite_url  text,
  test_weight     integer NOT NULL CHECK (test_weight BETWEEN 0 AND 100),
  llm_weight      integer NOT NULL CHECK (llm_weight BETWEEN 0 AND 100),
  budget_cents    integer NOT NULL CHECK (budget_cents > 0),
  deadline        timestamptz NOT NULL,
  status          task_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum_100 CHECK (test_weight + llm_weight = 100)
);

CREATE INDEX idx_tasks_company ON tasks (company_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_category ON tasks (category);
CREATE INDEX idx_tasks_deadline ON tasks (deadline);

-- ── Rubric Criteria ──────────────────────────────────────────

CREATE TABLE rubric_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  weight      integer NOT NULL CHECK (weight BETWEEN 1 AND 100),
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rubric_criteria_task ON rubric_criteria (task_id);

-- ── Submissions ──────────────────────────────────────────────

CREATE TYPE submission_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          submission_status NOT NULL DEFAULT 'pending',
  docker_image    text NOT NULL,
  output_url      text,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_agent_per_task UNIQUE (task_id, agent_id)
);

CREATE INDEX idx_submissions_task ON submissions (task_id);
CREATE INDEX idx_submissions_agent ON submissions (agent_id);
CREATE INDEX idx_submissions_status ON submissions (status);

-- ── Evaluation Results ───────────────────────────────────────

CREATE TABLE evaluation_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid UNIQUE NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_score      numeric(5,2) CHECK (test_score IS NULL OR test_score BETWEEN 0 AND 100),
  llm_score       numeric(5,2) CHECK (llm_score IS NULL OR llm_score BETWEEN 0 AND 100),
  final_score     numeric(5,2) NOT NULL CHECK (final_score BETWEEN 0 AND 100),
  llm_reasoning   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evaluation_results_submission ON evaluation_results (submission_id);
CREATE INDEX idx_evaluation_results_score ON evaluation_results (final_score DESC);

-- ── Evaluation Dimensions ────────────────────────────────────

CREATE TABLE evaluation_dimensions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_result_id  uuid NOT NULL REFERENCES evaluation_results(id) ON DELETE CASCADE,
  rubric_criterion_id   uuid NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score                 numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasoning             text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evaluation_dimensions_result ON evaluation_dimensions (evaluation_result_id);

-- ── Messages ─────────────────────────────────────────────────

CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid NOT NULL,
  sender_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id       uuid REFERENCES tasks(id) ON DELETE SET NULL,
  body          text NOT NULL,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_thread ON messages (thread_id, created_at);
CREATE INDEX idx_messages_recipient ON messages (recipient_id, read_at);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- ── Deals ────────────────────────────────────────────────────

CREATE TYPE deal_type AS ENUM ('output_purchase', 'agent_hire');

CREATE TABLE deals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_type           deal_type NOT NULL,
  deal_value_cents    integer NOT NULL CHECK (deal_value_cents > 0),
  platform_fee_cents  integer NOT NULL CHECK (platform_fee_cents >= 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_task ON deals (task_id);
CREATE INDEX idx_deals_agent ON deals (agent_id);

-- ── Immutability Enforcement ─────────────────────────────────

-- Evaluation results are append-only. No updates allowed.
CREATE OR REPLACE FUNCTION prevent_evaluation_result_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evaluation_results are immutable — updates are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluation_results_immutable
  BEFORE UPDATE ON evaluation_results
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evaluation_result_update();

-- Evaluation dimensions are also append-only.
CREATE OR REPLACE FUNCTION prevent_evaluation_dimension_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evaluation_dimensions are immutable — updates are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluation_dimensions_immutable
  BEFORE UPDATE ON evaluation_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evaluation_dimension_update();

-- ── Updated_at Trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER company_profiles_updated_at
  BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agent_builder_profiles_updated_at
  BEFORE UPDATE ON agent_builder_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
