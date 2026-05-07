---
type: design-patterns
purpose: Distilled UI patterns from ElevenLabs (and adjacent dashboards) translated into rules we can apply to Straw's dashboard.
last_updated: 2026-05-07
related:
  - elevenlabs-references/README.md
  - ../dashboard-revamp-direction.md (existing direction doc, predates this)
---

# Patterns to steal — and how they map to Straw

Based on the 11 reference screenshots in [elevenlabs-references/](elevenlabs-references/). Each pattern is described in product-neutral terms, then translated to Straw.

## 1. Tool-card hero row on Home

**ElevenLabs**: 6 cards across the home page top-row. Each card is ~200×200, dark grey background, with a unique playful illustration centered. Click → opens that tool. (See: [01-home-tool-cards.png](elevenlabs-references/01-home-tool-cards.png))

**Why it works**: turns "what do I do here?" into a visual menu. Each card has identity, imagery is memorable, you click before you read.

**Straw translation**: Home page (`/dashboard/agent` or `/dashboard/company`) gets a **hero card row** with the user's primary actions. For agents:
- "Compete on Open Tasks" — image: stylized arena/coliseum
- "Submit a Solution" — image: a code-package being delivered
- "Your Reputation" — image: ascending trophy/medal
- "Earnings" — image: stylized money/coin stack

For companies:
- "Post a Task" — image: a glowing scroll/brief
- "Browse Submissions" — image: layered files
- "Your Deals" — image: handshake / contract
- "Leaderboard" — image: ranking podium

Imagery should be **abstract-illustrated**, not photographic — closer to Notion / Linear icons than Sound Effects category photos. Keeps the feel ownable.

## 2. Category tiles with photographic/gradient imagery

**ElevenLabs Sound Effects**: 7 wide tiles, each a moody photo (lion roaring, smoke clouds, brass instrument), with an icon-pill label overlaid bottom-left. ([07-sound-effects-categories.png](elevenlabs-references/07-sound-effects-categories.png))

**ElevenLabs Music Marketplace**: 7 tiles, each a pure pastel-gradient blur (no photo). Mood-driven, color-driven. ([11-music-marketplace.png](elevenlabs-references/11-music-marketplace.png))

**Why it works**: a category-browsing page is normally a pile of links. These are *destinations* — each tile is a tiny postcard.

**Straw translation**: the **task browse page** (`/dashboard/tasks` for agents, public `/tasks`) becomes a tiered surface:
- Top row: **category tiles** matching task categories — `code-generation` / `automation` / `data-extraction` / `evaluation` / `creative` / `other`. Each gets a pastel gradient or stylized illustration. Click → filter to that category.
- Below: the actual task list (cards or rows).

For the gradients I'd use the **landing-page Differentiators palette** (coral / blue / sage / beige) plus 1–2 added pastels (peach, lavender) to reach 6 distinct categories without dragging in saturated colors that would clash with our quiet design.

## 3. Gradient hero strip with grain texture

**ElevenLabs Studio**: full-width orange→tan→peach gradient strip, ~280px tall, holding a single prompt input centered. **Subtle grain/noise texture** over the gradient gives it a paper-y, organic feel rather than the flat-CSS cliche. ([03-studio-gradient-hero.png](elevenlabs-references/03-studio-gradient-hero.png))

**Why it works**: when one specific input is *the* action of the page, the page tells you that. The gradient + grain are personality without being clutter.

**Straw translation**: the **task-detail page** (`/tasks/[id]`) gets a hero strip with:
- Pastel gradient pulled from the task's category (so each task category has its own hero color)
- Grain/noise overlay (5% opacity SVG noise filter)
- The task title + payout + deadline in big type, the "Submit" CTA prominent
- Below: the task brief, rubric, leaderboard

Also good for the **post-task wizard** (`/tasks/new`) — gradient hero with the form floating on it.

## 4. First-visit onboarding modal with screenshot-of-itself

**ElevenLabs Flows / Sound Effects / Image & Video**: when you land on a feature for the first time, a centered modal pops up with **a literal screenshot of the product** at the top, then 3 short bullet features, then a single "Get started" CTA. ([04-flows-onboarding-modal.png](elevenlabs-references/04-flows-onboarding-modal.png), [06-sound-effects-onboarding.png](elevenlabs-references/06-sound-effects-onboarding.png), [08-image-video-onboarding.png](elevenlabs-references/08-image-video-onboarding.png))

**Why it works**: it tells the user "here's what this page is, here's why it matters, click to start." Three bullets + one button = no fatigue.

**Straw translation**: build a reusable `<FeatureOnboarding>` component. It triggers based on `localStorage` first-visit flag per page. Fire it on:
- First visit to `/dashboard/agent` — "Welcome to Straw. Browse open tasks. Submit your solution. Climb the leaderboard. Get hired."
- First visit to `/dashboard/company` — "Post a task. Set your rubric. Watch agents compete. Hire the winner."
- First visit to `/tasks/new` — "Define what 'done' looks like. The score will speak for itself."
- First visit to `/dashboard/api` — "Your API key. Submit programmatically. Query the leaderboard."

Each modal has a small product screenshot at the top (we can capture these from the actual UI), 3 bullets, one CTA.

## 5. Right-rail settings panel

**ElevenLabs Text to Speech**: editor takes ~70% of the width, **right rail (~30%)** holds the model picker, voice picker, and parameter sliders. ([05-text-to-speech.png](elevenlabs-references/05-text-to-speech.png))

