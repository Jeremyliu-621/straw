import type { FurnitureItem } from "./types";
import { ITEM_FOOTPRINT } from "./geometry";

let uidCounter = 0;
const uid = (prefix: string) => `${prefix}_${uidCounter++}`;

/**
 * Rich hackathon-arena layout with discrete "stations": server room, meeting
 * room, cafe, phone booths, library, lounge pit, beanbag grove, ping pong,
 * whiteboard zone, printer station. One benching cluster rotated ~18° to
 * break grid monotony. Canvas 1200x1100 (see core/constants).
 *
 * Desks are numbered `desk_0` .. `desk_19`; useArenaGameLoop maps agent
 * index → standing point via the precomputed `DESK_STANDING_POINTS` array.
 */

// ── Desk helpers ─────────────────────────────────────────────────────────
type DeskType = "desk_cubicle" | "standing_desk";
type DeskFacing = "south" | "north";

function deskDims(_type: DeskType): { w: number; h: number } {
  return { w: 100, h: 55 };
}

function deskCluster(
  id: string,
  x: number,
  y: number,
  opts: { type?: DeskType; facing?: DeskFacing } = {}
): FurnitureItem[] {
  const type = opts.type ?? "desk_cubicle";
  const facing = opts.facing ?? "south";
  const { w, h } = deskDims(type);
  const chairX = w / 2 - 30;

  if (facing === "south") {
    return [
      { type, x, y, _uid: uid("desk"), id },
      { type: "chair", x: x + chairX, y: y - 10, facing: 180, _uid: uid("chair") },
      { type: "computer", x: x + chairX, y: y - 13, _uid: uid("comp") },
      { type: "keyboard", x: x + chairX + 10, y: y - 5, _uid: uid("kb") },
      { type: "mouse", x: x + chairX + 32, y: y - 5, _uid: uid("mouse") },
    ];
  }
  return [
    { type, x, y, _uid: uid("desk"), id, facing: 180 },
    { type: "chair", x: x + chairX, y: y + h + 10, facing: 0, _uid: uid("chair") },
    { type: "computer", x: x + chairX, y: y + h + 13, _uid: uid("comp") },
    { type: "keyboard", x: x + chairX + 10, y: y + h + 5, _uid: uid("kb") },
    { type: "mouse", x: x + chairX + 32, y: y + h + 5, _uid: uid("mouse") },
  ];
}

/**
 * A pod of 4 desks in a 2x2 block. Top row faces south, bottom row faces
 * north — agents in the same pod sit across from each other.
 */
function deskPod(
  startIndex: number,
  x: number,
  y: number,
  type: DeskType = "desk_cubicle"
): FurnitureItem[] {
  const { w, h } = deskDims(type);
  const xStep = w + 20;
  const yStep = h + 35;
  return [
    ...deskCluster(`desk_${startIndex}`, x, y, { type, facing: "south" }),
    ...deskCluster(`desk_${startIndex + 1}`, x + xStep, y, { type, facing: "south" }),
    ...deskCluster(`desk_${startIndex + 2}`, x, y + yStep, { type, facing: "north" }),
    ...deskCluster(`desk_${startIndex + 3}`, x + xStep, y + yStep, { type, facing: "north" }),
  ];
}

/** Rotate a list of furniture items around an anchor point (canvas space). */
function rotateAround(
  items: FurnitureItem[],
  cx: number,
  cy: number,
  deg: number
): FurnitureItem[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return items.map((item) => {
    const dx = item.x - cx;
    const dy = item.y - cy;
    return {
      ...item,
      x: Math.round(cx + dx * cos - dy * sin),
      y: Math.round(cy + dx * sin + dy * cos),
      facing: ((item.facing ?? 0) + deg + 360) % 360,
    };
  });
}

// ── Interior walls ───────────────────────────────────────────────────────
const WALL_THICK = 8;
function wall(x: number, y: number, w: number, h: number): FurnitureItem {
  return { type: "wall", x, y, w, h, _uid: uid("wall") };
}

