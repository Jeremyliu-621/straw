---
type: research
last_updated: 2026-05-07
sources_count: 22
---

# Codebase-Scale LLM Wrappers — Context, Memory, and Tool-Use Patterns

## Executive summary

- The state of the art on long-running code agents converges on three primitives: **server-managed compaction with explicit triggers** (Anthropic, OpenAI), **agent-authored persistent memory** (memory tool, `claude-progress.txt`, `feature_list.json`), and **isolated subagents that return distilled summaries** (1–2K tokens). All three are now first-class API features, not bespoke harness code.
- Codebase indexing has bifurcated. Aider/Continue use **deterministic tree-sitter + PageRank** repo maps inside a fixed token budget. Cursor uses **AST-chunked semantic embeddings + BM25 hybrid + cross-encoder rerank** synced over a Merkle tree. Claude Code and Codex CLI use **lazy `grep` + `read`**, no index — the agent earns the context it spends.
- Tool-catalog crowding is acknowledged but unsolved. Anthropic's published guidance is editorial ("don't build too many"); the only deployed mitigation is namespacing + semantic consolidation. Skills/MCP make this worse, not better, by giving every plugin an attack surface on the catalog.

---

## Per-tool deep dive

### Cursor (Composer / Agent)

Cursor's indexing pipeline is the most production-engineered of any tool reviewed. On project open it computes a Merkle tree of file-content hashes and syncs it to the server every ~5–10 minutes; only changed leaves are re-uploaded. Files are chunked by AST (tree-sitter, recursive depth-first with sibling merging up to a token limit) so each chunk is a function/class/logical block, never an arbitrary text window. Chunks are embedded with a proprietary code-tuned model and stored in **Turbopuffer** (a serverless vector + full-text store) with metadata limited to obfuscated path segments and line ranges — raw code is never persisted server-side. File paths are split on `/` and `.`, each segment encrypted client-side; for git repos the obfuscation key derives from a recent commit hash so teams share a key without leaking structure.

At query time, the **Context Prioritizer** runs hybrid BM25 + embedding similarity, then reranks with an on-device cross-encoder. The hybrid combination is reported to lift recall 15–30% over either method alone. Server returns metadata (encrypted path + line range), client decrypts and reads the actual bytes from disk, then sends real code to the LLM. Composer-1 was RL-trained against this retrieval interface; Cursor explicitly notes that combining semantic search with grep produces better outcomes than either alone — natural-language queries hit embeddings, exact-string queries hit grep. Cursor 2.0 added Git-worktree-isolated multi-agent execution (up to 8 parallel agents) but did not publish details on shared-context arbitration between them.

Failure modes: stale index between syncs (max ~10 minutes of drift), embedding model has no retraining loop per repo, cross-encoder is single-language-biased.

