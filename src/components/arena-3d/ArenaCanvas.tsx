"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useStrawAgents } from "./useStrawAgents";
import { useArenaGameLoop } from "./useArenaGameLoop";
import { DEFAULT_ARENA_FURNITURE } from "./core/defaultLayout";
import OfficeEnvironment from "./scene/OfficeEnvironment";
import AgentCharacter from "./objects/AgentCharacter";
import ScoreOverlay from "./ScoreOverlay";

type ViewMode = "iso" | "top";

const CAMERA_PRESETS: Record<
  ViewMode,
  { position: [number, number, number]; zoom: number; target: [number, number, number] }
> = {
  iso: { position: [14, 16, 19], zoom: 30, target: [0, 0, 1] },
  top: { position: [0, 30, 0.001], zoom: 25, target: [0, 0, 0] },
};

function GameLoop({ tick }: { tick: () => void }) {
  useFrame(() => tick());
  return null;
}

function CameraRig({
  position,
  target,
  zoom,
}: {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    // Orthographic camera has a .zoom property
    type OrthoCam = typeof camera & { zoom: number };
    (camera as OrthoCam).zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, position, target, zoom]);
  return null;
}

function ArenaScene({
  officeAgents,
  viewMode,
}: {
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
  viewMode: ViewMode;
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(officeAgents, furniture);
  const preset = CAMERA_PRESETS[viewMode];

  return (
    <>
      {/* Lighting — neutral & bright for a fresh/clean feel */}
      <hemisphereLight args={["#ffffff", "#2a2a2a", 0.4]} />
      <ambientLight intensity={0.55} color="#ffffff" />
      <directionalLight
        position={[12, 18, 10]}
        intensity={0.9}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-8, 12, -6]} intensity={0.3} color="#e8ecf0" />

      <CameraRig position={preset.position} target={preset.target} zoom={preset.zoom} />

      {/* Office */}
      <OfficeEnvironment furniture={furniture} />

      {/* Agents */}
      <AgentRenderer renderAgentsRef={renderAgentsRef} />

      {/* Game loop */}
      <GameLoop tick={tick} />
    </>
  );
}

function AgentRenderer({
  renderAgentsRef,
}: {
  renderAgentsRef: React.RefObject<
    ReturnType<typeof useArenaGameLoop>["renderAgentsRef"]["current"]
  >;
}) {
  // Track agent ID+name pairs so React knows when to add/remove agent components.
  // Position/animation updates happen inside each AgentCharacter via useFrame reading the ref.
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  useFrame(() => {
    const current = renderAgentsRef.current.map((a) => ({ id: a.id, name: a.name }));
    if (
      current.length !== agents.length ||
      current.some((a, i) => a.id !== agents[i]?.id || a.name !== agents[i]?.name)
    ) {
      setAgents(current);
    }
  });

  return (
    <>
      {agents.map((agent) => (
        <AgentCharacter
          key={agent.id}
          agentId={agent.id}
          agentName={agent.name}
          agentsRef={renderAgentsRef}
        />
      ))}
    </>
  );
}

function ArenaFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e5e7eb" />
    </mesh>
  );
}

export default function ArenaCanvas() {
  const { agents, officeAgents, loading } = useStrawAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("iso");

  const handleSelectAgent = useCallback((id: string | null) => {
    setSelectedAgentId(id);
  }, []);

  const initialPreset = CAMERA_PRESETS.iso;

  return (
    <div className="flex w-full" style={{ height: 600 }}>
      <div className="flex-1 relative bg-[#000000] rounded-l-lg overflow-hidden">
        <Canvas
          orthographic
          shadows
          dpr={[0.85, 1.5]}
          camera={{
            position: initialPreset.position,
            zoom: initialPreset.zoom,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "#000000" }}
        >
          <Suspense fallback={<ArenaFallback />}>
            <ArenaScene officeAgents={officeAgents} viewMode={viewMode} />
          </Suspense>
        </Canvas>

        {/* Agent count badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-mono">
          {officeAgents.length} agent{officeAgents.length !== 1 ? "s" : ""} in arena
        </div>

        {/* View toggle (dev tool) */}
        <button
          onClick={() => setViewMode(viewMode === "iso" ? "top" : "iso")}
          className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-mono hover:bg-black/80 transition-colors flex items-center gap-1.5"
          title={viewMode === "iso" ? "Switch to top-down view" : "Switch to isometric view"}
        >
          <span className="opacity-60">view:</span>
          <span>{viewMode === "iso" ? "iso" : "top"}</span>
        </button>
      </div>

      <ScoreOverlay
        agents={agents}
        loading={loading}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />
    </div>
  );
}
