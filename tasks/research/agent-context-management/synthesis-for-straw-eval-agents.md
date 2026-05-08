---
type: research-synthesis
last_updated: 2026-05-07
authored_during: overnight-autonomous-run
sources:
  - "[[codebase-llm-wrappers]]"
  - "[[perplexity-deep-research]]"
  - "[[openclaw-and-autonomous-runs]]"
related_decisions:
  - D30 (eval architecture — tiered funnel)
  - D32 (LLM judge model)
  - D33 (sandbox / execution model)
related_files:
  - src/workers/evaluation-worker.ts
  - tasks/research/eval-research-deep-2026-04-25.md
  - tasks/research/eval-architecture-tiered-funnel.md (canonical D30 spec)
---

# Synthesis — what Straw's Tier-3 eval agent should adopt

This is the Straw-specific architecture brief. It ties findings from three sister research files into concrete, implementable recommendations for the **Tier-3 agent investigator** in D30's 4-tier eval funnel:

```
deterministic execution  →  cheap-LLM gatekeeper  →  AGENT INVESTIGATOR  →  adversarial guardrails
       (Tier 1)                  (Tier 2)              (Tier 3 — this doc)         (Tier 4)
```

Tier-3's job: investigate flagged submissions on real codebases (potentially 100K+ LOC each), score them against the rubric, and rank up to 500 of them on the same task. Hours-long autonomous runs. High stakes — the rankings determine real money via deals (D22).

Headline: **the design is map-reduce with isolated-context investigators, an Anthropic-context-management-API-managed orchestrator, SWE-agent-shaped tools per investigator, and CitationAgent-pinned-to-code-line-offsets verdict structure.** None of it is novel — every load-bearing piece has been deployed and instrumented in public systems. Steal it.

## 1. Architecture: orchestrator + N short-lived investigators

This is the **single most-replicated finding** across all three research reports:

- **Anthropic's internal multi-agent research system** (Perplexity research): lead Opus + 3–5 parallel Sonnet sub-agents, plan persisted to memory, sub-agents return distilled summaries. Cannot recurse.
- **LangChain Open Deep Research** (Perplexity research): supervisor with three tools (`think`, `conduct_research`, `research_complete`); sub-agents summarize tool results before they enter their own message history.
- **Claude Code Subagents** (Cursor research): separate context window via `Task` tool, return only 1–2K-token summary, cannot spawn further subagents.
- **OpenHands Condenser pattern** (OpenClaw research): event log past threshold → summary entries; stays linear, not quadratic, in cost as the run grows.
- **Cognition's "Don't build multi-agents" warning** (OpenClaw research): single-trajectory beats multi-agent-without-discipline.

Apply directly to Straw:

```
                     ┌─────────────────┐
                     │  ORCHESTRATOR   │  Anthropic context-management API:
                     │   (Sonnet 4.6)  │  - clear_tool_uses_20250919
                     │                 │  - compact_20260112
                     │                 │  - memory_20250818 (/memories)
                     └─────────────────┘
                              │ spawns N=10–50 in parallel batches
                              │ each receives:
                              │   { rubric, task_spec, submission_dir, budget_tokens }
                              ▼
              ┌─────────────────────────────────────┐
              │  INVESTIGATOR #1 ... INVESTIGATOR #N │  (Haiku 4.5 — Tier-2 cost,
              │                                     │   Sonnet 4.6 — for flagged-only
              │  fresh context per submission       │   per Tier-3-of-funnel design)
              │  no shared memory across siblings   │
              │  returns ≤2K tokens of structured   │
              │  verdict to orchestrator            │
              └─────────────────────────────────────┘
                              │ structured verdict only
                              ▼
                     ┌─────────────────┐
                     │   ORCHESTRATOR  │  Aggregates verdicts.
                     │   (rank pass)   │  Re-investigates only contested boundaries.
                     │                 │
                     └─────────────────┘
```

