"use client";

import { useRef, useEffect, useCallback } from "react";
import type { FurnitureItem } from "./core/types";
import type { OfficeAgentInput } from "./useStrawAgents";
import {
  DESK_STANDING_POINTS,
  SOCIAL_POINTS,
  GYM_WORKOUT_POINTS,
  pickWeightedSocialPoint,
  pickGymPoint,
  type SocialPoint,
  type WorkoutStyle,
} from "./core/defaultLayout";
import { buildNavGrid, astar, type NavGrid } from "./core/navigation";
import type { ArenaEvent } from "./useArenaEvents";
import type { DevAction } from "./DevEventPanel";

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
  state: "walking" | "sitting" | "standing" | "dancing" | "working_out";

  // ── Liveness holds ─────────────────────────────────────────────────
  /** ms timestamp — when set, agent is sitting on a social spot until this time */
  couchUntil?: number;
  /** ms — bumped whenever an event happens for this agent; drives away detection */
  lastSeenAt?: number;
  /** Type of social spot they're currently at (affects animation / commitment) */
  socialSpotType?: string;
  /** ms timestamp — agent is in dancing state until this time */
  danceUntil?: number;
  /** ms timestamp — agent is frozen talking to a partner until this time */
  talkUntil?: number;
  /** Agent id this agent is talking to (drives face-toward logic) */
  talkPartnerId?: string;
  /** ms timestamp — emoji pop over head active until this time */
  emojiUntil?: number;
  /** Emoji glyph to render (🎉 / ⬆️ / 🔥 / ❌) */
  emojiIcon?: string;
  /** ms timestamp — agent is doing a workout at a gym point until this time */
  gymUntil?: number;
  /** Which workout animation variant to play */
  workoutStyle?: WorkoutStyle;
  /** Uid of the ping-pong table this agent is paired at (set on arrival). */
  pingPongTableUid?: string;
  /** Which side of the table the agent is on. */
  pingPongSide?: "A" | "B";
  /** ms timestamp — agent is playing ping-pong until this time. Undefined
   *  while waiting for an opponent; set once two agents pair up. */
  pingPongUntil?: number;
  /** ms timestamp — agent is at a standup meeting (sitting in a chair at
   *  the meeting-room table or the round-table nook) until this time. */
  standupUntil?: number;
  /**
   * Desired facing (radians) when the agent arrives at targetX/Y. Applied on
   * arrival so stations (desk / gym station / couch) can force the agent to
   * face the right direction regardless of which way they walked in from.
   * Cleared on arrival.
   */
  targetFacing?: number;

  // ── Deadlock recovery ──────────────────────────────────────────────
  /** Consecutive frames a walking agent has made <STUCK_PROGRESS_MIN_PX of progress. */
  stuckFrames?: number;

  // ── Dev tuning ─────────────────────────────────────────────────────
  /** Override the default sit-back render offset (world units). Tuner only. */
  sitBackOverride?: number;
  /** Override the default sink depth while sitting. Tuner only. */
  sinkDepthOverride?: number;
  /** Full planned path (tuner-only). `path` is mutated as the agent walks;
   *  this copy is preserved so the "paths: on" overlay can keep showing the
   *  route even after arrival. Includes the PLAN-TIME start position as its
   *  first entry so a direct-line fallback still has 2 points to draw. */
  plannedPath?: { x: number; y: number }[];
  /** True if `plannedPath` came out of A* (routed around obstacles); false
   *  if it's a direct-line fallback. Drives the path-overlay color. */
  plannedPathRouted?: boolean;
}

const WALK_SPEED = 0.7;
const SEPARATION_STRENGTH = 3;
const AGENT_RADIUS = 20;

// Deadlock recovery: if a walking agent makes no progress for this long, nudge sideways.
const STUCK_THRESHOLD_FRAMES = 60;   // ~1s at 60fps
const STUCK_PROGRESS_MIN_PX = 0.1;   // per-frame delta considered "not stuck"
const STUCK_NUDGE_DIST_PX = 30;      // perpendicular detour distance

