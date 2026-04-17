import type { FurnitureItem } from "./types";

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
  { type: "cabinet", x: 620, y: 25, w: 80, h: 40, _uid: uid("cabinet") },
  { type: "coffee_machine", x: 650, y: 30, elevation: 0.56, _uid: uid("coffee") },
  { type: "cabinet", x: 720, y: 25, w: 80, h: 40, _uid: uid("cabinet") },
  { type: "vending", x: 820, y: 15, _uid: uid("vending") },
  { type: "round_table", x: 680, y: 170, r: 50, _uid: uid("table") },
  { type: "chair", x: 670, y: 105, facing: 30, _uid: uid("chair") },
  { type: "chair", x: 750, y: 130, facing: 270, _uid: uid("chair") },
  { type: "chair", x: 730, y: 200, facing: 330, _uid: uid("chair") },
  { type: "chair", x: 625, y: 170, facing: 90, _uid: uid("chair") },
  { type: "pendant_light", x: 700, y: 170, _uid: uid("pend") },
  { type: "trash", x: 810, y: 100, _uid: uid("trash") },
  { type: "wall_clock", x: 730, y: 5, wallAttach: "N", _uid: uid("clock") },
];

// ── Printer / Supply Station ─────────────────────────────────────────────
const PRINTER_STATION: FurnitureItem[] = [
  { type: "printer_station", x: 920, y: 30, w: 60, h: 50, _uid: uid("print") },
  { type: "printer_station", x: 1000, y: 30, w: 60, h: 50, _uid: uid("print") },
  { type: "cabinet", x: 1080, y: 25, w: 100, h: 40, _uid: uid("cabinet") },
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
  ...deskPod(8, 580, 290),  // desks 8-11
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
  { type: "rug", x: 20, y: 570, w: 220, h: 150, color: "#7A6B55", _uid: uid("rug") },
  { type: "bookshelf", x: 30, y: 580, w: 80, h: 120, _uid: uid("shelf") },
  { type: "couch_v", x: 150, y: 590, _uid: uid("chair") },
  { type: "couch_v", x: 150, y: 660, _uid: uid("chair") },
  { type: "lamp", x: 220, y: 590, _uid: uid("lamp") },
  { type: "plant", x: 220, y: 700, _uid: uid("plant") },
];

// ── Lounge Pit ───────────────────────────────────────────────────────────
const LOUNGE_PIT: FurnitureItem[] = [
  { type: "rug", x: 60, y: 760, w: 340, h: 260, color: "#4A6E8E", _uid: uid("rug") },
  { type: "couch", x: 80, y: 770, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 260, y: 770, w: 100, h: 40, _uid: uid("couch") },
  { type: "couch", x: 80, y: 960, w: 100, h: 40, facing: 180, _uid: uid("couch") },
  { type: "table_rect", x: 160, y: 870, w: 120, h: 50, _uid: uid("table") },
  { type: "lamp", x: 70, y: 880, _uid: uid("lamp") },
  { type: "lamp", x: 370, y: 880, _uid: uid("lamp") },
  { type: "plant", x: 40, y: 740, _uid: uid("plant") },
  { type: "plant", x: 390, y: 740, _uid: uid("plant") },
  { type: "plant", x: 40, y: 1040, _uid: uid("plant") },
];

// ── Beanbag Grove ────────────────────────────────────────────────────────
const BEANBAG_GROVE: FurnitureItem[] = [
  { type: "rug", x: 430, y: 790, w: 210, h: 200, color: "#C9A478", _uid: uid("rug") },
  { type: "beanbag", x: 450, y: 810, color: "#e65100", _uid: uid("bean") },
  { type: "beanbag", x: 520, y: 810, color: "#1565c0", _uid: uid("bean") },
  { type: "beanbag", x: 580, y: 810, color: "#16a34a", _uid: uid("bean") },
  { type: "beanbag", x: 450, y: 910, color: "#8b5cf6", _uid: uid("bean") },
  { type: "beanbag", x: 580, y: 910, color: "#E8B84A", _uid: uid("bean") },
  { type: "table_rect", x: 500, y: 870, w: 50, h: 30, _uid: uid("t") },
  { type: "plant", x: 420, y: 970, _uid: uid("plant") },
];

