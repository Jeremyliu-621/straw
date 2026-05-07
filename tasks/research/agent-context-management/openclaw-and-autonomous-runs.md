---
type: research
status: active
created: 2026-05-07
topic: long-running autonomous agents — coherence, context management, and what it means for Straw's Tier-3 eval agent
companions:
  - "[[zeroclaw-build-research]]"
  - "[[eval-research-deep-2026-04-25]]"
  - "[[openclaw-agent-first-test-2026-05-06]]"
related_decisions:
  - D30 (eval architecture — tiered funnel)
  - D35 (worker host — Hetzner CX22)
  - D36 (prove the loop locally before paying for VPS)
---

# OpenClaw + autonomous-run SOTA — what Straw's Tier-3 eval agent should learn from

This file synthesizes what's known publicly about (a) OpenClaw, the daemon Jeremy uses as Straw's external auditor (`Dog`), and (b) the broader public state-of-the-art for autonomous agents that run for hours-to-days. The Tier-3 eval agent in D30's funnel is the use case driving this — it has to evaluate up to 500 submissions on a real codebase, rank them, and justify the rankings, in a single 4-8 hour autonomous run. Coherence and context discipline are non-negotiable.

---

## Section A — OpenClaw: what it actually is

**OpenClaw is a real public open-source project**, not Straw-internal. The repo is at `github.com/openclaw/openclaw`, MIT-licensed, originally created by Peter Steinberger (of PSPDFKit fame) and now community-maintained. The project was previously branded `clawdbot` / `moltbot` and has reportedly accumulated ~76K GitHub stars per third-party coverage. Treat the star count as second-hand until verified — none of our existing repo material cites it directly.

### What OpenClaw does

OpenClaw is a **personal AI assistant runtime that lives on your own machine and talks to you through the messaging apps you already use** — WhatsApp, Telegram, Slack, Signal, Discord, iMessage, Matrix, and ~20 more channels. It is local-first (memory is plain Markdown on disk in `~/.openclaw/workspace/`), provider-agnostic (Anthropic, OpenAI, OpenAI-Codex subscription, Ollama, plus more), and runs as a long-lived daemon (launchd on macOS, systemd on Linux). The shape is "agent-as-second-brain you message," not "browser tab you open."

### Architecture, as best we can verify from public docs

- **Gateway daemon.** A single long-running process bound by default to `127.0.0.1`. Speaks an OpenAI-compatible API on port 18789 (`/v1/chat/completions`, `/v1/responses`). Hosts the agent loop, channel adapters, and tool executor. From the Straw-side bridge memo (`project_openclaw_bridge.md`): the Windows host reaches Dog at `100.68.84.74:18789` via Tailscale, but currently can't connect because Dog binds localhost-only — needs `0.0.0.0` rebind or `tailscale serve`.
- **Workspace files.** Markdown files that get injected into the agent's prompt at runtime: `AGENTS.md` (system prompt, identity), `SOUL.md` (personality), `TOOLS.md` (tool-use guidelines), `MEMORY.md` (curated long-term memory), `IDENTITY.md` / `USER.md`, `HEARTBEAT.md` (the autonomous-action checklist).
- **Skills directory.** Each skill is its own subfolder with a `SKILL.md` that's cross-compatible with ZeroClaw, Codex CLI, and Claude Code per a shared spec. This is the format Jeremy's `straw-judge` skill targets.
- **Heartbeat loop.** This is the "autonomous" piece. Every 30 minutes (default — or hourly with Anthropic OAuth, per the GitHub README we fetched), the daemon wakes, reads `HEARTBEAT.md`, decides whether anything needs action, and either messages the user or returns `HEARTBEAT_OK` (silently dropped). It's not a continuous loop — it's a periodic poll-and-act loop, which is a specific design choice for cost and predictability.
- **First-class tools.** Browser, canvas, nodes (workflow), cron, sessions. Tool permissions are declared upfront and enforced at the runtime layer.
- **ClawHub.** A registry of bundled / managed / workspace skills, analogous to a plugin marketplace.

### How Straw uses OpenClaw today (verified against repo memory)

