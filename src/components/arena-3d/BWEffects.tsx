"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Black & white mode for the arena with four internal variants.
 *
 * For every non-emissive mesh we:
 *  1. Replace its material with a B&W override:
 *     - "unlit"        : shared flat-white `MeshBasicMaterial`.
 *     - "lit"          : shared flat-white `MeshStandardMaterial` (receives
 *                        shadows from the directional sun).
 *     - "unlit-tint"   : per-mesh `MeshBasicMaterial` with the mesh's original
 *                        color lerped 90% toward white → mostly white with a
 *                        10% hint of the original hue.
 *     - "lit-tint"     : per-mesh `MeshStandardMaterial` (same 10% tint rule,
 *                        responds to lights, receives shadows).
 *  2. Attach a `LineSegments` child built from `EdgesGeometry` (threshold 15°)
 *     rendered in black — clean polygon outlines regardless of variant.
 *
 * Emissive accents (any mesh currently using `MeshBasicMaterial` with
 * `toneMapped === false`) are skipped — neon, TV glow, LEDs, and pendant
 * bulbs remain as the sole color pops.
 */

export type BWVariant = "unlit" | "lit" | "unlit-tint" | "lit-tint";

type MeshUserData = {
  __bwOriginalMaterial?: THREE.Material | THREE.Material[];
  __bwOriginalCastShadow?: boolean;
  __bwOriginalReceiveShadow?: boolean;
  __bwPatchedWith?: BWVariant;
  __bwTintedMaterial?: THREE.Material;
  __isBWEdgeOverlay?: boolean;
};

const WHITE_UNLIT = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
WHITE_UNLIT.name = "__bwWhiteUnlit__";

const WHITE_LIT = new THREE.MeshStandardMaterial({
  color: "#FFFFFF",
  roughness: 0.9,
  metalness: 0,
});
WHITE_LIT.name = "__bwWhiteLit__";

const BLACK_LINE_MATERIAL = new THREE.LineBasicMaterial({
  color: "#000000",
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});
BLACK_LINE_MATERIAL.name = "__bwEdgeLine__";

const EDGE_THRESHOLD_DEG = 15;
// Fraction of the blend that's white. 0 = full original color, 1 = pure white.
// 0.4 = pastel blend where the hue reads clearly (brown, red, green visible)
// with a little more saturation than a 50/50 mix.
const TINT_AMOUNT = 0.4;

function isEmissiveMarker(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshBasicMaterial)) return false;
  return mat.toneMapped === false;
}

function shouldSkip(material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material)) return material.every(isEmissiveMarker);
  return isEmissiveMarker(material);
}

function extractColor(material: THREE.Material | THREE.Material[]): THREE.Color {
  const first = Array.isArray(material) ? material[0] : material;
  // Most material types that have a diffuse color expose `.color`.
  const maybeColor = (first as { color?: THREE.Color }).color;
  if (maybeColor instanceof THREE.Color) return maybeColor.clone();
  return new THREE.Color("#FFFFFF");
}

function makeTintedMaterial(
  original: THREE.Material | THREE.Material[],
  lit: boolean
): THREE.Material {
  const base = extractColor(original);
  // Lerp toward white by TINT_AMOUNT. After: 10% original + 90% white.
  base.lerp(new THREE.Color("#FFFFFF"), TINT_AMOUNT);
  if (lit) {
    return new THREE.MeshStandardMaterial({
      color: base,
      roughness: 0.9,
      metalness: 0,
    });
  }
  return new THREE.MeshBasicMaterial({ color: base });
}

function chooseMaterial(
  variant: BWVariant,
  mesh: THREE.Mesh,
  originalMaterial: THREE.Material | THREE.Material[]
): THREE.Material {
  if (variant === "unlit") return WHITE_UNLIT;
  if (variant === "lit") return WHITE_LIT;
  const lit = variant === "lit-tint";
  // Re-use a cached tinted material when possible; dispose it on variant change.
  const ud = mesh.userData as MeshUserData;
  if (ud.__bwTintedMaterial) {
    ud.__bwTintedMaterial.dispose();
    ud.__bwTintedMaterial = undefined;
  }
  const mat = makeTintedMaterial(originalMaterial, lit);
  ud.__bwTintedMaterial = mat;
  return mat;
}

