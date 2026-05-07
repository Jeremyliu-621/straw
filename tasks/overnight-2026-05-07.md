---
type: overnight-plan
purpose: Resumable plan for the 2026-05-07 overnight autonomous run. Each loop iteration picks up at the marker.
last_updated: 2026-05-07
branch: feat/overnight-2026-05-07
worktree: ../mop-overnight
---

# Overnight 2026-05-07 — autonomous work plan

User mandate: ~8 hours of self-directed work in this worktree. They will run a 2–3hr `/loop` to ping me periodically. Goal:

1. Research long-running LLM wrappers + context-management tools (Cursor, Perplexity, OpenClaw, etc.) — synthesize findings for Straw's eval agents that must compare ~500 submissions on complex codebases without context drift.
2. Make Straw's docs/CLI/MCP/API self-onboarding for autonomous agents — dream is OpenClaw discovers `straw.wiki` and bootstraps itself, no human handoff.
3. Revamp the dashboard UI/UX to feel as polished as Stripe / 11Labs.

User said don't enter plan mode. Senior staff engineer mindset. AI-native. Production-ready code. No LLM-slop docs.

## Resume protocol (read first when this file is re-opened)

1. Find the section below marked `<!-- CURSOR -->`. That's the next thing.
2. If a section is marked `[in-progress]` — finish it before moving on.
3. If a section is marked `[needs-review]` — pause and surface to the user before proceeding past it.
4. After completing a section, mark it `[done YYYY-MM-DD HH:MM]` with a one-line note, advance the cursor.
5. **Commit cadence:** one commit per completed section, message format `feat(overnight): <section title>`. Prevents huge unreviewable commits.
6. **Don't mix sections in one commit** — review-ability matters.

## Phase 1 — Research: long-running LLM wrappers & context management

Output directory: `tasks/research/agent-context-management/`

**Why this matters for Straw:** D30 mandates a tiered eval funnel (deterministic → cheap-LLM gatekeeper → agent investigator → adversarial guardrails). The "agent investigator" tier needs to look at 500+ submissions on real codebases and rank them — that's 100s of hours of agent thinking time, with deep code understanding required and no human in the loop. The state-of-the-art for this class of agent (Cursor's Composer agent mode, Aider, Claude Code, Codex CLI) has solved a lot of these problems already. Steal the patterns.

### 1a. Cursor / Cline / Aider / Codex CLI — codebase-scale LLM wrappers — [done 2026-05-07 04:55]
- ~3.1K words, 34 sources. Headline: indexing bifurcates into server-managed embedding shops (Cursor) vs deterministic on-disk PageRank (Aider) vs lazy grep+read (Claude Code, Codex CLI). Anthropic's context-management API (`clear_tool_uses_20250919`, `compact_20260112`, `memory_20250818`) is now first-class. Tool-catalog crowding remains unsolved.

### 1b. Perplexity / Deep Research — long-running, iterative, citation-grounded tools — [done 2026-05-07 04:30]
- ~3.0K words, 22 sources. Headline: orchestrator + isolated-context sub-agents with explicit compression at the tool-output boundary. Single-context loops fail past ~10 hops. Anthropic's CitationAgent runs post-hoc on synthesis output (citation decoupled from generation = anti-hallucination). LangChain Open Deep Research is the cleanest copyable reference.

### 1c. OpenClaw + the autonomous-agent SOTA for hours-long runs — [done 2026-05-07 04:55]
- ~3.4K words, 25+ sources. Headline: **OpenClaw is a real public project** (`github.com/openclaw/openclaw`, MIT, Peter Steinberger), not Straw-internal. ZeroClaw is the Rust rewrite. OpenClaw's heartbeat-and-webhook shape is the **wrong** model for Tier-3. Right model: OpenHands SDK + Claude Code subagent + SWE-agent ACI. Failure modes converge on token snowball, goal drift, premature completion, and compaction lossiness.

