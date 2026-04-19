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
 *     - "unlit-tint"   : per-mesh `MeshBasicMaterial` lerped toward white.
 *     - "lit-tint"     : per-mesh `MeshStandardMaterial`, same lerp, lit.
 *  2. Attach a `LineSegments` child built from `EdgesGeometry` rendered in
 *     black — clean polygon outlines regardless of variant.
 *
 * Emissive accents (any mesh currently using `MeshBasicMaterial` with
 * `toneMapped === false`) are skipped — neon, TV glow, LEDs, and pendant
 * bulbs remain as the sole color pops.
 *
 * State machine: a single useEffect listens to all relevant props
 * (variant + pureWhite + tintNormal/tintPureWhite + edgeThreshold) and
 * unconditionally re-applies the BW pass on any change. Originals are saved
 * exactly once via `__bwOriginalMaterial`. The previous "cache + flag"
 * approach had subtle race conditions when multiple deps changed in the
 * same render — this one trades a bit of redundant traversal for being
 * provably correct.
 */

export type BWVariant = "unlit" | "lit" | "unlit-tint" | "lit-tint";

type MeshUserData = {
  __bwOriginalMaterial?: THREE.Material | THREE.Material[];
  __bwOriginalCastShadow?: boolean;
  __bwOriginalReceiveShadow?: boolean;
  __bwTintedMaterial?: THREE.Material;
  __isBWEdgeOverlay?: boolean;
};

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

function isEmissiveMarker(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.MeshBasicMaterial)) return false;
  return mat.toneMapped === false;
}

/**
 * True if the material is not a plain THREE.Material instance we can safely
 * replace/tint (e.g. troika-three-text shader material used by drei <Text>).
 * Replacing these breaks the renderer because the downstream scene expects
 * their custom uniforms / shader handles.
 */
function isUnswappable(mat: THREE.Material): boolean {
  if (!(mat instanceof THREE.Material)) return true;
  // Troika text marks its material with `isTroikaText` or similar fingerprints.
  const asRecord = mat as unknown as Record<string, unknown>;
  if (asRecord.isTroikaText === true) return true;
  if (typeof asRecord.isDerivedMaterial === "function" || asRecord.isDerivedMaterial === true) return true;
  // Shader-only types without a `color` property — safe to skip.
  if (mat.type === "ShaderMaterial" || mat.type === "RawShaderMaterial") return true;
  return false;
}

function shouldSkip(material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material)) {
    return material.every((m) => isEmissiveMarker(m) || isUnswappable(m));
  }
  return isEmissiveMarker(material) || isUnswappable(material);
}

function extractColor(material: THREE.Material | THREE.Material[]): THREE.Color {
  const first = Array.isArray(material) ? material[0] : material;
  const maybeColor = (first as { color?: THREE.Color }).color;
  if (maybeColor instanceof THREE.Color) return maybeColor.clone();
  return new THREE.Color("#FFFFFF");
}

