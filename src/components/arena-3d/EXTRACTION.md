# Claw3D Extraction Log

## Source Repository

- **Repo**: https://github.com/iamlukethedev/Claw3D
- **License**: MIT
- **Commit**: HEAD of `main` as of 2026-04-17
- **Stars**: 1,326 | Forks: 316

## What Was Extracted

### Core Engine Files (copied + adapted)

| Claw3D Path | Our Path | Adaptation |
|---|---|---|
| `src/features/retro-office/core/types.ts` | `core/types.ts` | Stripped `JanitorActor`, `SceneActor`, room-specific `RenderAgent` fields (gym/phone/sms/qa/server stages, ping pong, janitor). Inlined `OfficeInteractionTargetId` as `"desk" \| "roam"`. |
| `src/features/retro-office/core/constants.ts` | `core/constants.ts` | Removed east wing room constants, ping pong constants, localStorage migration keys. |
| `src/features/retro-office/core/geometry.ts` | `core/geometry.ts` | Copied as-is, removed room-specific furniture entries from `ITEM_FOOTPRINT` and `ITEM_METADATA`. Fixed imports to relative. |
| `src/features/retro-office/core/navigation.ts` | `core/navigation.ts` | Kept `buildNavGrid`, `astar`, `getDeskLocations`, `ROAM_POINTS`. Stripped all room-specific resolvers, janitor entry/exit points, ping pong targets, meeting overflow locations. Removed re-exports from `navigation/` subdirectory. |
| `src/lib/avatars/profile.ts` | `core/avatarProfile.ts` | Copied as-is. Removed `normalizeAgentAvatarProfile` (only needed for user-editable profiles). Zero external dependencies. |

### Static Assets (copied verbatim)

| Claw3D Path | Our Path | Notes |
|---|---|---|
| `public/office-assets/models/furniture/*.glb` (17 files) | `public/office-assets/models/furniture/` | Low-poly furniture models. Not currently loaded (using procedural box geometry instead). Available for progressive enhancement with `useGLTF`. |

### GLB Model License

The furniture models appear to be from the [Kay Lousberg](https://kaylousberg.itch.io/) furniture pack (CC0 Public Domain). The Claw3D repo is MIT licensed. Both licenses are permissive.

## What Was NOT Extracted

| Claw3D System | Lines | Reason |
|---|---|---|
| `RetroOffice3D.tsx` | 7,319 | Monolith component. We built a simplified `ArenaCanvas.tsx` (~100 lines) instead. |
| `scene/environment.tsx` | ~1,050 | Complex floor/wall rendering. We built a minimal `OfficeEnvironment.tsx` (~130 lines) instead. |
| `objects/agents.tsx` | ~200 | We built `AgentCharacter.tsx` from scratch with the same voxel-character concept. |
| `objects/furniture.tsx` | ~450 | GLB model loader. Replaced with procedural box geometry for now. |
| `objects/primitives.tsx` | ~440 | Wall/door/clock primitives. Not needed for MVP. |
| `systems/cameraLighting.tsx` | ~325 | Day/night cycle, follow-cam. Using OrbitControls from Drei instead. |
| `systems/sceneRuntime.tsx` | ~210 | Game loop, raycaster, spotlight. Simplified into inline `useFrame`. |
| `systems/visualSystems.tsx` | ~290 | Desk nameplates, heatmap, trails. Nameplates are in `AgentCharacter` instead. |
| `core/district.ts` | ~100 | Multi-zone support. Not needed (single office). |
| `core/furnitureDefaults.ts` | ~650 | Migration/migration logic. We have a static `defaultLayout.ts`. |
| `core/janitors.ts` | ~100 | NPC janitor spawning. |
| `core/persistence.ts` | ~50 | LocalStorage furniture persistence. |
| `lib/office/eventTriggers.ts` | ~200 | NLP chat → room directives. |
| `lib/office/deskDirectives.ts` | ~150 | Regex patterns for "go to desk" commands. |
| `lib/office/deskMonitor.ts` | ~100 | Virtual monitor content. |
| All `navigation/` subdirectory (6 files) | ~600 | Room-specific multi-stage route resolvers. |
| All `features/office/` | ~3,000+ | Settings panels, immersive screens, standup UI. |
| All `features/agents/` | ~2,000+ | OpenClaw agent management. |

## Progressive Enhancement Path

Files that can be ported later for richer visuals:

1. **`objects/furniture.tsx`** → GLB model loading for realistic desks, chairs, plants
2. **`systems/cameraLighting.tsx`** → Day/night cycle with 6-keyframe ambient/directional interpolation
3. **`objects/agents.tsx`** → Full Claw3D agent model with accessories, speech bubbles, held items
4. **`objects/primitives.tsx`** → Animated doors, clocks, mugs
5. **`systems/visualSystems.tsx`** → Desk nameplates with colored accent bars, heatmap overlay
