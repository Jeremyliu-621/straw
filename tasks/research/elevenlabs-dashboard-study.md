---
type: research
status: active
last_updated: 2026-05-07
topic: ElevenLabs dashboard design study for Straw rewrite
audience: Straw design lead + frontend
---

# ElevenLabs dashboard study: what to steal, what to skip

## Section 1 — Executive summary

The five highest-leverage moves, ranked.

1. **Adopt one editorial display face at weight 300 and never bolden it.** ElevenLabs' single most distinctive trick is a serif-ish display (Waldenburg Light, fallback Times New Roman) at 300, paired with Inter for body. It is the entire reason their dashboard reads as a *publication* instead of a SaaS console. Cheap to copy, enormous brand effect.
2. **Atmospheric pastel orbs as decoration only — never as button or text fills.** Their signature "gradient orb card" is one radial bloom on a 24px-radius off-white card. Straw already has the six pastels (peach / lavender / blue / beige / coral / sage). Map them 1:1 and we get a brand-aligned signature surface for free.
3. **Hairlines + one shadow tier, not "shadcn cards on a white page."** Cards float on `#fafafa` via 1px `#e7e5e4` hairline plus a single `0 4px 16px rgba(0,0,0,0.04)` shadow on hover. No multi-tier elevation game. Our `task-card.tsx` should drop any drop-shadow on idle and earn it on hover.
4. **Pill geometry for every CTA and badge, 16/24px radius for every card.** Two radius bands, applied religiously. This is what makes the marketing site and dashboard feel like the same product.
5. **96px section rhythm.** Not 32, not 48. Marketing pages breathe at 96px. Dashboards can compress to 48px between sections, but the *between-band* rhythm should be visibly larger than the within-card rhythm. We currently lack any rhythm — every section is the same density.

## Section 2 — Visual language

### Colour palette (canonical, from VoltAgent's reverse-engineered DESIGN.md)

Surfaces and ink:

| Token              | Hex       | Use                                         |
|--------------------|-----------|---------------------------------------------|
| canvas             | `#f5f5f5` | Page background (off-white, NOT pure white) |
| canvas-soft        | `#fafafa` | Section bands, gradient-orb card backgrounds |
| surface-card       | `#ffffff` | The actual card body                        |
| surface-strong     | `#f0efed` | Inline chips, voice-icon backgrounds        |
| canvas-deep        | `#0c0a09` | Dark inversion (Agents page only)           |
| surface-dark-elev  | `#1c1917` | Cards on dark canvas                        |
| ink                | `#0c0a09` | Display text                                |
| body               | `#4e4e4e` | Body copy                                   |
| muted              | `#777169` | Secondary                                   |
| muted-soft         | `#a8a29e` | Tertiary, captions on dark                  |
| primary (CTA)      | `#292524` | The *only* primary action colour            |
| hairline           | `#e7e5e4` | 1px borders (default)                       |
| hairline-strong    | `#d6d3d1` | 1px borders (input fields)                  |

Atmospheric "orb" palette — pure decoration:

| Name     | Hex       |
|----------|-----------|
| Mint     | `#a7e5d3` |
| Peach    | `#f4c5a8` |
| Lavender | `#c8b8e0` |
| Sky      | `#a8c8e8` |
| Rose     | `#e8b8c4` |

Semantic: success `#16a34a`, error `#dc2626`. Notably absent: a saturated brand action colour. There is no "ElevenLabs blue." The accent is the *gradient orb*, never a flat hue.

### Typography

- Display: **Waldenburg Light** (commercial), licensed, fallback Times New Roman. Open substitutes: **EB Garamond 300** or **GT Sectra**. The point is a humanist serif at 300, never bolded.
- Body / UI: **Inter**, with a non-default `+0.15-0.18px` letter-spacing on body. That tracking is the editorial dialect that makes Inter look "ElevenLabs-y" instead of "default Vercel."
- Sizes (tokens): display-mega 64/300, display-xl 48/300, display-lg 36/300, display-md 32/300, display-sm 24/300, title-md 20/500, title-sm 18/500, body-md 16/400, body-strong 16/500, body-sm 15/400, caption 14/400, caption-uppercase 12/600 +0.96px tracking, button 15/500, nav-link 15/500.
- Rule: display weight is *always* 300. Body is *always* 400 or 500 — never 300 (illegibility).

### Spacing rhythm

4px base. Tokens: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 96. The 96px section gutter is the most-stolen-from-them number on the marketing site; the dashboard tightens to 48px between bands but keeps 24-32px card padding.

