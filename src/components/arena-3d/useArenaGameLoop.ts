"use client";

import { useRef, useEffect, useCallback } from "react";
import type { FurnitureItem } from "./core/types";
import type { OfficeAgentInput } from "./useStrawAgents";
import {
  DESK_STANDING_POINTS,
  SOCIAL_POINTS,
  pickWeightedSocialPoint,
  type SocialPoint,
} from "./core/defaultLayout";
import { buildNavGrid, astar, type NavGrid } from "./core/navigation";

export interface RenderAgentState {
  id: string;
  name: string | null;
  rank: number | null;
  status: "working" | "idle" | "error";
  color: string;
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

  // ── Liveness holds ─────────────────────────────────────────────────
  /** ms timestamp — when set, agent is sitting on a social spot until this time */
  couchUntil?: number;
  /** ms — bumped whenever an event happens for this agent; drives away detection */
  lastSeenAt?: number;
  /** Type of social spot they're currently at (affects animation / commitment) */
  socialSpotType?: string;
}

const WALK_SPEED = 0.3;
const SEPARATION_STRENGTH = 3;
const AGENT_RADIUS = 20;

// Behavior tuning
const SOCIAL_PREFERENCE = 0.4;           // chance to pick a social point over a roam point
const SOCIAL_OCCUPANCY_CAP = 5;          // max agents at social spots simultaneously
const AWAY_THRESHOLD_MS = 60_000;        // idle >60s → go sit somewhere
const COUCH_SIT_MIN_MS = 30_000;         // 30s min
const COUCH_SIT_MAX_MS = 90_000;         // 90s max
const RE_ROAM_CHANCE = 0.005;            // per-tick chance for idle standing agent to pick new target

const ROAM_POINTS = [
  { x: 700, y: 180 },   // kitchen
  { x: 400, y: 110 },   // meeting room
  { x: 780, y: 880 },   // ping pong
  { x: 220, y: 870 },   // lounge pit
  { x: 535, y: 895 },   // beanbag grove
  { x: 140, y: 640 },   // library
  { x: 1005, y: 870 },  // whiteboard zone
  { x: 1050, y: 420 },  // standing-desk island edge
  { x: 55, y: 420 },    // phone-booth corridor end
];

function pickRoamPoint(): { x: number; y: number } {
  return ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)];
}

function pickSpawnPoint(): { x: number; y: number } {
  return {
    x: Math.random() * 900 + 150,
    y: Math.random() * 400 + 280,
  };
}

function deskPosition(deskIndex: number): { x: number; y: number } | null {
  return DESK_STANDING_POINTS[deskIndex] ?? null;
}

/** Count agents currently sitting at a social spot (couchUntil active). */
function countSocialOccupants(agents: RenderAgentState[]): number {
  const now = Date.now();
  let n = 0;
  for (const a of agents) {
    if (a.couchUntil !== undefined && a.couchUntil > now) n += 1;
  }
  return n;
}

/** Pick an idle destination — 40% social, 60% roam. Respects occupancy cap. */
function pickIdleDestination(
  agents: RenderAgentState[]
):
  | { kind: "social"; point: SocialPoint }
  | { kind: "roam"; point: { x: number; y: number } } {
  const occupied = countSocialOccupants(agents);
  const canSocial = occupied < SOCIAL_OCCUPANCY_CAP && SOCIAL_POINTS.length > 0;
  if (canSocial && Math.random() < SOCIAL_PREFERENCE) {
    const point = pickWeightedSocialPoint();
    if (point) return { kind: "social", point };
  }
  return { kind: "roam", point: pickRoamPoint() };
}

