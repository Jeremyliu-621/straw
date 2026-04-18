"use client";

import { useState } from "react";

/**
 * Dev-only action that bypasses the normal event reducer and directly tells
 * the game loop to put a specific agent (or a random one) into a state.
 */
export type DevAction =
  | { kind: "dance"; agentId?: string }
  | { kind: "gym"; agentId?: string }
  | { kind: "couch"; agentId?: string }
  | { kind: "overtake"; agentId?: string; partnerId?: string }
  | { kind: "fail"; agentId?: string }
  | { kind: "score"; agentId?: string };

interface DevEventPanelProps {
  /** Ref to a queue the game loop drains each tick. */
  queueRef: React.RefObject<DevAction[]>;
  /** Visible agent ids so we can target specific ones (or random). */
  agentIds: string[];
}

const BUTTONS: {
  kind: DevAction["kind"];
  label: string;
  emoji: string;
  hint: string;
}[] = [
  { kind: "dance", label: "Dance", emoji: "🕺", hint: "Random agent dances 5s" },
  { kind: "gym", label: "Gym", emoji: "🏋️", hint: "Random agent heads to gym" },
  { kind: "couch", label: "Couch", emoji: "😴", hint: "Random agent sits on nearest couch" },
  { kind: "overtake", label: "Overtake", emoji: "💬", hint: "Two random agents talk-freeze" },
  { kind: "score", label: "Score", emoji: "🎉", hint: "Random agent pops celebration emoji" },
  { kind: "fail", label: "Fail", emoji: "💔", hint: "Random agent slumps to couch" },
];

export default function DevEventPanel({ queueRef, agentIds }: DevEventPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const pickRandom = (): string | undefined => {
    if (agentIds.length === 0) return undefined;
    return agentIds[Math.floor(Math.random() * agentIds.length)];
  };

  const pickTwo = (): { a?: string; b?: string } => {
    if (agentIds.length < 2) return {};
    const a = pickRandom();
    let b = pickRandom();
    for (let i = 0; i < 5 && b === a; i++) b = pickRandom();
    return { a, b };
  };

  const trigger = (kind: DevAction["kind"]) => {
    if (!queueRef.current) return;
    if (kind === "overtake") {
      const { a, b } = pickTwo();
      queueRef.current.push({ kind: "overtake", agentId: a, partnerId: b });
    } else {
      queueRef.current.push({ kind, agentId: pickRandom() });
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-mono hover:bg-black/80 transition-colors flex items-center gap-1.5"
        title="Open dev event panel"
      >
        <span className="opacity-60">dev:</span>
        <span>off</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1.5 rounded-full font-mono">
      <button
        onClick={() => setExpanded(false)}
        className="opacity-60 hover:opacity-100 transition-opacity px-1"
        title="Close dev panel"
      >
        dev: on
      </button>
      <span className="opacity-30">|</span>
      {BUTTONS.map((b) => (
        <button
          key={b.kind}
          onClick={() => trigger(b.kind)}
          disabled={agentIds.length === 0}
          className="px-2 py-0.5 rounded-full hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          title={b.hint}
        >
          <span>{b.emoji}</span>
          <span className="text-[11px]">{b.label}</span>
        </button>
      ))}
    </div>
  );
}