### Border treatments

Hairlines, always 1px. Two values: `#e7e5e4` (default), `#d6d3d1` (input fields, where the border is the affordance). On focus, input borders thicken to 2px ink — they don't add a shadow halo.

### Light/dark

The system is **dark-on-light by default**, with a single dark inversion layer reserved for the Agents/Conversational AI surface (`#0c0a09` canvas, `#1c1917` cards). They don't ship a per-user theme toggle on marketing — only on the docs/component library. The dashboard is light. This is contrary to the "dark cinematic" stereotype people repeat about ElevenLabs and is the most important thing to internalise: **the product is light. The hero animations are dark. People conflate the two.**

### Surfaces

- Cards float on `#fafafa` page bands via 1px hairline + zero shadow at rest.
- Hover state: a single `0 4px 16px rgba(0,0,0,0.04)` shadow tier. No second tier for "modal," no third for "popover."
- Gradient orb cards: `#fafafa` background, 24px radius, 32px padding, ONE radial bloom from the orb palette as atmospheric backdrop. Content (a heading + sub) sits centred over it.

## Section 3 — Sidebar architecture

The sidebar is the most-discussed component in the public UX writeups but the least-documented in pixel terms (it lives behind auth). What I can confirm:

- **Vertical icon-plus-label menu, fixed left.** Approx. 240-260px wide expanded; collapses to a ~56-64px icon-only rail. The collapse toggle lives at the bottom of the rail or as a chevron in the workspace switcher header.
- **Workspace switcher at top.** A compact dropdown showing workspace name + small avatar/logo, click reveals other workspaces and a "create workspace" CTA. Personal vs team workspaces are visually equivalent — no "your account" island.
- **Section grouping with caption-uppercase labels.** Public docs reference labels like "Playground," "Studio," "Agents Platform," "Workspace." These read as small (12px / 600 / +0.96px tracking / muted) caps headers above their nav groups — straight out of their typography table.
- **Active state.** Subtle. A `surface-strong` (`#f0efed`) pill behind the row plus ink-coloured label/icon. No left-edge accent bar, no saturated highlight.
- **Iconography.** Custom set, but visually compatible with Lucide stroke weight. Single colour, no duotone, no fill. Treat Lucide as a drop-in.
- **Footer slots.** Three, in order: workspace usage meter (characters/credits remaining as a thin bar + caption), "Invite team" affordance, and either "Upgrade" CTA (free tier) or account avatar with menu (paid). The usage meter is the load-bearing piece — it makes the sidebar feel *operational* rather than decorative.

What ElevenLabs explicitly does NOT do:

- No "Pinned" section above the main nav (despite some third-party copycats showing one).
- No collapsible nav groups — sections are always expanded.
- No search inside the sidebar; search is `Cmd+K` global.

## Section 4 — Content density patterns

### Music marketplace gradient cover cards

The hero pattern of the Music product. Each track card is roughly square, ~280-320px wide on desktop, with:

- A **full-bleed gradient cover** (one of the orb palette pairings — peach/rose, lavender/sky, mint/sage etc.) at the top occupying ~60-70% of the card height.
- Optional album-artwork thumbnail floating on the gradient (small, rounded square).
- White card body below: track title (title-sm 18/500), creator (body-sm 15/400 muted), play count (caption 14/400 muted) with a small play-count icon.
- 16px radius on the outer card; gradient cover follows the same radius on top corners only.

What it conveys: this is an *editorial* surface, not a data table. The gradient covers are uniquely-generated per-track and reinforce the "every track has a vibe" framing. Density is low — three across at desktop, two on tablet, one on mobile.

### Featured / Trending sections

Horizontal scrollers with snap. Each row caps at ~6 visible cards on desktop. Section title at display-md (32/300), caption-uppercase eyebrow above ("FEATURED" / "TRENDING THIS WEEK"). Hover behaviour: card lifts on the single shadow tier, play button overlays the gradient cover. No carousel auto-rotation.

### Filter chips

Pill-shaped (9999px radius), `surface-strong` background, ink text, caption-uppercase typography (12/600 +0.96px). Active state: ink background, white text. Multi-select within a category. Categories on the Music page: Genre, Mood, Theme, Duration, BPM, Vocals — exposed as a horizontal strip above the grid, each opening a popover with a mini scrollable list.

### Search bar

