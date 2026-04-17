import type { FurnitureItem } from "./types";

/**
 * Fixed hackathon arena layout with 20 desk stations arranged in 4 rows of 5.
 * Includes kitchen area, lounge, plants, and decorative furniture.
 */

function desk(id: string, x: number, y: number): FurnitureItem[] {
  return [
    { type: "desk_cubicle", x, y, _uid: `desk_${id}`, id: `desk_${id}` },
    { type: "chair", x: x + 20, y: y - 10, facing: 180, _uid: `chair_${id}` },
    { type: "computer", x: x + 20, y: y - 13, _uid: `comp_${id}` },
    { type: "keyboard", x: x + 30, y: y - 5, _uid: `kb_${id}` },
    { type: "mouse", x: x + 52, y: y - 5, _uid: `mouse_${id}` },
  ];
}

// 4 rows of 5 desks — covers up to 20 agents
const DESK_ROWS = [
  // Row 1 (y=250)
  ...desk("0", 80, 250),
  ...desk("1", 260, 250),
  ...desk("2", 440, 250),
  ...desk("3", 620, 250),
  ...desk("4", 800, 250),
  // Row 2 (y=400)
  ...desk("5", 80, 400),
  ...desk("6", 260, 400),
  ...desk("7", 440, 400),
  ...desk("8", 620, 400),
  ...desk("9", 800, 400),
  // Row 3 (y=550)
  ...desk("10", 80, 550),
  ...desk("11", 260, 550),
  ...desk("12", 440, 550),
  ...desk("13", 620, 550),
  ...desk("14", 800, 550),
  // Row 4 (y=700)
  ...desk("15", 80, 700),
  ...desk("16", 260, 700),
  ...desk("17", 440, 700),
  ...desk("18", 620, 700),
  ...desk("19", 800, 700),
];

const KITCHEN: FurnitureItem[] = [
  { type: "fridge", x: 1050, y: 20, _uid: "fridge_0" },
  { type: "cabinet", x: 980, y: 30, _uid: "cab_0" },
  { type: "coffee_machine", x: 880, y: 30, elevation: 0.56, _uid: "coffee_0" },
  { type: "cabinet", x: 840, y: 30, _uid: "cab_1" },
  { type: "round_table", x: 920, y: 120, r: 50, _uid: "ktable_0" },
  { type: "chair", x: 960, y: 120, facing: 0, _uid: "kchair_0" },
  { type: "chair", x: 960, y: 180, facing: 180, _uid: "kchair_1" },
  { type: "chair", x: 910, y: 150, facing: 90, _uid: "kchair_2" },
];

const LOUNGE: FurnitureItem[] = [
  { type: "couch", x: 1000, y: 380, facing: 90, _uid: "couch_0" },
  { type: "couch", x: 1000, y: 500, facing: 90, _uid: "couch_1" },
  { type: "table_rect", x: 980, y: 440, facing: 270, _uid: "ltable_0" },
  { type: "beanbag", x: 1000, y: 330, color: "#6366f1", facing: 90, _uid: "bean_0" },
  { type: "beanbag", x: 1000, y: 560, color: "#ec4899", facing: 90, _uid: "bean_1" },
  { type: "lamp", x: 1020, y: 350, _uid: "llamp_0" },
];

const DECOR: FurnitureItem[] = [
  { type: "round_table", x: 50, y: 50, r: 90, _uid: "entry_table" },
  { type: "bookshelf", x: 600, y: 30, _uid: "bookshelf_0" },
  { type: "whiteboard", x: 40, y: 180, _uid: "wb_0" },
  { type: "clock", x: 550, y: 5, _uid: "clock_0" },
  { type: "plant", x: 40, y: 40, _uid: "plant_0" },
  { type: "plant", x: 660, y: 30, _uid: "plant_1" },
  { type: "plant", x: 340, y: 800, _uid: "plant_2" },
  { type: "plant", x: 450, y: 150, _uid: "plant_3" },
  { type: "plant", x: 1090, y: 280, _uid: "plant_4" },
  { type: "plant", x: 1100, y: 600, _uid: "plant_5" },
  { type: "plant", x: 200, y: 800, _uid: "plant_6" },
  { type: "plant", x: 700, y: 800, _uid: "plant_7" },
  { type: "trash", x: 210, y: 20, _uid: "trash_0" },
  { type: "trash", x: 830, y: 20, _uid: "trash_1" },
  { type: "lamp", x: 430, y: 100, _uid: "lamp_0" },
  { type: "lamp", x: 750, y: 100, _uid: "lamp_1" },
  { type: "vending", x: 790, y: 10, _uid: "vending_0" },
];

export const DEFAULT_ARENA_FURNITURE: FurnitureItem[] = [
  ...DESK_ROWS,
  ...KITCHEN,
  ...LOUNGE,
  ...DECOR,
];

/** Map agent index (0-19) to desk id */
export function getDeskIdForAgent(agentIndex: number): string {
  return `desk_${agentIndex}`;
}
