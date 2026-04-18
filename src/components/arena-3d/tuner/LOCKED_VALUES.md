# Arena Tuner — LOCKED values

> **Do not fiddle with anything in this folder** (besides the new "arena"
> cohort we're building). The sliders in the seats + gym cohorts have been
> dialed in by hand and approved visually. The default values are the
> contract — rendering, sit poses, offsets, and distances all agree with
> these numbers.

Locked defaults (live in `TunerScene.tsx` > `DEFAULT_TUNING` /
`DEFAULT_GYM_TUNING`, mirrored in `AgentCharacter.tsx` defaults):

## Seats cohort
| Station  | Rotation | Sit-back | Sink depth |
| -------- | -------- | -------- | ---------- |
| Desk     | 0°       | 0.4      | (uses chair branch — 0.3) |
| Couch    | 0°       | 1.0      | -2.0       |
| Couch_v  | 0°       | 1.27     | 2.0        |
| Beanbag  | 0°       | 0.55     | 14.5       |

## Gym cohort
| Station        | Rotation | Distance | Sit-back | Sink depth |
| -------------- | -------- | -------- | -------- | ---------- |
| Whiteboard     | 0°       | 40       | —        | —          |
| Chair          | 0°       | 0        | 0.45     | 0.3        |
| Squat rack     | 0°       | 7        | —        | —          |
| Dumbbells      | 0°       | 40       | —        | —          |
| Pull-up tower  | 0°       | 10       | —        | —          |
| Punching bag   | 0°       | 16       | —        | —          |

## Render conventions
- Cluster rotation in three.js matches `rotatePoint` in the tuner. Any new
  rotation math must use `x' = x*cos + y*sin; y' = -x*sin + y*cos`.
- Desk agent facing = `(rotDeg in rad) + π` so the body faces the monitor.
- Chair's "north-facing" in the old main layout = same factory with `rotDeg: 180`.

## The new "arena" cohort
The third cohort ("arena") reproduces the full office layout using only the
same station factories as `seats` / `gym`. It is the ONLY thing in this
folder that is allowed to change while we converge on the final visual.
When it looks right, we copy the layout out to `defaultLayout.ts` so the
main `/leaderboard` + landing-page arena match.
