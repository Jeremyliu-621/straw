"use client";

import { useRef, useCallback, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  FURNITURE_ROTATION,
  ITEM_FOOTPRINT,
  ITEM_METADATA,
  type NavAnchorOverride,
} from "../core/geometry";
import {
  SCALE,
  CANVAS_W as MAIN_CANVAS_W,
  CANVAS_H as MAIN_CANVAS_H,
  WALL_THICKNESS,
} from "../core/constants";
import { toWorld } from "../core/geometry";
import FurnitureModel, { FURNITURE_GLB } from "../objects/FurnitureModel";
import ProceduralFurniture, { PROCEDURAL_TYPES } from "../objects/ProceduralFurniture";
import InteriorWall from "../objects/InteriorWall";
import AgentCharacter from "../objects/AgentCharacter";
import BWEffects from "../BWEffects";
import type { RenderAgentState } from "../useArenaGameLoop";
import type { FurnitureItem } from "../core/types";
import type { WorkoutStyle } from "../core/defaultLayout";
import {
  DEFAULT_ARENA_FURNITURE,
  DESK_STANDING_POINTS,
  SOCIAL_POINTS,
  GYM_WORKOUT_POINTS,
} from "../core/defaultLayout";
import {
  buildNavGrid,
  astar,
  GRID_CELL,
  GRID_COLS,
  GRID_ROWS,
  type NavGrid,
} from "../core/navigation";

export type Cohort = "seats" | "gym" | "arena" | "misc";

// Tuner canvas dimensions — small, focused on one agent + a few stations.
// The "arena" cohort uses the larger `ARENA_*` dimensions so a full mini-arena
// fits. seats/gym keep the smaller floor so the debug markers are readable.
const CANVAS_W = 600;
const CANVAS_H = 500;
const WORLD_W = CANVAS_W * SCALE;
const WORLD_H = CANVAS_H * SCALE;
// Arena cohort matches the MAIN arena exactly so paintings, floor, and
// perimeter walls all line up. These come from core/constants.
const ARENA_WORLD_W = MAIN_CANVAS_W * SCALE;
const ARENA_WORLD_H = MAIN_CANVAS_H * SCALE;

// ── Tuning params ─────────────────────────────────────────────────────────
// Everything the user can live-tune from the panel.

export interface TuningParams {
  // Rotation of each item (degrees added to item.facing).
  deskRotDeg: number;
  couchRotDeg: number;
  couchVRotDeg: number;
  beanbagRotDeg: number;
  // Sit-back offset (world units) applied as a render translation when the
  // agent sits at this station.
  deskSitBack: number;
  couchSitBack: number;
  couchVSitBack: number;
  beanbagSitBack: number;
  // Sink depth (dimensionless — multiplied by AGENT_SCALE * 0.01). Lower =
  // agent sits higher. Negative lifts the agent above default.
  couchSinkDepth: number;
  couchVSinkDepth: number;
  beanbagSinkDepth: number;
}

// Gym cohort tuning: per-station rotation + distance + (for chair) sit-back / sink-depth.
// Distance is in canvas units — how far the agent stands from the item center
// along the item's facing vector.
export interface GymTuningParams {
  whiteboardRotDeg: number;
  whiteboardDist: number;
  chairRotDeg: number;
  chairSitBack: number;
  chairSinkDepth: number;
  squatRackRotDeg: number;
  squatRackDist: number;
  dumbbellRackRotDeg: number;
  dumbbellRackDist: number;
  pullUpTowerRotDeg: number;
  pullUpTowerDist: number;
  punchingBagRotDeg: number;
  punchingBagDist: number;
}

export const DEFAULT_GYM_TUNING: GymTuningParams = {
  whiteboardRotDeg: 0,
  whiteboardDist: 40,
  chairRotDeg: 0,
  chairSitBack: 0.45,
  chairSinkDepth: 0.3,
  squatRackRotDeg: 0,
  squatRackDist: 7,
  dumbbellRackRotDeg: 0,
  dumbbellRackDist: 40,
  pullUpTowerRotDeg: 0,
  pullUpTowerDist: 10,
  punchingBagRotDeg: 0,
  punchingBagDist: 16,
};

// Misc cohort: utility items from the main arena that haven't been tuned yet
// (coffee machine, phone booth, fridge, vending, water dispenser, ping pong,
// printer station). Same rotation + distance slider pattern as gym.
export interface MiscTuningParams {
  coffeeMachineRotDeg: number;
  coffeeMachineDist: number;
  phoneBoothRotDeg: number;
  phoneBoothDist: number;
  fridgeRotDeg: number;
  fridgeDist: number;
  vendingRotDeg: number;
  vendingDist: number;
  waterDispenserRotDeg: number;
  waterDispenserDist: number;
  pingPongRotDeg: number;
  pingPongDist: number;
  /** Peak height of the ball's arc over the net, in three.js world units. */
  pingPongArcHeight: number;
  printerStationRotDeg: number;
  printerStationDist: number;
}

export const DEFAULT_MISC_TUNING: MiscTuningParams = {
  coffeeMachineRotDeg: 0,
  coffeeMachineDist: 30,
  phoneBoothRotDeg: 0,
  phoneBoothDist: 0,
  fridgeRotDeg: 0,
  fridgeDist: -17,
  vendingRotDeg: 0,
  vendingDist: -5,
  waterDispenserRotDeg: 0,
  waterDispenserDist: 40,
  pingPongRotDeg: 0,
  // 110 = half-long + 20 margin for a 180x100 table (matches main arena).
  pingPongDist: 110,
  pingPongArcHeight: 1,
  printerStationRotDeg: 0,
  printerStationDist: 47,
};

export const DEFAULT_TUNING: TuningParams = {
  deskRotDeg: 0,
  couchRotDeg: 0,
  couchVRotDeg: 0,
  beanbagRotDeg: 0,
  deskSitBack: 0.4,
  couchSitBack: 1.0,
  couchVSitBack: 1.27,
  beanbagSitBack: 0.55,
  couchSinkDepth: -2.0,
  couchVSinkDepth: 2.0,
  beanbagSinkDepth: 14.5,
};

// ── Station data ──────────────────────────────────────────────────────────

/** A cluster of items that should rotate together as a rigid body. */
export interface ClusterGroup {
  id: string;
  items: FurnitureItem[];
  pivotX: number; // canvas coords
  pivotY: number;
  rotDeg: number;
}

export interface Station {
  label: string;
  /** Items that make up this station (may be multiple, e.g. desk + chair + computer). */
  items: FurnitureItem[];
  standX: number;
  standY: number;
  facing: number;
  state: RenderAgentState["state"];
  socialSpotType?: string;
  sitBack: number;
  /** If set, overrides AgentCharacter's default sink depth for this station. */
  sinkDepth?: number;
  /** Only for working_out stations. */
  workoutStyle?: WorkoutStyle;
  /** Ping-pong stations carry the table uid + which side the agent is on so
   *  the tick loop can pair two agents at the same table. */
  pingPongTableUid?: string;
  pingPongSide?: "A" | "B";
}

// Kept for reference — no longer used. Clusters now rotate via three.js
// <group> wrappers (see ClusterGroupRender) which avoid per-item pivot drift.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rotateItems(
  items: FurnitureItem[],
  cx: number,
  cy: number,
  deg: number
): FurnitureItem[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return items.map((item) => {
    const [defW, defH] = ITEM_FOOTPRINT[item.type] ?? [40, 40];
    const w = item.w ?? defW;
    const h = item.h ?? defH;
    const itemCx = item.x + w / 2;
    const itemCy = item.y + h / 2;
    const dx = itemCx - cx;
    const dy = itemCy - cy;
    const newCx = cx + dx * cos - dy * sin;
    const newCy = cy + dx * sin + dy * cos;
    return {
      ...item,
      x: Math.round(newCx - w / 2),
      y: Math.round(newCy - h / 2),
      facing: ((item.facing ?? 0) + deg + 360) % 360,
    };
  });
}

function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number
): { x: number; y: number } {
  // Match three.js Y-axis rotation (canvas y ↔ world z) so this stays in
  // sync with <group rotation={[0, rad, 0]}/> used by ClusterGroupRender.
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos + dy * sin,
    y: cy - dx * sin + dy * cos,
  };
}

// Canvas anchors for each station (pre-rotation).
const DESK_BASE_X = 420;
const DESK_BASE_Y = 420;
const COUCH_BASE_X = 650;
const COUCH_BASE_Y = 420;
const COUCHV_BASE_X = 420;
const COUCHV_BASE_Y = 580;
const BEANBAG_BASE_X = 680;
const BEANBAG_BASE_Y = 600;