const INTERIOR_WALLS: FurnitureItem[] = [
  // Server room (top-left, 0..260 x 0..220). Glass wall on east side with doorway.
  wall(252, 0, WALL_THICK, 120),
  wall(252, 180, WALL_THICK, 45),
  wall(0, 220, 260, WALL_THICK),

  // Meeting room (top-center, 280..530 x 0..220). Doorway on south wall at x=380..430.
  wall(280, 0, WALL_THICK, 220),
  wall(530, 0, WALL_THICK, 220),
  wall(280, 220, 100, WALL_THICK),
  wall(430, 220, 108, WALL_THICK),

  // Kitchen / cafe (top, 550..880 x 0..220). Doorway at x=750..800.
  wall(550, 0, WALL_THICK, 220),
  wall(880, 0, WALL_THICK, 220),
  wall(550, 220, 200, WALL_THICK),
  wall(800, 220, 88, WALL_THICK),

  // Printer station L-partition (x=900..1200 top area).
  wall(900, 100, WALL_THICK, 120),
  wall(900, 220, 300, WALL_THICK),
];

// ── Server Room ──────────────────────────────────────────────────────────
const SERVER_ROOM: FurnitureItem[] = [
  { type: "rug", x: 10, y: 10, w: 240, h: 205, color: "#2E3338", _uid: uid("rug") },
  { type: "server_rack", x: 30, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 95, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 160, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 30, y: 130, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 95, y: 130, w: 55, h: 80, _uid: uid("rack") },
  { type: "cable_tray", x: 15, y: 15, w: 230, h: 18, _uid: uid("tray") },
  { type: "trash", x: 210, y: 185, _uid: uid("trash") },
  { type: "glass_wall", x: 252, y: 60, w: 8, h: 60, _uid: uid("gw") },
];

// ── Meeting Room ─────────────────────────────────────────────────────────
const MEETING_ROOM: FurnitureItem[] = [
  { type: "table_rect", x: 340, y: 80, w: 140, h: 60, _uid: uid("table") },
  { type: "chair", x: 340, y: 40, facing: 0, _uid: uid("chair") },
  { type: "chair", x: 400, y: 40, facing: 0, _uid: uid("chair") },
  { type: "chair", x: 460, y: 40, facing: 0, _uid: uid("chair") },
  { type: "chair", x: 340, y: 150, facing: 180, _uid: uid("chair") },
  { type: "chair", x: 400, y: 150, facing: 180, _uid: uid("chair") },
  { type: "chair", x: 460, y: 150, facing: 180, _uid: uid("chair") },
  { type: "tv_screen", x: 405, y: 5, w: 120, h: 70, wallAttach: "N", _uid: uid("tv") },
  { type: "pendant_light", x: 370, y: 80, _uid: uid("pend") },
  { type: "pendant_light", x: 450, y: 80, _uid: uid("pend") },
  { type: "plant", x: 295, y: 195, _uid: uid("plant") },
];

// ── Kitchen / Cafe ───────────────────────────────────────────────────────
const KITCHEN: FurnitureItem[] = [
  { type: "fridge", x: 570, y: 25, _uid: uid("fridge") },
  { type: "cabinet", x: 620, y: 33, w: 80, h: 40, _uid: uid("cabinet") },
  { type: "coffee_machine", x: 650, y: 30, elevation: 0.56, _uid: uid("coffee") },
  { type: "cabinet", x: 720, y: 33, w: 80, h: 40, _uid: uid("cabinet") },
  { type: "vending", x: 820, y: 25, _uid: uid("vending") },
  { type: "round_table", x: 610, y: 190, r: 50, _uid: uid("table") },
  { type: "chair", x: 610, y: 70, facing: 30, _uid: uid("chair") },
  { type: "chair", x: 735, y: 100, facing: 270, _uid: uid("chair") },
  { type: "chair", x: 690, y: 160, facing: 220, _uid: uid("chair") },
  { type: "chair", x: 625, y: 170, facing: 90, _uid: uid("chair") },
  { type: "pendant_light", x: 700, y: 170, _uid: uid("pend") },
  { type: "trash", x: 810, y: 100, _uid: uid("trash") },
  { type: "wall_clock", x: 730, y: 5, wallAttach: "N", _uid: uid("clock") },
];

