---
type: design-direction
status: drafted — implementation pending across subsequent loop iterations
last_updated: 2026-05-07
authored_during: overnight-autonomous-run
related_files: src/app/dashboard/**, src/components/dashboard-shell.tsx, src/app/globals.css
inspirations: Stripe Dashboard, 11Labs Dashboard, Linear, Vercel Dashboard
---

# Dashboard revamp — visual direction

User mandate (paraphrased, 2026-05-07):

> "The dashboard looks very empty. Doesn't work as nice as the landing page. Fill it up with content. Make it look a bit busier — but busy in the sense that it has good UX. Study Stripe, 11Labs."

This doc decides the visual + structural direction. Component-level work follows in subsequent commits, one section at a time.

## Audit summary (current state, 2026-05-07)

| Surface | Today | Density | Where it falls short |
|---|---|---|---|
| `src/app/dashboard/agent/page.tsx` | 4 stat cards + Open Tasks table + Your Submissions table | Low | No motion. No charts. No leaderboard preview. No reputation/standing. Stat cards static. |
| `src/app/dashboard/company/page.tsx` | 4 stat cards + Your Tasks table + Recent Submissions table + draft callout | Low | Same. No charts. No score-distribution bar per task. No "trending tasks" section. |
| `src/app/dashboard/inbox/page.tsx` | Threads list + chat panel | Medium | Reasonable for inbox shape. Out of scope for revamp. |
| `src/app/dashboard/api/page.tsx` | API key list + auto-mint banner | Low | Single-purpose, leave alone. |
| `src/components/dashboard-shell.tsx` | Sidebar (240px) + max-w-1200 content | Adequate | Layout fine; sidebar might want reorganization. |
| `src/app/globals.css` | Monochrome (#fafafa bg, #111 accent), Geist fonts, radius 2.5px | Spartan | Intentional and good — the *direction* is right, the *content density* is wrong. |

Current design language is sound — minimalist monochrome, sharp 2.5px radius, Geist sans+mono. The fix isn't to change the language; it's to fill it with substance, the way Stripe does.

## Inspiration analysis

### Stripe Dashboard

What works (steal):

- **Hero KPI tile**: single MRR number, big, with a 30-day sparkline and a +/-% delta vs prior period. Period toggle: day / week / month / quarter / year. Click → drill into the chart.
- **Net volume / new customers / failed payments tile row** below: smaller versions of the hero pattern, three or four wide.
- **Activity feed**: chronological stream of "Customer X subscribed", "Charge succeeded", "Dispute opened" with timestamps and tiny avatars/icons. Filter chips at the top.
- **Recent payments table**: dense, with row hover preview, customer name, amount, date, status pill, and a "→" affordance to open the detail.
- **Cohort/funnel cards**: for things like "MRR by plan" — small bar charts inline.
- **Right-side meta column** (sometimes): "Things to do" list, integration health, support inbox preview.

What we copy 1:1:
- KPI tile shape (number + sparkline + delta + period toggle)
- Activity feed shape (chronological stream + filter chips)
- Hover-preview on table rows

### 11Labs Dashboard

What works (steal):

- **Recent generations grid**: visual cards for recent runs, each with audio waveform / color-coded by voice. Shows that the dashboard is also *the place where work happens*, not just a stats wall.
- **Credits balance with trend**: like a KPI tile but for resource consumption.
- **Voice Lab carousel**: featured voices the user might want to try.
- **Conversational AI agents at top**: the *thing the user wants to use* is right there, not buried.

What we copy:
- Top-of-page "next action" surfacing — for an agent_builder, this is "tasks worth competing on right now"; for a company, it's "your draft tasks waiting to publish" or "submissions waiting for your review."
- Visual chips/badges for eval_mode (like 11Labs' voice-color-coding).

### Linear

What works (steal):

- Dense table with **inline filter row** (status, priority, assignee), and the table updates without a roundtrip.
- **Workspace projects strip** at the top — small horizontal cards for projects (= for us: tasks the user is currently competing on or running).
- **My issues / assigned to me** sectioning for personal ownership clarity.

What we copy:
- Inline filter row on the tasks table
- Section dividers with subhead + meta count + action

### Vercel Dashboard

What works (steal):

- **Deployment list as primary surface**: each deployment is a rich row with project, branch, commit message, status, build time, source author. Lots of metadata in a small space without feeling cluttered. This is *exactly* the model for our submissions list.

What we copy:
- Submission row treatment: include the agent's name + score + per-criterion mini-bars + timestamp + status + an open-detail affordance, all on one row.

## Decided direction

**"Stripe-grade density on Linear-tight rails."**

Three layers, top to bottom:

```
┌────────────────────────────────────────────────────┐
│ HERO          │  KPI ROW (4-up tiles, with         │
│  greeting +   │  sparklines + WoW delta + period   │
│  next-action  │  toggle)                           │
│  CTA          │                                    │
├───────────────┴────────────────────────────────────┤
│ TWO-COLUMN MAIN                                    │
│  ┌──────────────────────┬───────────────────────┐  │
│  │ PRIMARY (~70%)       │ ACTIVITY (~30%)       │  │
│  │  Tasks table or      │  Live event feed      │  │
│  │  Submissions table   │  filter chips         │  │
│  │  inline filter row   │  timestamps, links    │  │
│  │  rich rows           │                       │  │
│  └──────────────────────┴───────────────────────┘  │
├────────────────────────────────────────────────────┤
│ TERTIARY ROW                                       │
│  Leaderboard preview │ Reputation │ Workspace use  │
│  (3-up cards, smaller, optional)                   │
└────────────────────────────────────────────────────┘
```

## Component inventory (build list)

In dependency order so the next loop iteration can just walk this list:

### 1. `<KpiTile>` — `src/components/dashboard/kpi-tile.tsx`

```tsx
interface Props {
  label: string;
  value: string | number;
  unit?: string;          // "$", "%", " submissions"
  delta?: { value: number; direction: "up" | "down"; period: string };
  sparkline?: number[];   // 14-day series, normalized
  mono?: boolean;         // use Geist Mono
  href?: string;          // click-through to detail page
}
```

- Sparkline uses inline SVG `<polyline>` — no library needed.
- Delta colored by direction × `is_good_when_higher` (we'll need that flag per metric — submissions count up = good, failed evals up = bad).
- Hover lifts shadow subtly.
- Compact mode for the tertiary row (no sparkline, smaller value).

### 2. `<ActivityFeed>` — `src/components/dashboard/activity-feed.tsx`

```tsx
interface ActivityEvent {
  id: string;
  type: "submission_created" | "submission_scored" | "task_published" | "deal_created" | "leaderboard_change" | "eval_failed";
  timestamp: string;
  actor: { type: "agent" | "company"; name: string; avatar?: string };
  target: { type: "task" | "submission"; id: string; title: string };
  delta?: string;          // "scored 87" / "rank +3" / "$500"
  href: string;
}
```

- Backed by a new `GET /api/dashboard/activity?since=&limit=` endpoint (P1).
- 50 events max, paginated.
- Filter chips: "All / Submissions / Tasks / Deals / Eval failures".
- Each event row: tiny icon + actor name + verb + target link + delta + timestamp (relative — "2m ago"). One line per event.
- Auto-refresh: open SSE to `/api/dashboard/activity/stream` (P2 — future).

### 3. `<RichTaskRow>` / `<RichSubmissionRow>` — `src/components/dashboard/rich-row.tsx`

Replaces the bare table rows. Dense. Stripe-deployment-row style.

For tasks:
- Title (truncate)
- Eval mode chip (color-coded)
- Submissions count micro-bar (filled vs quota)
- Score-distribution sparkline (mini histogram of submitter scores so far)
- Deadline countdown (relative — "in 3d 4h" or red "passed")
- Status badge
- Right-arrow affordance

For submissions:
- Task title
- Agent display name (anonymized while task open if you're not the owner)
- Per-criterion mini-bars (4 dots, one per criterion, color-coded by score)
- Final score (mono, big-ish)
- Timestamp (relative)
- Status badge

### 4. `<QuickActions>` — `src/components/dashboard/quick-actions.tsx`

Hero-row CTA per role. Replaces the "Welcome back, X" subtitle with something useful.

For agent_builder:
- "Browse open tasks" → /tasks
- "View my submissions" → /dashboard/agent (anchor #submissions)
- "Profile" → /agents/profile

For company:
- "Post a task" → /tasks/new (the one CTA we already have — keep prominent)
- "Review pending submissions" → /dashboard/company#pending
- "Drafts ({n})" → with a draft-count badge

Rendered as a horizontal pill row, not as buttons. Light visual weight.

### 5. `<LeaderboardPreview>` — `src/components/dashboard/leaderboard-preview.tsx`

Shown only when relevant: agent_builder with at least one submission, or company viewing a task with submissions.

- Top 5 scores for the most-recent / highest-budget task (configurable).
- Each row: rank, agent name (anonymized rules apply), final score, mini per-criterion bars.
- "View full leaderboard →" affordance.

### 6. `<ReputationTile>` (agent_builder only)

Surfaces agent's standing across all tasks they've competed on. Aggregate stats:

- Submissions: total
- Avg final score (with WoW delta sparkline)
- Tasks placed top-3: count
- Highest score ever
- "Personal best per category" — barchart by category

### 7. `<WorkspaceUsage>` (agent_builder only, optional)

Per-agent KV + file workspace usage, given that Straw exposes 10MB KV / 100MB files per agent (D24 + D26).

- Bytes used / bytes limit (mini bar)
- Keys used / files used
- "Manage workspace" → CLI command + dashboard surface

## Implementation plan (ordered)

The order is dependency-driven. Each step is its own commit.

1. **`<KpiTile>` component + tests** — pure visual, no API changes. Replace existing `StatCard` in agent + company dashboards. Add sparkline data via mocked array initially, wire to real API in step 4.
2. **`<ActivityFeed>` component + tests** — pure visual, mocked data initially.
3. **`GET /api/dashboard/activity` endpoint** — query the existing tables (submissions, evaluation_results, deals, audit_log) and return a unified event stream. Paginated.
4. **Wire `<KpiTile>` deltas to a new `GET /api/dashboard/kpi-trends?metric=X&days=14` endpoint** — Postgres aggregate against submissions/evaluation_results.
5. **Refactor `dashboard/agent/page.tsx`** to use the new components in the decided layout.
6. **Refactor `dashboard/company/page.tsx`** likewise.
7. **`<RichTaskRow>` / `<RichSubmissionRow>`** — replace bare tables.
8. **`<QuickActions>`, `<LeaderboardPreview>`, `<ReputationTile>`, `<WorkspaceUsage>`** — additive tiles, can ship one at a time.
9. **Empty states + loading states** for each new component.
10. **Mobile responsive pass** — sidebar collapsing, two-col stacking, kpi tiles 2x2 on small.
11. **A11y pass** — focus order, screen reader labels, color-contrast verified.
12. **Polish**: subtle Framer Motion entrance, focus-ring consistency, hover states unified.

## Out of scope (for the revamp; track separately)

- **Onboarding wizard tweaks** — already shipped, working.
- **Inbox redesign** — different shape problem; defer.
- **Mobile-first rewrite** — desktop-first reads; mobile is responsive but not primary.
- **Dark mode** — globals.css doesn't have it; don't bolt on as part of the revamp. Track as own task.
- **Analytics integrations** (Mixpanel/PostHog) — track separately.

## Brand consistency notes

The landing page (`src/app/page.tsx`) uses the 6-pastel palette (peach / lavender / blue / beige / coral / sage) per memory `project_brand_pastel_palette_and_og_image.md`. The dashboard does NOT — it's monochrome. **Keep this distinction.** The pastel palette is the marketing voice; the dashboard is a tool. Stripe / Linear / Vercel all do exactly this — colorful marketing, monochrome product.

Where the dashboard MAY use color: status semantics (success green, error red, warning amber, info blue) — exactly the existing CSS variables. Eval mode chips can use grayscale + a subtle hue (e.g., border-color hint for `container` vs `llm` vs `hybrid`).

## How to verify each step

1. After each component lands: visit the dev server in browser, take screenshots, confirm visual + interaction matches the direction here.
2. After each API endpoint lands: hit it via `curl`, confirm shape matches the component's expected props.
3. After each page-refactor lands: open `/dashboard/agent` and `/dashboard/company` as both roles and confirm rendering matches the layout sketch above.
4. Lint + type-check after every change. Tests on every component.
5. Don't claim a step is done without browser verification.

## Risks

- **Activity feed query cost**: union across submissions + evaluation_results + deals + audit_log can be heavy at scale. Index work needed; track in a todo on step 3.
- **KPI period toggle UX**: users will hover/click. Make sure the data refresh is fast (<200ms) — pre-compute or cache aggressively.
- **Sparkline crowding**: at small widths, 14 points becomes noise. Cap to 7 if width < 120px.
- **Race with research findings**: Phase 1 research may surface UX patterns specific to *eval-platform dashboards* that we should incorporate. Re-read research synthesis before final polish.
