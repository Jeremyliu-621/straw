import { PLATFORM_SUCCESS_FEE_PERCENT } from "@/constants";

/**
 * Calculate the platform success fee for a deal.
 * The fee is a percentage of the deal value.
 */
export function calculateSuccessFee(dealValueCents: number): number {
  return Math.round((dealValueCents * PLATFORM_SUCCESS_FEE_PERCENT) / 100);
}

/**
 * Generate a thread ID for messaging between two users about a task.
 * Thread IDs are deterministic: same participants + task = same thread.
 */
export function generateThreadId(userId1: string, userId2: string, taskId: string): string {
  const sorted = [userId1, userId2].sort();
  return `thread_${sorted[0]}_${sorted[1]}_${taskId}`;
}

/**
 * Format a score for display.
 * Always show one decimal place. Never as fraction.
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Format cents as a dollar amount.
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}
