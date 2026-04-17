import type { FurnitureItem } from "./types";

let uidCounter = 0;
const uid = (prefix: string) => `${prefix}_${uidCounter++}`;

/**
 * Dense hackathon-arena layout, adapted from Claw3D's DEFAULT_FURNITURE.
 * Canvas is 1800x1800. We use the top portion (~y=0 to y=800) for the
 * populated office, leaving empty space below as outdoor area.
 *
 * Extended from Claw3D's 8-desk layout to 20 desks (4 rows of 5) to
 * support the top 20 agents cap.
 */

type DeskType = "desk_cubicle" | "executive_desk";
type DeskFacing = "south" | "north";

function deskDims(type: DeskType): { w: number; h: number } {
  return type === "executive_desk" ? { w: 130, h: 65 } : { w: 100, h: 55 };
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
    // Chair north of desk, agent faces south toward desk
    return [
      { type, x, y, _uid: uid("desk"), id },
      { type: "chair", x: x + chairX, y: y - 10, facing: 180, _uid: uid("chair") },
      { type: "computer", x: x + chairX, y: y - 13, _uid: uid("comp") },
      { type: "keyboard", x: x + chairX + 10, y: y - 5, _uid: uid("kb") },
      { type: "mouse", x: x + chairX + 32, y: y - 5, _uid: uid("mouse") },
    ];
  }
  // North-facing: desk rotated 180, chair south of desk, agent faces north
  return [
    { type, x, y, _uid: uid("desk"), id, facing: 180 },
    { type: "chair", x: x + chairX, y: y + h + 10, facing: 0, _uid: uid("chair") },
    { type: "computer", x: x + chairX, y: y + h + 13, _uid: uid("comp") },
    { type: "keyboard", x: x + chairX + 10, y: y + h + 5, _uid: uid("kb") },
    { type: "mouse", x: x + chairX + 32, y: y + h + 5, _uid: uid("mouse") },
  ];
}

/**
 * A "pod" of 4 desks in a 2x2 block. Top row faces south, bottom row faces
 * north — so agents in the same pod sit across from each other and make
 * eye contact over their monitors.
 */
function deskPod(
  startIndex: number,
  x: number,
  y: number,
  type: DeskType = "desk_cubicle"
): FurnitureItem[] {
  const { w, h } = deskDims(type);
  const colGap = type === "executive_desk" ? 30 : 20;
  const rowGap = type === "executive_desk" ? 45 : 35;
  const xStep = w + colGap;
  const yStep = h + rowGap;
  return [
    ...deskCluster(`desk_${startIndex}`, x, y, { type, facing: "south" }),
    ...deskCluster(`desk_${startIndex + 1}`, x + xStep, y, { type, facing: "south" }),
    ...deskCluster(`desk_${startIndex + 2}`, x, y + yStep, { type, facing: "north" }),
    ...deskCluster(`desk_${startIndex + 3}`, x + xStep, y + yStep, { type, facing: "north" }),
  ];
}

// ── Interior walls: subdivide the office into zones ───────────────────────
const WALL_THICK = 8;
function wall(x: number, y: number, w: number, h: number): FurnitureItem {
  return { type: "wall", x, y, w, h, _uid: uid("wall") };
}
const INTERIOR_WALLS: FurnitureItem[] = [
  // Meeting room separating wall (vertical, between entrance nook and desks)
  wall(320, 0, WALL_THICK, 100),
  wall(320, 150, WALL_THICK, 70),
  // Horizontal wall under meeting nook (leaves gap for doorway)
  wall(0, 220, 230, WALL_THICK),
  wall(280, 220, 50, WALL_THICK),
  // Kitchen wall (separates kitchen zone from desk area) with a 50px doorway
  wall(760, 220, 155, WALL_THICK), // left segment, x=760 to 915
  wall(965, 220, 235, WALL_THICK), // right segment, x=965 to 1200
  wall(760, 0, WALL_THICK, 220),
  // Lounge wall (right side, separates right lounge from desk area)
  wall(980, 280, WALL_THICK, 420),
];

// ── Entrance / meeting nook (top-left) ─────────────────────────────────────
// Table pushed down-right to align with chair cluster (GLB origin offset).
const ENTRANCE: FurnitureItem[] = [
  { type: "round_table", x: 80, y: 190, r: 90, _uid: uid("table") },
  { type: "chair", x: 130, y: 50, facing: 0, _uid: uid("chair") },
  { type: "chair", x: 200, y: 90, facing: 325, _uid: uid("chair") },
  { type: "chair", x: 180, y: 170, facing: 240, _uid: uid("chair") },
  { type: "chair", x: 50, y: 150, facing: 105, _uid: uid("chair") },
  { type: "chair", x: 60, y: 80, facing: 60, _uid: uid("chair") },
  { type: "couch", x: 270, y: 90, vertical: true, facing: 180, _uid: uid("couch") },
  { type: "plant", x: 40, y: 40, _uid: uid("plant") },
  { type: "trash", x: 210, y: 20, _uid: uid("trash") },
];