- **OpenClaw daemon "Dog" runs as an external auditor of Straw.** It acts as a real user, files findings to `#straw-feedback` in a fixed format (*what I tried / what happened / what I expected / severity*), and DMs Jeremy directly for security findings. Per `project_openclaw_audit_loop.md`, this is a standing arrangement — Round 1 caught one server bug + 8 doc gaps; Round 2 caught and self-retracted a false positive after a raw-byte re-test. Signal-to-noise is high enough that Jeremy treats findings as load-bearing.
- **As of 2026-05-06 (`openclaw-agent-first-test-2026-05-06.md`), Dog v2 was the first daemon to compete on Straw via `/api/docs` cold.** It chose HTTP over MCP, found the right endpoints, made a real submission. The submission revealed three platform bugs (expired-task filter, queue-mismatch from Vercel deploy staleness, ambiguous `completed` status) and one LLM-layer issue (Gemini 2.5 Flash returning malformed JSON + 503 cascade). Discovery + submission half of the substrate test passed; the eval half (Tier-1/2 LLM judge) failed on reliability.

### OpenClaw vs ZeroClaw — the relationship

These are **two related but separate projects**. Per `zeroclaw-build-research.md` and the public DEV.to / Pinggy coverage we found:

- **OpenClaw** is the original Node/TypeScript daemon — heavier (~OpenClaw core compared to ZeroClaw's <5 MB), bigger surface area, more features, the canonical project that started this lineage.
- **ZeroClaw** is a Rust rewrite by `zeroclaw-labs` — single 3.4 MB binary, <5 MB resident, sub-10ms boot, default-port 3000, trait-driven extension model. Published as `zeroclaw` on crates.io. Marketed as "ZeroClaw is to OpenClaw what nginx is to Apache" — same idea, smaller footprint, designed for trillions-of-edge-deploys at $10/month VPS scale.
- The shared `SKILL.md` format is the bridge: write a skill once, run it in OpenClaw / ZeroClaw / Codex CLI / Claude Code.

The ZeroClaw research file makes a sharp architectural point: **the Gateway is webhook-only** (`POST /webhook` returns the agent's response; no agent-CRUD endpoints), and `[agents.<name>]` config sections define **delegation sub-agents** (one primary that calls bounded-depth delegates), NOT independent peer agents. Both observations apply to OpenClaw too. Anyone planning "spawn N independent judge agents in one Gateway" is fighting the harness — the right pattern is one primary agent called per-submission via webhook, with the primary delegating to a code-investigator sub-agent.

### Limits / what OpenClaw is not

- **Not a coding agent harness.** No SWE-bench-style ACI (no `find_file` / `search_dir` / structured edit tools tuned for repos). It's a generalist personal-assistant runtime — code investigation happens through delegated sub-agents (Codex CLI, Claude Code) it shells out to.
- **Not a long-trajectory orchestration system.** The heartbeat is bounded (30 min), and `/webhook` is request-response. There's no native pattern for a single agent run that lasts 4 hours straight without an external driver.
- **Memory is curated, not auto-managed.** `MEMORY.md` is a Markdown file the operator maintains. There's no built-in vector DB / FTS hybrid retrieval (ZeroClaw adds that with SQLite + vector + FTS5; OpenClaw leaves it to the operator).
- **Bound to localhost by default.** Surfaced as a real bug for the Tailscale bridge — Dog isn't reachable at `100.68.84.74:18789` until the Gateway is rebound or fronted by `tailscale serve`.

So when Straw's docs say "OpenClaw is our reference long-running daemon," they mean: it's the daemon Jeremy actually has running in production audits Straw, not "OpenClaw is the architectural template for the Tier-3 eval agent." For the Tier-3 agent, OpenClaw's heartbeat-and-webhook shape is the wrong shape — we need something that can sustain a multi-hour single trajectory.

---

## Section B — Public-SOTA per-system deep dive

Six systems matter for the Tier-3 design. Each gets ~250 words on memory, context discipline, and what they actually do under the hood.

### B.1 SWE-agent (Princeton, NeurIPS 2024)

The paper that introduced the term **Agent-Computer Interface (ACI)**. Core insight: LLMs don't fail at coding because they're not smart enough — they fail because the tools we give them are wrong shape. SWE-agent provides curated commands like `find_file`, `search_file`, `search_dir`, structured `edit` (window-based, with explicit before/after preview), and a constrained `submit` action. The interface is more important than the model. On SWE-bench: 12.5% pass@1 (state-of-the-art at publication); on HumanEvalFix: 87.7%.

**Memory model: minimal.** SWE-agent maintains a flat trajectory of (action, observation) pairs. There's no compaction, no scratchpad, no sub-agent spawning in the original paper — just careful interface design and a rolling context. The trajectory is short by intent: empirical analyses (e.g., the SWE-Effi paper, arXiv:2509.09853) report SWE-agent averaging ~22 more steps than minimal baselines but far fewer than OpenHands. Token usage scales superlinearly as trajectories grow ("Token Snowball Effect"). With GPT-4o-mini on the long tail, SWE-agent has been observed making 181 LLM calls and consuming 8.1M input tokens on a single benchmark task — a vivid demonstration that even a "tight" agent loses to context bloat without active intervention.

**Failure mode:** trajectory bloat → goal drift. The paper handles this by capping steps and requiring explicit submission — not by managing memory. Good harness, bad scaling story.

### B.2 OpenHands (formerly OpenDevin) — Software Agent SDK

OpenHands's 2025 SDK paper (arXiv:2511.03690) is the most production-leaning public design. The whole framework is reorganized around two big subsystems: **Memory** (microagent-based knowledge retrieval — small skill modules that surface domain-specific guidance based on triggers) and **ConversationMemory** (the event-log compactor).

**Condenser system.** This is the heart of it. As the event log grows past a threshold, older events get **dropped and replaced by summary entries**. The OpenHands blog post (Nov 2025) shows the empirical case: baseline accumulation is quadratic in cost; condensed history is linear. Cost per turn diverges from baseline and stabilizes at <½ baseline. Crucially, **condensation reduces operational cost by ~2× without measurable accuracy loss** (per the SDK paper's empirical eval).

**Sandbox & tools.** Native sandboxed execution via `BaseWorkspace` — Local (in-process), Docker (`DockerWorkspace`), or Remote (HTTP to an Agent Server). The browser tool (`BrowserToolSet`) is first-class. This is what differentiates OpenHands from raw SDK use of Claude/OpenAI: sandbox, lifecycle, and routing are built in.

**Trajectory length.** OpenHands averages ~29 iterations per task, but that's after condensation — the raw event count is much higher. AutoCodeRover (~6 steps, 38% resolve with Qwen3-32B) shows you can be much terser, but OpenHands trades steps for resilience.

**Where it fails:** memory-condensation issue #5715 in the OpenHands repo documents an ongoing thread where summaries lose specific identifiers (file paths, exact error strings) the agent later needed. This is the canonical compaction failure mode — the summarizer doesn't know what'll be load-bearing later.

### B.3 Devin (Cognition AI)

Devin is the closest public reference to "multi-hour autonomous agent solving real engineering tasks." Cognition reports ~13.86% on SWE-bench Lite autonomously and operates in a cloud sandbox with shell, editor, and browser. Tasks are scoped to "multi-hour" — assigned via Slack or Teams, executed in a long-running cloud sandbox. The "Devin 2.0" architecture indexes target repositories every couple hours, building wikis with architecture diagrams and source links — pre-computed scaffolding so the agent doesn't have to navigate from cold every time.

**Sonnet 4.5 lessons (from cognition.ai/blog).** The most concrete public commentary on long-running agents. Three findings:

1. **"Context anxiety."** Sonnet 4.5 proactively summarizes its own work as it nears the context limit, sometimes prematurely declaring tasks complete. Cognition's workaround: enable the 1M-token beta but cap usage at 200K, so the model stops "panicking" — the model behaves correctly when it doesn't think it's near the limit.
2. **Model-generated memory isn't enough alone.** Sonnet 4.5 actively builds knowledge through documentation and experimentation, but its self-summaries omit critical details. They needed external compaction/scaffolding alongside.
3. **Parallel execution accelerates context consumption.** Sonnet 4.5 happily reads many files at once — speed is up, but context burns faster. Without explicit budgeting, the agent paints itself into a corner faster than serial agents do.

Cognition's takeaway: sub-agent delegation and meta-agent prompting (an agent reasoning about its own workflow) are the next frontier; state management across multiple agents is hard.

### B.4 AutoGPT / BabyAGI / AgentGPT (the 2023 cohort)

Important because every later system was designed to fix what these broke. The dominant failure modes are **infinite loops**, **goal drift**, and **memory amnesia**:

- **Infinite loops.** AutoGPT typically gets stuck in cycles like "search → write to file → read file → search again." Without a coherent termination criterion, the loop runs until rate-limited or out of money.
- **Memory amnesia.** No durable memory of what it has already tried — repeats the same subtask. BabyAGI similarly "kept reinventing the plan in circles."
- **Naive semantic search.** Vector search over previous actions makes loops worse, because keywords from the goal appear in both the goal and the actions tried, so retrieval keeps re-surfacing the failed action.

AutoGPT in 2025 has added step caps and human-in-the-loop checkpoints. The lesson is crisp: an autonomous agent without bounded steps + explicit progress tracking + de-duplication will fail at any meaningful trajectory length.

### B.5 AutoGen / CrewAI / MetaGPT — multi-agent frameworks

The 2025 surveys (arXiv:2508.10146 and the Augment Code "Multi-Agent Orchestration" piece) report:

- **Coordination failures dominate.** ~36.94% of all observed failures across AutoGen / CrewAI / LangGraph are coordination failures — agents talking past each other, deadlocking on handoffs, or duplicating work. ~13.2% are reasoning-action mismatches.
- **Token cost.** Multi-agent systems use ~15× the tokens of single-agent chat for equivalent tasks. MetaGPT and ChatDev have been measured at >$10/task in research settings.
- **Coherence on shared files.** A single agent modifying files across multiple services loses coherence as context fills with conversation history, tool outputs, and prior code. Multi-agent helps by isolating each agent's context — but only if the orchestration handoff itself is reliable.

The takeaway for Tier-3: multi-agent helps if the orchestrator is rigorous about *what* gets passed across handoffs. Otherwise it makes things worse — more agents = more places for state to drift.

### B.6 Anthropic's Claude Code / "managed agents" guidance

Anthropic's two engineering posts ("Effective context engineering" and "Effective harnesses for long-running agents") are the most practical recent guidance. The patterns:

- **Compaction.** When approaching the context window limit, summarize the conversation in-place and reinitiate with the summary. Claude Code's pattern: pass message history back to the model with a "preserve architectural decisions, unresolved bugs, implementation details; discard redundant tool outputs" prompt; carry forward the five most recently accessed files.
- **Structured note-taking ("agentic memory").** The agent maintains an external file (`NOTES.md`, `claude-progress.txt`) it writes to and reads from. Persistent state outside the context window. Lower fidelity than full history but stable across compactions.
- **Two-part agent architecture.** An **initializer** sets up the environment, scaffolding, and feature list once; **subsequent coding agents** make incremental progress. They read the feature list (200+ items, "passing"/"failing"), git logs, and progress file at startup.
- **Subagent spawning with context isolation.** Claude Code subagents are separate Claude instances with their own 200K-token context. Only the prompt string crosses the parent→subagent boundary; only the final output crosses subagent→parent. Subagents can't fork further. This is exactly the right pattern for "investigate this submission's code without polluting the main reasoning trace" — and it's the pattern the ZeroClaw `code_investigator` delegate config approximates.

---

## Section C — Failure modes (with sources)

Concrete reports of agents losing coherence at scale, organized by mechanism:

### C.1 Token-snowball / context bloat

- **SWE-Effi (arXiv:2509.09853).** Empirical measurement of SWE-agent + GPT-4o-mini consuming 8.1M input tokens and 181 calls on a single task. Concept-named: "Token Snowball Effect" — small per-call additions accumulate quadratically.
- **OpenHands blog (Nov 2025).** Direct cost comparison: baseline accumulation scales quadratically; condensation scales linearly. Condensation drops cost by ~2× with no accuracy hit.
- **Towards Data Science / "A Practical Guide to Memory."** Notes "monotonic prompt growth" as the canonical inefficiency: every response gets appended, nothing gets dropped, until the agent is paying to send the same tool output 50 turns later.

### C.2 Goal drift / infinite loops

- **AutoGPT.** Documented in Wikipedia and "Notorious 'Agent loops'" (Medium, Srikanth Machiraju). Loops on `google → write → read → google` without termination. Mitigated in 2025 with step caps and human checkpoints, but the failure mode is canonical.
- **BabyAGI.** "Reinvented the plan in circles" because no durable completion-tracking. Same mechanism, slightly different surface.

### C.3 Premature completion / "context anxiety"

- **Cognition + Sonnet 4.5 (cognition.ai/blog).** Sonnet 4.5 detects approaching context limits and proactively summarizes / declares done. Workaround: enable 1M-token beta, cap at 200K — model stops panicking. This is a *new* failure mode that emerged with context-aware models; older models didn't know they were near the limit, so they didn't preemptively bail.

### C.4 Compaction lossiness

- **OpenHands GitHub issue #5715.** Memory condenser drops events the agent later needed (specific identifiers, exact error strings). Open thread; no clean solution. The summarizer doesn't know what'll be load-bearing 200 turns later.
- **Cognition + Sonnet 4.5 (same source).** Model-generated memory omits critical details when self-summarizing. They had to layer Cognition's external compaction *on top of* Sonnet's self-summaries.

### C.5 Multi-agent coordination failures

- **arXiv:2508.10146 ("Agentic AI Frameworks").** 36.94% of observed failures are coordination failures across AutoGen / CrewAI / LangGraph. 13.2% are reasoning-action mismatches.
- **Augment Code orchestration guide (2026).** 15× token overhead for multi-agent vs single-agent for equivalent tasks; >$10/task in MetaGPT/ChatDev research deployments.

### C.6 Naive retrieval-as-memory

- **AutoGPT / BabyAGI critiques (Lorenzo Pieri, "How to Fix AutoGPT").** Vector search over previous actions deepens loops because goal-keywords appear in both the goal and the failing actions. The retrieval keeps surfacing the failed strategy.

---

## Section D — What this means for Straw's Tier-3 eval agent

The Tier-3 agent's job (per D30): take the ~15% of submissions flagged by Tier-1 (deterministic execution) and Tier-2 (cheap-LLM gatekeeper), investigate the actual code, rank them, and write justifications. Up to ~75 deep investigations per round on a real codebase. 4-8 hours autonomous. Real money on the line.

Synthesizing the sections above into concrete recommendations:

### D.1 Don't run one giant 4-hour trajectory. Spawn one fresh agent per submission, isolate context.

This is the single most important lesson. SWE-agent and OpenHands hit the token-snowball wall on *single-task* trajectories that last minutes. A 4-hour trajectory across 75 submissions is suicide for a flat memory model.

**Recommendation:** the Tier-3 system is an **orchestrator + N short-lived investigator agents**. The orchestrator iterates over the flagged submissions, spawns a fresh investigator per submission with a clean context, hands it the task spec + rubric + submission ID + investigation budget (e.g., 50 steps, 200K tokens), and collects the structured verdict back. Each investigator is short — minutes, not hours. The orchestrator's own context stays small (just the rubric, accumulated rankings, and the next submission ID).

This is exactly Claude Code's subagent pattern (Section B.6). It's also what ZeroClaw's `[agents.code_investigator]` delegation pattern is designed for. Use the harness as intended.

### D.2 Use the OpenHands Condenser pattern inside each investigator.

Inside a single investigator's run, summarize-and-replace older events as the trajectory grows. OpenHands's empirical 2× cost reduction at no accuracy cost is the public anchor. Implement: at every K events (or every M tokens), take the older half of the event log, summarize "what was tried, what succeeded, what failed," replace those events with the summary, retain the most recent N events verbatim.

### D.3 SWE-agent-style ACI for the investigator.

The investigator should not see raw `ls` / `cat` output and have to navigate from there. Give it: `find_file`, `search_dir`, structured `edit_window`, `run_tests`, `submit_verdict`. Curated, paginated, deterministic. The whole point of SWE-agent's paper.

### D.4 External scratchpad per submission.

Each investigator writes to a scratchpad file (`investigation-<sub-id>.md`) it can re-read across compactions. Pattern lifted directly from Anthropic's "agentic memory" guidance and Claude Code's `claude-progress.txt`. The scratchpad is also the audit trail — it gets persisted alongside the verdict so judges' reasoning is reviewable. This is a feature for the rubric-justice story, not just an internal optimization.

### D.5 Bounded steps + explicit "I'm done" / "I'm uncertain" signals.

AutoGPT's lesson, applied: hard step cap per investigator (e.g., 50 LLM calls). At every step, the investigator can emit one of `continue` / `submit_verdict` / `escalate_uncertain`. Uncertain submissions go to a human-review queue rather than getting a noisy ranking. This is how Tier-3 stays honest about what it doesn't know — Cognition's "context anxiety" suggests Sonnet 4.5 will already self-flag when in doubt; we should expose that signal as a first-class verdict type.

### D.6 Re-grounding at startup.

Each investigator, at startup, reads: (1) the task spec, (2) the rubric, (3) the gold-set summary if calibration is needed, (4) the submission's deterministic-tier results (what passed, what failed, by how much). It does NOT need the prior 74 submissions' verdicts. The orchestrator carries that.

### D.7 Don't model this on OpenClaw. Model it on OpenHands SDK + Claude Code subagents.

OpenClaw is the right tool for Dog (auditing Straw as a daemon-user). It is not the right tool for Tier-3. The right reference architectures are:

- **OpenHands Software Agent SDK** for the sandbox, condenser, and event-log model.
- **Claude Code subagent pattern** for orchestrator → investigator delegation with context isolation.
- **SWE-agent ACI** for the tool surface inside each investigator.

ZeroClaw could host the orchestrator, with `[agents.code_investigator]` configured per-submission delegation — but only if we accept that the harness's webhook-only interface and bounded-depth delegation are the right shape. Given the volume (75 investigations / round) and the cost of getting this wrong, building on OpenHands SDK directly is probably the better starting point.

### D.8 Adversarial test it before trusting rankings.

Before any real money flows: feed the Tier-3 agent a known-gold set (5 known-good, 5 known-mediocre, 5 known-broken submissions in a synthetic task) and verify rankings match. Then add 3 adversarial submissions (prompt-injection in code comments, fake test stubs, README that lies about implementation). Verify the agent doesn't fall for them. The eval-research file's Tier-4 ("adversarial guardrails") is exactly this — it's not a separate tier, it's a continuous calibration loop on Tier-3.

### D.9 Open question: per-task memory across investigators.

Should investigators share *anything* across submissions in the same round? E.g., "submission #34 used a clever optimization the rubric should value — does that change how I score #67's similar attempt?" The Cognition / Sonnet 4.5 lesson is that meta-agent prompting is hard and state-management across agents is brittle. Recommendation for v1: **no shared memory across investigators**; the orchestrator handles cross-submission consistency by re-ranking after all individual verdicts are in. Add cross-submission memory only if v1 produces visibly inconsistent rankings.

---

## Sources

### Repo material (verified)
- `tasks/research/zeroclaw-build-research.md` — ZeroClaw architecture, OpenClaw/ZeroClaw differences, the architectural-correction note.
- `tasks/research/eval-research-deep-2026-04-25.md` — D30 tiered-funnel reasoning; supersedes earlier "ZeroClaw + Codex subscription" plan.
- `tasks/research/openclaw-agent-first-test-2026-05-06.md` — Dog v2 substrate test, queue-mismatch failure, Gemini reliability.
- `~/.claude/projects/.../memory/project_openclaw_audit_loop.md` — standing audit-loop arrangement.
- `~/.claude/projects/.../memory/project_openclaw_bridge.md` — Tailscale bridge + endpoint shape (`100.68.84.74:18789`, OpenAI-compatible API).
- `mop-overnight/CLAUDE.md` — references to OpenClaw "Dog" and the bridge endpoint.

### Public sources (web)
- [OpenClaw GitHub repo](https://github.com/openclaw/openclaw) — architecture, channels, workspace files, daemon model.
- [OpenClaw AGENTS.md](https://github.com/openclaw/openclaw/blob/main/AGENTS.md) — workspace prompt structure.
- [What Is OpenClaw — Milvus Blog](https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md) — third-party history (the 76K-stars claim is from this/related coverage; treat as second-hand).
- [ZeroClaw — DEV.to overview](https://dev.to/lightningdev123/zeroclaw-a-minimal-rust-based-ai-agent-framework-for-self-hosted-systems-5593) — Rust architecture claims.
- [ZeroClaw vs OpenClaw — Pinggy](https://pinggy.io/blog/zeroclaw_lightweight_openclaw_alternative/) — direct comparison.
- [zeroclaw-labs/zeroclaw GitHub](https://github.com/zeroclaw-labs/zeroclaw).
- [SWE-agent paper, NeurIPS 2024 (arXiv:2405.15793)](https://arxiv.org/abs/2405.15793) — ACI design.
- [SWE-agent GitHub](https://github.com/SWE-agent/SWE-agent).
- [The OpenHands Software Agent SDK (arXiv:2511.03690)](https://arxiv.org/abs/2511.03690) — Condenser, BaseWorkspace, browser tool.
- [OpenHands context-condensation blog (Nov 2025)](https://openhands.dev/blog/openhands-context-condensensation-for-more-efficient-ai-agents) — empirical 2× cost reduction.
- [OpenHands memory-condensation issue #5715](https://github.com/OpenHands/OpenHands/issues/5715) — open compaction-lossiness thread.
- [SWE-Effi paper (arXiv:2509.09853)](https://arxiv.org/pdf/2509.09853) — trajectory-length and token-snowball measurements.
- [Cognition: Rebuilding Devin for Claude Sonnet 4.5](https://cognition.ai/blog/devin-sonnet-4-5-lessons-and-challenges) — context-anxiety, parallel-execution caveats, model-generated memory.
- [Cognition: Devin 2.0](https://cognition.ai/blog/devin-2) — repo indexing, multi-hour task model.
- [Anthropic — Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — compaction, agentic memory.
- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — initializer + coding-agent split, feature-list scaffolding.
- [Claude Code subagents docs](https://code.claude.com/docs/en/sub-agents) — context-isolation pattern.
- [AutoGPT — Wikipedia](https://en.wikipedia.org/wiki/AutoGPT) — step caps, history.
- ["Notorious Agent loops" — Medium / Srikanth Machiraju](https://techtalkwithsriks.medium.com/notorious-agent-loops-c4cc05b859b5) — loop taxonomy.
- ["How to Fix AutoGPT" — Lorenzo Pieri](https://lorenzopieri.com/autogpt_fix/) — naive-semantic-search failure.
- [Agentic AI Frameworks survey (arXiv:2508.10146)](https://arxiv.org/html/2508.10146v1) — multi-agent failure taxonomy.

### Claims I could not verify and am surfacing as such
- The "76K stars" figure for OpenClaw appeared in search-result summary text but I did not independently confirm it on GitHub. Treat as approximate.
- ZeroClaw's "<5 MB resident, sub-10ms boot" claims are from project marketing (zeroclaw.net, DEV.to). Plausible for a small Rust binary but not benchmarked by me.
- The Cognition/Sonnet 4.5 blog post is the source for "context anxiety" — that's their term and their interpretation, not an Anthropic-published behavior. The mitigation (1M beta capped at 200K) is theirs and may not generalize.
- OpenHands's "2× cost reduction at no accuracy hit" is from the SDK paper's own evals; an independent replication would strengthen the claim.
- I have no public source confirming Devin's exact context-management implementation — Cognition's blog posts describe behaviors and lessons, not the architecture in detail. Treat the Devin section as "what Cognition has chosen to share publicly."
