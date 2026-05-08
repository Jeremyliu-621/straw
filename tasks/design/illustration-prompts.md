---
type: design-asset-spec
purpose: Prompts for generating dashboard tool-card illustrations. Each card has a REST state and a HOVER state; the hover animation is a smooth crossfade between two static images, matching how ElevenLabs handles it (see elevenlabs-references/01 + screenshots 26/27 in the chat history — same elements, rearranged).
last_updated: 2026-05-07
related:
  - inspiration-patterns.md (visual brief)
  - ../../scripts/generate-illustrations.mjs (legacy gpt-image-1 path; out of credits)
---

# Tool-card illustration prompts (v2 — REST + HOVER pairs)

Twelve images total — six tool cards × two states (rest, hover). Filenames go into `public/illustrations/` as:

```
public/illustrations/
├── arena.png            arena-hover.png
├── submission.png       submission-hover.png
├── reputation.png       reputation-hover.png
├── earnings.png         earnings-hover.png
├── workspace.png        workspace-hover.png
└── inbox.png            inbox-hover.png
```

Once the files are present, swap the `Illustration={...}` props on the home pages for `imageSrc="/illustrations/<id>.png" imageHoverSrc="/illustrations/<id>-hover.png"` and ToolCard handles the crossfade.

## Universal style suffix

**Append to every prompt.** Keeps the pack visually coherent.

> Soft 3D-sticker style illustration, pastel palette (dusty coral #ecd0cc, dusty blue #cfd5e8, sage green #d0d7d1, soft beige #e0d6d0, peach #f7d4d0, lavender #d9d4f6). Centered subject on a soft gray-white #f4f4f5 square background. Subtle ambient drop shadow underneath the subject. No text, no labels, no letters. Clean vector-feel — no photorealism, no clutter, no outlines around shapes (use color separation instead). Square 1024×1024. Notion / ElevenLabs home-tool-card aesthetic.

## REST + HOVER pairs

For each card, the two states share the same elements. Hover is the same scene with elements **rearranged, scaled up slightly, and the composition opened up** — like the camera pulled in and the parts spread apart. The animation reads as the icon "waking up", not changing into a different icon.

### 1. Arena — `arena.png` / `arena-hover.png`

**Rest:** A round low-profile arena floor seen from a slight three-quarter angle, made of two concentric soft pastel rings (outer coral #ecd0cc, inner peach #f7d4d0). One small minimalist 3D agent figure stands dead center. Single soft drop shadow under the floor. Quiet, contained composition.

**Hover:** Same arena floor, slightly larger and tilted at a bigger three-quarter angle. **Two** agent figures now stand on it — one near the front-left edge, one near the back-right — facing each other. A faint motion-line ring expanding outward from each figure suggests they just stepped on. Same color palette, but the rings glow a touch brighter.

### 2. Submission (in-flight package) — `submission.png` / `submission-hover.png`

**Rest:** A small wrapped parcel — beige #e0d6d0 box with a coral #ecd0cc ribbon crossed over the top — floating with a soft shadow underneath. Slight glow trace below the parcel suggesting it's mid-flight. Centered, calm.

**Hover:** Same parcel, but slightly larger, tilted ~10° to the right, with the lid lifted just a few degrees and a single white paper sheet peeking out the top. The shadow is bigger and softer. A tiny lavender sparkle sits next to the parcel.

### 3. Reputation — `reputation.png` / `reputation-hover.png`

**Rest:** A round 3D medal — coral #ecd0cc center with peach #f7d4d0 outer rim — hovering centered with a small ribbon trailing below. One soft drop shadow.

**Hover:** Same medal, lifted higher (more shadow distance), slightly larger, with **three small lavender #d9d4f6 sparkle particles** orbiting at the 11 / 2 / 7 o'clock positions. The ribbon is slightly fuller / waving a touch.

### 4. Earnings — `earnings.png` / `earnings-hover.png`

**Rest:** A neat stack of three or four pastel coins — alternating peach #f7d4d0 and coral #ecd0cc — sitting flat with a soft floor shadow. The top coin floats just above the rest, with a tiny gap. Centered.

**Hover:** The stack has **fanned out**: bottom two coins still stacked, but the top two coins are floating to the upper-right at slightly different heights, separated by ~30px each in 3D space. A small lavender sparkle sits above the topmost coin.

### 5. Workspace — `workspace.png` / `workspace-hover.png`

**Rest:** A stack of three pastel "data disks" / cylindrical platters — alternating beige #e0d6d0 and lavender #d9d4f6 — stacked tightly. A single coral #ecd0cc activity dot rests on the top disk. Calm, computer-y.

**Hover:** The disks have **separated vertically** — gaps appear between each disk, ~15px each. Two or three thin pastel-blue connection lines or small "data dots" arc between the disks. The coral activity dot on top is brighter / pulsing.

### 6. Inbox — `inbox.png` / `inbox-hover.png`

**Rest:** A flat-faced beige #e0d6d0 envelope, slightly tilted, with a small bright coral notification dot at the top-right corner. Soft floor shadow.

**Hover:** Same envelope, but **opening** — the back flap is lifting up, and a single white paper letter is peeking out the top by ~30%. A tiny lavender sparkle sits to the right of the envelope.

## Crossfade behavior (implementation note)

When both PNGs are present, ToolCard renders both as overlapping `<img>` tags. The hover image starts at `opacity: 0`. On `:hover`, rest fades to `opacity: 0` and hover fades to `opacity: 1` over **300ms ease-out**. No JS, no video — exactly how ElevenLabs does it.

## Fallback

Until the raster PNGs land, the SVG `Illustration` components in `src/components/dashboard/illustrations.tsx` render. They're not as nice but they keep the layout shippable.

## Run log

If you're using the OpenAI script (`scripts/generate-illustrations.mjs`), update the `ILLUSTRATIONS` array there to include both `<id>.png` and `<id>-hover.png` rows with their respective prompts. Currently the script only generates one PNG per card; needs a second row per card or a `--state=hover` flag.