const DESK_W = 100;
const DESK_H = 55;
const COUCH_W = 100;
const COUCH_H = 40;
const COUCHV_W = ITEM_FOOTPRINT.couch_v?.[0] ?? 40;
const COUCHV_H = ITEM_FOOTPRINT.couch_v?.[1] ?? 80;
const BEANBAG_W = 40;
const BEANBAG_H = 40;

/**
 * Build all stations + items from a tuning parameter set.
 * This is called every render — cheap, pure function.
 */
export function buildStations(tuning: TuningParams): {
  items: FurnitureItem[];
  clusters: ClusterGroup[];
  stations: Station[];
} {
  const clusters: ClusterGroup[] = [];
  // ─ Desk cluster (desk + chair + computer) ─
  // Items live at their pre-rotation positions; the cluster as a whole is
  // rendered inside a rotated <group>, so all three rotate rigidly around
  // the desk center and avoid the per-item pivot drift.
  const deskChairX = DESK_W / 2 - 30;
  const deskClusterItems: FurnitureItem[] = [
    {
      type: "desk_cubicle",
      x: DESK_BASE_X,
      y: DESK_BASE_Y,
      _uid: "tuner_desk",
      id: "desk_0",
    },
    {
      type: "chair",
      x: DESK_BASE_X + deskChairX,
      y: DESK_BASE_Y - 10,
      facing: 180,
      _uid: "tuner_desk_chair",
    },
    {
      type: "computer",
      x: DESK_BASE_X + deskChairX,
      y: DESK_BASE_Y - 13,
      _uid: "tuner_desk_computer",
    },
  ];
  const deskCenterX = DESK_BASE_X + DESK_W / 2;
  const deskCenterY = DESK_BASE_Y + DESK_H / 2;
  clusters.push({
    id: "desk_cluster",
    items: deskClusterItems,
    pivotX: deskCenterX,
    pivotY: deskCenterY,
    rotDeg: tuning.deskRotDeg,
  });
  const deskStandPre = {
    x: DESK_BASE_X + DESK_W / 2 - 18,
    y: DESK_BASE_Y + 2,
  };
  const deskStandRot = rotatePoint(
    deskStandPre.x,
    deskStandPre.y,
    deskCenterX,
    deskCenterY,
    tuning.deskRotDeg
  );
  const deskStation: Station = {
    label: "Desk (typing)",
    items: deskClusterItems,
    standX: Math.round(deskStandRot.x),
    standY: Math.round(deskStandRot.y),
    facing: (tuning.deskRotDeg * Math.PI) / 180 + Math.PI,
    state: "sitting",
    // Use "chair" social-spot so AgentCharacter picks the normal
    // legs-bent sitting pose (not the typing-at-desk variant).
    socialSpotType: "chair",
    sitBack: tuning.deskSitBack,
  };

  // ─ Couch (horizontal) ───────────────────────────────────────────────
  const couchItem: FurnitureItem = {
    type: "couch",
    x: COUCH_BASE_X,
    y: COUCH_BASE_Y,
    w: COUCH_W,
    h: COUCH_H,
    facing: tuning.couchRotDeg,
    _uid: "tuner_couch",
  };
  // Effective facing = item.facing (rad) + FURNITURE_ROTATION[couch] (π).
  const couchFacing =
    (tuning.couchRotDeg * Math.PI) / 180 + (FURNITURE_ROTATION.couch ?? 0);
  const couchSeatOffset = Math.min(COUCH_W, COUCH_H) * 0.25;
  const couchCx = COUCH_BASE_X + COUCH_W / 2;
  const couchCy = COUCH_BASE_Y + COUCH_H / 2;
  const couchStation: Station = {
    label: "Couch",
    items: [couchItem],
    standX: Math.round(couchCx + Math.sin(couchFacing) * couchSeatOffset),
    standY: Math.round(couchCy + Math.cos(couchFacing) * couchSeatOffset),
    facing: couchFacing,
    state: "sitting",
    socialSpotType: "couch",
    sitBack: tuning.couchSitBack,
    sinkDepth: tuning.couchSinkDepth,
  };

  // ─ Couch_v (vertical) ───────────────────────────────────────────────
  const couchVItem: FurnitureItem = {
    type: "couch_v",
    x: COUCHV_BASE_X,
    y: COUCHV_BASE_Y,
    facing: tuning.couchVRotDeg,
    _uid: "tuner_couch_v",
  };
  const couchVFacing =
    (tuning.couchVRotDeg * Math.PI) / 180 +
    (FURNITURE_ROTATION.couch_v ?? 0);
  const couchVSeatOffset = Math.min(COUCHV_W, COUCHV_H) * 0.25;
  const couchVCx = COUCHV_BASE_X + COUCHV_W / 2;
  const couchVCy = COUCHV_BASE_Y + COUCHV_H / 2;
  const couchVStation: Station = {
    label: "Couch_v",
    items: [couchVItem],
    standX: Math.round(couchVCx + Math.sin(couchVFacing) * couchVSeatOffset),
    standY: Math.round(couchVCy + Math.cos(couchVFacing) * couchVSeatOffset),
    facing: couchVFacing,
    state: "sitting",
    socialSpotType: "couch_v",
    sitBack: tuning.couchVSitBack,
    sinkDepth: tuning.couchVSinkDepth,
  };

  // ─ Beanbag ──────────────────────────────────────────────────────────
  const beanbagItem: FurnitureItem = {
    type: "beanbag",
    x: BEANBAG_BASE_X,
    y: BEANBAG_BASE_Y,
    facing: tuning.beanbagRotDeg,
    color: "#e65100",
    _uid: "tuner_beanbag",
  };
  const beanbagFacing = (tuning.beanbagRotDeg * Math.PI) / 180;
  const beanbagStation: Station = {
    label: "Beanbag",
    items: [beanbagItem],
    standX: BEANBAG_BASE_X + BEANBAG_W / 2,
    standY: BEANBAG_BASE_Y + BEANBAG_H / 2,
    facing: beanbagFacing,
    state: "sitting",
    socialSpotType: "beanbag",
    sitBack: tuning.beanbagSitBack,
    sinkDepth: tuning.beanbagSinkDepth,
  };

  const stations = [deskStation, couchStation, couchVStation, beanbagStation];
  // Items that live OUTSIDE any cluster group (rendered directly).
  const clusteredUids = new Set(
    clusters.flatMap((c) => c.items.map((i) => i._uid))
  );
  const items = stations
    .flatMap((s) => s.items)
    .filter((i) => !clusteredUids.has(i._uid));
  return { items, clusters, stations };
}

// ── Gym cohort ───────────────────────────────────────────────────────────
// Whiteboard, standalone chair, and four pieces of gym equipment. Each station
// has a rotation that affects the item's facing and the agent's stand point +
// facing. Stand offset is perpendicular to item facing (agent stands "in
// front" of the equipment, looking at it).

interface GymStationConfig {
  label: string;
  type: string;
  cx: number; // canvas x of item top-left
  cy: number; // canvas y of item top-left
  w?: number;
  h?: number;
  /** Distance from item center to agent stand point (canvas units). */
  standDist: number;
  /** Whether the agent sits, stands, or works out at this station. */
  state: RenderAgentState["state"];
  workoutStyle?: WorkoutStyle;
  socialSpotType?: string;
}

const GYM_CONFIGS: Record<string, GymStationConfig> = {
  whiteboard: {
    label: "Whiteboard",
    type: "rolling_whiteboard",
    cx: 380,
    cy: 380,
    standDist: 40,
    state: "standing",
  },
  chair: {
    label: "Chair",
    type: "chair",
    cx: 520,
    cy: 380,
    standDist: 0,
    state: "sitting",
    // Prevents the "working" status trigger that the desk station uses.
    socialSpotType: "chair",
  },
  squat_rack: {
    label: "Squat rack",
    type: "squat_rack",
    cx: 660,
    cy: 380,
    standDist: 7,
    state: "working_out",
    workoutStyle: "lift",
  },
  dumbbell_rack: {
    label: "Dumbbells",
    type: "dumbbell_rack",
    cx: 420,
    cy: 550,
    standDist: 40,
    state: "working_out",
    workoutStyle: "lift",
  },
  pull_up_tower: {
    label: "Pull-up tower",
    type: "pull_up_tower",
    cx: 580,
    cy: 550,
    standDist: 10,
    state: "working_out",
    workoutStyle: "lift",
  },
  punching_bag: {
    label: "Punching bag",
    type: "punching_bag",
    cx: 720,
    cy: 550,
    standDist: 16,
    state: "working_out",
    workoutStyle: "box",
  },
};

