// ── Task ─────────────────────────────────────────────────────
export const TASK_TITLE_MIN_LENGTH = 1;
export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 10_000;
export const TASK_MIN_BUDGET_CENTS = 100_00; // $100
export const TASK_MAX_BUDGET_CENTS = 1_000_000_00; // $1,000,000
export const TASK_MIN_DEADLINE_HOURS = 24;
export const TASK_MAX_DEADLINE_DAYS = 90;

// ── Rubric ───────────────────────────────────────────────────
export const RUBRIC_MIN_CRITERIA = 1;
export const RUBRIC_MAX_CRITERIA = 20;
export const RUBRIC_WEIGHT_SUM = 100;
export const RUBRIC_MIN_WEIGHT = 1;

// ── Evaluation ───────────────────────────────────────────────
/** Stable model id for Generative Language API (2.0 Flash is not available to new API keys). */
export const EVALUATION_LLM_MODEL = "gemini-2.5-flash" as const;
export const EVALUATION_LLM_MAX_TOKENS = 4096;
export const EVALUATION_LLM_MAX_RETRIES = 1;
export const EVALUATION_SCORE_MIN = 0;
export const EVALUATION_SCORE_MAX = 100;

// ── Submission Quotas ──────────────────────────────────────
export const TASK_DEFAULT_SUBMISSION_QUOTA = 5;
export const TASK_MAX_SUBMISSION_QUOTA = 100;

// ── Analytics ───────────────────────────────────────────────
export const ANALYTICS_SCORE_HISTORY_LIMIT = 50;

// ── Queue ────────────────────────────────────────────────────
export const QUEUE_EVALUATION = "evaluation" as const;
export const QUEUE_MAX_ATTEMPTS = 3;
export const QUEUE_BACKOFF_DELAY_MS = 5000;

// ── Auth ─────────────────────────────────────────────────────
export const ROLE_COMPANY = "company" as const;
export const ROLE_AGENT_BUILDER = "agent_builder" as const;
export type UserRole = typeof ROLE_COMPANY | typeof ROLE_AGENT_BUILDER;

// ── Platform ─────────────────────────────────────────────────
export const PLATFORM_TASK_FEE_CENTS = 99_00; // $99 flat
export const PLATFORM_SUCCESS_FEE_PERCENT = 5; // 5% of deal value

// ── Task Attachments ────────────────────────────────────────
export const TASK_MAX_ATTACHMENT_SIZE_MB = 10;
export const TASK_MAX_ATTACHMENTS = 10;
export const TASK_ATTACHMENTS_BUCKET = "task-attachments" as const;
export const TASK_ALLOWED_FILE_TYPES = [
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;

// ── Test Suites ────────────────────────────────────────────
export const TEST_SUITE_BUCKET = "test-suites" as const;
export const TEST_SUITE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ── Categories ──────────────────────────────────────────────
export const CATEGORY_OPTIONS = [
  "code-generation",
  "data-analysis",
  "web-scraping",
  "nlp",
  "computer-vision",
  "automation",
  "research",
  "other",
] as const;

// ── Onboarding ──────────────────────────────────────────────
export const ONBOARDING_STORAGE_KEY = "straw-onboarding-v1" as const;
export const ONBOARDING_SKIP_COOLDOWN_DAYS = 7;
export const ONBOARDING_TOTAL_STEPS = 3;

// ── UI ───────────────────────────────────────────────────────
export const LEADERBOARD_POLL_INTERVAL_MS = 3000;
export const ANONYMIZED_AGENT_PREFIX = "Agent" as const;

// ── Landing Accents ─────────────────────────────────────────
export const LANDING_ACCENT_PEACH = "#ead5bb" as const;

// ── Task Status ──────────────────────────────────────────────
export const TASK_STATUS = {
  DRAFT: "draft",
  OPEN: "open",
  EVALUATING: "evaluating",
  CLOSED: "closed",
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// ── Submission Status ────────────────────────────────────────
export const SUBMISSION_STATUS = {
  REGISTERED: "registered",
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  EVALUATION_FAILED: "evaluation_failed",
} as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

// ── Deal Type ────────────────────────────────────────────────
export const DEAL_TYPE = {
  OUTPUT_PURCHASE: "output_purchase",
  AGENT_HIRE: "agent_hire",
} as const;
export type DealType = (typeof DEAL_TYPE)[keyof typeof DEAL_TYPE];

// ── Submission Mode ──────────────────────────────────────────
export const SUBMISSION_MODE = {
  API: "api",
  DOCKER: "docker",
  UPLOAD: "upload",
} as const;
export type SubmissionMode = (typeof SUBMISSION_MODE)[keyof typeof SUBMISSION_MODE];

// ── Upload ─────────────────────────────────────────────────
export const UPLOAD_MAX_FILE_SIZE_MB = 200;
// Supabase createSignedUploadUrl issues URLs that expire server-side in 2h
// regardless of any parameter we pass. We cap our displayed value so agents
// don't see a 24h expiry that Supabase won't honour. The upload endpoints
// (`/api/v1/submissions/[id]/upload` + `/complete`) enforce task deadline
// independently, so this is a UX-accuracy concern, not an authz gate.
export const UPLOAD_PRESIGNED_URL_MAX_TTL_SECONDS = 2 * 60 * 60; // 2 hours
export const UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS = UPLOAD_PRESIGNED_URL_MAX_TTL_SECONDS;
export const UPLOAD_STORAGE_BUCKET = "agent-outputs" as const;

// ── API Keys ────────────────────────────────────────────────
export const API_KEY_PREFIX = "straw_sk_" as const;
export const API_KEY_RANDOM_BYTES = 32;
export const API_KEY_MAX_PER_USER = 10;

// ── Webhook Events ──────────────────────────────────────────
export const WEBHOOK_EVENT = {
  TASK_STATUS_CHANGED: "task.status_changed",
  TASK_MATCHED: "task.matched",
  SUBMISSION_CREATED: "submission.created",
  SUBMISSION_COMPLETED: "submission.completed",
  SUBMISSION_FAILED: "submission.failed",
  EVALUATION_COMPLETED: "evaluation.completed",
  DEAL_CREATED: "deal.created",
} as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT)[keyof typeof WEBHOOK_EVENT];

export const WEBHOOK_DELIVERY_STATUS = {
  PENDING: "pending",
  DELIVERED: "delivered",
  FAILED: "failed",
} as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUS)[keyof typeof WEBHOOK_DELIVERY_STATUS];

