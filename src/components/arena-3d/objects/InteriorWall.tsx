"use client";

import { SCALE, WALL_THICKNESS } from "../core/constants";
import { toWorld } from "../core/geometry";
import type { FurnitureItem } from "../core/types";

const WALL_COLOR = "#EDEDEA";
const WALL_TRIM_COLOR = "#A8A5A0";
const WALL_HEIGHT = 1.1; // world units
const TRIM_HEIGHT = 0.06;

interface InteriorWallProps {
  item: FurnitureItem;
}

export default function InteriorWall({ item }: InteriorWallProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 80) * SCALE;
  const h = (item.h ?? WALL_THICKNESS) * SCALE;
  const centerX = wx + w / 2;
  const centerZ = wz + h / 2;

  // Extend the wall 0.06 units below the floor plane (y=0) so BWEffects'
  // bottom-edge overlay renders beneath the floor and gets occluded.
  // Top edges and silhouette stay unchanged.
  const BURY = 0.06;
  const bodyH = WALL_HEIGHT + BURY;
  const bodyCenterY = WALL_HEIGHT / 2 - BURY / 2;
  return (
    <group position={[centerX, 0, centerZ]}>
      {/* Main wall body — box extends from y=-BURY to y=WALL_HEIGHT */}
      <mesh position={[0, bodyCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, bodyH, h]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Top trim */}
      <mesh position={[0, WALL_HEIGHT + TRIM_HEIGHT / 2, 0]}>
        <boxGeometry args={[w + 0.02, TRIM_HEIGHT, h + 0.02]} />
        <meshStandardMaterial color={WALL_TRIM_COLOR} roughness={0.7} />
      </mesh>
    </group>
  );
}
