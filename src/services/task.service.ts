/**
 * Task service - business logic for task management
 * Handles task creation, updates, and state machine enforcement
 */

import { Task, TaskStatus } from "@/types/database";
import { CreateTaskInput } from "@/lib/validation";

/**
 * Task status transitions - define what state changes are valid
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ["evaluating", "closed"],
  evaluating: ["closed"],
  closed: [], // Terminal state
};

/**
 * Validate that a state transition is allowed
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Enforce state machine on task status changes
 */
export function enforceTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid task status transition: ${from} → ${to}. Valid transitions: ${VALID_TRANSITIONS[from].join(", ")}`
    );
  }
}

/**
 * Calculate the test weight automatically from rubric
 * Can be overridden by user during task creation
 */
export function getDefaultWeights(rubric: any): { test_weight: number; llm_weight: number } {
  // If rubric specifies weights, use those
  if (rubric.test_weight !== undefined && rubric.llm_weight !== undefined) {
    return {
      test_weight: rubric.test_weight,
      llm_weight: rubric.llm_weight,
    };
  }

  // Otherwise use defaults (60% tests, 40% LLM)
  return {
    test_weight: 0.6,
    llm_weight: 0.4,
  };
}

/**
 * Check if a task should auto-transition to "evaluating" status
 * (when all eligible agents have submitted and deadline hasn't passed)
 */
export function shouldAutoTransitionToEvaluating(task: Task): boolean {
  // Only transition if currently open
  if (task.status !== "open") {
    return false;
  }

  // Don't transition before deadline
  const now = new Date();
  const deadline = new Date(task.deadline);
  if (now < deadline) {
    return false;
  }

  // Could have other logic here (e.g., check submission count)
  return true;
}

/**
 * Auto-transition task to closed when evaluation is complete
 * (In practice, this is triggered by a scheduled job in Phase 7)
 */
export function shouldAutoTransitionToClosed(task: Task): boolean {
  // Only auto-close if in evaluating state and deadline has passed
  if (task.status !== "evaluating") {
    return false;
  }

  const now = new Date();
  const deadline = new Date(task.deadline);
  return now >= deadline;
}

/**
 * Format task data for API response
 */
export function formatTaskResponse(task: Task & { company?: any }) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    status: task.status,
    rubric: task.rubric,
    budget: task.budget,
    deadline: task.deadline,
    created_at: task.created_at,
    company: task.company ? {
      id: task.company.id,
      name: task.company.name,
      website: task.company.website,
    } : undefined,
  };
}

/**
 * Validate rubric weight totals
 * @throws If weights don't sum to 100
 */
export function validateRubricWeights(rubric: any): void {
  const total = rubric.criteria.reduce((sum: number, c: any) => sum + c.weight, 0);
  if (total !== 100) {
    throw new Error(`Rubric weights must sum to 100% (currently ${total}%)`);
  }
}

/**
 * Check if agent is eligible for a task based on category matching
 */
export function isAgentEligibleForTask(
  agentCategories: string[],
  taskCategory: string
): boolean {
  return agentCategories.includes(taskCategory);
}
