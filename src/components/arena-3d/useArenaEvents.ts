"use client";

import type { ArenaAgent } from "./useStrawAgents";

/**
 * Event types emitted by the snapshot differ. Each is tied to a specific
 * agent (or pair, for overtakes) and drives a visual behavior in the game
 * loop's hold system.
 */

export type ArenaEventType =
  | "rank-top3-entry"    // agent entered top 3 for the first time this session
  | "rank-overtake"      // agent passed another on the leaderboard
  | "score-improved"     // score increased by more than SCORE_DELTA_THRESHOLD
  | "submission-failed"  // latestStatus became failed / evaluation_failed
  | "submission-completed" // latestStatus became completed (successful)
  | "agent-joined"       // agent newly in top 20
  | "agent-left";        // agent fell out of top 20

export interface ArenaEvent {
  type: ArenaEventType;
  agentId: string;
  /** For rank-overtake, the agent that got passed. */
  partnerAgentId?: string;
  /** Epoch ms when detected. */
  timestamp: number;
  /** Optional numeric payload (new score, new rank, score delta, etc.). */
  value?: number;
}

const SCORE_DELTA_THRESHOLD = 5;

interface AgentSnapshot {
  rank: number | null;
  score: number | null;
  latestStatus: string | null;
}

function toSnapshot(agent: ArenaAgent): AgentSnapshot {
  return {
    rank: agent.rank,
    score: agent.score,
    latestStatus: agent.latestStatus,
  };
}

/**
 * Diff two arena snapshots and emit events. Pure function — deterministic
 * given the inputs, produces no side effects. The caller decides what to
 * do with the events.
 */
export function diffArenaSnapshots(
  previous: ArenaAgent[],
  current: ArenaAgent[],
  now: number = Date.now()
): ArenaEvent[] {
  const events: ArenaEvent[] = [];

  // Build lookup of previous snapshots by agent id.
  const prevById = new Map<string, AgentSnapshot>();
  for (const a of previous) prevById.set(a.id, toSnapshot(a));
  const currById = new Map<string, AgentSnapshot>();
  for (const a of current) currById.set(a.id, toSnapshot(a));

  // Detect joined / left.
  for (const a of current) {
    if (!prevById.has(a.id)) {
      events.push({ type: "agent-joined", agentId: a.id, timestamp: now });
    }
  }
  for (const a of previous) {
    if (!currById.has(a.id)) {
      events.push({ type: "agent-left", agentId: a.id, timestamp: now });
    }
  }

  // Rank overtakes: if agent A's rank improved from N to M, find which agents
  // were at ranks M..N-1 in the previous snapshot and weren't A. Those got passed.
  // We limit to the "closest" pass (A passed exactly one agent) to keep the
  // event list small and meaningful.
  for (const curr of current) {
    const prev = prevById.get(curr.id);
    if (!prev) continue;

    // Rank improvements (lower number = better rank).
    if (
      curr.rank !== null &&
      prev.rank !== null &&
      curr.rank < prev.rank
    ) {
      // Entered top 3 for the first time?
      if (curr.rank <= 3 && prev.rank > 3) {
        events.push({
          type: "rank-top3-entry",
          agentId: curr.id,
          timestamp: now,
          value: curr.rank,
        });
      }

      // Find the agent who was one rank above curr's new position in the
      // previous snapshot — that's who got overtaken.
      const overtakeTargetRank = curr.rank;
      const overtaken = previous.find(
        (p) =>
          p.rank === overtakeTargetRank &&
          p.id !== curr.id &&
          currById.has(p.id)
      );
      if (overtaken) {
        events.push({
          type: "rank-overtake",
          agentId: curr.id,
          partnerAgentId: overtaken.id,
          timestamp: now,
        });
      }
    }

    // Score improvements.
    if (
      curr.score !== null &&
      prev.score !== null &&
      curr.score - prev.score >= SCORE_DELTA_THRESHOLD
    ) {
      events.push({
        type: "score-improved",
        agentId: curr.id,
        timestamp: now,
        value: curr.score - prev.score,
      });
    }

    // Status transitions.
    if (curr.latestStatus !== prev.latestStatus) {
      if (
        curr.latestStatus === "failed" ||
        curr.latestStatus === "evaluation_failed"
      ) {
        events.push({
          type: "submission-failed",
          agentId: curr.id,
          timestamp: now,
        });
      } else if (curr.latestStatus === "completed") {
        events.push({
          type: "submission-completed",
          agentId: curr.id,
          timestamp: now,
        });
      }
    }
  }

  return events;
}
