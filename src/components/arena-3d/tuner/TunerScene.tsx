"use client";

import { useRef, useCallback, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  FURNITURE_ROTATION,
  ITEM_FOOTPRINT,
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
import type { RenderAgentState } from "../useArenaGameLoop";
import type { FurnitureItem } from "../core/types";
import type { WorkoutStyle } from "../core/defaultLayout";
import {
  DEFAULT_ARENA_FURNITURE,
  DESK_STANDING_POINTS,
  SOCIAL_POINTS,
  GYM_WORKOUT_POINTS,
} from "../core/defaultLayout";
import { buildNavGrid, astar } from "../core/navigation";

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
  pingPongDist: 70,
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
    label: "Ping pong",
    type: "ping_pong",
    cx: 540,
    cy: 600,
    w: 100,
    h: 60,
    defaultDist: 50,
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
  };
  const pingPongSlotB: Station = {
    label: "Ping pong B",
    items: [ppItem],
    standX: Math.round(ppCx - ppLongX * tuning.pingPongDist),
    standY: Math.round(ppCy - ppLongY * tuning.pingPongDist),
    facing: Math.atan2(ppLongX, ppLongY),
    state: "standing",
    sitBack: 0,
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

// 5× the main-arena walk speed so tuning loops are quick. Matches what a
// user would experience on a foreground /leaderboard tab with no throttling.
const WALK_SPEED = 0.7 * 5;

function makeInitialAgent(idx: number): RenderAgentState {
  // Two agents side-by-side in the center of the tuner floor, so clicking a
  // station button for either one produces an obvious movement.
  const baseX = idx === 0 ? 540 : 620;
  const color = idx === 0 ? "#6366f1" : "#ef4444";
  return {
    id: `tuner_agent_${idx}`,
    name: idx === 0 ? "A" : "B",
    rank: idx + 1,
    status: "idle",
    color,
    x: baseX,
    y: 530,
    targetX: baseX,
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
  cohort: Cohort;
  stationIdxByAgent: (number | null)[];
  tuning: TuningParams;
  gymTuning: GymTuningParams;
  miscTuning: MiscTuningParams;
  agentRef: React.RefObject<RenderAgentState[]>;
  showPaths: boolean;
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
  color,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  agentIdx: number;
  color: string;
}) {
  // Build a raw three.js Line once and mutate its position buffer per frame.
  // Using drei's <Line> doesn't re-read mutated buffers reliably; a plain
  // three.js Line + BufferAttribute + needsUpdate does.
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
        color,
        transparent: true,
        opacity: 0.95,
      }),
    [color]
  );
  const lineObj = useMemo(() => {
    const l = new THREE.Line(geom, mat);
    l.renderOrder = 10; // draw above the floor grid
    return l;
  }, [geom, mat]);

  useFrame(() => {
    const agent = agentRef.current[agentIdx];
    const line = lineRef.current;
    if (!agent || !line) return;
    const planned = agent.plannedPath;
    const hasPath = Array.isArray(planned) && planned.length > 0;
    line.visible = hasPath;
    if (!hasPath || !planned) return;

    const [ax, , az] = toWorld(agent.x, agent.y);
    const waypoints = planned.slice(0, PATH_MAX_POINTS - 1);
    const pts: [number, number, number][] = [[ax, 0.25, az]];
    for (const wp of waypoints) {
      const [wx, , wz] = toWorld(wp.x, wp.y);
      pts.push([wx, 0.25, wz]);
    }

    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pts.length; i++) {
      pos.setXYZ(i, pts[i][0], pts[i][1], pts[i][2]);
    }
    pos.needsUpdate = true;
    geom.setDrawRange(0, pts.length);
    geom.computeBoundingSphere();
  });

  return <primitive ref={lineRef} object={lineObj} />;
}

