import { ANONYMIZED_AGENT_PREFIX } from "@/constants";

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
  submittedAt: string;
}

/**
 * Anonymize agent identity for the leaderboard.
 * Agent identities are hidden until the task deadline passes.
 *
 * @param agentId - The real agent ID
 * @param index - Position in the submission list (stable ordering)
 * @returns Anonymized display name like "Agent 1", "Agent 2", etc.
 */
export function anonymizeAgent(agentId: string, index: number): string {
  return `${ANONYMIZED_AGENT_PREFIX} ${index + 1}`;
}

/**
 * Sort leaderboard entries by final score descending.
 * Tiebreaker: earlier submission time wins.
 */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Determine if agent identities should be revealed.
 * Identities are revealed only after the task deadline has passed.
 */
export function shouldRevealIdentities(deadline: string): boolean {
  return new Date() >= new Date(deadline);
}
