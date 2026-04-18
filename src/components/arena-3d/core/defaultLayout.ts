import type { FurnitureItem } from "./types";
import { ITEM_FOOTPRINT, FURNITURE_ROTATION } from "./geometry";
import { makeDeskStation, makeDeskPod, DESK_W, DESK_H, type DeskStation } from "./stations";

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
// Station factories live in core/stations.ts — the `/arena-tuner` dev page
// uses the same factories to produce tuner-validated visuals. Each desk
// station is a rigid cluster (desk + chair + computer) that renders via a
// three.js <group> so it rotates cleanly at any angle.

// ── Interior walls ───────────────────────────────────────────────────────
const WALL_THICK = 8;
function wall(x: number, y: number, w: number, h: number): FurnitureItem {
  return { type: "wall", x, y, w, h, _uid: uid("wall") };
}

const INTERIOR_WALLS: FurnitureItem[] = [
  // Server room (top-left, 0..260 x 0..220). East wall is solid now; the
  // old y=120..180 east doorway was closed off. New entrance is on the
  // south wall facing the main floor (CLUSTER_A desks).
  wall(252, 0, WALL_THICK, 225), // full east wall
  wall(0, 220, 90, WALL_THICK), // south wall, left stub
  wall(170, 220, 90, WALL_THICK), // south wall, right stub (door gap 90..170)

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

  // Printer station L-partition (x=900..1200 top area). South wall has a
  // ~160-wide entrance facing the standing-desk island so agents can walk in
  // without going around the west partition.
  wall(900, 100, WALL_THICK, 120),
  wall(900, 220, 70, WALL_THICK), // left stub (900..970)
  wall(1130, 220, 70, WALL_THICK), // right stub (1130..1200)
];

