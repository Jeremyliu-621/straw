import type { FurnitureItem, ClusterTransform } from "./types";
import { FURNITURE_ROTATION, rotatePointAround } from "./geometry";

/**
 * Station factories. Each factory produces a self-contained bundle:
 *   - items to render (with `_cluster` metadata when the station is a
 *     multi-item rigid group like a desk+chair+computer),
 *   - a stand point that tells the game loop where to place the agent when
 *     they arrive, with correctly-transformed facing.
 *
 * These are the same math paths the `/arena-tuner` dev page uses and that
 * the user visually approved. Replaces the ad-hoc `deskCluster` /
 * `rotateAround` helpers that previously lived in defaultLayout.ts.
 */

let uidCounter = 0;
const uid = (prefix: string) => `station_${prefix}_${uidCounter++}`;

// ── Desk station ─────────────────────────────────────────────────────────
//
// A desk station is a rigid cluster of three items: desk_cubicle (or
// standing_desk), chair, and computer. The chair is offset to the NORTH of
// the desk (tuner-validated "south-facing" arrangement). The entire cluster
// rotates as a three.js <group> around the desk center, so at any rotation
// the three items stay rigidly aligned.
//
// For "north-facing" desks from the old layout, callers pass rotDeg=180. The
// chair still renders on the north side within the cluster, but after the
// 180° rotation that's visually the south side — same net layout as before.

export type DeskType = "desk_cubicle" | "standing_desk";

export const DESK_W = 100;
export const DESK_H = 55;
const DESK_CHAIR_X_OFFSET = DESK_W / 2 - 30; // 20
// Chair-center offset from desk center, pre-rotation:
//   dx_local = (w/2 - 30) + 12 = w/2 - 18 = -18 (from center)
//   dy_local = -10 + 12 = 2 → (2 - h/2) from center = -25.5
const DESK_STAND_DX = -18;
const DESK_STAND_DY = -(DESK_H / 2 - 2); // -25.5

export interface DeskStation {
  /** Desk id like "desk_0". Used by the game loop to route agents. */
  id: string;
  items: FurnitureItem[];
  standPoint: { x: number; y: number; facing: number };
}

export interface DeskStationOptions {
  id: string;
  /** Top-left x of the desk. */
  x: number;
  /** Top-left y of the desk. */
  y: number;
  /** Rotation of the whole station (degrees). 0 = default "south-facing". */
  rotDeg?: number;
  type?: DeskType;
}

export function makeDeskStation(opts: DeskStationOptions): DeskStation {
  const { id, x, y, rotDeg = 0, type = "desk_cubicle" } = opts;
  const deskCx = x + DESK_W / 2;
  const deskCy = y + DESK_H / 2;
  const cluster: ClusterTransform = {
    id: `cluster_${id}`,
    pivotX: deskCx,
    pivotY: deskCy,
    rotDeg,
  };

  // Items at pre-rotation canvas positions. Cluster transform is carried on
  // each item so nav/stand-point consumers can apply it, and the renderer
  // wraps them in a rotated three.js group.
  // Standing desks omit the chair — agents stand at them; sitting desks
  // include a chair facing the desk.
  const items: FurnitureItem[] = [
    {
      type,
      x,
      y,
      _uid: uid("desk"),
      id,
      _cluster: cluster,
    },
    ...(type === "standing_desk"
      ? []
      : [
          {
            type: "chair" as const,
            x: x + DESK_CHAIR_X_OFFSET,
            y: y - 10,
            facing: 180,
            _uid: uid("chair"),
            _cluster: cluster,
          },
        ]),
    {
      type: "computer",
      x: x + DESK_CHAIR_X_OFFSET,
      y: y - 13,
      // standing_desk renders ~1.47× taller than desk_cubicle (scale Y
      // 2.2 vs 1.5). The computer's default Y offset places it on the
      // cubicle surface; lift it on the taller desk so the monitor sits
      // on top instead of clipping into the desk.
      ...(type === "standing_desk" ? { elevation: 0.4 } : {}),
      _uid: uid("comp"),
      _cluster: cluster,
    },
  ];

  // Stand point: chair center pre-rotation, rotated around cluster pivot.
  const preStandX = deskCx + DESK_STAND_DX;
  const preStandY = deskCy + DESK_STAND_DY;
  const rotated = rotatePointAround(
    preStandX,
    preStandY,
    deskCx,
    deskCy,
    rotDeg
  );
  // +π so the agent looks toward the monitor (same convention as the tuner).
  const facing = (rotDeg * Math.PI) / 180 + Math.PI;

  return {
    id,
    items,
    standPoint: {
      x: Math.round(rotated.x),
      y: Math.round(rotated.y),
      facing,
    },
  };
}

