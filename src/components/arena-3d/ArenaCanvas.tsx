"use client";

import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useStrawAgents } from "./useStrawAgents";
import { useArenaGameLoop, type RenderAgentState } from "./useArenaGameLoop";
import { DEFAULT_ARENA_FURNITURE } from "./core/defaultLayout";
import { FollowCamController, type CamMode } from "./FollowCamController";
import { toWorld } from "./core/geometry";
import * as THREE from "three";
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
  selectedAgentId,
  onSelectAgent,
  onRenderAgentsRef,
  camMode,
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
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onRenderAgentsRef: (ref: React.RefObject<RenderAgentState[]>) => void;
  camMode: CamMode;
}) {
  const furniture = useMemo(() => DEFAULT_ARENA_FURNITURE, []);
  const { renderAgentsRef, tick } = useArenaGameLoop(
    officeAgents,
    furniture,
    eventBufferRef,
    devActionQueueRef
  );
  const preset = CAMERA_PRESETS[viewMode];

  // Hoist the agents ref so the outer component can read live positions
  // for projecting the stats panel into screen space.
  useEffect(() => {
    onRenderAgentsRef(renderAgentsRef);
  }, [onRenderAgentsRef, renderAgentsRef]);

  // Resolve the selected agent's index in the ref (if any) so follow cam
  // can target them. -1 (unused) when nothing is selected.
  const camAgentIdx = selectedAgentId
    ? renderAgentsRef.current.findIndex((a) => a.id === selectedAgentId)
    : -1;

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
      <AgentRenderer
        renderAgentsRef={renderAgentsRef}
        onSelectAgent={onSelectAgent}
        selectedAgentId={selectedAgentId}
      />

      {/* Follow cam — swaps in a perspective orbit camera parked around
          the selected agent. Inert when camMode is "off" or camAgentIdx is -1. */}
      <FollowCamController
        mode={camAgentIdx >= 0 ? camMode : "off"}
        agentIdx={camAgentIdx >= 0 ? camAgentIdx : 0}
        agentRef={renderAgentsRef}
      />

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

/**
 * Tiny bridge that runs inside the Canvas: grabs the active camera + the
 * canvas DOM element from useThree and hands them to outer refs. The outer
 * stats panel uses these to project the selected agent's world coords into
 * screen pixels each frame.
 */
function CanvasCameraBridge({
  cameraRef,
  canvasDomRef,
}: {
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  canvasDomRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { camera, gl } = useThree();
  useEffect(() => {
    cameraRef.current = camera;
    canvasDomRef.current = gl.domElement;
  }, [camera, gl, cameraRef, canvasDomRef]);
  useFrame(() => {
    cameraRef.current = camera;
  });
  return null;
}

function AgentRenderer({
  renderAgentsRef,
  onSelectAgent,
  selectedAgentId,
}: {
  renderAgentsRef: React.RefObject<
    ReturnType<typeof useArenaGameLoop>["renderAgentsRef"]["current"]
  >;
  onSelectAgent?: (id: string) => void;
  selectedAgentId: string | null;
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
          onSelect={onSelectAgent}
          isSelected={selectedAgentId === agent.id}
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

function statusColor(status: string | null): string {
  switch (status) {
    case "running":
    case "pending":
      return "#f59e0b"; // amber — in progress
    case "completed":
      return "#10b981"; // green
    case "failed":
      return "#ef4444"; // red
    case "registered":
      return "#6366f1"; // indigo
    default:
      return "#94a3b8"; // slate — unknown
  }
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
  const [camMode, setCamMode] = useState<CamMode>("off");
  const [viewMode, setViewMode] = useState<ViewMode>("iso");
  const [debugPaths, setDebugPaths] = useState(false);
  const devActionQueueRef = useRef<DevAction[]>([]);
  // Bridge to the scene's live agent positions. The inner ArenaScene
  // surfaces its renderAgentsRef via onRenderAgentsRef; the outer stats
  // panel reads this each tick to position itself near the selected
  // agent's on-screen location.
  const agentsRefRef = useRef<React.RefObject<RenderAgentState[]> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const projectVecRef = useRef(new THREE.Vector3());
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasDomRef = useRef<HTMLCanvasElement | null>(null);

  const onRenderAgentsRef = useCallback(
    (ref: React.RefObject<RenderAgentState[]>) => {
      agentsRefRef.current = ref;
    },
    [],
  );
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
    if (id === null) setCamMode("off");
  }, []);
  const handleSelectFromMesh = useCallback((id: string) => {
    setSelectedAgentId(id);
  }, []);

  // Esc to clear selection + exit follow.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAgentId(null);
        setCamMode("off");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-clear on viewport < 768px so mobile doesn't end up in follow
  // mode with no way to exit (drag/wheel controls assume desktop).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      if (mq.matches) {
        setSelectedAgentId(null);
        setCamMode("off");
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId) ?? null
    : null;

  // Project the selected agent's world position to screen coords each
  // animation frame and move the stats panel there. Runs outside R3F
  // because the panel is DOM-layer, not inside the Canvas.
  useEffect(() => {
    if (!selectedAgentId) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const panel = panelRef.current;
      const camera = cameraRef.current;
      const canvas = canvasDomRef.current;
      const agentsRef = agentsRefRef.current;
      if (!panel || !camera || !canvas || !agentsRef) return;
      const agent = agentsRef.current?.find((a) => a.id === selectedAgentId);
      if (!agent) return;
      const [wx, , wz] = toWorld(agent.x, agent.y);
      // Aim at head height so the panel sits above the agent, not inside
      // the floor. 0.9 world-units is roughly head top for our AGENT_SCALE.
      projectVecRef.current.set(wx, 0.9, wz);
      projectVecRef.current.project(camera);
      const rect = canvas.getBoundingClientRect();
      const x = (projectVecRef.current.x * 0.5 + 0.5) * rect.width;
      const y = (-projectVecRef.current.y * 0.5 + 0.5) * rect.height;
      // Lerp toward the target so the panel eases along with the agent
      // instead of jittering frame-to-frame when the scene is moving.
      panelPosRef.current.x += (x - panelPosRef.current.x) * 0.2;
      panelPosRef.current.y += (y - panelPosRef.current.y) * 0.2;
      panel.style.left = `${Math.round(panelPosRef.current.x)}px`;
      panel.style.top = `${Math.round(panelPosRef.current.y)}px`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedAgentId]);

  // Snap the panel position to the agent's current screen coords on
  // selection, so the panel appears near the clicked agent instead of
  // sliding in from its previous location.
  useEffect(() => {
    if (!selectedAgentId) return;
    const camera = cameraRef.current;
    const canvas = canvasDomRef.current;
    const agent = agentsRefRef.current?.current?.find((a) => a.id === selectedAgentId);
    if (!camera || !canvas || !agent) return;
    const [wx, , wz] = toWorld(agent.x, agent.y);
    projectVecRef.current.set(wx, 0.9, wz);
    projectVecRef.current.project(camera);
    const rect = canvas.getBoundingClientRect();
    panelPosRef.current.x = (projectVecRef.current.x * 0.5 + 0.5) * rect.width;
    panelPosRef.current.y = (-projectVecRef.current.y * 0.5 + 0.5) * rect.height;
  }, [selectedAgentId]);

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
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleSelectFromMesh}
              onRenderAgentsRef={onRenderAgentsRef}
              camMode={camMode}
            />
            <CanvasCameraBridge cameraRef={cameraRef} canvasDomRef={canvasDomRef} />
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

        {/* Floating stats panel — anchored to the selected agent's
            projected screen position (updated in an rAF loop above).
            Click-outside dismisses by way of the canvas background click
            handler on the container below. */}
        {selectedAgent && (
          <div
            ref={panelRef}
            className="absolute z-20 pointer-events-auto"
            style={{
              left: 0,
              top: 0,
              transform: "translate(-50%, calc(-100% - 12px))",
              minWidth: 220,
              maxWidth: 260,
              padding: "10px 12px",
              background: "rgba(255, 255, 255, 0.97)",
              border: "1px solid #111",
              borderRadius: 6,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="font-sans font-medium text-[14px] text-black truncate">
                {selectedAgent.displayName ?? `Agent ${selectedAgent.rank ?? "?"}`}
              </div>
              <button
                onClick={() => handleSelectAgent(null)}
                className="font-sans text-[11px] text-gray-400 hover:text-black shrink-0 leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="font-sans text-[11px] text-gray-500 mb-2 truncate">
              {selectedAgent.taskTitle}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div>
                <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">
                  Rank
                </div>
                <div className="font-mono text-[16px] font-semibold">
                  {selectedAgent.rank ?? "—"}
                </div>
              </div>
              <div>
                <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">
                  Score
                </div>
                <div className="font-mono text-[16px] font-semibold">
                  {selectedAgent.score !== null ? selectedAgent.score.toFixed(1) : "—"}
                </div>
              </div>
              <div>
                <div className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">
                  Status
                </div>
                <div className="font-sans text-[12px] flex items-center gap-1.5">
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor(selectedAgent.latestStatus),
                    }}
                  />
                  {selectedAgent.latestStatus ?? "unknown"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCamMode(camMode === "follow" ? "off" : "follow")}
              className={`w-full px-3 py-1.5 rounded-full text-[11px] font-sans border transition-colors ${
                camMode === "follow"
                  ? "bg-black text-white border-black hover:bg-black/80"
                  : "bg-white text-black border-gray-300 hover:border-black"
              }`}
            >
              {camMode === "follow" ? "exit follow cam" : "enter follow cam"}
            </button>
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
