"use client";

import { useRef, useEffect, useCallback } from "react";
import type { FurnitureItem } from "./core/types";
import type { OfficeAgentInput } from "./useStrawAgents";
import { DESK_STANDING_POINTS } from "./core/defaultLayout";
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
}

const WALK_SPEED = 0.3;
const SEPARATION_STRENGTH = 3;
const AGENT_RADIUS = 20;

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

export interface UseArenaGameLoopResult {
  renderAgentsRef: React.RefObject<RenderAgentState[]>;
  tick: () => void;
}

export function useArenaGameLoop(
  agents: OfficeAgentInput[],
  furniture: FurnitureItem[]
): UseArenaGameLoopResult {
  const renderAgentsRef = useRef<RenderAgentState[]>([]);

  // Nav grid — rebuilt only when the furniture array reference changes.
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
      // A* returned [] — start or end is unreachable. Try falling back to a
      // known-open roam point rather than drawing a straight line through walls.
      for (let i = 0; i < 5; i++) {
        const alt = ROAM_POINTS[Math.floor(Math.random() * ROAM_POINTS.length)];
        const altPath = astar(fromX, fromY, alt.x, alt.y, grid);
        if (altPath.length > 0) return altPath;
      }
      // Fully stuck — stay put. Empty path → game loop keeps agent idle in place.
      return [];
    },
    [getNavGrid]
  );

  // Reconcile input agents → render agents (runs on agent list changes)
  useEffect(() => {
    const currentMap = new Map(
      renderAgentsRef.current.map((a) => [a.id, a])
    );
    const next: RenderAgentState[] = [];

    agents.forEach((agent, idx) => {
      const existing = currentMap.get(agent.id);
      const deskPos = deskPosition(idx);

      if (existing) {
        if (agent.status !== existing.status) {
          if (agent.status === "working" && deskPos) {
            next.push({
              ...existing,
              ...agent,
              targetX: deskPos.x,
              targetY: deskPos.y,
              path: planPath(existing.x, existing.y, deskPos.x, deskPos.y),
              state: "walking",
            });
          } else if (agent.status === "idle") {
            const roam = pickRoamPoint();
            next.push({
              ...existing,
              ...agent,
              targetX: roam.x,
              targetY: roam.y,
              path: planPath(existing.x, existing.y, roam.x, roam.y),
              state: "walking",
            });
          } else {
            next.push({
              ...existing,
              ...agent,
              targetX: existing.x,
              targetY: existing.y,
              path: [],
              state: "standing",
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
        });
      }
    });

    renderAgentsRef.current = next;
  }, [agents, planPath]);

  // Per-frame tick — moves agents along their paths
  const tick = useCallback(() => {
    const moved = renderAgentsRef.current.map((agent) => {
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
            if (Math.random() < 0.005) {
              const roam = pickRoamPoint();
              return {
                ...agent,
                x: nx,
                y: ny,
                targetX: roam.x,
                targetY: roam.y,
                path: planPath(nx, ny, roam.x, roam.y),
                state: "walking" as const,
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

    // Agent separation — prevent overlapping
    for (let i = 0; i < moved.length; i++) {
      for (let j = i + 1; j < moved.length; j++) {
        const a = moved[i];
        const b = moved[j];
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
