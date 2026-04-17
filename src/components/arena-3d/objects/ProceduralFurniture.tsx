"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { SCALE } from "../core/constants";
import { toWorld } from "../core/geometry";
import type { FurnitureItem } from "../core/types";

/**
 * Low-poly procedural primitives for furniture types that have no GLB model.
 * Each sub-renderer takes a `FurnitureItem` and outputs a group placed at its
 * world position. Keep these cheap — nothing should be more than a handful of
 * boxes/planes so we can scatter many of them without cost.
 */

export const PROCEDURAL_TYPES = new Set([
  "server_rack",
  "glass_wall",
  "painting",
  "tv_screen",
  "ping_pong",
  "phone_booth",
  "neon_sign",
  "rug",
  "printer_station",
  "cable_tray",
  "pendant_light",
  "rolling_whiteboard",
  "wall_clock",
]);

interface Props {
  item: FurnitureItem;
}

function itemRotY(item: FurnitureItem): number {
  return ((item.facing ?? 0) * Math.PI) / 180;
}

// ─── server_rack ────────────────────────────────────────────────────────────
function ServerRack({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 60) * SCALE;
  const d = (item.h ?? 80) * SCALE;
  const height = 1.0;
  const ledRows = 14;

  const leds = useMemo(() => {
    const out: { y: number; color: string }[] = [];
    const rand = seededRand(item._uid);
    for (let i = 0; i < ledRows; i++) {
      const r = rand();
      const color = r < 0.7 ? "#4AFF7A" : r < 0.95 ? "#4A9AFF" : "#FF4A4A";
      out.push({ y: 0.2 + (i / ledRows) * (height - 0.3), color });
    }
    return out;
  }, [item._uid]);

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Main cabinet */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial color="#18191B" roughness={0.7} metalness={0.25} />
      </mesh>
      {/* Front grille inset */}
      <mesh position={[0, height / 2, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.85, height * 0.9]} />
        <meshStandardMaterial color="#0E0F11" roughness={0.6} />
      </mesh>
      {/* LED strip on the front */}
      {leds.map((l, i) => (
        <mesh key={i} position={[w * 0.3, l.y, d / 2 + 0.002]}>
          <planeGeometry args={[0.025, 0.02]} />
          <meshBasicMaterial color={l.color} toneMapped={false} />
        </mesh>
      ))}
      {/* Top vent */}
      <mesh position={[0, height + 0.01, 0]}>
        <boxGeometry args={[w * 0.9, 0.02, d * 0.9]} />
        <meshStandardMaterial color="#2A2B2E" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── glass_wall ─────────────────────────────────────────────────────────────
function GlassWall({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 80) * SCALE;
  const d = (item.h ?? 8) * SCALE;
  const height = 1.1;

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]}>
      {/* Glass pane */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[w, height, d * 0.2]} />
        <meshPhysicalMaterial
          color="#7AB8D9"
          transparent
          opacity={0.18}
          roughness={0.05}
          metalness={0}
          transmission={0.8}
        />
      </mesh>
      {/* Top frame */}
      <mesh position={[0, height + 0.02, 0]}>
        <boxGeometry args={[w + 0.02, 0.04, d]} />
        <meshStandardMaterial color="#2A2E35" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Bottom frame */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#2A2E35" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

// ─── painting ───────────────────────────────────────────────────────────────
// Wall-attached. `wallAttach` N/S/E/W picks which perimeter wall; position
// is along that wall. `w` / `h` are in canvas pixels.
function Painting({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 80) * SCALE;
  const h = (item.h ?? 50) * SCALE;
  const frameT = 0.025;
  const color = item.color ?? "#3BAFA9";
  const attach = item.wallAttach ?? "N";
  const rotY =
    attach === "N" ? 0 : attach === "S" ? Math.PI : attach === "E" ? -Math.PI / 2 : Math.PI / 2;
  const mountY = 0.7;

  return (
    <group position={[wx, mountY, wz]} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[w + frameT * 2, h + frameT * 2, 0.02]} />
        <meshStandardMaterial color="#1F2228" roughness={0.7} />
      </mesh>
      {/* Canvas */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Secondary block (two-tone abstract) */}
      <mesh position={[w * 0.2, -h * 0.15, 0.014]}>
        <planeGeometry args={[w * 0.4, h * 0.35]} />
        <meshStandardMaterial color={lightenHex(color, -0.25)} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── tv_screen ──────────────────────────────────────────────────────────────
function TvScreen({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 120) * SCALE;
  const h = (item.h ?? 70) * SCALE;
  const attach = item.wallAttach ?? "N";
  const rotY =
    attach === "N" ? 0 : attach === "S" ? Math.PI : attach === "E" ? -Math.PI / 2 : Math.PI / 2;
  const mountY = 0.7;

  return (
    <group position={[wx, mountY, wz]} rotation={[0, rotY, 0]}>
      {/* Bezel */}
      <mesh>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.03]} />
        <meshStandardMaterial color="#111317" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#0D1B2A" toneMapped={false} />
      </mesh>
      {/* Glow */}
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[w * 0.6, h * 0.5]} />
        <meshBasicMaterial color="#1D4E6E" toneMapped={false} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── ping_pong ──────────────────────────────────────────────────────────────
