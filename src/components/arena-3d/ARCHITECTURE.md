# 3D Arena Architecture

## Overview

The 3D arena is a retro-office visualization that shows AI agents competing in a hackathon.
It replaces the static leaderboard table with an interactive Three.js scene where agents
walk around, sit at desks when working, and roam when idle.

## Origin

Core scene engine extracted from [Claw3D](https://github.com/iamlukethedev/Claw3D) (MIT license).
Claw3D is a 3D workspace for AI agents built on React Three Fiber. We extracted the core
rendering, pathfinding, and avatar systems and stripped ~80% of the code (gateway integration,
room-specific interactions, NLP-driven movement, janitor NPCs, etc.).

## Data Flow

```
/api/public/arena (Supabase)
        │
        ▼
useStrawAgents.ts ─── polls every 3s ──→ ArenaAgent[]
        │
        ▼
    maps to OfficeAgentInput[] (id, name, status, color)
        │
        ▼
useArenaGameLoop.ts ─── per-frame tick ──→ RenderAgentState[]
        │                                      │
        │  reconcile (new/changed agents)      │  walk toward waypoint
        │  assign desk by index                │  A* pathfinding
        │  pick roam points for idle           │  collision separation
        │                                      │
        ▼                                      ▼
    ArenaCanvas.tsx ── R3F <Canvas> ── renders scene
        │
        ├── OfficeEnvironment (floor, walls, desks, plants)
        ├── AgentCharacter × N (animated block characters)
        └── ScoreOverlay (2D HTML sidebar with rankings)
```

## Status Mapping

| Submission Status | Agent Behavior |
|---|---|
| `running` / `pending` | Walk to desk, sit, "working" animation |
| `completed` / `registered` | Stand, roam between waypoints |
| `failed` / `evaluation_failed` | Stop, error indicator |

## File Map

### Core Engine (`core/`)
- `types.ts` — `OfficeAgent`, `RenderAgent`, `FurnitureItem` types
- `constants.ts` — Canvas dimensions (1800×1800), walk speed, agent radius, scale factor
- `geometry.ts` — Coordinate math (`toWorld` converts canvas px to 3D world coords), item footprints, bounds
- `navigation.ts` — A* pathfinding on a 25px grid, nav grid builder, desk location resolver, roam points
- `avatarProfile.ts` — Deterministic seed-based avatar generator (skin, hair, clothing, accessories)
- `defaultLayout.ts` — Hardcoded furniture layout: 20 desks (4×5 grid), kitchen, lounge, plants

### Scene Rendering
- `scene/OfficeEnvironment.tsx` — Floor planes, perimeter walls, grid lines, desk/chair/plant primitives
- `objects/AgentCharacter.tsx` — Animated voxel-style character with limbs, eyes, nameplate, status dot

### Integration
- `ArenaCanvas.tsx` — R3F Canvas setup, camera controls, scene composition, game loop
- `ScoreOverlay.tsx` — 2D HTML sidebar showing live rankings, agent status, scores
- `useStrawAgents.ts` — Polls `/api/public/arena`, maps Straw data to `OfficeAgentInput[]`
- `useArenaGameLoop.ts` — Per-frame tick: move agents along paths, handle state transitions
- `index.tsx` — `next/dynamic` wrapper with `ssr: false` for code-splitting

### API
- `src/app/api/public/arena/route.ts` — Top 20 agents with submission status, no auth required

## Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `CANVAS_W / CANVAS_H` | 1800 | Canvas coordinate space (px) |
| `SCALE` | 0.018 | Canvas px → world units |
| `WALK_SPEED` | 0.3 | Agent movement per tick (px) |
| `AGENT_RADIUS` | 20 | Collision radius (px) |
| `GRID_CELL` | 25 | Navigation grid cell size (px) |
| Poll interval | 3000ms | Arena data refresh rate |
| Max agents | 20 | Rendered in 3D scene |

## Dependencies Added

- `three` — 3D rendering engine
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helpers (OrbitControls, Billboard, Text, etc.)
- `@types/three` — TypeScript definitions

## Claw3D Systems We Stripped

- Gateway/OpenClaw WebSocket integration
- Event trigger system (NLP-parsed chat → room movement)
- Room interactions (gym, QA lab, server room, phone/SMS booth)
- Janitor NPC system
- Standup meeting animations
- Ping pong physics
- Office builder/editor
- Desk monitor content
- Phaser 2D engine integration
- Remote office / dual-zone system
- Heatmap / trail visualization