function buildTintedMaterial(
  originalColor: THREE.Color,
  lit: boolean,
  pureWhite: boolean,
  tintAmount: number
): THREE.Material {
  const base = originalColor.clone();
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

/**
 * Apply the BW override to a single mesh. Idempotent — calling it again
 * with new params replaces the material with a fresh override built from
 * the saved true-original color.
 */
function applyBWToMesh(
  mesh: THREE.Mesh,
  variant: BWVariant,
  pureWhite: boolean,
  tintAmount: number,
  edgeThreshold: number
): void {
  const ud = mesh.userData as MeshUserData;
  if (ud.__isBWEdgeOverlay) return;
  if (!mesh.geometry) return;
  if (!mesh.material) return;

  // Save originals exactly once. After this, mesh.material may already be
  // a previous BW override — we don't care because we use the saved value.
  if (ud.__bwOriginalMaterial === undefined) {
    if (shouldSkip(mesh.material)) return; // emissive accents stay original
    ud.__bwOriginalMaterial = mesh.material;
    ud.__bwOriginalCastShadow = mesh.castShadow;
    ud.__bwOriginalReceiveShadow = mesh.receiveShadow;
  }

  // Pick / build the new material.
  let nextMaterial: THREE.Material;
  if (variant === "unlit") {
    nextMaterial = WHITE_UNLIT;
  } else if (variant === "lit") {
    nextMaterial = WHITE_LIT;
  } else {
    const lit = variant === "lit-tint";
    const origColor = extractColor(ud.__bwOriginalMaterial);
    nextMaterial = buildTintedMaterial(origColor, lit, pureWhite, tintAmount);
  }

  // Swap, then dispose the previous tinted clone (if any). Order matters —
  // mesh.material must hold the new reference before we dispose the old one.
  const oldTinted = ud.__bwTintedMaterial;
  mesh.material = nextMaterial;
  if (variant === "unlit-tint" || variant === "lit-tint") {
    ud.__bwTintedMaterial = nextMaterial;
  } else {
    ud.__bwTintedMaterial = undefined;
  }
  if (oldTinted && oldTinted !== nextMaterial) oldTinted.dispose();

  const lit = variant === "lit" || variant === "lit-tint";
  mesh.castShadow = lit;
  mesh.receiveShadow = lit;

  // Add (or replace) the edge overlay if its threshold is the right one.
  let overlay = mesh.children.find((c) => (c.userData as MeshUserData).__isBWEdgeOverlay) as
    | THREE.LineSegments
    | undefined;
  if (overlay) {
    const currentThreshold = (overlay.userData as { __edgeThreshold?: number })
      .__edgeThreshold;
    if (currentThreshold !== edgeThreshold) {
      // Threshold changed — rebuild geometry.
      mesh.remove(overlay);
      if (overlay.geometry) overlay.geometry.dispose();
      overlay = undefined;
    }
  }
  if (!overlay) {
    const edgeGeom = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
    overlay = new THREE.LineSegments(edgeGeom, BLACK_LINE_MATERIAL);
    overlay.name = "__bwEdgeOverlay__";
    overlay.userData = {
      __isBWEdgeOverlay: true,
      __edgeThreshold: edgeThreshold,
    };
    overlay.position.y = 0.02;
    overlay.renderOrder = 2;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    mesh.add(overlay);
  }
}

function unapplyBWFromMesh(mesh: THREE.Mesh): void {
  const ud = mesh.userData as MeshUserData;
  if (!ud.__bwOriginalMaterial) return;

  mesh.material = ud.__bwOriginalMaterial;
  ud.__bwOriginalMaterial = undefined;
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

  const overlays: THREE.Object3D[] = [];
  mesh.children.forEach((c) => {
    if ((c.userData as MeshUserData).__isBWEdgeOverlay) overlays.push(c);
  });
  overlays.forEach((c) => {
    mesh.remove(c);
    const ls = c as THREE.LineSegments;
    if (ls.geometry) ls.geometry.dispose();
  });
}

function applyAll(
  scene: THREE.Scene,
  variant: BWVariant,
  pureWhite: boolean,
  tintAmount: number,
  edgeThreshold: number
): void {
  // Update shared singletons' toneMapped first so they pick up pureWhite changes.
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
    if (mesh.isMesh) applyBWToMesh(mesh, variant, pureWhite, tintAmount, edgeThreshold);
  });
}

function unapplyAll(scene: THREE.Scene): void {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  meshes.forEach(unapplyBWFromMesh);
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
  const activeRef = useRef(false);
  const activeTint = pureWhite ? tintPureWhite : tintNormal;

  useEffect(() => {
    if (variant === null) {
      if (activeRef.current) {
        unapplyAll(scene);
        activeRef.current = false;
      }
      return;
    }
    applyAll(scene, variant, pureWhite, activeTint, edgeThreshold);
    activeRef.current = true;
  }, [variant, scene, pureWhite, activeTint, edgeThreshold]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        unapplyAll(scene);
        activeRef.current = false;
      }
    };
  }, [scene]);

  // Catch late-mounted meshes (lazy GLB sub-meshes, agent spawn) every frame.
  useFrame(() => {
    if (variant === null || !activeRef.current) return;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const ud = mesh.userData as MeshUserData;
      if (ud.__bwOriginalMaterial !== undefined) return; // already patched
      if (ud.__isBWEdgeOverlay) return;
      applyBWToMesh(mesh, variant, pureWhite, activeTint, edgeThreshold);
    });
  });

  return null;
}