// ── Printer / Supply Station ─────────────────────────────────────────────
const PRINTER_STATION: FurnitureItem[] = [
  { type: "printer_station", x: 920, y: 30, w: 60, h: 50, _uid: uid("print") },
  { type: "printer_station", x: 1000, y: 30, w: 60, h: 50, _uid: uid("print") },
  { type: "cabinet", x: 1080, y: 33, w: 100, h: 40, _uid: uid("cabinet") },
  { type: "plant", x: 1150, y: 170, _uid: uid("plant") },
  { type: "trash", x: 920, y: 180, _uid: uid("trash") },
];

// ── Benching cluster A (rotated ~-18°) ───────────────────────────────────
const CLUSTER_A_RAW: FurnitureItem[] = [
  ...deskPod(0, 250, 300), // desks 0-3
  ...deskPod(4, 250, 470), // desks 4-7
];
const CLUSTER_A = rotateAround(CLUSTER_A_RAW, 370, 410, -18);

// ── Benching cluster B (orthogonal) ──────────────────────────────────────
const CLUSTER_B: FurnitureItem[] = [
  ...deskPod(8, 580, 290), // desks 8-11
  ...deskPod(12, 580, 460), // desks 12-15
];

// ── Standing-desk island ─────────────────────────────────────────────────
const STANDING_ISLAND: FurnitureItem[] = [
  ...deskCluster("desk_16", 930, 330, { type: "standing_desk", facing: "south" }),
  ...deskCluster("desk_17", 1060, 330, { type: "standing_desk", facing: "south" }),
  ...deskCluster("desk_18", 930, 470, { type: "standing_desk", facing: "north" }),
  ...deskCluster("desk_19", 1060, 470, { type: "standing_desk", facing: "north" }),
  { type: "plant", x: 890, y: 330, _uid: uid("plant") },
  { type: "plant", x: 1150, y: 560, _uid: uid("plant") },
];

// ── Phone booths ─────────────────────────────────────────────────────────
const PHONE_BOOTHS: FurnitureItem[] = [
  { type: "phone_booth", x: 20, y: 280, w: 70, h: 70, color: "#2E3338", _uid: uid("booth") },
  { type: "phone_booth", x: 20, y: 370, w: 70, h: 70, color: "#3B4047", _uid: uid("booth") },
  { type: "phone_booth", x: 20, y: 460, w: 70, h: 70, color: "#2E3338", _uid: uid("booth") },
];

// ── Library nook ─────────────────────────────────────────────────────────
const LIBRARY: FurnitureItem[] = [
  { type: "rug", x: 20, y: 570, w: 120, h: 200, color: "#7A6B55", _uid: uid("rug") },
  { type: "bookshelf", x: 30, y: 590, w: 80, h: 120, _uid: uid("shelf") },
  { type: "couch_v", x: 80, y: 600, _uid: uid("chair") },
  { type: "couch_v", x: 80, y: 670, _uid: uid("chair") },
  { type: "lamp", x: 220, y: 590, _uid: uid("lamp") },
  { type: "plant", x: 220, y: 700, _uid: uid("plant") },
];

// ── Lounge Pit ───────────────────────────────────────────────────────────
const LOUNGE_PIT: FurnitureItem[] = [
  { type: "rug", x: 20, y: 800, w: 340, h: 280, color: "#4A6E8E", _uid: uid("rug") },
  { type: "couch", x: 40, y: 930, facing: 270, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 80, y: 855, facing: 180, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 250, y: 855, facing: 180, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 140, y: 985, facing: 0, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 250, y: 985, facing: 0, w: 100, h: 40, _uid: uid("couch") },
  { type: "table_rect", x: 180, y: 850, w: 120, h: 50, _uid: uid("table") },
  { type: "table_rect", x: 30, y: 800, facing: 90, w: 120, h: 50, _uid: uid("table") },
  { type: "round_table", x: 200, y: 1025, facing: 30, r: 10, _uid: uid("table") },
  { type: "lamp", x: 70, y: 880, _uid: uid("lamp") },
  { type: "lamp", x: 370, y: 880, _uid: uid("lamp") },
  { type: "plant", x: 40, y: 740, _uid: uid("plant") },
  { type: "plant", x: 390, y: 740, _uid: uid("plant") },
  { type: "plant", x: 40, y: 1040, _uid: uid("plant") },
];

