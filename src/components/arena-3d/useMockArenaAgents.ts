"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArenaAgent } from "./useStrawAgents";
import type { OfficeAgentInput } from "./useStrawAgents";
import type { ArenaEvent, ArenaEventType } from "./useArenaEvents";

/**
 * Mock data source for the landing-page playground. Returns the same shape
 * as useStrawAgents so ArenaCanvasInner is source-agnostic:
 *   { agents, officeAgents, loading, eventBufferRef }
 *
 * Drives the ambience in two layers:
 *   1. Status flips (working ↔ idle) every few seconds per agent. The game
 *      loop's existing reconcile effect routes them to desks / couches / gym
 *      naturally — no extra wiring needed.
 *   2. A choreographer pushes ArenaEvents into eventBufferRef on a schedule
 *      (overtake ~7s, dance ~12s, score pop ~5s, fail ~30s). The game loop
 *      drains this buffer on tick and applies dance / talk-freeze / emoji /
 *      couch holds — identical to how the real arena behaves.
 *
 * Identities are stable across renders so choreographed events can target
 * consistent agents.
 */

const MOCK_AGENT_COUNT = 15;
const TASK_TITLE = "Distributed Rate Limiter: 10M RPS, Sliding-Window, Multi-Region";

// Curated palette — same seed as AGENT_COLORS in useStrawAgents so visuals
// match between real and mock arena rendering.
const MOCK_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
  "#10b981", "#e11d4e", "#0ea5e9", "#eab308", "#7c3aed",
];

// Stable starting scores — spread 62–93 so the leaderboard isn't all bunched.
// Ranks derived from score order.
const INITIAL_SCORES: number[] = [
  92.8, 91.4, 88.6, 86.9, 85.2, 83.5, 81.1, 78.6, 76.3, 73.9,
  71.2, 69.4, 67.1, 64.5, 61.8,
];

// Status-flip cadence. Each tick, a random agent flips working ↔ idle.
const STATUS_FLIP_MIN_MS = 2200;
const STATUS_FLIP_MAX_MS = 4500;

// Choreographer cadences. Small jitter so behaviors don't sync up.
const OVERTAKE_MIN_MS = 6_000;
const OVERTAKE_MAX_MS = 9_000;
const DANCE_MIN_MS = 10_000;
const DANCE_MAX_MS = 15_000;
const SCORE_POP_MIN_MS = 3_500;
const SCORE_POP_MAX_MS = 6_500;
const FAIL_MIN_MS = 22_000;
const FAIL_MAX_MS = 40_000;

// Score tick — agents slowly improve their scores, driving leaderboard motion.
const SCORE_TICK_INTERVAL_MS = 1_600;
const SCORE_TICK_MAX_DELTA = 0.9;

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

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickIndex(excluding?: number): number {
  if (excluding === undefined) return Math.floor(Math.random() * MOCK_AGENT_COUNT);
  let i = Math.floor(Math.random() * MOCK_AGENT_COUNT);
  while (i === excluding) i = Math.floor(Math.random() * MOCK_AGENT_COUNT);
  return i;
}

function buildInitialAgents(): ArenaAgent[] {
  return Array.from({ length: MOCK_AGENT_COUNT }, (_, i) => ({
    id: `mock-agent-${i + 1}`,
    displayName: `Agent ${i + 1}`,
    rank: i + 1,
    latestStatus: i < 6 ? "running" : "completed", // ~40% start "working"
    score: INITIAL_SCORES[i],
    taskTitle: TASK_TITLE,
  }));
}

export interface UseMockArenaAgentsResult {
  agents: ArenaAgent[];
  officeAgents: OfficeAgentInput[];
  loading: boolean;
  eventBufferRef: React.RefObject<ArenaEvent[]>;
}

