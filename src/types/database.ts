import type { UserRole, TaskStatus, SubmissionStatus, DealType, AuditAction, NotificationType, InvitationStatus, EvalMode, WebhookDeliveryStatus } from "@/constants";

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
  role: UserRole | null;
  avatar_url: string | null;
  auth_provider_id: string;
  onboarded: boolean;
}

export interface UserInsert {
  email: string;
  name: string;
  role?: UserRole | null;
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
  eval_mode: EvalMode;
  eval_image: string | null;
  max_submissions_per_agent: number;
  eval_network: boolean;
  eval_memory_mb: number;
  eval_timeout_seconds: number;
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
  eval_mode?: EvalMode;
  eval_image?: string | null;
  eval_network?: boolean;
  eval_memory_mb?: number;
  eval_timeout_seconds?: number;
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
  mode: string;
  docker_image: string | null;
  api_endpoint: string | null;
  agent_display_name: string | null;
  output_url: string | null;
  error_message: string | null;
  upload_token: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SubmissionInsert {
  task_id: string;
  agent_id: string;
  mode: string;
  docker_image?: string | null;
  api_endpoint?: string | null;
  agent_display_name?: string | null;
  status?: string;
  upload_token?: string | null;
}

// ── Evaluation Results ───────────────────────────────────────

export interface EvaluationResult {
  id: string;
  submission_id: string;
  test_score: number | null;
  llm_score: number | null;
  final_score: number;
  llm_reasoning: string | null;
  breakdown: Record<string, number> | null;
  container_score: number | null;
  container_exit_code: number | null;
  eval_mode: EvalMode | null;
  created_at: string;
}

export interface EvaluationResultInsert {
  submission_id: string;
  test_score?: number | null;
  llm_score?: number | null;
  final_score: number;
  llm_reasoning?: string | null;
  breakdown?: Record<string, number> | null;
  container_score?: number | null;
  container_exit_code?: number | null;
  eval_mode?: EvalMode | null;
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

// ── Audit Log ───────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  user_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
}

// ── Webhooks ────────────────────────────────────────────────

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface WebhookInsert {
  user_id: string;
  url: string;
  secret: string;
  events: string[];
  active?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  created_at: string;
  completed_at: string | null;
}

// ── Notifications ───────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  resource_type?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceInsert {
  user_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean;
}

// ── Task Attachments ────────────────────────────────────────

export type TaskAttachmentField = "description" | "input_spec" | "output_spec";

export interface TaskAttachment {
  id: string;
  task_id: string;
  field: TaskAttachmentField;
  filename: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  description: string;
  created_at: string;
}

export interface TaskAttachmentInsert {
  task_id: string;
  field: TaskAttachmentField;
  filename: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  description?: string;
}

// ── Task Invitations ────────────────────────────────────────

export interface TaskInvitation {
  id: string;
  task_id: string;
  company_id: string;
  agent_id: string;
  message: string | null;
  status: InvitationStatus;
  responded_at: string | null;
  created_at: string;
}

export interface TaskInvitationInsert {
  task_id: string;
  company_id: string;
  agent_id: string;
  message?: string | null;
}