function patchMesh(mesh: THREE.Mesh, variant: BWVariant): void {
  const ud = mesh.userData as MeshUserData;
  if (ud.__isBWEdgeOverlay) return;
  if (ud.__bwPatchedWith === variant) return;
  if (!mesh.geometry) return;
  if (!mesh.material || shouldSkip(mesh.material)) return;

  if (ud.__bwPatchedWith === undefined) {
    ud.__bwOriginalMaterial = mesh.material;
    ud.__bwOriginalCastShadow = mesh.castShadow;
    ud.__bwOriginalReceiveShadow = mesh.receiveShadow;
  }

  const orig = ud.__bwOriginalMaterial!;
  mesh.material = chooseMaterial(variant, mesh, orig);

  const lit = variant === "lit" || variant === "lit-tint";
  mesh.castShadow = lit;
  mesh.receiveShadow = lit;

  // Add the edge overlay once (independent of variant).
  const hasOverlay = mesh.children.some((c) => (c.userData as MeshUserData).__isBWEdgeOverlay);
  if (!hasOverlay) {
    const edgeGeom = new THREE.EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEG);
    const overlay = new THREE.LineSegments(edgeGeom, BLACK_LINE_MATERIAL);
    overlay.name = "__bwEdgeOverlay__";
    (overlay.userData as MeshUserData).__isBWEdgeOverlay = true;
    overlay.position.y = 0.02; // depth clearance against the floor plane
    overlay.renderOrder = 2;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    mesh.add(overlay);
  }

  ud.__bwPatchedWith = variant;
}

function unpatchMesh(mesh: THREE.Mesh): void {
  const ud = mesh.userData as MeshUserData;
  if (!ud.__bwPatchedWith) return;

  if (ud.__bwOriginalMaterial) {
    mesh.material = ud.__bwOriginalMaterial;
    ud.__bwOriginalMaterial = undefined;
  }
  if (ud.__bwOriginalCastShadow !== undefined) {
    mesh.castShadow = ud.__bwOriginalCastShadow;
    ud.__bwOriginalCastShadow = undefined;
  }
  if (ud.__bwOriginalReceiveShadow !== undefined) {
    mesh.receiveShadow = ud.__bwOriginalReceiveShadow;
    ud.__bwOriginalReceiveShadow = undefined;
  }
  if (ud.__bwTintedMaterial) {
    ud.__bwTintedMaterial.dispose();
    ud.__bwTintedMaterial = undefined;
  }

  const toRemove: THREE.Object3D[] = [];
  mesh.children.forEach((c) => {
    if ((c.userData as MeshUserData).__isBWEdgeOverlay) toRemove.push(c);
  });
  toRemove.forEach((c) => {
    mesh.remove(c);
    const ls = c as THREE.LineSegments;
    if (ls.geometry) ls.geometry.dispose();
  });

  ud.__bwPatchedWith = undefined;
}

function applyAll(scene: THREE.Scene, variant: BWVariant): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) patchMesh(mesh, variant);
  });
}

function unapplyAll(scene: THREE.Scene): void {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  meshes.forEach(unpatchMesh);
}

export default function BWEffects({ variant }: { variant: BWVariant | null }) {
  const { scene } = useThree();
  const currentRef = useRef<BWVariant | null>(null);

  useEffect(() => {
    if (variant === null) {
      if (currentRef.current !== null) {
        unapplyAll(scene);
        currentRef.current = null;
      }
      return;
    }
    if (currentRef.current !== variant) {
      applyAll(scene, variant);
      currentRef.current = variant;
    }
  }, [variant, scene]);

  useEffect(() => {
    return () => {
      if (currentRef.current !== null) {
        unapplyAll(scene);
        currentRef.current = null;
      }
    };
  }, [scene]);

  useFrame(() => {
    if (variant === null) return;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const ud = mesh.userData as MeshUserData;
      if (ud.__bwPatchedWith === variant || ud.__isBWEdgeOverlay) return;
      patchMesh(mesh, variant);
    });
  });

  return null;
}
