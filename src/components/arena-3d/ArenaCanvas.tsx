"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useStrawAgents } from "./useStrawAgents";
import { useArenaGameLoop } from "./useArenaGameLoop";
import { DEFAULT_ARENA_FURNITURE } from "./core/defaultLayout";
import OfficeEnvironment from "./scene/OfficeEnvironment";
import AgentCharacter from "./objects/AgentCharacter";
import ScoreOverlay from "./ScoreOverlay";
import BWEffects, { type BWVariant } from "./BWEffects";
import { useArenaMode, type ArenaMode } from "./useArenaMode";

type ViewMode = "iso" | "top" | "corner" | "side";

const CAMERA_PRESETS: Record<
  ViewMode,
  { position: [number, number, number]; zoom: number; target: [number, number, number] }
> = {
  iso: { position: [14, 16, 19], zoom: 30, target: [0, 0, 1] },
  top: { position: [0, 30, 0.001], zoom: 25, target: [0, 0, 0] },
  // Flipped-iso: look from the opposite diagonal. Reveals faces the default
  // iso camera hides (e.g. south faces of desks, back of server racks).
  corner: { position: [-16, 16, -19], zoom: 30, target: [0, 0, -1] },
  // Shallow cross-section: nearly eye-level, looking along the east→west axis.
  // Good for reading relative heights — standing desks vs seated desks,
  // phone booths, gym rig silhouettes.
  side: { position: [26, 8, 2], zoom: 26, target: [0, 1.5, 0] },
};

