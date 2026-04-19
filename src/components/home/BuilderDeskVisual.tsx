"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Hardcoded standalone mini-scene for the landing's "Builders compete on the
 * real problem" card. One lego-style agent, sitting at a desk, arms flailing
 * on fast out-of-phase sine cycles — reads as "a builder going at it."
 *
 * Deliberately NOT wired to the arena game loop or agent state. Zero runtime
 * deps besides three + R3F; safe to render next to the main arena canvas.
 */

function BuilderAgent() {
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Arms: two uncorrelated sines per arm → chaotic "flailing" feel that
    // still has enough rhythm to read as "typing".
    if (leftArm.current) {
      leftArm.current.rotation.x = -0.4 + Math.sin(t * 8.1) * 0.7;
      leftArm.current.rotation.z = 0.35 + Math.sin(t * 5.3) * 0.25;
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = -0.4 + Math.cos(t * 7.4) * 0.7;
      rightArm.current.rotation.z = -0.35 - Math.cos(t * 5.1) * 0.25;
    }
    // Head: subtle bob + yaw so the character feels alive, not a mannequin.
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 1.3) * 0.18;
      head.current.position.y = 1.15 + Math.sin(t * 3) * 0.02;
    }
    // Torso: barely-there forward lean on the typing beat.
    if (torso.current) {
      torso.current.rotation.x = 0.08 + Math.sin(t * 6) * 0.03;
    }
  });

  const skin = "#E8D2B8";
  const shirt = "#cfd5e8"; // Blue accent from the palette
  const pants = "#5C5A55";

  return (
    <group position={[0, 0, 0]}>
      {/* Torso */}
      <group ref={torso} position={[0, 0.55, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.7, 0.4]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
      </group>
      {/* Head */}
      <group ref={head} position={[0, 1.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Hair / cap */}
        <mesh position={[0, 0.22, -0.02]}>
          <boxGeometry args={[0.42, 0.08, 0.42]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </group>
      {/* Left arm — pivots from shoulder */}
      <group ref={leftArm} position={[-0.33, 0.85, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.13]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.54, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.14]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      {/* Right arm */}
      <group ref={rightArm} position={[0.33, 0.85, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.13, 0.5, 0.13]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        <mesh position={[0, -0.54, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.14]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      {/* Legs — bent 90° forward for sitting pose */}
      <group position={[-0.13, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color={pants} />
        </mesh>
      </group>
      <group position={[0.13, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.14, 0.5, 0.14]} />
          <meshStandardMaterial color={pants} />
        </mesh>
      </group>
      {/* Chair seat under the agent */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[0.5, 0.08, 0.45]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}

function Desk() {
  const woodTop = "#D4BE94";
  const woodLeg = "#9C8563";
  const deskZ = 0.55;
  return (
    <group position={[0, 0, deskZ]}>
      {/* Top */}
      <mesh position={[0, 0.9, 0]} receiveShadow>
        <boxGeometry args={[1.5, 0.06, 0.6]} />
        <meshStandardMaterial color={woodTop} />
      </mesh>
      {/* Legs */}
      {[
        [-0.7, 0.45, -0.25],
        [0.7, 0.45, -0.25],
        [-0.7, 0.45, 0.25],
        [0.7, 0.45, 0.25],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.06, 0.9, 0.06]} />
          <meshStandardMaterial color={woodLeg} />
        </mesh>
      ))}
      {/* Monitor stand */}
      <mesh position={[0, 1.0, -0.05]}>
        <boxGeometry args={[0.1, 0.12, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Monitor */}
      <mesh position={[0, 1.3, -0.05]}>
        <boxGeometry args={[0.7, 0.44, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Screen glow — inset panel */}
      <mesh position={[0, 1.3, -0.025]}>
        <boxGeometry args={[0.66, 0.4, 0.01]} />
        <meshBasicMaterial color="#d8e3ee" />
      </mesh>
      {/* Keyboard */}
      <mesh position={[0, 0.95, 0.2]} receiveShadow>
        <boxGeometry args={[0.6, 0.03, 0.18]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}

export default function BuilderDeskVisual() {
  return (
    <div
      style={{
        height: 240,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid var(--border)",
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [4.5, 4, 5.5], zoom: 120, near: 0.1, far: 50 }}
        style={{ background: "#ffffff" }}
        gl={{ antialias: true, alpha: false }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[4, 8, 5]}
          intensity={0.7}
          color="#ffffff"
          castShadow
        />
        <hemisphereLight args={["#ffffff", "#e5e5e5", 0.35]} />
        <Ground />
        <Desk />
        <BuilderAgent />
      </Canvas>
    </div>
  );
}