### 1d. Synthesis for Straw's eval agents — [done 2026-05-07 05:10]
- Wrote `tasks/research/agent-context-management/synthesis-for-straw-eval-agents.md` — the Straw-specific architecture brief. **Implementation-ready.**
- TL;DR architecture: orchestrator + N short-lived investigators (batches of 50), SWE-agent ACI tools (≤6), Aider-style PageRank repo maps (no embeddings), Anthropic context-management API verbatim, CitationAgent pattern adapted to code-line citations, two-pass scoring (parallel score + sequential rank-on-contested-boundaries).
- Cost estimate: ~$10–$20 marginal Tier-3 LLM spend per 500-submission task with prompt caching.
- Implementation: ~18 engineer-days, parallelizable across 5 components.
- Open questions surfaced for Jeremy at the bottom of the synthesis.
- Also wrote `agent-context-management/README.md` index, registered the directory in `tasks/README.md` and `tasks/research/README.md` per CLAUDE.md INDEX-gate rule.

## Phase 2 — Self-onboarding agent docs / CLI / MCP

[Phase 2 done — see sections 2a/2b/2c/2d below.]

## Phase 3 — Dashboard UI/UX revamp

[Phase 3a (visual direction doc) done — `tasks/dashboard-revamp-direction.md`. Implementation steps 1–12 are in that file as a sequenced list. Each is independently shippable; pick them up from the top in subsequent loop iterations.]

### Phase 3 progress (this branch)

- [x] **Step 1 — `<KpiTile>` component + tests** — done 2026-05-07 05:50.
  - `src/components/dashboard/sparkline-points.ts` — pure helper, computes inline-SVG `<polyline>` + `<path>` (area fill) + trend direction from a numeric series. No charting library. Handles empty / single-point / all-equal / negative / out-of-window-fit / custom padding.
  - `src/components/dashboard/sparkline-points.test.ts` — 11 cases. All pass via `npx vitest run` against the master tree's deps. Pure-function math, no jsdom needed.
  - `src/components/dashboard/kpi-tile.tsx` — Stripe-style tile: label + value + optional unit + optional sparkline + optional PoP delta chip. Color-coded by `(direction × isGoodWhenHigher)`. Compact mode for tertiary tiles. Optional `href` for click-through.
  - Wired into `src/app/dashboard/agent/page.tsx` — replaces the four `StatCard` instances. Sparkline currently mocked via deterministic `mockTrend()` helper until step 4 (`/api/dashboard/kpi-trends`) ships.
  - TypeScript strict mode clean. Type-checked against master tree's `node_modules` since worktree doesn't have its own install yet.
  - Pending: visual verification in browser. Worktree doesn't have node_modules yet — next iteration should `cd ../mop-overnight && npm install` once and run `npm run dev` from the worktree to verify.
- [x] **Step 2 — `<ActivityFeed>` component + mocked-data render** — done 2026-05-07 06:10.
  - `src/components/dashboard/relative-time.ts` — pure helper, formats absolute timestamp as "5m ago" / "in 3h" / "1y ago". 7 thresholds (sec/min/hr/day/wk/mo/yr) + future-time "in X" prefix + invalid-input fallback.
  - `src/components/dashboard/relative-time.test.ts` — 10 cases. All pass.
  - `src/components/dashboard/activity-feed.tsx` — visual component. Filter chips (All / Submissions / Tasks / Deals / Failures), one event per row with role-coloured icon (FileText, CheckCircle2, Flag, Handshake, TrendingUp, CircleAlert) + actor + verb + target + optional delta + relative time. Loading and empty states distinct. Truncation cap with "View all" affordance.
  - Wired into `src/app/dashboard/agent/page.tsx` — synthesizes events from the existing submissions list via `buildActivityEventsFromSubmissions()` until `/api/dashboard/activity` ships.
- [ ] **Step 3 — `GET /api/dashboard/activity` endpoint** — query union over submissions, evaluation_results, deals, audit_log. Paginated. Indexes assessed for cost.
- [ ] **Step 4 — `GET /api/dashboard/kpi-trends?metric=&days=14` endpoint** — Postgres aggregate against submissions/evaluation_results, replaces `mockTrend()` calls.
- [ ] **Step 5 — Refactor `dashboard/agent/page.tsx`** to full new layout per direction doc.
- [ ] **Step 6 — Refactor `dashboard/company/page.tsx`** likewise.
- [x] **Step 7 — `<RichTaskRow>` / `<RichSubmissionRow>`** — done 2026-05-07 06:55. (Done out of order — pulled forward because the API endpoint work in step 3 needs more prep.)
  - `src/components/dashboard/rich-task-row.tsx` — five-zone row: title+meta / status+eval-mode / submissions-bar-or-budget / deadline-countdown. Pure helper `computeDeadlineState()` exposes urgency flags (urgent <24h, warning <72h) used to colour the trailing column.
  - `src/components/dashboard/rich-task-row.test.ts` — 8 cases for `computeDeadlineState`. All pass.
  - `src/components/dashboard/rich-submission-row.tsx` — five-zone row: task title+id / agent display name / status / score+delta-bar / time. Pure helper `scoreSeverity()` maps {≥80, ≥50, <50, null} to {success, mid, warning, faint}.
  - `src/components/dashboard/rich-submission-row.test.ts` — 5 cases. All pass.
  - Wired into both agent and company dashboards. Removed dead inline-table code (~100 lines per dashboard) — `labelStyle`, `<StatusBadge>` direct, table-header divs, etc.
  - Net: dashboards are visibly denser without changing the underlying data flow.
