// ── Task ─────────────────────────────────────────────────────
export const TASK_TITLE_MIN_LENGTH = 10;
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
export const EVALUATION_LLM_MODEL = "gemini-2.0-flash" as const;
export const EVALUATION_LLM_MAX_TOKENS = 4096;
export const EVALUATION_LLM_MAX_RETRIES = 1;
export const EVALUATION_SCORE_MIN = 0;
export const EVALUATION_SCORE_MAX = 100;

// ── Execution ────────────────────────────────────────────────
export const EXECUTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const EXECUTION_MEMORY_LIMIT = "512m";
export const EXECUTION_CPU_LIMIT = 1;
export const EXECUTION_OUTPUT_DIR = "/output";
export const EXECUTION_INPUT_ENV_VAR = "MAP_TASK_INPUT";

// ── Queue ────────────────────────────────────────────────────
export const QUEUE_EXECUTION = "execution" as const;
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

// ── UI ───────────────────────────────────────────────────────
export const LEADERBOARD_POLL_INTERVAL_MS = 3000;
export const ANONYMIZED_AGENT_PREFIX = "Agent" as const;

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
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

// ── Deal Type ────────────────────────────────────────────────
export const DEAL_TYPE = {
  OUTPUT_PURCHASE: "output_purchase",
  AGENT_HIRE: "agent_hire",
} as const;
export type DealType = (typeof DEAL_TYPE)[keyof typeof DEAL_TYPE];