function DebugMarkers({
  stations,
  stationIdxByAgent,
  agentRef,
  showPaths,
}: {
  stations: Station[];
  stationIdxByAgent: (number | null)[];
  agentRef: React.RefObject<RenderAgentState[]>;
  showPaths: boolean;
}) {
  return (
    <>
      <AgentDebugMarker agentRef={agentRef} agentIdx={0} color="#ef4444" />
      <AgentDebugMarker agentRef={agentRef} agentIdx={1} color="#10b981" />
      {showPaths && (
        <>
          <AgentPathLine agentRef={agentRef} agentIdx={0} color="#ef4444" />
          <AgentPathLine agentRef={agentRef} agentIdx={1} color="#10b981" />
        </>
      )}
      {stationIdxByAgent.map((idx, agentIdx) => {
        if (idx === null) return null;
        const station = stations[idx];
        if (!station) return null;
        const [tx, , tz] = toWorld(station.standX, station.standY);
        const dirX = Math.sin(station.facing);
        const dirZ = Math.cos(station.facing);
        const color = agentIdx === 0 ? "#ef4444" : "#10b981";
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
        agent.facing = activeStation.facing;
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
  onFloorClick,
}: TunerSceneProps) {
  const { items, clusters, stations } = useMemo(() => {
    if (cohort === "gym") return buildGymStations(gymTuning);
    if (cohort === "arena") return getArenaStations();
    if (cohort === "misc") return buildMiscStations(miscTuning);
    return buildStations(tuning);
  }, [cohort, tuning, gymTuning, miscTuning]);
  const large = cohort === "arena";

  return (
    <Canvas
      orthographic
      shadows
      camera={{ near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#fafaf5" }}
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

        <AgentCharacter
          agentId="tuner_agent_0"
          agentName="A"
          rank={1}
          agentsRef={agentRef}
        />
        <AgentCharacter
          agentId="tuner_agent_1"
          agentName="B"
          rank={2}
          agentsRef={agentRef}
        />

        <DebugMarkers
          stations={stations}
          stationIdxByAgent={stationIdxByAgent}
          agentRef={agentRef}
          showPaths={showPaths}
        />
        <TickLoop
          agentRef={agentRef}
          stations={stations}
          stationIdxByAgent={stationIdxByAgent}
        />
      </Suspense>
    </Canvas>
  );
}

export function useTunerAgent() {
  const agentRef = useRef<RenderAgentState[]>([
    makeInitialAgent(0),
    makeInitialAgent(1),
  ]);
  const [cohort, setCohort] = useState<Cohort>("seats");
  const [stationIdxByAgent, setStationIdxByAgent] = useState<
    (number | null)[]
  >([null, null]);
  const [tuning, setTuning] = useState<TuningParams>(DEFAULT_TUNING);
  const [gymTuning, setGymTuning] =
    useState<GymTuningParams>(DEFAULT_GYM_TUNING);
  const [miscTuning, setMiscTuning] =
    useState<MiscTuningParams>(DEFAULT_MISC_TUNING);
  const [showPaths, setShowPaths] = useState(false);
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

  // Nav grid for collision-aware A* pathing. Rebuilt when cohort items change.
  const navGrid = useMemo(() => {
    const allItems = [...items, ...clusters.flatMap((c) => c.items)];
    return buildNavGrid(allItems);
  }, [items, clusters]);

  // Plan a path from (sx, sy) to (ex, ey) using A*. Falls back to a single
  // waypoint if A* can't find a path (e.g. the destination is inside an
  // obstacle).
  const planPath = useCallback(
    (sx: number, sy: number, ex: number, ey: number) => {
      const p = astar(sx, sy, ex, ey, navGrid);
      if (p.length > 0) return p;
      return [{ x: ex, y: ey }];
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
        agent.socialSpotType = undefined;
        agent.sitBackOverride = undefined;
        agent.sinkDepthOverride = undefined;
        agent.workoutStyle = undefined;
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
      agent.path = planPath(agent.x, agent.y, station.standX, station.standY);
      agent.plannedPath = agent.path.map((p) => ({ ...p }));
      agent.socialSpotType = undefined;
      agent.sitBackOverride = undefined;
      agent.sinkDepthOverride = undefined;
      agent.workoutStyle = undefined;
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
        agent.path = planPath(agent.x, agent.y, station.standX, station.standY);
      agent.plannedPath = agent.path.map((p) => ({ ...p }));
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

  const reset = useCallback(() => {
    agentRef.current = [makeInitialAgent(0), makeInitialAgent(1)];
    setTuning(DEFAULT_TUNING);
    setGymTuning(DEFAULT_GYM_TUNING);
    setMiscTuning(DEFAULT_MISC_TUNING);
    setStationIdxByAgent([null, null]);
  }, []);

  // Click-to-direct: send agent 0 walking to a clicked canvas point (arena cohort).
  const walkToPoint = useCallback(
    (canvasX: number, canvasY: number) => {
      const agent = agentRef.current[0];
      if (!agent) return;
      agent.state = "walking";
      agent.targetX = canvasX;
      agent.targetY = canvasY;
      agent.path = planPath(agent.x, agent.y, canvasX, canvasY);
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

  // Switching cohort clears any selection (positions don't line up across cohorts).
  const changeCohort = useCallback((c: Cohort) => {
    agentRef.current = [makeInitialAgent(0), makeInitialAgent(1)];
    setCohort(c);
    setStationIdxByAgent([null, null]);
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
    stations,
    walkToPoint,
  };
}
