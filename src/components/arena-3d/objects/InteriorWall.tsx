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

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* Main wall body */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, WALL_HEIGHT, h]} />
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
