"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import TunerScene, { useTunerAgent } from "./tuner/TunerScene";
import { useStrawAgents, type ArenaAgent } from "./useStrawAgents";
import type { ArenaEvent } from "./useArenaEvents";
import type { CamMode } from "./FollowCamController";
import ScoreOverlay from "./ScoreOverlay";
import ArenaDevPanel from "./ArenaDevPanel";

// ── Agent pool sync ───────────────────────────────────────────────────────────

/**
 * Finds the first hidden pool slot not already claimed by an existing mapping.
 * Returns -1 if the pool is full.
 */
function findFreeHiddenSlot(
  agentRef: React.RefObject<import("./useArenaGameLoop").RenderAgentState[]>,
  usedSlots: Set<number>
): number {
  const pool = agentRef.current;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i]?.hidden && !usedSlots.has(i)) return i;
  }
  return -1;
}

function derivePoolStatus(
  latestStatus: string | null
): "working" | "idle" | "error" {
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

// ── Component ─────────────────────────────────────────────────────────────────

interface ArenaCanvasProps {
  /** Filter agents to a specific task. Omit for the global top-20 arena. */
  taskId?: string;
  /** Height of the canvas in pixels. Defaults to 600. */
  height?: number;
  /**
   * Show the right-side score sidebar. Defaults to true. Turn off when the
   * arena is rendered next to an existing leaderboard table.
   */
  showSidebar?: boolean;
}

export default function ArenaCanvas({
  taskId,
  height = 600,
  showSidebar = true,
}: ArenaCanvasProps = {}) {
  // ── Data ────────────────────────────────────────────────────────────────────
  const { agents, loading, eventBufferRef } = useStrawAgents(taskId);

  // ── Behavior engine ─────────────────────────────────────────────────────────
  const {
    cohort,
    stationIdxByAgent,
    tuning,
    gymTuning,
    miscTuning,
    agentRef,
    navOverrides,
    wallBury,
    showPaths,
    view,
    setView,
    triggerJoin,
    triggerLeave,
    triggerLeaveAt,
    triggerDevAction,
  } = useTunerAgent({ initialCohort: "arena", initialAmbientAll: true });

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [camMode, setCamMode] = useState<CamMode>("off");

  // ── Pool mapping ─────────────────────────────────────────────────────────────
  // realAgentId → pool slot index (stable across re-renders)
  const idToPoolIdx = useRef<Map<string, number>>(new Map());
  // pool slot index → realAgentId (for reverse lookup)
  const poolIdxToId = useRef<Map<number, string>>(new Map());

  // ── Initial hide ─────────────────────────────────────────────────────────────
  // TunerScene starts with first 15 agents visible. Hide them all so the
  // arena is empty until real agents join through the door.
  useLayoutEffect(() => {
    for (const a of agentRef.current) {
      if (a) a.hidden = true;
    }
  }, [agentRef]);

  // ── Agent sync ───────────────────────────────────────────────────────────────
  // Diff the real agent list on each poll and join/leave/update pool slots.
  const prevAgentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pool = agentRef.current;
    const currentIds = new Set(agents.map((a) => a.id));
    const prev = prevAgentIdsRef.current;
    const usedSlots = new Set(idToPoolIdx.current.values());

    // 1. Join: real agents that weren't tracked before
    for (const agent of agents) {
      if (idToPoolIdx.current.has(agent.id)) continue;
      const slotIdx = findFreeHiddenSlot(agentRef, usedSlots);
      if (slotIdx < 0) break; // pool full (18 agents max)

      // Claim the slot before triggerJoin() unhides it so we know which one
      usedSlots.add(slotIdx);
      idToPoolIdx.current.set(agent.id, slotIdx);
      poolIdxToId.current.set(slotIdx, agent.id);

      // Override pool agent identity with the real agent's data
      const poolAgent = pool[slotIdx];
      if (poolAgent) {
        poolAgent.id = agent.id;
        poolAgent.name = agent.displayName ?? null;
        poolAgent.rank = agent.rank;
        poolAgent.status = derivePoolStatus(agent.latestStatus);
      }

      triggerJoin(); // unhides slot + walks them in from the door
    }

    // 2. Leave: pool agents whose real agent is gone
    for (const [id, poolIdx] of idToPoolIdx.current) {
      if (currentIds.has(id)) continue;
      triggerLeaveAt(poolIdx);
      idToPoolIdx.current.delete(id);
      poolIdxToId.current.delete(poolIdx);
      // Also clear selection if this agent was selected
      if (selectedAgentId === id) {
        setSelectedAgentId(null);
        setCamMode("off");
      }
    }

    // 3. Update: sync display data for continuing agents
    for (const agent of agents) {
      const poolIdx = idToPoolIdx.current.get(agent.id);
      if (poolIdx === undefined) continue;
      const poolAgent = pool[poolIdx];
      if (!poolAgent) continue;
      poolAgent.name = agent.displayName ?? null;
      poolAgent.rank = agent.rank;
      poolAgent.status = derivePoolStatus(agent.latestStatus);
    }

    prevAgentIdsRef.current = currentIds;
  }, [agents, agentRef, triggerJoin, triggerLeaveAt, selectedAgentId]);

  // ── Event pipeline ────────────────────────────────────────────────────────────
  // Drain the event buffer and map competition events → visual actions on the
  // matching pool agent. The same mapping the dev panel manually triggers.
  useEffect(() => {
    const id = window.setInterval(() => {
      const buf = eventBufferRef.current;
      if (buf.length === 0) return;
      const events = buf.splice(0, buf.length) as ArenaEvent[];
      for (const ev of events) {
        const poolIdx = idToPoolIdx.current.get(ev.agentId);
        if (poolIdx === undefined) continue;
        switch (ev.type) {
          case "score-improved":
          case "submission-completed":
            triggerDevAction(poolIdx, "emoji"); // 🎉
            break;
          case "rank-overtake":
          case "rank-top3-entry":
            triggerDevAction(poolIdx, "dance"); // ⬆️ celebrate
            break;
          case "submission-failed":
            triggerDevAction(poolIdx, "slump"); // ❌
            break;
          default:
            break;
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [eventBufferRef, triggerDevAction]);

  // ── Camera follow ─────────────────────────────────────────────────────────────
  const camAgentIdx =
    selectedAgentId !== null
      ? agentRef.current.findIndex((a) => a?.id === selectedAgentId)
      : -1;

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectAgent = useCallback((id: string) => {
    setSelectedAgentId((prev) => (prev === id ? null : id));
    setCamMode("off");
  }, []);

  const handleDeselectAgent = useCallback(() => {
    setSelectedAgentId(null);
    setCamMode("off");
  }, []);

  // Esc to clear selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAgentId(null);
        setCamMode("off");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────────
  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId) ?? null
    : null;

  const visibleCount = agentRef.current.filter((a) => a && !a.hidden).length;

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex w-full" style={{ height }}>
      {/* 3D canvas */}
      <div
        className={`relative overflow-hidden ${showSidebar ? "rounded-l-lg" : "rounded-lg"}`}
        style={{ flex: showSidebar ? "1 1 60%" : "1 1 auto", minWidth: 0 }}
      >
        <TunerScene
          cohort={cohort}
          stationIdxByAgent={stationIdxByAgent}
          tuning={tuning}
          gymTuning={gymTuning}
          miscTuning={miscTuning}
          agentRef={agentRef}
          showPaths={showPaths}
          showNav={false}
          navOverrides={navOverrides}
          view={view}
          wallBury={wallBury}
          zoom={22}
          camMode={camAgentIdx >= 0 ? camMode : "off"}
          camAgentIdx={camAgentIdx >= 0 ? camAgentIdx : 0}
          onSelectAgent={handleSelectAgent}
          selectedAgentId={selectedAgentId}
        />

        {/* Agent count badge — top left */}
        <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-mono">
          {visibleCount} agent{visibleCount !== 1 ? "s" : ""} in arena
        </div>

        {/* Dev panel — top left, below badge */}
        <div className="absolute top-14 left-3 z-10">
          <ArenaDevPanel
            agentRef={agentRef}
            triggerDevAction={triggerDevAction}
            triggerJoin={triggerJoin}
            triggerLeave={triggerLeave}
          />
        </div>

        {/* View toggle — top right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            onClick={() => setView(view === "iso" ? "top" : "iso")}
            className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-mono hover:bg-black/80 transition-colors flex items-center gap-1.5"
            title="Toggle camera angle"
          >
            <span className="opacity-60">view:</span>
            <span>{view}</span>
          </button>
        </div>

        {/* Selected agent panel — fixed top-center */}
        {selectedAgent && (
          <SelectedAgentPanel
            agent={selectedAgent}
            camMode={camMode}
            onFollowToggle={() =>
              setCamMode((m) => (m === "follow" ? "off" : "follow"))
            }
            onClose={handleDeselectAgent}
          />
        )}
      </div>

      {/* Score sidebar */}
      {showSidebar && (
        <ScoreOverlay
          agents={agents}
          loading={loading}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) =>
            setSelectedAgentId((prev) => (prev === id ? null : id))
          }
        />
      )}
    </div>
  );
}