function gymStation(
  key: keyof typeof GYM_CONFIGS,
  rotDeg: number,
  distOverride: number | undefined,
  overrides: Partial<Station> = {}
): Station {
  const cfg = GYM_CONFIGS[key];
  const [defW, defH] = ITEM_FOOTPRINT[cfg.type] ?? [40, 40];
  const w = cfg.w ?? defW;
  const h = cfg.h ?? defH;
  const item: FurnitureItem = {
    type: cfg.type,
    x: cfg.cx,
    y: cfg.cy,
    w: cfg.w,
    h: cfg.h,
    facing: rotDeg,
    _uid: `tuner_${key}`,
  };
  const facingRad =
    (rotDeg * Math.PI) / 180 + (FURNITURE_ROTATION[cfg.type] ?? 0);
  const itemCx = cfg.cx + w / 2;
  const itemCy = cfg.cy + h / 2;
  const dist = distOverride ?? cfg.standDist;
  const standX = itemCx + Math.sin(facingRad) * dist;
  const standY = itemCy + Math.cos(facingRad) * dist;
  return {
    label: cfg.label,
    items: [item],
    standX: Math.round(standX),
    standY: Math.round(standY),
    facing: facingRad + Math.PI,
    state: cfg.state,
    socialSpotType: cfg.socialSpotType,
    sitBack: 0,
    workoutStyle: cfg.workoutStyle,
    ...overrides,
  };
}

export function buildGymStations(tuning: GymTuningParams): {
  items: FurnitureItem[];
  clusters: ClusterGroup[];
  stations: Station[];
} {
  const stations = [
    gymStation("whiteboard", tuning.whiteboardRotDeg, tuning.whiteboardDist),
    gymStation("chair", tuning.chairRotDeg, undefined, {
      sitBack: tuning.chairSitBack,
      sinkDepth: tuning.chairSinkDepth,
      // Chair stand point is exactly the chair center (standDist=0 above).
      // Facing = rotation (agent faces the direction the chair's seat opens).
      facing: (tuning.chairRotDeg * Math.PI) / 180,
    }),
    gymStation("squat_rack", tuning.squatRackRotDeg, tuning.squatRackDist),
    gymStation("dumbbell_rack", tuning.dumbbellRackRotDeg, tuning.dumbbellRackDist),
    gymStation("pull_up_tower", tuning.pullUpTowerRotDeg, tuning.pullUpTowerDist),
    gymStation("punching_bag", tuning.punchingBagRotDeg, tuning.punchingBagDist),
  ];
  const items = stations.flatMap((s) => s.items);
  return { items, clusters: [], stations };
}

// ── Misc cohort ──────────────────────────────────────────────────────────
// Utility items from the main arena that haven't been tuned yet: coffee
// machine, phone booth, fridge, vending, water dispenser, round table,
// ping pong, printer station. Each is a standalone station with a
// rotation and distance slider. Pose = "standing" (agent stands in front).

interface MiscStationConfig {
  label: string;
  type: string;
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  defaultDist: number;
}

// All items placed in canvas x∈[300, 900], y∈[300, 800] so they land on the
// tuner floor (the Floor plane is centered at world origin and spans ±5.4×±4.5).
const MISC_CONFIGS: Record<string, MiscStationConfig> = {
  coffee_machine: {
    label: "Coffee machine",
    type: "coffee_machine",
    cx: 380,
    cy: 400,
    defaultDist: 30,
  },
  phone_booth: {
    label: "Phone booth",
    type: "phone_booth",
    cx: 500,
    cy: 380,
    w: 78,
    h: 72,
    defaultDist: 0,
  },
  fridge: {
    label: "Fridge",
    type: "fridge",
    cx: 660,
    cy: 380,
    defaultDist: -17,
  },
  vending: {
    label: "Vending",
    type: "vending",
    cx: 780,
    cy: 380,
    defaultDist: -5,
  },
  water_dispenser: {
    label: "Water dispenser",
    type: "water_dispenser",
    cx: 380,
    cy: 600,
    defaultDist: 40,
  },
  ping_pong: {
    // Matches the main-arena table dimensions so the pair-and-ball
    // mechanic looks identical in the misc cohort and at /leaderboard.
    label: "Ping pong",
    type: "ping_pong",
    cx: 500,
    cy: 580,
    w: 180,
    h: 100,
    defaultDist: 110,
  },
  printer_station: {
    label: "Printer",
    type: "printer_station",
    cx: 740,
    cy: 600,
    w: 60,
    h: 50,
    defaultDist: 47,
  },
};

function miscStation(
  key: keyof typeof MISC_CONFIGS,
  rotDeg: number,
  distOverride: number
): Station {
  const cfg = MISC_CONFIGS[key];
  const [defW, defH] = ITEM_FOOTPRINT[cfg.type] ?? [40, 40];
  const w = cfg.w ?? defW;
  const h = cfg.h ?? defH;
  const item: FurnitureItem = {
    type: cfg.type,
    x: cfg.cx,
    y: cfg.cy,
    w: cfg.w,
    h: cfg.h,
    facing: rotDeg,
    _uid: `tuner_misc_${key}`,
  };
  const facingRad =
    (rotDeg * Math.PI) / 180 + (FURNITURE_ROTATION[cfg.type] ?? 0);
  const itemCx = cfg.cx + w / 2;
  const itemCy = cfg.cy + h / 2;
  const standX = itemCx + Math.sin(facingRad) * distOverride;
  const standY = itemCy + Math.cos(facingRad) * distOverride;
  return {
    label: cfg.label,
    items: [item],
    standX: Math.round(standX),
    standY: Math.round(standY),
    // Agent looks back at the item.
    facing: facingRad + Math.PI,
    state: "standing",
    sitBack: 0,
  };
}

export function buildMiscStations(tuning: MiscTuningParams): {
  items: FurnitureItem[];
  clusters: ClusterGroup[];
  stations: Station[];
} {
  // Ping pong: two slots at the ends of the long axis, facing each other.
  // Distance = half-long + 20 margin (same as main arena SOCIAL_POINTS).
  // Tuner default table is 100x60 → dist 70, which matches the old manual value.
  const ppCfg = MISC_CONFIGS.ping_pong;
  const [ppDefW, ppDefH] = ITEM_FOOTPRINT[ppCfg.type] ?? [100, 60];
  const ppW = ppCfg.w ?? ppDefW;
  const ppH = ppCfg.h ?? ppDefH;
  const ppItem: FurnitureItem = {
    type: "ping_pong",
    x: ppCfg.cx,
    y: ppCfg.cy,
    w: ppW,
    h: ppH,
    facing: tuning.pingPongRotDeg,
    _uid: `tuner_misc_ping_pong`,
  };
  const ppRotRad = (tuning.pingPongRotDeg * Math.PI) / 180;
  const ppCx = ppCfg.cx + ppW / 2;
  const ppCy = ppCfg.cy + ppH / 2;
  const ppLongIsX = ppW >= ppH;
  const ppLongX = ppLongIsX ? Math.cos(ppRotRad) : -Math.sin(ppRotRad);
  const ppLongY = ppLongIsX ? -Math.sin(ppRotRad) : -Math.cos(ppRotRad);
  // pingPongDist slider acts as an override — dialed-in value of 70 matches
  // the size-aware formula for a 100x60 table.
  const pingPongSlotA: Station = {
    label: "Ping pong A",
    items: [ppItem],
    standX: Math.round(ppCx + ppLongX * tuning.pingPongDist),
    standY: Math.round(ppCy + ppLongY * tuning.pingPongDist),
    facing: Math.atan2(-ppLongX, -ppLongY),
    state: "standing",
    sitBack: 0,
    pingPongTableUid: ppItem._uid,
    pingPongSide: "A",
  };
  const pingPongSlotB: Station = {
    label: "Ping pong B",
    items: [ppItem],
    standX: Math.round(ppCx - ppLongX * tuning.pingPongDist),
    standY: Math.round(ppCy - ppLongY * tuning.pingPongDist),
    facing: Math.atan2(ppLongX, ppLongY),
    state: "standing",
    sitBack: 0,
    pingPongTableUid: ppItem._uid,
    pingPongSide: "B",
  };

  const stations = [
    miscStation("coffee_machine", tuning.coffeeMachineRotDeg, tuning.coffeeMachineDist),
    miscStation("phone_booth", tuning.phoneBoothRotDeg, tuning.phoneBoothDist),
    miscStation("fridge", tuning.fridgeRotDeg, tuning.fridgeDist),
    miscStation("vending", tuning.vendingRotDeg, tuning.vendingDist),
    miscStation("water_dispenser", tuning.waterDispenserRotDeg, tuning.waterDispenserDist),
    pingPongSlotA,
    pingPongSlotB,
    miscStation("printer_station", tuning.printerStationRotDeg, tuning.printerStationDist),
  ];
  // Dedupe items by _uid — ping-pong slots A+B share the same ppItem, so
  // without this the table would render twice (and React would warn about
  // duplicate keys).
  const seen = new Set<string>();
  const items: FurnitureItem[] = [];
  for (const s of stations) {
    for (const item of s.items) {
      if (seen.has(item._uid)) continue;
      seen.add(item._uid);
      items.push(item);
    }
  }
  return { items, clusters: [], stations };
}

