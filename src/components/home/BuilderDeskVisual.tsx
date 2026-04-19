"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
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
 * Tiny standalone mini-scene for the landing's "Builders compete on the real
 * problem" card. Reuses the same AgentCharacter + procedural furniture the
 * arena tuner uses — no custom artwork. One agent, one standing desk, camera
 * locked. Game-loop state is hand-rolled (frame counter ticked each frame),
 * so it stays independent of the main arena polling / event pipeline.
 */

function Scene() {
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

  // Tick the agent's frame counter so any internal animations (head tilt,
  // hover, etc.) that read `agent.frame` stay alive.
  useFrame(() => {
    const a = agentRef.current[0];
    if (a) a.frame += 1;
  });

  // Camera lookAt: centre on the desk's world position.
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
  // Compact — the card looks busy if this gets too tall.
  const [wx, , wz] = toWorld(600, 550);
  return (
    <div
      style={{
        height: 180,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#FDFCFC",
        border: "1px solid var(--border)",
      }}
    >
      <Canvas
        orthographic
        camera={{
          position: [wx + 5, 7, wz + 6],
          zoom: 90,
          near: 0.1,
          far: 50,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#FDFCFC" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