function PingPong({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 140) * SCALE;
  const d = (item.h ?? 80) * SCALE;
  const top = 0.5;

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Table top */}
      <mesh position={[0, top, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#4A8567" roughness={0.7} />
      </mesh>
      {/* Center line */}
      <mesh position={[0, top + 0.021, 0]}>
        <planeGeometry args={[w, 0.01]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Perimeter white lines */}
      <mesh position={[0, top + 0.021, d / 2 - 0.015]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.015]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, top + 0.021, -d / 2 + 0.015]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.015]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      {/* Net */}
      <mesh position={[0, top + 0.07, 0]}>
        <boxGeometry args={[0.02, 0.08, d]} />
        <meshStandardMaterial color="#EDEDEA" roughness={0.9} />
      </mesh>
      {/* Legs */}
      {[
        [-w / 2 + 0.04, -d / 2 + 0.04],
        [w / 2 - 0.04, -d / 2 + 0.04],
        [-w / 2 + 0.04, d / 2 - 0.04],
        [w / 2 - 0.04, d / 2 - 0.04],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, top / 2, lz]} castShadow>
          <boxGeometry args={[0.04, top, 0.04]} />
          <meshStandardMaterial color="#2A2E35" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ─── phone_booth ────────────────────────────────────────────────────────────
function PhoneBooth({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 70) * SCALE;
  const d = (item.h ?? 70) * SCALE;
  const h = 1.05;
  const color = item.color ?? "#2E3338";

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Outer shell */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Front glass */}
      <mesh position={[0, h / 2, d / 2 + 0.005]}>
        <planeGeometry args={[w * 0.55, h * 0.75]} />
        <meshPhysicalMaterial
          color="#7AB8D9"
          transparent
          opacity={0.25}
          roughness={0.1}
          transmission={0.7}
        />
      </mesh>
      {/* Roof accent (bright color pop) */}
      <mesh position={[0, h + 0.04, 0]}>
        <boxGeometry args={[w + 0.03, 0.08, d + 0.03]} />
        <meshStandardMaterial
          color={item.color === "#2E3338" ? "#E8B84A" : "#FF6B5B"}
          roughness={0.5}
        />
      </mesh>
      {/* Interior light */}
      <pointLight
        position={[0, h * 0.75, 0]}
        color="#FFE8C4"
        intensity={0.3}
        distance={1.5}
      />
    </group>
  );
}

// ─── neon_sign ──────────────────────────────────────────────────────────────
function NeonSign({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 140) * SCALE;
  const h = (item.h ?? 40) * SCALE;
  const color = item.color ?? "#5EE3D4";
  const attach = item.wallAttach ?? "N";
  const rotY =
    attach === "N" ? 0 : attach === "S" ? Math.PI : attach === "E" ? -Math.PI / 2 : Math.PI / 2;
  const mountY = 0.95;

  return (
    <group position={[wx, mountY, wz]} rotation={[0, rotY, 0]}>
      {/* Backing */}
      <mesh>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color="#0B0C0F" roughness={0.9} />
      </mesh>
      {/* Glowing tube stroke */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w * 0.85, h * 0.35]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0.3]} color={color} intensity={0.8} distance={2.5} />
    </group>
  );
}

// ─── rug ────────────────────────────────────────────────────────────────────
function Rug({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 180) * SCALE;
  const d = (item.h ?? 120) * SCALE;
  const color = item.color ?? "#7A9AB8";

  return (
    <mesh
      position={[wx + w / 2, 0.005, wz + d / 2]}
      rotation={[-Math.PI / 2, 0, itemRotY(item)]}
      receiveShadow
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

// ─── printer_station ────────────────────────────────────────────────────────
function PrinterStation({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 60) * SCALE;
  const d = (item.h ?? 50) * SCALE;

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Lower body (paper tray) */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.3, d]} />
        <meshStandardMaterial color="#3A3F47" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Upper scanner */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[w * 0.95, 0.12, d * 0.85]} />
        <meshStandardMaterial color="#505A60" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Display LED */}
      <mesh position={[w * 0.3, 0.43, d * 0.35]}>
        <planeGeometry args={[0.04, 0.02]} />
        <meshBasicMaterial color="#4A9AFF" toneMapped={false} />
      </mesh>
      {/* Output tray */}
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[w * 0.5, 0.02, 0.08]} />
        <meshStandardMaterial color="#EDEDEA" />
      </mesh>
    </group>
  );
}

