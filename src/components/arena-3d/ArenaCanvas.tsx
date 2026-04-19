"use client";

import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useStrawAgents } from "./useStrawAgents";
import { useArenaGameLoop } from "./useArenaGameLoop";
import { DEFAULT_ARENA_FURNITURE } from "./core/defaultLayout";
import OfficeEnvironment from "./scene/OfficeEnvironment";
import ArenaDoor from "./objects/ArenaDoor";
import PingPongBalls from "./objects/PingPongBalls";
import AgentCharacter from "./objects/AgentCharacter";
import ScoreOverlay from "./ScoreOverlay";
import BWEffects, { type BWVariant } from "./BWEffects";
import DebugPathOverlay from "./DebugPathOverlay";
import DevEventPanel, { type DevAction } from "./DevEventPanel";
import { useArenaMode, type ArenaMode } from "./useArenaMode";

type ViewMode = "iso" | "top" | "corner" | "side" | "front";

const CAMERA_PRESETS: Record<
  ViewMode,
  { position: [number, number, number]; zoom: number; target: [number, number, number] }
> = {
  iso: { position: [14, 16, 19], zoom: 22, target: [0, 0, 0] },
  top: { position: [0, 30, 0.001], zoom: 20, target: [0, 0, 0] },
  // Flipped-iso: look from the opposite diagonal. Reveals faces the default
  // iso camera hides (e.g. south faces of desks, back of server racks).
  corner: { position: [-16, 16, -19], zoom: 21, target: [0, 0, 0] },
  // Half-iso / half-top from the east: pushed further right and elevated so
  // the camera sits higher and further off-axis. Reads as an aerial side
  // view — clearly shows zone layout while keeping recognizable depth.
  side: { position: [30, 20, 2], zoom: 26, target: [0, 0, 0] },
  // Axis-aligned front view: camera on +Z axis looking north toward origin.
  // Room renders as a rectangle (not a diamond) and the south-side zones
  // (ping pong, gym, lounge) sit in the foreground.
  front: { position: [0, 14, 26], zoom: 22, target: [0, 0, 0] },
};

const VIEW_CYCLE: ViewMode[] = ["iso", "top", "corner", "side", "front"];