export function useMockArenaAgents(): UseMockArenaAgentsResult {
  const [agents, setAgents] = useState<ArenaAgent[]>(buildInitialAgents);
  const eventBufferRef = useRef<ArenaEvent[]>([]);

  // Keep a ref to the latest agents list so schedulers don't need to re-
  // subscribe every state update.
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // ── Status-flip scheduler ───────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const flip = () => {
      setAgents((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        const current = next[idx];
        const nextStatus =
          deriveStatus(current.latestStatus) === "working" ? "completed" : "running";
        next[idx] = { ...current, latestStatus: nextStatus };
        return next;
      });
      timer = setTimeout(flip, rand(STATUS_FLIP_MIN_MS, STATUS_FLIP_MAX_MS));
    };
    timer = setTimeout(flip, rand(STATUS_FLIP_MIN_MS, STATUS_FLIP_MAX_MS));
    return () => clearTimeout(timer);
  }, []);

  // ── Score-tick scheduler ───────────────────────────────────────────────
  // Random agent improves by a small delta. Ranks recomputed from score order.
  // Critical: preserve the array's INSERTION order — the arena game loop uses
  // the agent's array index to assign a desk (`DESK_STANDING_POINTS[idx]`). If
  // we re-sort, agents would swap desks on every rank change. Ranks are a
  // per-agent field, sort order is a display concern for the leaderboard only.
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const withNewScore = prev.map((a, i) =>
          i === idx
            ? { ...a, score: Math.min(99.9, (a.score ?? 0) + Math.random() * SCORE_TICK_MAX_DELTA) }
            : a
        );
        const rankById = new Map(
          [...withNewScore]
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map((a, rankIdx) => [a.id, rankIdx + 1])
        );
        return withNewScore.map((a) => ({ ...a, rank: rankById.get(a.id) ?? null }));
      });
    }, SCORE_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Event choreographer ────────────────────────────────────────────────
  // Schedules one event of each kind on its own cadence. Pushes into
  // eventBufferRef; the game loop drains on tick.
  useEffect(() => {
    const push = (type: ArenaEventType, agentId: string, partnerAgentId?: string) => {
      eventBufferRef.current.push({
        type,
        agentId,
        partnerAgentId,
        timestamp: Date.now(),
      });
    };

    const scheduleOvertake = () => {
      const a = pickIndex();
      const b = pickIndex(a);
      const current = agentsRef.current;
      if (current[a] && current[b]) {
        push("rank-overtake", current[a].id, current[b].id);
      }
      return setTimeout(scheduleOvertake, rand(OVERTAKE_MIN_MS, OVERTAKE_MAX_MS));
    };
    const scheduleDance = () => {
      const a = pickIndex();
      const current = agentsRef.current;
      if (current[a]) push("rank-top3-entry", current[a].id);
      return setTimeout(scheduleDance, rand(DANCE_MIN_MS, DANCE_MAX_MS));
    };
    const scheduleScorePop = () => {
      const a = pickIndex();
      const current = agentsRef.current;
      if (current[a]) push("score-improved", current[a].id);
      return setTimeout(scheduleScorePop, rand(SCORE_POP_MIN_MS, SCORE_POP_MAX_MS));
    };
    const scheduleFail = () => {
      const a = pickIndex();
      const current = agentsRef.current;
      if (current[a]) push("submission-failed", current[a].id);
      return setTimeout(scheduleFail, rand(FAIL_MIN_MS, FAIL_MAX_MS));
    };

    // Kick off each scheduler with a different initial offset so events don't
    // bunch up at T=0.
    const t1 = setTimeout(scheduleOvertake, 4_000);
    const t2 = setTimeout(scheduleDance, 8_000);
    const t3 = setTimeout(scheduleScorePop, 2_500);
    const t4 = setTimeout(scheduleFail, 18_000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const officeAgents = useMemo<OfficeAgentInput[]>(
    () =>
      agents.map((a, i) => ({
        id: a.id,
        name: a.displayName,
        rank: a.rank,
        status: deriveStatus(a.latestStatus),
        color: MOCK_COLORS[i % MOCK_COLORS.length],
        item: "none",
      })),
    [agents]
  );

  return {
    agents,
    officeAgents,
    loading: false,
    eventBufferRef,
  };
}
