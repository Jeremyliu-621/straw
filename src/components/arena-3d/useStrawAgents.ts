"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface ArenaAgent {
  id: string;
  displayName: string;
  latestStatus: string | null;
  score: number | null;
  taskTitle: string;
}

export interface OfficeAgentInput {
  id: string;
  name: string;
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

export function useStrawAgents(): {
  agents: ArenaAgent[];
  officeAgents: OfficeAgentInput[];
  loading: boolean;
} {
  const [agents, setAgents] = useState<ArenaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchArena = useCallback(async () => {
    try {
      const res = await fetch("/api/public/arena");
      if (!res.ok) return;
      const data = await res.json();
      setAgents(Array.isArray(data.agents) ? data.agents : []);
    } catch {
      // Silently ignore network errors for polling
    } finally {
      setLoading(false);
    }
  }, []);

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
    status: deriveStatus(agent.latestStatus),
    color: AGENT_COLORS[idx % AGENT_COLORS.length],
    item: "none",
  }));

  return { agents, officeAgents, loading };
}
