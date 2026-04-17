"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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

function ArenaScene({
  officeAgents,
}: {
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(officeAgents, furniture);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={0.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Static isometric-ish camera — no orbit controls to avoid drei dep */}

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
  // Track agent IDs so React knows when to add/remove agent components.
  // Position/animation updates happen inside each AgentCharacter via useFrame reading the ref.
  const [agentIds, setAgentIds] = useState<string[]>([]);

  useFrame(() => {
    const currentIds = renderAgentsRef.current.map((a) => a.id);
    if (
      currentIds.length !== agentIds.length ||
      currentIds.some((id, i) => id !== agentIds[i])
    ) {
      setAgentIds([...currentIds]);
    }
  });

  return (
    <>
      {agentIds.map((id) => (
        <AgentCharacter key={id} agentId={id} agentsRef={renderAgentsRef} />
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
          shadows
          camera={{
            position: [0, 18, 16],
            fov: 45,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: true, alpha: false }}
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