Top of page, full-width or constrained to ~600px. Uses the standard text-input token: 44px tall, 8px radius, hairline-strong border, 12×16px padding, leading magnifier icon. NOT pill-shaped — search is the one place they break pill geometry, because pill-shaped search reads as a chip. They preserve the affordance distinction between "this is a chip" (pill) and "this is a field" (8px radius rectangle).

### Tabs

Underline tabs, not pill tabs. Active tab: ink label, 2px ink underline. Inactive: muted label, no underline. Tabs sit above the content grid: Marketplace / History / Saved / Finetunes. The Finetunes tab carries a small numeric badge — pill-shaped, surface-strong fill, caption-uppercase text — adjacent to the label, not absolutely-positioned.

### Studio prompt input with embedded image

The Music studio surface places the prompt textarea over a gradient orb that bleeds out from inside the card. Textarea has no visible border (border-transparent on a white card), large body-md placeholder, the orb gradient sits as an absolutely-positioned pseudo-element behind the textarea with low opacity (~40-60%). The "Generate" CTA is a pill button at the bottom-right of the card. The whole assembly reads as *one* surface, not a textarea-in-a-card.

### Empty states

Visible on History tabs across products. Pattern: centred display-sm headline ("No history yet"), body-md sub explaining what shows up here, single primary pill CTA pointing back to the create surface. No cute illustration. The orb palette occasionally provides an atmospheric bloom behind the empty-state copy.

## Section 5 — Per-page specializations

- **Studio** — the page's job is timeline editing of multi-track audio/video. Hero element is the timeline itself, not a prompt. Navigation is left sidebar + top toolbar (transport controls, zoom, track-add). This is the only ElevenLabs surface that resembles a "professional creative tool" rather than a "consumer prompt box."
- **Music** — job: discover, generate, license. Hero alternates between the studio prompt block (when generating) and the marketplace grid (when browsing). Navigation: tabs (Marketplace / History / Saved / Finetunes) plus filter chips. Most editorial-feeling page in the product.
- **Voices** — job: pick a voice. Hero is the voice library grid: voice-row pattern (32px circular icon, name stack, preview button) on a hairline-divided list, alongside category cards across the top. Navigation is a left filter rail.
- **Sound Effects** — job: type prompt → get four samples. Hero is the prompt textarea. Below: a gallery of pre-generated examples in waveform-card format (16px radius, white card, play button + waveform glyph + metadata). Categories run as filter chips, not as nav.
- **Voice Isolator** — job: upload audio, get clean speech back. Hero is a drop zone (dashed hairline-strong border, body-md instruction copy). Showcase below: paired before/after waveform cards, each with its own play button.
- **Voice Changer** — job: upload + pick target voice. Hero is the three-step strip: upload → choose voice → generate. The target-voice picker reuses the voices grid. Pattern: left = source, right = output, voice picker between.
- **Speech to Text** — same drop-zone hero as Voice Isolator. Output is a transcript card with timestamped lines, each line copy-able. The transcript card uses caption-uppercase eyebrows for speaker labels.
- **Text to Speech** — job: type, hear. Hero is a textarea + voice picker on the right. Settings (Speed, Tone, Pacing, Style Exaggeration) sit in a collapsed accordion below — they refuse to surface every knob upfront.
- **Conversational AI / Agents Platform** — the only dark-canvas product. Hero is a live demo widget (Chat/Voice toggle). Configuration UI uses standard light-canvas pattern — only the marketing surface is dark.
- **Image & Video** — recently added; pattern mirrors Sound Effects (prompt + four samples grid).

## Section 6 — Steal vs Skip

### Steal

| Pattern                                              | Why it translates to Straw                                    |
|------------------------------------------------------|----------------------------------------------------------------|
| Editorial display serif at 300 + Inter body          | Differentiates from every other Linear/Vercel/shadcn clone     |
| Six-pastel orb palette as atmospheric decoration     | We already have six pastels — this is a free brand win        |
| One shadow tier, hover-only                          | Our task-card currently fights itself with multi-tier shadows |
| 16/24/pill radius bands                              | Two radii is enforceable; ten is not                          |
| 96px section rhythm on marketing, 48px on dashboard  | Currently all our pages are one density — this gives breathing |
| Caption-uppercase 12/600 +0.96px section labels      | Cheap visual structure for sidebar groups and KPI clusters    |
| Workspace switcher pattern at sidebar top            | We need this for company × agent-builder dual roles           |
| Underline tabs, never pill tabs                      | Our nav badges currently confuse "tab" with "chip"            |
| Single dark inversion layer for one product surface  | We could reserve dark for the *arena* (live competitions)     |
| Sidebar usage-meter footer                           | Bounty budget + agent stake meter belongs here                |
| Empty states with orb backdrop, no illustrations     | Bounty list / submissions empty states will hit this often     |
| Filter chips: caption-uppercase pills, multi-select  | Bounty filters (Track, Reward range, Status, Difficulty)      |

