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

### Tiered behavior list (all verified against Claw3D repo)

Everything in Tier 1-3 already exists as animated/stateful code in Claw3D.
The only thing "custom work" means here is wiring, not inventing. Tier 4
lists what we explicitly cut because it would require new animation work.

#### Tier 1 — Ambient (always running, baseline liveness)

All proven in Claw3D's idle loop. Makes the office feel inhabited when
nothing's happening on the leaderboard.

| Behavior | Trigger | Source |
|---|---|---|
| Random roam walk | 0.5%/tick while idle | `RetroOffice3D.tsx` idle branch |
| Social-furniture preference | 15% chance while roaming, targets couches/coffee machines | Same |
| Away → couch sit | `lastSeen` idle > 60s → route to nearest couch, state = `away` | `RetroOffice3D.tsx` away branch |
| Sit at desk | Status = `working` | Base state |

#### Tier 2 — Event highlights (narrative spikes)

Fires off leaderboard data diffs. All reuses Claw3D primitives with a
different trigger source.

| Event | Behavior | Cooldown | Source |
|---|---|---|---|
| Rank change — entered top 3 for first time | 5s dance at desk | 30s/agent | `dancing` state, real animation |
| Rank overtake (A passed B) | Both pause mid-floor, empty pulsing bubbles 2s, resume | 15s/pair | Bump mechanic, event-triggered |
| Score improved by >5 | Emoji pop over head for 2.5s (🎉 / ⬆️ / 🔥) | 15s/agent | Existing emoji mood overlay, new icon |
| Submission `failed` | Walk to couch, sit 30s dejected | one-shot | `away` state, faster trigger |

#### Tier 3 — Activity rooms (real in Claw3D, bigger port)

Real animations exist — route resolvers, door stages, station animations.
Each ~4 hours to port (extract ~600 lines of room machinery, integrate).

| Behavior | When | Narrative fit |
|---|---|---|
| Gym workout (6 styles: run/lift/bike/box/row/stretch) | Submission running > 30s (killing time while container evaluates) OR random ambient ~1%/tick | Strong — "agent has time to kill while eval runs" |
| QA lab station | Agent's task enters `evaluating` status | Medium — "they're running tests" |
| Server room / phone booth / SMS booth | — | Cut — no good narrative fit for Straw |

#### Tier 4 — Cut (custom work we decided against)

These would require new animations or mechanics not in the Claw3D repo:

- Fist-pump arm animation — use emoji overlay instead (Tier 2 above)
- Spawn-from-entrance-door (agent walking *in* from outside) — Claw3D
  agents just appear when instantiated; there's no "enter office" flow
- Despawn-to-exit-door — same reason
- Pacing at desk — no animation variant exists
- Hunched typing / coffee-mug-in-hand — `sitting` has no variants
- Whole-office crowd reactions (everyone stops to watch #1) — would
  require global coordination across 20 agents
- Ping-pong pairing — two-agent coordination + 60s session + interruption
  complexity. Cut.
- Standup meetings on task close — large state machine. Cut.
- Tied-score glancing — too subtle to read. Cut.

### Handling interruption (the "mid-action" problem)

**Don't use a queue.** Queues imply serial ordering; our problem is that
the world keeps changing, which makes queued actions stale. Example: at
t=0 agent starts walking to the gym; at t=3s their submission completes.
A queue would still execute the stale "go to gym." We want them to turn
around and sit at their desk.

**Use a desired-state reducer with commitment windows** (Claw3D's actual
pattern, adapted). Each tick:

1. Look at current data → compute `desiredState(agent)` = highest-priority
   event affecting this agent
2. Compare to `currentState(agent)`
3. If different AND current behavior is past its *commitment window* →
   transition. Otherwise wait.

Priority tiers:
- `immediate` (submission status change, rank change to #1) — preempts
  anything, even mid-behavior
- `high` (rank overtake, task close) — preempts idle/medium, not immediate
- `medium` (random celebration opportunities, gym invite) — preempts idle
- `low` (roam, idle filler) — yields to everything

Commitment windows per behavior type:
- Walking somewhere: 1s (cheap to abandon)
- Dance / emote: 5s (has narrative weight; interrupting mid-dance reads bad)
- Sit at desk (working state): 10s (sticky default)
- Gym / ping pong session: 15s minimum, max 60s (commitment but not infinite)

**How this handles the ping pong scenario**: at t=5s, A's submission
completes. Reducer sees new `immediate` priority event for A. Even though
ping pong is in its commitment window, `immediate` > `medium` → preempt.
A walks back to desk; B keeps playing alone or returns to idle.

The 60s session timer stops being a hard clock and becomes a *fallback*
for "nothing better has happened yet."

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

### Build order

**Prerequisite (non-negotiable):**
- Wire A* + nav grid — replace `simplePath()` in `useArenaGameLoop.ts`
  with `astar(buildNavGrid(furniture))`. ~20 minutes. Without this, any
  walking behavior phases through walls and everything after this
  collapses visually.

**Tier 1 — Ambient (~3 hours):**
1. Social-furniture tagging on couches / coffee machines (30m)
2. 15% social preference in roam picker (30m)
3. `lastSeen` tracking + away-to-couch after 60s idle (1h)
4. Sit-on-couch state + animation variant (1h)

**Tier 2 — Event highlights (~5 hours):**
5. Snapshot differ skeleton (diffs previous poll response) (2h)
6. Priority reducer + commitment window machinery (1h)
7. Dance on rank-change-into-top-3 (30m — animation exists)
8. Emoji pop on score improvement (30m — overlay exists, swap icon)
9. Talk-freeze on overtake (30m — bump mechanic, triggered by event)
10. Walk-to-couch-sit-30s on failure (30m — reuses Tier 1 away logic)

**Tier 3 — Gym (~4 hours):**
11. Port `resolveGymRoute` + gym furniture items (1h)
12. Port `DoorModel` + door-open-on-approach (1h)
13. Extract `gymStage` field + 3-stage walking machinery (1.5h)
14. Wire ambient + running-submission triggers (30m)

**Total: ~12 hours (1.5 days) for the full Tier 1+2+3 experience.**
Tier 1 alone is ~3 hours and makes the biggest perceptual difference.
Tier 2 without Tier 1 would be less impactful because the office still
reads as frozen between events.

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
