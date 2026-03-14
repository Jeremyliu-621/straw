/**
 * All magic numbers, strings, and configuration constants.
 * Never hardcode these values directly in the code.
 */

// Queue configuration
export const QUEUE_CONFIG = {
  EXECUTION_QUEUE: "execution-queue",
  EVALUATION_QUEUE: "evaluation-queue",
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
} as const;

// Task configuration
export const TASK_CONFIG = {
  CATEGORIES: [
    "code-generation",
    "debugging",
    "optimization",
    "architecture",
    "testing",
  ] as const,
  DEFAULT_TEST_WEIGHT: 0.6,
  DEFAULT_LLM_WEIGHT: 0.4,
  EXECUTION_TIMEOUT_MS: 600000, // 10 minutes
  MEMORY_LIMIT_MB: 2048,
} as const;

// Evaluation configuration
export const EVALUATION_CONFIG = {
  MIN_DIMENSION_SCORE: 0,
  MAX_DIMENSION_SCORE: 100,
  MIN_FINAL_SCORE: 0,
  MAX_FINAL_SCORE: 100,
  RUBRIC_WEIGHT_TOTAL: 100,
  MOCK_AGENT_CONTAINER: "gcr.io/kaniko-project/executor:latest",
} as const;

// Status enums
export const TASK_STATUS = {
  OPEN: "open",
  EVALUATING: "evaluating",
  CLOSED: "closed",
} as const;

export const SUBMISSION_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const USER_ROLE = {
  COMPANY: "company",
  AGENT_BUILDER: "agent_builder",
  ADMIN: "admin",
} as const;

// API routes
export const API_ROUTES = {
  TASKS: "/api/tasks",
  SUBMISSIONS: "/api/submissions",
  EVALUATIONS: "/api/evaluations",
  AUTH: "/api/auth",
  MESSAGES: "/api/messages",
} as const;

// UI
export const UI = {
  COLORS: {
    BG: "#fafafa",
    BG_SECONDARY: "#f4f4f4",
    BORDER: "#e5e5e5",
    TEXT: "#111111",
    TEXT_MUTED: "#737373",
    TEXT_FAINT: "#a3a3a3",
    INVERSE_BG: "#111111",
    INVERSE_TEXT: "#fafafa",
    SUCCESS: "#16a34a",
    ERROR: "#dc2626",
    WARNING: "#d97706",
    INFO: "#2563eb",
  },
  SIDEBAR_WIDTH: 240,
  MAX_CONTENT_WIDTH: 1200,
  SPACING_BASE: 4,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "You do not have permission to access this resource",
  NOT_FOUND: "Resource not found",
  CONFLICT: "This resource already exists",
  DOCKER_PULL_FAILED: "Failed to pull Docker image. Please verify the image URL.",
  EXECUTION_TIMEOUT: "Agent execution timed out",
  EXECUTION_FAILED: "Agent execution failed",
  INVALID_RUBRIC: "Rubric weights must sum to 100%",
  SUBMISSION_ALREADY_EXISTS: "You have already submitted to this task",
} as const;
