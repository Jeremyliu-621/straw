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

// Match the site's page background (#FDFCFC) so the arena blends into the
// task-detail page in B&W mode instead of standing out as a true #FFFFFF rect.
const BW_WHITE = "#FDFCFC";

const WHITE_UNLIT = new THREE.MeshBasicMaterial({ color: BW_WHITE });
WHITE_UNLIT.name = "__bwWhiteUnlit__";

const WHITE_LIT = new THREE.MeshStandardMaterial({
  color: BW_WHITE,
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

// Tint amounts and edge threshold are now passed in as props (sliders in the
// UI — see useArenaMode). The BW modules below receive them and regenerate
// affected materials / geometries when they change.

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
  lit: boolean,
  pureWhite: boolean,
  tintAmount: number
): THREE.Material {
  const base = extractColor(original);
  // Lerp toward BW_WHITE. tintAmount comes from the UI slider and is already
  // scoped to the pure-white state by the caller.
  base.lerp(new THREE.Color(BW_WHITE), tintAmount);
  if (lit) {
    const m = new THREE.MeshStandardMaterial({
      color: base,
      roughness: 0.9,
      metalness: 0,
    });
    m.toneMapped = !pureWhite;
    return m;
  }
  const m = new THREE.MeshBasicMaterial({ color: base });
  m.toneMapped = !pureWhite;
  return m;
}

function chooseMaterial(
  variant: BWVariant,
  mesh: THREE.Mesh,
  originalMaterial: THREE.Material | THREE.Material[],
  pureWhite: boolean,
  tintAmount: number
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
  const mat = makeTintedMaterial(originalMaterial, lit, pureWhite, tintAmount);
  ud.__bwTintedMaterial = mat;
  return mat;
}

function patchMesh(
  mesh: THREE.Mesh,
  variant: BWVariant,
  pureWhite: boolean,
  tintAmount: number,
  edgeThreshold: number
): void {
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
  mesh.material = chooseMaterial(variant, mesh, orig, pureWhite, tintAmount);

  const lit = variant === "lit" || variant === "lit-tint";
  mesh.castShadow = lit;
  mesh.receiveShadow = lit;

  // Add the edge overlay once (independent of variant).
  const hasOverlay = mesh.children.some((c) => (c.userData as MeshUserData).__isBWEdgeOverlay);
  if (!hasOverlay) {
    const edgeGeom = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
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

function applyAll(
  scene: THREE.Scene,
  variant: BWVariant,
  pureWhite: boolean,
  tintAmount: number,
  edgeThreshold: number
): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) patchMesh(mesh, variant, pureWhite, tintAmount, edgeThreshold);
  });
}

/**
 * Rebuild the edge overlays with a new threshold angle. Used when the edges
 * slider moves. We keep the material overrides; only the EdgesGeometry is
 * replaced.
 */
function regenerateEdges(scene: THREE.Scene, edgeThreshold: number): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const ud = mesh.userData as MeshUserData;
    if (ud.__isBWEdgeOverlay || !ud.__bwPatchedWith) return;
    // Remove existing overlay, dispose, attach a fresh one.
    const toRemove: THREE.Object3D[] = [];
    mesh.children.forEach((c) => {
      if ((c.userData as MeshUserData).__isBWEdgeOverlay) toRemove.push(c);
    });
    toRemove.forEach((c) => {
      mesh.remove(c);
      const ls = c as THREE.LineSegments;
      if (ls.geometry) ls.geometry.dispose();
    });
    if (!mesh.geometry) return;
    const edgeGeom = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
    const overlay = new THREE.LineSegments(edgeGeom, BLACK_LINE_MATERIAL);
    overlay.name = "__bwEdgeOverlay__";
    (overlay.userData as MeshUserData).__isBWEdgeOverlay = true;
    overlay.position.y = 0.02;
    overlay.renderOrder = 2;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    mesh.add(overlay);
  });
}

/**
 * Update the shared singleton materials' toneMapped flag and any per-mesh
 * tinted clones currently in the scene. Called when the pure-white toggle
 * flips without changing the variant.
 */
function updateToneMapped(scene: THREE.Scene, pureWhite: boolean): void {
  const tm = !pureWhite;
  if (WHITE_UNLIT.toneMapped !== tm) {
    WHITE_UNLIT.toneMapped = tm;
    WHITE_UNLIT.needsUpdate = true;
  }
  if (WHITE_LIT.toneMapped !== tm) {
    WHITE_LIT.toneMapped = tm;
    WHITE_LIT.needsUpdate = true;
  }
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const ud = mesh.userData as MeshUserData;
    const tinted = ud.__bwTintedMaterial;
    if (tinted && "toneMapped" in tinted) {
      const t = tinted as THREE.Material & { toneMapped: boolean };
      if (t.toneMapped !== tm) {
        t.toneMapped = tm;
        t.needsUpdate = true;
      }
    }
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

export default function BWEffects({
  variant,
  pureWhite,
  tintNormal,
  tintPureWhite,
  edgeThreshold,
}: {
  variant: BWVariant | null;
  pureWhite: boolean;
  tintNormal: number;
  tintPureWhite: number;
  edgeThreshold: number;
}) {
  const { scene } = useThree();
  const currentRef = useRef<BWVariant | null>(null);
  const activeTint = pureWhite ? tintPureWhite : tintNormal;

  useEffect(() => {
    if (variant === null) {
      if (currentRef.current !== null) {
        unapplyAll(scene);
        currentRef.current = null;
      }
      return;
    }
    if (currentRef.current !== variant) {
      applyAll(scene, variant, pureWhite, activeTint, edgeThreshold);
      currentRef.current = variant;
    }
  }, [variant, scene, pureWhite, activeTint, edgeThreshold]);

  // When pureWhite flips *without* a variant change:
  //  - For the shared white variants (unlit / lit), just flip toneMapped on
  //    the singletons — cheap shader recompile, no material churn.
  //  - For tint variants, the tint amount itself depends on pureWhite (we
  //    keep perceived saturation constant across ACES on/off), so we need to
  //    rebuild the per-mesh tinted materials.
  useEffect(() => {
    const cur = currentRef.current;
    if (cur === null) return;
    updateToneMapped(scene, pureWhite);
    if (cur === "unlit-tint" || cur === "lit-tint") {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const ud = mesh.userData as MeshUserData;
        if (ud.__isBWEdgeOverlay) return;
        if (ud.__bwPatchedWith !== cur) return;
        ud.__bwPatchedWith = undefined;
        patchMesh(mesh, cur, pureWhite, activeTint, edgeThreshold);
      });
    }
  }, [pureWhite, scene, activeTint, edgeThreshold]);

  // When the active tint slider value moves (without a variant or pureWhite
  // change), rebuild just the tinted per-mesh materials.
  useEffect(() => {
    const cur = currentRef.current;
    if (cur !== "unlit-tint" && cur !== "lit-tint") return;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const ud = mesh.userData as MeshUserData;
      if (ud.__isBWEdgeOverlay) return;
      if (ud.__bwPatchedWith !== cur) return;
      ud.__bwPatchedWith = undefined;
      patchMesh(mesh, cur, pureWhite, activeTint, edgeThreshold);
    });
  }, [activeTint, scene, pureWhite, edgeThreshold]);

  // When edge threshold moves, rebuild just the overlay LineSegments geometries.
  useEffect(() => {
    if (currentRef.current === null) return;
    regenerateEdges(scene, edgeThreshold);
  }, [edgeThreshold, scene]);

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
      patchMesh(mesh, variant, pureWhite, activeTint, edgeThreshold);
    });
  });

  return null;
}