// ── Beanbag Grove ────────────────────────────────────────────────────────
const BEANBAG_GROVE: FurnitureItem[] = [
  { type: "rug", x: 380, y: 790, w: 210, h: 200, color: "#C9A478", _uid: uid("rug") },
  { type: "beanbag", x: 400, y: 840, color: "#e65100", _uid: uid("bean") },
  { type: "beanbag", x: 470, y: 840, color: "#1565c0", _uid: uid("bean") },
  { type: "beanbag", x: 530, y: 840, color: "#16a34a", _uid: uid("bean") },
  { type: "beanbag", x: 400, y: 950, color: "#8b5cf6", _uid: uid("bean") },
  { type: "beanbag", x: 530, y: 950, color: "#E8B84A", _uid: uid("bean") },
  { type: "table_rect", x: 450, y: 900, facing: 0, w: 50, h: 30, _uid: uid("table") },
  { type: "plant", x: 300, y: 970, _uid: uid("plant") },
];

// ── Ping Pong Zone ───────────────────────────────────────────────────────
const PING_PONG: FurnitureItem[] = [
  { type: "ping_pong", x: 600, y: 830, facing: 90, w: 180, h: 100, _uid: uid("pp") },
  { type: "plant", x: 600, y: 790, _uid: uid("plant") },
  { type: "plant", x: 600, y: 970, _uid: uid("plant") },
];

// ── Whiteboard Zone ──────────────────────────────────────────────────────
const WHITEBOARD_ZONE: FurnitureItem[] = [
  { type: "rolling_whiteboard", x: 960, y: 600, w: 100, h: 20, _uid: uid("wb") },
  { type: "rolling_whiteboard", x: 1080, y: 600, w: 100, h: 20, _uid: uid("wb") },
  { type: "couch_v", x: 1000, y: 580, facing: 90, _uid: uid("chair") },
  { type: "couch_v", x: 1120, y: 580, facing: 90, _uid: uid("chair") },
  { type: "plant", x: 1170, y: 670, _uid: uid("plant") },
];

// ── Gym ──────────────────────────────────────────────────────────────────
// Bottom-right corner, below the whiteboard zone. Knee-height half-walls
// wrap the zone with an entrance gap on the west side. Medium-gray rubber
// floor, equipment organized in rows: rigs against the back, dumbbells +
// water in the middle, yoga mats at the front.
const GYM: FurnitureItem[] = [
  // Mid-gray rubber floor
  { type: "rug", x: 790, y: 760, w: 400, h: 330, color: "#6B7079", _uid: uid("gymFloor") },
  // ── Half-walls wrapping the gym ──
  // North edge: continuous from x=790..1190 at y=760 (one 8-thick band)
  { type: "half_wall", x: 790, y: 756, w: 400, h: 8, _uid: uid("hw") },
  // West edge: split in two with an entrance gap at y=870..930
  { type: "half_wall", x: 786, y: 760, w: 8, h: 110, _uid: uid("hw") },
  { type: "half_wall", x: 786, y: 930, w: 8, h: 160, _uid: uid("hw") },
  // Back row of equipment (against ~y=780): pull-up towers + squat rack + bag
  { type: "pull_up_tower", x: 820, y: 790, w: 55, h: 55, _uid: uid("pull") },
  { type: "pull_up_tower", x: 900, y: 790, w: 55, h: 55, _uid: uid("pull") },
  { type: "squat_rack", x: 990, y: 795, w: 80, h: 45, _uid: uid("rack") },
  { type: "punching_bag", x: 1100, y: 800, w: 40, h: 40, _uid: uid("bag") },
  // Middle row: dumbbell rack + water dispenser
  { type: "dumbbell_rack", x: 850, y: 900, w: 150, h: 30, _uid: uid("db") },
  { type: "water_dispenser", x: 1050, y: 905, w: 35, h: 35, _uid: uid("water") },
  // Front row: yoga / stretching mats. `elevation: 0.005` lifts each mat
  // above the gym rubber floor (also a rug) so they don't z-fight and clip.
  { type: "rug", x: 820, y: 990, w: 70, h: 30, color: "#3BAFA9", elevation: 0.005, _uid: uid("mat") },
  { type: "rug", x: 910, y: 990, w: 70, h: 30, color: "#FF6B5B", elevation: 0.005, _uid: uid("mat") },
  { type: "rug", x: 1000, y: 990, w: 70, h: 30, color: "#9B8FD1", elevation: 0.005, _uid: uid("mat") },
  { type: "rug", x: 1090, y: 990, w: 70, h: 30, color: "#E8B84A", elevation: 0.005, _uid: uid("mat") },
  // A neon sign on the east wall to brand the zone
  {
    type: "neon_sign",
    x: 1195,
    y: 820,
    w: 120,
    h: 40,
    color: "#FF4B8B",
    wallAttach: "E",
    _uid: uid("neon"),
  },
];