// ── Arena cohort ─────────────────────────────────────────────────────────
// A mini full-arena layout built ENTIRELY from the validated tuner factories.
// No custom per-station math. When the layout looks right we copy it into
// defaultLayout.ts so /leaderboard and the landing-page preview match.
//
// Layout is authored in a 1200x900 canvas (close to main arena's 1200x1100)
// so station positions translate 1:1 when we port them out.

/**
 * Arena cohort: replicates the full main-arena layout inside the tuner.
 * Uses `DEFAULT_ARENA_FURNITURE` directly so the positions + clustering
 * match the main `/leaderboard` + landing-page view 1:1. Stations are
 * derived from the shared `DESK_STANDING_POINTS` / `SOCIAL_POINTS` /
 * `GYM_WORKOUT_POINTS` tables so the agent can be directed to any of them.
 */
export function buildArenaStations(): {
  items: FurnitureItem[];
  clusters: ClusterGroup[];
  stations: Station[];
} {
  const clusters: ClusterGroup[] = [];
  const stations: Station[] = [];

  // Group cluster-tagged items into the tuner's ClusterGroup shape so
  // ClusterGroupRender wraps them in the rotation group.
  const clusterMap = new Map<string, ClusterGroup>();
  const loose: FurnitureItem[] = [];
  for (const item of DEFAULT_ARENA_FURNITURE) {
    if (item._cluster) {
      const id = item._cluster.id;
      const existing = clusterMap.get(id);
      if (existing) existing.items.push(item);
      else
        clusterMap.set(id, {
          id,
          items: [item],
          pivotX: item._cluster.pivotX,
          pivotY: item._cluster.pivotY,
          rotDeg: item._cluster.rotDeg,
        });
    } else {
      loose.push(item);
    }
  }
  clusters.push(...clusterMap.values());

  // Desk stations — one per DESK_STANDING_POINT.
  DESK_STANDING_POINTS.forEach((sp, idx) => {
    if (!sp) return;
    stations.push({
      label: `Desk ${idx}`,
      items: [], // items already rendered via clusters
      standX: sp.x,
      standY: sp.y,
      facing: sp.facing,
      state: "sitting",
      socialSpotType: "chair",
      sitBack: 0.4,
    });
  });

  // Social stations (couches / beanbags / round tables / ping pong / etc.).
  SOCIAL_POINTS.forEach((p, idx) => {
    const isCouchV = p.type === "couch_v";
    const isCouch = p.type === "couch";
    const isBeanbag = p.type === "beanbag";
    const sitBack = isCouch
      ? 1.0
      : isCouchV
        ? 1.27
        : isBeanbag
          ? 0.55
          : 0;
    const sinkDepth = isCouch
      ? -2.0
      : isCouchV
        ? 2.0
        : isBeanbag
          ? 14.5
          : undefined;
    stations.push({
      label: `${p.type} ${idx}`,
      items: [],
      standX: p.x,
      standY: p.y,
      facing: p.facing ?? 0,
      state: isCouch || isCouchV || isBeanbag ? "sitting" : "standing",
      socialSpotType:
        isCouch || isCouchV || isBeanbag ? p.type : undefined,
      sitBack,
      sinkDepth,
    });
  });

  // Gym stations.
  GYM_WORKOUT_POINTS.forEach((p, idx) => {
    stations.push({
      label: `Gym ${p.style} ${idx}`,
      items: [],
      standX: p.x,
      standY: p.y,
      facing: p.facing,
      state: "working_out",
      sitBack: 0,
      workoutStyle: p.style,
    });
  });

  return { items: loose, clusters, stations };
}

// Module-level cache so repeated callers (useMemo in strict mode, multiple
// scenes) all get the SAME object reference for the arena cohort. Without
// this, every render creates a new stations array which flickers the
// useEffect that resets agent.path — dramatically slowing walk speed.
let __arenaCache:
  | { items: FurnitureItem[]; clusters: ClusterGroup[]; stations: Station[] }
  | null = null;
export function getArenaStations() {
  if (!__arenaCache) __arenaCache = buildArenaStations();
  return __arenaCache;
}

// ── Tuner agent state ─────────────────────────────────────────────────────

// Matches the main-arena walk speed (useArenaGameLoop WALK_SPEED). We dropped
// the earlier 5× dev-tool multiplier now that the tuner is the surface we're
// building the real ambience on — agents should move at their final pace.
const WALK_SPEED = 0.7;

// Ping-pong game length once two agents have paired up at a table.
const PING_PONG_GAME_MIN_MS = 20_000;
const PING_PONG_GAME_MAX_MS = 40_000;
// Ambient talk: proximity-triggered short chats between two idle agents.
// Covers (1) bumping-into-each-other while roaming and (2) one agent
// arriving next to another at a social spot — both show up as a pair
// within TALK_PROXIMITY_PX that isn't already in a hold.
const TALK_PROXIMITY_PX = 50;
const TALK_CHANCE_PER_TICK = 0.02;   // ≈1.2/s per eligible pair at 60fps
const TALK_MIN_MS = 3_000;
const TALK_MAX_MS = 6_000;
// Ball / paddle geometry, ported from Claw3D sceneRuntime's PingPongBall.
const PING_PONG_BALL_RADIUS = 0.06;
const PING_PONG_PADDLE_OFFSET = 18; // canvas units from player → paddle
const PING_PONG_CYCLE_MS = 1200;    // full out-and-back loop

// Seats / gym / misc cohorts tune poses for one or two subjects at a time;
// the arena cohort simulates the full office (15 = roughly the main-arena
// top-of-leaderboard size).
export const ARENA_AGENT_COUNT = 15;
export const DEFAULT_AGENT_COUNT = 2;
export const getAgentCount = (c: Cohort) =>
  c === "arena" ? ARENA_AGENT_COUNT : DEFAULT_AGENT_COUNT;

// 15 visually distinct colors for the arena cohort. Index 0/1 preserve
// the original indigo/red so existing seats/gym/misc tuning screenshots
// still match. Index 2+ are pulled from the Tailwind palette at 500-weight
// for consistency against the pale floor.
const AGENT_COLORS = [
  "#6366f1", // indigo — A
  "#ef4444", // red — B
  "#10b981", // emerald — C
  "#f59e0b", // amber — D
  "#8b5cf6", // violet — E
  "#ec4899", // pink — F
  "#06b6d4", // cyan — G
  "#84cc16", // lime — H
  "#f97316", // orange — I
  "#14b8a6", // teal — J
  "#a855f7", // purple — K
  "#eab308", // yellow — L
  "#3b82f6", // blue — M
  "#d946ef", // fuchsia — N
  "#22c55e", // green — O
];

export const tunerAgentColor = (idx: number) =>
  AGENT_COLORS[idx % AGENT_COLORS.length];

// Arena-cohort spawn grid: 5 cols × 3 rows centered on the main-floor
// open area, ~50px between agents. Once ambient fires they disperse.
function arenaSpawn(idx: number): { x: number; y: number } {
  const col = idx % 5;
  const row = Math.floor(idx / 5);
  return { x: 500 + col * 50, y: 490 + row * 50 };
}

function makeInitialAgent(idx: number, cohort: Cohort): RenderAgentState {
  // Seats/gym/misc keep the two centered spawn points used by the original
  // tuner so existing tuning screenshots still match.
  let x: number;
  let y: number;
  if (cohort === "arena") {
    const p = arenaSpawn(idx);
    x = p.x;
    y = p.y;
  } else {
    x = idx === 0 ? 540 : 620;
    y = 530;
  }
  // Arena cohort: each agent gets a fixed 0.7x–1.3x speed multiplier so the
  // crowd doesn't move in lockstep — same variance as useArenaGameLoop:594.
  // Seats/gym/misc keep the flat speed so pose-tuning visuals stay
  // deterministic between screenshots.
  const walkSpeed =
    cohort === "arena" ? WALK_SPEED * (0.7 + Math.random() * 0.6) : WALK_SPEED;
  return {
    id: `tuner_agent_${idx}`,
    name: String.fromCharCode(65 + idx), // A, B, C, …
    rank: idx + 1,
    status: "idle",
    color: tunerAgentColor(idx),
    x,
    y,
    targetX: x,
    targetY: y,
    path: [],
    facing: 0,
    frame: 0,
    walkSpeed,
    phaseOffset: (idx * 0.37) % 1, // stagger walk animations
    state: "standing",
  };
}

