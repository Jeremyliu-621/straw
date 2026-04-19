"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import type { RenderAgentState } from "../useArenaGameLoop";

/**
 * Animated ping-pong balls for every paired table. Scans agentsRef each
 * frame for pairs (same pingPongTableUid, opposite pingPongSide, both
 * have pingPongUntil > now) and animates one ball per pair using a
 * paddle-to-paddle arc driven by a 1.2s wall-clock cycle. Pool of 4
 * ball meshes covers the main arena; unused slots hide.
 *
 * Extracted from TunerScene so OfficeEnvironment (live /leaderboard) +
 * the tuner + any future arena-consuming surface share the same renderer.
 */
export const PING_PONG_BALL_RADIUS = 0.06;
export const PING_PONG_PADDLE_OFFSET = 18; // canvas units from player → paddle
export const PING_PONG_CYCLE_MS = 1200;

export default function PingPongBalls({
  agentsRef,
  arcHeight = 1,
}: {
  agentsRef: React.RefObject<RenderAgentState[]>;
  /** Peak height of the ball's arc over the net. Tunable via the
   *  /arena-tuner misc cohort. Default 1 matches the locked value. */
  arcHeight?: number;
}) {
  const POOL = 4;
  const ballRefs = useRef<Array<THREE.Mesh | null>>(
    Array.from({ length: POOL }, () => null)
  );
  const shadowRefs = useRef<Array<THREE.Mesh | null>>(
    Array.from({ length: POOL }, () => null)
  );

  useFrame(() => {
    const now = Date.now();
    const agents = agentsRef.current ?? [];
    const byTable = new Map<
      string,
      { A?: RenderAgentState; B?: RenderAgentState }
    >();
    for (const a of agents) {
      if (
        a.pingPongTableUid &&
        a.pingPongSide &&
        a.pingPongUntil !== undefined &&
        a.pingPongUntil > now
      ) {
        const pair = byTable.get(a.pingPongTableUid) ?? {};
        pair[a.pingPongSide] = a;
        byTable.set(a.pingPongTableUid, pair);
      }
    }

    let slot = 0;
    for (const pair of byTable.values()) {
      if (slot >= POOL) break;
      const ball = ballRefs.current[slot];
      const shadow = shadowRefs.current[slot];
      if (!ball || !shadow) {
        slot += 1;
        continue;
      }
      if (!pair.A || !pair.B) {
        ball.visible = false;
        shadow.visible = false;
        slot += 1;
        continue;
      }
      // Paddle positions: PADDLE_OFFSET canvas units inside each player's
      // stand point along the table's long axis. We infer axis from the
      // two players' midpoint → player vector.
      const midX = (pair.A.x + pair.B.x) / 2;
      const midY = (pair.A.y + pair.B.y) / 2;
      const dxA = pair.A.x - midX;
      const dyA = pair.A.y - midY;
      const len = Math.hypot(dxA, dyA) || 1;
      const ux = dxA / len;
      const uy = dyA / len;
      const paddleAx = pair.A.x - ux * PING_PONG_PADDLE_OFFSET;
      const paddleAy = pair.A.y - uy * PING_PONG_PADDLE_OFFSET;
      const paddleBx = pair.B.x + ux * PING_PONG_PADDLE_OFFSET;
      const paddleBy = pair.B.y + uy * PING_PONG_PADDLE_OFFSET;

      const phase = (now % PING_PONG_CYCLE_MS) / PING_PONG_CYCLE_MS;
      const half = phase < 0.5 ? phase / 0.5 : (phase - 0.5) / 0.5;
      const fromX = phase < 0.5 ? paddleAx : paddleBx;
      const fromY = phase < 0.5 ? paddleAy : paddleBy;
      const toX = phase < 0.5 ? paddleBx : paddleAx;
      const toY = phase < 0.5 ? paddleBy : paddleAy;
      const bx = fromX + (toX - fromX) * half;
      const by = fromY + (toY - fromY) * half;
      const arc = Math.sin(half * Math.PI) * arcHeight;
      const bounce = Math.abs(Math.sin(half * Math.PI * 3)) * 0.04;
      const heightY = 0.38 + arc - bounce;

      const [wx, , wz] = toWorld(bx, by);
      ball.position.set(wx, heightY, wz);
      ball.visible = true;
      shadow.position.set(wx, 0.01, wz);
      shadow.scale.setScalar(0.5 + (1 - heightY / 0.56) * 0.5);
      shadow.visible = true;

      slot += 1;
    }
    for (; slot < POOL; slot++) {
      const b = ballRefs.current[slot];
      const s = shadowRefs.current[slot];
      if (b) b.visible = false;
      if (s) s.visible = false;
    }
  });

  return (
    <>
      {Array.from({ length: POOL }).map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              shadowRefs.current[i] = el;
            }}
            visible={false}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[PING_PONG_BALL_RADIUS * 1.6, 24]} />
            <meshBasicMaterial color="#09110d" transparent opacity={0.24} />
          </mesh>
          <mesh
            ref={(el) => {
              ballRefs.current[i] = el;
            }}
            visible={false}
          >
            <sphereGeometry args={[PING_PONG_BALL_RADIUS, 16, 12]} />
            <meshStandardMaterial
              color="#ff8c1a"
              roughness={0.18}
              emissive="#ffb347"
              emissiveIntensity={0.85}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