// Behavior tuning
const SOCIAL_PREFERENCE = 0.4;           // chance to pick a social point over a roam point
const SOCIAL_OCCUPANCY_CAP = 5;          // max agents at social spots simultaneously
const AWAY_THRESHOLD_MS = 60_000;        // idle >60s → go sit somewhere
const COUCH_SIT_MIN_MS = 30_000;         // 30s min
const COUCH_SIT_MAX_MS = 90_000;         // 90s max
const RE_ROAM_CHANCE = 0.005;            // per-tick chance for idle standing agent to pick new target

// Event hold durations (commitment windows)
const DANCE_HOLD_MS = 5_000;
const TALK_HOLD_MS = 2_000;
const EMOJI_HOLD_MS = 2_500;
const FAILURE_COUCH_MS = 30_000;

// Gym ambient behavior
const GYM_PREFERENCE = 0.1;              // 10% of idle destination picks → gym
const GYM_OCCUPANCY_CAP = 3;              // max agents working out simultaneously
const GYM_WORKOUT_MIN_MS = 45_000;       // 45s min
const GYM_WORKOUT_MAX_MS = 90_000;       // 90s max

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

/**
 * Anchor level for separation priority. Higher = more anchored (wins overlap
 * contests and is not pushed).
 *   2 — sitting, dancing, working_out: committed to a spot, never pushed.
 *   1 — walking: actively pursuing a goal; wins against idle standing.
 *   0 — standing: parked/idle; yields to walkers and anchored agents.
 */