// ── Kitchen (top-right) ────────────────────────────────────────────────────
// Round dining table pushed left + down to align with chair cluster (GLB origin offset).
const KITCHEN: FurnitureItem[] = [
  { type: "fridge", x: 1050, y: 20, _uid: uid("fridge") },
  { type: "cabinet", x: 980, y: 30, w: 40, h: 40, _uid: uid("cabinet") },
  { type: "cabinet", x: 840, y: 30, w: 80, h: 40, elevation: 0, _uid: uid("cabinet") },
  { type: "coffee_machine", x: 880, y: 30, elevation: 0.56, _uid: uid("coffee") },
  { type: "round_table", x: 1000, y: 210, r: 50, _uid: uid("table") },
  { type: "chair", x: 1010, y: 70, facing: 30, _uid: uid("chair") },
  { type: "chair", x: 1115, y: 120, facing: 270, _uid: uid("chair") },
  { type: "chair", x: 1090, y: 70, facing: 330, _uid: uid("chair") },
  { type: "chair", x: 980, y: 130, facing: 90, _uid: uid("chair") },
  { type: "vending", x: 790, y: 10, _uid: uid("vending") },
  { type: "trash", x: 830, y: 20, _uid: uid("trash") },
];

// ── Bookshelf row (top-middle) ─────────────────────────────────────────────
const LIBRARY: FurnitureItem[] = [
  { type: "bookshelf", x: 600, y: 30, w: 80, h: 120, _uid: uid("shelf") },
  { type: "chair", x: 550, y: 50, facing: 0, _uid: uid("chair") },
  { type: "plant", x: 660, y: 30, _uid: uid("plant") },
];

// ── 5 desk pods of 4 desks each (20 desks total) ──────────────────────────
// Top row: 3 standard cubicle pods. Bottom row: 2 executive L-desk pods for
// visual variety. Within each pod, top-row desks face south and bottom-row
// desks face north, so agents sit across from each other.
const DESK_ROWS: FurnitureItem[] = [
  ...deskPod(0, 200, 300, "desk_cubicle"),    // desks 0-3
  ...deskPod(4, 470, 300, "desk_cubicle"),    // desks 4-7
  ...deskPod(8, 740, 300, "desk_cubicle"),    // desks 8-11
  ...deskPod(12, 250, 600, "executive_desk"), // desks 12-15 (manager pod)
  ...deskPod(16, 600, 600, "executive_desk"), // desks 16-19 (manager pod)
];

// ── Lounge (right side) ────────────────────────────────────────────────────
const LOUNGE: FurnitureItem[] = [
  { type: "couch", x: 1000, y: 380, w: 100, h: 40, facing: 90, _uid: uid("couch") },
  { type: "couch", x: 1000, y: 540, w: 100, h: 40, facing: 90, _uid: uid("couch") },
  { type: "table_rect", x: 980, y: 460, w: 60, h: 30, facing: 270, _uid: uid("table") },
  { type: "beanbag", x: 1000, y: 330, color: "#e65100", facing: 90, _uid: uid("bean") },
  { type: "beanbag", x: 1000, y: 410, color: "#1565c0", facing: 90, _uid: uid("bean") },
  { type: "lamp", x: 980, y: 390, _uid: uid("lamp") },
  { type: "plant", x: 1090, y: 310, _uid: uid("plant") },
  { type: "plant", x: 1100, y: 600, _uid: uid("plant") },
];

// ── Bottom lounge nook ─────────────────────────────────────────────────────
const BOTTOM_LOUNGE: FurnitureItem[] = [
  { type: "couch", x: 570, y: 990, w: 100, h: 40, _uid: uid("couch") },
  { type: "table_rect", x: 580, y: 1040, w: 80, h: 30, _uid: uid("table") },
  { type: "beanbag", x: 700, y: 990, color: "#16a34a", _uid: uid("bean") },
  { type: "beanbag", x: 480, y: 990, color: "#8b5cf6", _uid: uid("bean") },
  { type: "plant", x: 710, y: 940, _uid: uid("plant") },
  { type: "plant", x: 460, y: 1050, _uid: uid("plant") },
  { type: "lamp", x: 620, y: 950, _uid: uid("lamp") },
];

// ── Ambient decor ──────────────────────────────────────────────────────────
const DECOR: FurnitureItem[] = [
  { type: "whiteboard", x: 40, y: 200, w: 10, h: 60, _uid: uid("wb") },
  { type: "plant", x: 340, y: 800, _uid: uid("plant") },
  { type: "plant", x: 880, y: 800, _uid: uid("plant") },
  { type: "lamp", x: 430, y: 100, _uid: uid("lamp") },
  { type: "lamp", x: 750, y: 100, _uid: uid("lamp") },
];

export const DEFAULT_ARENA_FURNITURE: FurnitureItem[] = [
  ...INTERIOR_WALLS,
  ...ENTRANCE,
  ...LIBRARY,
  ...KITCHEN,
  ...DESK_ROWS,
  ...LOUNGE,
  ...BOTTOM_LOUNGE,
  ...DECOR,
];

/** Map agent index (0-19) to desk id */
export function getDeskIdForAgent(agentIndex: number): string {
  return `desk_${agentIndex}`;
}

/**
 * Precomputed standing points (x, y) for each desk_0..desk_19, derived from
 * the actual layout. Agents walk to these coordinates when their status is
 * "working" and sit there.
 */
export const DESK_STANDING_POINTS: { x: number; y: number }[] = (() => {
  const deskItems = DEFAULT_ARENA_FURNITURE.filter(
    (item) =>
      (item.type === "desk_cubicle" || item.type === "executive_desk") &&
      typeof item.id === "string" &&
      item.id.startsWith("desk_")
  );
  const byIndex: { x: number; y: number }[] = [];
  for (const item of deskItems) {
    const idx = parseInt(item.id!.slice(5), 10);
    if (Number.isNaN(idx)) continue;
    const { w, h } = deskDims(item.type as DeskType);
    const facing = item.facing ?? 0;
    byIndex[idx] =
      facing === 180
        ? { x: item.x + w / 2, y: item.y + h + 5 }
        : { x: item.x + w / 2, y: item.y - 5 };
  }
  return byIndex;
})();
