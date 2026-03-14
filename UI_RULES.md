# UI_RULES.md

## Design Reference

The aesthetic is modeled on **ElevenLabs** (elevenlabs.io). Not copied — used as a north star.

What ElevenLabs gets right:
- Black on white. White on black. Almost nothing else.
- Whitespace that feels intentional, not empty
- Typography does all the heavy lifting — no decoration needed
- Every element earns its place. If it doesn't need to be there, it isn't.
- It looks like a serious company that doesn't need to try hard

Also study before building anything: **Linear**, **Vercel dashboard**, **Clerk**, **Resend**. These are the reference class. They feel human-made because a person with taste designed them.

---

## The Prime Directive

**This product must look like a person designed it, not a model prompted it.**

If you look at a screen and think it could have come from a Figma AI plugin, a generic SaaS template, or a "build me a dashboard" prompt — rebuild it. That is the enemy.

Signs you are building AI slop:
- Purple anywhere
- Gradient backgrounds or gradient text
- Glassmorphism or blur effects
- Bento grid layouts
- Cards with colored backgrounds for decoration
- Emoji in product UI
- Filled/solid icons
- Stock illustrations (Undraw, Storyset, Humaaans)
- Hero sections with a floating laptop mockup
- Testimonial sections with stock photo avatars
- Loading spinners (use skeletons)
- Multiple accent colors

If any of the above appear in your output, remove them.

---

## Color System

The entire palette:

```css
:root {
  --bg:           #fafafa;   /* page background — off-white, not pure white */
  --bg-subtle:    #f4f4f4;   /* secondary surfaces, sidebar, code blocks */
  --border:       #e5e5e5;   /* all borders and dividers */
  --text:         #111111;   /* primary text — near-black, not #000 */
  --text-muted:   #737373;   /* secondary text, labels, captions */
  --text-faint:   #a3a3a3;   /* placeholders, disabled states */
  --inverse-bg:   #111111;   /* dark sections (hero) */
  --inverse-text: #fafafa;

  /* Semantic — use only when communicating state, never for decoration */
  --success:      #16a34a;
  --error:        #dc2626;
  --warning:      #d97706;
  --info:         #2563eb;
}
```

**Rules:**
- These are the only colors in the product. No additions without a strong reason.
- Semantic colors appear only on status badges, score indicators, and error states
- No accent color — contrast comes from weight and size, not color
- No gradients. Ever.
- No shadows larger than `0 1px 3px rgba(0,0,0,0.08)`

---

## Typography

**Fonts:**
- Display + UI: `Geist` — geometric, slightly condensed, serious. Load from `next/font/google`.
- Monospace: `Geist Mono` — for scores, numbers, code, timestamps. Data should look like data.

**Never use:** Inter, Space Grotesk, Poppins, Roboto, Arial, system-ui for display text.

**Scale:**
```
Display:  56px / weight 500 / tracking -0.03em  — hero headlines only
H1:       36px / weight 500 / tracking -0.02em
H2:       24px / weight 500 / tracking -0.01em
H3:       18px / weight 500
Body:     15px / weight 400 / line-height 1.6
Small:    13px / weight 400
Label:    11px / weight 500 / tracking 0.06em / UPPERCASE
Mono:     14px Geist Mono / for all numbers and data
```

The Label style (11px uppercase tracked) is the workhorse for table headers, section titles, status categories, and form section labels. Use it consistently — it is what makes the UI feel systematic.

---

## Spacing

Base unit: 4px. Every spacing value is a multiple of 4.

Key values:
- Component padding (inputs, buttons): `10px 16px`
- Card/panel padding: `24px`
- Section gaps: `48px` or `64px`
- Sidebar width: `240px` — fixed, not collapsible on desktop
- Max content width: `1200px` — centered
- Page horizontal padding: `32px` desktop / `16px` mobile

**Use generous padding.** Cramped feels cheap. When unsure, add more space.

---

## Motion

Motion should orient, not entertain.

**Allowed:**
- Page fade-in: `opacity 0→1`, `200ms ease-out`, once, not per-element
- Leaderboard row reorder: `300ms ease` position transition — this is the product's most dramatic moment, let it land
- Hover background shifts: `150ms`
- Skeleton pulse: `1.5s` slow fade — not a shimmer

**Forbidden:**
- Staggered list entrance animations
- Page transitions that slide or flip
- Parallax scrolling
- Animations that loop or play unprompted
- Lottie animations
- Confetti or celebration effects

---

## Component System

### Buttons
```
Primary:    bg var(--text) / text var(--inverse-text) / hover bg #333333
Secondary:  bg transparent / text var(--text) / border 1px var(--border) / hover bg var(--bg-subtle)
Danger:     bg transparent / text var(--error) / border 1px var(--error) / hover bg #fef2f2
Ghost:      bg transparent / text var(--text-muted) / hover text var(--text) bg var(--bg-subtle)
```
- Padding: `10px 16px`
- Border-radius: `6px`
- Font: `14px` weight `500`
- No icons unless they genuinely aid comprehension
- No decorative arrow icons

### Inputs
```
border:         1px solid var(--border)
padding:        10px 12px
border-radius:  6px
font:           15px var(--text)
focus:          outline 2px solid var(--text), outline-offset 2px
error:          border-color var(--error)
```
- Label always above input — never floating, never placeholder-only
- Error message below input, 13px, var(--error)
- Helper text below input, 13px, var(--text-muted)

### Tables
Tables are the primary data surface. They must be excellent.

```
Header row:   11px Label style / var(--text-muted) / border-bottom 1px var(--border)
Data rows:    48px height / border-bottom 1px var(--border) / hover bg var(--bg-subtle)
Scores:       Geist Mono, right-aligned always
```