**Concretely for Tier-3:**

- One orchestrator process per task per eval cycle.
- Orchestrator iterates investigators in batches of 50, in parallel up to provider concurrency (Anthropic dev tier: 5 parallel Sonnet calls / second).
- Each investigator gets a **fresh, isolated context** containing only: the rubric, the task spec, a pointer to the submission's workspace directory, and a token budget. No shared memory across sibling investigators in v1 — that's the "don't build multi-agents" lesson from Cognition.
- Each investigator returns a structured verdict: `{ submission_id, dimension_scores: [{criterion, score, justification, code_citations}], confidence, escalation_needed }`. Capped at 2K tokens.
- Orchestrator ingests verdicts, never raw investigator state.
- Two passes:
  1. **Score pass** (parallel) — every investigator runs once.
  2. **Rank pass** (sequential, orchestrator only) — examines verdicts, identifies contested boundaries (e.g., two submissions within 2 points on a 100-pt rubric), and either accepts the score-pass ranking or fires targeted re-investigations on the contested pairs only.

**Why no recursion:** every public system that allows multi-agent recursion (AutoGPT, BabyAGI, naive AutoGen) has documented goal-drift / infinite-loop failures. Anthropic's Subagents explicitly disallow recursion for this reason. Adopt that constraint.

## 2. Per-investigator tooling: SWE-agent ACI, ≤6 tools

The OpenClaw research file is unambiguous: **SWE-agent's ACI principles** (Princeton, NeurIPS 2024) — `find_file`, `search_dir`, `search_file`, `edit_window`, structured `submit` — produce dramatically better code-investigation behavior than raw shell access. The Cursor research backs this with a tool-catalog observation: above ~10 tools, model performance degrades quickly; namespacing helps but doesn't solve.

**Tier-3 investigator tool catalog** (≤6 tools, in priority):

