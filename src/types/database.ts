import type { UserRole, TaskStatus, SubmissionStatus, DealType } from "@/constants";

// ── Base ─────────────────────────────────────────────────────

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

// ── Users ────────────────────────────────────────────────────

export interface User extends Timestamps {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  auth_provider_id: string;
  onboarded: boolean;
}

export interface UserInsert {
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  auth_provider_id: string;
}

// ── Company Profiles ─────────────────────────────────────────

export interface CompanyProfile extends Timestamps {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
}

export interface CompanyProfileInsert {
  user_id: string;
  company_name: string;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
}

// ── Agent Builder Profiles ───────────────────────────────────

export interface AgentBuilderProfile extends Timestamps {
  id: string;
  user_id: string;
  display_name: string;
  docker_image: string | null;
  bio: string | null;
  github_url: string | null;
  categories: string[];
}

export interface AgentBuilderProfileInsert {
  user_id: string;
  display_name: string;
  docker_image?: string | null;
  bio?: string | null;
  github_url?: string | null;
  categories?: string[];
}

// ── Tasks ────────────────────────────────────────────────────

export interface Task extends Timestamps {
  id: string;
  company_id: string;
  title: string;
  description: string;
  category: string;
  input_spec: string;
  output_spec: string;
  test_suite_url: string | null;
  test_weight: number;
  llm_weight: number;
  budget_cents: number;
  deadline: string;
  status: TaskStatus;
}

export interface TaskInsert {
  company_id: string;
  title: string;
  description: string;
  category: string;
  input_spec: string;
  output_spec: string;
  test_suite_url?: string | null;
  test_weight: number;
  llm_weight: number;
  budget_cents: number;
  deadline: string;
}

// ── Rubric Criteria ──────────────────────────────────────────

export interface RubricCriterion {
  id: string;
  task_id: string;
  name: string;
  description: string | null;
  weight: number;
  position: number;
  created_at: string;
}

export interface RubricCriterionInsert {
  task_id: string;
  name: string;
  description?: string | null;
  weight: number;
  position: number;
}

// ── Submissions ──────────────────────────────────────────────

export interface Submission {
  id: string;
  task_id: string;
  agent_id: string;
  status: SubmissionStatus;
  docker_image: string;
  output_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SubmissionInsert {
  task_id: string;
  agent_id: string;
  docker_image: string;
}

// ── Evaluation Results ───────────────────────────────────────

export interface EvaluationResult {
  id: string;
  submission_id: string;
  test_score: number | null;
  llm_score: number | null;
  final_score: number;
  llm_reasoning: string | null;
  created_at: string;
}

export interface EvaluationResultInsert {
  submission_id: string;
  test_score?: number | null;
  llm_score?: number | null;
  final_score: number;
  llm_reasoning?: string | null;
}

// ── Evaluation Dimensions ────────────────────────────────────

export interface EvaluationDimension {
  id: string;
  evaluation_result_id: string;
  rubric_criterion_id: string;
  score: number;
  reasoning: string | null;
  created_at: string;
}

export interface EvaluationDimensionInsert {
  evaluation_result_id: string;
  rubric_criterion_id: string;
  score: number;
  reasoning?: string | null;
}

// ── Messages ─────────────────────────────────────────────────

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  task_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageInsert {
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  task_id?: string | null;
  body: string;
}

// ── Deals ────────────────────────────────────────────────────

export interface Deal {
  id: string;
  task_id: string;
  company_id: string;
  agent_id: string;
  deal_type: DealType;
  deal_value_cents: number;
  platform_fee_cents: number;
  created_at: string;
}

export interface DealInsert {
  task_id: string;
  company_id: string;
  agent_id: string;
  deal_type: DealType;
  deal_value_cents: number;
  platform_fee_cents: number;
}
