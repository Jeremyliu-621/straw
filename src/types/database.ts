/**
 * Database schema types
 * These types mirror the Supabase tables and should be kept in sync with migrations
 */

// ============================================================================
// USERS
// ============================================================================

export type UserRole = "company" | "agent_builder" | "admin";

export interface User {
  id: string; // UUID
  email: string;
  role: UserRole;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// COMPANIES
// ============================================================================

export interface Company {
  id: string; // UUID
  user_id: string; // FK to users
  name: string;
  website: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// AGENT BUILDERS
// ============================================================================

export interface AgentBuilder {
  id: string; // UUID
  user_id: string; // FK to users
  display_name: string;
  bio: string | null;
  docker_image_url: string;
  categories: string[];
  reputation_score: number; // Numeric(5,2)
  tasks_attempted: number;
  tasks_won: number;
  average_score: number; // Numeric(5,2)
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// TASKS
// ============================================================================

export type TaskStatus = "open" | "evaluating" | "closed";

export interface TaskRubric {
  criteria: Array<{
    name: string;
    weight: number; // 0-100
    description?: string;
  }>;
  test_weight?: number;
  llm_weight?: number;
}

export interface Task {
  id: string; // UUID
  company_id: string; // FK to companies
  title: string;
  description: string;
  category: string; // Task category for agent matching
  input_spec: string | null;
  output_spec: string | null;
  test_suite_url: string | null;
  rubric: TaskRubric; // JSONB
  test_weight: number; // Numeric(3,2), 0-1
  llm_weight: number; // Numeric(3,2), 0-1
  budget: string | null;
  deadline: string; // ISO 8601
  status: TaskStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// TASK SUBMISSIONS
// ============================================================================

export type SubmissionStatus = "pending" | "running" | "completed" | "failed";

export interface TaskSubmission {
  id: string; // UUID
  task_id: string; // FK to tasks
  agent_builder_id: string; // FK to agent_builders
  docker_image_url: string;
  status: SubmissionStatus;
  submitted_at: string; // ISO 8601
  completed_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// EVALUATION RESULTS
// ============================================================================

export interface TestResults {
  passed: number;
  failed: number;
  errored: number;
  total: number;
  test_details?: Array<{
    name: string;
    status: "passed" | "failed" | "errored";
    error?: string;
  }>;
}

export interface LLMDimensionScore {
  dimension: string;
  score: number; // 0-100
  reasoning: string;
}

export interface EvaluationResult {
  id: string; // UUID
  submission_id: string; // FK to task_submissions
  task_id: string; // FK to tasks
  agent_builder_id: string; // FK to agent_builders
  test_score: number | null; // Numeric(5,2), 0-100
  test_results: TestResults | null; // JSONB
  llm_score: number | null; // Numeric(5,2), 0-100
  llm_dimension_scores: LLMDimensionScore[] | null; // JSONB
  final_score: number | null; // Numeric(5,2), 0-100
  evaluated_at: string; // ISO 8601
  created_at: string; // ISO 8601
}

// ============================================================================
// MESSAGES
// ============================================================================

export interface Message {
  id: string; // UUID
  task_id: string; // FK to tasks
  sender_id: string; // FK to users
  recipient_id: string; // FK to users
  body: string;
  sent_at: string; // ISO 8601
  read_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
}

// ============================================================================
// JOINED TYPES (for API responses)
// ============================================================================

/**
 * TaskWithCompany: Task with company info included
 */
export interface TaskWithCompany extends Task {
  company: Company;
}

/**
 * TaskSubmissionWithBuilder: TaskSubmission with agent builder info
 */
export interface TaskSubmissionWithBuilder extends TaskSubmission {
  agent_builder: AgentBuilder;
}

/**
 * Leaderboard entry (evaluated submission with results)
 */
export interface LeaderboardEntry {
  submission_id: string;
  agent_id: string;
  agent_number: number; // Anonymized as "Agent #1", "Agent #2", etc
  final_score: number;
  status: SubmissionStatus;
  evaluation_result: EvaluationResult | null;
}
