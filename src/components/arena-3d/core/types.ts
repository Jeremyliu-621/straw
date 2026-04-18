import type { AgentAvatarProfile } from "./avatarProfile";

export type OfficeInteractionTargetId = "desk" | "roam";

export type OfficeAgent = {
  id: string;
  name: string;
  subtitle?: string | null;
  status: "working" | "idle" | "error";
  color: string;
  item: string;
  avatarProfile?: AgentAvatarProfile | null;
};

export type RenderAgent = OfficeAgent & {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  path: { x: number; y: number }[];
  facing: number;
  frame: number;
  walkSpeed: number;
  phaseOffset: number;
  state: "walking" | "sitting" | "standing";
  bumpedUntil?: number;
  bumpTalkUntil?: number;
  collisionCooldownUntil?: number;
  interactionTarget?: OfficeInteractionTargetId;
};

/**
 * Rigid-body cluster transform. When set on a FurnitureItem, the item's
 * x/y/facing are PRE-rotation values; the cluster rotation is applied:
 *   - via a three.js <group> at render time (so items rotate together
 *     without per-item pivot drift at non-cardinal angles), and
 *   - via `applyClusterTransform(item)` for consumers that need the
 *     post-rotation canvas position (nav grid, stand points, social points).
 */
export type ClusterTransform = {
  id: string;
  pivotX: number;
  pivotY: number;
  rotDeg: number;
};

export type FurnitureItem = {
  _uid: string;
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  color?: string;
  id?: string;
  facing?: number;
  vertical?: boolean;
  elevation?: number;
  wallAttach?: "N" | "S" | "E" | "W";
  _cluster?: ClusterTransform;
};

export type FurnitureSeed = Omit<FurnitureItem, "_uid">;

export type CanvasPoint = {
  x: number;
  y: number;
};