1. **`read_file(path, line_range?)`** — read part or all of a file in the submission workspace. Returns text + line numbers.
2. **`search_dir(query, glob?)`** — ripgrep with optional glob filter. Returns top N matches with line numbers and context snippets. (Aider's `grep_ast.TreeContext` is the right rendering — signature lines + surrounding scope, not raw `rg` output.)
3. **`run_lint(path?)`** — run the language's linter and return errors. Lift from Aider's lint-and-fix loop. Critical: this is *deterministic* feedback the model can ground on.
4. **`run_tests(path?)`** — if the submission has a test suite, run it. Sandbox-isolated; capped at 60s per call. (Optional, only if `eval_mode != container` since the container path runs tests itself.)
5. **`record_finding(criterion, score, justification, citations: [{file, line, snippet}])`** — structured verdict accumulator. The investigator MUST call this once per rubric criterion before submitting. Not a free-form note pad — typed.
6. **`submit_verdict(confidence, escalation_needed: bool)`** — ends the investigator's run. Compiles `record_finding` calls into the structured verdict. If `escalation_needed=true`, the investigator can punt to the orchestrator on contested cases.

**Notably absent:**
- No `web_search` (the rubric is the ground truth — exterior knowledge is contamination)
- No `bash` (one-shot tools beat shell for safety + auditability — Codex CLI's lesson)
- No `apply_patch` (we don't edit the submission, we judge it)
- No sub-investigator spawning (no recursion)

Tool count: 6, namespaced under `straw_eval_*`. Within the empirically-observed sweet spot.

## 3. Memory: per-submission scratchpad markdown, no cross-investigator sharing in v1

Cline's `FileContextTracker` and Anthropic's `claude-progress.txt` pattern (Cursor research) both prove the same thing: **agents that write down what they've found early in a run perform better at the end.** The mechanism is identity-of-citation rather than memory recall — by the time the model is at turn 50, it's referencing what it wrote at turn 5, not re-deriving it.

For Tier-3 investigators:

- Each investigator gets a **per-submission scratchpad markdown file** at `/scratch/<submission_id>.md`. Wired up via the `memory_20250818` tool.
- Pre-populated with: rubric criteria (one section each), the task spec, and an empty "Observations" section.
- Investigator is instructed (in its system prompt) to update the relevant criterion section as it investigates, BEFORE calling `record_finding`. The system prompt makes this a hard requirement.
- This enables **mid-run reasoning recovery**: if the investigator's context is compacted (per Anthropic's `compact_20260112`, which fires at 150K tokens), the scratchpad survives and the post-compaction prompt re-injects it.

**Important:** investigators do NOT see each other's scratchpads. That's "shared memory across investigators" which is exactly what Cognition warns against. Each is self-contained; the orchestrator is the only entity that aggregates.

The orchestrator gets its own scratchpad — `/scratch/orchestrator-<task_id>.md` — that accumulates "things I've decided about this batch" (e.g., "Submission X claims Y but I haven't verified it"). This persists across compactions and is the memory of record for the rank pass.

## 4. Indexing: per-submission Aider-style PageRank, NOT embedding indexes

The Cursor research is precise on this trade-off: **embedding indexes are right when the corpus is stable and re-used; deterministic repo maps are right when each corpus is investigated once and discarded.**

Tier-3 submissions are the latter. We're not building a long-lived embedding index of every submission ever — each submission is investigated zero or more times in its task's lifetime, then frozen.

**Adopt Aider's recipe** (Cursor research Section "Aider"):

- On investigator start: tree-sitter parse all files, build identifier-reference graph, run PageRank with chat-bias on rubric criteria names + task spec terms, render top-K nodes via `grep_ast.TreeContext` (signature + surrounding scope) into a 1–2K-token "repo map" that goes into the system prompt.
- Investigator uses this map as orientation, then calls `read_file` / `search_dir` for depth.

**No embeddings, no Turbopuffer, no Merkle tree.** Tree-sitter + NetworkX PageRank on a graph of even 10K nodes is sub-second. Cursor's pipeline is over-engineered for our use case (their value is hot-keystroke editor latency; our agents have seconds to spare per investigator).

## 5. Compaction: adopt Anthropic's API verbatim

The Cursor research recommends adopting Anthropic's context-management API as-is, not building bespoke compaction. The relevant primitives:

- **`clear_tool_uses_20250919`** — replaces old `tool_result` blocks with `[cleared to save context]` after threshold. Default trigger: 100K input tokens; keep last 3 tool uses; clear at least 10K. **Use as-is for investigators.**
- **`compact_20260112`** — at 150K input tokens (min 50K), pass entire trace to summarizer with a custom `instructions` prompt; emit `compaction` block; everything before drops on next request. **Use for the orchestrator, with custom instructions naming the rubric criteria as load-bearing context.**
- **`memory_20250818`** — sandboxed `/memories` filesystem with `view/create/str_replace/insert/delete/rename`. **Use for investigator scratchpads (per §3).**

Per Anthropic's published cookbook benchmarks, the three layers stack: baseline 335K-token peak (failure), all-three at ~170K with persistence. We're in the boring deployment lane on this — these are first-class API features, not bespoke code.

## 6. Citation pinning: code-line offsets, post-hoc

The Perplexity research surfaces Anthropic's **CitationAgent pattern**: synthesis is where hallucination lives, so decouple citation generation from synthesis. CitationAgent runs *after* the lead agent produces its narrative, scanning the narrative against the actual sources and attaching `<cite index="0-2">...</cite>` references.

Adapt this for code:

- Investigator's `record_finding` MUST include `code_citations: [{file: "src/foo.py", lines: "42-58", snippet: "..."}]` for every claim it makes about the submission. The system prompt enforces this.
- Before `submit_verdict` finalizes, a **CitationVerifier** sub-step (cheap, deterministic — not LLM-based) checks every citation: does that file exist? Does that line range exist? Does the snippet actually match what's at those lines (allowing for whitespace tolerance)?
- Citations that fail verification get redacted from the verdict and a flag is set: `{ unverified_citations: N, original_score, adjusted_score: original_score * (1 - 0.1*N) }`. Heavy hand on purpose — investigators that fabricate citations should not be trusted.

The eval engineering prompt I'd give Anthropic's research team (if I had it): use a small fine-tuned model for CitationVerifier that's specifically trained on "does this snippet match this file at these lines, modulo whitespace/comments." Not yet public but the heuristic deterministic version is sufficient for v1.

## 7. Adversarial guardrails (Tier 4 of D30): retrieval poisoning is unsolved

The Cursor research surfaces an adversarial vector none of the seven reviewed tools defend against: **retrieval poisoning**, where an adversary engineers code such that it's the most-retrieved chunk for any natural-language query. (E.g., stuff every file with rubric-keyword-dense docstrings that don't reflect what the code does.)

Tier-3 investigators using Aider-style PageRank are vulnerable to a similar attack: an adversary could engineer identifier names to maximize their PageRank under the investigator's bias terms.

**Add to Tier-4 (adversarial guardrails):**

- **Surface-vs-content divergence detector.** A small classifier that compares "what the code says" (function signatures, comments, identifier names) against "what the code does" (control-flow, data-flow). Submissions where the gap exceeds a threshold get flagged for human review.
- **Rubric-keyword density check.** If a submission's identifier names contain rubric criteria keywords at >2× the rate of the language's typical corpus, flag.
- **Eval-prompt-injection scanner.** Scan all text in the submission (comments, strings, docstrings) for known prompt-injection signatures ("Ignore previous instructions," "system:", etc.).

These are all cheap, deterministic, and can run in Tier-1. They don't replace Tier-4's adversarial agents (which the agent-incentive research recommends running periodically as red team) but they're the floor.

## 8. Cost model — back-of-envelope for 500 submissions

From the Perplexity research synthesis (with my Tier-3-specific adjustments):

| Pass | Calls | Tokens in / out / call | Cost (Sonnet 4.6 @ $3/$15 per MTok) |
|---|---|---|---|
| Score pass (Tier-2 first; only Tier-2-flagged go to Tier-3) | ~75 of 500 reach Tier-3 | 30K in / 4K out (incl. compacted scratchpad replay) | $0.13 per investigator → $9.75 total |
| Rank pass (orchestrator) | 1 | 50K in / 8K out | $0.27 |
| CitationVerifier (deterministic) | 75 × ~3 citations | n/a (heuristic) | $0 |
| Compaction overhead | Variable | Anthropic's published <½× baseline | bundled |

**Estimated cost per task at 500 submissions: ~$10–$20 marginal Tier-3 LLM spend.** The bulk of the eval pipeline cost is still Tier-2 (gatekeeper, ~$1/task at 500 submissions), so Tier-3 doesn't change the cost shape materially — it's an unlock-quality-not-cut-cost intervention.

This holds *if* prompt caching is on. The rubric, task spec, and per-language tooling instructions should all live in the cached system prompt. Anthropic's prompt caching at 90% savings on cache hits means the rubric-on-every-investigator overhead is essentially free. Cursor research notes this as the biggest single cost lever.

## 9. What we explicitly are NOT doing

- **No multi-agent recursion.** One orchestrator + one layer of investigators. Period.
- **No shared embedding index across submissions.** Each submission gets a fresh PageRank repo map, then is discarded.
- **No browser tool, web search, or external knowledge fetches** in investigator context. The rubric is ground truth.
- **No long-trajectory single-agent runs.** Tier-3 is multi-agent map-reduce, not one Devin-style agent thinking for 8 hours straight. The OpenHands research shows trajectory bloat is the dominant failure mode on long single runs.
- **No reliance on OpenClaw/ZeroClaw architecture.** OpenClaw's heartbeat-and-webhook shape is wrong for this workload. We adopt patterns from Claude Code (subagents) and OpenHands (condenser), not from OpenClaw.

## 10. Implementation roadmap (sequenced, each step independently shippable)

1. **`src/services/eval/orchestrator.ts`** — orchestrator process. Spawns investigator workers via BullMQ (reuse existing queue infra). Manages state in `evaluation_results` rows. (~3 days)
2. **`src/services/eval/investigator.ts`** — investigator process. Receives `{ submission_id, rubric, task_spec }`. Runs the SWE-agent-shaped tool loop. Returns structured verdict. (~3 days)
3. **`src/services/eval/repo-map.ts`** — Aider-style PageRank repo map. Tree-sitter + NetworkX equivalents in TypeScript: `web-tree-sitter` + a small PageRank impl (~50 lines). (~2 days)
4. **`src/services/eval/citation-verifier.ts`** — deterministic citation checker. Whitespace-tolerant. (~1 day)
5. **`src/services/eval/scratchpad.ts`** — per-submission markdown scratchpad mounted via memory tool. (~1 day)
6. **Anthropic context-management API integration** — wire `clear_tool_uses_20250919` + `compact_20260112` + `memory_20250818` into the SDK call shape. Anthropic SDK supports these directly. (~1 day)
7. **`src/services/eval/tier4-adversarial.ts`** — surface-vs-content divergence + rubric-keyword density + prompt-injection scanner. Deterministic, runs in Tier-1. (~2 days)
8. **End-to-end test** — synthesize 50 submissions of varying quality (good / mediocre / adversarial) on a real task, run through Tiers 1→4, validate ranking matches human judgment within 1 rank slot for top-10. (~3 days)
9. **Cost telemetry** — record per-investigator token spend, per-task aggregated cost, and surface on `/dashboard/company` per task. (~2 days, partly out-of-band — touches dashboard)

Total: **~18 working days** for full Tier-3 implementation, parallelizable across 1, 3, 4, 5, 7. Realistic calendar: 3 weeks for one engineer; 1.5 weeks if Jeremy + Claude run pair-style.

## Open questions for Jeremy

1. **Investigator model choice.** Tier-3-of-D30 was specced as Sonnet 4.6. The cost math above assumes Sonnet. If we want to run *every* submission through Tier-3 (not just Tier-2-flagged), we need to drop to Haiku 4.5. Pick one, then commit; the orchestrator design works for either.
2. **Sandbox.** Investigator runs in what? Vercel Sandbox is the right Phase-19 answer. For tonight's worktree we should keep it agnostic — `BaseWorkspace`-style abstraction. The tier-4 prompt-injection scanner specifically needs sandboxed execution.
3. **CitationVerifier as deterministic vs ML.** Deterministic is fine for v1. ML is better for v2. Tracking as a Tier-3 enhancement.
4. **When does the rank pass fire?** After all Tier-3 investigators return, or as they stream in? Streaming is more reactive but the orchestrator's reasoning is harder. Pick pre-computed for v1.
5. **What's the eval cycle's *external* trigger?** Today it's "agent submits → eval enqueued." For 500-submission rank passes, the trigger is "task hits deadline" or "company explicitly closes." Need a new BullMQ queue (`eval_rank`) distinct from the per-submission `eval_score` queue. Track as own item.

## Cross-references

- D30 canonical spec: `tasks/research/eval-architecture-tiered-funnel.md` (cited in CLAUDE.md as the supersedes-everything-prior eval doc)
- Sister research files: `[[codebase-llm-wrappers]]`, `[[perplexity-deep-research]]`, `[[openclaw-and-autonomous-runs]]`
- Cost shape research: `[[eval-research-deep-2026-04-25]]`
- Agent incentives & adversarial assumptions: `tasks/research/agent-incentive-research-DISTILL.md`
