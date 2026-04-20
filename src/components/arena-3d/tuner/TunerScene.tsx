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
import {
  ChaseCamController,
  FollowCamController,
  type CamMode,
} from "./CamControllers";
import type { RenderAgentState } from "../useArenaGameLoop";
import type { FurnitureItem } from "../core/types";
import type { WorkoutStyle } from "../core/defaultLayout";
import {
  DEFAULT_ARENA_FURNITURE,
  DESK_STANDING_POINTS,
  SOCIAL_POINTS,
  GYM_WORKOUT_POINTS,
  ARENA_DOOR_X,
  ARENA_DOOR_Y,
  ARENA_DOOR_INSIDE_X,
  ARENA_DOOR_INSIDE_Y,
} from "../core/defaultLayout";
import {
  buildNavGrid,
  astar,
  GRID_CELL,
  GRID_COLS,
  GRID_ROWS,
  type NavGrid,
} from "../core/navigation";

export type Cohort = "seats" | "gym" | "arena" | "misc" | "desks";

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

// Desks cohort — 4×4 grid of desk clusters, agents start pre-seated and
// working. Floor is sized to comfortably hold a 4×4 of desk_cubicle (100×55)
// clusters with chair overhang + breathing room.
const DESKS_CANVAS_W = 3000;
const DESKS_CANVAS_H = 2500;
const DESKS_WORLD_W = DESKS_CANVAS_W * SCALE;
const DESKS_WORLD_H = DESKS_CANVAS_H * SCALE;
const DESKS_GRID_COLS = 4;
const DESKS_GRID_ROWS = 4;
const DESKS_GRID_PITCH_X = 170; // horizontal step between desk origins
const DESKS_GRID_PITCH_Y = 140; // vertical step between desk origins
export const DESKS_AGENT_COUNT = DESKS_GRID_COLS * DESKS_GRID_ROWS;

// ── Tuning params ─────────────────────────────────────────────────────────
// Everything the user can live-tune from the panel.

