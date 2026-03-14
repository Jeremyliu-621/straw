/**
 * Results service
 * Handles task results, winner determination, reputation updates
 */

import { Leaderboard, getWinner } from "./leaderboard.service";

export interface TaskResult {
  task_id: string;
  task_title: string;
  winner_id: string | null;
  winner_name: string | null;
  total_submissions: number;
  winning_score: number | null;
  completion_time_ms: number;
  budget: string;
}

export interface WinnerUpdate {
  agent_builder_id: string;
  reputation_score_delta: number; // How much reputation changed
  tasks_won_delta: number;
  average_score_contribution: number;
}

/**
 * Get task result from leaderboard
 */
export function getTaskResult(
  leaderboard: Leaderboard,
  completionTimeMs: number,
  budget: string
): TaskResult {
  const winner = getWinner(leaderboard);

  return {
    task_id: leaderboard.task_id,
    task_title: leaderboard.task_title,
    winner_id: winner?.agent_builder_id || null,
    winner_name: winner?.agent_name || null,
    total_submissions: leaderboard.submission_count,
    winning_score: winner?.final_score || null,
    completion_time_ms: completionTimeMs,
    budget: budget,
  };
}

/**
 * Calculate reputation update for winner
 * Winner gets bonus based on:
 * - Win (1 point to tasks_won)
 * - Final score (averaged into average_score)
 * - Quality of competition (number of submissions)
 */
export function calculateWinnerReputation(
  finalScore: number,
  submissionCount: number
): WinnerUpdate {
  // Base: +1 win, score contribution
  const tasksWonDelta = 1;
  const scoreContribution = finalScore;

  // Bonus: more impressive wins get bigger reputation boost
  // Competing against 10 others is harder than 1 other
  const competitionMultiplier = Math.min(submissionCount / 5, 2); // Cap at 2x

  // Reputation delta = base score + competition bonus
  const reputationDelta = Math.round(
    (scoreContribution * competitionMultiplier) / 5
  );

  return {
    agent_builder_id: "", // Will be set by caller
    reputation_score_delta: reputationDelta,
    tasks_won_delta: tasksWonDelta,
    average_score_contribution: scoreContribution,
  };
}

/**
 * Determine if winner should be contacted automatically
 * (e.g., for smaller tasks, auto-accept wins)
 */
export function shouldAutoNotifyWinner(
  taskBudget: string,
  winningScore: number
): boolean {
  // If budget is very small or score is perfect, might auto-notify
  // This depends on business rules - currently returns false
  return false;
}

/**
 * Format result for display on results page
 */
export function formatTaskResult(result: TaskResult) {
  return {
    task_id: result.task_id,
    task_title: result.task_title,
    winner: result.winner_id
      ? {
          id: result.winner_id,
          name: result.winner_name,
          winning_score: result.winning_score,
        }
      : null,
    statistics: {
      total_submissions: result.total_submissions,
      completion_time_hours: Math.round(result.completion_time_ms / (60 * 60 * 1000)),
      budget: result.budget,
    },
  };
}

/**
 * Check if all submissions have been evaluated
 */
export function areAllEvaluationsDone(
  leaderboard: Leaderboard
): boolean {
  return leaderboard.entries.every((entry) => entry.status === "completed");
}

/**
 * Get contact details for messaging between company and winner
 */
export function prepareWinnerContact(
  winnerId: string,
  taskId: string,
  winningScore: number
) {
  return {
    winner_id: winnerId,
    task_id: taskId,
    subject: `You won! Congratulations on your score of ${winningScore}`,
    initial_message:
      "Thank you for your excellent work on this task. Your solution was the best among all submissions. Let's discuss next steps.",
  };
}

/**
 * Prepare task closure data
 */
export function prepareTaskClosure(result: TaskResult) {
  return {
    task_id: result.task_id,
    closed_at: new Date().toISOString(),
    winner_id: result.winner_id,
    winner_name: result.winner_name,
    status: "closed" as const,
  };
}

/**
 * Calculate company payout (if applicable)
 * Platform keeps percentage, rest goes to... (in this platform, company keeps it)
 */
export function calculateCompanyPayout(
  taskBudget: string,
  platformFeePercent: number = 15
): { company_payout: number; platform_fee: number } {
  // Parse budget string like "$5,000" -> 5000
  const budgetNumber = parseInt(taskBudget.replace(/[^0-9]/g, ""), 10);
  const platformFee = Math.round(budgetNumber * (platformFeePercent / 100));
  const companyPayout = budgetNumber - platformFee;

  return {
    company_payout: companyPayout,
    platform_fee: platformFee,
  };
}

/**
 * Check if task has expired too long (cleanup old completed tasks)
 */
export function isResultsExpired(closedAt: string, maxAgeMs: number = 90 * 24 * 60 * 60 * 1000): boolean {
  const now = new Date().getTime();
  const closedTime = new Date(closedAt).getTime();
  return now - closedTime > maxAgeMs;
}