// ─── cable_tray ─────────────────────────────────────────────────────────────
function CableTray({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 200) * SCALE;
  const d = (item.h ?? 20) * SCALE;
  const ceilingY = 1.05;

  return (
    <group position={[wx + w / 2, ceilingY, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Tray */}
      <mesh>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#3A3F47" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Cable bundles */}
      {[
        { y: 0.03, color: "#2A5AE5" },
        { y: 0.05, color: "#E5452A" },
        { y: 0.07, color: "#E5C42A" },
      ].map((c, i) => (
        <mesh key={i} position={[0, c.y, -d * 0.15 + i * d * 0.15]}>
          <boxGeometry args={[w * 0.95, 0.015, 0.02]} />
          <meshStandardMaterial color={c.color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ─── pendant_light ──────────────────────────────────────────────────────────
function PendantLight({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const shadeY = 0.85;

  return (
    <group position={[wx, 0, wz]}>
      {/* Cord */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
        <meshStandardMaterial color="#1C1E22" />
      </mesh>
      {/* Shade */}
      <mesh position={[0, shadeY, 0]} castShadow>
        <coneGeometry args={[0.14, 0.22, 12, 1, true]} />
        <meshStandardMaterial
          color="#1F2228"
          roughness={0.5}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bulb glow */}
      <mesh position={[0, shadeY - 0.07, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshBasicMaterial color="#FFE8C4" toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, shadeY - 0.15, 0]}
        color="#FFE8C4"
        intensity={0.55}
        distance={3.2}
        castShadow={false}
      />
    </group>
  );
}

// ─── rolling_whiteboard ─────────────────────────────────────────────────────
function RollingWhiteboard({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const w = (item.w ?? 100) * SCALE;
  const d = (item.h ?? 20) * SCALE;
  const h = 1.1;

  return (
    <group position={[wx + w / 2, 0, wz + d / 2]} rotation={[0, itemRotY(item), 0]}>
      {/* Legs/stand */}
      {[-w / 2 + 0.03, w / 2 - 0.03].map((lx, i) => (
        <mesh key={i} position={[lx, 0.3, 0]}>
          <boxGeometry args={[0.03, 0.6, 0.05]} />
          <meshStandardMaterial color="#2A2E35" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[w, 0.04, d * 1.4]} />
        <meshStandardMaterial color="#2A2E35" metalness={0.4} />
      </mesh>
      {/* Board */}
      <mesh position={[0, h * 0.7, 0]} castShadow>
        <boxGeometry args={[w, h * 0.55, 0.03]} />
        <meshStandardMaterial color="#F8F8F5" roughness={0.3} />
      </mesh>
      {/* Sticky notes */}
      {[
        { x: -w * 0.3, y: h * 0.8, c: "#FFD966" },
        { x: -w * 0.1, y: h * 0.75, c: "#FF8A65" },
        { x: w * 0.15, y: h * 0.85, c: "#81D4FA" },
        { x: w * 0.3, y: h * 0.68, c: "#A5D6A7" },
      ].map((n, i) => (
        <mesh key={i} position={[n.x, n.y, 0.018]}>
          <planeGeometry args={[0.05, 0.05]} />
          <meshStandardMaterial color={n.c} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── wall_clock ─────────────────────────────────────────────────────────────
function WallClock({ item }: Props) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const attach = item.wallAttach ?? "N";
  const rotY =
    attach === "N" ? 0 : attach === "S" ? Math.PI : attach === "E" ? -Math.PI / 2 : Math.PI / 2;
  const mountY = 0.85;

  return (
    <group position={[wx, mountY, wz]} rotation={[0, rotY, 0]}>
      {/* Ring */}
      <mesh>
        <ringGeometry args={[0.11, 0.14, 24]} />
        <meshStandardMaterial color="#1F2228" side={THREE.DoubleSide} />
      </mesh>
      {/* Face */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[0.11, 24]} />
        <meshStandardMaterial color="#F8F8F5" />
      </mesh>
      {/* Hour hand */}
      <mesh position={[0, 0.02, 0.003]}>
        <planeGeometry args={[0.008, 0.06]} />
        <meshStandardMaterial color="#1F2228" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0.03, 0.01, 0.004]} rotation={[0, 0, -Math.PI / 3]}>
        <planeGeometry args={[0.006, 0.085]} />
        <meshStandardMaterial color="#1F2228" />
      </mesh>
    </group>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function lightenHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${c.getHexString()}`;
}

// ─── dispatcher ─────────────────────────────────────────────────────────────
export default function ProceduralFurniture({ item }: Props) {
  switch (item.type) {
    case "server_rack":
      return <ServerRack item={item} />;
    case "glass_wall":
      return <GlassWall item={item} />;
    case "painting":
      return <Painting item={item} />;
    case "tv_screen":
      return <TvScreen item={item} />;
    case "ping_pong":
      return <PingPong item={item} />;
    case "phone_booth":
      return <PhoneBooth item={item} />;
    case "neon_sign":
      return <NeonSign item={item} />;
    case "rug":
      return <Rug item={item} />;
    case "printer_station":
      return <PrinterStation item={item} />;
    case "cable_tray":
      return <CableTray item={item} />;
    case "pendant_light":
      return <PendantLight item={item} />;
    case "rolling_whiteboard":
      return <RollingWhiteboard item={item} />;
    case "wall_clock":
      return <WallClock item={item} />;
    default:
      return null;
  }
}