### Skip

| Pattern                                            | Why we skip                                                          |
|----------------------------------------------------|----------------------------------------------------------------------|
| Gradient cover cards as the dominant card pattern  | Our content (bounties) has structured data — score, reward, status. Editorial covers fight legibility |
| Studio timeline UI                                  | We're not editing audio. The arena visualisation is our timeline    |
| Voice-row preview-button pattern                    | We don't have a "preview" affordance for bounties                    |
| 300+ tag taxonomy footer                            | We have 5-10 tracks, not 300 genres. Don't fake breadth              |
| Waldenburg specifically                             | Licensed. Use EB Garamond 300 or GT Sectra — match the *behaviour*  |
| Pure-white surface-card on warm-grey canvas         | Our pastels are cool-leaning; warm-grey canvas clashes. Use neutral `#f7f7f8` |
| Marketing-page hero treatment in the dashboard     | We tried this in landing. Dashboard should compress 96 → 48          |
| `#292524` ink CTA                                   | Our dark CTA should reference one of the brand pastels at full saturation, e.g. coral, to keep "Straw" visually distinct from "another shadcn site" |

## Section 7 — Concrete moves for Straw

Each item: what / why / where.

1. **Introduce a display serif at 300.** Add `--font-display: "EB Garamond", Times New Roman, serif;` and apply it to all `h1/h2/h3` in `src/app/globals.css`. Strip any `font-bold` on display headings. Why: this single change does 60% of the brand-shift work.
2. **Add `tracking: 0.012em` to body Inter.** In `globals.css` `body { letter-spacing: 0.012em; }`. Why: it's the "editorial dialect" effect; almost free, hard to reverse-engineer once shipped.
3. **Codify two card radii: `--radius-card: 16px` and `--radius-orb: 24px`.** In `globals.css` `:root`. Apply `--radius-card` to `task-card.tsx` and `kpi-tile.tsx`; reserve `--radius-orb` for any pastel-orb hero card. Why: enforce two bands.
4. **Strip drop shadows from idle cards in `task-card.tsx`. Add hover-only `0 4px 16px rgba(0,0,0,0.04)`.** Why: we currently have shadow-on-rest, which makes the dashboard feel busy.
5. **Map our six pastels to ElevenLabs orb roles in `globals.css`.** Add CSS vars: `--orb-peach`, `--orb-lavender`, `--orb-blue`, `--orb-beige`, `--orb-coral`, `--orb-sage` at 200-tier saturation. These are atmospheric only — never used as `bg-` for content. Why: we already use them in the OG image (per memory `project_brand_pastel_palette_and_og_image`); promoting them to dashboard atmosphere is consistent.
6. **Rebuild `src/components/dashboard/section.tsx` to expose three slots: eyebrow (caption-uppercase), title (display-md serif 300), and body.** Eyebrow uses `font-mono`-style tracking 0.08em uppercase 12/600. Why: today our sections lack hierarchy.
7. **`kpi-tile.tsx`: drop the bordered-box look, switch to hairline 1px `#e7e5e4` + 16px radius + 24px padding + caption-uppercase label + display-sm value.** Why: aligns to ElevenLabs feature-card spec; KPIs become legible at a glance instead of busy.
8. **Sidebar (`src/components/sidebar.tsx`) — restructure into:** workspace switcher (240px wide expanded, 56px collapsed), grouped sections with caption-uppercase labels ("Bounties," "Agents," "Workspace"), and a footer block with usage/budget meter + "Invite team" + avatar menu. Active row: `bg-[var(--surface-strong)]` pill, no left bar, no saturated colour. Why: matches the load-bearing pattern; gives us the workspace-switcher slot we need for company × agent-builder dual personas.
9. **Reserve dark canvas for the arena.** Use `#0c0a09` canvas + `#1c1917` cards only on the live-competition arena page (`feat/arena-live-port`). Everything else is light. Why: gives the arena cinematic weight (matching the Conversational AI precedent), and stops the rest of the app from drifting dark.
10. **Replace any pill-shaped tab in the dashboard with underline tabs.** Active: ink label + 2px ink underline. Inactive: muted label. Reserve pills for filter chips and CTAs. Why: enforces affordance distinctions.
11. **Empty-state primitive: centred serif display-sm headline + body-md sub + one primary pill CTA, optional pastel-orb backdrop.** Build once as `<EmptyState orb="lavender">`, reuse everywhere (no submissions, no bounties, no history). Why: we'll hit empty states constantly during early adoption; cheap consistency.
12. **Primary CTA colour decision (open question, see Section 8):** if we go ink, set `--cta-ink: #0c0a09`. If we go branded-pastel, set `--cta-coral: <full-saturation coral>` and use it for the single primary action per page only. Pill geometry, 40px height, 15/500 label. Why: we need exactly one primary CTA colour, and the choice is irreversible-ish.