function anchorLevel(state: RenderAgentState["state"]): number {
  switch (state) {
    case "sitting":
    case "dancing":
    case "working_out":
      return 2;
    case "walking":
      return 1;
    case "standing":
      return 0;
  }
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

/** Count agents currently at a gym station (gymUntil active or walking toward). */
function countGymOccupants(agents: RenderAgentState[]): number {
  const now = Date.now();
  let n = 0;
  for (const a of agents) {
    if (a.gymUntil !== undefined && a.gymUntil > now) n += 1;
    else if (a.workoutStyle !== undefined && a.state === "walking") n += 1;
  }
  return n;
}

/**
 * Pick an idle destination:
 * - 40% social (couch / coffee / beanbag) if under cap
 * - 10% gym (workout station) if under cap
 * - else roam point
 */
function pickIdleDestination(
  agents: RenderAgentState[]
):
  | { kind: "social"; point: SocialPoint }
  | { kind: "gym"; point: { x: number; y: number; facing: number; style: WorkoutStyle } }
  | { kind: "roam"; point: { x: number; y: number } } {
  const r = Math.random();
  // Gym first, since its preference is lower — gives it a chance before social absorbs.
  if (
    r < GYM_PREFERENCE &&
    countGymOccupants(agents) < GYM_OCCUPANCY_CAP &&
    GYM_WORKOUT_POINTS.length > 0
  ) {
    const g = pickGymPoint();
    if (g) return { kind: "gym", point: g };
  }
  if (
    countSocialOccupants(agents) < SOCIAL_OCCUPANCY_CAP &&
    SOCIAL_POINTS.length > 0 &&
    r < GYM_PREFERENCE + SOCIAL_PREFERENCE
  ) {
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

/**
 * Apply a batch of ArenaEvents to the current agent list, setting hold
 * fields. Returns a new array (does not mutate input). Priority handling:
 * submission-failed > rank-top3-entry/rank-overtake > score-improved.
 * Existing holds are kept if a new event has equal-or-lower priority.
 */
function applyEventsToAgents(
  current: RenderAgentState[],
  events: ArenaEvent[],
  planPath: (fx: number, fy: number, tx: number, ty: number) => { x: number; y: number }[],
  now: number
): RenderAgentState[] {
  if (events.length === 0) return current;

  const byId = new Map(current.map((a) => [a.id, { ...a }]));

  // Pick an emoji icon based on rank/score payload.
  const scoreEmojis = ["🎉", "⬆️", "🔥", "✨"];

  for (const ev of events) {
    const agent = byId.get(ev.agentId);
    if (!agent) continue;

    // Bump lastSeenAt on any event for this agent.
    agent.lastSeenAt = now;

    switch (ev.type) {
      case "submission-failed": {
        // Immediate: preempt anything else, walk to couch, slump.
        const couch = nearestCouch(agent.x, agent.y);
        if (couch) {
          agent.targetX = couch.x;
          agent.targetY = couch.y;
          agent.path = planPath(agent.x, agent.y, couch.x, couch.y);
          agent.state = "walking";
          agent.socialSpotType = couch.type;
          agent.targetFacing = couch.facing;
          // Set couchUntil when they arrive via the arrival handler;
          // here we just set the destination.
        }
        // Clear any conflicting holds.
        agent.danceUntil = undefined;
        agent.talkUntil = undefined;
        agent.talkPartnerId = undefined;
        // Pop a sad emoji.
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = "❌";
        break;
      }
      case "rank-top3-entry": {
        agent.danceUntil = now + DANCE_HOLD_MS;
        agent.state = "dancing";
        agent.path = [];
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = "🏆";
        break;
      }
      case "rank-overtake": {
        if (!ev.partnerAgentId) break;
        const partner = byId.get(ev.partnerAgentId);
        // Only talk-freeze if both agents are visible and neither is
        // sitting or dancing (avoid yanking someone mid-celebration).
        const bothPresent = partner !== undefined;
        const agentBusy =
          (agent.couchUntil ?? 0) > now ||
          (agent.danceUntil ?? 0) > now;
        const partnerBusy =
          partner &&
          ((partner.couchUntil ?? 0) > now ||
            (partner.danceUntil ?? 0) > now);
        if (bothPresent && !agentBusy && !partnerBusy) {
          agent.talkUntil = now + TALK_HOLD_MS;
          agent.talkPartnerId = ev.partnerAgentId;
          agent.state = "standing";
          agent.path = [];
          partner!.talkUntil = now + TALK_HOLD_MS;
          partner!.talkPartnerId = agent.id;
          partner!.state = "standing";
          partner!.path = [];
        }
        break;
      }
      case "score-improved": {
        // Don't override a currently-active higher-priority hold.
        if ((agent.danceUntil ?? 0) > now) break;
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = scoreEmojis[Math.floor(Math.random() * scoreEmojis.length)];
        break;
      }
      case "submission-completed":
      case "agent-joined":
      case "agent-left":
        // No visual hold for these yet; they're recorded but no-op.
        break;
    }
  }

  return Array.from(byId.values());
}

/**
 * Apply a batch of dev actions — directly mutates hold fields on specific
 * agents to trigger behaviors on demand. Unlike applyEventsToAgents, this
 * bypasses priority checking because it's a dev tool.
 */
function applyDevActionsToAgents(
  current: RenderAgentState[],
  actions: DevAction[],
  planPathForce: (fx: number, fy: number, tx: number, ty: number) => { x: number; y: number }[],
  now: number
): RenderAgentState[] {
  if (actions.length === 0) return current;

  const byId = new Map(current.map((a) => [a.id, { ...a }]));

  const resolveAgent = (
    wanted: string | undefined,
    preferIdle = false
  ): RenderAgentState | undefined => {
    if (wanted) return byId.get(wanted);
    const all = Array.from(byId.values());
    if (preferIdle) {
      const idleOnly = all.filter((a) => a.status === "idle");
      if (idleOnly.length > 0) {
        return idleOnly[Math.floor(Math.random() * idleOnly.length)];
      }
    }
    return all[Math.floor(Math.random() * all.length)];
  };

  for (const action of actions) {
    // Gym / couch / dance / overtake need idle state to survive the
    // working→desk preempt and the idle-only arrival handlers. Score just
    // pops an emoji and doesn't care.
    const wantsIdleAgent =
      action.kind === "gym" ||
      action.kind === "couch" ||
      action.kind === "dance" ||
      action.kind === "overtake" ||
      action.kind === "fail";
    const agent = resolveAgent(action.agentId, wantsIdleAgent);
    if (!agent) continue;

    // For behaviors that require the tick loop to treat this agent as idle
    // (so it doesn't instantly route them back to desk), force-override the
    // status locally. The next poll might reset it if the real status differs;
    // that's fine — dev actions are short-lived test triggers.
    if (wantsIdleAgent && agent.status !== "idle") {
      agent.status = "idle";
    }

    switch (action.kind) {
      case "dance": {
        agent.danceUntil = now + DANCE_HOLD_MS;
        agent.state = "dancing";
        agent.path = [];
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = "🏆";
        break;
      }
      case "gym": {
        const g = GYM_WORKOUT_POINTS[Math.floor(Math.random() * GYM_WORKOUT_POINTS.length)];
        if (g) {
          agent.targetX = g.x;
          agent.targetY = g.y;
          agent.path = planPathForce(agent.x, agent.y, g.x, g.y);
          agent.state = "walking";
          agent.workoutStyle = g.style;
          agent.targetFacing = g.facing;
          // gymUntil will be set on arrival by the tick loop's arrival handler.
          agent.couchUntil = undefined;
          agent.danceUntil = undefined;
          agent.talkUntil = undefined;
        }
        break;
      }
      case "couch": {
        const couch = nearestCouch(agent.x, agent.y);
        if (couch) {
          agent.targetX = couch.x;
          agent.targetY = couch.y;
          agent.path = planPathForce(agent.x, agent.y, couch.x, couch.y);
          agent.state = "walking";
          agent.socialSpotType = couch.type;
          agent.targetFacing = couch.facing;
          agent.danceUntil = undefined;
          agent.talkUntil = undefined;
        }
        break;
      }
      case "overtake": {
        const partner = resolveAgent(action.partnerId, true);
        if (partner && partner.id !== agent.id) {
          if (partner.status !== "idle") partner.status = "idle";
          agent.talkUntil = now + TALK_HOLD_MS;
          agent.talkPartnerId = partner.id;
          agent.state = "standing";
          agent.path = [];
          partner.talkUntil = now + TALK_HOLD_MS;
          partner.talkPartnerId = agent.id;
          partner.state = "standing";
          partner.path = [];
        }
        break;
      }
      case "fail": {
        const couch = nearestCouch(agent.x, agent.y);
        if (couch) {
          agent.targetX = couch.x;
          agent.targetY = couch.y;
          agent.path = planPathForce(agent.x, agent.y, couch.x, couch.y);
          agent.state = "walking";
          agent.socialSpotType = couch.type;
          agent.targetFacing = couch.facing;
        }
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = "❌";
        agent.danceUntil = undefined;
        break;
      }
      case "score": {
        const emojis = ["🎉", "⬆️", "🔥", "✨"];
        agent.emojiUntil = now + EMOJI_HOLD_MS;
        agent.emojiIcon = emojis[Math.floor(Math.random() * emojis.length)];
        break;
      }
    }
  }

  return Array.from(byId.values());
}

export interface UseArenaGameLoopResult {
  renderAgentsRef: React.RefObject<RenderAgentState[]>;
  /** `dtScale` = how many 60fps "frames" this actual frame represents.
   *  Used to scale walking so agents move consistently across varying
   *  framerates (e.g. when the browser throttles a backgrounded canvas). */
  tick: (dtScale?: number) => void;
}

export function useArenaGameLoop(
  agents: OfficeAgentInput[],
  furniture: FurnitureItem[],
  eventBufferRef?: React.RefObject<ArenaEvent[]>,
  devActionQueueRef?: React.RefObject<DevAction[]>
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

  /**
   * Dev-only path planner: forces the agent toward the exact target. If A*
   * fails, returns a direct-line single-waypoint (may clip through walls
   * briefly, but guarantees the agent actually arrives at the requested
   * destination — desired for manual test triggers).
   */
  const planPathDevForce = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const grid = getNavGrid();
      const path = astar(fromX, fromY, toX, toY, grid);
      if (path.length > 0) return path;
      return [{ x: toX, y: toY }];
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
              targetFacing: deskPos.facing,
            });
          } else if (agent.status === "idle") {
            const dest = pickIdleDestination(next.concat(renderAgentsRef.current));
            const targetFacing =
              dest.kind === "gym"
                ? dest.point.facing
                : dest.kind === "social"
                  ? dest.point.facing
                  : undefined;
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
              workoutStyle: dest.kind === "gym" ? dest.point.style : undefined,
              targetFacing,
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

  const tick = useCallback((dtScale: number = 1) => {
    const now = Date.now();

    // Drain pending events (from the last poll diff) and apply holds.
    if (eventBufferRef && eventBufferRef.current && eventBufferRef.current.length > 0) {
      const pending = eventBufferRef.current.splice(0);
      renderAgentsRef.current = applyEventsToAgents(
        renderAgentsRef.current,
        pending,
        planPath,
        now
      );
    }

    // Drain dev actions (manual test triggers).
    if (devActionQueueRef && devActionQueueRef.current && devActionQueueRef.current.length > 0) {
      const pending = devActionQueueRef.current.splice(0);
      renderAgentsRef.current = applyDevActionsToAgents(
        renderAgentsRef.current,
        pending,
        planPathDevForce,
        now
      );
    }

    const currentAgents = renderAgentsRef.current;

    // Capture pre-movement positions so we can measure per-tick progress
    // AFTER separation — needed for deadlock detection.
    const prevPositions = currentAgents.map((a) => ({ x: a.x, y: a.y }));

    const moved = currentAgents.map((agent) => {
      // Active dance hold → frozen, dancing in place
      if (agent.danceUntil !== undefined && agent.danceUntil > now) {
        return {
          ...agent,
          state: "dancing" as const,
          path: [],
          frame: agent.frame + 1,
        };
      }
      // Dance hold just expired → clear it, resume idle behavior
      if (agent.danceUntil !== undefined && agent.danceUntil <= now) {
        const dest = pickIdleDestination(currentAgents);
        return {
          ...agent,
          danceUntil: undefined,
          targetX: dest.point.x,
          targetY: dest.point.y,
          path: planPath(agent.x, agent.y, dest.point.x, dest.point.y),
          state: "walking" as const,
          socialSpotType: dest.kind === "social" ? dest.point.type : undefined,
          workoutStyle: dest.kind === "gym" ? dest.point.style : undefined,
          targetFacing:
            dest.kind === "gym"
              ? dest.point.facing
              : dest.kind === "social"
                ? dest.point.facing
                : undefined,
          frame: agent.frame + 1,
        };
      }

      // Active gym hold → frozen, working_out
      if (agent.gymUntil !== undefined && agent.gymUntil > now) {
        return {
          ...agent,
          state: "working_out" as const,
          path: [],
          frame: agent.frame + 1,
        };
      }
      // Gym hold just expired → clear it, walk back out
      if (agent.gymUntil !== undefined && agent.gymUntil <= now) {
        const dest = pickIdleDestination(currentAgents);
        return {
          ...agent,
          gymUntil: undefined,
          workoutStyle: dest.kind === "gym" ? dest.point.style : undefined,
          targetX: dest.point.x,
          targetY: dest.point.y,
          path: planPath(agent.x, agent.y, dest.point.x, dest.point.y),
          state: "walking" as const,
          socialSpotType: dest.kind === "social" ? dest.point.type : undefined,
          targetFacing:
            dest.kind === "gym"
              ? dest.point.facing
              : dest.kind === "social"
                ? dest.point.facing
                : undefined,
          frame: agent.frame + 1,
        };
      }
      // Preempt gym if agent's status has flipped to working (submission started)
      if (
        agent.workoutStyle !== undefined &&
        agent.status === "working"
      ) {
        // Fall through to regular walking logic — game loop will route to desk
        // via the status-change branch on next reconcile. Clear gym fields.
        return {
          ...agent,
          workoutStyle: undefined,
          gymUntil: undefined,
          frame: agent.frame + 1,
        };
      }

      // Active talk hold → frozen, facing partner
      if (agent.talkUntil !== undefined && agent.talkUntil > now) {
        let facing = agent.facing;
        if (agent.talkPartnerId) {
          const partner = currentAgents.find((a) => a.id === agent.talkPartnerId);
          if (partner) {
            facing = Math.atan2(partner.x - agent.x, partner.y - agent.y);
          }
        }
        // Lerp toward target facing for smoothness.
        let delta = facing - agent.facing;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        return {
          ...agent,
          facing: agent.facing + delta * 0.15,
          state: "standing" as const,
          path: [],
          frame: agent.frame + 1,
        };
      }
      // Talk hold just expired → clear it. Always resume as "standing" —
      // if the agent is `working` status but not at their desk, setting
      // "sitting" here would trigger the typing animation mid-floor. The
      // next reconcile (on poll) routes them back to desk from standing.
      if (agent.talkUntil !== undefined && agent.talkUntil <= now) {
        return {
          ...agent,
          talkUntil: undefined,
          talkPartnerId: undefined,
          state: "standing",
          frame: agent.frame + 1,
        };
      }

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
          socialSpotType: dest.kind === "social" ? dest.point.type : undefined,
          workoutStyle: dest.kind === "gym" ? dest.point.style : undefined,
          targetFacing:
            dest.kind === "gym"
              ? dest.point.facing
              : dest.kind === "social"
                ? dest.point.facing
                : undefined,
          targetX: dest.point.x,
          targetY: dest.point.y,
          path: planPath(agent.x, agent.y, dest.point.x, dest.point.y),
          state: "walking" as const,
          frame: agent.frame + 1,
        };
      }

      const speed = agent.walkSpeed * dtScale;
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
            // Desk agents use the normal chair sitting pose (not the
            // specialized typing pose) — cleaner and consistent with the
            // standalone chair in the tuner.
            if (agent.socialSpotType === undefined) {
              agent.socialSpotType = "chair";
            }
          } else if (agent.status === "idle") {
            // Arrived at an idle destination. If a targetFacing was set by
            // whoever assigned this destination, snap to it (overrides the
            // walking-direction facing).
            const arrivedFacing = agent.targetFacing !== undefined ? agent.targetFacing : nf;
            // If this was a gym station → start workout hold.
            if (agent.workoutStyle !== undefined) {
              const duration =
                GYM_WORKOUT_MIN_MS +
                Math.random() * (GYM_WORKOUT_MAX_MS - GYM_WORKOUT_MIN_MS);
              return {
                ...agent,
                x: nx,
                y: ny,
                facing: arrivedFacing,
                targetFacing: undefined,
                path: [],
                state: "working_out" as const,
                gymUntil: now + duration,
                frame: agent.frame + 1,
              };
            }
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
                facing: arrivedFacing,
                targetFacing: undefined,
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
                  targetFacing: couch.facing,
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
                workoutStyle: dest.kind === "gym" ? dest.point.style : undefined,
                targetFacing:
                  dest.kind === "gym"
                    ? dest.point.facing
                    : dest.kind === "social"
                      ? dest.point.facing
                      : undefined,
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

      // If the agent just arrived at its final waypoint and a targetFacing
      // was stashed, snap the facing to it and clear the field. Applies to
      // desk arrivals (status=working → sitting at desk) where we fall
      // through this bottom return rather than early-returning above.
      const arrived = npath.length === 0 && path.length > 0;
      let finalFacing = nf;
      let clearTargetFacing = false;
      if (arrived && agent.targetFacing !== undefined) {
        finalFacing = agent.targetFacing;
        clearTargetFacing = true;
      }

      return {
        ...agent,
        x: nx,
        y: ny,
        facing: finalFacing,
        path: npath,
        state,
        frame: agent.frame + 1,
        ...(clearTargetFacing ? { targetFacing: undefined } : {}),
      };
    });

    // Agent separation — prevent overlapping. Asymmetric yielding: only one
    // agent of an overlapping pair is pushed, so head-on encounters break
    // deterministically instead of oscillating. Anchor level determines who
    // yields:
    //   2 — fully anchored (sitting / dancing / working_out): cannot be pushed.
    //   1 — walking: actively pursuing a goal; wins against idle standing.
    //   0 — standing (idle, parked): steps aside for walkers.
    // Equal levels fall back to lexicographic id tiebreak.
    for (let i = 0; i < moved.length; i++) {
      for (let j = i + 1; j < moved.length; j++) {
        const a = moved[i];
        const b = moved[j];
        const aLvl = anchorLevel(a.state);
        const bLvl = anchorLevel(b.state);
        if (aLvl === 2 && bLvl === 2) continue;
        const sdx = a.x - b.x;
        const sdy = a.y - b.y;
        const sDist = Math.hypot(sdx, sdy);
        if (sDist < AGENT_RADIUS * 2 && sDist > 0) {
          const push = ((AGENT_RADIUS * 2 - sDist) / sDist) * SEPARATION_STRENGTH;
          let pushLoser: "a" | "b";
          if (aLvl > bLvl) pushLoser = "b";
          else if (bLvl > aLvl) pushLoser = "a";
          else pushLoser = a.id < b.id ? "b" : "a";
          if (pushLoser === "a") {
            moved[i] = { ...a, x: a.x + sdx * push, y: a.y + sdy * push };
          } else {
            moved[j] = { ...b, x: b.x - sdx * push, y: b.y - sdy * push };
          }
        }
      }
    }

    // Deadlock recovery — if a walking agent made no net progress this tick
    // (pushed back by a higher-priority agent, or wedged against geometry),
    // count stuck frames. After STUCK_THRESHOLD_FRAMES, insert a perpendicular
    // detour waypoint and re-plan to the original target.
    for (let i = 0; i < moved.length; i++) {
      const a = moved[i];
      if (a.state !== "walking") {
        if ((a.stuckFrames ?? 0) !== 0) moved[i] = { ...a, stuckFrames: 0 };
        continue;
      }
      const p = prevPositions[i];
      const progress = Math.hypot(a.x - p.x, a.y - p.y);
      if (progress >= STUCK_PROGRESS_MIN_PX) {
        if ((a.stuckFrames ?? 0) !== 0) moved[i] = { ...a, stuckFrames: 0 };
        continue;
      }
      const nextStuck = (a.stuckFrames ?? 0) + 1;
      if (nextStuck < STUCK_THRESHOLD_FRAMES) {
        moved[i] = { ...a, stuckFrames: nextStuck };
        continue;
      }
      // Nudge: perpendicular to current facing, random side.
      const side = Math.random() < 0.5 ? 1 : -1;
      const perpX = side * Math.cos(a.facing);
      const perpY = -side * Math.sin(a.facing);
      const nudgeX = a.x + perpX * STUCK_NUDGE_DIST_PX;
      const nudgeY = a.y + perpY * STUCK_NUDGE_DIST_PX;
      const detour = planPath(a.x, a.y, nudgeX, nudgeY);
      const resume = planPath(nudgeX, nudgeY, a.targetX, a.targetY);
      moved[i] = { ...a, stuckFrames: 0, path: [...detour, ...resume] };
    }

    renderAgentsRef.current = moved;
  }, [planPath, planPathDevForce, eventBufferRef, devActionQueueRef]);

  return { renderAgentsRef, tick };
}