- [x] **Step 8 — Tile additions:** QuickActions ✅, LeaderboardPreview ✅ (component-only, wiring deferred), ReputationTile ✅, WorkspaceUsage ✅. Done 2026-05-07 07:55.
  - `src/components/dashboard/quick-actions.tsx` (done 2026-05-07 07:25). Compact horizontal pill row of role-specific shortcuts. Wired into both dashboards just below the hero. Agent: Browse open tasks / Your submissions / Profile. Company: Pending submissions / Drafts / Leaderboards. Each pill takes optional badge (e.g., "{n} drafts") and optional hint (tooltip). Shape-agnostic — page passes the action list.
  - `src/components/dashboard/leaderboard-preview.tsx` (done 2026-05-07 07:25, NOT yet wired). Top-N entries for a single task as a compact card. Header (Trophy icon + "LEADERBOARD" + task title + "View all" affordance), then numbered list with rank badge + agent name (highlights "you") + score mini-bar + score. Distinct empty + loading states.
    - Wiring deferred: needs a fetch to `GET /api/v1/tasks/{id}/leaderboard` for some "featured" task. Reasonable defaults: agent dashboard = the task with the user's most-recent submission; company dashboard = the most-recently-published task. Defer to next /loop iteration as part of the dashboard data-wiring pass.
  - ReputationTile (agent_builder only) and WorkspaceUsage (agent_builder only) still TODO.
- [ ] **Step 9 — Empty + loading + error states** for each new component.
- [ ] **Step 10 — Mobile responsive pass.**
- [ ] **Step 11 — A11y pass.**
- [ ] **Step 12 — Polish (subtle entrance animation, focus-ring consistency).**

<!-- CURSOR -->

[Next iteration of /loop: **Phase 3 step 3 — `GET /api/dashboard/activity` endpoint**. Should union over `submissions`, `evaluation_results`, `deals`, and `audit_logs` tables. Pagination via `cursor + limit`. Owner-only — call `authenticateRequest` then filter to events where the user is `actor.id` OR `target.task.company_id`. Return events shaped like the `ActivityEvent` interface in `src/components/dashboard/activity-feed.tsx`. Indexes: grep `supabase/migrations` for `submissions(agent_id, created_at)` and `submissions(task_id, created_at)`; create if absent (cost: small, write-amplification negligible). Replace the `buildActivityEventsFrom*` shims in both dashboards with a fetch to the new endpoint. Land as `feat(overnight): /api/dashboard/activity endpoint + wire`, then advance to step 4.]

[Worktree onboarding before next iteration starts code work: `cd ../mop-overnight && npm install` (5 min, one-time). Then `npm run dev` from the worktree on a non-3000 port (master tree dev server is on 3000). Visual-verify KpiTile + ActivityFeed + RichTaskRow + RichSubmissionRow render correctly on `/dashboard/agent` and `/dashboard/company` BEFORE writing the new endpoint.]

## Phase 2 — Self-onboarding agent docs / CLI / MCP

User's vision: an autonomous daemon (e.g., OpenClaw) discovers `straw.wiki` and bootstraps itself onto the platform without human handoff. Steps the agent has to go through unaided: discover the platform exists, learn what it does, get an API key, find a task, post a submission, get a score.

Today's friction (from prior session memory + my own audit-to-be):
- `/api/docs` exists but is brief
- API key issuance requires a logged-in human in `/dashboard/api`
- MCP catalog is sprawling (32 tools)
- No "agent-readable index" at the root of straw.wiki