/** A 2x2 pod of 4 desks. Top row faces "south", bottom row faces "north".
 *  If `rotDeg` is non-zero, the whole pod is rotated by that angle around
 *  its geometric center — each sub-station carries its own cluster rotation
 *  including the pod-level rotation so the render groups stay rigid. */
export interface DeskPodOptions {
  startIndex: number;
  x: number;
  y: number;
  type?: DeskType;
  /** Global rotation applied to the whole pod (degrees). */
  rotDeg?: number;
  /** Global pivot (canvas coords) for the pod rotation. */
  pivotX?: number;
  pivotY?: number;
}

export function makeDeskPod(opts: DeskPodOptions): DeskStation[] {
  const { startIndex, x, y, type = "desk_cubicle", rotDeg = 0 } = opts;
  const xStep = DESK_W + 20;
  const yStep = DESK_H + 35;
  const pivotX = opts.pivotX ?? x + xStep / 2;
  const pivotY = opts.pivotY ?? y + yStep / 2;

  // Pod rotation applies to each desk's position AND each desk's own cluster rotation.
  const podRotRad = (rotDeg * Math.PI) / 180;

  const seeds: {
    id: string;
    /** Raw top-left before pod rotation. */
    rawX: number;
    rawY: number;
    /** "south" (chair north) or "north" (chair south in old layout —
     *  we emulate by adding 180° to the station rotation). */
    facing: "south" | "north";
  }[] = [
    { id: `desk_${startIndex}`, rawX: x, rawY: y, facing: "south" },
    { id: `desk_${startIndex + 1}`, rawX: x + xStep, rawY: y, facing: "south" },
    { id: `desk_${startIndex + 2}`, rawX: x, rawY: y + yStep, facing: "north" },
    { id: `desk_${startIndex + 3}`, rawX: x + xStep, rawY: y + yStep, facing: "north" },
  ];

  return seeds.map((seed) => {
    // Rotate the desk CENTER around the pod pivot.
    const rawCx = seed.rawX + DESK_W / 2;
    const rawCy = seed.rawY + DESK_H / 2;
    const rotated = rotatePointAround(rawCx, rawCy, pivotX, pivotY, rotDeg);
    const deskX = Math.round(rotated.x - DESK_W / 2);
    const deskY = Math.round(rotated.y - DESK_H / 2);
    // "North-facing" desks in the old layout == station rotated 180° around
    // its own center. Combine with the pod rotation.
    const selfRot = seed.facing === "north" ? 180 : 0;
    return makeDeskStation({
      id: seed.id,
      x: deskX,
      y: deskY,
      rotDeg: (rotDeg + selfRot) % 360,
      type,
    });
  });
}

// ── Couch station ────────────────────────────────────────────────────────
// Single-item station. No cluster needed (single items don't drift).
// Produces one SocialPoint-worthy stand point. We keep the existing
// SOCIAL_POINTS derivation in defaultLayout.ts — callers can pass the couch
// item in directly. This factory is here mainly to own the tuner-validated
// stand point math for reuse.

export interface CouchStandPoint {
  x: number;
  y: number;
  facing: number;
  type: "couch" | "couch_v";
}

export function couchStandPoint(item: FurnitureItem): CouchStandPoint {
  const type = (item.type === "couch" ? "couch" : "couch_v") as
    | "couch"
    | "couch_v";
  const [defW, defH] =
    type === "couch_v" ? [40, 80] : [100, 40];
  const w = item.w ?? defW;
  const h = item.h ?? defH;
  const facing =
    ((item.facing ?? 0) * Math.PI) / 180 + (FURNITURE_ROTATION[type] ?? 0);
  const seatOffset = Math.min(w, h) * 0.25;
  return {
    x: Math.round(item.x + w / 2 + Math.sin(facing) * seatOffset),
    y: Math.round(item.y + h / 2 + Math.cos(facing) * seatOffset),
    facing,
    type,
  };
}
