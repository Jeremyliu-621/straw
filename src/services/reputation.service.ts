/**
 * Reputation service — calculates agent builder stats from competition history.
 *
 * All stats are derived from the deals and evaluation_results tables.
 * No denormalized counters — stats are computed on read.
 */

export interface ReputationStats {
  tasksEntered: number;
  tasksWon: number;
  winRate: number;
  averageScore: number;
  outputPurchases: number;
  agentHires: number;
  categories: string[];
}

export interface CompetitionHistoryEntry {
  taskId: string;
  taskTitle: string;
  rank: number;
  totalCompetitors: number;
  finalScore: number;
  category: string;
  completedAt: string;
  won: boolean;
}

/**
 * Calculate win rate as a percentage.
 */
export function calculateWinRate(wins: number, entered: number): number {
  if (entered === 0) return 0;
  return Math.round((wins / entered) * 100);
}

/**
 * Calculate average score from an array of scores.
 */
export function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

/**
 * Derive category specializations from competition history.
 * Returns categories sorted by number of wins, then by number of entries.
 */
export function deriveCategories(
  history: { category: string; won: boolean }[]
): string[] {
  const catStats = new Map<string, { wins: number; entries: number }>();

  for (const entry of history) {
    const existing = catStats.get(entry.category) ?? { wins: 0, entries: 0 };
    existing.entries++;
    if (entry.won) existing.wins++;
    catStats.set(entry.category, existing);
  }

  return Array.from(catStats.entries())
    .sort((a, b) => {
      if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
      return b[1].entries - a[1].entries;
    })
    .map(([cat]) => cat);
}
