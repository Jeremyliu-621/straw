"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { SCALE } from "../core/constants";
import {
  getItemBaseSize,
  getItemRotationRadians,
  resolveItemTypeKey,
  toWorld,
} from "../core/geometry";
import type { FurnitureItem } from "../core/types";

export const FURNITURE_GLB: Record<string, string> = {
  desk_cubicle: "/office-assets/models/furniture/desk.glb",
  executive_desk: "/office-assets/models/furniture/deskCorner.glb",
  chair: "/office-assets/models/furniture/chairDesk.glb",
  round_table: "/office-assets/models/furniture/tableRound.glb",
  couch: "/office-assets/models/furniture/loungeSofa.glb",
  couch_v: "/office-assets/models/furniture/loungeDesignChair.glb",
  bookshelf: "/office-assets/models/furniture/bookcaseClosed.glb",
  plant: "/office-assets/models/furniture/pottedPlant.glb",
  beanbag: "/office-assets/models/furniture/loungeDesignChair.glb",
  table_rect: "/office-assets/models/furniture/table.glb",
  coffee_machine: "/office-assets/models/furniture/kitchenCoffeeMachine.glb",
  fridge: "/office-assets/models/furniture/kitchenFridgeSmall.glb",
  whiteboard: "/office-assets/models/furniture/bookcaseClosed.glb",
  cabinet: "/office-assets/models/furniture/kitchenCabinet.glb",
  computer: "/office-assets/models/furniture/computerScreen.glb",
  lamp: "/office-assets/models/furniture/lampRoundFloor.glb",
  vending: "/office-assets/models/furniture/kitchenFridgeSmall.glb",
  trash: "/office-assets/models/furniture/plantSmall1.glb",
};

export const FURNITURE_SCALE: Record<string, [number, number, number]> = {
  desk_cubicle: [1.5, 1.5, 1.5],
  executive_desk: [1.8, 1.8, 1.8],
  chair: [1.2, 1.2, 1.2],
  round_table: [3.2, 3.2, 3.2],
  couch: [1.8, 1.8, 1.8],
  couch_v: [1.4, 1.4, 1.4],
  bookshelf: [1.5, 2, 1.5],
  plant: [1.2, 1.8, 1.2],
  beanbag: [1, 1, 1],
  table_rect: [1.4, 1.2, 1.0],
  coffee_machine: [0.8, 0.8, 0.8],
  fridge: [1, 1.4, 1],
  whiteboard: [0.6, 1.4, 0.3],
  cabinet: [2.6, 1.2, 1],
  computer: [1.1, 1.1, 1.1],
  lamp: [1.2, 1.2, 1.2],
  vending: [0.9, 1.2, 0.9],
  trash: [0.6, 0.8, 0.6],
};

export const FURNITURE_Y_OFFSET: Record<string, number> = {
  computer: 0.61,
};

export const FURNITURE_TINT: Record<string, string | null> = {
  desk_cubicle: "#8b5e32",
  executive_desk: "#6b3c1a",
  chair: "#4a5568",
  round_table: "#9a6332",
  couch: "#3d5575",
  couch_v: "#5a4870",
  bookshelf: "#5c3520",
  beanbag: null,
  computer: "#363c58",
  table_rect: "#7a5028",
  coffee_machine: "#2d2d38",
  fridge: "#505a60",
  whiteboard: "#f4f2ee",
  cabinet: "#3c4248",
  plant: null,
  lamp: "#c8a060",
  vending: "#b13838",
  trash: "#2d2d2d",
};

const SHADOW_CASTING = new Set([
  "desk_cubicle",
  "executive_desk",
  "round_table",
  "table_rect",
  "couch",
  "couch_v",
  "bookshelf",
  "cabinet",
  "fridge",
  "vending",
]);

const templateCache = new Map<string, THREE.Object3D>();

function resolveTemplate(
  glbPath: string,
  itemType: string,
  itemColor: string | undefined,
  scene: THREE.Object3D
): THREE.Object3D {
  const cacheKey = `${glbPath}:${itemType}:${itemColor ?? ""}`;
  const cached = templateCache.get(cacheKey);
  if (cached) return cached;

  const rawTint = itemType === "beanbag" ? (itemColor ?? null) : FURNITURE_TINT[itemType];
  const tintColor = rawTint ? new THREE.Color(rawTint) : null;
  const template = scene.clone(true);
  const castShadow = SHADOW_CASTING.has(itemType);

  template.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const newMats = mats.map((m) => {
      const nm = m.clone() as THREE.MeshStandardMaterial;
      if (tintColor && "color" in nm) {
        nm.color.lerp(tintColor, 0.8);
      }
      if ("roughness" in nm) nm.roughness = 0.65;
      if ("metalness" in nm) nm.metalness = 0.08;
      return nm;
    });
    mesh.material = Array.isArray(mesh.material) ? newMats : newMats[0];
  });

  templateCache.set(cacheKey, template);
  return template;
}

interface FurnitureModelProps {
  item: FurnitureItem;
}

export default function FurnitureModel({ item }: FurnitureModelProps) {
  const typeKey = resolveItemTypeKey(item);
  const glbPath = FURNITURE_GLB[typeKey];
  const { scene } = useGLTF(glbPath ?? FURNITURE_GLB.table_rect);

  const template = useMemo(
    () => resolveTemplate(glbPath ?? FURNITURE_GLB.table_rect, typeKey, item.color, scene),
    [glbPath, typeKey, item.color, scene]
  );

  const clone = useMemo(() => template.clone(true), [template]);

  const { position, rotation, scale, pivotOffset } = useMemo(() => {
    const [wx, , wz] = toWorld(item.x, item.y);
    const yOffset = (FURNITURE_Y_OFFSET[typeKey] ?? 0) + (item.elevation ?? 0);
    const scaleArr = FURNITURE_SCALE[typeKey] ?? [1, 1, 1];
    const rotY = getItemRotationRadians(item);
    const { width, height } = getItemBaseSize(item);
    return {
      position: [wx, yOffset, wz] as [number, number, number],
      rotation: rotY,
      scale: scaleArr,
      pivotOffset: [width * SCALE * 0.5, 0, height * SCALE * 0.5] as [number, number, number],
    };
  }, [item, typeKey]);

  if (!glbPath) return null;

  return (
    <group position={position}>
      <group position={pivotOffset}>
        <group rotation={[0, rotation, 0]}>
          <group position={[-pivotOffset[0], 0, -pivotOffset[2]]} scale={scale}>
            <primitive object={clone} />
          </group>
        </group>
      </group>
    </group>
  );
}

// Preload all GLB models for faster first-render
Object.values(FURNITURE_GLB).forEach((path) => {
  if (path) useGLTF.preload(path);
});