const VIEW_CYCLE: ViewMode[] = ["iso", "top", "corner", "side"];

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
  bwVariant,
  bwShadows,
  shadowLightness,
  pureWhite,
}: {
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
  viewMode: ViewMode;
  bwVariant: BWVariant | null;
  bwShadows: boolean;
  shadowLightness: number;
  pureWhite: boolean;
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(officeAgents, furniture);
  const preset = CAMERA_PRESETS[viewMode];

  return (
    <>
      {bwShadows ? (
        <>
          {/* Midday sunny. `shadowLightness` (0-100) controls how bright
              shadowed faces are: 0 = dark shadows (high directional, low
              fill), 100 = near-invisible shadows (high fill, low directional).
              Single sun source, ground color kept light so vertical walls
              don't darken. */}
          {(() => {
            const t = shadowLightness / 100;
            // Fill rises with t; directional falls. At t=0.6 (default),
            // ambient≈0.55, hemi≈0.55, directional≈0.9.
            const fill = 0.3 + t * 0.5;
            const directional = 1.2 - t * 0.5;
            return (
              <>
                <hemisphereLight args={["#FFFFFF", "#EEEEEE", fill]} />
                <ambientLight intensity={fill} color="#FFFFFF" />
                <directionalLight
                  position={[8, 26, 6]}
                  intensity={directional}
                  color="#FFFFFF"
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
              </>
            );
          })()}
        </>
      ) : (
        <>
          {/* Lighting — cool LED daylight globally, warm pools come from local
              lamp / pendant pointLights defined inside ProceduralFurniture. */}
          <hemisphereLight args={["#EAF0F5", "#2A2E35", 0.75]} />
          <ambientLight intensity={0.6} color="#E8EEF2" />
          <directionalLight
            position={[12, 18, 10]}
            intensity={1.0}
            color="#FFF8EC"
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
          <directionalLight position={[-8, 12, -6]} intensity={0.3} color="#C8D4E0" />
        </>
      )}

      <CameraRig position={preset.position} target={preset.target} zoom={preset.zoom} />

      {/* Office */}
      <OfficeEnvironment furniture={furniture} />

      {/* Agents */}
      <AgentRenderer renderAgentsRef={renderAgentsRef} />

      {/* Game loop */}
      <GameLoop tick={tick} />

      {/* B&W material + edge overlay — null variant = color mode. */}
      <BWEffects variant={bwVariant} pureWhite={pureWhite} />
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
  // Track agent identity (id, name, rank) so React knows when to add/remove agent
  // components. Position/animation updates happen inside each AgentCharacter via
  // useFrame reading the ref.
  const [agents, setAgents] = useState<
    { id: string; name: string | null; rank: number | null }[]
  >([]);

  useFrame(() => {
    const current = renderAgentsRef.current.map((a) => ({
      id: a.id,
      name: a.name,
      rank: a.rank,
    }));
    if (
      current.length !== agents.length ||
      current.some(
        (a, i) =>
          a.id !== agents[i]?.id ||
          a.name !== agents[i]?.name ||
          a.rank !== agents[i]?.rank
      )
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
          rank={agent.rank}
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

const MODES: { id: ArenaMode; label: string }[] = [
  { id: "color", label: "color" },
  { id: "bw", label: "b&w" },
  { id: "bw-shadows", label: "b&w + shadows" },
  { id: "bw-tint", label: "b&w + tint" },
  { id: "bw-shadows-tint", label: "b&w + shadows + tint" },
];

function modeToVariant(mode: ArenaMode): BWVariant | null {
  switch (mode) {
    case "color":
      return null;
    case "bw":
      return "unlit";
    case "bw-shadows":
      return "lit";
    case "bw-tint":
      return "unlit-tint";
    case "bw-shadows-tint":
      return "lit-tint";
  }
}

interface ArenaCanvasProps {
  /** Filter agents to a specific task. Omit for the global top-20 arena. */
  taskId?: string;
  /** Height of the canvas in pixels. Defaults to 600 (full leaderboard page). */
  height?: number;
  /**
   * Show the right-side score sidebar. Defaults to true. Turn off when the
   * arena is rendered next to an existing leaderboard table (task page) so
   * the two don't duplicate rankings.
   */
  showSidebar?: boolean;
}

export default function ArenaCanvas({
  taskId,
  height = 600,
  showSidebar = true,
}: ArenaCanvasProps = {}) {
  const { agents, officeAgents, loading } = useStrawAgents(taskId);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("iso");
  const {
    mode,
    setMode,
    shadowLightness,
    setShadowLightness,
    pureWhite,
    setPureWhite,
  } = useArenaMode();
  const bwVariant = modeToVariant(mode);
  const bw = bwVariant !== null;
  const bwShadows = bwVariant === "lit" || bwVariant === "lit-tint";

  const handleSelectAgent = useCallback((id: string | null) => {
    setSelectedAgentId(id);
  }, []);

  const initialPreset = CAMERA_PRESETS.iso;
  // Match the site's page background (#FDFCFC) so the arena blends into the
  // task-detail page in B&W mode instead of reading as a pure-white rect.
  const bgColor = bw ? "#FDFCFC" : "#1A1D21";
  const shadowsOn = mode === "color" || bwShadows;

  return (
    <div className="flex w-full" style={{ height }}>
      <div
        className={`flex-1 relative overflow-hidden ${showSidebar ? "rounded-l-lg" : "rounded-lg"}`}
        style={{ background: bgColor }}
      >
        <Canvas
          orthographic
          shadows={shadowsOn}
          dpr={[0.85, 1.5]}
          camera={{
            position: initialPreset.position,
            zoom: initialPreset.zoom,
            near: 0.1,
            far: 100,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ background: bgColor }}
        >
          <Suspense fallback={<ArenaFallback />}>
            <ArenaScene
              officeAgents={officeAgents}
              viewMode={viewMode}
              bwVariant={bwVariant}
              bwShadows={bwShadows}
              shadowLightness={shadowLightness}
              pureWhite={pureWhite}
            />
          </Suspense>
        </Canvas>

        {/* Agent count badge */}
        <div
          className={`absolute top-3 left-3 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full font-mono ${
            bw ? "bg-white/90 text-black border border-black" : "bg-black/60 text-white"
          }`}
        >
          {officeAgents.length} agent{officeAgents.length !== 1 ? "s" : ""} in arena
        </div>

        {/* Top-right controls: view toggle, and pure-white toggle when BW is on */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {bw && (
            <button
              onClick={() => setPureWhite(!pureWhite)}
              className={`backdrop-blur-sm text-xs px-3 py-1.5 rounded-full font-mono transition-colors flex items-center gap-1.5 ${
                pureWhite
                  ? "bg-black text-white border border-black hover:bg-gray-900"
                  : "bg-white/90 text-black border border-black hover:bg-white"
              }`}
              title={
                pureWhite
                  ? "Turn off pure white (re-enable ACES tone mapping)"
                  : "Force true #FFFFFF (bypass ACES tone mapping)"
              }
            >
              <span className="opacity-60">pure white:</span>
              <span>{pureWhite ? "on" : "off"}</span>
            </button>
          )}
          <button
            onClick={() => {
              const i = VIEW_CYCLE.indexOf(viewMode);
              setViewMode(VIEW_CYCLE[(i + 1) % VIEW_CYCLE.length]);
            }}
            className={`backdrop-blur-sm text-xs px-3 py-1.5 rounded-full font-mono transition-colors flex items-center gap-1.5 ${
              bw
                ? "bg-white/90 text-black border border-black hover:bg-white"
                : "bg-black/60 text-white hover:bg-black/80"
            }`}
            title="Cycle camera: iso → top → corner → side"
          >
            <span className="opacity-60">view:</span>
            <span>{viewMode}</span>
          </button>
        </div>

        {/* Shadow-lightness slider — visible only when a shadow variant is on */}
        {bwShadows && (
          <div
            className={`absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-full font-mono text-xs backdrop-blur-sm ${
              bw ? "bg-white/90 text-black border border-black" : "bg-black/60 text-white"
            }`}
          >
            <span className="opacity-60">shadow lightness</span>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={shadowLightness}
              onChange={(e) => setShadowLightness(parseFloat(e.target.value))}
              className="w-[220px] accent-black"
              aria-label="Shadow lightness"
            />
            <span className="w-9 text-right tabular-nums">{Math.round(shadowLightness)}</span>
          </div>
        )}

        {/* Bottom row: mode radio buttons */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 flex-wrap justify-center max-w-[95%]">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`backdrop-blur-sm text-xs px-3 py-1.5 rounded-full font-mono transition-colors ${
                  active
                    ? bw
                      ? "bg-black text-white border border-black"
                      : "bg-white text-black border border-white"
                    : bw
                      ? "bg-white/80 text-black border border-black/40 hover:bg-white"
                      : "bg-black/60 text-white hover:bg-black/80"
                }`}
                title={`Switch to ${m.label}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {showSidebar && (
        <ScoreOverlay
          agents={agents}
          loading={loading}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
        />
      )}
    </div>
  );
}