// ── Wall art / decor ─────────────────────────────────────────────────────
const WALL_DECOR: FurnitureItem[] = [
  // North perimeter wall
  {
    type: "painting",
    x: 120,
    y: 5,
    w: 70,
    h: 50,
    color: "#FF6B5B",
    wallAttach: "N",
    _uid: uid("art"),
  },
  {
    type: "painting",
    x: 950,
    y: 5,
    w: 70,
    h: 50,
    color: "#3BAFA9",
    wallAttach: "N",
    _uid: uid("art"),
  },
  {
    type: "neon_sign",
    x: 1080,
    y: 5,
    w: 100,
    h: 40,
    color: "#5EE3D4",
    wallAttach: "N",
    _uid: uid("neon"),
  },
  // South perimeter wall
  {
    type: "painting",
    x: 200,
    y: 1095,
    w: 80,
    h: 55,
    color: "#E8B84A",
    wallAttach: "S",
    _uid: uid("art"),
  },
  {
    type: "painting",
    x: 800,
    y: 1095,
    w: 90,
    h: 60,
    color: "#9B8FD1",
    wallAttach: "S",
    _uid: uid("art"),
  },
  {
    type: "painting",
    x: 1050,
    y: 1095,
    w: 70,
    h: 50,
    color: "#7A9AB8",
    wallAttach: "S",
    _uid: uid("art"),
  },
  // East perimeter wall
  {
    type: "painting",
    x: 1195,
    y: 630,
    w: 80,
    h: 55,
    color: "#5C8D65",
    wallAttach: "E",
    _uid: uid("art"),
  },
  // West perimeter wall
  {
    type: "painting",
    x: 5,
    y: 230,
    w: 70,
    h: 50,
    color: "#D47A5B",
    wallAttach: "W",
    _uid: uid("art"),
  },
  {
    type: "painting",
    x: 5,
    y: 900,
    w: 80,
    h: 55,
    color: "#3BAFA9",
    wallAttach: "W",
    _uid: uid("art"),
  },
];

// ── Ambient scatter ──────────────────────────────────────────────────────
const AMBIENT_DECOR: FurnitureItem[] = [
  { type: "plant", x: 260, y: 740, _uid: uid("plant") },
  { type: "plant", x: 440, y: 1030, _uid: uid("plant") },
  { type: "plant", x: 560, y: 1030, _uid: uid("plant") },
  { type: "plant", x: 540, y: 250, _uid: uid("plant") },
  { type: "plant", x: 150, y: 260, _uid: uid("plant") },
  { type: "lamp", x: 460, y: 710, _uid: uid("lamp") },
  { type: "lamp", x: 870, y: 550, _uid: uid("lamp") },
];

