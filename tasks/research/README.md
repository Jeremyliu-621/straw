---
type: index
purpose: Index for tasks/research/. Deep research, audits, distillations. Not session-start material.
last_updated: 2026-05-04
---

# tasks/research/

Investigation, exploration, audit findings. Read on demand — when the work touches the topic. **Findings that become authoritative graduate to [[DECISIONS]] (file: `tasks/DECISIONS.md`)**; this folder is the working scratchpad and historical record.

The single highest-leverage file in here is **[eval-research-deep-2026-04-25.md](eval-research-deep-2026-04-25.md)** — read it before proposing or building anything in the eval pipeline.

---

## Eval architecture research

| File | What's in it | Status |
|---|---|---|
| [eval-research-deep-2026-04-25.md](eval-research-deep-2026-04-25.md) | Perplexity deep research that invalidated three premises of D30 (Codex ToS, single-judge shape, deterministic-execution-as-primary-signal). Recommends a tiered funnel: deterministic → cheap-LLM gatekeeper → tool-using agent on flagged 15%. | **Load-bearing.** D30 is in flux pending reconciliation with this file. |
| [zeroclaw-build-research.md](zeroclaw-build-research.md) | What we learned about ZeroClaw before D30 was revised. Architecture of ZeroClaw's HTTP Gateway, multi-agent routing, plugin system. | Partial — superseded by the deeper finding that single-judge architecture is wrong shape. |
| [eval-worker-hardening.md](eval-worker-hardening.md) | Notes on hardening the existing single-Gemini eval worker (the fallback path per D30). | Active reference. |

## Agent incentive research

| File | What's in it | Status |
|---|---|---|
| [agent-incentive-research-DISTILL.md](agent-incentive-research-DISTILL.md) | **Distillation** of the 53,528-line raw research file (gitignored). Read this; only reach for the raw if you need a specific tick. | **Canonical reading version.** |
| `agent-incentive-research-2026-04-25.md` | Raw cron-output, ~4.4MB, 53k lines, 30 sessions, 326 ticks. Gitignored due to size. Lives on disk only. | Source. Do not commit. |
| [agent-incentive-key-facts.md](agent-incentive-key-facts.md) | Distilled key facts pulled from the research. | Reference. |
| [agent-incentive-comparable-systems.md](agent-incentive-comparable-systems.md) | Comparable platforms (Kite AI, USDC OpenClaw hackathon, etc.). | Reference. |
| [agent-incentive-mechanics.md](agent-incentive-mechanics.md) | Mechanism design — VCG, Shapley, reputation. | Reference. |
| [agent-incentive-swarm-dynamics.md](agent-incentive-swarm-dynamics.md) | OASIS/CAMEL-AI simulation thinking; 300-agent swarm de-risk. | Reference. |
| [agent-incentive-target-audience.md](agent-incentive-target-audience.md) | Who the agents actually are. | Reference. |
| [phase2-key-facts.md](phase2-key-facts.md) | Phase-2 research key facts. | Reference. |

## Bear case + go-to-market

| File | What's in it | Status |
|---|---|---|
| [straw-bear-case-and-gtm-2026-05-01.md](straw-bear-case-and-gtm-2026-05-01.md) | The honest bear case + GTM thinking, 116KB. Phase-2 research output, May 2026. | Active reference. |

## Audits + retrospectives

| File | What's in it | Status |
|---|---|---|
| [openclaw-agent-first-test-2026-05-06.md](openclaw-agent-first-test-2026-05-06.md) | First time a daemon (Dog v2) competed via `/api/docs` cold against prod. Three structured findings + two new bugs surfaced (Gemini reliability, status desync). | **Active reference** — drives the next session's work. |
| [schema-audit.md](schema-audit.md) | Database schema audit — RLS, constraints, indexes. | Reference. |
| [phase18-results.md](phase18-results.md) | What happened in Phase 18 ("Prove It Works"). | Historical. |
| [COUNCIL_TRANSCRIPT.md](COUNCIL_TRANSCRIPT.md) | Architecture council transcript — what was discussed when major decisions were made. | Historical. |
| [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) | Open questions that were deferred. Most have been answered by subsequent decisions; check before assuming an entry is still open. | Stale (2026-04-12). |

## Origin/context

| File | What's in it | Status |
|---|---|---|
| [01_PROBLEM_SPACE.md](01_PROBLEM_SPACE.md) | Original problem-space framing (early days). | Historical. |
| [07_HONEST_CRITIQUE.md](07_HONEST_CRITIQUE.md) | Self-critique of the v1 product. | Reference. |
| [08_KILLER_STATS.md](08_KILLER_STATS.md) | Stats worth citing in the pitch. | Reference. |
| [09_PRICING_STRATEGY.md](09_PRICING_STRATEGY.md) | Early pricing thinking. | Historical — see strategy/ for current. |
| [10_PERPLEXITY_DEEP_RESEARCH.md](10_PERPLEXITY_DEEP_RESEARCH.md) | Earlier Perplexity research session. | Historical. |
| [naming.md](naming.md) | "Straw" as the brand name — rationale. | Reference. |

---

## Conventions

When adding a new research file:
1. Add YAML frontmatter at the top: `type: research`, `status: active|historical|superseded`, `last_updated:`.
2. Register the file in this README under the right section.
3. If your finding contradicts an existing decision in DECISIONS.md, mark it clearly (`⚠️ Contradicts D##`) so future sessions know to reconcile.
4. If the file is too big for git (>1MB), gitignore the raw and write a `*-DISTILL.md` companion.
