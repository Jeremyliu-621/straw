# UI_RULES.md

## Design Reference

The aesthetic direction is modeled on **ElevenLabs** — not copied, but used as a north star. Study it: https://elevenlabs.io

What ElevenLabs gets right that you must internalize:
- Black on white. White on black. Almost nothing else.
- Generous whitespace that feels intentional, not empty
- Typography does all the heavy lifting — no decoration needed
- The product UI looks like a tool a serious person uses, not a landing page someone scrolls past
- Every element earns its place. If it doesn't need to be there, it isn't.

Also study: **Linear**, **Vercel**, **Clerk**, **Resend**. These are the reference class. They look human-made because they were designed with taste, not generated.

---

## The One Rule Everything Else Flows From

**This product must look like a person designed it, not a model prompted it.**

If you look at a screen and it could have come from a Figma AI plugin, a generic SaaS template, or a "build me a dashboard" prompt — rebuild it. That feeling is the enemy.

---

## Color

**Palette: Near-black, off-white, and one neutral mid-tone. That's it.**

```css
--color-bg:           #fafafa;   /* off-white, not pure white */
--color-bg-secondary: #f4f4f4;   /* subtle surface differentiation */
--color-border:       #e5e5e5;   /* borders, dividers */
--color-text:         #111111;   /* primary text, near-black not #000 */
--color-text-muted:   #737373;   /* secondary text, labels */
--color-text-faint:   #a3a3a3;   /* placeholder, disabled */
--color-inverse-bg:   #111111;   /* dark surfaces, hero sections */
--color-inverse-text: #fafafa;
```

**Semantic states — use sparingly, only where meaning requires it:**
```css
--color-success:  #16a34a;   /* passing tests, won */
--color-error:    #dc2626;   /* failing, errors */
--color-warning:  #d97706;   /* in progress, caution */
--color-info:     #2563eb;   /* neutral info */
```

**What is completely forbidden:**
- RGB accent colors that have no human-made precedent (no `#00ff88`, no `#7c3aed`)
- Gradient backgrounds of any kind
- Colored cards or panels for decoration
- Multiple accent colors coexisting
- Glassmorphism, frosted glass, blur effects
- Drop shadows larger than `0 1px 3px rgba(0,0,0,0.1)`

If you feel the urge to add color somewhere, ask: does this color communicate information, or am I decorating? If it's decoration, remove it.

---

## Typography

**Font stack:**

