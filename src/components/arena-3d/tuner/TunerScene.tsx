"use client";

import { useRef, useCallback, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  FURNITURE_ROTATION,
  ITEM_FOOTPRINT,
} from "../core/geometry";
import { SCALE, AGENT_SCALE } from "../core/constants";
import { toWorld } from "../core/geometry";
import FurnitureModel from "../objects/FurnitureModel";
import AgentCharacter from "../objects/AgentCharacter";
import type { RenderAgentState } from "../useArenaGameLoop";
import type { FurnitureItem } from "../core/types";

// Tuner canvas dimensions — small, focused on one agent + a few stations.
const CANVAS_W = 600;
const CANVAS_H = 500;
const WORLD_W = CANVAS_W * SCALE;
const WORLD_H = CANVAS_H * SCALE;

// ── Station data ──────────────────────────────────────────────────────────
// One of each major station type, with the computed "where the agent should
// stand" + "which way they should face" using the same formulas as the main
// layout. This is the code under test.

interface Station {
  label: string;
  item: FurnitureItem;
  standX: number;
  standY: number;
  facing: number;
  /** State the agent enters on arrival. */
  state: RenderAgentState["state"];
  /** Optional socialSpotType to set for couch-lounging pose. */
  socialSpotType?: string;
  /** Optional workoutStyle for working_out pose. */
  workoutStyle?: RenderAgentState["workoutStyle"];
}

// Item coords are in main-canvas space because FurnitureModel uses the global
// toWorld() which subtracts CANVAS_W/2=600, CANVAS_H/2=550. To land on the
// tuner's local floor (centered at world origin), items must cluster around
// canvas (600, 550).

// Desk (south-facing) — typing pose
const DESK_W = 100;
const DESK_H = 55;
const deskItem: FurnitureItem = {
  type: "desk_cubicle",
  x: 420,
  y: 420,
  _uid: "tuner_desk",
  id: "desk_0",
};
const deskChairX = DESK_W / 2 - 30; // 20
// Chair-center offset from desk top-left:
//   dx_local = (w/2 - 30) + 12 = w/2 - 18  → from desk center: -18
//   dy_local (south) = -10 + 12 = 2         → from desk center: 2 - h/2 = -25.5
const deskStand: Station = {
  label: "Desk (south-facing, typing)",
  item: deskItem,
  standX: deskItem.x + DESK_W / 2 - 18,
  standY: deskItem.y + 2,
  facing: 0, // faces +y (south, toward monitor)
  state: "sitting",
};

// Also add the chair item so the visual is accurate
const deskChairItem: FurnitureItem = {
  type: "chair",
  x: deskItem.x + deskChairX,
  y: deskItem.y - 10,
  facing: 180,
  _uid: "tuner_desk_chair",
};
const deskComputerItem: FurnitureItem = {
  type: "computer",
  x: deskItem.x + deskChairX,
  y: deskItem.y - 13,
  _uid: "tuner_desk_computer",
};

// Couch (horizontal, default facing=0 = south — though couch has
// FURNITURE_ROTATION = π so effective facing is π, i.e. north)
const COUCH_W = 100;
const COUCH_H = 40;
const couchItem: FurnitureItem = {
  type: "couch",
  x: 650,
  y: 420,
  w: COUCH_W,
  h: COUCH_H,
  _uid: "tuner_couch",
};
const couchFacing = 0 + Math.PI; // item.facing + FURNITURE_ROTATION.couch
const couchSeatOffset = Math.min(COUCH_W, COUCH_H) * 0.25;
const couchStand: Station = {
  label: "Couch (horizontal, π facing)",
  item: couchItem,
  standX: couchItem.x + COUCH_W / 2 + Math.sin(couchFacing) * couchSeatOffset,
  standY: couchItem.y + COUCH_H / 2 + Math.cos(couchFacing) * couchSeatOffset,
  facing: couchFacing,
  state: "sitting",
  socialSpotType: "couch",
};

