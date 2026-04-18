"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "./core/geometry";
import type { RenderAgentState } from "./useArenaGameLoop";

/**
 * Dev overlay: draws a bright line following each agent's current A* path.
 * Short path (1 waypoint) = straight-line movement; long path = A* routing
 * around obstacles. Toggle by passing visible={true/false}.
 */
export default function DebugPathOverlay({
  agentsRef,
  visible,
}: {
  agentsRef: React.RefObject<RenderAgentState[]>;
  visible: boolean;
}) {
  const linesRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!linesRef.current || !visible) return;

    // Clear previous lines
    while (linesRef.current.children.length > 0) {
      const child = linesRef.current.children[0];
      linesRef.current.remove(child);
    }

    const agents = agentsRef.current;
    for (const agent of agents) {
      if (!agent.path || agent.path.length === 0) continue;

      const points: THREE.Vector3[] = [];
      const [ax, , az] = toWorld(agent.x, agent.y);
      points.push(new THREE.Vector3(ax, 0.05, az));
      for (const wp of agent.path) {
        const [wx, , wz] = toWorld(wp.x, wp.y);
        points.push(new THREE.Vector3(wx, 0.05, wz));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = agent.path.length > 1 ? 0x00ff00 : 0xff4444; // green = A*, red = straight
      const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      linesRef.current.add(line);
    }
  });

  if (!visible) return null;
  return <group ref={linesRef} />;
}
