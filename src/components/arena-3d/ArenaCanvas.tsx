"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useStrawAgents } from "./useStrawAgents";
import { useArenaGameLoop } from "./useArenaGameLoop";
import { DEFAULT_ARENA_FURNITURE } from "./core/defaultLayout";
import OfficeEnvironment from "./scene/OfficeEnvironment";
import AgentCharacter from "./objects/AgentCharacter";
import ScoreOverlay from "./ScoreOverlay";
import { CANVAS_W, CANVAS_H, SCALE } from "./core/constants";

function GameLoop({ tick }: { tick: () => void }) {
  useFrame(() => tick());
  return null;
}

function CameraRig({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, target]);
  return null;
}

function ArenaScene({
  officeAgents,
}: {
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(officeAgents, furniture);

  return (
    <>
      {/* Lighting — warm ambient + soft directional to match Claw3D's cozy feel */}
      <hemisphereLight args={["#fff3e0", "#3a2e1f", 0.35]} />
      <ambientLight intensity={0.45} color="#fde8c8" />
      <directionalLight
        position={[12, 18, 10]}
        intensity={0.85}
        color="#fff1d5"
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
      <directionalLight position={[-8, 12, -6]} intensity={0.25} color="#d4c4a8" />

      {/* Look at center of the office */}
      <CameraRig target={[0, 0, 1]} />

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
  renderAgentsRef: React.RefObject<ReturnType<typeof useArenaGameLoop>["renderAgentsRef"]["current"]>;
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

  const handleSelectAgent = useCallback((id: string | null) => {
    setSelectedAgentId(id);
  }, []);

  return (
    <div className="flex w-full" style={{ height: 600 }}>
      <div className="flex-1 relative bg-[#2a2a3e] rounded-l-lg overflow-hidden">
        <Canvas
          orthographic
          shadows
          dpr={[0.85, 1.5]}
          camera={{
            position: [16, 13, 22],
            zoom: 40,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ background: "#2a2a3e" }}
        >
          <Suspense fallback={<ArenaFallback />}>
            <ArenaScene officeAgents={officeAgents} />
          </Suspense>
        </Canvas>

        {/* Agent count badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-mono">
          {officeAgents.length} agent{officeAgents.length !== 1 ? "s" : ""} in arena
        </div>
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