export interface TuningParams {
  // Rotation of each item (degrees added to item.facing).
  deskRotDeg: number;
  standingDeskRotDeg: number;
  /** Canvas units the agent stands NORTH of the desk's natural anchor.
   *  0 = at the chair position; positive = pushed further forward (toward
   *  the camera in iso view), negative = pulled into the desk. */
  standingDeskDist: number;
  couchRotDeg: number;
  couchVRotDeg: number;
  beanbagRotDeg: number;
  roundTableRotDeg: number;
  plantRotDeg: number;
  tableRectRotDeg: number;
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
  standingDeskRotDeg: 0,
  standingDeskDist: -21,
  couchRotDeg: 0,
  couchVRotDeg: 0,
  beanbagRotDeg: 0,
  roundTableRotDeg: 0,
  plantRotDeg: 0,
  tableRectRotDeg: 0,
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
function rotateItems(items: FurnitureItem[], cx: number, cy: number, deg: number): FurnitureItem[] {
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
const STANDING_DESK_BASE_X = 700;
const STANDING_DESK_BASE_Y = 320;
const COUCH_BASE_X = 650;
const COUCH_BASE_Y = 420;
const COUCHV_BASE_X = 420;
const COUCHV_BASE_Y = 580;
const BEANBAG_BASE_X = 680;
const BEANBAG_BASE_Y = 600;
// Round table — large; placed on bottom-center of the seats floor.
const ROUND_TABLE_BASE_X = 520;
const ROUND_TABLE_BASE_Y = 670;
const ROUND_TABLE_R = 60;
// Plant — small decorative.
const PLANT_BASE_X = 350;
const PLANT_BASE_Y = 720;
const PLANT_W = 24;
const PLANT_H = 24;
// Rectangular side table.
const TABLE_RECT_BASE_X = 760;
const TABLE_RECT_BASE_Y = 700;
const TABLE_RECT_W = 80;
const TABLE_RECT_H = 40;

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
  // Pivot the cluster around a point JUST BEHIND the chair (north of the
  // chair backrest) instead of the desk's geometric center. With the
  // desk-center pivot, the chair sweeps a wide arc as the slider rotates,
  // making it hard to keep the agent's seat anchored in view while tuning
  // the desk's nav box. Pivoting near the chair keeps the chair roughly
  // in place and swings the desk + computer around it.
  const chairCenterX = DESK_BASE_X + deskChairX + 12; // chair w=24 → center +12
  const chairCenterY = DESK_BASE_Y - 10 + 12;
  const pivotX = chairCenterX;
  const pivotY = chairCenterY - 8; // 8 units behind the back of the chair
  clusters.push({
    id: "desk_cluster",
    items: deskClusterItems,
    pivotX,
    pivotY,
    rotDeg: tuning.deskRotDeg,
  });
  const deskStandPre = {
    x: DESK_BASE_X + DESK_W / 2 - 18,
    y: DESK_BASE_Y + 2,
  };
  const deskStandRot = rotatePoint(
    deskStandPre.x,
    deskStandPre.y,
    pivotX,
    pivotY,
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

  // ─ Standing desk cluster (standing_desk + chair + computer) ─────────
  // Same construction as the desk cluster above; type = "standing_desk"
  // means the GLB renders ~1.47× taller and the computer gets an
  // elevation bump (handled in stations.ts → seats cohort copies the rule).
  // Standing desks omit the chair — agents stand at them.
  const standingDeskClusterItems: FurnitureItem[] = [
    {
      type: "standing_desk",
      x: STANDING_DESK_BASE_X,
      y: STANDING_DESK_BASE_Y,
      _uid: "tuner_standing_desk",
      id: "tuner_standing_desk",
    },
    {
      type: "computer",
      x: STANDING_DESK_BASE_X + deskChairX,
      y: STANDING_DESK_BASE_Y - 13,
      // Lift onto the taller standing-desk surface — same value as
      // makeDeskStation in core/stations.ts.
      elevation: 0.4,
      _uid: "tuner_standing_computer",
    },
  ];
  const standingChairCx = STANDING_DESK_BASE_X + deskChairX + 12;
  const standingChairCy = STANDING_DESK_BASE_Y - 10 + 12;
  const standingPivotX = standingChairCx;
  const standingPivotY = standingChairCy - 8;
  clusters.push({
    id: "standing_desk_cluster",
    items: standingDeskClusterItems,
    pivotX: standingPivotX,
    pivotY: standingPivotY,
    rotDeg: tuning.standingDeskRotDeg,
  });
  // Pre-rotation stand point. y is shifted by the distance slider —
  // positive pushes the agent NORTH (further from the desk into the
  // open space in front of it), negative pulls them into the desk.
  const standingDeskStandPre = {
    x: STANDING_DESK_BASE_X + DESK_W / 2 - 18,
    y: STANDING_DESK_BASE_Y + 2 - tuning.standingDeskDist,
  };
  const standingDeskStandRot = rotatePoint(
    standingDeskStandPre.x,
    standingDeskStandPre.y,
    standingPivotX,
    standingPivotY,
    tuning.standingDeskRotDeg
  );
  const standingDeskStation: Station = {
    label: "Standing desk",
    items: standingDeskClusterItems,
    standX: Math.round(standingDeskStandRot.x),
    standY: Math.round(standingDeskStandRot.y),
    facing: (tuning.standingDeskRotDeg * Math.PI) / 180 + Math.PI,
    // "standing_desk" social spot triggers a head tilt-up so the agent
    // looks at the monitor on the taller desk surface.
    state: "standing",
    socialSpotType: "standing_desk",
    sitBack: 0,
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
  const couchFacing = (tuning.couchRotDeg * Math.PI) / 180 + (FURNITURE_ROTATION.couch ?? 0);
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
  const couchVFacing = (tuning.couchVRotDeg * Math.PI) / 180 + (FURNITURE_ROTATION.couch_v ?? 0);
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

  // ─ Round table (prop, not a sit station) ────────────────────────────
  const roundTableItem: FurnitureItem = {
    type: "round_table",
    x: ROUND_TABLE_BASE_X,
    y: ROUND_TABLE_BASE_Y,
    r: ROUND_TABLE_R,
    facing: tuning.roundTableRotDeg,
    _uid: "tuner_round_table",
  };
  const roundTableCx = ROUND_TABLE_BASE_X + ROUND_TABLE_R;
  const roundTableCy = ROUND_TABLE_BASE_Y + ROUND_TABLE_R;
  const roundTableStation: Station = {
    label: "Round table",
    items: [roundTableItem],
    // Stand to the east edge of the table so the agent has somewhere
    // off-mesh to walk to. Round tables are props — no sit pose.
    standX: Math.round(roundTableCx + ROUND_TABLE_R + 20),
    standY: Math.round(roundTableCy),
    facing: -Math.PI / 2,
    state: "standing",
    sitBack: 0,
  };

  // ─ Plant (decorative prop) ──────────────────────────────────────────
  const plantItem: FurnitureItem = {
    type: "plant",
    x: PLANT_BASE_X,
    y: PLANT_BASE_Y,
    facing: tuning.plantRotDeg,
    _uid: "tuner_plant",
  };
  const plantStation: Station = {
    label: "Plant",
    items: [plantItem],
    standX: PLANT_BASE_X + PLANT_W / 2,
    standY: PLANT_BASE_Y + PLANT_H + 30,
    facing: Math.PI,
    state: "standing",
    sitBack: 0,
  };

  // ─ Rectangular side table ───────────────────────────────────────────
  const tableRectItem: FurnitureItem = {
    type: "table_rect",
    x: TABLE_RECT_BASE_X,
    y: TABLE_RECT_BASE_Y,
    w: TABLE_RECT_W,
    h: TABLE_RECT_H,
    facing: tuning.tableRectRotDeg,
    _uid: "tuner_table_rect",
  };
  const tableRectStation: Station = {
    label: "Table (rect)",
    items: [tableRectItem],
    standX: TABLE_RECT_BASE_X + TABLE_RECT_W / 2,
    standY: TABLE_RECT_BASE_Y + TABLE_RECT_H + 30,
    facing: Math.PI,
    state: "standing",
    sitBack: 0,
  };

  const stations = [
    deskStation,
    standingDeskStation,
    couchStation,
    couchVStation,
    beanbagStation,
    roundTableStation,
    plantStation,
    tableRectStation,
  ];
  // Items that live OUTSIDE any cluster group (rendered directly).
  const clusteredUids = new Set(clusters.flatMap((c) => c.items.map((i) => i._uid)));
  const items = stations.flatMap((s) => s.items).filter((i) => !clusteredUids.has(i._uid));
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
  const facingRad = (rotDeg * Math.PI) / 180 + (FURNITURE_ROTATION[cfg.type] ?? 0);
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
  const facingRad = (rotDeg * Math.PI) / 180 + (FURNITURE_ROTATION[cfg.type] ?? 0);
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
    const sitBack = isCouch ? 1.0 : isCouchV ? 1.27 : isBeanbag ? 0.55 : 0;
    const sinkDepth = isCouch ? -2.0 : isCouchV ? 2.0 : isBeanbag ? 14.5 : undefined;
    stations.push({
      label: `${p.type} ${idx}`,
      items: [],
      standX: p.x,
      standY: p.y,
      facing: p.facing ?? 0,
      state: isCouch || isCouchV || isBeanbag ? "sitting" : "standing",
      socialSpotType: isCouch || isCouchV || isBeanbag ? p.type : undefined,
      sitBack,
      sinkDepth,
      // Forward ping-pong pairing metadata so the arrival handler can
      // match up two agents at the same table in the arena cohort.
      pingPongTableUid: p.pingPongTableUid,
      pingPongSide: p.pingPongSide,
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
let __arenaCache: { items: FurnitureItem[]; clusters: ClusterGroup[]; stations: Station[] } | null =
  null;
export function getArenaStations() {
  if (!__arenaCache) __arenaCache = buildArenaStations();
  return __arenaCache;
}

/**
 * Build a 4×4 grid of desk_cubicle clusters (desk + chair + computer) for
 * the "desks" cohort. Every station is identical — no rotation, no tuning,
 * agents start already seated and working. Same cluster geometry as the
 * seats cohort's desk, just replicated across a grid.
 */
export function buildDesksStations(): {
  items: FurnitureItem[];
  clusters: ClusterGroup[];
  stations: Station[];
} {
  const clusters: ClusterGroup[] = [];
  const stations: Station[] = [];

  const gridW = (DESKS_GRID_COLS - 1) * DESKS_GRID_PITCH_X + DESK_W;
  const gridH = (DESKS_GRID_ROWS - 1) * DESKS_GRID_PITCH_Y + DESK_H;
  // toWorld() centers canvas coords around (MAIN_CANVAS_W/2, MAIN_CANVAS_H/2),
  // NOT around the tuner's local canvas size. Center the grid on those coords
  // so world origin sits in the middle of the grid and the floor plane (also
  // centered at world origin) actually covers the agents.
  const originX = MAIN_CANVAS_W / 2 - gridW / 2;
  const originY = MAIN_CANVAS_H / 2 - gridH / 2;
  const deskChairX = DESK_W / 2 - 30;

  for (let row = 0; row < DESKS_GRID_ROWS; row++) {
    for (let col = 0; col < DESKS_GRID_COLS; col++) {
      const idx = row * DESKS_GRID_COLS + col;
      const deskX = originX + col * DESKS_GRID_PITCH_X;
      const deskY = originY + row * DESKS_GRID_PITCH_Y;
      const uid = `desks_${row}_${col}`;

      const clusterItems: FurnitureItem[] = [
        {
          type: "desk_cubicle",
          x: deskX,
          y: deskY,
          _uid: `${uid}_desk`,
          id: `desk_${idx}`,
        },
        {
          type: "chair",
          x: deskX + deskChairX,
          y: deskY - 10,
          facing: 180,
          _uid: `${uid}_chair`,
        },
        {
          type: "computer",
          x: deskX + deskChairX,
          y: deskY - 13,
          _uid: `${uid}_computer`,
        },
      ];

      // Match the seats-cohort pivot convention (just north of chair back);
      // rotDeg is always 0 here since we're not exposing tuning for desks.
      const chairCenterX = deskX + deskChairX + 12;
      const chairCenterY = deskY - 10 + 12;
      clusters.push({
        id: `desks_cluster_${idx}`,
        items: clusterItems,
        pivotX: chairCenterX,
        pivotY: chairCenterY - 8,
        rotDeg: 0,
      });

      const standX = deskX + DESK_W / 2 - 18;
      const standY = deskY + 2;
      stations.push({
        label: `Desk ${idx}`,
        items: clusterItems,
        standX: Math.round(standX),
        standY: Math.round(standY),
        facing: Math.PI, // seated facing south (toward the monitor)
        state: "sitting",
        socialSpotType: "chair",
        sitBack: 0.45,
      });
    }
  }

  return { items: [], clusters, stations };
}

let __desksCache: { items: FurnitureItem[]; clusters: ClusterGroup[]; stations: Station[] } | null =
  null;
export function getDesksStations() {
  if (!__desksCache) __desksCache = buildDesksStations();
  return __desksCache;
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
const TALK_CHANCE_PER_TICK = 0.02; // ≈1.2/s per eligible pair at 60fps
const TALK_MIN_MS = 3_000;
const TALK_MAX_MS = 6_000;

// Standup venues:
//  - Conference (meeting room): top-3 ranked agents stand as speakers at
//    the front, rest stand as listeners in the audience facing them.
//  - Round table (round-table nook): up to 6 agents sit in the chairs
//    facing the round table.
// Coords derived from DEFAULT_ARENA_FURNITURE.
interface StandupSeat {
  x: number;
  y: number;
  facing: number; // radians — chair facing (deg → rad)
}
const _deg = (d: number) => (d * Math.PI) / 180;

// Conference: 3 presenter seats at the meeting-room chairs (chair centers,
// facing south toward the audience). 12 audience spots in two rows further
// south, facing the presenters (north).
const CONFERENCE_PRESENTER_SPOTS: StandupSeat[] = [
  { x: 340 + 12, y: 40 + 12, facing: _deg(0) },
  { x: 400 + 12, y: 40 + 12, facing: _deg(0) },
  { x: 460 + 12, y: 40 + 12, facing: _deg(0) },
];
const CONFERENCE_AUDIENCE_SPOTS: StandupSeat[] = [
  // Row 1 (closer to the front)
  { x: 300, y: 160, facing: _deg(180) },
  { x: 340, y: 160, facing: _deg(180) },
  { x: 380, y: 160, facing: _deg(180) },
  { x: 420, y: 160, facing: _deg(180) },
  { x: 460, y: 160, facing: _deg(180) },
  { x: 500, y: 160, facing: _deg(180) },
  // Row 2 (back of the room)
  { x: 300, y: 195, facing: _deg(180) },
  { x: 340, y: 195, facing: _deg(180) },
  { x: 380, y: 195, facing: _deg(180) },
  { x: 420, y: 195, facing: _deg(180) },
  { x: 460, y: 195, facing: _deg(180) },
  { x: 500, y: 195, facing: _deg(180) },
];
const ROUND_TABLE_SEATS: StandupSeat[] = [
  { x: 348 + 12, y: 503 + 12, facing: _deg(180) },
  { x: 413 + 12, y: 486 + 12, facing: _deg(240) },
  { x: 413 + 12, y: 366 + 12, facing: _deg(300) },
  { x: 348 + 12, y: 343 + 12, facing: _deg(0) },
  { x: 283 + 12, y: 391 + 12, facing: _deg(60) },
  { x: 283 + 12, y: 486 + 12, facing: _deg(120) },
];
// Duration is now sized assuming ~15s of door-bottleneck walk-in for 15
// agents, so min 50s gives ~35s of everyone-seated conference time.
const STANDUP_MIN_MS = 50_000;
const STANDUP_MAX_MS = 90_000;
// Conference speaker rotation: one presenter has an active speech bubble
// at a time; turn rotates every SPEAKER_TURN_MS.
const SPEAKER_TURN_MS = 5_000;

// Random clusters: spontaneous 2–3 agent gatherings anywhere on the
// floor. An eligible anchor agent pulls 1–2 nearby idle agents to
// spokes around them; proximity chat fires naturally once they're
// within range, so no explicit talk logic is needed.
const CLUSTER_CHANCE_PER_POLL = 0.003; // per eligible agent per 500ms poll
const CLUSTER_RADIUS = 55; // canvas units — spoke distance from anchor
const CLUSTER_RANGE = 250; // pull radius — only agents within this range are invited
const CLUSTER_MIN_PEERS = 1;
const CLUSTER_MAX_PEERS = 2;
const CLUSTER_MIN_MS = 10_000;
const CLUSTER_MAX_MS = 20_000;

// Wave-on-pass: when two walkers cross paths within range, one briefly
// raises an arm. Purely cosmetic; no movement hold.
const WAVE_PROXIMITY_PX = 70;
const WAVE_CHANCE_PER_TICK = 0.002;
const WAVE_HOLD_MS = 900;

// Ambient dwell ranges per station type. Applied on ARRIVAL (not pick) so
// slow walks don't eat the dwell budget.
const DWELL_SEAT_MIN_MS = 24_000; // couch / beanbag / chair / desk
const DWELL_SEAT_MAX_MS = 54_000;
const DWELL_GYM_MIN_MS = 24_000;
const DWELL_GYM_MAX_MS = 54_000;
const DWELL_STAND_MIN_MS = 15_000; // coffee / water / fridge / printer / etc.
const DWELL_STAND_MAX_MS = 45_000;

function dwellMsForStation(station: Station | null): number {
  if (!station) return DWELL_STAND_MIN_MS;
  // Ping-pong: dwell = game duration cap + a hair. pingPongUntil will clear
  // at game end and the picker fires naturally once the dwell window is up.
  if (station.pingPongTableUid) return PING_PONG_GAME_MAX_MS + 2_000;
  if (station.state === "sitting") {
    return DWELL_SEAT_MIN_MS + Math.random() * (DWELL_SEAT_MAX_MS - DWELL_SEAT_MIN_MS);
  }
  if (station.state === "working_out") {
    return DWELL_GYM_MIN_MS + Math.random() * (DWELL_GYM_MAX_MS - DWELL_GYM_MIN_MS);
  }
  // standing (default)
  return DWELL_STAND_MIN_MS + Math.random() * (DWELL_STAND_MAX_MS - DWELL_STAND_MIN_MS);
}
// Ball / paddle geometry, ported from Claw3D sceneRuntime's PingPongBall.
const PING_PONG_BALL_RADIUS = 0.06;
const PING_PONG_PADDLE_OFFSET = 18; // canvas units from player → paddle
const PING_PONG_CYCLE_MS = 1200; // full out-and-back loop

// Seats / gym / misc cohorts tune poses for one or two subjects at a time;
// the arena cohort simulates the full office (15 = roughly the main-arena
// top-of-leaderboard size).
// 15 onstage + 3 offstage reserve so "+ join" / "− leave" dev buttons
// always have someone to swap in / out of the arena.
export const ARENA_AGENT_COUNT = 18;
export const ARENA_ONSTAGE_COUNT = 15;

// Door coords live in defaultLayout so the live /leaderboard game loop
// can share them. Re-exported here for backwards compat with any callers
// that were importing from this file.
export {
  ARENA_DOOR_X,
  ARENA_DOOR_Y,
  ARENA_DOOR_INSIDE_X,
  ARENA_DOOR_INSIDE_Y,
} from "../core/defaultLayout";
export const DEFAULT_AGENT_COUNT = 2;
export const getAgentCount = (c: Cohort) =>
  c === "arena"
    ? ARENA_AGENT_COUNT
    : c === "desks"
      ? DESKS_AGENT_COUNT
      : DEFAULT_AGENT_COUNT;

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

export const tunerAgentColor = (idx: number) => AGENT_COLORS[idx % AGENT_COLORS.length];

// Arena-cohort spawn grid: 5 cols × 3 rows centered on the main-floor
// open area, ~50px between agents. Once ambient fires they disperse.
function arenaSpawn(idx: number): { x: number; y: number } {
  const col = idx % 5;
  const row = Math.floor(idx / 5);
  return { x: 500 + col * 50, y: 490 + row * 50 };
}

function makeInitialAgent(idx: number, cohort: Cohort): RenderAgentState {
  // Desks cohort: each agent pre-seated at their assigned desk. Skips the
  // walk-in animation entirely — the scene is meant to read as a full floor
  // of builders already heads-down.
  if (cohort === "desks") {
    const { stations } = getDesksStations();
    const s = stations[idx];
    return {
      id: `tuner_agent_${idx}`,
      name: String.fromCharCode(65 + (idx % 26)),
      rank: idx + 1,
      status: "working",
      color: tunerAgentColor(idx),
      x: s.standX,
      y: s.standY,
      targetX: s.standX,
      targetY: s.standY,
      path: [],
      facing: s.facing,
      // Stagger the frame counter so animations that read `agent.frame`
      // don't all sync — looks less like a puppet show.
      frame: (idx * 37) % 360,
      walkSpeed: WALK_SPEED,
      phaseOffset: (idx * 0.37) % 1,
      state: "sitting",
      socialSpotType: "chair",
      sitBackOverride: s.sitBack,
    };
  }

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
  const walkSpeed = cohort === "arena" ? WALK_SPEED * (0.7 + Math.random() * 0.6) : WALK_SPEED;
  // Arena cohort: first ARENA_ONSTAGE_COUNT agents are visible, remainder
  // start hidden (reserve for "+ join" dev button).
  const hidden = cohort === "arena" && idx >= ARENA_ONSTAGE_COUNT;
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
    hidden,
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
  navOverrides: Record<string, NavAnchorOverride>;
  view: TunerView;
  wallBury: boolean;
  /** Called when the user clicks the floor — used in "arena" cohort to
   *  direct agent 0 to walk to the clicked canvas position. */
  onFloorClick?: (canvasX: number, canvasY: number) => void;
  /** Optional override for the orthographic camera zoom. Lower = more zoomed
   *  out. Defaults to the per-cohort value (arena=42, desks=60, other=50). */
  zoom?: number;
  /** Camera follow mode — when chase/follow, the respective controller
   *  steers the scene camera toward `camAgentIdx`. Defaults to "off". */
  camMode?: CamMode;
  camAgentIdx?: number;
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
  cohort,
}: {
  onFloorClick?: (canvasX: number, canvasY: number) => void;
  cohort: Cohort;
}) {
  const w =
    cohort === "arena" ? ARENA_WORLD_W : cohort === "desks" ? DESKS_WORLD_W : WORLD_W;
  const h =
    cohort === "arena" ? ARENA_WORLD_H : cohort === "desks" ? DESKS_WORLD_H : WORLD_H;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      // BWEffects draws a black edge overlay wherever EdgesGeometry finds a
      // boundary. For a flat plane that's the full perimeter — reads as an
      // unwanted black rectangle around the floor. Opt this mesh out.
      userData={{ __skipBWEdges: true }}
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

function GridLines({ cohort }: { cohort: Cohort }) {
  // Arena + desks cohorts: no grid — matches the main OfficeEnvironment look
  // (arena) and keeps the floor-of-desks scene uncluttered (desks).
  // Seats/gym/misc cohorts keep the visible grid for tuning precision.
  if (cohort === "arena" || cohort === "desks") return null;
  return <gridHelper args={[WORLD_W, 24, "#c9c0ae", "#d4cbb8"]} position={[0, 0.002, 0]} />;
}

function PerimeterWalls({
  large,
  bury = false,
}: {
  large?: boolean;
  bury?: boolean;
}) {
  // Port of OfficeEnvironment.PerimeterWalls — identical thickness + color +
  // dims so paintings that are wallAttached line up against the wall.
  if (!large) return null;
  const wallH = 1.1;
  const halfW = ARENA_WORLD_W / 2;
  const halfH = ARENA_WORLD_H / 2;
  const thickness = WALL_THICKNESS * SCALE;
  const color = "#C9C7C2";
  // Bury-walls mode: extend walls below the floor so BWEffects'
  // bottom-edge overlay is hidden under the floor plane. Off by
  // default = legacy behavior with the outline rectangle visible.
  const BURY = bury ? 0.06 : 0;
  const bodyH = wallH + BURY;
  const bodyCenterY = wallH / 2 - BURY / 2;
  return (
    <>
      <mesh position={[0, bodyCenterY, -halfH]}>
        <boxGeometry args={[ARENA_WORLD_W, bodyH, thickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, bodyCenterY, halfH]}>
        <boxGeometry args={[ARENA_WORLD_W, bodyH, thickness]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-halfW, bodyCenterY, 0]}>
        <boxGeometry args={[thickness, bodyH, ARENA_WORLD_H]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[halfW, bodyCenterY, 0]}>
        <boxGeometry args={[thickness, bodyH, ARENA_WORLD_H]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

/**
 * East-perimeter door where agents join / leave the top 20. Visible only
 * in the arena cohort. Just a recessed plane in the east wall for now —
 * no open/close animation yet.
 */
const DOOR_TRIGGER_PX = 120;     // distance within which the door swings open
const DOOR_OPEN_ANGLE = Math.PI / 2.2; // ~82° — leaf swings inward

function ArenaDoor({
  large,
  agentsRef,
}: {
  large?: boolean;
  agentsRef: React.RefObject<RenderAgentState[]>;
}) {
  const leafRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!leafRef.current) return;
    // Any agent in-transit through the door (leavingToDoor, or just-joined
    // and still walking from the inside-door spawn point) counts.
    const agents = agentsRef.current;
    let closest = Infinity;
    for (const a of agents) {
      if (!a) continue;
      if (a.hidden) continue;
      const d = Math.hypot(a.x - ARENA_DOOR_X, a.y - ARENA_DOOR_Y);
      if (d < closest) closest = d;
    }
    const shouldOpen = closest < DOOR_TRIGGER_PX;
    const target = shouldOpen ? DOOR_OPEN_ANGLE : 0;
    // Smooth rotation lerp — ~0.12 per frame feels like a proper swing.
    leafRef.current.rotation.y +=
      (target - leafRef.current.rotation.y) * 0.12;
  });
  if (!large) return null;
  const [wx, , wz] = toWorld(ARENA_DOOR_X, ARENA_DOOR_Y);
  // Leaf height matches the perimeter wall (wallH = 1.1) so the door
  // doesn't poke above it. Width is ~0.8 (real single-person doorway).
  const doorW = 0.05;          // leaf thickness (x — into/out of wall)
  const doorH = 1.1;           // leaf height (y) — same as PerimeterWalls wallH
  const doorL = 45 * SCALE;    // leaf width along the wall (z)
  const frameThick = 0.12;     // trim around the opening (z-side only)
  const panelInsetY = 0.1;     // panel top/bottom margin inside the leaf
  const panelInsetZ = 0.06;    // panel side margin inside the leaf
  const panelGap = 0.06;       // vertical gap between upper and lower panels
  const handleR = 0.04;
  const wood = "#c9a36b";
  const woodDark = "#8b6a3d";
  const trim = "#2a241c";
  const brass = "#d4b048";
  return (
    <group position={[wx, doorH / 2, wz]}>
      {/* Trim / jamb — same height as the leaf so it doesn't poke above
          the wall. Wider on the z-axis so it reads as a frame around the
          doorway opening. */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.04, doorH, doorL + frameThick * 2]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      {/* Door leaf — pivots around its inside-wall edge so it swings
          inward like a real hinge. The inner mesh is offset back so the
          pivot axis lies on the leaf's edge, not its center. */}
      <group ref={leafRef} position={[-doorW / 2, 0, doorL / 2]}>
        {/* Leaf body */}
        <mesh position={[-0.005, 0, -doorL / 2]}>
          <boxGeometry args={[doorW, doorH, doorL]} />
          <meshStandardMaterial color={wood} />
        </mesh>
        {/* Upper panel — recessed rectangle on the INSIDE face (facing
            into the office when closed). Drawn as a slightly darker,
            thinner box just in front of the leaf face. */}
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.005,
            doorH / 4 + panelGap / 4,
            -doorL / 2,
          ]}
        >
          <boxGeometry
            args={[
              0.015,
              doorH / 2 - panelInsetY - panelGap / 2,
              doorL - panelInsetZ * 2,
            ]}
          />
          <meshStandardMaterial color={woodDark} />
        </mesh>
        {/* Lower panel */}
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.005,
            -doorH / 4 - panelGap / 4,
            -doorL / 2,
          ]}
        >
          <boxGeometry
            args={[
              0.015,
              doorH / 2 - panelInsetY - panelGap / 2,
              doorL - panelInsetZ * 2,
            ]}
          />
          <meshStandardMaterial color={woodDark} />
        </mesh>
        {/* Handle — small brass knob near the free edge of the leaf
            (opposite the hinge), at roughly waist height. */}
        <mesh
          position={[
            -0.005 - doorW / 2 - 0.02,
            -0.05,
            -doorL + panelInsetZ + 0.04,
          ]}
        >
          <sphereGeometry args={[handleR, 10, 8]} />
          <meshStandardMaterial
            color={brass}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
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
  const ballRefs = useRef<Array<THREE.Mesh | null>>(Array.from({ length: POOL }, () => null));
  const shadowRefs = useRef<Array<THREE.Mesh | null>>(Array.from({ length: POOL }, () => null));

  useFrame(() => {
    const now = Date.now();
    const agents = agentsRef.current ?? [];
    // Group active players by tableUid.
    const byTable = new Map<string, { A?: RenderAgentState; B?: RenderAgentState }>();
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
  showArrow = true,
}: {
  agentRef: React.RefObject<RenderAgentState[]>;
  agentIdx: number;
  color: string;
  /** Hide the facing-direction cone. Arena cohort uses this for a clean
   *  deployment look; tuning cohorts keep the arrow for debugging. */
  showArrow?: boolean;
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
      {showArrow && (
        <mesh ref={arrowRef}>
          <coneGeometry args={[0.05, 0.3, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, blockedCells.length]}>
      <planeGeometry args={[cellWorld, cellWorld]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.28} depthWrite={false} />
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
  cohort,
}: {
  stations: Station[];
  stationIdxByAgent: (number | null)[];
  agentRef: React.RefObject<RenderAgentState[]>;
  showPaths: boolean;
  showNav: boolean;
  navGrid: NavGrid;
  cohort: Cohort;
}) {
  const agentCount = stationIdxByAgent.length;
  // Arena cohort is the deploy-ready view — no facing cones for agents
  // or stations. Other cohorts keep them for tuning.
  const showArrows = cohort !== "arena";
  return (
    <>
      {showNav && <NavGridOverlay grid={navGrid} />}
      {Array.from({ length: agentCount }).map((_, i) => (
        <AgentDebugMarker
          key={`marker_${i}`}
          agentRef={agentRef}
          agentIdx={i}
          color={tunerAgentColor(i)}
          showArrow={showArrows}
        />
      ))}
      {showPaths &&
        Array.from({ length: agentCount }).map((_, i) => (
          <AgentPathLine key={`path_${i}`} agentRef={agentRef} agentIdx={i} />
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
            {showArrows && (
              <mesh
                position={[tx + dirX * 0.2, 0.05, tz + dirZ * 0.2]}
                rotation={[0, station.facing, 0]}
              >
                <coneGeometry args={[0.05, 0.3, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.55} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

export type TunerView = "iso" | "top";

function CameraRig({ zoom, view }: { zoom: number; view: TunerView }) {
  const { camera } = useThree();
  useEffect(() => {
    if (view === "top") {
      // Straight-down ortho. Slight +z tilt keeps the drei Billboard labels
      // (agent nameplates, station markers) readable instead of edge-on.
      camera.position.set(0, 20, 0.0001);
    } else {
      camera.position.set(8, 10, 10);
    }
    // Target the scene's vertical midpoint (half wall height = 0.55) instead
    // of the floor plane, so walls + furniture + agents — the visual mass —
    // sit centered on screen instead of pushed upward.
    camera.lookAt(0, 0.55, 0);
    type OrthoCam = typeof camera & { zoom: number };
    (camera as OrthoCam).zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, zoom, view]);
  return null;
}

/**
 * Post-render arm override for the desks cohort. The chair/couch pose in
 * AgentCharacter is static — legs bent, arms resting. To read as "working"
 * we find every agent's arm groups (y=68, x=±14 in agent-local coords)
 * and overwrite their rotations each frame with two uncorrelated sines
 * per arm. Phase-offset by arm index so the crowd doesn't type in lockstep.
 *
 * Must mount AFTER <AgentCharacter> in the render tree so its useFrame
 * runs later in the same frame and its rotations land last.
 */
function DesksArmFlail() {
  const { scene } = useThree();
  const armsRef = useRef<THREE.Object3D[]>([]);

  useFrame((state) => {
    if (armsRef.current.length < DESKS_AGENT_COUNT * 2) {
      const found: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if (obj.type !== "Group") return;
        if (Math.abs(obj.position.y - 68) > 0.1) return;
        if (Math.abs(Math.abs(obj.position.x) - 14) < 0.1) found.push(obj);
      });
      armsRef.current = found;
    }
    const t = state.clock.elapsedTime;
    for (let i = 0; i < armsRef.current.length; i++) {
      const arm = armsRef.current[i];
      const isLeft = arm.position.x < 0;
      // Per-arm phase so arms across the grid don't sync.
      const phase = i * 0.47;
      const primary = isLeft
        ? Math.sin(t * 7.6 + phase)
        : Math.cos(t * 6.9 + phase);
      const secondary = isLeft
        ? Math.sin(t * 4.1 + phase)
        : Math.cos(t * 4.3 + phase);
      arm.rotation.x = -0.4 + primary * 0.55;
      arm.rotation.z = (isLeft ? 0.25 : -0.25) + secondary * (isLeft ? 0.2 : -0.2);
    }
  });

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
      // Dance hold expiry — restore standing state so the agent rejoins
      // idle behavior (ambient picker / talk triggers) after the dance.
      if (a.danceUntil !== undefined && a.danceUntil <= now) {
        a.danceUntil = undefined;
        if (a.state === "dancing") a.state = "standing";
      }
      // Standup expiry — both flavors release the agent to idle. Round-
      // table participants were sitting (chair pose); conference participants
      // were just standing, so only the pose reset differs.
      if (a.standupUntil !== undefined && a.standupUntil <= now) {
        a.standupUntil = undefined;
        a.conferenceRole = undefined;
        a.lookAtX = undefined;
        a.lookAtY = undefined;
        a.lookAtAgentId = undefined;
        a.lookAtUntil = undefined;
        if (a.state === "sitting" && a.socialSpotType === "chair") {
          a.state = "standing";
          a.socialSpotType = undefined;
          a.sitBackOverride = undefined;
          a.sinkDepthOverride = undefined;
        }
      }
      // Glance hold expiry — clear lookAt fields so the head decays back
      // to neutral. Standup lookAts don't set lookAtUntil, so they're
      // unaffected by this sweep.
      if (a.lookAtUntil !== undefined && a.lookAtUntil <= now) {
        a.lookAtUntil = undefined;
        a.lookAtAgentId = undefined;
        a.lookAtX = undefined;
        a.lookAtY = undefined;
      }
      // Cluster / wave expiries.
      if (a.clusterUntil !== undefined && a.clusterUntil <= now) {
        a.clusterUntil = undefined;
      }
      if (a.waveUntil !== undefined && a.waveUntil <= now) {
        a.waveUntil = undefined;
      }
    }

    // Conference speaker rotation: while a conference is active, exactly
    // one speaker has a refreshed talkUntil so their bubble stays visible.
    // Rotation window is SPEAKER_TURN_MS, keyed off wall clock so it's
    // deterministic across ticks and agents. Listeners' heads swivel to
    // look at whoever's currently speaking; non-active speakers stand
    // still facing the audience (no head swivel).
    const speakers = agentRef.current.filter(
      (a): a is RenderAgentState =>
        !!a && a.conferenceRole === "speaker" && (a.standupUntil ?? 0) > now
    );
    if (speakers.length > 0) {
      speakers.sort((x, y) => x.id.localeCompare(y.id));
      const turn = Math.floor(now / SPEAKER_TURN_MS) % speakers.length;
      const activeSpeaker = speakers[turn];
      activeSpeaker.talkUntil = now + 500;
      // Active speaker: no head swivel — face the audience straight on.
      // Non-active speakers: swivel their head toward the active speaker,
      // same as the audience does.
      for (const s of speakers) {
        if (s === activeSpeaker) {
          s.lookAtX = undefined;
          s.lookAtY = undefined;
        } else {
          s.lookAtX = activeSpeaker.x;
          s.lookAtY = activeSpeaker.y;
        }
      }
      for (const a of agentRef.current) {
        if (!a) continue;
        if (a.conferenceRole !== "listener") continue;
        if ((a.standupUntil ?? 0) <= now) continue;
        a.lookAtX = activeSpeaker.x;
        a.lookAtY = activeSpeaker.y;
      }
    }

    // Round-table speaker rotation: pick one seated participant per
    // SPEAKER_TURN_MS window, set their talkUntil, and point every OTHER
    // participant's head (not body — body stays on the chair) at them.
    const tableSitters = agentRef.current.filter(
      (a): a is RenderAgentState =>
        !!a &&
        a.conferenceRole === undefined &&
        (a.standupUntil ?? 0) > now &&
        a.state === "sitting" &&
        a.socialSpotType === "chair"
    );
    if (tableSitters.length > 1) {
      tableSitters.sort((x, y) => x.id.localeCompare(y.id));
      const turn = Math.floor(now / SPEAKER_TURN_MS) % tableSitters.length;
      const speaker = tableSitters[turn];
      speaker.talkUntil = now + 500;
      speaker.lookAtX = undefined;
      speaker.lookAtY = undefined;
      for (const a of tableSitters) {
        if (a === speaker) continue;
        a.lookAtX = speaker.x;
        a.lookAtY = speaker.y;
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
      if (a.hidden) continue;
      if (a.state === "walking" || a.state === "working_out") continue;
      if (a.talkUntil !== undefined && a.talkUntil > now) continue;
      if (a.pingPongUntil !== undefined && a.pingPongUntil > now) continue;
      // Standup participants are in a structured hold (conference or round
      // table) — the speaker-turn logic drives their bubbles. Skip so the
      // proximity roll doesn't cross-talk across the audience.
      if ((a.standupUntil ?? 0) > now) continue;
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        if (!b) continue;
        if (b.hidden) continue;
        if (b.state === "walking" || b.state === "working_out") continue;
        if (b.talkUntil !== undefined && b.talkUntil > now) continue;
        if (b.pingPongUntil !== undefined && b.pingPongUntil > now) continue;
        if ((b.standupUntil ?? 0) > now) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.hypot(dx, dy) > TALK_PROXIMITY_PX) continue;
        if (Math.random() > TALK_CHANCE_PER_TICK * speedScale) continue;
        const duration = TALK_MIN_MS + Math.random() * (TALK_MAX_MS - TALK_MIN_MS);
        a.talkUntil = now + duration;
        b.talkUntil = now + duration;
        a.talkPartnerId = b.id;
        b.talkPartnerId = a.id;
        // Only standing agents rotate to face each other. Sitting agents
        // keep their station pose — flipping a seated agent mid-sit leaves
        // the sit-back / sink-depth offsets projected from a new facing and
        // they end up floating off the couch.
        if (a.state === "standing") a.facing = Math.atan2(dx, dy);
        if (b.state === "standing") b.facing = Math.atan2(-dx, -dy);
      }
    }

    // Wave-on-pass: two walkers within WAVE_PROXIMITY_PX roll a small
    // chance to trigger a one-sided arm wave. Purely cosmetic; both
    // keep walking through the animation.
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a || a.hidden || a.state !== "walking") continue;
      if ((a.waveUntil ?? 0) > now) continue;
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        if (!b || b.hidden || b.state !== "walking") continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.hypot(dx, dy) > WAVE_PROXIMITY_PX) continue;
        if (Math.random() > WAVE_CHANCE_PER_TICK * speedScale) continue;
        // Random side: ~50/50 who waves.
        if (Math.random() < 0.5) {
          a.waveUntil = now + WAVE_HOLD_MS;
        } else {
          b.waveUntil = now + WAVE_HOLD_MS;
        }
        break; // one wave per tick per anchor
      }
    }

    // Head-turn-to-watch: idle agents occasionally glance at a nearby
    // walker. Reuses the head-only lookAt mechanism (body facing stays
    // put) and holds the glance via lookAtUntil so the sweep auto-clears.
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a || a.hidden) continue;
      if (a.state === "walking") continue;
      if (a.state === "working_out") continue;
      if (a.state === "dancing") continue;
      if ((a.standupUntil ?? 0) > now) continue;
      if ((a.pingPongUntil ?? 0) > now) continue;
      if (a.pingPongTableUid) continue;
      if ((a.lookAtUntil ?? 0) > now) continue;
      if (Math.random() > 0.003 * speedScale) continue;
      let bestIdx = -1;
      let bestDist = 120;
      for (let j = 0; j < agents.length; j++) {
        if (j === i) continue;
        const b = agents[j];
        if (!b || b.hidden || b.state !== "walking") continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) continue;
      const target = agents[bestIdx]!;
      a.lookAtAgentId = target.id;
      a.lookAtX = target.x;
      a.lookAtY = target.y;
      a.lookAtUntil = now + 1500 + Math.random() * 1000;
    }

    for (let agentIdx = 0; agentIdx < agentRef.current.length; agentIdx++) {
      const agent = agentRef.current[agentIdx];
      if (!agent) continue;
      const stationIdx = stationIdxByAgent[agentIdx] ?? null;
      const activeStation = stationIdx !== null ? stations[stationIdx] : null;

      if (
        activeStation &&
        (agent.state === "sitting" || agent.state === "working_out" || agent.state === "standing")
      ) {
        agent.sitBackOverride = activeStation.sitBack;
        agent.sinkDepthOverride = activeStation.sinkDepth;
        agent.workoutStyle = activeStation.workoutStyle;
        // Skip station-facing lock only for standing agents mid-chat —
        // they've been rotated to face their partner and we don't want to
        // snap them back. Sitting agents keep their station pose regardless.
        const talking = agent.talkUntil !== undefined && agent.talkUntil > now;
        if (!(talking && agent.state === "standing")) {
          agent.facing = activeStation.facing;
        }
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
              if (activeStation.pingPongTableUid && activeStation.pingPongSide) {
                agent.pingPongTableUid = activeStation.pingPongTableUid;
                agent.pingPongSide = activeStation.pingPongSide;
                const partner = agentRef.current.find(
                  (a) =>
                    a !== agent &&
                    a.pingPongTableUid === activeStation.pingPongTableUid &&
                    a.pingPongSide !== activeStation.pingPongSide
                );
                if (partner) {
                  const duration =
                    PING_PONG_GAME_MIN_MS +
                    Math.random() * (PING_PONG_GAME_MAX_MS - PING_PONG_GAME_MIN_MS);
                  agent.pingPongUntil = now + duration;
                  partner.pingPongUntil = now + duration;
                }
              }
            } else if (agent.leavingToDoor) {
              // Arrived at the door with leave intent — hide them. Ambient
              // picker / every other loop now skips them until a "+ join"
              // dev click brings them back.
              agent.hidden = true;
              agent.leavingToDoor = false;
              agent.state = "standing";
              agent.socialSpotType = undefined;
              agent.sitBackOverride = undefined;
              agent.sinkDepthOverride = undefined;
            } else if (agent.standupUntil !== undefined && agent.standupUntil > now) {
              // Arrived at a standup stand-point. Conference speakers sit
              // in the meeting-room chairs; conference listeners stand in
              // the audience rows; round-table participants sit in their
              // chairs.
              if (agent.conferenceRole === "listener") {
                agent.state = "standing";
                agent.socialSpotType = undefined;
                agent.sitBackOverride = undefined;
                agent.sinkDepthOverride = undefined;
              } else {
                // "speaker" and round-table (undefined role) both sit.
                agent.state = "sitting";
                agent.socialSpotType = "chair";
                agent.sitBackOverride = 0.45;
                agent.sinkDepthOverride = 0.3;
              }
              if (agent.targetFacing !== undefined) {
                agent.facing = agent.targetFacing;
                agent.targetFacing = undefined;
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
  navOverrides,
  view,
  wallBury,
  onFloorClick,
  zoom,
  camMode = "off",
  camAgentIdx = 0,
}: TunerSceneProps) {
  const { items, clusters, stations } = useMemo(() => {
    if (cohort === "gym") return buildGymStations(gymTuning);
    if (cohort === "arena") return getArenaStations();
    if (cohort === "misc") return buildMiscStations(miscTuning);
    if (cohort === "desks") return getDesksStations();
    return buildStations(tuning);
  }, [cohort, tuning, gymTuning, miscTuning]);
  const navGrid = useMemo(() => {
    const allItems = [...items, ...clusters.flatMap((c) => c.items)];
    return buildNavGrid(allItems, navOverrides);
  }, [items, clusters, navOverrides]);
  const large = cohort === "arena";
  const isDesks = cohort === "desks";
  // Camera zoom — arena is the biggest floor; desks cohort is mid-size
  // (4×4 grid needs more room than a single tuning seat but less than the
  // full arena). Tune zoom so the whole grid fits comfortably.
  const cameraZoom = zoom ?? (large ? 42 : isDesks ? 60 : 50);

  return (
    <Canvas
      orthographic
      shadows
      camera={{ near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ background: "#FDFCFC" }}
      frameloop="always"
    >
      {/* Without a scene background colour, three.js clears to black and
          the floor plane doesn't cover every pixel of the canvas at some
          camera angles — producing a dark border around the scene. This
          matches the CSS background so the seam disappears. */}
      <color attach="background" args={["#FDFCFC"]} />
      <Suspense fallback={null}>
        <CameraRig zoom={cameraZoom} view={view} />
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight position={[10, 15, 8]} intensity={1.0} color="#ffffff" castShadow />
        <hemisphereLight args={["#ffffff", "#e0e0e0", 0.4]} />

        <Floor onFloorClick={onFloorClick} cohort={cohort} />
        <GridLines cohort={cohort} />
        <PerimeterWalls large={large} bury={wallBury} />
        <ArenaDoor large={large} agentsRef={agentRef} />

        {items.map((item) => {
          if (item.type === "wall") {
            return <InteriorWall key={item._uid} item={item} bury={wallBury} />;
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

        <PingPongBalls agentsRef={agentRef} arcHeight={miscTuning.pingPongArcHeight} />

        {/* Desks cohort: drive agent arms every frame so they read as
            "working" instead of stiff-armed in the default chair pose.
            Must mount after the AgentCharacter list so its useFrame runs
            later in the same render pass and wins the rotation write. */}
        {isDesks && <DesksArmFlail />}

        <DebugMarkers
          stations={stations}
          stationIdxByAgent={stationIdxByAgent}
          agentRef={agentRef}
          showPaths={showPaths}
          showNav={showNav}
          navGrid={navGrid}
          cohort={cohort}
        />
        <TickLoop agentRef={agentRef} stations={stations} stationIdxByAgent={stationIdxByAgent} />

        {/* Camera follow controllers — only one is ever active at a time,
            per `camMode`. */}
        <ChaseCamController mode={camMode} agentIdx={camAgentIdx} agentRef={agentRef} />
        <FollowCamController mode={camMode} agentIdx={camAgentIdx} agentRef={agentRef} />

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

export function useTunerAgent(opts?: {
  initialCohort?: Cohort;
  initialAmbientAll?: boolean;
}) {
  const initialCohort: Cohort = opts?.initialCohort ?? "seats";
  const initialAmbientAll = opts?.initialAmbientAll ?? false;
  const [cohort, setCohort] = useState<Cohort>(initialCohort);
  const agentRef = useRef<RenderAgentState[]>(makeInitialAgents(initialCohort));
  const [stationIdxByAgent, setStationIdxByAgent] = useState<(number | null)[]>(() =>
    Array(getAgentCount(initialCohort)).fill(null)
  );
  const [tuning, setTuning] = useState<TuningParams>(DEFAULT_TUNING);
  const [gymTuning, setGymTuning] = useState<GymTuningParams>(DEFAULT_GYM_TUNING);
  const [miscTuning, setMiscTuning] = useState<MiscTuningParams>(DEFAULT_MISC_TUNING);
  const [showPaths, setShowPaths] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [view, setView] = useState<TunerView>("iso");
  // Bury-walls mode hides the black floor-rectangle outline by sinking
  // wall bottoms under the floor plane. Default off = legacy look.
  const [wallBury, setWallBury] = useState(false);
  // Camera follow mode — "off" keeps the default ortho iso, "chase" lerps
  // the ortho camera's lookAt toward the selected agent, "follow" swaps in
  // a perspective orbit camera parked around the agent.
  const [camMode, setCamMode] = useState<CamMode>("off");
  const [camAgentIdx, setCamAgentIdx] = useState(0);
  // Per-type nav-anchor overrides — sliders write into this; buildNavGrid
  // applies them at grid-build time. Empty by default = use NAV_ANCHOR_OVERRIDES
  // from geometry.ts (which itself is empty until we lock values in).
  const [navOverrides, setNavOverrides] = useState<Record<string, NavAnchorOverride>>({});
  // Ambient mode per agent: when on, the agent autonomously picks a new
  // random station every 6–12s once it's settled. Picking a specific
  // station from the dropdown or hitting stop turns ambient off for that
  // agent. Switching cohort / reset also clears ambient.
  const [ambientByAgent, setAmbientByAgent] = useState<boolean[]>(() =>
    Array(getAgentCount(initialCohort)).fill(initialAmbientAll)
  );
  // Mirror setAmbientForAll(true) behavior: stagger first-pick times 250ms
  // apart so 15 agents don't all route on the same tick from adjacent spawn
  // cells. Without this, initialAmbientAll=true races and agents cross paths.
  const ambientNextAtRef = useRef<number[]>(
    Array(getAgentCount(initialCohort))
      .fill(0)
      .map((_, i) => (initialAmbientAll ? Date.now() + i * 250 : 0)),
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
    if (cohort === "desks") return getDesksStations();
    return buildStations(tuning);
  }, [cohort, tuning, gymTuning, miscTuning]);

  // Nav grid for collision-aware A* pathing. Rebuilt when cohort items or
  // per-type overrides change.
  const navGrid = useMemo(() => {
    const allItems = [...items, ...clusters.flatMap((c) => c.items)];
    return buildNavGrid(allItems, navOverrides);
  }, [items, clusters, navOverrides]);

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
        agent.standupUntil = undefined;
        agent.conferenceRole = undefined;
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
      agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
      agent.plannedPathRouted = plan.routed;
      agent.socialSpotType = undefined;
      agent.sitBackOverride = undefined;
      agent.sinkDepthOverride = undefined;
      agent.workoutStyle = undefined;
      // Clear any prior ping-pong pairing — they'll be re-set on arrival if
      // the new station is itself a ping-pong slot. Also clear standup
      // fields so user overrides / beckon interruptions don't leave ghost
      // conference state.
      agent.pingPongTableUid = undefined;
      agent.pingPongSide = undefined;
      agent.pingPongUntil = undefined;
      agent.standupUntil = undefined;
      agent.conferenceRole = undefined;
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
        agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
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

  const setAmbientForAgent = useCallback((agentIdx: number, on: boolean) => {
    setAmbientByAgent((prev) => {
      const next = [...prev];
      next[agentIdx] = on;
      return next;
    });
    // Fire the first ambient pick immediately when turning on.
    if (on) ambientNextAtRef.current[agentIdx] = 0;
  }, []);

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
      const agents = agentRef.current;

      // Random clusters: occasionally pick an eligible anchor and pull
      // 1–2 nearby idle agents to spokes around them. Proximity chat takes
      // over once they're in range, so no explicit talk logic needed here.
      const eligibleForCluster = (a: RenderAgentState | undefined): boolean => {
        if (!a) return false;
        if (a.hidden) return false;
        if (a.state === "walking") return false;
        if ((a.standupUntil ?? 0) > now) return false;
        if ((a.clusterUntil ?? 0) > now) return false;
        if ((a.gymUntil ?? 0) > now) return false;
        if ((a.couchUntil ?? 0) > now) return false;
        if ((a.pingPongUntil ?? 0) > now) return false;
        if (a.pingPongTableUid) return false;
        if ((a.danceUntil ?? 0) > now) return false;
        if ((a.talkUntil ?? 0) > now) return false;
        return true;
      };
      for (let ai = 0; ai < agents.length; ai++) {
        const anchor = agents[ai];
        if (!ambientByAgent[ai]) continue;
        if (!eligibleForCluster(anchor)) continue;
        if (Math.random() > CLUSTER_CHANCE_PER_POLL) continue;
        // Collect nearest eligible peers within CLUSTER_RANGE.
        const peerIdxs: number[] = [];
        for (let pi = 0; pi < agents.length; pi++) {
          if (pi === ai) continue;
          if (!ambientByAgent[pi]) continue;
          const peer = agents[pi];
          if (!eligibleForCluster(peer)) continue;
          const d = Math.hypot(peer!.x - anchor!.x, peer!.y - anchor!.y);
          if (d > CLUSTER_RANGE) continue;
          peerIdxs.push(pi);
        }
        if (peerIdxs.length < CLUSTER_MIN_PEERS) continue;
        // Pick 1–2 nearest peers.
        peerIdxs.sort((a, b) => {
          const aa = agents[a]!;
          const bb = agents[b]!;
          return (
            Math.hypot(aa.x - anchor!.x, aa.y - anchor!.y) -
            Math.hypot(bb.x - anchor!.x, bb.y - anchor!.y)
          );
        });
        const peerCount = Math.min(
          peerIdxs.length,
          CLUSTER_MIN_PEERS +
            Math.floor(Math.random() * (CLUSTER_MAX_PEERS - CLUSTER_MIN_PEERS + 1))
        );
        const chosen = peerIdxs.slice(0, peerCount);
        const duration = CLUSTER_MIN_MS + Math.random() * (CLUSTER_MAX_MS - CLUSTER_MIN_MS);
        // Anchor stays put. Peers walk to spokes around the anchor.
        anchor!.clusterUntil = now + duration;
        anchor!.state = "standing";
        chosen.forEach((pi, k) => {
          const peer = agents[pi]!;
          // Distribute spokes evenly around the anchor.
          const angle = (k / chosen.length) * Math.PI * 2 + Math.random() * 0.4;
          const spokeX = anchor!.x + Math.sin(angle) * CLUSTER_RADIUS;
          const spokeY = anchor!.y + Math.cos(angle) * CLUSTER_RADIUS;
          const plan = planPath(peer.x, peer.y, spokeX, spokeY);
          peer.state = "walking";
          peer.path = plan.waypoints;
          peer.plannedPath = [{ x: peer.x, y: peer.y }, ...plan.waypoints.map((p) => ({ ...p }))];
          peer.plannedPathRouted = plan.routed;
          peer.targetX = spokeX;
          peer.targetY = spokeY;
          peer.targetFacing = Math.atan2(anchor!.x - spokeX, anchor!.y - spokeY);
          peer.clusterUntil = now + duration;
          peer.socialSpotType = undefined;
          peer.sitBackOverride = undefined;
          peer.sinkDepthOverride = undefined;
          peer.workoutStyle = undefined;
          ambientNextAtRef.current[pi] = Infinity;
          setStationIdxByAgent((prev) => {
            const next = [...prev];
            next[pi] = null;
            return next;
          });
        });
        // Anchor also clears its station idx so the ambient picker leaves
        // them alone.
        setStationIdxByAgent((prev) => {
          const next = [...prev];
          next[ai] = null;
          return next;
        });
        ambientNextAtRef.current[ai] = Infinity;
      }

      // Ping-pong beckon: if an agent is standing alone at a table (claimed
      // a side, no partner yet, no active game) and the other side is empty,
      // redirect any nearby idle ambient agent to come play. Makes pairs form
      // without waiting for two independent random picks to collide.
      for (const waiter of agents) {
        if (!waiter) continue;
        if (!waiter.pingPongTableUid || !waiter.pingPongSide) continue;
        if (waiter.pingPongUntil !== undefined && waiter.pingPongUntil > now) continue; // already in a game
        if (waiter.state === "walking") continue; // still arriving
        const needSide = waiter.pingPongSide === "A" ? "B" : "A";
        const targetIdx = stations.findIndex(
          (s) => s.pingPongTableUid === waiter.pingPongTableUid && s.pingPongSide === needSide
        );
        if (targetIdx < 0) continue;
        // Bail if someone's already claimed or walking to the other side.
        const inbound = agents.some(
          (a) =>
            a !== waiter &&
            a.pingPongTableUid === waiter.pingPongTableUid &&
            a.pingPongSide === needSide
        );
        if (inbound) continue;
        const alreadyHeaded = stationIdxByAgentRef.current.includes(targetIdx);
        if (alreadyHeaded) continue;
        // Pick a candidate: ambient-on, idle, no holds, not at another ping-
        // pong table. First match wins.
        for (let i = 0; i < agents.length; i++) {
          const cand = agents[i];
          if (!cand || cand === waiter) continue;
          if (cand.hidden) continue;
          if (!ambientByAgent[i]) continue;
          if (cand.state === "walking") continue;
          if (cand.pingPongTableUid) continue;
          if ((cand.gymUntil ?? 0) > now) continue;
          if ((cand.couchUntil ?? 0) > now) continue;
          if ((cand.talkUntil ?? 0) > now) continue;
          // Don't pull attendees out of an active standup / conference.
          if ((cand.standupUntil ?? 0) > now) continue;
          if ((cand.clusterUntil ?? 0) > now) continue;
          sendToStation(i, targetIdx);
          ambientNextAtRef.current[i] = Infinity;
          break;
        }
      }

      for (let i = 0; i < ambientByAgent.length; i++) {
        if (!ambientByAgent[i]) continue;
        const agent = agentRef.current[i];
        if (!agent) continue;
        if (agent.hidden) continue;
        if (agent.state === "walking") continue;
        // Standup participants are in a structured 30–75s hold — leave
        // them alone until standupUntil expires. Without this the
        // arrival-dwell (default 15s for a null station) would fire and
        // redirect them mid-conference.
        if ((agent.standupUntil ?? 0) > now) continue;
        // Same for random-cluster participants.
        if ((agent.clusterUntil ?? 0) > now) continue;

        // Arrival detection: nextAt was set to Infinity at pick-time so the
        // picker wouldn't re-fire mid-walk. Once the agent is no longer
        // walking, compute the real per-station-type dwell and start it now.
        if (!Number.isFinite(ambientNextAtRef.current[i])) {
          const selfIdx = stationIdxByAgentRef.current[i];
          const arrivedAt = selfIdx !== null ? stations[selfIdx] : null;
          ambientNextAtRef.current[i] = now + dwellMsForStation(arrivedAt);
          continue;
        }
        if (now < ambientNextAtRef.current[i]) continue;

        // Dwell expired → pick a new station. Exclude self + every other
        // agent's current / in-transit station so no two pile up.
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
        // Pause timer until they actually arrive — real dwell starts then.
        ambientNextAtRef.current[i] = Infinity;
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

  // "+ join": find the first hidden agent, teleport them to the east
  // door position, clear hidden flag, then walk them to a random roam
  // point inside the arena. They're instantly visible at the door and
  // walk into the office.
  const triggerJoin = useCallback((): boolean => {
    const agents = agentRef.current;
    let idx = -1;
    for (let i = 0; i < agents.length; i++) {
      if (agents[i]?.hidden) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return false;
    const agent = agents[idx];
    if (!agent) return false;
    agent.hidden = false;
    agent.leavingToDoor = false;
    // Teleport to door, clear holds, walk to a random destination inside.
    agent.x = ARENA_DOOR_INSIDE_X;
    agent.y = ARENA_DOOR_INSIDE_Y;
    agent.targetX = ARENA_DOOR_INSIDE_X;
    agent.targetY = ARENA_DOOR_INSIDE_Y;
    agent.facing = Math.PI; // face west, into the office
    // Walk to the center of the main floor (same spawn-grid area new
    // arena agents use) via A*.
    const dest = arenaSpawn(idx % ARENA_ONSTAGE_COUNT);
    const plan = planPath(agent.x, agent.y, dest.x, dest.y);
    agent.state = "walking";
    agent.path = plan.waypoints;
    agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
    agent.plannedPathRouted = plan.routed;
    agent.targetX = dest.x;
    agent.targetY = dest.y;
    agent.status = "idle";
    agent.state = "walking";
    // Clear any ghost holds the agent was carrying while offstage.
    agent.couchUntil = undefined;
    agent.gymUntil = undefined;
    agent.pingPongUntil = undefined;
    agent.pingPongTableUid = undefined;
    agent.pingPongSide = undefined;
    agent.standupUntil = undefined;
    agent.conferenceRole = undefined;
    agent.clusterUntil = undefined;
    agent.talkUntil = undefined;
    agent.socialSpotType = undefined;
    agent.sitBackOverride = undefined;
    agent.sinkDepthOverride = undefined;
    ambientNextAtRef.current[idx] = Infinity;
    setStationIdxByAgent((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    return true;
  }, [planPath]);

  // "− leave": pick an eligible onstage agent, walk them to the door
  // with leavingToDoor=true. The arrival branch in the tick loop flips
  // them to hidden.
  const triggerLeave = useCallback((): boolean => {
    const agents = agentRef.current;
    const now = Date.now();
    // Prefer agents who aren't in the middle of a structured hold.
    const candidates: number[] = [];
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (!a || a.hidden) continue;
      if ((a.standupUntil ?? 0) > now) continue;
      if ((a.danceUntil ?? 0) > now) continue;
      if ((a.pingPongUntil ?? 0) > now) continue;
      if ((a.gymUntil ?? 0) > now) continue;
      if (a.leavingToDoor) continue;
      candidates.push(i);
    }
    if (candidates.length === 0) return false;
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    const agent = agents[idx];
    if (!agent) return false;
    // Clear any ambient / cluster state so nothing pulls them elsewhere
    // on the way out.
    agent.clusterUntil = undefined;
    agent.talkUntil = undefined;
    agent.talkPartnerId = undefined;
    agent.couchUntil = undefined;
    agent.socialSpotType = undefined;
    agent.sitBackOverride = undefined;
    agent.sinkDepthOverride = undefined;
    agent.lookAtX = undefined;
    agent.lookAtY = undefined;
    agent.lookAtAgentId = undefined;
    agent.lookAtUntil = undefined;
    agent.leavingToDoor = true;
    const plan = planPath(agent.x, agent.y, ARENA_DOOR_INSIDE_X, ARENA_DOOR_INSIDE_Y);
    agent.state = "walking";
    agent.path = plan.waypoints;
    agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
    agent.plannedPathRouted = plan.routed;
    agent.targetX = ARENA_DOOR_INSIDE_X;
    agent.targetY = ARENA_DOOR_INSIDE_Y;
    ambientNextAtRef.current[idx] = Infinity;
    setStationIdxByAgent((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    return true;
  }, [planPath]);

  // Spawn one random cluster. Same logic as the ambient-interval cluster
  // trigger, extracted so the dev button can fire it on demand. Returns
  // true if a cluster was started, false if no eligible anchor/peers.
  const triggerCluster = useCallback((): boolean => {
    const now = Date.now();
    const agents = agentRef.current;
    const eligible = (a: RenderAgentState | undefined): boolean => {
      if (!a) return false;
      if (a.state === "walking") return false;
      if ((a.standupUntil ?? 0) > now) return false;
      if ((a.clusterUntil ?? 0) > now) return false;
      if ((a.gymUntil ?? 0) > now) return false;
      if ((a.couchUntil ?? 0) > now) return false;
      if ((a.pingPongUntil ?? 0) > now) return false;
      if (a.pingPongTableUid) return false;
      if ((a.danceUntil ?? 0) > now) return false;
      if ((a.talkUntil ?? 0) > now) return false;
      return true;
    };
    // Random shuffle of candidate anchor indexes so the dev button doesn't
    // always pick the same agent.
    const anchors: number[] = [];
    for (let i = 0; i < agents.length; i++) {
      if (eligible(agents[i])) anchors.push(i);
    }
    for (let i = anchors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [anchors[i], anchors[j]] = [anchors[j], anchors[i]];
    }
    for (const ai of anchors) {
      const anchor = agents[ai];
      if (!anchor) continue;
      const peerIdxs: number[] = [];
      for (let pi = 0; pi < agents.length; pi++) {
        if (pi === ai) continue;
        if (!eligible(agents[pi])) continue;
        const d = Math.hypot(agents[pi]!.x - anchor.x, agents[pi]!.y - anchor.y);
        if (d > CLUSTER_RANGE) continue;
        peerIdxs.push(pi);
      }
      if (peerIdxs.length < CLUSTER_MIN_PEERS) continue;
      peerIdxs.sort(
        (a, b) =>
          Math.hypot(agents[a]!.x - anchor.x, agents[a]!.y - anchor.y) -
          Math.hypot(agents[b]!.x - anchor.x, agents[b]!.y - anchor.y)
      );
      const peerCount = Math.min(
        peerIdxs.length,
        CLUSTER_MIN_PEERS + Math.floor(Math.random() * (CLUSTER_MAX_PEERS - CLUSTER_MIN_PEERS + 1))
      );
      const chosen = peerIdxs.slice(0, peerCount);
      const duration = CLUSTER_MIN_MS + Math.random() * (CLUSTER_MAX_MS - CLUSTER_MIN_MS);
      anchor.clusterUntil = now + duration;
      anchor.state = "standing";
      chosen.forEach((pi, k) => {
        const peer = agents[pi]!;
        const angle = (k / chosen.length) * Math.PI * 2 + Math.random() * 0.4;
        const spokeX = anchor.x + Math.sin(angle) * CLUSTER_RADIUS;
        const spokeY = anchor.y + Math.cos(angle) * CLUSTER_RADIUS;
        const plan = planPath(peer.x, peer.y, spokeX, spokeY);
        peer.state = "walking";
        peer.path = plan.waypoints;
        peer.plannedPath = [{ x: peer.x, y: peer.y }, ...plan.waypoints.map((p) => ({ ...p }))];
        peer.plannedPathRouted = plan.routed;
        peer.targetX = spokeX;
        peer.targetY = spokeY;
        peer.targetFacing = Math.atan2(anchor.x - spokeX, anchor.y - spokeY);
        peer.clusterUntil = now + duration;
        peer.socialSpotType = undefined;
        peer.sitBackOverride = undefined;
        peer.sinkDepthOverride = undefined;
        peer.workoutStyle = undefined;
        ambientNextAtRef.current[pi] = Infinity;
        setStationIdxByAgent((prev) => {
          const next = [...prev];
          next[pi] = null;
          return next;
        });
      });
      setStationIdxByAgent((prev) => {
        const next = [...prev];
        next[ai] = null;
        return next;
      });
      ambientNextAtRef.current[ai] = Infinity;
      return true;
    }
    return false;
  }, [planPath]);

  // Standup trigger — two flavors:
  //   "conference" — top-3 ranked agents become speakers at the front of
  //     the meeting room; the rest become listeners in the audience rows.
  //     Everyone stands; speaker rotation drives the talk bubble.
  //   "round_table" — up to 6 closest eligible agents sit in the chairs
  //     around the round table (legacy standup behavior).
  const triggerStandup = useCallback(
    (venue: "conference" | "round_table" | "random") => {
      const resolved =
        venue === "random" ? (Math.random() < 0.5 ? "conference" : "round_table") : venue;
      const now = Date.now();
      const duration = STANDUP_MIN_MS + Math.random() * (STANDUP_MAX_MS - STANDUP_MIN_MS);

      // "Everyone goes" — pull in every agent that isn't already in this
      // standup or mid-dance. Walkers get interrupted, gym/couch/ping-pong
      // holds get cleared on dispatch. Dance is short (5s) so we leave it.
      const eligible: number[] = [];
      for (let i = 0; i < agentRef.current.length; i++) {
        const a = agentRef.current[i];
        if (!a) continue;
        if (a.hidden) continue;
        if ((a.standupUntil ?? 0) > now) continue;
        if ((a.danceUntil ?? 0) > now) continue;
        eligible.push(i);
      }
      if (eligible.length === 0) return;

      // Helper: send one agent to one stand-point, marking them for standup.
      const dispatch = (
        agentIdx: number,
        seat: StandupSeat,
        role: "speaker" | "listener" | undefined
      ) => {
        const agent = agentRef.current[agentIdx];
        if (!agent) return;
        const plan = planPath(agent.x, agent.y, seat.x, seat.y);
        agent.state = "walking";
        agent.path = plan.waypoints;
        agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
        agent.plannedPathRouted = plan.routed;
        agent.targetX = seat.x;
        agent.targetY = seat.y;
        agent.targetFacing = seat.facing;
        // Clear any conflicting holds so the conference wins: gym, couch,
        // ping-pong (waiting or playing), talk, workout pose, sit-back
        // overrides. Dance is deliberately not cleared (5s window, leave
        // dancers alone — eligibility already excluded them anyway).
        agent.gymUntil = undefined;
        agent.couchUntil = undefined;
        agent.pingPongUntil = undefined;
        agent.pingPongTableUid = undefined;
        agent.pingPongSide = undefined;
        agent.talkUntil = undefined;
        agent.talkPartnerId = undefined;
        agent.workoutStyle = undefined;
        agent.socialSpotType = undefined;
        agent.sitBackOverride = undefined;
        agent.sinkDepthOverride = undefined;
        agent.lookAtX = undefined;
        agent.lookAtY = undefined;
        agent.lookAtAgentId = undefined;
        agent.lookAtUntil = undefined;
        agent.standupUntil = now + duration;
        agent.conferenceRole = role;
        if (ambientByAgent[agentIdx]) {
          ambientNextAtRef.current[agentIdx] = Infinity;
        }
        setStationIdxByAgent((prev) => {
          const next = [...prev];
          next[agentIdx] = null;
          return next;
        });
      };

      if (resolved === "round_table") {
        const seats = ROUND_TABLE_SEATS;
        const ref = seats[0];
        eligible.sort((a, b) => {
          const aa = agentRef.current[a]!;
          const bb = agentRef.current[b]!;
          return Math.hypot(aa.x - ref.x, aa.y - ref.y) - Math.hypot(bb.x - ref.x, bb.y - ref.y);
        });
        const count = Math.min(seats.length, eligible.length);
        for (let k = 0; k < count; k++) {
          dispatch(eligible[k], seats[k], undefined);
        }
        return;
      }

      // Conference: top-3 by agent.rank → speakers, rest → listeners up to
      // audience capacity. Ties in rank fall back to eligibility order.
      const rankedEligible = [...eligible].sort((a, b) => {
        const ra = agentRef.current[a]!.rank ?? Number.POSITIVE_INFINITY;
        const rb = agentRef.current[b]!.rank ?? Number.POSITIVE_INFINITY;
        return ra - rb;
      });
      const presenters = rankedEligible.slice(0, CONFERENCE_PRESENTER_SPOTS.length);
      const listeners = rankedEligible.slice(CONFERENCE_PRESENTER_SPOTS.length);
      presenters.forEach((agentIdx, k) => {
        dispatch(agentIdx, CONFERENCE_PRESENTER_SPOTS[k], "speaker");
      });
      const audienceCap = Math.min(listeners.length, CONFERENCE_AUDIENCE_SPOTS.length);
      for (let k = 0; k < audienceCap; k++) {
        // Scatter each listener ±8px on x, ±5px on y so the audience
        // doesn't look perfectly gridded. Facing stays on the canonical
        // audience bearing (north, toward presenters).
        const base = CONFERENCE_AUDIENCE_SPOTS[k];
        const seat: StandupSeat = {
          x: base.x + (Math.random() - 0.5) * 16,
          y: base.y + (Math.random() - 0.5) * 10,
          facing: base.facing,
        };
        dispatch(listeners[k], seat, "listener");
      }
    },
    [planPath, ambientByAgent]
  );

  // Dev actions: fire an event-driven behavior on a chosen agent without
  // needing real leaderboard events. Writes the same hold fields the main
  // game loop uses (danceUntil / emojiUntil / couchUntil / talkUntil).
  const triggerDevAction = useCallback(
    (agentIdx: number, action: "dance" | "emoji" | "slump" | "talk") => {
      const agent = agentRef.current[agentIdx];
      if (!agent) return;
      const now = Date.now();
      if (action === "dance") {
        agent.danceUntil = now + 5_000;
        agent.state = "dancing";
        agent.path = [];
        agent.emojiIcon = "🏆";
        agent.emojiUntil = now + 2_500;
      } else if (action === "emoji") {
        const icons = ["🎉", "⬆️", "🔥"];
        agent.emojiIcon = icons[Math.floor(Math.random() * icons.length)];
        agent.emojiUntil = now + 2_500;
      } else if (action === "slump") {
        // In-place slump: sad emoji pop + 30s couch-hold flag so if any
        // downstream logic reads couchUntil it treats them as slumping.
        agent.emojiIcon = "❌";
        agent.emojiUntil = now + 3_000;
        agent.couchUntil = now + 30_000;
      } else if (action === "talk") {
        // Find the nearest other agent within 150px and start a 4s talk
        // hold on both. Faces standing agents toward each other; sitting
        // agents keep their station pose.
        let partnerIdx = -1;
        let bestDist = 150;
        for (let j = 0; j < agentRef.current.length; j++) {
          if (j === agentIdx) continue;
          const b = agentRef.current[j];
          if (!b) continue;
          const d = Math.hypot(b.x - agent.x, b.y - agent.y);
          if (d < bestDist) {
            bestDist = d;
            partnerIdx = j;
          }
        }
        if (partnerIdx < 0) return;
        const partner = agentRef.current[partnerIdx];
        if (!partner) return;
        agent.talkUntil = now + 4_000;
        partner.talkUntil = now + 4_000;
        agent.talkPartnerId = partner.id;
        partner.talkPartnerId = agent.id;
        if (agent.state === "standing") {
          agent.facing = Math.atan2(partner.x - agent.x, partner.y - agent.y);
        }
        if (partner.state === "standing") {
          partner.facing = Math.atan2(agent.x - partner.x, agent.y - partner.y);
        }
      }
    },
    []
  );

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
      agent.plannedPath = [{ x: agent.x, y: agent.y }, ...plan.waypoints.map((p) => ({ ...p }))];
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
    triggerDevAction,
    triggerStandup,
    triggerCluster,
    triggerJoin,
    triggerLeave,
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
    view,
    setView,
    wallBury,
    setWallBury,
    navOverrides,
    setNavOverrides,
    ambientByAgent,
    setAmbientForAgent,
    setAmbientForAll,
    stations,
    walkToPoint,
    camMode,
    setCamMode,
    camAgentIdx,
    setCamAgentIdx,
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
