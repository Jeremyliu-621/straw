# Arena rework — state on `feat/arena-rework`

## Mental model (the reason any of this exists)

- `/arena-tuner` is the lab. Every sit-back, sink-depth, distance, and
  rotation convention was dialed in there by hand and locked into
  `AgentCharacter.tsx` / `defaultLayout.ts` / `stations.ts` as the default.
  Those files are the *contract*. Do not re-tune without regenerating the
  tuner screenshots.
- `seats` + `gym` cohorts are one-station sandboxes that generated those
  numbers. See `LOCKED_VALUES.md` for the table.
- `arena` cohort mirrors `/leaderboard` — it pulls `DEFAULT_ARENA_FURNITURE`
  directly and renders through the same three.js `<group>` cluster path that
  fixed the rotation drift. Any change that looks right here will look right
  on the main arena.

## What's on the branch

Shared (applies to main arena too):
- `core/stations.ts` — `makeDeskStation` / `makeDeskPod` factories. Replaces
  the old `deskCluster` / `deskPod` / `rotateAround` helpers.
- `core/types.ts` — new `ClusterTransform` field on `FurnitureItem`.
- `core/geometry.ts` — `rotatePointAround` (three.js-sign convention) +
  `applyClusterTransform` helper for nav/stand-point consumers.
- `core/navigation.ts` — `buildNavGrid` applies the cluster transform so
  rotated cluster items correctly block navigation.
- `scene/OfficeEnvironment.tsx` — `ClusterGroup` renders clustered items
  inside a rotated three.js `<group>`, matching the tuner.
- `objects/AgentCharacter.tsx` — desk agents use the chair sitting pose
  (typing pose removed). Sit-back + sink-depth defaults keyed per
  `socialSpotType` — couch 1.0/-2.0, couch_v 1.27/2.0, beanbag 0.55/14.5,
  chair 0.45/0.3.
- `useArenaGameLoop.ts` — delta-time-scaled walk via `tick(dtScale)`. Agents
  stay at walking speed even when the browser throttles a backgrounded tab.
- `ArenaCanvas.tsx` — threads `delta * 60` (clamped 1-6×) into `tick`.

Tuner-only:
- `tuner/TunerScene.tsx` — `Cohort = "seats" | "gym" | "arena"`. The arena
  cohort `buildArenaStations()` ingests `DEFAULT_ARENA_FURNITURE` directly
  and derives stations from `DESK_STANDING_POINTS` / `SOCIAL_POINTS` /
  `GYM_WORKOUT_POINTS`. Floor widens to 1300×1200 and camera zoom drops to 22.
- Click-to-direct: floor mesh `onClick` → `walkToPoint(canvasX, canvasY)`.
- Module-level cache (`getArenaStations`) so the arena factory runs once.
- `app/arena-tuner/page.tsx` — header copy updated to describe the three cohorts.

## Known issues

1. **Rotation drift in main arena at non-cardinal angles is *mostly* gone**
   since clusters rotate rigidly via the three.js group, but the underlying
   `FurnitureModel` pivot math still uses unscaled canvas dims for its
   rotation pivot. This is invisible for CLUSTER_A's -18° but could surface
   if anyone adds a more extreme rotation. Fix path: include FURNITURE_SCALE
   in the `pivotOffset` calculation (attempted once and reverted because
   it appeared to break R=0; needs a second look with test cases).

2. **Automated visual verification via screenshots is lossy** — Chrome
   throttles backgrounded canvas framerates to ~2 fps. The delta-time fix
   keeps walking speed consistent regardless, but if you need to test
   agent paths end-to-end, use a real foreground tab, not the browser
   automation.

3. **Tuner arena cohort doesn't expose per-station tuning** (seats/gym do).
   By design — the arena is the integration view; if a specific station
   looks wrong there, tune it in the seats/gym cohort, then reload.

## What to do next

- Review the branch. If everything looks right, squash-merge into the base
  branch (`worktree-3d-arena` or wherever), delete `feat/arena-rework`.
- If the rotation pivot bug re-surfaces (item 1 above), open the tuner
  arena cohort and diff against the main arena — that's the fastest way
  to spot it.
