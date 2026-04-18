"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { diffArenaSnapshots, type ArenaEvent } from "./useArenaEvents";

export interface ArenaAgent {
  id: string;
  /** Null when the agent has no completed+scored submission yet. */
  displayName: string | null;
  /** 1-based leaderboard rank. Null when off-leaderboard. */
  rank: number | null;
  latestStatus: string | null;
  score: number | null;
  taskTitle: string;
}

export interface OfficeAgentInput {
  id: string;
  name: string | null;
  rank: number | null;
  status: "working" | "idle" | "error";
  color: string;
  item: string;
}

const POLL_INTERVAL_MS = 3000;

const AGENT_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
  "#10b981", "#e11d4e", "#0ea5e9", "#eab308", "#7c3aed",
  "#22c55e", "#f43f5e", "#3b82f6", "#d946ef", "#64748b",
];

function deriveStatus(latestStatus: string | null): "working" | "idle" | "error" {
  switch (latestStatus) {
    case "running":
    case "pending":
      return "working";
    case "failed":
    case "evaluation_failed":
      return "error";
    default:
      return "idle";
  }
}

export function useStrawAgents(taskId?: string): {
  agents: ArenaAgent[];
  officeAgents: OfficeAgentInput[];
  loading: boolean;
  /** Buffer of events detected between polls. Game loop drains this. */
  eventBufferRef: React.RefObject<ArenaEvent[]>;
} {
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Snapshot from the previous poll, used for diffing.
  const previousSnapshotRef = useRef<ArenaAgent[]>([]);
  // Events emitted by diffs; game loop consumes and drains.
  const eventBufferRef = useRef<ArenaEvent[]>([]);
  // Skip emitting events on the very first poll — otherwise "agent-joined"
  // fires for every agent on initial load, which is noise.
  const firstPollRef = useRef(true);

  const fetchArena = useCallback(async () => {
    try {
      const url = taskId
        ? `/api/public/arena?taskId=${encodeURIComponent(taskId)}`
        : "/api/public/arena";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const nextAgents: ArenaAgent[] = Array.isArray(data.agents)
        ? data.agents
        : [];

      if (!firstPollRef.current) {
        const events = diffArenaSnapshots(
          previousSnapshotRef.current,
          nextAgents
        );
        if (events.length > 0) {
          eventBufferRef.current.push(...events);
        }
      }
      previousSnapshotRef.current = nextAgents;
      firstPollRef.current = false;
      setAgents(nextAgents);
    } catch {
      // Silently ignore network errors for polling
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchArena();
    intervalRef.current = setInterval(fetchArena, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchArena]);

  const officeAgents: OfficeAgentInput[] = agents.map((agent, idx) => ({
    id: agent.id,
    name: agent.displayName,
    rank: agent.rank,
    status: deriveStatus(agent.latestStatus),
    color: AGENT_COLORS[idx % AGENT_COLORS.length],
    item: "none",
  }));

  return { agents, officeAgents, loading, eventBufferRef };
}
