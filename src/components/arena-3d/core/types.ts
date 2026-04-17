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
};

export type FurnitureSeed = Omit<FurnitureItem, "_uid">;

export type CanvasPoint = {
  x: number;
  y: number;
};