export const DEFAULT_ARENA_FURNITURE: FurnitureItem[] = [
  ...INTERIOR_WALLS,
  ...SERVER_ROOM,
  ...MEETING_ROOM,
  ...KITCHEN,
  ...PRINTER_STATION,
  ...CLUSTER_A,
  ...CLUSTER_B,
  ...STANDING_ISLAND,
  ...PHONE_BOOTHS,
  ...LIBRARY,
  ...LOUNGE_PIT,
  ...BEANBAG_GROVE,
  ...PING_PONG,
  ...WHITEBOARD_ZONE,
  ...GYM,
  ...WALL_DECOR,
  ...AMBIENT_DECOR,
];

/** Map agent index (0-19) to desk id */
export function getDeskIdForAgent(agentIndex: number): string {
  return `desk_${agentIndex}`;
}

/**
 * Precomputed standing points for desk_0..desk_19. useArenaGameLoop reads
 * from this array instead of recomputing positions. Handles rotated desk
 * pods: the standing point is placed along the desk's outward-facing normal
 * so agents approach from the correct side.
 */
export type SocialPointType =
  | "couch"
  | "couch_v"
  | "beanbag"
  | "round_table"
  | "coffee_machine"
  | "ping_pong"
  | "water_dispenser"
  | "whiteboard";

export interface SocialPoint {
  x: number;
  y: number;
  type: SocialPointType;
  /** Weight used when picking a destination (higher = more popular). */
  weight: number;
}

/**
 * Points across the office where idle agents can gather / hang out. Derived
 * at module load from the furniture list so the layout is the single source
 * of truth. Agents walk to (x, y) and stand / sit there.
 */
export const SOCIAL_POINTS: SocialPoint[] = (() => {
  const points: SocialPoint[] = [];
  for (const item of DEFAULT_ARENA_FURNITURE) {
    const t = item.type;
    switch (t) {
      case "couch":
      case "couch_v": {
        const [defaultW, defaultH] = ITEM_FOOTPRINT[t] ?? [100, 40];
        const w = item.w ?? defaultW;
        const h = item.h ?? defaultH;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2),
          type: t,
          weight: 3,
        });
        break;
      }
      case "beanbag": {
        const [defaultW, defaultH] = ITEM_FOOTPRINT.beanbag ?? [40, 40];
        const w = item.w ?? defaultW;
        const h = item.h ?? defaultH;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2),
          type: t,
          weight: 2,
        });
        break;
      }
      case "round_table": {
        // Stand next to the table (north side is usually walkable).
        const r = item.r ?? 50;
        points.push({
          x: Math.round(item.x + r),
          y: Math.round(item.y + r + 30),
          type: t,
          weight: 1,
        });
        break;
      }
      case "coffee_machine": {
        // Stand in front (south) of the coffee machine.
        points.push({
          x: Math.round(item.x + 16),
          y: Math.round(item.y + 50),
          type: t,
          weight: 2,
        });
        break;
      }
      case "ping_pong": {
        const w = item.w ?? 100;
        const h = item.h ?? 60;
        // Two standing points, one on each long side of the table.
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y - 15),
          type: t,
          weight: 1,
        });
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h + 15),
          type: t,
          weight: 1,
        });
        break;
      }
      case "water_dispenser": {
        points.push({
          x: Math.round(item.x + 15),
          y: Math.round(item.y + 45),
          type: t,
          weight: 1,
        });
        break;
      }
      case "whiteboard":
      case "rolling_whiteboard" as SocialPointType: {
        const w = item.w ?? 10;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + 30),
          type: "whiteboard",
          weight: 1,
        });
        break;
      }
    }
  }
  return points;
})();

export type WorkoutStyle = "lift" | "box" | "stretch" | "row" | "bike" | "run";

export interface GymWorkoutPoint {
  x: number;
  y: number;
  facing: number; // radians; where the agent faces while working out
  style: WorkoutStyle;
}

/**
 * Standing points next to each piece of gym equipment, paired with a
 * workoutStyle that drives the agent's animation variant. Derived at module
 * load from gym furniture so it stays in sync with the authored layout.
 */