## Section 8 — Open product questions

Questions where ElevenLabs made a choice and we should make ours, deliberately.

1. **Light or dark dashboard?** ElevenLabs chose light, dark only for the Agents surface. **Recommendation: light by default, dark reserved for the live arena.** Confirm we're not seduced by "AI products are dark" — that stereotype is wrong about ElevenLabs and would be wrong about us.
2. **How aggressive with gradients/orbs?** Music page leans hard, Studio is restrained. **Question: do bounty cards get full-bleed pastel covers (Music marketplace style) or do they stay structured-data-first with orbs reserved for hero/empty states?** My vote: structured-data-first. Bounties need to be scanned, not browsed.
3. **Pastels: accents or full backgrounds?** ElevenLabs uses orbs as atmosphere only. **Recommendation: same.** Pastels never as button fills, text colours, or content backgrounds. They appear as radial blooms in hero bands and empty states. Confirm.
4. **Primary CTA: ink black or saturated brand pastel?** ElevenLabs went `#292524` ink and have no flat brand colour. We could differentiate by going saturated coral or lavender at full strength — but only if we commit to *one* CTA colour and never introduce a second.
5. **Display serif: which open substitute?** EB Garamond (humanist, more classical) vs GT Sectra (commercial, modern, closer to Waldenburg's geometry). EB Garamond is free; GT Sectra costs. **Recommendation: EB Garamond 300 to ship, GT Sectra licensable later if we outgrow it.** Confirm budget.
6. **Workspace switcher: do we need it at v1?** ElevenLabs has it because workspaces are load-bearing. We have company × agent-builder roles per memory `project_universal_roles`. **Question: do those roles share a workspace identity, or are they separate workspaces a single user switches between?** This decides the sidebar's top slot.
7. **96 vs 48 section rhythm.** ElevenLabs uses 96 on marketing and tightens on dashboard. **Question: do we adopt 96 on landing and 48 on dashboard, or do we match landing's 96 even on the dashboard for visual consistency?** I recommend asymmetric (96/48) — ElevenLabs is right.
8. **Sidebar usage meter: budget, credits, or both?** ElevenLabs shows characters remaining. We could show: bounty budget remaining (for companies), stake/reputation (for agent-builders), or both. **Question: what's the single most-load-bearing number for a Straw user to see at all times?** This drives the footer slot.

---

## Sources

- ElevenLabs design system, reverse-engineered: <https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/elevenlabs/DESIGN.md>
- ElevenLabs UI component library: <https://ui.elevenlabs.io/>
- ElevenLabs UI on GitHub: <https://github.com/elevenlabs/ui>
- ElevenLabs marketing landing: <https://elevenlabs.io/>
- Music product: <https://elevenlabs.io/music>
- Sound Effects: <https://elevenlabs.io/sound-effects>
- Voice Isolator: <https://elevenlabs.io/voice-isolator>
- Voice Changer: <https://elevenlabs.io/voice-changer>
- Text to Speech: <https://elevenlabs.io/text-to-speech>
- Conversational AI: <https://elevenlabs.io/conversational-ai>
- Studio 3.0: <https://elevenlabs.io/studio>
- Workspaces docs: <https://elevenlabs.io/docs/overview/administration/workspaces/overview>
- Agents Analytics dashboard docs: <https://elevenlabs.io/docs/eleven-agents/dashboard>
- Music Marketplace help: <https://help.elevenlabs.io/hc/en-us/articles/44882789948561-What-is-Eleven-Music-Marketplace>
- UX Snaps breakdown (rate-limited at fetch time, public URL): <https://www.uxsnaps.com/dashboard-home>
- getdesign.md ElevenLabs preset: <https://getdesign.md/elevenlabs/design-md>
- Figma community ElevenLabs SaaS UI: <https://www.figma.com/community/file/1392346742625170937/elevenlabs-ai-audio-platform-saas-ui>
