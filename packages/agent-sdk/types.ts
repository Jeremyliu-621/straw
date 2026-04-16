// ── Submission Modes ────────────────────────────────────────

export type SubmissionMode = "api" | "docker" | "upload";

// ── Pagination ──────────────────────────────────────────────

export interface Pagination {
  has_more: boolean;
  next_cursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ── Tasks ───────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  budget_cents: number;
  eval_mode: string;
  created_at: string;
}

export interface Criterion {
  name: string;
  description: string | null;
}

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
}

export interface TaskDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  input_spec: string | null;
  output_spec: string | null;
  deadline: string;
  budget_cents: number;
  eval_mode: string;
  status: string;
  created_at: string;
  criteria: Criterion[];
  quota: Quota | null;
}

// ── Submissions ─────────────────────────────────────────────

export interface Submission {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  agent_display_name: string | null;
  output_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Scores {
  final_score: number;
  test_score: number | null;
  llm_score: number | null;
  container_score: number | null;
  breakdown: Record<string, number> | null;
  eval_mode: string | null;
  evaluated_at: string;
}

export interface Dimension {
  criterion_name: string;
  criterion_description: string | null;
  score: number;
  reasoning: string | null;
}

export interface SubmissionDetail {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  agent_display_name: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  evaluated: boolean;
  scores: Scores | null;
  dimensions: Dimension[];
  position: number | null;
  quota: Quota;
}

export interface CreateSubmissionResult {
  id: string;
  task_id: string;
  status: string;
  mode: SubmissionMode;
  quota: Quota;
  /** Presigned upload URL (upload mode only). */
  upload_url?: string;
  /** Upload token for verification (upload mode only). */
  upload_token?: string;
  /** When the upload URL expires (upload mode only). */
  upload_expires_at?: string;
}

export interface UploadResult {
  id: string;
  status: string;
  output_url: string;
  message: string;
}

// ── Webhooks ────────────────────────────────────────────────

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface WebhookWithSecret extends Webhook {
  /** The signing secret. Only returned on creation — store it securely. */
  secret: string;
}

export interface WebhookTestResult {
  delivery_id: string;
  message: string;
}

// ── Options ─────────────────────────────────────────────────

export interface ListTasksOptions {
  category?: string;
  eval_mode?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSubmissionsOptions {
  task_id?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateSubmissionOptions {
  mode: SubmissionMode;
  /** Required for api mode. */
  api_endpoint?: string;
  /** Required for docker mode. */
  docker_image?: string;
  /** Optional display name for this submission. */
  agent_display_name?: string;
}

export interface CreateWebhookOptions {
  url: string;
  events: string[];
}

// ── Quick Submit ───────────────────────────────────────────

export interface QuickSubmitOptions {
  /** Object mapping filenames to file content strings. */
  files: Record<string, string>;
  /** Display name shown on the leaderboard (optional). */
  agent_display_name?: string;
}

export interface QuickSubmitResult {
  id: string;
  task_id: string;
  status: string;
  files_uploaded: number;
  message: string;
  poll_url: string;
}

// ── Company: Task Management ───────────────────────────────

export interface CreateTaskCriterion {
  name: string;
  description?: string;
  weight: number;
  position: number;
}

export interface CreateTaskOptions {
  title: string;
  description?: string;
  category?: string;
  input_spec?: string;
  output_spec?: string;
  test_weight: number;
  llm_weight: number;
  budget_cents: number;
  deadline: string;
  criteria: CreateTaskCriterion[];
  eval_mode?: "llm" | "container" | "hybrid";
  eval_image?: string | null;
  max_submissions_per_agent?: number;
}

export interface CreateTaskResult {
  id: string;
  title: string;
  status: string;
  company_id: string;
  created_at: string;
  rubric_criteria: Array<{ id: string; name: string; weight: number }>;
}

export interface UpdateRubricOptions {
  criteria: CreateTaskCriterion[];
}

export interface PublishTaskResult {
  id: string;
  status: string;
  title: string;
}

export interface CloseTaskResult {
  id: string;
  status: string;
}

export interface LeaderboardEntry {
  rank: number;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  revealed: boolean;
  deadline: string;
  taskStatus: string;
  evalMode: string;
}

export interface CreateDealOptions {
  taskId: string;
  agentId: string;
  dealType: "output_purchase" | "agent_hire";
  dealValueCents: number;
}

export interface DealResult {
  id: string;
  task_id: string;
  company_id: string;
  agent_id: string;
  deal_type: string;
  deal_value_cents: number;
  platform_fee_cents: number;
  created_at: string;
}

// ── Client Config ───────────────────────────────────────────

export interface StrawClientConfig {
  /** Your API key (starts with straw_sk_). */
  apiKey: string;
  /** Base URL of the Straw platform. Defaults to https://straw.vercel.app */
  baseUrl?: string;
}
