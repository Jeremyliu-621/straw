/**
 * Leaderboard service
 * Manages task leaderboards, anonymization, scoring, ranking
 */

import { Task } from "@/types/database";

export interface LeaderboardEntry {
  rank: number;
  agent_builder_id: string;
  agent_name: string; // "Agent #1" when anonymized, "CodeMaster" when revealed
  docker_image_url?: string; // Null when anonymized
  final_score: number;
  test_score: number;
  llm_score: number;
  status: "evaluating" | "completed";
  submitted_at: string;
  evaluated_at?: string;
}

export interface Leaderboard {
  task_id: string;
  task_title: string;
  deadline: string;
  is_revealed: boolean; // True after deadline passes
  submission_count: number;
  entries: LeaderboardEntry[];
}

/**
 * Anonymize agent name for display before deadline
 */
export function anonymizeAgentName(
  agentBuilderId: string,
  rank: number,
  isRevealed: boolean
): string {
  if (isRevealed) {
    // In real implementation, would look up actual agent name from database
    return "Agent Name"; // Placeholder
  }
  return `Agent #${rank}`;
}

/**
 * Check if deadline has passed
 */
export function isDeadlinePassed(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

/**
 * Sort and rank leaderboard entries
 * Higher scores rank higher (rank 1 = best)
 */
export function rankEntries(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  // Sort by final_score descending, then by submitted_at ascending
  const sorted = [...entries].sort((a, b) => {
    if (b.final_score !== a.final_score) {
      return b.final_score - a.final_score;
    }
    // Tiebreaker: earlier submission wins
    return (
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
  });

  // Assign ranks
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/**
 * Build leaderboard from evaluation results
 */
export function buildLeaderboard(
  task: Task,
  submissions: Array<{
    agent_builder_id: string;
    agent_name: string;
    docker_image_url: string;
    submitted_at: string;
    status: "evaluating" | "completed";
    test_score?: number;
    llm_score?: number;
    final_score?: number;
    evaluated_at?: string;
  }>
): Leaderboard {
  const isRevealed = isDeadlinePassed(task.deadline);

  const entries: LeaderboardEntry[] = submissions.map((sub) => ({
    rank: 0, // Will be set by rankEntries
    agent_builder_id: sub.agent_builder_id,
    agent_name: "Agent", // Temporary, will be set after ranking
    docker_image_url: isRevealed ? sub.docker_image_url : undefined,
    final_score: sub.final_score || 0,
    test_score: sub.test_score || 0,
    llm_score: sub.llm_score || 0,
    status: sub.status,
    submitted_at: sub.submitted_at,
    evaluated_at: sub.evaluated_at,
  }));

  const ranked = rankEntries(entries);

  // Apply anonymization after ranking
  const finalEntries = ranked.map((entry) => ({
    ...entry,
    agent_name: anonymizeAgentName(
      entry.agent_builder_id,
      entry.rank,
      isRevealed
    ),
  }));

  return {
    task_id: task.id,
    task_title: task.title,
    deadline: task.deadline,
    is_revealed: isRevealed,
    submission_count: submissions.length,
    entries: finalEntries,
  };
}

/**
 * Get winner of a task
 * Returns the top-ranked completed submission
 */
export function getWinner(
  leaderboard: Leaderboard
): LeaderboardEntry | null {
  const completed = leaderboard.entries.filter((e) => e.status === "completed");
  return completed.length > 0 ? completed[0] : null;
}

/**
 * Get agents currently evaluating (pending scores)
 */
export function getEvaluatingAgents(leaderboard: Leaderboard): LeaderboardEntry[] {
  return leaderboard.entries.filter((e) => e.status === "evaluating");
}

/**
 * Format leaderboard for display
 */
export function formatLeaderboard(leaderboard: Leaderboard) {
  return {
    task_id: leaderboard.task_id,
    task_title: leaderboard.task_title,
    deadline: leaderboard.deadline,
    is_revealed: leaderboard.is_revealed,
    submission_count: leaderboard.submission_count,
    entries: leaderboard.entries.map((entry) => ({
      rank: entry.rank,
      agent_id: entry.agent_builder_id,
      agent_name: entry.agent_name,
      score: entry.final_score,
      test_score: entry.test_score,
      llm_score: entry.llm_score,
      status: entry.status,
      submitted_at: entry.submitted_at,
    })),
  };
}

/**
 * Calculate time remaining until deadline
 */
export function getTimeRemaining(deadline: string): number {
  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  return Math.max(0, deadlineTime - now);
}

/**
 * Check if task should be auto-closed
 */
export function shouldAutoClose(task: Task): boolean {
  if (task.status !== "open" && task.status !== "evaluating") {
    return false;
  }
  return isDeadlinePassed(task.deadline);
}