- **Display/headings:** `Geist` (Vercel's font — geometric, condensed-feeling, serious) or `Instrument Serif` for editorial moments. Pick one and commit for the whole project.
- **Body:** `Geist` or `DM Sans` — clean, legible, not generic
- **Monospace (scores, code, data):** `Geist Mono` or `JetBrains Mono` — data should look like data

**Never use:** Inter (overused), Space Grotesk (AI-coded default), Poppins (consumer app), Roboto, Arial, any system font stack for display text.

**Type scale — use fewer sizes than you think you need:**
```
Display:   48–64px, weight 500–600, tight letter-spacing (-0.02em)
H1:        32–40px, weight 500
H2:        24px, weight 500
H3:        18px, weight 500
Body:      15px, weight 400, line-height 1.6
Small:     13px, weight 400
Label:     11px, weight 500, tracking 0.06em, UPPERCASE
```

The label style (small caps, tracked out) is useful for table headers, section labels, status categories. Use it consistently.

---

## Spacing

Base unit: `4px`. Everything is a multiple of 4.

- Use generous padding inside components. Cramped = cheap.
- Vertical rhythm matters. Section gaps should feel like breathing room, not like you ran out of content.
- Sidebar width: `240px` fixed.
- Max content width: `1200px` centered.
- Page padding horizontal: `32px` on desktop, `16px` on mobile.

---

## Motion

Less is more. Motion should orient, not entertain.

**What's allowed:**
- Fade-in on page load: `opacity 0 → 1`, `200ms`, `ease-out`. Once. Not per-element.
- Leaderboard row reordering: smooth position transition, `300ms ease`. This is the one dramatic moment — let it land.
- Hover states: subtle background shift, `150ms`. Never scale transforms on hover for UI elements.
- Skeleton loading: a single slow pulse, `1.5s`. Not a shimmer, not a bounce.

**What is forbidden:**
- Staggered entrance animations on lists/cards
- Page transitions that slide or flip
- Parallax
- Any animation that plays more than once unprompted
- Lottie files, animated illustrations, confetti

---

## Components

### The Golden Rule
Components should look like they belong to a system, not like they were individually styled. Consistency is more important than any individual component being interesting.

### Buttons
```
Primary:   bg #111, text #fafafa, no border, hover: bg #333
Secondary: bg transparent, text #111, border 1px #e5e5e5, hover: bg #f4f4f4
Danger:    bg transparent, text #dc2626, border 1px #dc2626, hover: bg #fef2f2
```
- Padding: `10px 16px`
- Border-radius: `6px`
- Font: `14px`, weight `500`
- No icons inside buttons unless they genuinely aid comprehension. No arrow icons.

### Tables
Tables are the primary data surface of this product. They must be excellent.
- Header: `11px` label style (uppercase, tracked), `--color-text-muted`
- Rows: `48px` height, `1px` border-bottom `--color-border`, hover `--color-bg-secondary`
- Scores: always monospaced, right-aligned
- Empty state: centered in table body, Lucide icon (thin stroke) + headline + CTA
- Pagination: bottom-right, `Previous / Next` with page count, simple text links

### Status Badges
```
OPEN:        bg #f0fdf4, text #16a34a, border #bbf7d0
EVALUATING:  bg #fffbeb, text #d97706, border #fde68a
CLOSED:      bg #f4f4f4, text #737373, border #e5e5e5
FAILED:      bg #fef2f2, text #dc2626, border #fecaca
```
- `11px`, weight `500`, uppercase, letter-spacing `0.04em`
- Padding: `3px 8px`, border-radius `4px`
- Never use colored dots or icons inside badges — the color does the work

### Score Display
Scores are the product. Treat them accordingly.
- Large final score: `48px` monospaced, weight `600`, `--color-text`
- Score bar: `4px` height, `--color-border` background, `--color-text` fill. No rounded ends.
- Dimension scores: `14px` mono, listed cleanly, label left + score right
- Never show a score as a fraction (not `87/100`) — always as a number (`87.4`)

### Forms
- Label above input, always. Never placeholder-only.
- Input: `1px` border `--color-border`, `10px 12px` padding, `border-radius 6px`
- Focus: `2px` outline `#111`, `outline-offset 2px`. Not a glow. Not a colored border.
- Error state: red border + error text below, `13px`, `--color-error`
- The rubric builder: criteria add/remove dynamically, weight total shows live in `13px` muted text. If weights don't sum to 100%, submit is disabled with an inline explanation — not a toast.

### Icons
Use **Lucide** icons only. `strokeWidth={1.5}`. Never filled icons. Never emoji. Never custom SVG illustrations that look like stock art.

Icon sizes: `16px` inline with text, `20px` standalone in UI, `24px` for empty states.

---

## Layout & Navigation

**Authenticated layout:** Fixed left sidebar `240px` + main content area.

**Sidebar:**
- Logo/wordmark at top — text only, no elaborate mark
- Navigation links: `14px`, weight `400` default, weight `500` + `2px` left border `#111` when active
- User info at bottom: name + role, small, muted

**Public layout:** Top nav bar, `64px` height. Logo left, nav links center, CTA right.

No sticky headers inside content areas.

---

## Landing Page

One job: make a serious person trust this enough to try it.

**Structure:**
1. **Hero** — one sentence what it is, one sentence why it's better, two CTAs. Dark background `#111`, white text. No illustration. If there's a visual, it's a real screenshot of the leaderboard — the actual product, not a mockup.
2. **How it works** — three steps, plain text. `Step 01. Step 02. Step 03.` No icons.
3. **Why it's different** — two columns. Left: the old way (demos, sales calls, guesswork). Right: the new way (agents compete on real tasks, scores don't lie).
4. **Pricing** — clean table. No feature-bloat comparison columns.
5. **Footer** — links, legal.

**Copy rules:**
- No exclamation marks
- No "revolutionizing" or "reimagining" or "powerful" or "cutting-edge"
- Numbers over adjectives: `"4 agents competed. 1 scored 94.2."` beats `"See incredible results."`
- If the headline could appear on any B2B SaaS website, rewrite it.

---

## What Makes It Feel Human-Made

- **Typography hierarchy that's obvious without color.** Size, weight, and spacing do the work.
- **Whitespace that feels almost too generous.** If it feels like there might be too much space, you're probably close to right.
- **Zero stock photography.** Zero Unsplash. Zero abstract 3D renders.
- **The product screenshot is the hero visual.** Show the real leaderboard with real-looking data.
- **Realistic numbers in demos.** Not `99 users`. Use odd, believable numbers like `23 tasks`, `6 agents`, `91.3`.
- **One element per page that breaks the expected.** A headline that runs longer than comfortable. A number displayed very large. Space where you'd expect content. Grids are structure, not cages.

---

## Hard Prohibitions

Never, under any circumstances:
- Gradient backgrounds or gradient text
- Glassmorphism / blur / frosted surfaces
- Colored section backgrounds (aside from the single dark hero)
- Emoji anywhere in product UI
- Stock illustrations (Undraw, Storyset, Humaaans, or anything like them)
- Purple. Anywhere. At all.
- Animated gradient borders
- "Bento grid" layouts
- Hero sections with a floating laptop/phone mockup
- Testimonials with stock photo avatars
- Filled/solid icons — outlines only
- Loading spinners — skeletons only
- Modals for destructive actions — inline confirmation only
- Any color described as "vibrant", "electric", or "neon"