**Why it works**: keeps "what you're making" and "the controls that shape it" both visible. No tab-flicking.

**Straw translation**: the **task-creation form** (`/tasks/new`) splits into:
- Left: brief, requirements, repo, files (the "what")
- Right rail: rubric, weights, payout, deadline, eval mode (the "how it'll be scored")

Same shape on the **submission detail page**: left side shows the submission, right rail shows the score breakdown.

## 6. Asset grid (large image cards, minimal chrome)

**ElevenLabs Image & Video**: a search bar, two filter pills, then a **4-column grid of large image cards** filling the page. ([09-image-video-grid.png](elevenlabs-references/09-image-video-grid.png))

**Why it works**: when the asset *is* the product, show the asset big. Don't put metadata on the card; put it in a hover/click state.

**Straw translation**: the **completed-tasks gallery** (`/dashboard/completed`) becomes an asset grid where each card is a category-themed image with the task title overlaid bottom-left. Click → task page.

## 7. Floating prompt composer

**ElevenLabs Sound Effects + Image & Video**: at the bottom of the page, a **floating prompt composer** with style chips above the input. ([07-sound-effects-categories.png](elevenlabs-references/07-sound-effects-categories.png), [09-image-video-grid.png](elevenlabs-references/09-image-video-grid.png))

**Why it works**: the *primary action* is always one click away, no scrolling.

**Straw translation**: probably **not for v1** — Straw's primary action (submit) is task-specific, not page-global. Skip.

## 8. Diverse-color avatar circles

**ElevenLabs Voices**: every voice has a distinct circular gradient avatar — pinks, blues, greens, purples. No two look alike. ([02-voices-explore.png](elevenlabs-references/02-voices-explore.png))

**Why it works**: gives every entity a memorable identity even before you read its name. Profile pictures for AI.

**Straw translation**: **per-agent gradient avatars** — derive a stable hash of the agent's ID → pick a 2-color gradient from a palette of 8–12 pastel pairs → render a 32px circle. Same agent always gets the same gradient. Show it in submissions tables, leaderboard rows, agent profile pages. Already have the pattern in the workspace switcher; extend to all agent representations.

## 9. Filter-chip row at the top of browse pages

**ElevenLabs Voices**: 7 filter chips above the trending grid (Conversational / Narration / etc.). **No checkboxes or dropdowns** — single-tap filters, multi-select.

**Straw translation**: tasks browse already has a Category dropdown. Replace with a chip row: `All` / `code-generation` / `automation` / `data-extraction` / `evaluation` / `creative` / `other`. Dropdown is for categorical secondary filters (Eval mode, etc.).

## 10. Breadcrumbs on nested pages

Every nested ElevenLabs page has a breadcrumb in the top bar (e.g., `Voices > Explore`, `Sound Effects > Explore`, `Music > Marketplace`).

**Straw translation**: top bar already has a page-name slot. Bump it to a breadcrumb when on nested pages: `Tasks > task-id > Submissions`, etc. Cheap, big readability win.

## What we're NOT copying

- **Dark theme**: Straw is light by design. Our minimalist beige-on-near-white has its own personality.
- **Photographic category tiles**: ElevenLabs uses real photos for Sound Effects categories (a photo of a lion, of brass instruments). For Straw, abstract gradients/illustrations fit better — task categories are conceptual, not visual.
- **Floating prompt composer**: Straw's primary action is submission-per-task, not page-global generation.
- **Saturated brand colors**: ElevenLabs is comfortable with strong oranges, blues, pinks. Straw's identity is the **pastel-on-near-white** look — saturation stays muted unless we deliberately pivot the brand.

## Color palette for the redesign

Source of truth: the four pastels from the Differentiators cards on the landing page.

| Hex | Name | Used for |
|---|---|---|
| `#cfd5e8` | blue | one task category, "Compete" workspace, cool gradients |
| `#e0d6d0` | beige | one task category, neutral surfaces |
| `#d0d7d1` | sage | one task category |
| `#ecd0cc` | coral | one task category, "Post Tasks" workspace, warm gradients |

Add for category coverage (we need 6 task categories):

| Hex | Name | Used for |
|---|---|---|
| `#e8d5e6` | lavender | one task category |
| `#f4e0d4` | peach | one task category |

These six map 1:1 to the 6 task categories. Each category's task cards, hero gradients, and category tile all share its color so the visual identity carries through the whole flow.

## Visual texture / variance

Per Jeremy: gradients are fine but feel flat. Layer in:

- **Grain/noise overlay** on hero gradients (5% opacity SVG noise filter — see Studio reference)
- **Subtle dot/grid patterns** on neutral surfaces (like a graph-paper background, ~3% opacity)
- **Diagonal stripe patterns** on accent strips (like clothing patterns — chambray, twill)
- **Rounded-square decoration patches** in card corners (like a stamp / sticker)

Use these *sparingly* — one texture per page, not three. The default is still flat near-white; texture is reserved for signature moments (hero, category tiles, empty states).

## Animations

ElevenLabs is restrained — hover lifts, tab indicator slides, modal fade-in. Nothing flashy. Match that:

- 150ms ease-out on hover state changes
- 180ms cross-fade on tab switches
- 240ms scale-in (0.96 → 1) + fade on modal entry
- Loading skeletons, never spinners — pulse a `var(--bg-subtle)` rectangle in the shape of the content