function GameLoop({ tick }: { tick: (dtScale: number) => void }) {
  useFrame((_, delta) => {
    // dtScale = how many 60fps "frames" this actual frame represents. Clamped
    // so a long stutter doesn't teleport agents across the arena.
    const dtScale = Math.min(delta * 60, 6);
    tick(dtScale);
  });
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
  eventBufferRef,
  devActionQueueRef,
  viewMode,
  bwVariant,
  bwShadows,
  shadowLightness,
  pureWhite,
  tintNormal,
  tintPureWhite,
  edgeThreshold,
  debugPaths,
}: {
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
  eventBufferRef: ReturnType<typeof useStrawAgents>["eventBufferRef"];
  devActionQueueRef: React.RefObject<DevAction[]>;
  viewMode: ViewMode;
  bwVariant: BWVariant | null;
  bwShadows: boolean;
  shadowLightness: number;
  pureWhite: boolean;
  tintNormal: number;
  tintPureWhite: number;
  edgeThreshold: number;
  debugPaths: boolean;
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(
    officeAgents,
    furniture,
    eventBufferRef,
    devActionQueueRef
  );
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

      {/* East-perimeter door (join/leave top-20 visual) + animated
          ping-pong balls for any agents currently paired up. Ported
          from /arena-tuner so the live arena gets the same visuals. */}
      <ArenaDoor agentsRef={renderAgentsRef} />
      <PingPongBalls agentsRef={renderAgentsRef} />

      {/* Agents */}
      <AgentRenderer renderAgentsRef={renderAgentsRef} />

      {/* Game loop */}
      <GameLoop tick={tick} />

      {/* Dev — visible A* path lines. Green = multi-waypoint A*, red = straight-line. */}
      <DebugPathOverlay agentsRef={renderAgentsRef} visible={debugPaths} />

      {/* B&W material + edge overlay — null variant = color mode. */}
      <BWEffects
        variant={bwVariant}
        pureWhite={pureWhite}
        tintNormal={tintNormal}
        tintPureWhite={tintPureWhite}
        edgeThreshold={edgeThreshold}
      />
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
  const [agents, setAgents] = useState<{ id: string; name: string | null; rank: number | null }[]>(
    []
  );

  useFrame(() => {
    const current = renderAgentsRef.current.map((a) => ({
      id: a.id,
      name: a.name,
      rank: a.rank,
    }));
    if (
      current.length !== agents.length ||
      current.some(
        (a, i) => a.id !== agents[i]?.id || a.name !== agents[i]?.name || a.rank !== agents[i]?.rank
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

function modeToVariant(mode: ArenaMode): BWVariant | null {
  switch (mode) {
    case "bw-tint":
      return "unlit-tint";
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

/**
 * Default export — the live arena driven by the real `/api/public/arena`
 * poll. Thin wrapper that resolves agent data via `useStrawAgents` and hands
 * off to `ArenaCanvasInner`. The landing-page playground uses
 * `ArenaCanvasInner` directly with `useMockArenaAgents`, so the renderer
 * is source-agnostic.
 */
export default function ArenaCanvas({
  taskId,
  height = 600,
  showSidebar = true,
}: ArenaCanvasProps = {}) {
  const { agents, officeAgents, loading, eventBufferRef } = useStrawAgents(taskId);
  return (
    <ArenaCanvasInner
      agents={agents}
      officeAgents={officeAgents}
      loading={loading}
      eventBufferRef={eventBufferRef}
      height={height}
      showSidebar={showSidebar}
    />
  );
}

interface ArenaCanvasInnerProps {
  agents: ReturnType<typeof useStrawAgents>["agents"];
  officeAgents: ReturnType<typeof useStrawAgents>["officeAgents"];
  loading: boolean;
  eventBufferRef: ReturnType<typeof useStrawAgents>["eventBufferRef"];
  height?: number;
  showSidebar?: boolean;
}

/**
 * Pure renderer — takes already-resolved agent data plus presentation props
 * and renders the scene + controls. No data fetching. Split out of
 * `ArenaCanvas` so the landing-page mock and the real arena can share all
 * rendering logic while choosing their own data source.
 */
export function ArenaCanvasInner({
  agents,
  officeAgents,
  loading,
  eventBufferRef,
  height = 600,
  showSidebar = true,
}: ArenaCanvasInnerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("iso");
  const [debugPaths, setDebugPaths] = useState(false);
  const devActionQueueRef = useRef<DevAction[]>([]);
  const {
    mode,
    shadowLightness,
    setShadowLightness,
    pureWhite,
    setPureWhite,
    tintNormal,
    tintPureWhite,
    edgeThreshold,
  } = useArenaMode();
  const bwVariant = modeToVariant(mode);
  const bw = bwVariant !== null;
  const bwShadows = bwVariant === "lit" || bwVariant === "lit-tint";

  const handleSelectAgent = useCallback((id: string | null) => {
    setSelectedAgentId(id);
  }, []);

  const initialPreset = CAMERA_PRESETS.iso;
  // Match the site's page background (#FDFCFC) in B&W modes; color mode
  // keeps its own canvas backing tied to the 3D outside-ground color.
  const bgColor = bw ? "#FDFCFC" : "#FFFFFF";
  const shadowsOn = bwShadows;

  return (
    <div className="flex w-full" style={{ height }}>
      <div
        className={`flex-1 relative overflow-hidden ${showSidebar ? "rounded-l-lg" : "rounded-lg"}`}
        style={{ background: bgColor }}
      >
        <Canvas
          orthographic
          shadows={shadowsOn}
          dpr={[2.5, 3]}
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
              eventBufferRef={eventBufferRef}
              devActionQueueRef={devActionQueueRef}
              viewMode={viewMode}
              bwVariant={bwVariant}
              bwShadows={bwShadows}
              shadowLightness={shadowLightness}
              pureWhite={pureWhite}
              tintNormal={tintNormal}
              tintPureWhite={tintPureWhite}
              edgeThreshold={edgeThreshold}
              debugPaths={debugPaths}
            />
          </Suspense>
        </Canvas>

        {/* Agent count badge */}
        <div
          className={`absolute top-3 left-3 z-10 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full font-mono ${
            bw ? "bg-white/90 text-black border border-black" : "bg-black/60 text-white"
          }`}
        >
          {officeAgents.length} agent{officeAgents.length !== 1 ? "s" : ""} in arena
        </div>

        {/* Top-left below the agent count badge: dev event trigger panel.
            Kept away from the bottom-center mode row and bottom-center shadow
            slider that overlap when BW mode is on, so it never gets blocked. */}
        <div className="absolute top-14 left-3 z-10">
          <DevEventPanel queueRef={devActionQueueRef} agentIds={officeAgents.map((a) => a.id)} />
        </div>

        {/* Top-right controls: view toggle, and pure-white toggle when BW is on */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            onClick={() => setDebugPaths(!debugPaths)}
            className={`backdrop-blur-sm text-xs px-3 py-1.5 rounded-full font-mono transition-colors flex items-center gap-1.5 ${
              debugPaths
                ? "bg-green-500 text-white"
                : bw
                  ? "bg-white/90 text-black border border-black hover:bg-white"
                  : "bg-black/60 text-white hover:bg-black/80"
            }`}
            title="Show agent A* paths (green = routed, red = straight)"
          >
            <span className="opacity-60">paths:</span>
            <span>{debugPaths ? "on" : "off"}</span>
          </button>
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

        {/* Dynamic sliders — stacked bottom-center, above the mode row. The
            mode row wraps onto 2 lines on narrow viewports (because the
            "b&w + shadows + tint" label is wide), so the slider stack sits at
            bottom-24 to clear it. Each slider is visible only when it
            affects the current mode. */}
        {bw && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[95%]">
            {bwShadows && (
              <SliderPill
                label="shadow lightness"
                value={shadowLightness}
                min={0}
                max={200}
                step={1}
                onChange={setShadowLightness}
                display={Math.round(shadowLightness).toString()}
                bw={bw}
              />
            )}
          </div>
        )}

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

function SliderPill({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  bw,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: string;
  bw: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-1.5 rounded-full font-mono text-xs backdrop-blur-sm ${
        bw ? "bg-white/90 text-black border border-black" : "bg-black/60 text-white"
      }`}
    >
      <span className="opacity-60 whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-[180px] accent-black"
        aria-label={label}
      />
      <span className="w-12 text-right tabular-nums">{display}</span>
    </div>
  );
}