// ── SelectedAgentPanel ────────────────────────────────────────────────────────

function statusColor(status: string | null): string {
  switch (status) {
    case "running":
    case "pending":
      return "#f59e0b";
    case "completed":
      return "#10b981";
    case "failed":
      return "#ef4444";
    case "registered":
      return "#6366f1";
    default:
      return "#94a3b8";
  }
}

function SelectedAgentPanel({
  agent,
  camMode,
  onFollowToggle,
  onClose,
}: {
  agent: ArenaAgent;
  camMode: CamMode;
  onFollowToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      style={{
        minWidth: 220,
        maxWidth: 260,
        padding: "10px 12px",
        background: "rgba(255, 255, 255, 0.97)",
        border: "1px solid #111",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-sans font-medium text-[14px] text-black truncate">
          {agent.displayName ?? `Agent ${agent.rank ?? "?"}`}
        </div>
        <button
          onClick={onClose}
          className="font-sans text-[11px] text-gray-400 hover:text-black shrink-0 leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="font-sans text-[11px] text-gray-500 mb-2 truncate">
        {agent.taskTitle}
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div>
          <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">Rank</div>
          <div className="font-mono text-[16px] font-semibold">{agent.rank ?? "—"}</div>
        </div>
        <div>
          <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">Score</div>
          <div className="font-mono text-[16px] font-semibold">
            {agent.score !== null ? agent.score.toFixed(1) : "—"}
          </div>
        </div>
        <div>
          <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">Status</div>
          <div className="font-sans text-[12px] flex items-center gap-1.5">
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor(agent.latestStatus),
              }}
            />
            {agent.latestStatus ?? "unknown"}
          </div>
        </div>
      </div>
      <button
        onClick={onFollowToggle}
        className={`w-full px-3 py-1.5 rounded-full text-[11px] font-sans border transition-colors ${
          camMode === "follow"
            ? "bg-black text-white border-black hover:bg-black/80"
            : "bg-white text-black border-gray-300 hover:border-black"
        }`}
      >
        {camMode === "follow" ? "exit follow cam" : "enter follow cam"}
      </button>
    </div>
  );
}
