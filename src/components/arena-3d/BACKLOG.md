# Arena 3D — Backlog

Potential follow-up work, noted during development but deferred.

---

## Option B: Browser-based layout editor (~2–3 hours)

Add an in-browser edit mode to the arena so the layout can be tweaked
visually without touching code. The workflow would be:

1. A small **"Edit Layout"** button on the `/leaderboard` page (dev-only or
   behind a feature flag).
2. When toggled on, the 3D scene switches to edit mode:
   - Furniture items become clickable — click to select, highlighted with a
     bright emissive outline.
   - **Arrow keys** move the selected item by 10px (snap to grid).
   - **Shift+arrows** move by 1px for fine-tuning.
   - **R** rotates the selected item 90°.
   - **Delete** removes it.
   - **C** duplicates it.
   - A small HUD panel shows current x/y/facing and a type dropdown.
3. A **"+ Add"** dropdown lets you pick a furniture type and drops it at
   scene center to be positioned.
4. A **"Copy Layout"** button serializes the current furniture array back
   to a valid TypeScript snippet:
   ```ts
   { type: "desk_cubicle", x: 60, y: 280, _uid: "desk_0", id: "desk_0" },
   ```
5. The user pastes into `src/components/arena-3d/core/defaultLayout.ts`
   and commits.

**Implementation notes:**
- The selected item state lives in a React `useState` — doesn't need to
  touch the game loop ref system.
- Use `three.js` raycasting via R3F's `onClick` on the furniture groups.
- Claw3D has almost all of this code in `RetroOffice3D.tsx` (lines
  ~1700–3000) — it's the `drag.kind === "moving"` logic, pivot-based
  rotation, and the `Edit` panel. We could port it.
- No persistence needed — the "Copy Layout" button is the save action.

