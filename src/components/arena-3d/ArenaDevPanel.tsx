"use client";

import { useState } from "react";
import type { RenderAgentState } from "./useArenaGameLoop";
import type { useTunerAgent } from "./tuner/TunerScene";

type TriggerDevAction = ReturnType<typeof useTunerAgent>["triggerDevAction"];
type TriggerJoin = ReturnType<typeof useTunerAgent>["triggerJoin"];
type TriggerLeave = ReturnType<typeof useTunerAgent>["triggerLeave"];

interface ArenaDevPanelProps {
  agentRef: React.RefObject<RenderAgentState[]>;
  triggerDevAction: TriggerDevAction;
  triggerJoin: TriggerJoin;
  triggerLeave: TriggerLeave;
}

/**
 * Dev-only panel for previewing competition event visuals.
 * Each button mirrors what the real event stream will trigger automatically
 * in prod — remove this panel before launch.
 */
export default function ArenaDevPanel({
  agentRef,
  triggerDevAction,
  triggerJoin,
  triggerLeave,
}: ArenaDevPanelProps) {
  const [open, setOpen] = useState(false);

  function pickRandomVisibleIdx(): number {
    const agents = agentRef.current;
    const visible: number[] = [];
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (a && !a.hidden) visible.push(i);
    }
    if (visible.length === 0) return -1;
    return visible[Math.floor(Math.random() * visible.length)];
  }

  function fire(action: "dance" | "emoji" | "slump" | "talk") {
    const idx = pickRandomVisibleIdx();
    if (idx >= 0) triggerDevAction(idx, action);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-mono hover:bg-black/80 transition-colors flex items-center gap-1.5"
        title="Open competition event preview panel"
      >
        <span className="opacity-60">events:</span>
        <span>off</span>
      </button>
    );
  }

  const btn =
    "px-2 py-0.5 rounded-full hover:bg-white/15 transition-colors text-[11px] flex items-center gap-1";

  return (
    <div className="flex items-start gap-1.5 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1.5 rounded-xl font-mono">
      <button
        onClick={() => setOpen(false)}
        className="opacity-60 hover:opacity-100 transition-opacity px-1 shrink-0 pt-0.5"
        title="Close panel"
      >
        events: on
      </button>
      <span className="opacity-30 pt-0.5">|</span>

      {/* Door events */}
      <div className="flex flex-col gap-0.5">
        <span className="opacity-40 text-[9px] uppercase tracking-wider px-1">door</span>
        <div className="flex gap-1">
          <button className={btn} onClick={() => triggerJoin()} title="agent-joined">🚪 join</button>
          <button className={btn} onClick={() => triggerLeave()} title="agent-left">🚶 leave</button>
        </div>
      </div>

      <span className="opacity-30 pt-0.5">|</span>

      {/* Score events */}
      <div className="flex flex-col gap-0.5">
        <span className="opacity-40 text-[9px] uppercase tracking-wider px-1">score</span>
        <div className="flex gap-1">
          <button className={btn} onClick={() => fire("emoji")} title="score-improved">🎉 scored</button>
          <button className={btn} onClick={() => fire("dance")} title="rank-overtake">⬆️ overtook</button>
          <button className={btn} onClick={() => fire("slump")} title="submission-failed">❌ failed</button>
          <button className={btn} onClick={() => fire("talk")} title="submission-completed">💬 submitted</button>
        </div>
      </div>
    </div>
  );
}
