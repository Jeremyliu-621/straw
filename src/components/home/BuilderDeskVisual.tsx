"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, View } from "@react-three/drei";
import * as THREE from "three";
import AgentCharacter from "@/components/arena-3d/objects/AgentCharacter";
import FurnitureModel, { FURNITURE_GLB } from "@/components/arena-3d/objects/FurnitureModel";
import ProceduralFurniture, {
  PROCEDURAL_TYPES,
} from "@/components/arena-3d/objects/ProceduralFurniture";
import BWEffects from "@/components/arena-3d/BWEffects";
import { makeDeskStation } from "@/components/arena-3d/core/stations";
import { toWorld } from "@/components/arena-3d/core/geometry";
import type { RenderAgentState } from "@/components/arena-3d/useArenaGameLoop";

/**
 * Builder-at-desk mini scene for the landing's Builders card. Uses drei
 * <View> to render through the page-level shared Canvas (LandingR3FHost),
 * avoiding a second WebGL context.
 */

/**
 * Post-render override: find AgentCharacter's arm groups by their hardcoded
 * local positions and pump rotations every frame so the seated agent reads
 * as "typing hard". Mounts AFTER AgentCharacter so its useFrame runs later
 * in the same render pass and overwrites the idle pose.
 */
function ArmFlail() {
  const { scene } = useThree();
  const leftArm = useRef<THREE.Object3D | null>(null);
  const rightArm = useRef<THREE.Object3D | null>(null);

  useFrame((state) => {
    if (!leftArm.current || !rightArm.current) {
      scene.traverse((obj) => {
        if (obj.type !== "Group") return;
        if (Math.abs(obj.position.y - 68) > 0.1) return;
        if (Math.abs(obj.position.x + 14) < 0.1) leftArm.current = obj;
        else if (Math.abs(obj.position.x - 14) < 0.1) rightArm.current = obj;
      });
    }
    const t = state.clock.elapsedTime;
    if (leftArm.current) {
      leftArm.current.rotation.x = -0.4 + Math.sin(t * 7.6) * 0.55;
      leftArm.current.rotation.z = 0.25 + Math.sin(t * 4.1) * 0.2;
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = -0.4 + Math.cos(t * 6.9) * 0.55;
      rightArm.current.rotation.z = -0.25 - Math.cos(t * 4.3) * 0.2;
    }
  });

  return null;
}

function SceneContent() {
  const station = useMemo(
    () =>
      makeDeskStation({
        id: "builder_demo_desk",
        x: 600,
        y: 550,
        type: "desk_cubicle",
      }),
    []
  );

  const agentRef = useRef<RenderAgentState[]>([
    {
      id: "builder",
      name: null,
      rank: null,
      status: "working",
      color: "#cfd5e8",
      x: station.standPoint.x,
      y: station.standPoint.y,
      targetX: station.standPoint.x,
      targetY: station.standPoint.y,
      path: [],
      facing: station.standPoint.facing,
      frame: 0,
      walkSpeed: 0,
      phaseOffset: 0,
      state: "sitting",
      socialSpotType: "chair",
    },
  ]);

  // Tick the frame counter so any animations that read agent.frame stay alive.
  useFrame(() => {
    const a = agentRef.current[0];
    if (a) a.frame += 1;
  });

  const { camera } = useThree();
  useEffect(() => {
    const [wx, , wz] = toWorld(station.standPoint.x, station.standPoint.y);
    camera.lookAt(wx, 0, wz);
    camera.updateProjectionMatrix();
  }, [camera, station.standPoint.x, station.standPoint.y]);

  return (
    <>
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight position={[10, 15, 8]} intensity={0.9} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#e6e6e6", 0.4]} />

      {station.items.map((item) => {
        if (PROCEDURAL_TYPES.has(item.type)) {
          return <ProceduralFurniture key={item._uid} item={item} />;
        }
        if (FURNITURE_GLB[item.type]) {
          return <FurnitureModel key={item._uid} item={item} />;
        }
        return null;
      })}

      <AgentCharacter
        agentId="builder"
        agentName={null}
        rank={null}
        agentsRef={agentRef}
      />

      {/* MUST mount after AgentCharacter — same frame, later useFrame. */}
      <ArmFlail />

      {/* Match the rest of the landing: b&w materials + mild tint + pure white. */}
      <BWEffects
        variant="unlit-tint"
        pureWhite
        tintNormal={0.5}
        tintPureWhite={0.6}
        edgeThreshold={40}
      />
    </>
  );
}

export default function BuilderDeskVisual() {
  const [wx, , wz] = toWorld(600, 550);
  return (
    <View
      style={{
        height: 180,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#FDFCFC",
        border: "1px solid var(--border)",
      }}
    >
      <OrthographicCamera
        makeDefault
        position={[wx + 5, 7, wz + 6]}
        zoom={90}
        near={0.1}
        far={50}
      />
      <SceneContent />
    </View>
  );
}
