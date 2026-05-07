---
type: index
purpose: Top-level directory index for tasks/. Read this when you're new to the docs surface or when authoring a new doc.
last_updated: 2026-05-04
---

# tasks/ — directory index

This is the root of all project documentation for Straw. CLAUDE.md (at the repo root) is the entry point and tells Claude what to read at session start. **This file is the directory map.** When authoring a new doc, register it here in the same commit.

For the **session-start reading order**, see CLAUDE.md. This file is `where things live`, not `what to read first`.

---

## tasks/ root — contract anchors and load-bearing flat docs

These files are referenced by name from `CLAUDE.md` and from the codebase memory; **do not move or rename them** without also updating CLAUDE.md and `.claude/projects/.../memory/MEMORY.md` in the same commit.

| File | Role |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | Product spec — what Straw is, what it does, what's in/out of v1 |
| [HOW_IT_WORKS.md](HOW_IT_WORKS.md) | Plain-English technical guide — pipeline, eval, submission |
| [TASKS.md](TASKS.md) | Canonical work tracker. `<!-- RESUME HERE -->` marks the next thing |
| [DECISIONS.md](DECISIONS.md) | All architectural decisions, D1–D36, with supersession notes |
| [TESTING.md](TESTING.md) | Pipeline testing instructions (note: legacy in places, see HOW_IT_WORKS for current state) |
| [lessons.md](lessons.md) | Corrections from past sessions — patterns to avoid or repeat |
| [todo.md](todo.md) | Plan-first workflow target. Per-task scratchpad |
| [AGENT_FIRST_DREAM.md](AGENT_FIRST_DREAM.md) | The north star. The filter every architecture decision passes through |
| [HANDOFF.md](HANDOFF.md) | Branch-specific in-flight context (currently `feat/collab-philosophy`) |
| [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md) | Companion to DECISIONS.md — historical |

---

## [research/](research/) — deep research, audits, distillations

Investigation, exploration, audit findings. Read on demand only — these are not session-start material. Things that became authoritative graduate to DECISIONS.md.

See [research/README.md](research/README.md) for the per-file index.

Highlights:
- **[research/agent-context-management/](research/agent-context-management/)** — three deep-research files + a synthesis (Cursor / Aider / Claude Code / Perplexity / OpenAI Deep Research / OpenClaw / SWE-agent / OpenHands), all aimed at the Tier-3 eval-agent investigator design (D30). Start with the synthesis.
- **[openclaw-agent-first-test-2026-05-06.md](research/openclaw-agent-first-test-2026-05-06.md)** — first real agent-first test (Dog v2 vs straw.wiki cold). Drives the next session's work.
- **[eval-research-deep-2026-04-25.md](research/eval-research-deep-2026-04-25.md)** — the deep Perplexity dive that invalidated three premises of D30. Read before touching the eval pipeline.
- **[straw-bear-case-and-gtm-2026-05-01.md](research/straw-bear-case-and-gtm-2026-05-01.md)** — bear case + GTM thinking, 116KB.
- **[agent-incentive-research-DISTILL.md](research/agent-incentive-research-DISTILL.md)** — distilled summary of the 53k-line autonomous-research output. Read this; the raw `agent-incentive-research-2026-04-25.md` is gitignored due to size.
- **[zeroclaw-build-research.md](research/zeroclaw-build-research.md)** — what we learned about ZeroClaw before D30 was revised.

---

## [strategy/](strategy/) — market, GTM, product vision

The "why this matters" docs. Strategic context for the work, not technical reference.

See [strategy/README.md](strategy/README.md) for the per-file index.

Headlines:
- [PRODUCT_VISION.md](strategy/PRODUCT_VISION.md) — long-form product vision (D40 banner: customer framing reset)
- [MARKET_SIZING.md](strategy/MARKET_SIZING.md), [MARKET_RESEARCH.md](strategy/MARKET_RESEARCH.md), [WHY_NOW.md](strategy/WHY_NOW.md) — TAM, market timing
- [COMPETITIVE_LANDSCAPE.md](strategy/COMPETITIVE_LANDSCAPE.md), [GTM_RESEARCH.md](strategy/GTM_RESEARCH.md) — competitors and go-to-market
- [06_GTM_CUSTOMER_EVIDENCE.md](strategy/06_GTM_CUSTOMER_EVIDENCE.md) — early customer evidence
- [agent-first-security-followups.md](strategy/agent-first-security-followups.md) — running ledger of spam/sybil/fraud tradeoffs deferred during D37/D38/D39 implementation. Companion to the umbrella proposal.