- Sortable columns have a visible sort indicator
- Empty state: centered, Lucide icon (24px, strokeWidth 1.5) + headline + CTA button
- Pagination: bottom-right, "Previous / Next", page count in var(--text-muted)
- Never paginate with numbered page buttons — just Previous/Next

### Status Badges
```
OPEN:        bg #f0fdf4 / text #16a34a / border 1px #bbf7d0
EVALUATING:  bg #fffbeb / text #d97706 / border 1px #fde68a
CLOSED:      bg #f4f4f4 / text var(--text-muted) / border 1px var(--border)
FAILED:      bg #fef2f2 / text var(--error) / border 1px #fecaca
PENDING:     bg #f4f4f4 / text var(--text-faint) / border 1px var(--border)
```
- Font: `11px` Label style (uppercase, tracked)
- Padding: `3px 8px`
- Border-radius: `4px`
- No dots. No icons. The color communicates the state.

### Score Display
Scores are the product. They get the most visual weight on any screen.

- Large final score: `48px` Geist Mono, weight `600`, var(--text)
- Score bar: `4px` height, var(--border) track, var(--text) fill, no rounded ends
- Dimension breakdown: `14px` Geist Mono, label left aligned var(--text-muted), score right aligned var(--text)
- Never display as fraction (not `87/100`) — always as decimal (`87.4`)
- Winning score: no special color treatment — size and position communicate importance

### Rubric Builder
This is the most important form in the product. It must feel like a tool.

- Criteria are added/removed dynamically
- Each criterion has: name (text input) + weight (number input, %)
- Weight total displays live below the list: `"Total: 94% — must equal 100%"` in 13px var(--text-muted) or var(--error) if invalid
- Submit button is disabled with inline explanation if weights don't sum to 100%
- Never use a toast for this validation — it must be inline and persistent

### Icons
- Lucide only. `strokeWidth={1.5}`. Outline style always — never filled.
- 16px inline with text
- 20px standalone in UI
- 24px in empty states
- Never emoji as icon replacements
- Never custom illustrations

---

## Layout

### Authenticated
- Fixed left sidebar: `240px`, `var(--bg-subtle)` background, `1px` right border `var(--border)`
- Main content: remaining width, `var(--bg)` background
- Content padding: `32px`
- Max content width: `1200px`

### Sidebar contents (top to bottom)
- Logo/wordmark: `Map` in 16px weight 600, top `24px` left `20px`
- Nav links: `14px` weight `400`, padding `8px 20px`, hover `var(--bg)`
- Active link: weight `500` + `2px` left border `var(--text)` + bg `var(--bg)`
- User section at bottom: name + role in Label style, `var(--text-muted)`

### Public (landing, pricing, auth)
- Top nav: `64px` height, `var(--bg)`, `1px` bottom border `var(--border)`
- Logo left, nav links center, CTA right
- No sticky elements inside page content

---

## Landing Page

**Job:** Make a serious person trust this enough to try it.

**Hero section** — dark background `var(--inverse-bg)`, white text
- Headline: the product in one sentence. Not clever. Not catchy. Clear.
  - Use: *"Post your problem. Agents compete to solve it. You define what winning looks like."*
- Subhead: one sentence on why it's better than the alternative
- Two CTAs: "Post a Task" (primary) and "Register Your Agent" (ghost)
- Visual: a real screenshot of the leaderboard with real-looking data. Not a mockup. Not an illustration. The actual product.

**How it works** — three steps
- `Step 01.` `Step 02.` `Step 03.` — plain text, no icons, no cards, generous spacing
- Each step is two lines: a short verb headline + one sentence explanation

**Why it's different** — two columns, no heading needed
- Left: the old way (one paragraph, honest)
- Right: the new way (one paragraph, specific)
- Numbers: *"4 agents competed. 1 scored 94.2. You hired it in 48 hours."*

**Pricing** — simple, no feature comparison matrix
- Three rows: Task Fee / Success Fee / Enterprise
- Honest numbers or "Contact us"

**Footer** — product name, links, legal. Nothing else.

**Copy rules:**
- No exclamation marks anywhere
- No "revolutionary", "powerful", "cutting-edge", "reimagining", "next-generation"
- Numbers beat adjectives: *"6 agents, 48 hours, one score"* beats *"fast, comprehensive evaluation"*
- If a headline could appear on any B2B SaaS site, rewrite it

---

## What Makes It Feel Human-Made

These details separate designed from generated:

- **Whitespace that feels almost too generous.** When uncertain, add more.
- **Typography hierarchy without color.** Size + weight + spacing does all the work.
- **Realistic data in demos.** Not `99 tasks`, `1000 agents`. Use `23 tasks`, `7 agents`, `91.3` — odd, believable numbers.
- **One thing per page that breaks the grid.** A very large number. A headline that runs uncomfortably long. Extra space where you'd expect content. The grid is structure, not a cage.
- **Zero stock photography.** Zero Unsplash. Zero abstract 3D renders. Zero generated images.
- **The product screenshot is the hero.** If it looks good, show it. It's the most honest thing on the page.

---

## Hard No List

These are never acceptable under any circumstances:

- Purple anywhere
- Gradient backgrounds or gradient text
- Glassmorphism, blur, frosted glass
- Colored section backgrounds other than the dark hero
- Emoji in product UI
- Stock illustrations of any kind
- Animated gradient borders
- Bento grid feature layouts
- Floating laptop or phone mockups in hero
- Testimonials with stock photo avatars
- Filled/solid icons
- Loading spinners — skeletons only
- Modal dialogs for destructive actions — inline confirmation only
- Any color described internally as "vibrant", "electric", or "neon"
- Tooltip on click — hover only