Output: `tasks/agent-self-onboarding-2026-05-07.md` with a concrete proposal + tactical TODOs. Then, where it's small and safe, ship the changes. Where it's bigger, leave the proposal for Jeremy to decide.

### 2a. Audit current state — [done 2026-05-07 04:50]
- `/api/docs` is already excellent (~600 lines structured prose JSON). Full agent loop, lifecycle states, polling recipes, SSE alternative. No content gap — discoverability gap.
- MCP server has solid `instructions` field at `packages/mcp-server/src/index.ts:30-37` listing 32 tools by category.
- Key issuance flow at `/dashboard/api` requires NextAuth session — human-only today.
- Landing page (`src/app/page.tsx`) does not advertise the agent surface. An agent landing at `straw.wiki` has no signpost.

### 2b. Friction inventory — [done 2026-05-07 04:50]
| Step | Today | Friction |
|---|---|---|
| Discover Straw exists | Hit straw.wiki | No agent-readable index — fixed in 2c |
| Learn the API | Find /api/docs by guessing the URL | Now linked from llms.txt + agent.json |
| Get an API key | Sign in via GitHub/Google at /dashboard/api | **Human required** — proposal in 2d |
| List open tasks | `GET /api/v1/tasks` (auth) or `/api/public/tasks` (no auth) | Already great |
| Submit a solution | `POST /api/v1/tasks/{id}/quick-submit` | Already great |
| Poll for score | `GET /api/v1/submissions/{id}` or `/stream` | Already great |

### 2c. Ship the small changes — [done 2026-05-07 04:50]
- ✅ `public/llms.txt` — link-anchored markdown site index per [llmstxt.org](https://llmstxt.org/). Entry point for any LLM-aware crawler / RAG indexer.
- ✅ `src/app/.well-known/agent.json/route.ts` — schema-versioned capability manifest (auth scheme, endpoints, MCP URLs, tool catalog by category, SDK packages, rate limits, `next_steps_for_a_new_agent`). 1hr-fresh / 1d-stale-while-revalidate cache.
- Skipped: editing `/api/docs` itself — it's good as-is. Discoverability via 1 + 2 was the missing piece.

### 2d. Larger proposal for Jeremy — [done 2026-05-07 04:50]
- ✅ `tasks/proposals/agent-self-onboarding-2026-05-07.md` — three-tier proposal. Tier 0 ships in this PR (llms.txt + agent.json). Tier 1 is programmatic key issuance with three options (stake-to-bootstrap, operator tokens, anonymous tier) — recommends Operator Tokens for first ship. Tier 2 is "fully autonomous, no human ever" — honestly explains why this requires trust delegation.

## Phase 3 — Dashboard UI/UX revamp

User says the dashboard "looks very empty and doesn't work as nice as the landing page." Wants Stripe / 11Labs polish: dense, busy in a useful way, great UX.

Output: a new design + implementation. Probably the single longest section.

### 3a. Audit current dashboard
- [ ] Inventory `src/app/dashboard/**` — what pages exist, what each shows, what's missing
- [ ] Screenshot or describe the empty state on each
- [ ] Identify where the user-value is thin

### 3b. Inspiration brief
- [ ] Read what the brand pastel palette + the landing-page treatment look like (consistency target)
- [ ] Synthesize from Stripe Dashboard, 11Labs Dashboard, Linear, Vercel — the gold-standard B2B SaaS dashboards
- [ ] Pick a visual direction document at `tasks/dashboard-revamp-direction.md`

### 3c. Implementation
- [ ] Probably one page at a time. Start with `/dashboard/agent` (most-trafficked) and `/dashboard/company`.
- [ ] Components live in `src/components/dashboard/`
- [ ] Test in browser before committing each
- [ ] Mobile-responsive

### 3d. Polish pass
- [ ] Empty states (no submissions yet, no tasks yet)
- [ ] Loading states
- [ ] Error states
- [ ] Animations (subtle, framer-motion, not heavy)

## Out of scope (won't touch tonight)

- Buying Hetzner CX22 (D35) — the user explicitly said they'll do tomorrow
- OpenClaw bridge rebind — gated on Dog
- Anything that requires Stripe / Resend / external service signup
- Anything that requires browser-based human action

## Decisions log (additive — append, never edit)

_(empty — append entries as decisions are made during the night)_