**Why defer:** Option A (porting Claw3D's dense layout) should close
most of the visual gap without needing an editor. Only worth building
if you still want to customize after A lands.

---

## Option C: Live layout editing with hot reload (~4–6 hours)

Same UX as Option B, but writes directly to `defaultLayout.ts` via a
dev-only API endpoint, so Next.js hot-reloads on every edit.

**Implementation notes:**
- Add a dev-only `POST /api/arena/save-layout` route that accepts an
  array and writes it back to the file with `fs.writeFileSync`.
- Gate the route behind `process.env.NODE_ENV === "development"`.
- Use Prettier's API to format the serialized output cleanly.
- Debounce saves (e.g., 500ms after last edit) to avoid hot-reload
  thrashing.
- Potential issue: HMR on the layout file might remount the whole
  `<Canvas>`, losing agent positions. Would need to isolate the layout
  import into a component that can reload independently.

**Why defer:** Marginal improvement over B. Option B's copy-to-clipboard
flow is already fast and keeps code review in the commit.

---

## Event-driven liveness — THE BIG IDEA (~1–2 days)

The Claw3D demo videos make agents look autonomous, but the actual code
shows everything is *directed*: gym trips, ping-pong, dancing, standups
all fire from chat regex or UI clicks. The only truly autonomous behaviors
are random roam, "away → couch after 60s idle", and proximity bump-freeze.

**The insight:** we have a richer data stream than Claw3D does — real
leaderboard events. If we wire animations to those events, the office
becomes ambient storytelling: every action is a visual reaction to the
competition's actual state. Legible, cheap, narratively grounded.

### Architecture

```
poll /api/public/arena every 3s
  → diff previous snapshot → detect:
     - rank changes (overtakes, drops)
     - score deltas (>5 = meaningful)
     - status transitions (registered → running → completed / failed)
     - agents entering / leaving top 20
     - task lifecycle (deadline approaching, task closed)
  → emit events
  → event reducer → set "holds" on specific agents:
     danceHoldUntil, gymHoldUntil, couchHoldUntil, talkHoldUntil, etc.
  → game loop consumes holds and routes agents
```

Identical pattern to Claw3D's `eventTriggers.ts`, but driven by Straw
data instead of chat.

### Event → behavior mapping

| Event | Behavior | Cooldown |
|---|---|---|
| Rank change — new top 5 entry | 5s dance at desk | 30s/agent |
| Rank change — became #1 | Whole office pauses 2s, then #1 dances 10s | 2min |
| Rank overtake | Overtaker + overtaken pause mid-floor, empty bubbles 2s, then resume | 15s/pair |
| Score improved by >5 | Brief fist-pump emote at desk | 15s/agent |
| Submission `running` starts | Hunches at desk, coffee mug appears | — |
| Submission `running` >30s | Gym workout (killing time while container evaluates) | one-shot per submission |
| Two agents simultaneously `running` | Ping pong together | — |
| Submission `failed` | Walks to kitchen, slumps on couch 20s | one-shot |
| New agent joins top 20 | Walks in from entrance door | — |
| Agent drops off top 20 | Walks toward exit, despawns | — |
| Task deadline <1hr | Competing agents pace at their desks | — |
| Task closes | Whole office stands, 1s pause, winner dances / losers slump | — |
| Two scores tied within 0.5 | Agents occasionally glance at each other across the office | 30s |

### Guardrails (to avoid chaos)

- **Max 3 simultaneous "special" behaviors at a time** — otherwise the
  scene becomes a party and nothing reads.
- **Per-agent cooldowns** on every celebration — dancing back-to-back
  loses all meaning.
- **Locality** — when #3 overtakes #4, #10 doesn't care. Events affect
  only the agents directly involved.
- **No audio yet** (but noted: celebrations would be 10x better with
  subtle SFX).

### What this depends on

- **Prerequisite #1**: Wire A* + nav grid (other backlog item). Without
  this, agents phase through walls on their way to the gym / kitchen /
  lounge, which breaks the illusion immediately.
- **Prerequisite #2**: The Claw3D bump-freeze-reroute mechanic ported
  in. This gives us the "talking to each other" primitive — empty
  pulsing bubbles, 1.5s freeze. We just trigger it via events instead
  of proximity.

### Rough port order

1. Snapshot differ (detect events from polling data) — 2h
2. Event emitter → "hold" reducer — 2h
3. Dance + couch behaviors (simplest, just a new state) — 2h
4. Talk behavior (empty bubble + face each other + pause) — 2h
5. Gym workout (needs the 3-stage door choreography Claw3D has) — 4h
6. Ping pong pairing — 3h

Total realistic estimate: 2 days including polish and edge cases.

### Gotchas from the Claw3D deep dive

- Room-based behaviors (gym, QA lab, phone booth) use a 3-stage door
  choreography (`door_outer → door_inner → workout`). Porting half of
  this breaks visibly — agents clip at doorways. Either port a room
  fully or skip it.
- All AI math in Claw3D is in canvas-space pixels (1800×1800), not
  world-space units. Our current code already matches this.
- "Agents chat with each other" in demos is a lie — speech bubbles from
  bumps are empty balloons. Only real LLM replies produce text bubbles.
- Agents don't autonomously decide to go to the gym. Tom's demo videos
  either had user input off-camera or the LLM happened to describe it.

---

## Other discovered improvements

- **Day/night cycle**: Port `systems/cameraLighting.tsx` from Claw3D.
  6-keyframe ambient/directional light interpolation. Adds atmosphere.
- **Interior walls / zones**: Define room segments in the layout (e.g.,
  wall between kitchen and desks). Renders in the existing `wall` type.
- **Agent accessories**: Port the full Claw3D agent model with hats,
  glasses, backpack, held items (mug, notepad).
- **Speech bubbles**: Small bubble above an agent's head when a new
  submission is received ("Submitted!" "Score: 94").
- **Desk monitor screens**: Render a small emissive plane on each
  computer showing the agent's current task title.
- **Camera controls**: Add back drei's `OrbitControls` for pan/zoom/
  rotate — we removed this during the troika-text compile issue, but
  drei is now back in.
- **Follow camera**: Click an agent in the sidebar → camera tracks them.
  Partially scaffolded in `ScoreOverlay.tsx` (the `selectedAgentId`
  state is already threaded through).
