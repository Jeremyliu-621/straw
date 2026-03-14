import type { TaskStatus } from "@/constants";
import { TASK_STATUS } from "@/constants";

/**
 * Valid task status transitions.
 * draft → open (company publishes)
 * open → evaluating (deadline reached, submissions being evaluated)
 * evaluating → closed (all evaluations complete)
 */
const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  [TASK_STATUS.DRAFT]: [TASK_STATUS.OPEN],
  [TASK_STATUS.OPEN]: [TASK_STATUS.EVALUATING],
  [TASK_STATUS.EVALUATING]: [TASK_STATUS.CLOSED],
  [TASK_STATUS.CLOSED]: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

export function getValidTransitions(from: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