---

## [yc/](yc/) — pitch + YC application drafts

Everything related to the YC application and pitch.

See [yc/README.md](yc/README.md) for the per-file index.

Headlines:
- [YC_APPLICATION_DRAFT.md](yc/YC_APPLICATION_DRAFT.md) — current draft answers
- [yc-application-session.md](yc/yc-application-session.md), [yc-application-session-v2.md](yc/yc-application-session-v2.md) — drafting session transcripts
- [05_YC_STRATEGY.md](yc/05_YC_STRATEGY.md), [YC_RESEARCH.md](yc/YC_RESEARCH.md) — pitch strategy + research

---

## [ops/](ops/) — scaling, audits, session logs

Operational reference: scale planning, security/permission audits, agent session logs.

See [ops/README.md](ops/README.md) for the per-file index.

Headlines:
- [SCALE.md](ops/SCALE.md), [SCALE_PASS_PLAN.md](ops/SCALE_PASS_PLAN.md) — scale ceilings and how to lift them
- [SERVICE_ROLE_AUDIT.md](ops/SERVICE_ROLE_AUDIT.md) — RLS/service-role posture
- [WAKE_UP.md](ops/WAKE_UP.md) — historical session-briefing artifact (2026-04-12, see banner inside)
- [OVERNIGHT_LOG.md](ops/OVERNIGHT_LOG.md), [overnight-log.md](ops/overnight-log.md), [overnight-log-scale-pass.md](ops/overnight-log-scale-pass.md) — agent session logs

---

## [proposals/](proposals/) — design proposals awaiting user signoff

Open proposals that need a decision before implementation. Each has a `status:` in its frontmatter; close out by either implementing (move to a real branch + commit) or filing the rejection reason at the bottom of the file. Don't let proposals rot — review on a cadence.

| File | What it proposes | Status |
|---|---|---|
| [agent-first-customer-2026-05-07.md](proposals/agent-first-customer-2026-05-07.md) | Umbrella spec for D37 (autonomous identity + wallet, all three Tier-1 paths), D38 (`@strawai/cli` thin wrapper 1:1 with MCP), and D39 (bounty firehose). Authorizes the doctrine in D40. | **Locked** — implementation in progress on `feat/overnight-2026-05-07` |
| [agent-self-onboarding-2026-05-07.md](proposals/agent-self-onboarding-2026-05-07.md) | Three-tier plan to let autonomous agents discover and bootstrap onto Straw. **Tier 0 shipped.** Tier 1 expanded into D37; see the umbrella proposal above. | Superseded by `agent-first-customer-2026-05-07.md` |
| [mcp-tool-surface-collapse.md](proposals/mcp-tool-surface-collapse.md) | Collapse the 32-tool MCP surface into 4 namespaced verbs (proposed 2026-04-26). Reduces tool-catalog crowding for clients. | Open |

---

## [archive/](archive/) — superseded but kept

Empty for now. Future home for docs that are explicitly superseded but kept for context.

---

## Other top-level docs

| File | Role |
|---|---|
| [overnight-2026-05-07.md](overnight-2026-05-07.md) | Resumable plan for the 2026-05-07 overnight autonomous run. /loop reads this each iteration |
| [dashboard-revamp-direction.md](dashboard-revamp-direction.md) | Visual + structural direction for the dashboard UI/UX revamp (Stripe / 11Labs / Linear / Vercel inspiration). Implementation pending across loop iterations. |

---

## Conventions

**Adding a new doc:**
1. Pick the right folder (research/strategy/yc/ops/, or root if it's a CLAUDE.md anchor).
2. Add YAML frontmatter (`type:`, `status:`, `last_updated:`, optional `supersedes:` / `superseded_by:`).
3. Register the doc in this README and the folder's README in the same commit.

**Referencing other docs:**
- Prefer **decision IDs** (`D30`, `D32`) when referring to decisions — they don't move.
- Prefer **wikilinks** (`[[zeroclaw-build-research]]`) when referring to research files — Claude resolves via grep, doesn't depend on path.
- Use **paths** only when CLAUDE.md anchors them (the 7 files at `tasks/` root).

**Don't gitignore .md by default.** The repo is private; track strategic content. Add specific noisy patterns to `.gitignore` if needed.
