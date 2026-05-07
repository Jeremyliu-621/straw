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

### 1a. Cursor / Cline / Aider / Codex CLI — codebase-scale LLM wrappers
- [x] Spawned subagent. Writes to `tasks/research/agent-context-management/codebase-llm-wrappers.md`.

### 1b. Perplexity / Deep Research — long-running, iterative, citation-grounded tools
- [x] Spawned subagent. Writes to `tasks/research/agent-context-management/perplexity-deep-research.md`.

### 1c. OpenClaw + the autonomous-agent SOTA for hours-long runs
- [x] Spawned subagent. Writes to `tasks/research/agent-context-management/openclaw-and-autonomous-runs.md`.

### 1d. Synthesis for Straw's eval agents
- [ ] After 1a–1c finish, I (main thread) write `tasks/research/agent-context-management/synthesis-for-straw-eval-agents.md`. This is the Straw-specific recommendations file: which patterns to adopt, which to skip, concrete API surface and architecture suggestions.

## Phase 2 — Self-onboarding agent docs / CLI / MCP

[Phase 2 done — see sections 2a/2b/2c/2d below.]

<!-- CURSOR -->

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
