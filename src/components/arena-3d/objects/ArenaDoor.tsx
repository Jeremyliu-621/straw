"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import { SCALE } from "../core/constants";
import {
  ARENA_DOOR_X,
  ARENA_DOOR_Y,
} from "../core/defaultLayout";
import type { RenderAgentState } from "../useArenaGameLoop";

/**
 * East-perimeter door where agents join / leave the top 20. The leaf
 * hinges on its inside-wall edge and swings open when any visible
 * agent is within DOOR_TRIGGER_PX; closes otherwise.
 *
 * Shared between /arena-tuner + /leaderboard + /tasks/[id] so one
 * visual definition lives in one place.
 */
const DOOR_TRIGGER_PX = 120;
const DOOR_OPEN_ANGLE = Math.PI / 2.2; // ~82° — leaf swings inward

export default function ArenaDoor({
  agentsRef,
}: {
  agentsRef: React.RefObject<RenderAgentState[]>;
}) {
  const leafRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!leafRef.current) return;
    const agents = agentsRef.current;
    let closest = Infinity;
    for (const a of agents) {
      if (!a) continue;
      if (a.hidden) continue;
      const d = Math.hypot(a.x - ARENA_DOOR_X, a.y - ARENA_DOOR_Y);
      if (d < closest) closest = d;
    }
    const shouldOpen = closest < DOOR_TRIGGER_PX;
    const target = shouldOpen ? DOOR_OPEN_ANGLE : 0;
    leafRef.current.rotation.y +=
      (target - leafRef.current.rotation.y) * 0.12;
  });

  const [wx, , wz] = toWorld(ARENA_DOOR_X, ARENA_DOOR_Y);
  // Leaf height matches perimeter wall (wallH = 1.1). Width is single-person.
  const doorW = 0.05;
  const doorH = 1.1;
  const doorL = 45 * SCALE;
  const frameThick = 0.12;
  const panelInsetY = 0.1;
  const panelInsetZ = 0.06;
  const panelGap = 0.06;
  const handleR = 0.04;
  const wood = "#c9a36b";
  const woodDark = "#8b6a3d";
  const trim = "#2a241c";
  const brass = "#d4b048";
  return (
    <group position={[wx, doorH / 2, wz]}>
      {/* Trim / jamb */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.04, doorH, doorL + frameThick * 2]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      {/* Door leaf — pivots on its inside-wall edge. */}
      <group ref={leafRef} position={[-doorW / 2, 0, doorL / 2]}>
        <mesh position={[-0.005, 0, -doorL / 2]}>
          <boxGeometry args={[doorW, doorH, doorL]} />
          <meshStandardMaterial color={wood} />
        </mesh>
        {/* Upper + lower panels */}
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.005,
            doorH / 4 + panelGap / 4,
            -doorL / 2,
          ]}
        >
          <boxGeometry
            args={[
              0.015,
              doorH / 2 - panelInsetY - panelGap / 2,
              doorL - panelInsetZ * 2,
            ]}
          />
          <meshStandardMaterial color={woodDark} />
        </mesh>
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.005,
            -doorH / 4 - panelGap / 4,
            -doorL / 2,
          ]}
        >
          <boxGeometry
            args={[
              0.015,
              doorH / 2 - panelInsetY - panelGap / 2,
              doorL - panelInsetZ * 2,
            ]}
          />
          <meshStandardMaterial color={woodDark} />
        </mesh>
        {/* Brass handle near the free edge */}
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.02,
            -0.05,
            -doorL + panelInsetZ + 0.04,
          ]}
        >
          <sphereGeometry args={[handleR, 10, 8]} />
          <meshStandardMaterial
            color={brass}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}