function makeInitialAgents(cohort: Cohort): RenderAgentState[] {
  const n = getAgentCount(cohort);
  return Array.from({ length: n }, (_, i) => makeInitialAgent(i, cohort));
}

interface TunerSceneProps {
  cohort: Cohort;
  stationIdxByAgent: (number | null)[];
  tuning: TuningParams;
  gymTuning: GymTuningParams;
  miscTuning: MiscTuningParams;
  agentRef: React.RefObject<RenderAgentState[]>;
  showPaths: boolean;
  showNav: boolean;
  obb: boolean;
  navOverrides: Record<string, NavAnchorOverride>;
  /** Called when the user clicks the floor — used in "arena" cohort to
   *  direct agent 0 to walk to the clicked canvas position. */
  onFloorClick?: (canvasX: number, canvasY: number) => void;
}

function ClusterGroupRender({ cluster }: { cluster: ClusterGroup }) {
  // Render cluster items at their PRE-rotation canvas positions, but inside a
  // three.js group that rotates around the cluster pivot (in world). This
  // keeps the children rigidly aligned regardless of the rotation angle.
  const [pivotWx, , pivotWz] = toWorld(cluster.pivotX, cluster.pivotY);
  const rotRad = (cluster.rotDeg * Math.PI) / 180;
  return (
    <group position={[pivotWx, 0, pivotWz]} rotation={[0, rotRad, 0]}>
      <group position={[-pivotWx, 0, -pivotWz]}>
        {cluster.items.map((item) => {
          if (item.type === "wall") {
            return <InteriorWall key={item._uid} item={item} />;
          }
          if (PROCEDURAL_TYPES.has(item.type)) {
            return <ProceduralFurniture key={item._uid} item={item} />;
          }
          if (!FURNITURE_GLB[item.type]) return null;
          return <FurnitureModel key={item._uid} item={item} />;
        })}
      </group>
    </group>
  );
}

function Floor({
  onFloorClick,
  large,
}: {
  onFloorClick?: (canvasX: number, canvasY: number) => void;
  large?: boolean;
}) {
  const w = large ? ARENA_WORLD_W : WORLD_W;
  const h = large ? ARENA_WORLD_H : WORLD_H;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={
        onFloorClick
          ? (e) => {
              e.stopPropagation();
              // e.point is world coords. Invert toWorld() to recover canvas.
              const canvasX = e.point.x / SCALE + 600; // CANVAS_W/2 of main
              const canvasY = e.point.z / SCALE + 550; // CANVAS_H/2 of main
              onFloorClick(canvasX, canvasY);
            }
          : undefined
      }
    >
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#f0ebdc" />
    </mesh>
  );
}

function GridLines({ large }: { large?: boolean }) {
  // Arena cohort: no grid at all — matches the main OfficeEnvironment look.
  // Seats/gym cohorts keep the visible grid for tuning precision.
  if (large) return null;
  return (
    <gridHelper
      args={[WORLD_W, 24, "#c9c0ae", "#d4cbb8"]}
      position={[0, 0.002, 0]}
    />
  );
}