// ── Server Room ──────────────────────────────────────────────────────────
const SERVER_ROOM: FurnitureItem[] = [
  { type: "rug", x: 10, y: 10, w: 240, h: 205, color: "#2E3338", _uid: uid("rug") },
  { type: "server_rack", x: 30, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 95, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 160, y: 30, w: 55, h: 80, _uid: uid("rack") },
  { type: "server_rack", x: 30, y: 130, w: 55, h: 80, _uid: uid("rack") },
  // Moved east so it doesn't sit right in front of the new south-wall doorway.
  { type: "server_rack", x: 180, y: 130, w: 55, h: 80, _uid: uid("rack") },
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

// ── Benching cluster A (removed) ─────────────────────────────────────────
// Entire cluster A removed per user request — desks 0-7 no longer exist.
// The west half of the main floor is now open / available for other zones.

// ── Benching cluster B (orthogonal) ──────────────────────────────────────
// First pod (desks 8-11 at y=290) replaced with a round-table discussion
// nook (round table + 6 chairs facing inward). Agents 8-11 no longer have
// a desk mapping.
const CLUSTER_B_STATIONS: DeskStation[] = [...makeDeskPod({ startIndex: 12, x: 580, y: 460 })];

// Round-table nook. Table top-left at (300, 500), r=60 → center (360, 560).
// 6 chairs at radius 85 around the table, each facing inward.
const ROUND_TABLE_NOOK: FurnitureItem[] = [
  { type: "round_table", x: 300, y: 500, r: 60, _uid: uid("table") },
  { type: "chair", x: 348, y: 633, facing: 180, _uid: uid("chair") },
  { type: "chair", x: 422, y: 591, facing: 240, _uid: uid("chair") },
  { type: "chair", x: 422, y: 506, facing: 300, _uid: uid("chair") },
  { type: "chair", x: 348, y: 463, facing: 0, _uid: uid("chair") },
  { type: "chair", x: 274, y: 506, facing: 60, _uid: uid("chair") },
  { type: "chair", x: 274, y: 591, facing: 120, _uid: uid("chair") },
];

// ── Standing-desk island ─────────────────────────────────────────────────
const STANDING_ISLAND_STATIONS: DeskStation[] = [
  makeDeskStation({ id: "desk_16", x: 930, y: 330, type: "standing_desk" }),
  makeDeskStation({ id: "desk_17", x: 1060, y: 330, type: "standing_desk" }),
  // "North-facing" in the old layout → rotate the whole station 180°.
  makeDeskStation({ id: "desk_18", x: 930, y: 470, type: "standing_desk", rotDeg: 180 }),
  makeDeskStation({ id: "desk_19", x: 1060, y: 470, type: "standing_desk", rotDeg: 180 }),
];
const STANDING_ISLAND_EXTRAS: FurnitureItem[] = [
  { type: "plant", x: 890, y: 330, _uid: uid("plant") },
  { type: "plant", x: 1150, y: 560, _uid: uid("plant") },
];

const ALL_DESK_STATIONS: DeskStation[] = [...CLUSTER_B_STATIONS, ...STANDING_ISLAND_STATIONS];

// ── Phone booths ─────────────────────────────────────────────────────────
const PHONE_BOOTHS: FurnitureItem[] = [
  { type: "phone_booth", x: 20, y: 280, w: 70, h: 70, color: "#2E3338", _uid: uid("booth") },
  { type: "phone_booth", x: 20, y: 370, w: 70, h: 70, color: "#3B4047", _uid: uid("booth") },
  { type: "phone_booth", x: 20, y: 460, w: 70, h: 70, color: "#2E3338", _uid: uid("booth") },
];

// ── Library nook (replaced with a beanbag grove) ─────────────────────────
// Old library (bookshelf + couch_v armchairs) removed per user request;
// this area now hosts another cluster of beanbags. Same rug footprint as
// before so the perimeter paintings / adjacent zones don't need to move.
const LIBRARY: FurnitureItem[] = [
  { type: "rug", x: 20, y: 570, w: 220, h: 210, color: "#C9A478", _uid: uid("rug") },
  { type: "beanbag", x: 40, y: 610, color: "#e65100", _uid: uid("bean") },
  { type: "beanbag", x: 100, y: 610, color: "#1565c0", _uid: uid("bean") },
  { type: "beanbag", x: 160, y: 610, color: "#16a34a", _uid: uid("bean") },
  { type: "beanbag", x: 50, y: 710, facing: 90, color: "#8b5cf6", _uid: uid("bean") },
  { type: "beanbag", x: 50, y: 640, facing: 90, color: "#E8B84A", _uid: uid("bean") },
  { type: "table_rect", x: 85, y: 660, facing: 0, w: 50, h: 30, _uid: uid("table") },
  { type: "plant", x: 210, y: 720, _uid: uid("plant") },
];

// ── Lounge Pit ───────────────────────────────────────────────────────────
const LOUNGE_PIT: FurnitureItem[] = [
  { type: "rug", x: 20, y: 800, w: 340, h: 280, color: "#4A6E8E", _uid: uid("rug") },
  { type: "couch", x: 40, y: 930, facing: 270, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 80, y: 855, facing: 180, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 250, y: 855, facing: 180, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 140, y: 985, facing: 0, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 250, y: 985, facing: 0, w: 100, h: 40, _uid: uid("couch") },
  { type: "table_rect", x: 30, y: 800, facing: 90, w: 120, h: 50, _uid: uid("table") },
  { type: "lamp", x: 20, y: 880, _uid: uid("lamp") },
  { type: "lamp", x: 370, y: 880, _uid: uid("lamp") },
  { type: "plant", x: 40, y: 800, _uid: uid("plant") },
  { type: "plant", x: 390, y: 740, _uid: uid("plant") },
  { type: "plant", x: 40, y: 1040, _uid: uid("plant") },
];

// ── Ping Pong Zone ───────────────────────────────────────────────────────
const PING_PONG: FurnitureItem[] = [
  { type: "ping_pong", x: 500, y: 830, facing: 90, w: 180, h: 100, _uid: uid("pp") },
  { type: "plant", x: 500, y: 790, _uid: uid("plant") },
  { type: "plant", x: 500, y: 970, _uid: uid("plant") },
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
  {
    type: "rug",
    x: 820,
    y: 990,
    w: 70,
    h: 30,
    color: "#3BAFA9",
    elevation: 0.005,
    _uid: uid("mat"),
  },
  {
    type: "rug",
    x: 910,
    y: 990,
    w: 70,
    h: 30,
    color: "#FF6B5B",
    elevation: 0.005,
    _uid: uid("mat"),
  },
  {
    type: "rug",
    x: 1000,
    y: 990,
    w: 70,
    h: 30,
    color: "#9B8FD1",
    elevation: 0.005,
    _uid: uid("mat"),
  },
  {
    type: "rug",
    x: 1090,
    y: 990,
    w: 70,
    h: 30,
    color: "#E8B84A",
    elevation: 0.005,
    _uid: uid("mat"),
  },
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
// Ambient plants removed per user request — the floor was too busy. Lamps
// kept for lighting character.
const AMBIENT_DECOR: FurnitureItem[] = [];

export const DEFAULT_ARENA_FURNITURE: FurnitureItem[] = [
  ...INTERIOR_WALLS,
  ...SERVER_ROOM,
  ...MEETING_ROOM,
  ...KITCHEN,
  ...PRINTER_STATION,
  ...ALL_DESK_STATIONS.flatMap((s) => s.items),
  ...STANDING_ISLAND_EXTRAS,
  ...ROUND_TABLE_NOOK,
  ...PHONE_BOOTHS,
  ...LIBRARY,
  ...LOUNGE_PIT,
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
  | "coffee_machine"
  | "ping_pong"
  | "water_dispenser"
  | "whiteboard"
  | "fridge"
  | "vending"
  | "phone_booth"
  | "printer_station";

export interface SocialPoint {
  x: number;
  y: number;
  type: SocialPointType;
  /** Weight used when picking a destination (higher = more popular). */
  weight: number;
  /**
   * Radians. Direction the agent should face when sitting / standing here.
   * Undefined = no specific orientation (beanbags, ping-pong, etc.) — agent
   * keeps whatever direction they were walking in.
   */
  facing?: number;
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
        // Agent on couch faces the couch's visual orientation — which is
        // item.facing PLUS the type's FURNITURE_ROTATION default (π for
        // "couch", π/2 for "couch_v"). Without adding FURNITURE_ROTATION we
        // told agents to face south on couches that actually face north/east.
        const facing = ((item.facing ?? 0) * Math.PI) / 180 + (FURNITURE_ROTATION[t] ?? 0);
        // Nudge the social point a small distance toward the couch's "open"
        // side (the direction the couch faces), so agents land on the seat
        // cushion rather than the backrest / back edge. The seat offset is
        // 1/4 of the shorter dimension — small enough to stay on the mesh,
        // large enough to land on a free nav cell adjacent to anything
        // pushed up against the couch's back.
        const seatOffset = Math.min(w, h) * 0.25;
        const sx = Math.sin(facing) * seatOffset;
        const sy = Math.cos(facing) * seatOffset;
        points.push({
          x: Math.round(item.x + w / 2 + sx),
          y: Math.round(item.y + h / 2 + sy),
          type: t,
          weight: 3,
          facing,
        });
        break;
      }
      case "beanbag": {
        const [defaultW, defaultH] = ITEM_FOOTPRINT.beanbag ?? [40, 40];
        const w = item.w ?? defaultW;
        const h = item.h ?? defaultH;
        // Beanbags have no "front" — leave facing undefined so the agent keeps
        // whatever direction they walked in from (feels like flopping down).
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2),
          type: t,
          weight: 2,
        });
        break;
      }
      // round_table is a pure prop — no SOCIAL_POINT. It still blocks
      // navigation via ITEM_METADATA.round_table.blocksNavigation=true, so
      // A* will route agents around it.
      case "coffee_machine": {
        // Stand 30 south of center (dialed in via arena-tuner misc cohort).
        const [defW, defH] = ITEM_FOOTPRINT.coffee_machine ?? [32, 34];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2 + 30),
          type: t,
          weight: 2,
          facing: Math.PI, // face north, toward the machine
        });
        break;
      }
      case "ping_pong": {
        // Two players at the ends of the long axis, facing each other.
        // Size-aware distance: half the long dimension + 20 units margin so
        // agents stand just past the end regardless of table size. Tuner
        // table (100×60) → dist 70; main-arena LOUNGE_PIT table (180×100)
        // → dist 110. Formula locked via /arena-tuner misc cohort.
        const [defW, defH] = ITEM_FOOTPRINT.ping_pong ?? [100, 60];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        const cx = item.x + w / 2;
        const cy = item.y + h / 2;
        const rotRad = ((item.facing ?? 0) * Math.PI) / 180;
        // Long axis: the larger of w / h BEFORE rotation. Most ping pong
        // meshes in the library have long=+x, but this also covers
        // authored tables where h > w.
        const longIsX = w >= h;
        const longLen = longIsX ? w : h;
        const longX = longIsX ? Math.cos(rotRad) : -Math.sin(rotRad);
        const longY = longIsX ? -Math.sin(rotRad) : -Math.cos(rotRad);
        const dist = longLen / 2 + 20;
        points.push({
          x: Math.round(cx + longX * dist),
          y: Math.round(cy + longY * dist),
          type: t,
          weight: 1,
          facing: Math.atan2(-longX, -longY),
        });
        points.push({
          x: Math.round(cx - longX * dist),
          y: Math.round(cy - longY * dist),
          type: t,
          weight: 1,
          facing: Math.atan2(longX, longY),
        });
        break;
      }
      case "water_dispenser": {
        const [defW, defH] = ITEM_FOOTPRINT.water_dispenser ?? [30, 30];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2 + 40), // tuner
          type: t,
          weight: 1,
          facing: Math.PI,
        });
        break;
      }
      case "fridge":
      case "vending":
      case "phone_booth":
      case "printer_station": {
        // All four placed via the misc cohort. Negative distance for fridge /
        // vending puts the agent just inside the mesh footprint (the front
        // face of these items visually extends past item.y + h).
        const [defW, defH] = ITEM_FOOTPRINT[item.type] ?? [40, 40];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        const dist =
          item.type === "fridge"
            ? -17
            : item.type === "vending"
              ? -5
              : item.type === "phone_booth"
                ? 0
                : 47; // printer_station
        const rotRad = ((item.facing ?? 0) * Math.PI) / 180;
        points.push({
          x: Math.round(item.x + w / 2 + Math.sin(rotRad) * dist),
          y: Math.round(item.y + h / 2 + Math.cos(rotRad) * dist),
          type: t,
          weight: 1,
          facing: rotRad + Math.PI,
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
        const [defW, defH] = ITEM_FOOTPRINT[item.type] ?? [60, 40];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        // Distances dialed in from the arena-tuner. Agent stands south of the
        // item by `dist` (measured from item CENTER, so small values place
        // the agent near/inside the mesh footprint). Facing π = looking north,
        // back toward the equipment.
        const dist = item.type === "squat_rack" ? 7 : item.type === "pull_up_tower" ? 10 : 40; // dumbbell_rack
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2 + dist),
          facing: Math.PI,
          style: "lift",
        });
        break;
      }
      case "punching_bag": {
        const [defW, defH] = ITEM_FOOTPRINT.punching_bag ?? [32, 32];
        const w = item.w ?? defW;
        const h = item.h ?? defH;
        points.push({
          x: Math.round(item.x + w / 2),
          y: Math.round(item.y + h / 2 + 16), // dialed in via tuner
          facing: Math.PI,
          style: "box",
        });
        break;
      }
      // Yoga mats are rug items with specific accent colors (teal / coral).
      case "rug" as string: {
        if (item.color === "#3BAFA9" || item.color === "#FF6B5B") {
          const w = item.w ?? 70;
          const h = item.h ?? 30;
          // Stretching on the mat: default face north for a consistent camera look.
          points.push({
            x: Math.round(item.x + w / 2),
            y: Math.round(item.y + h / 2),
            facing: Math.PI,
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
  return GYM_WORKOUT_POINTS[Math.floor(Math.random() * GYM_WORKOUT_POINTS.length)];
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

/**
 * Precomputed standing points for desk_0..desk_19 sourced directly from the
 * station factories. Each factory knows where its agent stands + which way
 * they face (post-cluster-rotation), so this is just an index flip.
 */
export const DESK_STANDING_POINTS: { x: number; y: number; facing: number }[] = (() => {
  const byIndex: { x: number; y: number; facing: number }[] = [];
  for (const station of ALL_DESK_STATIONS) {
    const idx = parseInt(station.id.slice(5), 10);
    if (Number.isNaN(idx)) continue;
    byIndex[idx] = { ...station.standPoint };
  }
  return byIndex;
})();