Sources: [Engineer's Codex](https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast), [Towards Data Science](https://towardsdatascience.com/how-cursor-actually-indexes-your-codebase/), [Cursor security blog](https://cursor.com/blog/secure-codebase-indexing), [InfoQ on Cursor 2.0](https://www.infoq.com/news/2025/11/cursor-composer-multiagent/).

### Cline (Claude Dev)

Cline is the most readable open-source implementation of context management. Three TypeScript classes do the work. **`ContextManager`** holds a `contextHistoryUpdates` map keyed by message index with timestamped patches — every truncation is recorded so it can be reverted if a model retries from an earlier checkpoint. `getNewContextMessagesAndMetadata` checks current token usage against `maxAllowedSize` (the model's window minus a per-model output buffer; DeepSeek and Claude get bespoke offsets); when over budget, `getNextTruncationRange` removes a contiguous middle slice (about half, then three-quarters as pressure grows) but always keeps the first user-assistant pair and the last few turns to preserve the task framing and recency. It also runs a deduplication pass: repeated reads of the same file are collapsed to `[DUPLICATE FILE READ]`.

**`FileContextTracker`** owns one `vscode.FileSystemWatcher` per file Cline has touched. Crucially it disambiguates user-edits from agent-edits using a record state (active/stale) plus read/edit timestamps — without this the agent reacts to its own writes as external changes and loops. **`ModelContextTracker`** logs `(apiProviderId, modelId, mode)` per turn for analytics, deduplicating consecutive identical entries.

For initial codebase ramp-up Cline runs file-tree analysis, regex search, and AST traversal up front — there is no embedding index. MCP servers are first-class; the user-confirmation step on tool calls is enforced through a suspension mechanism in the agent loop, not a prompt.

Failure mode: middle-truncation throws away mid-task reasoning, including freshly-discovered facts that haven't been re-stated; no semantic compaction.

Sources: [Cline GitHub](https://github.com/cline/cline), [DeepWiki](https://deepwiki.com/cline/cline), [Dissecting Cline (Medium)](https://medium.com/@balajibal/dissecting-cline-cline-context-management-260aec3d84cb).

### Aider

Aider is the canonical reference for **deterministic, token-budgeted repo context**. The pipeline: tree-sitter parsers (130+ languages via `py-tree-sitter-languages`) extract `Tag` records (`def` or `ref`); when a language only ships `def` queries, Pygments lexes the rest and emits identifier references. The graph has files as nodes and edges `referencing_file → defining_file, weight=1.0` per identifier reference. Self-loop edges (`weight=0.1`) prevent isolated leaves from sinking to zero rank. Edge weights are multiplied: **10× for identifiers the user mentioned in chat, 10× for "well-named" identifiers (snake_case, descriptive), 50× for files already added to the chat**. PageRank runs over this graph (NetworkX) with a personalization vector biased toward chat files and the current message. After ranking, a **binary search over the ranked tag list** finds the largest prefix whose rendered output (via `grep_ast.TreeContext`, which produces an elided code view showing only signature lines and surrounding scope) fits the `--map-tokens` budget — default **1,000 tokens**, often expanded automatically when no files are in chat.

This is striking: Aider re-ranks the entire repo on every turn. There is no embedding cache, no Merkle tree, no async sync. It is fast enough because tree-sitter is fast and `networkx.pagerank` is fast on graphs of even 10K nodes.

Failure mode: the 1K-token map describes structure, not bodies — it tells the model "this function exists at this signature" but not what it does. For deep semantic questions Aider must still read whole files, which is when its lint-and-fix loop (run linter → feed errors back) earns its keep.

Sources: [Aider repomap blog](https://aider.chat/2023/10/22/repomap.html), [Aider docs](https://aider.chat/docs/repomap.html), [DeepWiki](https://deepwiki.com/Aider-AI/aider/4.1-repository-mapping-system), [RepoMapper port](https://github.com/pdavis68/RepoMapper).

### Claude Code

Claude Code's design treats the context window as the binding constraint and addresses it at five layers. **`CLAUDE.md`** is loaded by walking from cwd up the directory tree (enterprise → user → project → directory), giving stable project memory at near-zero cost. **Skills** are progressively-disclosed instruction modules: only the SKILL.md frontmatter (name + description) lives in the always-on catalog; the body is loaded via tool call when the agent decides to invoke. **Hooks** fire at 25 lifecycle points (PreToolUse, PostToolUse, SessionStart, etc.) and are deterministic — they can block or rewrite tool calls; experienced users explicitly warn against blocking mid-plan ("blocking confuses or frustrates the agent") and prefer commit-time validation. **Subagents** run in a separate context window via the `Task` tool, return only a 1–2K token summary, and **cannot spawn further subagents** (no infinite nesting). **Plugins** package the above for distribution.

The compaction stack is now exposed as API primitives ([context-management cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)). `clear_tool_uses_20250919` walks messages and replaces `tool_result` blocks with `"[cleared to save context]"`; defaults: trigger 100K input tokens, keep last 3 tool uses, clear at least 10K (so a cache write is worthwhile). `compact_20260112` triggers at 150K input tokens (min 50K), passes the entire trace to a summarizer with a custom `instructions` prompt, and emits a `compaction` block; everything before it is dropped on the next request. The `memory_20250818` tool gives the agent a sandboxed `/memories` filesystem with `view/create/str_replace/insert/delete/rename` commands. Cookbook benchmarks on a research workload (8 docs × 40K tokens): baseline peaks at 335K (failure), clearing-only peaks at 173K, compaction-only at 169K, all-three at ~170K with cross-session persistence.

Indexing strategy is deliberately **none**. Claude Code uses Grep, Glob, Read on demand — the agent earns the context it spends. Sshh's analysis is that this matters: it forces the model to issue specific queries, which produces better grounding than dumping a precomputed retrieval into context.

Sources: [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [Claude Cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools), [Sshh Shankar](https://blog.sshh.io/p/how-i-use-every-claude-code-feature), [alexop.dev](https://alexop.dev/posts/understanding-claude-code-full-stack/), [todatabeyond](https://todatabeyond.substack.com/p/claude-codes-5-layer-agent-development).

### OpenAI Codex CLI / GPT-5-Codex

Codex is more minimal than Claude Code by design. Michael Bolin's "Unrolling the Codex agent loop" describes `AgentLoop.run()` as a textbook ReAct (Think → Tool Call → Observe) over a single primary tool: a sandboxed shell. File edits go through `apply_patch`, a structured diff format the model emits as `{"cmd":["apply_patch","*** Begin Patch..."]}`; instead of shelling out, `execApplyPatch` parses the unified diff and uses Node `fs` calls. Tools are declared per-turn through the Responses API `tools` field — Codex CLI's built-ins, Responses API tools (file_search etc.), and user MCP servers all merge into one catalog at session start.

Context budget: GPT-5-Codex ships with ~192K, Codex-Spark with 128K. The killer feature is **server-side compaction** in GPT-5.1-Codex-Max: trained to operate "across multiple context windows," it auto-summarizes when approaching the limit and continues, claimed coherent over millions of tokens in a single task. There is no detailed public spec on what survives compaction, but the marketing claim is project-scale refactors and multi-hour loops. Sandboxing is OS-level (Apple Seatbelt on macOS, Docker + iptables on Linux), distinct from Claude Code's application-level controls.

Codex's lazy-loading philosophy is the explicit anti-pattern to Claude Code: it reads only what the user references plus an optional `AGENTS.md`. The Promptlayer comparison reports this trades fewer tokens for more hallucinations about non-existent files; Claude Code's pre-scanning trades the opposite. Sessions persist locally (`codex resume`) so transcripts re-open with the same repo state — important for the multi-day workflows the funnel implies.

Failure mode: single shell tool means audit logs are coarse; sandbox escape via clever shell is the residual risk.

Sources: [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/), [GPT-5.1-Codex-Max](https://openai.com/index/gpt-5-1-codex-max/), [Codex docs](https://developers.openai.com/codex/cli/features), [Promptlayer comparison](https://blog.promptlayer.com/how-openai-codex-works-behind-the-scenes-and-how-it-compares-to-claude-code/), [philschmid](https://www.philschmid.de/openai-codex-cli).

### Continue.dev

Continue is the open-source reference implementation. It separates **autocomplete** (LSP-driven, in-editor, deterministic context selection: code before/after cursor + LSP definitions, no embeddings) from **agent/chat** (config.yaml-driven, with 18 built-in `@`-context-providers including `@File`, `@Codebase`, `@Folder`, `@RepositoryMap`, `@Search` (ripgrep), `@Docs`, `@GitDiff`, `@Problems`, `@Terminal`, `@Debugger`). `@Codebase` and `@Folder` are the only retrieval-backed providers; the rest are deterministic pulls. Indexing for `@Codebase` chunks files (semantic, AST-aware) and embeds them with a configurable model — users can run local Ollama embeddings, hosted OpenAI, or anything else. Three modes (Chat, Agent, Plan) each get their own override-able `baseSystemMessage`.

The autocomplete-vs-agent split is the load-bearing design choice: autocomplete must be sub-100ms and is therefore deterministic + LSP-only; the agent can take seconds and uses retrieval. This is a useful pattern for Straw — Tier 2 wants autocomplete-style latency, Tier 3 wants agent-style depth.

Sources: [Continue context providers](https://docs.continue.dev/customize/custom-providers), [Continue autocomplete](https://docs.continue.dev/ide-extensions/autocomplete/how-it-works), [config reference](https://docs.continue.dev/reference).

### OpenHands (formerly OpenDevin) — bonus

The architecture-paper version of an agent: stateless `Agent` emits `Action`s, a `Conversation` runs `step()` in a loop, an append-only `EventLog` is the memory, a `Workspace` (local process or Docker) executes Actions and returns Observations. Long-context handling is via **condensers** — pluggable objects that decide pre-call whether to compress. Default behavior: when visible event count exceeds **80**, ask a cheap LLM to summarize all events except the first 4 (system + task) and last few, replace the middle. This is the same shape Cline uses, exposed as a plugin point. Memu critiques the field for not having cross-session memory — every new session re-discovers the codebase from scratch. That's the exact gap Anthropic's `claude-progress.txt` + memory tool fills.

Sources: [OpenHands paper](https://arxiv.org/abs/2407.16741), [Software Agent SDK paper](https://arxiv.org/html/2511.03690v1), [DEV deep-dive](https://dev.to/truongpx396/openhands-deep-dive-build-your-own-guide-1al0), [Memu critique](https://memu.pro/blog/openhands-open-source-coding-agent-memory).

---

## Cross-cutting patterns

**Indexing converges to two camps.** Either you build a server-side embedding index (Cursor, Continue) or you don't (Claude Code, Codex CLI, Aider's repo-map is on-disk and per-turn). The split correlates with deployment model: hosted IDE plugins index; CLI tools that run on the user's machine over arbitrary repos avoid the operational cost. Aider is the cleverest middle ground — tree-sitter + PageRank gives 80% of an embedding index's value with zero infrastructure.

**Compaction has standardized on three primitives.** Tool-result clearing (cheapest, no inference), summary compaction (general but lossy on specifics), persistent memory (additive, no context cost, requires client storage). Anthropic's cookbook is now the de-facto reference; OpenAI's GPT-5.1-Codex-Max is the closed equivalent. Cline and OpenHands hand-roll the equivalents in user-space; the API-native versions will eat them within a year.

**Sub-agent semantics are surprisingly consistent.** Anthropic, Cursor 2.0, Cline, OpenHands all converge on: parent spawns child with isolated context, child runs to completion, child returns 1–2K tokens of summary, child cannot spawn further children. The 1–2K summary number appears verbatim in Anthropic's writeup and is the ceiling everyone respects. Disagreement is on **when** to spawn — Sshh's preference for `Task()` self-delegation over named subagents is empirically the better default when the work isn't pre-classified.

**Tool-catalog crowding is the open problem.** Anthropic's published advice ("build fewer tools") is editorial. Claude Code's progressive-disclosure for Skills is the only deployed mechanism that scales the catalog without scaling the prompt. No tool reviewed does **fuzzy/semantic tool selection at runtime** based on the user's request — every tool ships in the system prompt at session start. This is the next frontier.

**Where they all break at scale.** (1) Stale indices vs. fast-moving repos (Cursor's 5–10 min sync). (2) Cross-session amnesia unless you adopt explicit memory primitives. (3) Compaction loses verbatim detail — Anthropic's own benchmark shows 0/3 obscure facts survive. (4) Single-tool architectures (Codex shell) sacrifice auditability for elegance. (5) No tool tested has a published answer for **adversarial submissions** — code engineered to game whichever retrieval the judge uses.

**Disagreements worth noting.** Anthropic ("scan eagerly, ground heavily, swallow the tokens") vs. OpenAI Codex ("read lazily, AGENTS.md only") on default context strategy — both ship and both have customers. Promptlayer's claim that lazy-loading produces more hallucinations could not be independently verified in the time budget; treat it as a reasonable hypothesis. Aider's "well-named identifiers get 10×" multiplier is documented in DeepWiki and the RepoMapper port but not in Aider's own docs page; the 50× chat-files multiplier is consistent across sources.

---

## What this means for Straw's Tier-3 eval agent

D30 (the tiered funnel: deterministic → cheap-LLM gatekeeper → agent investigator → adversarial guardrails) gives Tier 3 ~5–15% of submissions, ~500 evals/month at 5K-eval volume, $15–$79 per 1K. The patterns above translate directly:

1. **Adopt the Anthropic context-management API verbatim for the Tier-3 agent.** Use `clear_tool_uses_20250919` (trigger 30K, keep 4) for file reads, `compact_20260112` (trigger 150K, custom `instructions` preserving rubric scores + evidence trail), `memory_20250818` for `findings.md` between phases. This is what `tasks/DECISIONS.md` D30 already calls for ("persists artifacts: findings.md") — make it the literal memory tool, not a custom file.

2. **Don't build a Cursor-style embedding index for submitted codebases. Build an Aider-style PageRank repo map per submission.** Each submission lives for hours, not days; building a Turbopuffer index per submission is operationally wrong. Tree-sitter + PageRank in-process, 1–2K token map per turn, is the right shape for ephemeral 100K-LOC repos. The map gives the investigator a structural prior; deep dives use grep + read on demand.

3. **Mirror Claude Code's lazy-tool philosophy, not Cursor's eager retrieval.** The investigator's tools should be: `repo_map`, `grep`, `read_file`, `run_in_sandbox`, `endpoint_probe`, `memory`. No more. Catalog-crowding kills the cheap gatekeeper at Tier 2 first — keep its tool list to ≤4. See [[claude-api]] guidance on caching the tool list to avoid per-call retransmission.

4. **Use sub-investigators with the 1–2K-token summary discipline.** When Tier 3 needs to verify 20 endpoints in parallel, parent investigator spawns 20 children via the Task pattern; each returns ≤2K tokens of `{endpoint, observed_behavior, evidence_path, verdict, confidence}`. This caps parent context regardless of submission size and matches the "5–15% flagged" budget.

5. **Adopt the initializer/coding split from Anthropic's harness post.** Phase A (run once per submission) builds the repo map, runs Tier 1 deterministic tests, and writes `submission-context.md` + `feature_list.json`-equivalent (the rubric criteria as boolean checks). Phase B (the investigator agent) reads those artifacts, picks the highest-priority unresolved rubric item, investigates, marks it resolved, repeats. This gives natural compaction boundaries: each rubric criterion is a fresh-context unit of work.

6. **Tier 4 adversarial guardrails should include retrieval-poisoning checks.** No tool reviewed defends against a submission that engineers code paths designed to be the most-PageRanked / most-embedding-similar to the rubric — gaming the retriever is the obvious attack on agent-as-judge. Add this to the red-team rubric in D30 Tier 4.

7. **Decision: do not use Codex CLI subscription mode for Tier 3 (already rejected in D30 revision history). Do use Codex CLI in API mode or Claude API directly.** GPT-5.1-Codex-Max's claim of multi-context-window compaction is interesting but unverified outside marketing copy; until calibration data exists, default to Claude Sonnet/Opus with the cookbook context primitives, where the compaction behavior is documented and tunable.

References per CLAUDE.md anchor-list rule: D30 in `tasks/DECISIONS.md`; cost shape memory `project_eval_architecture_tiered_funnel`; framing memory `project_framing_evaluated_bounty_board`. No new wikilink slugs introduced by this doc.

---

## Sources

- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- https://www.anthropic.com/engineering/writing-tools-for-agents
- https://www.anthropic.com/engineering/managed-agents
- https://www.anthropic.com/research/building-effective-agents
- https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools
- https://code.claude.com/docs/en/sub-agents
- https://blog.sshh.io/p/how-i-use-every-claude-code-feature
- https://alexop.dev/posts/understanding-claude-code-full-stack/
- https://todatabeyond.substack.com/p/claude-codes-5-layer-agent-development
- https://read.engineerscodex.com/p/how-cursor-indexes-codebases-fast
- https://towardsdatascience.com/how-cursor-actually-indexes-your-codebase/
- https://cursor.com/blog/secure-codebase-indexing
- https://www.infoq.com/news/2025/11/cursor-composer-multiagent/
- https://github.com/cline/cline
- https://deepwiki.com/cline/cline
- https://medium.com/@balajibal/dissecting-cline-cline-context-management-260aec3d84cb
- https://aider.chat/2023/10/22/repomap.html
- https://aider.chat/docs/repomap.html
- https://deepwiki.com/Aider-AI/aider/4.1-repository-mapping-system
- https://github.com/pdavis68/RepoMapper
- https://openai.com/index/unrolling-the-codex-agent-loop/
- https://openai.com/index/gpt-5-1-codex-max/
- https://openai.com/index/introducing-gpt-5-2-codex/
- https://developers.openai.com/codex/cli/features
- https://blog.promptlayer.com/how-openai-codex-works-behind-the-scenes-and-how-it-compares-to-claude-code/
- https://www.philschmid.de/openai-codex-cli
- https://docs.continue.dev/customize/custom-providers
- https://docs.continue.dev/ide-extensions/autocomplete/how-it-works
- https://docs.continue.dev/reference
- https://arxiv.org/abs/2407.16741
- https://arxiv.org/html/2511.03690v1
- https://dev.to/truongpx396/openhands-deep-dive-build-your-own-guide-1al0
- https://memu.pro/blog/openhands-open-source-coding-agent-memory