// ── Ping Pong Zone ───────────────────────────────────────────────────────
const PING_PONG: FurnitureItem[] = [
  { type: "ping_pong", x: 690, y: 830, w: 180, h: 100, _uid: uid("pp") },
  { type: "plant", x: 660, y: 790, _uid: uid("plant") },
  { type: "plant", x: 900, y: 790, _uid: uid("plant") },
  { type: "plant", x: 660, y: 970, _uid: uid("plant") },
];

// ── Whiteboard Zone ──────────────────────────────────────────────────────
const WHITEBOARD_ZONE: FurnitureItem[] = [
  { type: "rolling_whiteboard", x: 960, y: 760, w: 100, h: 20, _uid: uid("wb") },
  { type: "rolling_whiteboard", x: 1080, y: 760, w: 100, h: 20, _uid: uid("wb") },
  { type: "couch_v", x: 980, y: 900, _uid: uid("chair") },
  { type: "couch_v", x: 1080, y: 900, _uid: uid("chair") },
  { type: "table_rect", x: 1020, y: 950, w: 60, h: 40, _uid: uid("table") },
  { type: "plant", x: 1150, y: 770, _uid: uid("plant") },
];

// ── Wall art / decor ─────────────────────────────────────────────────────
const WALL_DECOR: FurnitureItem[] = [
  // North perimeter wall
  { type: "painting", x: 120, y: 5, w: 70, h: 50, color: "#FF6B5B", wallAttach: "N", _uid: uid("art") },
  { type: "painting", x: 950, y: 5, w: 70, h: 50, color: "#3BAFA9", wallAttach: "N", _uid: uid("art") },
  { type: "neon_sign", x: 1080, y: 5, w: 100, h: 40, color: "#5EE3D4", wallAttach: "N", _uid: uid("neon") },
  // South perimeter wall
  { type: "painting", x: 200, y: 1095, w: 80, h: 55, color: "#E8B84A", wallAttach: "S", _uid: uid("art") },
  { type: "painting", x: 800, y: 1095, w: 90, h: 60, color: "#9B8FD1", wallAttach: "S", _uid: uid("art") },
  { type: "painting", x: 1050, y: 1095, w: 70, h: 50, color: "#7A9AB8", wallAttach: "S", _uid: uid("art") },
  // East perimeter wall
  { type: "painting", x: 1195, y: 630, w: 80, h: 55, color: "#5C8D65", wallAttach: "E", _uid: uid("art") },
  // West perimeter wall
  { type: "painting", x: 5, y: 230, w: 70, h: 50, color: "#D47A5B", wallAttach: "W", _uid: uid("art") },
  { type: "painting", x: 5, y: 900, w: 80, h: 55, color: "#3BAFA9", wallAttach: "W", _uid: uid("art") },
];

// ── Ambient scatter ──────────────────────────────────────────────────────
const AMBIENT_DECOR: FurnitureItem[] = [
  { type: "plant", x: 260, y: 740, _uid: uid("plant") },
  { type: "plant", x: 560, y: 740, _uid: uid("plant") },
  { type: "plant", x: 880, y: 740, _uid: uid("plant") },
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
    // Desk center
    const cx = item.x + w / 2;
    const cy = item.y + h / 2;
    // Chair is offset in +y for south-facing (facing=0 from our perspective)
    // or -y for north-facing (facing=180). Apply rotation.
    // Original offset (facing=0 == south-facing): dx=0, dy=-(h/2 + 5)
    // Original offset (facing=180 == north-facing): dx=0, dy=(h/2 + 5)
    // But the `facing` field on desk encodes 180 for north-facing. So the
    // "outward" direction depends: facing=0 → offset up (-y), facing=180 → down (+y).
    const isNorthFacing = Math.round(facingDeg / 180) % 2 === 1;
    const baseDx = 0;
    const baseDy = isNorthFacing ? h / 2 + 5 : -(h / 2 + 5);
    // Apply item rotation so rotated pods compute the correct world-space stand point.
    // The rotation applied by rotateAround also rotated the desk body, so its
    // `facing` already includes the pod rotation. We want the offset rotated
    // by the *pod* rotation only (not 180 for north-facing), since the
    // north/south flip was handled via `isNorthFacing`.
    const podRot = isNorthFacing ? rad - Math.PI : rad;
    const cos = Math.cos(podRot);
    const sin = Math.sin(podRot);
    const dx = baseDx * cos - baseDy * sin;
    const dy = baseDx * sin + baseDy * cos;
    byIndex[idx] = { x: Math.round(cx + dx), y: Math.round(cy + dy) };
  }
  return byIndex;
})();