// Couch_v (vertical, FURNITURE_ROTATION = π/2, effective facing = east)
const COUCHV_W = ITEM_FOOTPRINT.couch_v?.[0] ?? 40;
const COUCHV_H = ITEM_FOOTPRINT.couch_v?.[1] ?? 80;
const couchVItem: FurnitureItem = {
  type: "couch_v",
  x: 420,
  y: 580,
  _uid: "tuner_couch_v",
};
const couchVFacing = 0 + Math.PI / 2;
const couchVSeatOffset = Math.min(COUCHV_W, COUCHV_H) * 0.25;
const couchVStand: Station = {
  label: "Couch_v (vertical, π/2 facing)",
  item: couchVItem,
  standX: couchVItem.x + COUCHV_W / 2 + Math.sin(couchVFacing) * couchVSeatOffset,
  standY: couchVItem.y + COUCHV_H / 2 + Math.cos(couchVFacing) * couchVSeatOffset,
  facing: couchVFacing,
  state: "sitting",
  socialSpotType: "couch_v",
};

// Beanbag
const beanbagItem: FurnitureItem = {
  type: "beanbag",
  x: 680,
  y: 600,
  color: "#e65100",
  _uid: "tuner_beanbag",
};
const beanbagStand: Station = {
  label: "Beanbag (no target facing)",
  item: beanbagItem,
  standX: beanbagItem.x + 20,
  standY: beanbagItem.y + 20,
  facing: 0, // unused (kept for data completeness — arrival doesn't snap)
  state: "sitting",
  socialSpotType: "beanbag",
};

export const STATIONS: Station[] = [deskStand, couchStand, couchVStand, beanbagStand];

const ALL_FURNITURE: FurnitureItem[] = [
  deskItem,
  deskChairItem,
  deskComputerItem,
  couchItem,
  couchVItem,
  beanbagItem,
];

// ── Tuner agent state ─────────────────────────────────────────────────────

const WALK_SPEED = 0.7;

function makeInitialAgent(): RenderAgentState {
  return {
    id: "tuner_agent",
    name: "Tuner",
    rank: 1,
    status: "idle",
    color: "#6366f1",
    x: 560,
    y: 530,
    targetX: 560,
    targetY: 530,
    path: [],
    facing: 0,
    frame: 0,
    walkSpeed: WALK_SPEED,
    phaseOffset: 0,
    state: "standing",
  };
}

interface TunerSceneProps {
  stationIdx: number | null;
  /** Passed into AgentCharacter so it reads live state from our ref. */
  agentRef: React.RefObject<RenderAgentState[]>;
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[WORLD_W, WORLD_H]} />
      <meshStandardMaterial color="#f0ebdc" />
    </mesh>
  );
}

function GridLines() {
  const divisions = 24;
  return (
    <gridHelper
      args={[WORLD_W, divisions, "#c9c0ae", "#d4cbb8"]}
      position={[0, 0.002, 0]}
    />
  );
}

