"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { RenderAgentState } from "../useArenaGameLoop";

/**
 * Inner emoji text that reads the current icon from the agent ref each frame.
 * Parent <group ref={emojiGroupRef}> controls visibility/scale/position.
 */
export default function EmojiOverlay({
  agentId,
  agentsRef,
}: {
  agentId: string;
  agentsRef: React.RefObject<RenderAgentState[]>;
}) {
  const [icon, setIcon] = useState<string>(" ");
  const lastIconRef = useRef<string>(" ");

  useFrame(() => {
    const agent = agentsRef.current.find((a) => a.id === agentId);
    if (!agent) return;
    const now = Date.now();
    const active = agent.emojiUntil !== undefined && agent.emojiUntil > now;
    const next = active && agent.emojiIcon ? agent.emojiIcon : " ";
    if (next !== lastIconRef.current) {
      lastIconRef.current = next;
      setIcon(next);
    }
  });

  // Give each glyph a fill color so the monochrome SDF font renders with
  // some personality instead of washed-out white. Fallback is a warm amber.
  const color = EMOJI_COLOR[icon.trim()] ?? "#fbbf24";

  return (
    <Text
      fontSize={60}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={2}
      outlineColor="#000000"
    >
      {icon}
    </Text>
  );
}

const EMOJI_COLOR: Record<string, string> = {
  "🎉": "#fbbf24", // amber
  "⬆️": "#10b981", // emerald
  "🔥": "#f97316", // orange
  "❌": "#dc2626", // red
  "🏆": "#eab308", // gold
};
