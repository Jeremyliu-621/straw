---
type: research
last_updated: 2026-05-07
sources_count: 22
---

# Deep Research Agent Architectures: Patterns to Steal for Straw Tier-3 Eval

## Executive summary

- The dominant pattern across Perplexity, OpenAI, Gemini, Anthropic, and LangChain Open Deep Research is an **orchestrator + isolated-context sub-agents** topology with explicit compress/handoff steps. Single-context loops do not survive past ~10 hops without compaction.
- **Citation grounding** is consistently a post-hoc agent (Anthropic's CitationAgent, OpenAI's citation-metadata tracking) — synthesis and attribution are decoupled, because synthesis-time hallucination is the dominant failure mode.
- For Straw's "rank 500 candidates against one rubric," map-reduce with per-candidate isolated workers and a comparator-only orchestrator is the right shape; treat each candidate read like Anthropic treats a sub-question.

## Per-system deep dive

### Perplexity Sonar Deep Research

Sonar Deep Research (released Feb 2025) is a modular three-stage pipeline: **planner -> retriever -> synthesizer**, running on a 128K context window, completing in 2-4 minutes per query. The reasoning-effort knob ("low" vs "high") gates depth; "high" routinely emits 190K+ reasoning tokens, well above the context window — implying intermediate compaction or sub-agent isolation, though Perplexity has not published the exact mechanism. They report 93.9% on SimpleQA and ~40% claimed reduction in hallucination via source grounding. The DRACO benchmark (Perplexity's own eval, 100 tasks, ~40 rubric criteria/task) is the closest public window into their grading philosophy — multi-criteria rubrics, not pairwise quality scores.

The Comet browser is a separate product but uses dual-channel transport relevant here: SSE for the model reasoning/citation stream, WebSocket for high-frequency tool RPC (page screenshots, action results). The split lets the agent loop emit citations as soon as evidence is read, instead of buffering until synthesis. Worth stealing if Straw's eval agent ever needs to stream partial rankings to the UI.

### OpenAI Deep Research (o3-deep-research)

Pure ReAct ("Plan-Act-Observe") on top of an o3 variant trained end-to-end with RL on long browsing trajectories. Four tools: web search, web browser (page fetch + in-page search), code interpreter, file parser (PDF/image). Loop runs 5-30 minutes wall-clock with **dual stop logic**: coverage-based early stops (heuristic of "2+ independent sources per sub-question," novelty exhaustion, confidence threshold) plus budget hard caps (~30-60 searches, 120-150 fetches, 150-200 reasoning iterations). The numbers are from a PromptLayer reverse-engineering writeup, not OpenAI primary, so treat as directional.

Critical detail: OpenAI claims the o3-deep-research model was specifically RL-trained for "sustained focus across long trajectories" — i.e., they treat context-window survival as a model-training problem, not just a scaffolding problem. Citation binding is metadata-tracked from the moment text is extracted: every excerpt carries source URL + offset, which is what makes the inline-clickable citations possible. They recommend "background mode" for any production use because timeouts on the 30-min runs are the dominant operational failure.

### Gemini Deep Research (Max, Gemini 3.1 Pro)

Two architectural details Google has published that nobody else matches: **collaborative planning** (the user reviews/edits the research plan before execution starts — cuts wasted compute on misaligned scope) and a **novel asynchronous task manager** with shared state between planner and worker models. The shared-state design enables graceful error recovery without full restart — when a sub-task fails, the planner sees the failure in shared state and re-plans only the affected branch. Tool surface is broad: Google Search + URL Context + Code Execution + File Search + arbitrary MCP servers, all simultaneously available. Live thought summaries stream during execution. Citation methodology and context-handling specifics are not public. Deep Research Max was the top performer on the ResearchRubrics ICLR 2026 benchmark.

### Anthropic multi-agent research (the most public)

Most concrete published architecture. Lead agent (Claude Opus 4) decomposes the query, persists its plan to memory (because context >200K tokens gets truncated), and spawns 3-5 Sonnet 4 sub-agents in parallel. Each sub-agent gets an objective, output format spec, tool/source guidance, and explicit task boundaries. Sub-agents call 3+ tools in parallel. A separate **CitationAgent** runs post-research, scanning the synthesis against source documents to attach citations to specific claims — citation is decoupled from generation deliberately.

Effort scaling is published as a table:
- Simple fact-finding: 1 agent, 3-10 tool calls
- Direct comparisons: 2-4 sub-agents, 10-15 calls each
- Complex research: 10+ sub-agents with divided responsibilities

Cost: **15x more tokens than chat**, and unoptimized multi-agent runs hit ~8.5x the tokens of a single agent (850K vs 100K). Outperformed single-agent Opus 4 by 90.2% on internal eval. Token usage explained 80% of variance — i.e., the architecture wins because you can spend more tokens, not because the orchestration is magic.

### You.com (Smart, Genius, Research, ARI)

Less technically published. ARI (their enterprise research mode) reportedly outperforms OpenAI Deep Search 76% of the time on internal evals. Public architecture details: model-agnostic (GPT-4/Claude/Gemini), four modes graded by depth (Smart -> Genius -> Research -> Compute), Compute mode bundles code execution, image gen, multi-search, and visualization in one agent. They sell "custom agents" as composable workflows. No public detail on context management, citation, or stop conditions. Skip as a copy-target — too opaque.

### Phind (code-focused)

Phind's relevance to Straw is high because Straw's submissions are code. Architecture is shallow-published: live web crawl per query, semantic codebase understanding, multi-step search with "agent mode" for technical research. Citation is per-code-snippet, linked back to authoritative dev resources. The general coding-agent pattern from the broader literature applies: observe environment -> reason -> tool call -> feedback -> repeat, with the bottleneck being the **initial observation phase** of gathering relevant code context. For Straw this maps directly: the bottleneck of grading 500 code submissions is not the grading, it's loading the right code into the comparator's context.

### Exa.ai

Not an agent — a search primitive. Embedding-first semantic search, custom Rust vector DB, Matryoshka embeddings, <350ms p50 latency. Their "agent search" endpoint loops Exa search calls until quality threshold met. Relevant to Straw as the **retrieval layer** under any eval agent: when the Tier-3 agent needs to find similar prior submissions, similar bug patterns, or relevant rubric exemplars, Exa-style semantic search beats lexical.

### Open-source: gpt-researcher, LangChain Open Deep Research, DeepResearchAgent

**gpt-researcher** — planner -> concurrent executors -> publisher. Optional multi-agent mode (chief editor, researcher, reviewer, writer, publisher) on LangGraph. ~20 sources/task floor. Clean reference implementation; production-grade Next.js frontend ships with it.

**LangChain Open Deep Research** is the most copyable. Three phases: **Scope** (clarification + brief generation, two-step pipeline), **Research** (supervisor + dynamically-spawned sub-agent subgraphs), **Report Writing** (one-shot generation from compressed sub-agent outputs). The supervisor exposes only three tools to its LLM: `think_tool`, `conduct_research`, `research_complete`. Sub-agents have three nodes: `researcher`, `research_tools`, `compress_research`. Critically: search tool **summarizes results before they enter the sub-agent's message history** — this is the load-bearing context-isolation move. Sub-agents return a "Research completed" stub plus the compressed payload, never the raw tool outputs, to the supervisor. This is the cleanest public implementation of the pattern.

**SkyworkAI DeepResearchAgent** — hierarchical multi-agent with top-level planning + specialized lower-level workers. Generalizes beyond research to arbitrary task decomposition.

## Cross-cutting patterns

**Pattern 1: Map-reduce with isolated contexts is the only architecture that survives.** Every system above either explicitly uses sub-agents (Anthropic, LangChain ODR, gpt-researcher) or behaves like one internally (Perplexity's 190K reasoning tokens on a 128K window). Single-context loops fail past ~10 hops. The cost is real: 8-15x token overhead and a lossy summary handoff. Worth it.

**Pattern 2: Compress at the tool-output boundary, not at the context-limit.** LangChain's `compress_research` and Anthropic's per-sub-agent summarization both run on every tool result, not lazily when context fills. Factory.ai's "anchored iterative summarization" (merge new summary into persistent state, never regenerate from scratch) is the highest-fidelity variant. Deep Agents SDK offloads any tool result >20K tokens to filesystem and replaces with path + 10-line preview.

**Pattern 3: Citation is a post-hoc agent, not a generation constraint.** Anthropic's CitationAgent and OpenAI's metadata-tracked excerpts both decouple "what was read" from "what was written." This kills the dominant synthesis hallucination — confabulating connective claims between real evidence fragments. ResearchRubrics finds even top systems below 68% rubric compliance, with multi-document synthesis as the weakest dimension.

**Pattern 4: Stop conditions are dual — coverage AND budget.** OpenAI's "2+ independent sources per sub-question" (coverage) plus 150-200 iteration cap (budget). Anthropic's effort-scaling table is implicit budget. Without budget caps, agents loop forever on hard questions.

**Pattern 5: Plan persistence beats plan re-derivation.** Anthropic writes the plan to memory because they know context will truncate. Gemini's shared-state task manager makes the plan a first-class artifact that survives sub-task failure. OpenAI/Perplexity hide this; LangChain ODR makes it explicit via the brief.

**Pattern 6: Reasoning effort is a tunable parameter, not a fixed setting.** Perplexity exposes "low/high"; OpenAI exposes background-mode budget; Anthropic varies sub-agent count. The right knob for Straw is "how many comparator sub-agents per shortlist" — small for cheap rounds, large for finals.

**Disagreement to note:** OpenAI claims model-side RL training for "long-trajectory focus" reduces the need for scaffolding; Anthropic and LangChain bet on scaffolding instead. Both work. The hybrid (well-trained model + clean orchestration) beats either alone.

## What this means for Straw's Tier-3 eval agent (ranking 500 submissions)

Straw's Tier-3 problem is **not** the same as deep research. Deep research = "find N relevant sources, synthesize one answer." Straw Tier-3 = "given one fixed rubric, rank N candidates, justify each." The shape is map-reduce with a fixed reducer — closer to a tournament than a research agent. But the primitives transfer:

**Architecture: borrow LangChain ODR, invert the problem.**
- Replace "supervisor spawns sub-agent per sub-topic" with "supervisor spawns sub-agent per **candidate batch**" (e.g., 50 candidates per worker -> 10 workers for 500 submissions).
- Each candidate-batch sub-agent gets isolated context: rubric (cached) + the batch's submission code + execution traces from Tier-1/2. Sub-agent returns a structured `[{candidate_id, score, justification, citations_to_code_lines}, ...]`.
- The orchestrator never sees raw submission code. It sees only the per-batch structured output. This is the Anthropic/LangChain compression boundary applied to ranking.

**Citation = code-line offsets, not URLs.** Steal Anthropic's CitationAgent pattern: after the sub-agent emits a justification, run a separate pass that pins each justification clause to specific lines in the submission. This is the hallucination-killer for "agent X is better than Y because it handles edge case Z" — verify Z actually appears in the code.

**Comparator phase is separate from grader phase.** Tier-3 should be two passes:
1. **Score pass**: parallel sub-agents grade against rubric, isolated context, structured output.
2. **Rank pass**: orchestrator-only, takes the structured outputs, runs pairwise/Bradley-Terry on the boundary cases (top-20, contested ties). This pass is cheap because it sees only summaries.

**Stop conditions: dual budget, but the relevant budget is per-candidate.** Cap each candidate's grading at, say, 8K reasoning tokens + 5 tool calls (rubric lookup, code search, execution-trace fetch). Coverage stop: "rubric criteria covered" rather than "sources found." If a sub-agent burns its budget without covering all criteria, mark the candidate `needs_human_review` and move on — don't let one weird submission black-hole the run.

**Caching: this is your biggest lever.** Three caches:
1. **Rubric prompt cache** (Anthropic prompt caching, 5-min TTL refreshed) — cuts ~80% of input tokens since rubric is identical across 500 candidates.
2. **Tier-1/2 execution-trace cache** — already produced upstream, just needs to be K/V'd by submission_id.
3. **Pairwise comparison cache** — once you've computed "A beats B," you don't recompute it. Store at orchestrator level.

**Bounty-board cost shape check.** With prompt caching on the rubric and ~5K eval tokens per candidate average, 500 submissions on Sonnet-class is roughly $5-15 per bounty grading, well inside the $30-100/mo at 5K evals/month projection in `eval-research-deep-2026-04-25.md`. Budget hard cap per bounty (e.g., $20) and degrade to Tier-2-only if exceeded.

**Don't copy what doesn't fit:**
- Skip OpenAI's 30-minute walltime. Straw needs minutes-not-hours latency for the daemon-first feel.
- Skip Gemini's collaborative planning UX. The rubric IS the plan; companies edit the rubric, not a research plan.
- Skip Perplexity's "novelty exhaustion" stop. You're not exploring, you're grading a fixed list.

**Concrete next step.** Stand up the orchestrator-with-isolated-batch-workers shape using LangChain Open Deep Research as the skeleton, swap "search" for "load submission + execute Tier-1/2 traces," swap "synthesis" for "structured-output ranking." Validate on 50 mock submissions before scaling to 500. The eval-worker that's built-but-not-deployed (per project_state_snapshot_2026_04_25) is the right place to host this; it's already isolated from the Vercel runtime.

## Sources

- [Sonar Deep Research - Perplexity docs](https://docs.perplexity.ai/getting-started/models/models/sonar-deep-research)
- [DRACO Benchmark - Perplexity Research](https://research.perplexity.ai/articles/evaluating-deep-research-performance-in-the-wild-with-the-draco-benchmark)
- [Introducing deep research - OpenAI](https://openai.com/index/introducing-deep-research/)
- [How OpenAI's Deep Research Works - PromptLayer](https://blog.promptlayer.com/how-deep-research-works/)
- [o3-deep-research model docs - OpenAI](https://developers.openai.com/api/docs/models/o3-deep-research)
- [Deep Research Max - Google blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/)
- [Gemini Deep Research Agent docs](https://ai.google.dev/gemini-api/docs/deep-research)
- [How we built our multi-agent research system - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Open Deep Research - LangChain blog](https://blog.langchain.com/open-deep-research/)
- [Open Deep Research Internals - Bolshchikov](https://www.bolshchikov.com/p/open-deep-research-internals-a-step)
- [gpt-researcher - GitHub](https://github.com/assafelovic/gpt-researcher)
- [DeepResearchAgent - SkyworkAI](https://github.com/SkyworkAI/DeepResearchAgent)
- [Context Management for Deep Agents - LangChain](https://www.blog.langchain.com/context-management-for-deepagents/)
- [Evaluating Context Compression - Factory.ai](https://factory.ai/news/evaluating-compression)
- [ResearchRubrics ICLR 2026](https://arxiv.org/abs/2511.07685)
- [DeepResearch Bench](https://deepresearch-bench.github.io/)
- [Why Your Deep Research Agent Fails - arxiv 2601.22984](https://arxiv.org/html/2601.22984v1)
- [Comet Browser technical deep dive - dev.to](https://dev.to/samwil007/how-perplexity-ais-comet-browser-actually-works-a-technical-deep-dive-on-the-future-of-the-57cp)
- [Phind agent docs - Requesty](https://www.requesty.ai/blog/phind-agent-gpt-5-via-requesty-instant-ai-code-search-generation)
- [Exa 2.0 introduction](https://exa.ai/blog/exa-api-2-0)
- [You.com AI Modes - Medium](https://medium.com/@you.com/introducing-ai-modes-elevating-how-you-use-ai-on-you-com-4113732fd3bd)
- [ReSum: Long-Horizon Search via Context Summarization - OpenReview](https://openreview.net/forum?id=PjIK38mwKm)