function DebugMarkers({
  station,
  agentRef,
}: {
  station: Station | null;
  agentRef: React.RefObject<RenderAgentState[]>;
}) {
  const agentMarkerRef = useRef<THREE.Mesh>(null);
  const agentArrowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const agent = agentRef.current[0];
    if (!agent || !agentMarkerRef.current) return;
    const [ax, , az] = toWorld(agent.x, agent.y);
    agentMarkerRef.current.position.set(ax, 0.05, az);
    if (agentArrowRef.current) {
      agentArrowRef.current.position.set(ax, 0.05, az);
      agentArrowRef.current.rotation.y = agent.facing;
    }
  });

  return (
    <>
      {/* Agent current position — small red sphere at floor */}
      <mesh ref={agentMarkerRef}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Agent facing direction — thin arrow */}
      <mesh ref={agentArrowRef}>
        <coneGeometry args={[0.05, 0.3, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Station target — green sphere at the standing point */}
      {station && (() => {
        const [tx, , tz] = toWorld(station.standX, station.standY);
        const dirX = Math.sin(station.facing);
        const dirZ = Math.cos(station.facing);
        return (
          <>
            <mesh position={[tx, 0.05, tz]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
            {/* Station desired facing — green arrow */}
            <mesh
              position={[tx + dirX * 0.2, 0.05, tz + dirZ * 0.2]}
              rotation={[0, station.facing, 0]}
            >
              <coneGeometry args={[0.05, 0.3, 8]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
          </>
        );
      })()}
    </>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(8, 10, 10);
    camera.lookAt(0, 0, 0);
    type OrthoCam = typeof camera & { zoom: number };
    (camera as OrthoCam).zoom = 50;
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function TickLoop({
  agentRef,
  stationIdx,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  stationIdx: number | null;
}) {
  useFrame(() => {
    const agent = agentRef.current[0];
    if (!agent) return;

    // If there's an active walking path, advance.
    if (agent.state === "walking" && agent.path.length > 0) {
      const wp = agent.path[0];
      const dx = wp.x - agent.x;
      const dy = wp.y - agent.y;
      const dist = Math.hypot(dx, dy);
      const speed = agent.walkSpeed;

      if (dist > speed) {
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;
        agent.facing = Math.atan2(dx, dy);
      } else {
        agent.x = wp.x;
        agent.y = wp.y;
        if (agent.path.length > 1) {
          agent.path = agent.path.slice(1);
        } else {
          // Arrived at final waypoint — enter station state.
          agent.path = [];
          const station = stationIdx !== null ? STATIONS[stationIdx] : null;
          if (station) {
            agent.state = station.state;
            agent.socialSpotType = station.socialSpotType;
            agent.workoutStyle = station.workoutStyle;
            // Only snap facing if the station isn't a beanbag (which has no
            // canonical front).
            if (station.socialSpotType !== "beanbag") {
              agent.facing = station.facing;
            }
            // If sitting at a desk (working_out equivalent), set status to
            // "working" so the typing pose triggers.
            if (station.state === "sitting" && !station.socialSpotType) {
              agent.status = "working";
            }
          } else {
            agent.state = "standing";
          }
        }
      }
    }

    agent.frame += 1;
  });

  return null;
}

export default function TunerScene({ stationIdx, agentRef }: TunerSceneProps) {
  const furniture = useMemo(() => ALL_FURNITURE, []);
  const activeStation = stationIdx !== null ? STATIONS[stationIdx] : null;

  return (
    <Canvas
      orthographic
      shadows
      camera={{ near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#fafaf5" }}
    >
      <Suspense fallback={null}>
        <CameraRig />

        {/* Simple lighting */}
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.0}
          color="#ffffff"
          castShadow
        />
        <hemisphereLight args={["#ffffff", "#e0e0e0", 0.4]} />

        <Floor />
        <GridLines />

        {furniture.map((item) => (
          <FurnitureModel key={item._uid} item={item} />
        ))}

        {/* Agent */}
        <AgentCharacter
          agentId="tuner_agent"
          agentName="Tuner"
          rank={1}
          agentsRef={agentRef}
        />

        <DebugMarkers station={activeStation} agentRef={agentRef} />
        <TickLoop agentRef={agentRef} stationIdx={stationIdx} />
      </Suspense>
    </Canvas>
  );
}

export function useTunerAgent() {
  const agentRef = useRef<RenderAgentState[]>([makeInitialAgent()]);
  const [stationIdx, setStationIdxState] = useState<number | null>(null);
  // Force a render so the overlay re-reads the agent data for display.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  const sendToStation = useCallback((idx: number | null) => {
    const agent = agentRef.current[0];
    if (!agent) return;
    if (idx === null) {
      agent.state = "standing";
      agent.path = [];
      agent.socialSpotType = undefined;
      agent.workoutStyle = undefined;
      agent.status = "idle";
      setStationIdxState(null);
      return;
    }
    const station = STATIONS[idx];
    if (!station) return;
    // Clear any prior state, build a straight-line path.
    agent.state = "walking";
    agent.targetX = station.standX;
    agent.targetY = station.standY;
    agent.path = [{ x: station.standX, y: station.standY }];
    agent.socialSpotType = undefined;
    agent.workoutStyle = undefined;
    agent.status = "idle";
    setStationIdxState(idx);
  }, []);

  const reset = useCallback(() => {
    agentRef.current[0] = makeInitialAgent();
    setStationIdxState(null);
  }, []);

  return { agentRef, stationIdx, sendToStation, reset };
}
