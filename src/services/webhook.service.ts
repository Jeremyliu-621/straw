import { createHmac, randomBytes } from "crypto";
import { WEBHOOK_SECRET_BYTES } from "@/constants";
import type { DealType, TaskStatus } from "@/constants";

// ── Payload Types ───────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── Signature & Secret ──────────────────────────────────────

/** Generate HMAC-SHA256 signature for a webhook payload. */
export function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Generate a random hex string for webhook secret. */
export function generateWebhookSecret(): string {
  return randomBytes(WEBHOOK_SECRET_BYTES).toString("hex");
}

// ── Payload Builders ────────────────────────────────────────

export function buildTaskStatusChangedPayload(
  taskId: string,
  previousStatus: TaskStatus,
  newStatus: TaskStatus
): WebhookPayload {
  return {
    event: "task.status_changed",
    timestamp: new Date().toISOString(),
    data: { task_id: taskId, previous_status: previousStatus, new_status: newStatus },
  };
}

export function buildSubmissionCreatedPayload(
  submissionId: string,
  taskId: string,
  agentId: string
): WebhookPayload {
  return {
    event: "submission.created",
    timestamp: new Date().toISOString(),
    data: { submission_id: submissionId, task_id: taskId, agent_id: agentId },
  };
}

export function buildSubmissionCompletedPayload(
  submissionId: string,
  taskId: string,
  agentId: string
): WebhookPayload {
  return {
    event: "submission.completed",
    timestamp: new Date().toISOString(),
    data: { submission_id: submissionId, task_id: taskId, agent_id: agentId },
  };
}

export function buildSubmissionFailedPayload(
  submissionId: string,
  taskId: string,
  agentId: string,
  errorMessage: string
): WebhookPayload {
  return {
    event: "submission.failed",
    timestamp: new Date().toISOString(),
    data: {
      submission_id: submissionId,
      task_id: taskId,
      agent_id: agentId,
      error_message: errorMessage,
    },
  };
}

export function buildEvaluationCompletedPayload(
  submissionId: string,
  taskId: string,
  agentId: string,
  finalScore: number
): WebhookPayload {
  return {
    event: "evaluation.completed",
    timestamp: new Date().toISOString(),
    data: {
      submission_id: submissionId,
      task_id: taskId,
      agent_id: agentId,
      final_score: finalScore,
    },
  };
}

export function buildTaskMatchedPayload(
  taskId: string,
  title: string,
  category: string,
  deadline: string,
  evalMode: string,
  budgetCents: number
): WebhookPayload {
  return {
    event: "task.matched",
    timestamp: new Date().toISOString(),
    data: {
      task_id: taskId,
      title,
      category,
      deadline,
      eval_mode: evalMode,
      budget_cents: budgetCents,
    },
  };
}

export function buildDealCreatedPayload(
  dealId: string,
  taskId: string,
  agentId: string,
  dealType: DealType,
  dealValueCents: number
): WebhookPayload {
  return {
    event: "deal.created",
    timestamp: new Date().toISOString(),
    data: {
      deal_id: dealId,
      task_id: taskId,
      agent_id: agentId,
      deal_type: dealType,
      deal_value_cents: dealValueCents,
    },
  };
}
