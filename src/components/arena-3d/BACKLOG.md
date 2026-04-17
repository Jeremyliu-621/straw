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