function PerimeterWalls({ large }: { large?: boolean }) {
  // Port of OfficeEnvironment.PerimeterWalls — identical thickness + color +
  // dims so paintings that are wallAttached line up against the wall.
  if (!large) return null;
  const wallH = 1.1;
  const halfW = ARENA_WORLD_W / 2;
  const halfH = ARENA_WORLD_H / 2;
  const thickness = WALL_THICKNESS * SCALE;
  const color = "#C9C7C2";
  return (
    <>
      <mesh position={[0, wallH / 2, -halfH]}>
        <boxGeometry args={[ARENA_WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, wallH / 2, halfH]}>
        <boxGeometry args={[ARENA_WORLD_W, wallH, thickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-halfW, wallH / 2, 0]}>
        <boxGeometry args={[thickness, wallH, ARENA_WORLD_H]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[halfW, wallH / 2, 0]}>
        <boxGeometry args={[thickness, wallH, ARENA_WORLD_H]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

/**
 * Renders animated ping-pong balls for every paired table. Scans agentsRef
 * each frame for pairs (same pingPongTableUid, opposite pingPongSide, both
 * have pingPongUntil > now) and animates one ball per pair using a 3-phase
 * trajectory borrowed from Claw3D's PingPongBall: paddle → first bounce
 * (24%) → arc over net (52%) → second bounce → receiver paddle (24%).
 */
function PingPongBalls({
  agentsRef,
  arcHeight,
}: {
  agentsRef: React.RefObject<RenderAgentState[]>;
  arcHeight: number;
}) {
  // We reuse a small pool of meshes — one per potential table. Misc has 1,
  // arena has 1, future cohorts could have more; 4 is a safe cap.
  const POOL = 4;
  const ballRefs = useRef<Array<THREE.Mesh | null>>(
    Array.from({ length: POOL }, () => null)
  );
  const shadowRefs = useRef<Array<THREE.Mesh | null>>(
    Array.from({ length: POOL }, () => null)
  );

  useFrame(() => {
    const now = Date.now();
    const agents = agentsRef.current ?? [];
    // Group active players by tableUid.
    const byTable = new Map<
      string,
      { A?: RenderAgentState; B?: RenderAgentState }
    >();
    for (const a of agents) {
      if (
        a.pingPongTableUid &&
        a.pingPongSide &&
        a.pingPongUntil !== undefined &&
        a.pingPongUntil > now
      ) {
        const pair = byTable.get(a.pingPongTableUid) ?? {};
        pair[a.pingPongSide] = a;
        byTable.set(a.pingPongTableUid, pair);
      }
    }

    // Render each complete pair onto one ball slot.
    let slot = 0;
    for (const pair of byTable.values()) {
      if (slot >= POOL) break;
      const ball = ballRefs.current[slot];
      const shadow = shadowRefs.current[slot];
      if (!ball || !shadow) {
        slot += 1;
        continue;
      }
      if (!pair.A || !pair.B) {
        ball.visible = false;
        shadow.visible = false;
        slot += 1;
        continue;
      }
      // Paddle positions: PING_PONG_PADDLE_OFFSET canvas units inside each
      // player's stand point along the table's long axis. We infer axis from
      // the two players' midpoint → player vector.
      const midX = (pair.A.x + pair.B.x) / 2;
      const midY = (pair.A.y + pair.B.y) / 2;
      const dxA = pair.A.x - midX;
      const dyA = pair.A.y - midY;
      const len = Math.hypot(dxA, dyA) || 1;
      const ux = dxA / len;
      const uy = dyA / len;
      const paddleAx = pair.A.x - ux * PING_PONG_PADDLE_OFFSET;
      const paddleAy = pair.A.y - uy * PING_PONG_PADDLE_OFFSET;
      const paddleBx = pair.B.x + ux * PING_PONG_PADDLE_OFFSET;
      const paddleBy = pair.B.y + uy * PING_PONG_PADDLE_OFFSET;

      // 1.2s cycle: 0..0.5 ball travels A→B, 0.5..1 travels B→A.
      const phase = (now % PING_PONG_CYCLE_MS) / PING_PONG_CYCLE_MS;
      const half = phase < 0.5 ? phase / 0.5 : (phase - 0.5) / 0.5;
      const fromX = phase < 0.5 ? paddleAx : paddleBx;
      const fromY = phase < 0.5 ? paddleAy : paddleBy;
      const toX = phase < 0.5 ? paddleBx : paddleAx;
      const toY = phase < 0.5 ? paddleBy : paddleAy;
      const bx = fromX + (toX - fromX) * half;
      const by = fromY + (toY - fromY) * half;
      // Height: two small bounces (before/after net) plus a larger arc over.
      // local t in [0,1] across the half stroke.
      const arc = Math.sin(half * Math.PI) * arcHeight; // tunable peak
      const bounce = Math.abs(Math.sin(half * Math.PI * 3)) * 0.04; // two tiny dips
      const heightY = 0.38 + arc - bounce;

      const [wx, , wz] = toWorld(bx, by);
      ball.position.set(wx, heightY, wz);
      ball.visible = true;
      shadow.position.set(wx, 0.01, wz);
      shadow.scale.setScalar(0.5 + (1 - heightY / 0.56) * 0.5);
      shadow.visible = true;

      slot += 1;
    }
    // Hide unused slots.
    for (; slot < POOL; slot++) {
      const b = ballRefs.current[slot];
      const s = shadowRefs.current[slot];
      if (b) b.visible = false;
      if (s) s.visible = false;
    }
  });

  return (
    <>
      {Array.from({ length: POOL }).map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              shadowRefs.current[i] = el;
            }}
            visible={false}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[PING_PONG_BALL_RADIUS * 1.6, 24]} />
            <meshBasicMaterial color="#09110d" transparent opacity={0.24} />
          </mesh>
          <mesh
            ref={(el) => {
              ballRefs.current[i] = el;
            }}
            visible={false}
          >
            <sphereGeometry args={[PING_PONG_BALL_RADIUS, 16, 12]} />
            <meshStandardMaterial
              color="#ff8c1a"
              roughness={0.18}
              emissive="#ffb347"
              emissiveIntensity={0.85}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function AgentDebugMarker({
  agentRef,
  agentIdx,
  color,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  agentIdx: number;
  color: string;
}) {
  const markerRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const agent = agentRef.current[agentIdx];
    if (!agent || !markerRef.current) return;
    const [ax, , az] = toWorld(agent.x, agent.y);
    markerRef.current.position.set(ax, 0.05, az);
    if (arrowRef.current) {
      arrowRef.current.position.set(ax, 0.05, az);
      arrowRef.current.rotation.y = agent.facing;
    }
  });
  return (
    <>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={arrowRef}>
        <coneGeometry args={[0.05, 0.3, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

// Max waypoints we'll ever display. A* paths are typically <30 cells; cap
// at 128 so we can keep a fixed-size buffer that re-fills each frame.
const PATH_MAX_POINTS = 128;

function AgentPathLine({
  agentRef,
  agentIdx,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  agentIdx: number;
}) {
  // One Line mesh with a fixed-size buffer and a three.js Color we flip
  // between green (A* routed around obstacles) and red (direct-line fallback).
  // Matches the non-tuner arena's path overlay color convention.
  const lineRef = useRef<THREE.Line | null>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(PATH_MAX_POINTS * 3);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#22c55e",
        transparent: true,
        opacity: 0.95,
      }),
    []
  );
  const lineObj = useMemo(() => {
    const l = new THREE.Line(geom, mat);
    l.renderOrder = 10;
    return l;
  }, [geom, mat]);

  useFrame(() => {
    const agent = agentRef.current[agentIdx];
    const line = lineRef.current;
    if (!agent || !line) return;
    const planned = agent.plannedPath;
    const hasPath = Array.isArray(planned) && planned.length >= 2;
    line.visible = hasPath;
    if (!hasPath || !planned) return;

    // Just the planned path itself — no live agent-position prepend.
    const count = Math.min(planned.length, PATH_MAX_POINTS);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const [wx, , wz] = toWorld(planned[i].x, planned[i].y);
      pos.setXYZ(i, wx, 0.25, wz);
    }
    pos.needsUpdate = true;
    geom.setDrawRange(0, count);
    geom.computeBoundingSphere();

    // green for routed, red for direct fallback (same convention as the
    // main /leaderboard arena).
    mat.color.set(agent.plannedPathRouted ? "#22c55e" : "#ef4444");
  });

  return <primitive ref={lineRef} object={lineObj} />;
}

function NavGridOverlay({ grid }: { grid: NavGrid }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const blockedCells = useMemo(() => {
    const cells: { c: number; r: number }[] = [];
    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        if (grid[r * GRID_COLS + c]) cells.push({ c, r });
      }
    }
    return cells;
  }, [grid]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    blockedCells.forEach((cell, i) => {
      const cx = (cell.c + 0.5) * GRID_CELL;
      const cy = (cell.r + 0.5) * GRID_CELL;
      const [wx, , wz] = toWorld(cx, cy);
      dummy.position.set(wx, 0.02, wz);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = blockedCells.length;
  }, [blockedCells]);

  if (blockedCells.length === 0) return null;
  const cellWorld = GRID_CELL * SCALE * 0.96;
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, blockedCells.length]}
    >
      <planeGeometry args={[cellWorld, cellWorld]} />
      <meshBasicMaterial
        color="#ef4444"
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function DebugMarkers({
  stations,
  stationIdxByAgent,
  agentRef,
  showPaths,
  showNav,
  navGrid,
}: {
  stations: Station[];
  stationIdxByAgent: (number | null)[];
  agentRef: React.RefObject<RenderAgentState[]>;
  showPaths: boolean;
  showNav: boolean;
  navGrid: NavGrid;
}) {
  const agentCount = stationIdxByAgent.length;
  return (
    <>
      {showNav && <NavGridOverlay grid={navGrid} />}
      {Array.from({ length: agentCount }).map((_, i) => (
        <AgentDebugMarker
          key={`marker_${i}`}
          agentRef={agentRef}
          agentIdx={i}
          color={tunerAgentColor(i)}
        />
      ))}
      {showPaths &&
        Array.from({ length: agentCount }).map((_, i) => (
          <AgentPathLine
            key={`path_${i}`}
            agentRef={agentRef}
            agentIdx={i}
          />
        ))}
      {stationIdxByAgent.map((idx, agentIdx) => {
        if (idx === null) return null;
        const station = stations[idx];
        if (!station) return null;
        const [tx, , tz] = toWorld(station.standX, station.standY);
        const dirX = Math.sin(station.facing);
        const dirZ = Math.cos(station.facing);
        const color = tunerAgentColor(agentIdx);
        return (
          <group key={agentIdx}>
            <mesh position={[tx, 0.05, tz]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
            <mesh
              position={[tx + dirX * 0.2, 0.05, tz + dirZ * 0.2]}
              rotation={[0, station.facing, 0]}
            >
              <coneGeometry args={[0.05, 0.3, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(8, 10, 10);
    camera.lookAt(0, 0, 0);
    type OrthoCam = typeof camera & { zoom: number };
    (camera as OrthoCam).zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, zoom]);
  return null;
}

function TickLoop({
  agentRef,
  stations,
  stationIdxByAgent,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  stations: Station[];
  stationIdxByAgent: (number | null)[];
}) {
  useFrame((_, delta) => {
    const speedScale = Math.min(delta * 60, 6);
    const now = Date.now();

    // Ping-pong game expiry — sweep BEFORE the per-agent loop so both
    // partners clear in the same frame. An expired game leaves both players
    // idle-standing; ambient / user input decides what's next.
    for (const a of agentRef.current) {
      if (!a) continue;
      if (a.pingPongUntil !== undefined && a.pingPongUntil <= now) {
        a.pingPongTableUid = undefined;
        a.pingPongSide = undefined;
        a.pingPongUntil = undefined;
      }
      // Talk hold expiry.
      if (a.talkUntil !== undefined && a.talkUntil <= now) {
        a.talkUntil = undefined;
        a.talkPartnerId = undefined;
      }
    }

    // Proximity chat trigger: scan every unordered pair; if both are eligible
    // (not walking / working-out / ping-pong-playing / already talking) and
    // within TALK_PROXIMITY_PX, roll a small per-tick chance. Sitting agents
    // count as eligible so two on the same couch can chat.
    const agents = agentRef.current;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a) continue;
      if (a.state === "walking" || a.state === "working_out") continue;
      if (a.talkUntil !== undefined && a.talkUntil > now) continue;
      if (a.pingPongUntil !== undefined && a.pingPongUntil > now) continue;
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        if (!b) continue;
        if (b.state === "walking" || b.state === "working_out") continue;
        if (b.talkUntil !== undefined && b.talkUntil > now) continue;
        if (b.pingPongUntil !== undefined && b.pingPongUntil > now) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.hypot(dx, dy) > TALK_PROXIMITY_PX) continue;
        if (Math.random() > TALK_CHANCE_PER_TICK * speedScale) continue;
        const duration =
          TALK_MIN_MS + Math.random() * (TALK_MAX_MS - TALK_MIN_MS);
        a.talkUntil = now + duration;
        b.talkUntil = now + duration;
        a.talkPartnerId = b.id;
        b.talkPartnerId = a.id;
        a.facing = Math.atan2(dx, dy);
        b.facing = Math.atan2(-dx, -dy);
      }
    }

    for (let agentIdx = 0; agentIdx < agentRef.current.length; agentIdx++) {
      const agent = agentRef.current[agentIdx];
      if (!agent) continue;
      const stationIdx = stationIdxByAgent[agentIdx] ?? null;
      const activeStation = stationIdx !== null ? stations[stationIdx] : null;

      if (
        activeStation &&
        (agent.state === "sitting" ||
          agent.state === "working_out" ||
          agent.state === "standing")
      ) {
        agent.sitBackOverride = activeStation.sitBack;
        agent.sinkDepthOverride = activeStation.sinkDepth;
        agent.workoutStyle = activeStation.workoutStyle;
        // Don't overwrite talk-facing — a sitting agent mid-chat should keep
        // looking at their partner, not snap back to the station's default.
        const talking =
          agent.talkUntil !== undefined && agent.talkUntil > now;
        if (!talking) agent.facing = activeStation.facing;
      }

      if (agent.state === "walking" && agent.path.length > 0) {
        const wp = agent.path[0];
        const dx = wp.x - agent.x;
        const dy = wp.y - agent.y;
        const dist = Math.hypot(dx, dy);
        const speed = agent.walkSpeed * speedScale;
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
            agent.path = [];
            if (activeStation) {
              agent.state = activeStation.state;
              agent.socialSpotType = activeStation.socialSpotType;
              agent.workoutStyle = activeStation.workoutStyle;
              agent.sitBackOverride = activeStation.sitBack;
              agent.sinkDepthOverride = activeStation.sinkDepth;
              agent.facing = activeStation.facing;
              if (activeStation.state === "sitting" && !activeStation.socialSpotType) {
                agent.status = "working";
              }
              // Ping-pong arrival: claim this side of the table. If the
              // other side is already waiting, start the game on both.
              if (
                activeStation.pingPongTableUid &&
                activeStation.pingPongSide
              ) {
                agent.pingPongTableUid = activeStation.pingPongTableUid;
                agent.pingPongSide = activeStation.pingPongSide;
                const partner = agentRef.current.find(
                  (a) =>
                    a !== agent &&
                    a.pingPongTableUid === activeStation.pingPongTableUid &&
                    a.pingPongSide !== activeStation.pingPongSide
                );
                if (partner) {
                  const duration = PING_PONG_GAME_MIN_MS +
                    Math.random() *
                      (PING_PONG_GAME_MAX_MS - PING_PONG_GAME_MIN_MS);
                  agent.pingPongUntil = now + duration;
                  partner.pingPongUntil = now + duration;
                }
              }
            } else {
              agent.state = "standing";
              agent.sitBackOverride = undefined;
              agent.sinkDepthOverride = undefined;
              agent.workoutStyle = undefined;
            }
          }
        }
      }
      agent.frame += 1;
    }
  });
  return null;
}

