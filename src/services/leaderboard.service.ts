import type { SupabaseClient } from "@supabase/supabase-js";
import { ANONYMIZED_AGENT_PREFIX, TASK_STATUS } from "@/constants";

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  finalScore: number;
  testScore: number | null;
  llmScore: number | null;
  submissionId: string;
  submittedAt: string;
  /** Highest tier from the agent's non-revoked api_keys. NOT a gate — every
   *  entry is rendered regardless of tier; companies can optionally filter
   *  the rendered board by tier (e.g., "verified only"). Null if the agent
   *  has no api_keys (e.g., session-auth submissions, dev users). */
  tier?: string | null;
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

/**
 * Apply in-place anonymization to a sorted leaderboard.
 *
 * Zeros BOTH `agentId` and `submissionId` because an agent knows their
 * own submission ID (returned at creation via /api/v1/submissions) and
 * can otherwise self-locate on the anonymized board — defeating the
 * whole point of pre-deadline anonymity.
 *
 * The `agentName` becomes "Agent N" where N is the sorted position.
 */
export function anonymizeEntries(entries: LeaderboardEntry[]): void {
  for (let i = 0; i < entries.length; i++) {
    entries[i].agentName = anonymizeAgent(entries[i].agentId, i);
    entries[i].agentId = "";
    entries[i].submissionId = "";
  }
}

// ── Build the leaderboard payload (read-side, shared by GET + SSE) ─

export interface LeaderboardPayload {
  entries: LeaderboardEntry[];
  revealed: boolean;
  deadline: string;
  taskStatus: string;
  evalMode: string;
  isOwner: boolean;
}

export type LeaderboardFetchError =
  | { kind: "not_found" }
  | { kind: "draft" }
  | { kind: "internal" };

/**
 * Compute the full ranked leaderboard for a task as the caller would see it.
 * Anonymizes per D16 (fresh-per-task pseudonyms) when the deadline hasn't
 * passed yet. Deduplicates to best-score-per-agent.
 *
 * Used by both the polled GET endpoint and the SSE stream — sharing the
 * implementation guarantees identical payload shape across both surfaces.
 */
export async function buildLeaderboard(
  db: SupabaseClient,
  taskId: string,
  callerUserId: string
): Promise<LeaderboardPayload | LeaderboardFetchError> {
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !task) return { kind: "not_found" };
  if (task.status === TASK_STATUS.DRAFT) return { kind: "draft" };

  const { data: submissions, error: subError } = await db
    .from("submissions")
    .select(`
      id,
      agent_id,
      created_at,
      evaluation_results (
        final_score,
        test_score,
        llm_score
      )
    `)
    .eq("task_id", taskId)
    .eq("status", "completed");

  if (subError) return { kind: "internal" };

  const reveal = shouldRevealIdentities(task.deadline);
  const entries: LeaderboardEntry[] = [];

  for (const sub of submissions ?? []) {
    const rawEval = sub.evaluation_results as
      | { final_score: number; test_score: number | null; llm_score: number | null }
      | { final_score: number; test_score: number | null; llm_score: number | null }[]
      | null;
    if (!rawEval) continue;
    const evalResult = Array.isArray(rawEval) ? rawEval[0] : rawEval;
    if (!evalResult) continue;

    let agentName = "";
    if (reveal) {
      const { data: profile } = await db
        .from("agent_builder_profiles")
        .select("display_name")
        .eq("user_id", sub.agent_id)
        .single();
      agentName = profile?.display_name ?? "Unknown Agent";
    }

    entries.push({
      rank: 0,
      agentId: sub.agent_id,
      agentName,
      finalScore: evalResult.final_score,
      testScore: evalResult.test_score,
      llmScore: evalResult.llm_score,
      submissionId: sub.id,
      submittedAt: sub.created_at,
    });
  }

  // Deduplicate to best-score-per-agent. Quota burn is bounded; this matters
  // because the leaderboard is "best of an agent's 1..15 attempts."
  const bestPerAgent = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const existing = bestPerAgent.get(entry.agentId);
    if (!existing || entry.finalScore > existing.finalScore) {
      bestPerAgent.set(entry.agentId, entry);
    }
  }

  // Tier annotation (D37). For each agent on the board, surface the
  // "highest" tier from any of their non-revoked api_keys so companies can
  // optionally filter the rendered leaderboard by tier (e.g., "verified
  // only"). NOT a gate — every agent shows up regardless of tier. The
  // floor gate that used to live here was removed 2026-05-07.
  const candidateAgentIds = Array.from(bestPerAgent.keys());
  if (candidateAgentIds.length > 0) {
    const { data: keyRows } = await db
      .from("api_keys")
      .select("user_id, tier")
      .in("user_id", candidateAgentIds)
      .is("revoked_at", null);
    const tierByAgent = new Map<string, string>();
    const TIER_RANK: Record<string, number> = {
      verified: 4,
      operator_child: 3,
      staked: 2,
      anonymous: 1,
      dev: 0,
    };
    for (const row of keyRows ?? []) {
      const agent = row.user_id as string;
      const tier = (row.tier as string) ?? "anonymous";
      const current = tierByAgent.get(agent);
      if (!current || (TIER_RANK[tier] ?? 0) > (TIER_RANK[current] ?? 0)) {
        tierByAgent.set(agent, tier);
      }
    }
    for (const [agentId, entry] of bestPerAgent) {
      entry.tier = tierByAgent.get(agentId) ?? null;
    }
  }

  const sorted = sortLeaderboard(Array.from(bestPerAgent.values()));
  if (!reveal) anonymizeEntries(sorted);

  return {
    entries: sorted,
    revealed: reveal,
    deadline: task.deadline,
    taskStatus: task.status,
    evalMode: (task as Record<string, unknown>).eval_mode as string | undefined ?? "llm",
    isOwner: task.company_id === callerUserId,
  };
}

/**
 * Stable fingerprint of the leaderboard for change detection. Two payloads
 * with the same fingerprint are functionally identical from a daemon's POV;
 * the SSE stream only emits when this changes.
 */
export function leaderboardFingerprint(payload: LeaderboardPayload): string {
  return [
    payload.revealed ? "1" : "0",
    payload.taskStatus,
    payload.entries.length,
    payload.entries
      .map((e) => `${e.rank}:${e.agentId || e.agentName}:${e.finalScore}:${e.submissionId}`)
      .join(","),
  ].join("|");
}
