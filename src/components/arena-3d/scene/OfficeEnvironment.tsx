"use client";

import { memo } from "react";
import { CANVAS_W, CANVAS_H, SCALE, WALL_THICKNESS } from "../core/constants";
import { toWorld } from "../core/geometry";
import type { FurnitureItem } from "../core/types";

const WORLD_W = CANVAS_W * SCALE;
const WORLD_H = CANVAS_H * SCALE;

const FLOOR_COLOR = "#e8dcc8";
const WALL_COLOR = "#d4cfc7";
const OUTSIDE_COLOR = "#3a3a4e";
const ACCENT_COLOR = "#c9b896";

function FloorPlane() {
  return (
    <>
      {/* Dark outside ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[WORLD_W * 3, WORLD_H * 3]} />
        <meshStandardMaterial color={OUTSIDE_COLOR} />
      </mesh>

      {/* Office floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_W, WORLD_H]} />
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>
    </>
  );
}

function PerimeterWalls() {
  const wallH = 0.35;
  const halfW = WORLD_W / 2;
  const halfH = WORLD_H / 2;
  const thickness = WALL_THICKNESS * SCALE;

  return (
    <>
      {/* North wall */}
      <mesh position={[0, wallH / 2, -halfH]}>
        <boxGeometry args={[WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {/* South wall */}
      <mesh position={[0, wallH / 2, halfH]}>
        <boxGeometry args={[WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {/* West wall */}
      <mesh position={[-halfW, wallH / 2, 0]}>
        <boxGeometry args={[thickness, wallH, WORLD_H]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {/* East wall */}
      <mesh position={[halfW, wallH / 2, 0]}>
        <boxGeometry args={[thickness, wallH, WORLD_H]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
    </>
  );
}

function FloorGrid() {
  const divisions = Math.round(CANVAS_W / 200);
  return (
    <gridHelper
      args={[WORLD_W, divisions, ACCENT_COLOR, ACCENT_COLOR]}
      position={[0, 0.002, 0]}
      material-opacity={0.2}
      material-transparent={true}
    />
  );
}

function DeskBox({ item }: { item: FurnitureItem }) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 100) * SCALE;
  const h = 0.12;
  const d = (item.h ?? 55) * SCALE;

  return (
    <mesh position={[wx + w / 2, h / 2, wz + d / 2]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#8b7355" />
    </mesh>
  );
}

function ChairBox({ item }: { item: FurnitureItem }) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const size = 24 * SCALE;

  return (
    <mesh position={[wx + size / 2, 0.06, wz + size / 2]}>
      <boxGeometry args={[size, 0.1, size]} />
      <meshStandardMaterial color="#4a4a5a" />
    </mesh>
  );
}

function PlantBox({ item }: { item: FurnitureItem }) {
  const [wx, , wz] = toWorld(item.x, item.y);

  return (
    <group position={[wx, 0, wz]}>
      {/* Pot */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 8]} />
        <meshStandardMaterial color="#8b6b4a" />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#4a7c59" />
      </mesh>
    </group>
  );
}

function SimpleFurniture({ items }: { items: FurnitureItem[] }) {
  return (
    <>
      {items.map((item) => {
        switch (item.type) {
          case "desk_cubicle":
            return <DeskBox key={item._uid} item={item} />;
          case "chair":
            return <ChairBox key={item._uid} item={item} />;
          case "plant":
            return <PlantBox key={item._uid} item={item} />;
          default:
            return null;
        }
      })}
    </>
  );
}

const OfficeEnvironment = memo(function OfficeEnvironment({
  furniture,
}: {
  furniture: FurnitureItem[];
}) {
  return (
    <>
      <FloorPlane />
      <PerimeterWalls />
      <FloorGrid />
      <SimpleFurniture items={furniture} />
    </>
  );
});

export default OfficeEnvironment;