export const GYM_WORKOUT_POINTS: GymWorkoutPoint[] = (() => {
  const points: GymWorkoutPoint[] = [];
  for (const item of DEFAULT_ARENA_FURNITURE) {
    switch (item.type) {
      case "pull_up_tower":
      case "squat_rack":
      case "dumbbell_rack": {
        const w = item.w ?? 60;
        const h = item.h ?? 40;
        // Agent stands just south of the equipment, facing north (into it)
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h + 20),
          facing: 0, // facing north = +y looking toward -y in canvas? atan2(dx,dy) direction; north visually
          style: "lift",
        });
        break;
      }
      case "punching_bag": {
        const w = item.w ?? 30;
        const h = item.h ?? 30;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h + 15),
          facing: 0,
          style: "box",
        });
        break;
      }
      // Yoga mats are rug items with specific accent colors (teal / coral).
      // Detect them by the color signature set in GYM.
      case "rug" as string: {
        if (item.color === "#3BAFA9" || item.color === "#FF6B5B") {
          const w = item.w ?? 70;
          const h = item.h ?? 30;
          points.push({
            x: Math.round(item.x + w / 2),
            y: Math.round(item.y + h / 2),
            facing: 0,
            style: "stretch",
          });
        }
        break;
      }
    }
  }
  return points;
})();

/** Pick a gym point uniformly at random. Null if there are no points. */
export function pickGymPoint(): GymWorkoutPoint | null {
  if (GYM_WORKOUT_POINTS.length === 0) return null;
  return GYM_WORKOUT_POINTS[
    Math.floor(Math.random() * GYM_WORKOUT_POINTS.length)
  ];
}

/** Pick a social point weighted by its `weight`. Returns null if none exist. */
export function pickWeightedSocialPoint(): SocialPoint | null {
  if (SOCIAL_POINTS.length === 0) return null;
  const totalWeight = SOCIAL_POINTS.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of SOCIAL_POINTS) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return SOCIAL_POINTS[SOCIAL_POINTS.length - 1];
}

export const DESK_STANDING_POINTS: { x: number; y: number }[] = (() => {
  const deskItems = DEFAULT_ARENA_FURNITURE.filter(
    (item) =>
      (item.type === "desk_cubicle" || item.type === "standing_desk") &&
      typeof item.id === "string" &&
      item.id.startsWith("desk_")
  );
  const byIndex: { x: number; y: number }[] = [];
  for (const item of deskItems) {
    const idx = parseInt(item.id!.slice(5), 10);
    if (Number.isNaN(idx)) continue;
    const { w, h } = deskDims(item.type as DeskType);
    const facingDeg = item.facing ?? 0;
    const rad = (facingDeg * Math.PI) / 180;
    // Desk center (pre-rotation). `facing` field on north-facing desks is 180
    // (the desk mesh itself gets rotated 180 by the GLB pipeline) — so the
    // "outward direction" for the chair depends on which face we're sitting at.
    const cx = item.x + w / 2;
    const cy = item.y + h / 2;
    const isNorthFacing = Math.round(facingDeg / 180) % 2 === 1;

    // Chair placement inside deskCluster (must stay in sync with deskCluster):
    //   chair.x = desk.x + (w/2 - 30), chair.y = desk.y - 10 (south) or +h+10 (north)
    //   chair footprint = 24x24, so chair center = chair item pos + (12, 12).
    // Chair-center offset relative to desk top-left:
    //   dx_local = (w/2 - 30) + 12 = w/2 - 18   (constant −18 from desk center)
    //   dy_local (south) = -10 + 12 = 2         → (2 − h/2) from desk center
    //   dy_local (north) =  h + 10 + 12 = h+22  → (h/2 + 22) from desk center
    const baseDx = -18;
    const baseDy = isNorthFacing ? h / 2 + 22 : -(h / 2 - 2);

    // Rotate by the *pod* rotation only. The north/south flip was already
    // handled via isNorthFacing above; subtracting π here cancels the extra
    // 180° that north-facing desks pick up from their `facing: 180`.
    const podRot = isNorthFacing ? rad - Math.PI : rad;
    const cos = Math.cos(podRot);
    const sin = Math.sin(podRot);
    const dx = baseDx * cos - baseDy * sin;
    const dy = baseDx * sin + baseDy * cos;
    byIndex[idx] = { x: Math.round(cx + dx), y: Math.round(cy + dy) };
  }
  return byIndex;
})();
