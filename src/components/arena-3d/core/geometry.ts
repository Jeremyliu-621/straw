import {
  CANVAS_H,
  CANVAS_W,
  DOOR_LENGTH,
  DOOR_THICKNESS,
  MIN_WALL_LENGTH,
  SCALE,
  SNAP_GRID,
  WALL_THICKNESS,
} from "./constants";
import type {
  CanvasPoint,
  FurnitureItem,
} from "./types";

export const toWorld = (cx: number, cy: number): [number, number, number] => [
  cx * SCALE - CANVAS_W * SCALE * 0.5,
  0,
  cy * SCALE - CANVAS_H * SCALE * 0.5,
];

/**
 * Rotate a point (px, py) around (cx, cy) by `deg` using the canvas-y convention
 * that matches three.js Y-axis rotation (canvas y ↔ world z):
 *   x' = x*cos + y*sin
 *   y' = -x*sin + y*cos
 */
export function rotatePointAround(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number
): { x: number; y: number } {
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

/**
 * If the item belongs to a cluster, return a copy with x/y/facing rotated by
 * the cluster transform. Otherwise return the item unchanged.
 *
 * Consumers that care about the FINAL canvas position (nav grid bounds,
 * stand-point derivation, social/gym spot derivation) should call this.
 * The render path does NOT use this — it uses the raw item positions inside
 * a three.js <group> that applies the cluster rotation.
 */
export function applyClusterTransform(item: FurnitureItem): FurnitureItem {
  if (!item._cluster) return item;
  const { pivotX, pivotY, rotDeg } = item._cluster;
  const baseSize = getItemBaseSize(item);
  const cx = item.x + baseSize.width / 2;
  const cy = item.y + baseSize.height / 2;
  const rotated = rotatePointAround(cx, cy, pivotX, pivotY, rotDeg);
  return {
    ...item,
    x: rotated.x - baseSize.width / 2,
    y: rotated.y - baseSize.height / 2,
    facing: ((item.facing ?? 0) + rotDeg + 360) % 360,
  };
}

export const snap = (value: number) =>
  Math.round(value / SNAP_GRID) * SNAP_GRID;

let uidCounter = 0;

export const nextUid = () => `fi_${Date.now()}_${uidCounter++}`;

export const normalizeDegrees = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const resolveItemTypeKey = (item: FurnitureItem) =>
  item.type === "couch" && item.vertical ? "couch_v" : item.type;

export const ITEM_FOOTPRINT: Record<string, [number, number]> = {
  wall: [80, WALL_THICKNESS],
  door: [DOOR_LENGTH, DOOR_THICKNESS],
  desk_cubicle: [100, 55],
  standing_desk: [100, 55],
  chair: [24, 24],
  round_table: [120, 120],
  executive_desk: [130, 65],
  couch: [100, 40],
  couch_v: [40, 80],
  bookshelf: [80, 120],
  plant: [24, 24],
  beanbag: [40, 40],
  table_rect: [80, 40],
  coffee_machine: [32, 34],
  fridge: [40, 80],
  water_cooler: [20, 54],
  whiteboard: [10, 60],
  cabinet: [200, 40],
  computer: [30, 20],
  lamp: [30, 30],
  printer: [40, 35],
  stove: [40, 40],
  microwave: [30, 20],
  wall_cabinet: [80, 20],
  sink: [40, 40],
  vending: [40, 60],
  keyboard: [30, 14],
  mouse: [16, 10],
  trash: [20, 20],
  mug: [14, 14],
  clock: [20, 20],
  // Extended types
  server_rack: [55, 80],
  glass_wall: [8, 60],
  half_wall: [80, 8],
  printer_station: [60, 50],
  rug: [100, 80],
  cable_tray: [230, 18],
  pendant_light: [20, 20],
  tv_screen: [120, 10],
  wall_clock: [20, 20],
  neon_sign: [60, 10],
  painting: [50, 8],
  // Gym equipment
  ping_pong: [100, 60],
  phone_booth: [78, 72],
  dumbbell_rack: [80, 28],
  squat_rack: [80, 80],
  pull_up_tower: [60, 60],
  punching_bag: [32, 32],
  rolling_whiteboard: [90, 40],
  water_dispenser: [30, 30],
};

export const getItemBaseSize = (item: FurnitureItem) => {
  if (item.r !== undefined) {
    return { width: item.r * 2, height: item.r * 2 };
  }
  const [defaultWidth, defaultHeight] = ITEM_FOOTPRINT[
    resolveItemTypeKey(item)
  ] ?? [item.w ?? 40, item.h ?? 40];
  return {
    width: item.w ?? defaultWidth,
    height: item.h ?? defaultHeight,
  };
};

/**
 * Per-type override for nav-grid blocking. Lets us nudge bounds to match
 * the actual visible mesh footprint when the GLB origin convention doesn't
 * line up with our (item.x, item.y) = top-left assumption.
 *
 * Tuned interactively via /arena-tuner — the "nav-tune" cohort exposes
 * sliders for each type and a "copy values" button that emits the dialed-in
 * map here as a paste-able snippet.
 */
export interface NavAnchorOverride {
  /** Shift bounds.x by this (canvas units). */
  dx?: number;
  /** Shift bounds.y by this (canvas units). */
  dy?: number;
  /** Override navPadding on x-axis. Falls back to ITEM_METADATA.navPadding. */
  padX?: number;
  /** Override navPadding on y-axis. Falls back to ITEM_METADATA.navPadding. */
  padY?: number;
}

export const NAV_ANCHOR_OVERRIDES: Record<string, NavAnchorOverride> = {
  // Tuned in /arena-tuner with nav: on. Locked values per type below.
  beanbag: { dy: -24, padX: 5, padY: -9 },
  couch: { dy: 14, padY: 36 },
  couch_v: { dx: -55, padX: 15, padY: -20 },
  desk_cubicle: { dx: -24, dy: -35, padY: 14 },
  fridge: { dy: -41, padX: 0, padY: -30 },
  plant: { dx: -19, dy: -27, padX: 11, padY: 26 },
  round_table: { dx: 7, dy: -157, padX: 15, padY: 36 },
  squat_rack: { padX: -2, padY: -30 },
  standing_desk: { dx: -31, dy: -53 },
  table_rect: { dy: -23, padX: 9, padY: 3 },
  vending: { dx: -7, dy: -35, padX: -9, padY: -14 },
};

export const ITEM_METADATA: Record<string, { blocksNavigation: boolean; navPadding?: number }> = {
  wall:            { blocksNavigation: true, navPadding: 0 },
  door:            { blocksNavigation: false },
  chair:           { blocksNavigation: false },
  couch:           { blocksNavigation: true, navPadding: 5 },
  couch_v:         { blocksNavigation: true, navPadding: 5 },
  beanbag:         { blocksNavigation: true  },
  desk_cubicle:    { blocksNavigation: true, navPadding: 0 },
  standing_desk:   { blocksNavigation: true, navPadding: 0 },
  executive_desk:  { blocksNavigation: true, navPadding: 3 },
  round_table:     { blocksNavigation: true, navPadding: 25 },
  table_rect:      { blocksNavigation: true  },
  bookshelf:       { blocksNavigation: true  },
  cabinet:         { blocksNavigation: true, navPadding: 5 },
  wall_cabinet:    { blocksNavigation: false },
  fridge:          { blocksNavigation: true  },
  stove:           { blocksNavigation: true  },
  microwave:       { blocksNavigation: false },
  sink:            { blocksNavigation: true  },
  coffee_machine:  { blocksNavigation: false },
  printer:         { blocksNavigation: true  },
  vending:         { blocksNavigation: true  },
  whiteboard:      { blocksNavigation: true  },
  computer:        { blocksNavigation: false },
  keyboard:        { blocksNavigation: false },
  mouse:           { blocksNavigation: false },
  water_cooler:    { blocksNavigation: true  },
  plant:           { blocksNavigation: true  },
  lamp:            { blocksNavigation: false },
  trash:           { blocksNavigation: false },
  clock:           { blocksNavigation: false },
  mug:             { blocksNavigation: false },
  // Extended types from restructured layout
  server_rack:     { blocksNavigation: true  },
  glass_wall:      { blocksNavigation: true, navPadding: 0 },
  half_wall:       { blocksNavigation: true, navPadding: 0 },
  printer_station: { blocksNavigation: true, navPadding: 2 },
  rug:             { blocksNavigation: false }, // floor decal
  cable_tray:      { blocksNavigation: false }, // overhead
  pendant_light:   { blocksNavigation: false }, // ceiling
  tv_screen:       { blocksNavigation: false }, // wall-mounted
  wall_clock:      { blocksNavigation: false }, // wall-mounted
  neon_sign:       { blocksNavigation: false }, // wall-mounted
  painting:        { blocksNavigation: false }, // wall-mounted
  // Gym equipment
  ping_pong:       { blocksNavigation: true  },
  phone_booth:     { blocksNavigation: true  },
  dumbbell_rack:   { blocksNavigation: true  },
  squat_rack:      { blocksNavigation: true  },
  pull_up_tower:   { blocksNavigation: true  },
  punching_bag:    { blocksNavigation: true  },
  rolling_whiteboard: { blocksNavigation: true  },
  water_dispenser: { blocksNavigation: true  },
};

export const FURNITURE_ROTATION: Record<string, number> = {
  couch: Math.PI,
  couch_v: Math.PI / 2,
  executive_desk: -Math.PI / 2,
  whiteboard: Math.PI / 2,
};

export const getItemRotationRadians = (item: FurnitureItem) =>
  ((item.facing ?? 0) * Math.PI) / 180 +
  (FURNITURE_ROTATION[resolveItemTypeKey(item)] ?? 0);

export const getItemBounds = (item: FurnitureItem) => {
  const { width, height } = getItemBaseSize(item);
  const rotation = getItemRotationRadians(item);
  const absCos = Math.abs(Math.cos(rotation));
  const absSin = Math.abs(Math.sin(rotation));
  const boundsWidth = width * absCos + height * absSin;
  const boundsHeight = width * absSin + height * absCos;
  const centerX = item.x + width / 2;
  const centerY = item.y + height / 2;
  return {
    x: centerX - boundsWidth / 2,
    y: centerY - boundsHeight / 2,
    w: boundsWidth,
    h: boundsHeight,
    width,
    height,
  };
};

export const createWallItem = (
  start: CanvasPoint,
  end: CanvasPoint,
  uid: string,
): FurnitureItem => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (horizontal) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return {
      _uid: uid,
      type: "wall",
      x: snap(minX),
      y: snap(start.y) - WALL_THICKNESS / 2,
      w: Math.max(MIN_WALL_LENGTH, snap(maxX - minX) + WALL_THICKNESS),
      h: WALL_THICKNESS,
      facing: 0,
    };
  }

  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  return {
    _uid: uid,
    type: "wall",
    x: snap(start.x) - WALL_THICKNESS / 2,
    y: snap(minY),
    w: WALL_THICKNESS,
    h: Math.max(MIN_WALL_LENGTH, snap(maxY - minY) + WALL_THICKNESS),
    facing: 0,
  };
};
