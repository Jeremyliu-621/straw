"use client";

import { memo, Suspense } from "react";
import { CANVAS_W, CANVAS_H, SCALE, WALL_THICKNESS } from "../core/constants";
import type { FurnitureItem } from "../core/types";
import FurnitureModel, { FURNITURE_GLB } from "../objects/FurnitureModel";
import InteriorWall from "../objects/InteriorWall";
import ProceduralFurniture, { PROCEDURAL_TYPES } from "../objects/ProceduralFurniture";

const WORLD_W = CANVAS_W * SCALE;
const WORLD_H = CANVAS_H * SCALE;

// Palette A — "Figma HQ / Pale Concrete". Cool, modern, not yellow.
const FLOOR_COLOR = "#E5E2DB";
const WALL_COLOR = "#C9C7C2";
// Outside-of-office ground plane. Pure white so the scene sits on a clean
// page-like surface rather than floating on a dark backdrop in color mode.
const OUTSIDE_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#B8B3AB";

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
  const wallH = 1.1;
  const halfW = WORLD_W / 2;
  const halfH = WORLD_H / 2;
  const thickness = WALL_THICKNESS * SCALE;

  return (
    <>
      <mesh position={[0, wallH / 2, -halfH]}>
        <boxGeometry args={[WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[0, wallH / 2, halfH]}>
        <boxGeometry args={[WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[-halfW, wallH / 2, 0]}>
        <boxGeometry args={[thickness, wallH, WORLD_H]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
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

function FurnitureRenderer({ items }: { items: FurnitureItem[] }) {
  return (
    <>
      {items.map((item) => {
        if (item.type === "wall") {
          return <InteriorWall key={item._uid} item={item} />;
        }
        if (PROCEDURAL_TYPES.has(item.type)) {
          return <ProceduralFurniture key={item._uid} item={item} />;
        }
        if (!FURNITURE_GLB[item.type]) return null;
        return (
          <Suspense key={item._uid} fallback={null}>
            <FurnitureModel item={item} />
          </Suspense>
        );
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
      <FurnitureRenderer items={furniture} />
    </>
  );
});

export default OfficeEnvironment;