export default function TunerScene({
  cohort,
  stationIdxByAgent,
  tuning,
  gymTuning,
  miscTuning,
  agentRef,
  showPaths,
  showNav,
  obb,
  navOverrides,
  onFloorClick,
}: TunerSceneProps) {
  const { items, clusters, stations } = useMemo(() => {
    if (cohort === "gym") return buildGymStations(gymTuning);
    if (cohort === "arena") return getArenaStations();
    if (cohort === "misc") return buildMiscStations(miscTuning);
    return buildStations(tuning);
  }, [cohort, tuning, gymTuning, miscTuning]);
  const navGrid = useMemo(() => {
    const allItems = [...items, ...clusters.flatMap((c) => c.items)];
    return buildNavGrid(allItems, navOverrides, obb);
  }, [items, clusters, navOverrides, obb]);
  const large = cohort === "arena";

  return (
    <Canvas
      orthographic
      shadows
      camera={{ near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#FDFCFC" }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <CameraRig zoom={large ? 30 : 50} />
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.0}
          color="#ffffff"
          castShadow
        />
        <hemisphereLight args={["#ffffff", "#e0e0e0", 0.4]} />

        <Floor onFloorClick={onFloorClick} large={large} />
        <GridLines large={large} />
        <PerimeterWalls large={large} />

        {items.map((item) => {
          if (item.type === "wall") {
            return <InteriorWall key={item._uid} item={item} />;
          }
          if (PROCEDURAL_TYPES.has(item.type)) {
            return <ProceduralFurniture key={item._uid} item={item} />;
          }
          if (!FURNITURE_GLB[item.type]) return null;
          return <FurnitureModel key={item._uid} item={item} />;
        })}

        {clusters.map((cluster) => (
          <ClusterGroupRender key={cluster.id} cluster={cluster} />
        ))}

        {Array.from({ length: getAgentCount(cohort) }).map((_, i) => (
          <AgentCharacter
            key={`tuner_agent_${i}`}
            agentId={`tuner_agent_${i}`}
            agentName={String.fromCharCode(65 + i)}
            rank={i + 1}
            agentsRef={agentRef}
          />
        ))}

        <PingPongBalls
          agentsRef={agentRef}
          arcHeight={miscTuning.pingPongArcHeight}
        />

        <DebugMarkers
          stations={stations}
          stationIdxByAgent={stationIdxByAgent}
          agentRef={agentRef}
          showPaths={showPaths}
          showNav={showNav}
          navGrid={navGrid}
        />
        <TickLoop
          agentRef={agentRef}
          stations={stations}
          stationIdxByAgent={stationIdxByAgent}
        />

        {/* Match landing-page default look: b&w + tint + pure white. */}
        <BWEffects
          variant="unlit-tint"
          pureWhite
          tintNormal={0.5}
          tintPureWhite={0.6}
          edgeThreshold={40}
        />
      </Suspense>
    </Canvas>
  );
}

export function useTunerAgent() {
  const [cohort, setCohort] = useState<Cohort>("seats");
  const agentRef = useRef<RenderAgentState[]>(makeInitialAgents("seats"));
  const [stationIdxByAgent, setStationIdxByAgent] = useState<
    (number | null)[]
  >(() => Array(getAgentCount("seats")).fill(null));
  const [tuning, setTuning] = useState<TuningParams>(DEFAULT_TUNING);
  const [gymTuning, setGymTuning] =
    useState<GymTuningParams>(DEFAULT_GYM_TUNING);
  const [miscTuning, setMiscTuning] =
    useState<MiscTuningParams>(DEFAULT_MISC_TUNING);
  const [showPaths, setShowPaths] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [obb, setObb] = useState(false);
  // Per-type nav-anchor overrides — sliders write into this; buildNavGrid
  // applies them at grid-build time. Empty by default = use NAV_ANCHOR_OVERRIDES
  // from geometry.ts (which itself is empty until we lock values in).
  const [navOverrides, setNavOverrides] = useState<
    Record<string, NavAnchorOverride>
  >({});
  // Ambient mode per agent: when on, the agent autonomously picks a new
  // random station every 6–12s once it's settled. Picking a specific
  // station from the dropdown or hitting stop turns ambient off for that
  // agent. Switching cohort / reset also clears ambient.
  const [ambientByAgent, setAmbientByAgent] = useState<boolean[]>(() =>
    Array(getAgentCount("seats")).fill(false)
  );
  const ambientNextAtRef = useRef<number[]>(
    Array(getAgentCount("seats")).fill(0)
  );
  // Mirror stationIdxByAgent into a ref so the ambient timer can read the
  // latest value without re-creating its interval on every station change.
  const stationIdxByAgentRef = useRef(stationIdxByAgent);
  useEffect(() => {
    stationIdxByAgentRef.current = stationIdxByAgent;
  }, [stationIdxByAgent]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  const { stations, items, clusters } = useMemo(() => {
    if (cohort === "gym") return buildGymStations(gymTuning);
    if (cohort === "arena") return getArenaStations();
    if (cohort === "misc") return buildMiscStations(miscTuning);
    return buildStations(tuning);
  }, [cohort, tuning, gymTuning, miscTuning]);

  // Nav grid for collision-aware A* pathing. Rebuilt when cohort items,
  // per-type overrides, or OBB mode change.
  const navGrid = useMemo(() => {
    const allItems = [...items, ...clusters.flatMap((c) => c.items)];
    return buildNavGrid(allItems, navOverrides, obb);
  }, [items, clusters, navOverrides, obb]);

  // Plan a path from (sx, sy) to (ex, ey) using A*. Returns the waypoint
  // list AND whether A* actually routed (true = navigated around obstacles,
  // false = we fell back to a straight line because A* couldn't find one).
  const planPath = useCallback(
    (sx: number, sy: number, ex: number, ey: number) => {
      const p = astar(sx, sy, ex, ey, navGrid);
      if (p.length > 0) return { waypoints: p, routed: true };
      return { waypoints: [{ x: ex, y: ey }], routed: false };
    },
    [navGrid]
  );

  const sendToStation = useCallback(
    (agentIdx: number, idx: number | null) => {
      const agent = agentRef.current[agentIdx];
      if (!agent) return;
      if (idx === null) {
        agent.state = "standing";
        agent.path = [];
        agent.plannedPath = undefined;
        agent.plannedPathRouted = undefined;
        agent.socialSpotType = undefined;
        agent.sitBackOverride = undefined;
        agent.sinkDepthOverride = undefined;
        agent.workoutStyle = undefined;
        agent.pingPongTableUid = undefined;
        agent.pingPongSide = undefined;
        agent.pingPongUntil = undefined;
        agent.status = "idle";
        setStationIdxByAgent((prev) => {
          const next = [...prev];
          next[agentIdx] = null;
          return next;
        });
        return;
      }
      const station = stations[idx];
      if (!station) return;
      agent.state = "walking";
      agent.targetX = station.standX;
      agent.targetY = station.standY;
      const plan = planPath(agent.x, agent.y, station.standX, station.standY);
      agent.path = plan.waypoints;
      // Prepend the PLAN-TIME start so the overlay always has ≥2 points.
      agent.plannedPath = [
        { x: agent.x, y: agent.y },
        ...plan.waypoints.map((p) => ({ ...p })),
      ];
      agent.plannedPathRouted = plan.routed;
      agent.socialSpotType = undefined;
      agent.sitBackOverride = undefined;
      agent.sinkDepthOverride = undefined;
      agent.workoutStyle = undefined;
      // Clear any prior ping-pong pairing — they'll be re-set on arrival if
      // the new station is itself a ping-pong slot.
      agent.pingPongTableUid = undefined;
      agent.pingPongSide = undefined;
      agent.pingPongUntil = undefined;
      agent.status = "idle";
      setStationIdxByAgent((prev) => {
        const next = [...prev];
        next[agentIdx] = idx;
        return next;
      });
    },
    [stations, planPath]
  );

  // When tuning changes, any active station may have moved — rewalk each
  // agent to its (new) stand point.
  useEffect(() => {
    stationIdxByAgent.forEach((stationIdx, agentIdx) => {
      if (stationIdx === null) return;
      const agent = agentRef.current[agentIdx];
      const station = stations[stationIdx];
      if (!agent || !station) return;
      const dx = station.standX - agent.x;
      const dy = station.standY - agent.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        agent.state = "walking";
        agent.targetX = station.standX;
        agent.targetY = station.standY;
        const plan = planPath(agent.x, agent.y, station.standX, station.standY);
        agent.path = plan.waypoints;
        agent.plannedPath = [
          { x: agent.x, y: agent.y },
          ...plan.waypoints.map((p) => ({ ...p })),
        ];
        agent.plannedPathRouted = plan.routed;
        agent.socialSpotType = undefined;
        agent.sitBackOverride = undefined;
        agent.sinkDepthOverride = undefined;
      } else {
        agent.sitBackOverride = station.sitBack;
        agent.sinkDepthOverride = station.sinkDepth;
        agent.facing = station.facing;
      }
    });
  }, [stations, stationIdxByAgent, planPath]);

  const setAmbientForAgent = useCallback(
    (agentIdx: number, on: boolean) => {
      setAmbientByAgent((prev) => {
        const next = [...prev];
        next[agentIdx] = on;
        return next;
      });
      // Fire the first ambient pick immediately when turning on.
      if (on) ambientNextAtRef.current[agentIdx] = 0;
    },
    []
  );

  // Master toggle: flip every agent's ambient flag at once. Staggers the
  // first pick per agent so 15 agents don't all re-route on the same tick.
  const setAmbientForAll = useCallback((on: boolean) => {
    setAmbientByAgent((prev) => prev.map(() => on));
    if (on) {
      const now = Date.now();
      for (let i = 0; i < ambientNextAtRef.current.length; i++) {
        ambientNextAtRef.current[i] = now + i * 250;
      }
    }
  }, []);

  // Ambient timer: every 500ms, check each agent; if ambient is on and the
  // agent is settled (not walking) and its dwell window has elapsed, pick a
  // new random station and send it there. Excludes the agent's current
  // station AND every other agent's current / in-transit station so no two
  // agents converge on the same spot (important with 15 arena agents).
  useEffect(() => {
    const anyOn = ambientByAgent.some(Boolean);
    if (!anyOn) return;
    const id = window.setInterval(() => {
      if (stations.length < 2) return;
      const now = Date.now();
      for (let i = 0; i < ambientByAgent.length; i++) {
        if (!ambientByAgent[i]) continue;
        const agent = agentRef.current[i];
        if (!agent) continue;
        if (agent.state === "walking") continue;
        if (now < ambientNextAtRef.current[i]) continue;
        // Build the set of stations occupied by any OTHER agent.
        const occupied = new Set<number>();
        for (let j = 0; j < stationIdxByAgentRef.current.length; j++) {
          if (j === i) continue;
          const s = stationIdxByAgentRef.current[j];
          if (s !== null) occupied.add(s);
        }
        const selfIdx = stationIdxByAgentRef.current[i];
        const candidates: number[] = [];
        for (let s = 0; s < stations.length; s++) {
          if (s === selfIdx || occupied.has(s)) continue;
          candidates.push(s);
        }
        if (candidates.length === 0) continue;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        sendToStation(i, pick);
        // Dwell 6–12s at the new station before the next hop.
        ambientNextAtRef.current[i] = now + 6000 + Math.random() * 6000;
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [ambientByAgent, stations, sendToStation]);

  const reset = useCallback(() => {
    const n = getAgentCount(cohort);
    agentRef.current = makeInitialAgents(cohort);
    ambientNextAtRef.current = Array(n).fill(0);
    setTuning(DEFAULT_TUNING);
    setGymTuning(DEFAULT_GYM_TUNING);
    setMiscTuning(DEFAULT_MISC_TUNING);
    setStationIdxByAgent(Array(n).fill(null));
    setAmbientByAgent(Array(n).fill(false));
  }, [cohort]);

  // Click-to-direct: send agent 0 walking to a clicked canvas point (arena cohort).
  const walkToPoint = useCallback(
    (canvasX: number, canvasY: number) => {
      const agent = agentRef.current[0];
      if (!agent) return;
      agent.state = "walking";
      agent.targetX = canvasX;
      agent.targetY = canvasY;
      const plan = planPath(agent.x, agent.y, canvasX, canvasY);
      agent.path = plan.waypoints;
      agent.plannedPath = [
        { x: agent.x, y: agent.y },
        ...plan.waypoints.map((p) => ({ ...p })),
      ];
      agent.plannedPathRouted = plan.routed;
      agent.socialSpotType = undefined;
      agent.sitBackOverride = undefined;
      agent.sinkDepthOverride = undefined;
      agent.workoutStyle = undefined;
      agent.status = "idle";
      setStationIdxByAgent((prev) => {
        const next = [...prev];
        next[0] = null;
        return next;
      });
    },
    [planPath]
  );

  // Switching cohort clears any selection (positions don't line up across
  // cohorts) and resizes the per-agent arrays to match the new cohort's
  // agent count (arena = 15, others = 2).
  const changeCohort = useCallback((c: Cohort) => {
    const n = getAgentCount(c);
    agentRef.current = makeInitialAgents(c);
    ambientNextAtRef.current = Array(n).fill(0);
    setCohort(c);
    setStationIdxByAgent(Array(n).fill(null));
    setAmbientByAgent(Array(n).fill(false));
  }, []);

  return {
    agentRef,
    cohort,
    setCohort: changeCohort,
    stationIdxByAgent,
    sendToStation,
    reset,
    tuning,
    setTuning,
    gymTuning,
    setGymTuning,
    miscTuning,
    setMiscTuning,
    showPaths,
    setShowPaths,
    showNav,
    setShowNav,
    obb,
    setObb,
    navOverrides,
    setNavOverrides,
    ambientByAgent,
    setAmbientForAgent,
    setAmbientForAll,
    stations,
    walkToPoint,
  };
}

/**
 * All types in ITEM_METADATA that block navigation, sorted alphabetically.
 * Drives the nav-tune type picker in TunerPanel.
 */
export const NAV_TUNABLE_TYPES: string[] = Object.entries(ITEM_METADATA)
  .filter(([, meta]) => meta.blocksNavigation)
  .map(([type]) => type)
  .sort();