export const WEBHOOK_MAX_PER_USER = 10;
export const WEBHOOK_MAX_PER_COMPANY = WEBHOOK_MAX_PER_USER;
export const WEBHOOK_SECRET_BYTES = 32;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;
export const WEBHOOK_MAX_DELIVERY_ATTEMPTS = 3;
export const WEBHOOK_RESPONSE_BODY_MAX_BYTES = 1024;
export const QUEUE_WEBHOOK = "webhook" as const;

// ── Rate Limiting ───────────────────────────────────────────
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 60; // per window
export const RATE_LIMIT_MAX_SUBMISSIONS = 10; // submissions per window (stricter)

// ── Audit Log ───────────────────────────────────────────────
export const AUDIT_ACTION = {
  TASK_CREATED: "task.created",
  TASK_PUBLISHED: "task.published",
  TASK_CLOSED: "task.closed",
  SUBMISSION_CREATED: "submission.created",
  SUBMISSION_COMPLETED: "submission.completed",
  SUBMISSION_FAILED: "submission.failed",
  EVALUATION_COMPLETED: "evaluation.completed",
  DEAL_CREATED: "deal.created",
  WEBHOOK_CREATED: "webhook.created",
  WEBHOOK_DELETED: "webhook.deleted",
  API_KEY_CREATED: "api_key.created",
  API_KEY_REVOKED: "api_key.revoked",
  SUBMISSION_UPLOADED: "submission.uploaded",
} as const;
export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_LOG_DEFAULT_LIMIT = 50;
export const AUDIT_LOG_MAX_LIMIT = 200;


// ── Notifications ───────────────────────────────────────────
export const NOTIFICATION_TYPE = {
  SUBMISSION_CREATED: "submission.created",
  SUBMISSION_COMPLETED: "submission.completed",
  SUBMISSION_FAILED: "submission.failed",
  EVALUATION_COMPLETED: "evaluation.completed",
  DEAL_CREATED: "deal.created",
  TASK_MATCHED: "task.matched",
  TASK_DEADLINE_APPROACHING: "task.deadline_approaching",
  TASK_CLOSED: "task.closed",
  COMMENT_CREATED: "comment.created",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
export const NOTIFICATION_DEFAULT_LIMIT = 50;
export const NOTIFICATION_MAX_LIMIT = 100;

// ── Agent Stats ─────────────────────────────────────────────
export const AGENT_STATS_CACHE_TTL_SECONDS = 300;
export const AGENT_LEADERBOARD_DEFAULT_LIMIT = 20;
export const AGENT_LEADERBOARD_MAX_LIMIT = 50;


// ── Eval Mode ───────────────────────────────────────────────
export const EVAL_MODE = {
  LLM: "llm",
  CONTAINER: "container",
  HYBRID: "hybrid",
} as const;
export type EvalMode = (typeof EVAL_MODE)[keyof typeof EVAL_MODE];

// ── Eval Container ──────────────────────────────────────────
export const EVAL_CONTAINER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const EVAL_CONTAINER_MEMORY_LIMIT = 1024 * 1024 * 1024; // 1GB in bytes
export const EVAL_CONTAINER_CPU_LIMIT = 2e9; // 2 CPUs in nanoCPUs
export const EVAL_CONTAINER_OUTPUT_PATH = "/results";
export const EVAL_CONTAINER_INPUT_PATH = "/agent_output";
export const EVAL_SCORE_JSON_FILENAME = "score.json";
// Hard cap on score.json size read from /results. 1 MB is generous for
// a rubric-shaped JSON; anything larger is either an attack (bomb) or
// a misbehaving eval container.
export const EVAL_SCORE_JSON_MAX_BYTES = 1024 * 1024;

// ── Submission Contracts ────────────────────────────────────
export const CONTRACT_MAX_TOTAL_SIZE_MB_DEFAULT = 200;
export const CONTRACT_MAX_TOTAL_SIZE_MB_FLOOR = 10;
export const CONTRACT_MAX_TOTAL_SIZE_MB_CEILING = 500;

// ── Worker Concurrency ──────────────────────────────────────
// Defaults matching original hardcoded values. Override per-instance via env
// to scale vertically on larger boxes before adding replicas. See tasks/SCALE.md.
export const EVAL_WORKER_CONCURRENCY_DEFAULT = 2;
export const WEBHOOK_WORKER_CONCURRENCY_DEFAULT = 10;
export const WORKER_DURATION_WINDOW_SIZE = 50; // rolling window for avg_duration_ms

// ── Invitation Status ───────────────────────────────────────
export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];
export const INVITATION_MESSAGE_MAX_LENGTH = 1000;
export const INVITATION_MAX_PER_TASK = 20;
