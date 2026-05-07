---
type: index
last_updated: 2026-05-07
authored_during: overnight-autonomous-run
---

# Agent context management — research index

Research collected to inform the design of Straw's Tier-3 eval-agent investigator (D30 4-tier funnel). The brief was: how do production-grade tools handle long-running, code-aware, context-disciplined agent loops? What's transferable to ranking 500 submissions on a real codebase without context drift?

## Files in this directory

| File | What it covers | Length | Sources |
|---|---|---|---|
| [`codebase-llm-wrappers.md`](./codebase-llm-wrappers.md) | Cursor, Cline, Aider, Claude Code, Codex CLI, Continue, OpenHands. Indexing strategies, compaction primitives, tool-catalog patterns, persistent memory. | ~3.1K words | 34 |
| [`perplexity-deep-research.md`](./perplexity-deep-research.md) | Perplexity Pro / Sonar, OpenAI Deep Research, Gemini Deep Research, Anthropic's multi-agent research system, LangChain Open Deep Research. Iteration loops, citation grounding, orchestrator-vs-single-context. | ~3.0K words | 22 |
| [`openclaw-and-autonomous-runs.md`](./openclaw-and-autonomous-runs.md) | OpenClaw + ZeroClaw (Straw's reference auditor daemon — turns out OpenClaw is a real public project, not internal), SWE-agent, OpenHands, Devin, AutoGPT/BabyAGI. Failure modes for hours-long autonomous runs. | ~3.4K words | (mixed, 25+) |
| [`synthesis-for-straw-eval-agents.md`](./synthesis-for-straw-eval-agents.md) | The Straw-specific architecture brief. Ties findings into a concrete Tier-3 investigator design. **Read this first if you only have time for one.** | (this dir's primary deliverable) | references the three above |

## TL;DR for the impatient

Tier-3 design: **orchestrator + N short-lived investigators in batches of 50, isolated per-submission context, SWE-agent-shaped tools (≤6), Aider-style deterministic repo maps (no embeddings), Anthropic context-management API verbatim (`clear_tool_uses` + `compact` + `memory`), CitationAgent pattern adapted for code-line offsets, two-pass scoring (parallel score + sequential rank-on-contested-boundaries).** ~$10–$20 marginal LLM cost per 500-submission task with prompt caching on. Implementation: ~18 engineer-days, parallelizable.

## Key cross-cutting findings

1. **Single-context loops fail past ~10 hops.** Map-reduce with isolated-context children is the only shape that scales. Confirmed across all three reports.
2. **Compaction is no longer harness work.** Anthropic exposes `clear_tool_uses_20250919`, `compact_20260112`, `memory_20250818` as first-class API features. Use those, don't build bespoke.
3. **Tool catalog ≤6 per agent.** Above this, model performance degrades quickly. Namespacing helps; semantic consolidation helps more.
4. **Indexing is a deployment-style decision, not a default.** Embedding indexes (Cursor) win for stable corpora reused many times. Deterministic repo maps (Aider) win for fresh-each-time corpora. Tier-3 wants Aider's shape.
5. **Citation grounding decoupled from synthesis** is the canonical anti-hallucination pattern. CitationAgent / CitationVerifier runs *after* the agent generates, validating each claim against actual source.
6. **OpenClaw is the wrong template for Tier-3.** It's a personal-assistant runtime, not a long-trajectory orchestration system. Steal patterns from Claude Code subagents + OpenHands condenser instead.
7. **Retrieval poisoning is the unsolved adversarial vector.** None of the seven coding-tool reports defend against an adversary engineering code to be most-retrieved by a judge. Add to Tier-4 work.

## How to use this directory

If you're an engineer about to implement Tier-3:
- Read `synthesis-for-straw-eval-agents.md` end-to-end. Get the architecture in your head.
- Skim `codebase-llm-wrappers.md` for compaction-API specifics.
- Cherry-pick from `perplexity-deep-research.md` for the citation-pinning pattern.
- Reference `openclaw-and-autonomous-runs.md` if you need to defend why we're NOT doing X (where X is e.g., recursion, single-agent long trajectories, OpenClaw heartbeat shape).

If you're a future Claude in another session:
- The sister directory `tasks/research/` contains older eval research (`eval-research-deep-2026-04-25.md`, the agent-incentive distillation).
- The synthesis here supersedes the architectural recommendations in those older files for Tier-3 specifically.
- D30's canonical spec (`tasks/research/eval-architecture-tiered-funnel.md`) is the contract; this directory is the implementation justification.

## What's NOT covered (gaps for next research pass)

- **RL fine-tuning for the investigator model.** Both Cursor (Composer-1) and OpenAI (RFT for Codex) report meaningful gains from RL-tuning a model against the specific tool interface. Out of scope for v1; track for v2.
- **Cross-task memory.** Investigators in v1 are isolated per submission. A future version could let investigators query "have I seen a submission like this before?" via embedding-on-verdicts. Big architectural change; track.
- **Adversarial Tier-4 implementation details.** §7 of the synthesis names three deterministic checks (surface-vs-content divergence, rubric-keyword density, prompt-injection scan) but doesn't spec them. Each is its own ~2-day implementation task.
- **Streaming verdicts to the orchestrator.** The synthesis chose pre-computed for v1. The streaming variant is more reactive; revisit.