/** Nearest couch-type social point to a given position. Null if no couches. */
function nearestCouch(fromX: number, fromY: number): SocialPoint | null {
  let best: SocialPoint | null = null;
  let bestDist = Infinity;
  for (const p of SOCIAL_POINTS) {
    if (p.type !== "couch" && p.type !== "couch_v" && p.type !== "beanbag") continue;
    const d = Math.hypot(p.x - fromX, p.y - fromY);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export interface UseArenaGameLoopResult {
  renderAgentsRef: React.RefObject<RenderAgentState[]>;
  tick: () => void;
}

export function useArenaGameLoop(
  agents: OfficeAgentInput[],
  furniture: FurnitureItem[]
): UseArenaGameLoopResult {
  const renderAgentsRef = useRef<RenderAgentState[]>([]);

  const navGridRef = useRef<NavGrid | null>(null);
  const gridSourceRef = useRef<FurnitureItem[] | null>(null);

  const getNavGrid = useCallback((): NavGrid => {
    if (navGridRef.current === null || gridSourceRef.current !== furniture) {
      navGridRef.current = buildNavGrid(furniture);
      gridSourceRef.current = furniture;
    }
    return navGridRef.current;
  }, [furniture]);

  const planPath = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const grid = getNavGrid();
      const path = astar(fromX, fromY, toX, toY, grid);
      if (path.length > 0) return path;
      for (let i = 0; i < 5; i++) {
        const alt = ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)];
        const altPath = astar(fromX, fromY, alt.x, alt.y, grid);
        if (altPath.length > 0) return altPath;
      }
      return [];
    },
    [getNavGrid]
  );

  useEffect(() => {
    const now = Date.now();
    const currentMap = new Map(renderAgentsRef.current.map((a) => [a.id, a]));
    const next: RenderAgentState[] = [];

    agents.forEach((agent, idx) => {
      const existing = currentMap.get(agent.id);
      const deskPos = deskPosition(idx);

      if (existing) {
        if (agent.status !== existing.status) {
          // Status changed → bump lastSeenAt, clear any active couch hold,
          // route to the appropriate target for the new status.
          if (agent.status === "working" && deskPos) {
            next.push({
              ...existing,
              ...agent,
              targetX: deskPos.x,
              targetY: deskPos.y,
              path: planPath(existing.x, existing.y, deskPos.x, deskPos.y),
              state: "walking",
              lastSeenAt: now,
              couchUntil: undefined,
              socialSpotType: undefined,
            });
          } else if (agent.status === "idle") {
            const dest = pickIdleDestination(next.concat(renderAgentsRef.current));
            next.push({
              ...existing,
              ...agent,
              targetX: dest.point.x,
              targetY: dest.point.y,
              path: planPath(existing.x, existing.y, dest.point.x, dest.point.y),
              state: "walking",
              lastSeenAt: now,
              couchUntil: undefined,
              socialSpotType: dest.kind === "social" ? dest.point.type : undefined,
            });
          } else {
            next.push({
              ...existing,
              ...agent,
              targetX: existing.x,
              targetY: existing.y,
              path: [],
              state: "standing",
              lastSeenAt: now,
              couchUntil: undefined,
              socialSpotType: undefined,
            });
          }
        } else {
          next.push({ ...existing, ...agent });
        }
      } else {
        const spawn = pickSpawnPoint();
        const target =
          agent.status === "working" && deskPos ? deskPos : pickRoamPoint();
        next.push({
          ...agent,
          x: spawn.x,
          y: spawn.y,
          targetX: target.x,
          targetY: target.y,
          path: planPath(spawn.x, spawn.y, target.x, target.y),
          frame: 0,
          walkSpeed: WALK_SPEED * (0.7 + Math.random() * 0.6),
          phaseOffset: Math.random() * Math.PI * 2,
          state: "walking",
          facing: Math.PI / 2,
          lastSeenAt: now,
        });
      }
    });

    renderAgentsRef.current = next;
  }, [agents, planPath]);

  const tick = useCallback(() => {
    const now = Date.now();
    const currentAgents = renderAgentsRef.current;

    const moved = currentAgents.map((agent) => {
      // Active couch hold → frozen, sitting
      if (agent.couchUntil !== undefined && agent.couchUntil > now) {
        return {
          ...agent,
          state: "sitting" as const,
          path: [],
          frame: agent.frame + 1,
        };
      }

      // Couch hold just expired → clear it and set up a new destination
      if (agent.couchUntil !== undefined && agent.couchUntil <= now) {
        const dest = pickIdleDestination(currentAgents);
        return {
          ...agent,
          couchUntil: undefined,
          socialSpotType: undefined,
          targetX: dest.point.x,
          targetY: dest.point.y,
          path: planPath(agent.x, agent.y, dest.point.x, dest.point.y),
          state: "walking" as const,
          frame: agent.frame + 1,
        };
      }

      const speed = agent.walkSpeed;
      const path = agent.path;
      const wpX = path.length > 0 ? path[0].x : agent.x;
      const wpY = path.length > 0 ? path[0].y : agent.y;
      const dx = wpX - agent.x;
      const dy = wpY - agent.y;
      const dist = Math.hypot(dx, dy);

      let state = agent.state;
      let nx = agent.x;
      let ny = agent.y;
      let nf = agent.facing;
      let npath = path;

      if (dist > speed) {
        nx = agent.x + (dx / dist) * speed;
        ny = agent.y + (dy / dist) * speed;
        nf = Math.atan2(dx, dy);
        state = "walking";
      } else {
        nx = wpX;
        ny = wpY;
        if (path.length > 1) {
          npath = path.slice(1);
          state = "walking";
        } else {
          npath = [];
          if (agent.status === "working") {
            state = "sitting";
          } else if (agent.status === "idle") {
            // Arrived at an idle destination.
            // If this was a social sitting spot → start couch hold.
            const sittingTypes = ["couch", "couch_v", "beanbag"];
            if (agent.socialSpotType && sittingTypes.includes(agent.socialSpotType)) {
              const duration =
                COUCH_SIT_MIN_MS +
                Math.random() * (COUCH_SIT_MAX_MS - COUCH_SIT_MIN_MS);
              return {
                ...agent,
                x: nx,
                y: ny,
                facing: nf,
                path: [],
                state: "sitting" as const,
                couchUntil: now + duration,
                frame: agent.frame + 1,
              };
            }

            // Away threshold: idle too long, drift to a couch automatically.
            const lastSeen = agent.lastSeenAt ?? now;
            if (
              now - lastSeen > AWAY_THRESHOLD_MS &&
              countSocialOccupants(currentAgents) < SOCIAL_OCCUPANCY_CAP
            ) {
              const couch = nearestCouch(nx, ny);
              if (couch) {
                return {
                  ...agent,
                  x: nx,
                  y: ny,
                  facing: nf,
                  targetX: couch.x,
                  targetY: couch.y,
                  path: planPath(nx, ny, couch.x, couch.y),
                  state: "walking" as const,
                  socialSpotType: couch.type,
                  frame: agent.frame + 1,
                };
              }
            }

            // Occasional re-roam while standing.
            if (Math.random() < RE_ROAM_CHANCE) {
              const dest = pickIdleDestination(currentAgents);
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: dest.point.x,
                targetY: dest.point.y,
                path: planPath(nx, ny, dest.point.x, dest.point.y),
                state: "walking" as const,
                socialSpotType: dest.kind === "social" ? dest.point.type : undefined,
                frame: agent.frame + 1,
                facing: nf,
              };
            }
            state = "standing";
          } else {
            state = "standing";
          }
        }
      }

      return {
        ...agent,
        x: nx,
        y: ny,
        facing: nf,
        path: npath,
        state,
        frame: agent.frame + 1,
      };
    });

    // Agent separation — prevent overlapping. Sitting agents are anchored.
    for (let i = 0; i < moved.length; i++) {
      for (let j = i + 1; j < moved.length; j++) {
        const a = moved[i];
        const b = moved[j];
        if (a.state === "sitting" && b.state === "sitting") continue;
        const sdx = a.x - b.x;
        const sdy = a.y - b.y;
        const sDist = Math.hypot(sdx, sdy);
        if (sDist < AGENT_RADIUS * 2 && sDist > 0) {
          const push = ((AGENT_RADIUS * 2 - sDist) / sDist) * SEPARATION_STRENGTH * 0.5;
          if (a.state === "walking") {
            moved[i] = { ...a, x: a.x + sdx * push, y: a.y + sdy * push };
          }
          if (b.state === "walking") {
            moved[j] = { ...b, x: b.x - sdx * push, y: b.y - sdy * push };
          }
        }
      }
    }

    renderAgentsRef.current = moved;
  }, [planPath]);

  return { renderAgentsRef, tick };
}
