"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import { AGENT_SCALE, WALK_ANIM_SPEED } from "../core/constants";
import { createDefaultAgentAvatarProfile } from "../core/avatarProfile";
import type { RenderAgentState } from "../useArenaGameLoop";

interface AgentCharacterProps {
  agentId: string;
  /** Null when the agent is off-leaderboard — nameplate is hidden. */
  agentName: string | null;
  /** Null when the agent is off-leaderboard — nameplate is hidden. */
  rank: number | null;
  agentsRef: React.RefObject<RenderAgentState[]>;
}

function truncateName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 16)}…` : name;
}

function rankLabel(rank: number): string {
  return `#${rank}`;
}

export default function AgentCharacter({
  agentId,
  agentName,
  rank,
  agentsRef,
}: AgentCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const statusMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const avatar = useMemo(
    () => createDefaultAgentAvatarProfile(agentId),
    [agentId]
  );

  const bodyColor = useMemo(() => new THREE.Color(avatar.clothing.topColor), [avatar.clothing.topColor]);
  const skinColor = useMemo(() => new THREE.Color(avatar.body.skinTone), [avatar.body.skinTone]);
  const pantsColor = useMemo(() => new THREE.Color(avatar.clothing.bottomColor), [avatar.clothing.bottomColor]);
  const shoeColor = useMemo(() => new THREE.Color(avatar.clothing.shoesColor), [avatar.clothing.shoesColor]);
  const hairColor = useMemo(() => new THREE.Color(avatar.hair.color), [avatar.hair.color]);

  const statusColors = useMemo(() => ({
    working: new THREE.Color("#16a34a"),
    error: new THREE.Color("#dc2626"),
    idle: new THREE.Color("#94a3b8"),
  }), []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Read live data from the ref — this is the key to animation
    const agent = agentsRef.current.find((a) => a.id === agentId);
    if (!agent) return;

    const [wx, , wz] = toWorld(agent.x, agent.y);
    pos.current.set(wx, 0, wz);
    groupRef.current.position.lerp(pos.current, 0.15);

    // Facing
    const targetY = agent.facing;
    let rotDelta = targetY - groupRef.current.rotation.y;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    groupRef.current.rotation.y += rotDelta * 0.12;

    // Walk animation
    const isWalking = agent.state === "walking";
    const walkPhase = isWalking
      ? Math.sin((agent.frame + agent.phaseOffset) * WALK_ANIM_SPEED)
      : 0;
    const armSwing = walkPhase * 0.6;
    const legSwing = walkPhase * 0.5;

    if (leftArmRef.current) leftArmRef.current.rotation.x = armSwing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -armSwing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -legSwing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = legSwing;

    // Sitting: lower body
    if (agent.state === "sitting") {
      groupRef.current.position.y = -0.15 * AGENT_SCALE * 0.01;
    }

    // Status color
    if (statusMatRef.current) {
      statusMatRef.current.color.copy(statusColors[agent.status]);
    }
  });

  const s = AGENT_SCALE * 0.01;

  return (
    <group ref={groupRef} scale={[s, s, s]}>
      {/* Head */}
      <mesh position={[0, 85, 0]}>
        <boxGeometry args={[22, 22, 22]} />
        <meshLambertMaterial color={skinColor} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 97, 0]}>
        <boxGeometry args={[24, 6, 24]} />
        <meshLambertMaterial color={hairColor} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-5, 86, 11.5]}>
        <boxGeometry args={[4, 4, 1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[5, 86, 11.5]}>
        <boxGeometry args={[4, 4, 1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* Body / Torso */}
      <mesh position={[0, 58, 0]}>
        <boxGeometry args={[20, 28, 14]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-14, 68, 0]}>
        <mesh position={[0, -12, 0]}>
          <boxGeometry args={[8, 24, 10]} />
          <meshLambertMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0, -26, 0]}>
          <boxGeometry args={[7, 6, 8]} />
          <meshLambertMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[14, 68, 0]}>
        <mesh position={[0, -12, 0]}>
          <boxGeometry args={[8, 24, 10]} />
          <meshLambertMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0, -26, 0]}>
          <boxGeometry args={[7, 6, 8]} />
          <meshLambertMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-5, 44, 0]}>
        <mesh position={[0, -12, 0]}>
          <boxGeometry args={[9, 22, 10]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        <mesh position={[0, -26, 2]}>
          <boxGeometry args={[9, 6, 14]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[5, 44, 0]}>
        <mesh position={[0, -12, 0]}>
          <boxGeometry args={[9, 22, 10]} />
          <meshLambertMaterial color={pantsColor} />
        </mesh>
        <mesh position={[0, -26, 2]}>
          <boxGeometry args={[9, 6, 14]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>

      {/* Status indicator dot above head */}
      <mesh position={[0, 112, 0]}>
        <sphereGeometry args={[4, 8, 8]} />
        <meshBasicMaterial ref={statusMatRef} color="#94a3b8" />
      </mesh>

      {/* Floating nameplate — shown only for agents that appear on the
          leaderboard (rank + name both present). Pre-submission / unscored
          agents roam unlabeled. */}
      {agentName !== null && rank !== null && (() => {
        const name = truncateName(agentName);
        const rankText = rankLabel(rank);
        const fontSize = 30;
        const padding = 14;
        // Rough glyph width heuristic for a proportional sans — wide enough
        // without overshooting. Gap between rank and name is 10 units.
        const rankW = rankText.length * fontSize * 0.62;
        const nameW = name.length * fontSize * 0.56;
        const plateW = rankW + nameW + padding * 2 + 14;
        const plateH = fontSize + padding * 1.1;
        // Left-align rank, center gap, then name. Origin = plate center.
        const rankX = -plateW / 2 + padding + rankW / 2;
        const nameX = -plateW / 2 + padding + rankW + 14 + nameW / 2;
        return (
          <Billboard position={[0, 165, 0]}>
            {/* Plate: white fill with a 2-unit black border */}
            <mesh position={[0, 0, -0.2]}>
              <planeGeometry args={[plateW + 4, plateH + 4]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0, 0, -0.1]}>
              <planeGeometry args={[plateW, plateH]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            {/* Rank — black on white, monospace-ish weight */}
            <Text
              position={[rankX, 0, 0]}
              fontSize={fontSize}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
            >
              {rankText}
            </Text>
            {/* Vertical divider between rank and name */}
            <mesh position={[-plateW / 2 + padding + rankW + 7, 0, 0]}>
              <planeGeometry args={[2, plateH * 0.7]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            {/* Name — black on white */}
            <Text
              position={[nameX, 0, 0]}
              fontSize={fontSize}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {name}
            </Text>
          </Billboard>
        );
      })()}
    </group>
  );
}
