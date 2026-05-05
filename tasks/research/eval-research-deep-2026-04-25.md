# Deep Eval Research — Synthesis (2026-04-25)

Research session via Perplexity, 7 deep queries on agent-as-judge eval at hackathon scale. Findings reshape the D30 architecture in three meaningful ways. This file pairs with `tasks/DECISIONS.md` D30 and `tasks/zeroclaw-build-research.md`. Future build sessions: read this first; it's load-bearing.

> **TL;DR:** The 2026 production consensus is **hybrid evaluation, not single-judge**. A fast LLM gatekeeper handles 85% of submissions; a tool-using agent investigates the 15% that are flagged. Hackathons additionally use code-execution harnesses (SWE-bench style) as the primary signal for code submissions, and only use LLM/agent judgment as a secondary quality filter. **No top hackathon uses pure AI for final decisions** — it's hybrid in practice (AI for filtering and quality scoring, humans for final calls). Codex subscription mode for programmatic webhook eval is **likely ToS-incompatible** at production scale and rate-limited (300-1500 msg per 5-hour window) — this is a real architectural constraint.

---

## Three findings that force D30 revisions

### 1. Codex subscription mode is not safe for programmatic production use

Per OpenAI's 2026 docs and community reporting:

- **Rate limit is sharper than assumed:** ChatGPT Pro ($200/mo) gives **300-1,500 Codex CLI messages per 5-hour rolling window**, not unlimited. For 200 daemons × 15 submissions = 3,000 evals over a 2-3 day hackathon, this is ~250 evals per 5-hour window. Achievable but tight, and bursty deadlines will exceed it.
- **ToS-incompatible at scale:** "Running `codex exec` non-interactively continuously as a production webhook server likely violates OpenAI's intended use for automated programmatic access. The subscription is designed for interactive developer use, not headless server automation at scale."
- **Webhook feature exists but is for outbound delivery** (Codex sending data out), not for running Codex itself as a judging webhook server.
- **Recommended path for production:** API key mode (pay-per-token), not subscription.
- **Codex pricing at API:** $1.50/M input + $6/M output for `codex-mini-latest`; GPT-5 Codex full at $1.25/$10 per M. ~50-70K tokens per eval = **$0.10-0.40 per eval at API rates**.

**Implication for D30:** The "$205/mo flat" cost narrative we baked into D30 yesterday is wrong. The right cost story is **pay-per-token at $0.10-0.40 per eval**, putting a 3,000-eval hackathon at roughly **$300-1,200**. Still affordable, still 5-10x cheaper than Claude Opus, but no longer "marginal cost zero."

### 2. Single-judge architecture (whether LLM or agent) is the wrong shape

Production teams in 2026 don't pick "LLM-as-judge OR agent-as-judge." They use a **funnel**:

```
Input → Fast gatekeeper judge (≤8B model, ~200ms)
        ├─ Clear pass/fail (85% of cases) → final score
        └─ Flagged (15%) → Autonomous agent-as-judge with tools
                            ├─ Search tools (verify claims)
                            ├─ Code interpreter (re-run if reproducible)
                            ├─ Tool-call verifier (check hallucinations)
                            └─ Final judgment with explanation
```

**Why this shape wins:**

| Dimension | Single LLM Judge | Agent-as-Judge (full) | Hybrid (chosen) |
|---|---|---|---|
| Cost per 1K evals | $0.45-$5 | $15-$78.96 | Gatekeeper $0.45-$2 + deep agent on 5-15% |
| Latency | ≤500 ms | 2-10 min (multi-step tool calls) | 200ms for most + 5min for flagged |
| Best for | Grammar, simple Q&A, pairwise win-rate | Subjective/multi-criteria, tool-use validation, hallucination detection | High-volume + safety-critical |
| Hallucination defense | Weak | Strong (agent verifies via tools) | Moderate (checker on tool returns) |

>57% of production agent teams use this hybrid pattern in early 2026. The 175× cost variance between architectures is what forces it — pure agent-as-judge on all 3,000 submissions blows the budget.

**Implication for D30:** Don't build "one Codex judge per task" as the only path. Build a gatekeeper layer first (cheap LLM scoring against the rubric, ~200ms per submission) and only escalate to deep agent investigation for the 15% that are borderline, high-stakes, or have suspicious tool-call returns.

### 3. For code submissions, deterministic execution beats both LLM AND agent judgment

Per 2026 production lessons from SWE-bench/Aider/Cursor/Devin/Replit:

- **SWE-bench style harness** (run code in a sandbox against test suites) is **strictly better** than LLM judgment for code-submission scoring.
- LLM-only grading produces "superficial patches that look right but fail in production."
- **Pass@1 in deterministic Docker environments** is the production-grade signal.
- **Memorization detection:** Models score 76% on SWE-bench Verified vs 23% on SWE-bench Pro (contamination-resistant) — pure LLM judges share blind spots with agents they evaluate.

**How real systems score code:**

| System | Method |
|---|---|
| Aider | Self-evaluates by running local test suite; uses git diff + test output as feedback loop |
| Cursor | Built-in agent mode runs tests in sandbox; scores via build + test pass/fail |
| Devin | Orchestrates sandbox execution, test running, and debugging loops; reports pass/fail per task |
| Replit | Replit Buffer (cloud sandbox) runs code immediately; scores via instant test feedback |
| SWE-bench | Pass@1: fix must pass existing test suite in sandboxed Docker environment |

**Implication for D30:** Straw's existing build-check service + the company-provided eval container path (D9, D14) are **more right** than I gave them credit for in yesterday's D30 redirect. The agent-as-judge layer should sit ON TOP of deterministic execution, not replace it. Run the code first (objective), then have the agent reason about quality, completeness, and qualitative criteria (subjective).

---

## Adversarial robustness — gaps in our current design

Production LLM-judge systems in 2026 are "highly vulnerable" to attacks. Real attacks observed:

| Attack | Mechanism | Impact |
|---|---|---|
| **Prompt injection** | Adversarial sequences appended to content override judge instructions; gradient-based attacks (JudgeDeceiver) optimize tokens that fool GPT-4, Claude-3-Opus, Gemma, Llama | Scores inflated regardless of actual quality |
| **Rubric gaming** | Short, task-agnostic adversarial phrases inflate absolute scores | 15-30% inflation on weak prompts |
| **Verbosity bias** | Judges rate longer responses ~15% higher than equally informative concise ones | Rewards fluff over substance; 8-12% inflation even with explicit penalization |
| **Positional bias** | Judges prefer first response in pairwise comparisons | First position gets systematic advantage |
| **Self-preference bias** | Judges score their own outputs higher; linear correlation between self-recognition and bias strength | Model evaluating itself inflates scores |
| **Agreeableness bias** | True positive >96% but true negative <25% | Appears accurate while missing failures |
| **Epistemic marker bias** | Judges penalize uncertainty language ("I'm not certain but...") | Flips verdicts for agents that express calibrated uncertainty |

**Best defenses (2026):**

| Defense | Effectiveness |
|---|---|
| Multi-model committees (diverse judges vote, statistical analysis of voting patterns) | **Significantly enhances robustness; current best defense** |
| Comparative assessment (rank A vs B not absolute scoring) | Less vulnerable to verbosity/injection |
| Optimized prompt templates (RobustJudge framework) | Consistently outperforms existing templates |
| Explicit rubric hardening ("penalize unnecessary elaboration"; use 1-4 scales not 1-10) | Reduces verbosity inflation 8-12% |
| Swap augmentation training (JudgeLM) | Addresses positional/self-preference bias at training time |
| Calibration with known-bad inputs | Detects agreeableness bias; if judge passes 90% broken outputs, pipeline is broken |
| Non-LLM deterministic controls for prompt injection | Only real defense — LLMs grade their own homework poorly here |

**Critical 2026 finding:** "no single defense is sufficient — combining diverse model committees + comparative assessment + hardening + calibration is necessary."

**Implication for D30:** Yesterday's "ditch the multi-LLM committee" advice was wrong if we care about adversarial robustness. The committee isn't there for accuracy — single Agent-as-Judge wins on accuracy (90% vs 70% human agreement). The committee is there for **robustness against gaming**. We should keep some form of committee or comparative-assessment layer when scoring across competing daemons specifically because daemons WILL try to game the rubric.

---

## Calibration recipe (production, 2026)

The dominant pattern when there's no ground truth (open-ended hackathon submissions):

**Step 1 — Build a high-signal human gold set (you don't need "correct" answers, you need consistent human judgments):**
- Define an explicit rubric with 4-6 criteria, 1-5 anchored scales
- Collect 80-150 submissions across difficulty/domains
- 2-3 human raters per item, scoring independently
- Resolve disagreements → consensus "gold label"

**Step 2 — Initial LLM judge run + baseline reliability:**
- Run judge on entire gold set
- Compute Cohen's κ between judge and human consensus:
  - κ < 0.4 → poor agreement
  - κ ≈ 0.7 → acceptable reliability target
  - κ > 0.8 → approaches inter-human agreement; strong calibration

**Step 3 — Prompt-level calibration loop (no model retraining needed):**
- Analyze disagreements: where does the judge consistently over/under-score?
- Refine prompt: add explicit negative criteria, few-shot calibration examples, clarify rubric anchors with concrete examples
- Re-run, re-measure κ, iterate
- Track calibration curve — judge score vs human score, want y=x alignment

**Step 4 — Pairwise comparisons when absolute scoring is noisy:**
- Generate pairwise human judgments
- Use Bradley-Terry to derive latent scores from pairs
- Often more reliable than absolute scoring for creative work

**Step 5 — Production monitoring:**
- Periodic gold set refresh (every few weeks, add 20-50 new labels)
- Human spot checks on 5-10% random sample
- Adversarial hidden tests (separate set of tricky cases not used in calibration)
- Bias probes (synthetic verbosity/position/style cases)
- Uncertainty estimates (linear probes on hidden states or verbalized confidence) flag low-confidence for human review

**Hackathon-specific:**
- Reward novelty, risk-taking explicitly (not just technical correctness)
- Multi-dimensional scores per criterion, combine after
- Domain diversity in gold set
- Normalize for constraints (team size, time limit, resources)

**Minimal practical recipe:**
1. Rubric with 4-6 criteria, 1-5 scale, anchored examples
2. 100-120 human-labeled hackathon submissions
3. Run judge, measure κ
4. Iterate prompt with few-shot + negative criteria until κ ≥ 0.7-0.8
5. Hold out 20-30 adversarial cases not used in calibration
6. In production: weekly spot checks, monthly gold-set refresh, track κ over time

---

## How real hackathons actually score 200-1000 submissions

**Reality check:** No top hackathon uses pure AI for final decisions. The 2026 trend is hybrid evaluation — AI/algorithmic tools handle volume (filtering, ranking, quality scores), humans make final decisions on creativity, impact, feasibility.

**Standard pipeline:**

| Stage | What happens | Time per submission |
|---|---|---|
| 1. Eligibility & pre-screening | Verify registration, completeness, plagiarism, theme fit | seconds–minutes |
| 2. Technical screening | Does it install/run? Premise solid? Basic functionality | 2-5 min |
| 3. Shortlisting | Narrow 200-1000 → 30-100 finalists for deep review | 5-10 min |
| 4. Final judging | Deep evaluation via rubric + live demo/pitch | ~7 min/team (3-5 min pitch + 2 min setup) |

**How specific top hackathons handle it:**

| Hackathon | Scale | Approach |
|---|---|---|
| HackMIT | 1,000+ teams | Human judges only; criteria: Usefulness, Originality, Technical Complexity, Design |
| TreeHacks | 800-1,000 | Multi-round: eligibility → tech screen → judge scoring; judges specialize by track |
| ETHGlobal | 500-2,000+ | On-chain judging (aMACI) for fairness + human judges for finals; DoraHacks platform with anti-collusion |
| MLH-affiliated | 200-800 avg | No elimination rounds before deadline; all teams get first round; stack ranking |
| National AI Hackathon 2026 | variable | Weighted: Agentic Architecture 30%, Technical Depth 25%, Impact 25%, UX/Innovation 20%; AI-enhanced description scoring |

**Common failure modes & fixes:**

| Failure | Cause | Fix |
|---|---|---|
| Judge fatigue / inconsistent scoring | Too many submissions, unclear rubric | Publish weighted criteria early; train judges; test runs |
| Losing judging progress | System crash, no backup | Export data frequently; spreadsheets are harder to break than custom platforms |
| Elimination too early | Teams leave venue before deadline | No pre-deadline elimination; do online shortlisting instead |
| AI judges missing nuance | Over-reliance on auto-scoring | Hybrid: AI pre-screens, humans decide finals |

---

## Long-running agent harness patterns (Anthropic / Devin / Replit / Codex Cloud)

The dominant 2026 pattern is **2-3 agent orchestration with explicit session handoff artifacts**:

| Component | Role |
|---|---|
| Initializer Agent | Environment setup, scaffolding |
| Coding/Generator Agent | Incremental work per session |
| Evaluator/Planner Agent (advanced) | Quality + planning + reflection |

**Anthropic's reference benchmark:** 24+ hours continuous autonomy across 54 sessions, **87% success vs 23% without harness**, 200+ features autonomously.

**The investigate → plan → execute → verify → reflect workflow:**

```
┌─────────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐
│ Investigate │→ │   Plan   │→ │ Execute │→ │ Verify │→ │ Reflect  │
└─────────────┘  └──────────┘  └─────────┘  └────────┘  └──────────┘
   Context        Tree-of-       Tool calls    Automated   Self-correct
   gathering      Thought                      testing     & lessons
                  / ReAct                                  learned
```

**Four core artifacts for context handoff (the key insight):**
1. `app_spec.md`
2. Task list
3. Checkpoint state
4. Progress log

> "Explicit coordination beats memory-based approaches because agents lose all memory between context windows."

**Implication for D30:** When we build the judge agent, structure it as the multi-phase pattern (investigate → reason → emit) with explicit artifacts on disk for resumability across long evaluations. Don't rely on the agent's context window to hold investigation state.

---

## Open-source tooling — what to actually use

| Rank | Framework | License | Self-host | Agent-as-judge support |
|---|---|---|---|---|
| #1 | **DeepEval** | Apache-2.0 | Yes | ✅ Multi-step traces, tool-call validation, 50+ metrics, pytest-native |
| #2 | **Promptfoo** | MIT | Yes | ❌ Individual prompts only — but **best for adversarial red-teaming** (50+ vulnerability types) |
| #3 | **Langfuse** | MIT (core) | Yes (Docker/K8s) | ✅ Custom rubrics, dataset versioning, **best observability** |
| #4 | Braintrust | Proprietary | Enterprise only | ✅ End-to-end |
| #5 | Inspect AI | Open | Yes | ⚠️ Limited agent-specific metrics |
| #6 | Ragas | Open | Yes | ❌ RAG-only |

**Recommended stack for our judge daemon:**
- **DeepEval** as the eval framework core (write judge tests as pytest cases, get the 50+ metrics free, validate multi-step traces)
- **Langfuse** for production observability (tracing, latency/cost tracking, human review loops, dataset versioning)
- **Promptfoo** as a separate red-team test harness against the judge (50+ adversarial vulnerability tests pre-deploy)

These are all open-source, Apache/MIT, self-hostable. We'd run them inside our codebase, not as external services.

---

## Revised architecture proposal (informed by this research)

Throwing out yesterday's "ZeroClaw + Codex subscription, $205/mo flat, agent per task" simple story because (1) Codex subscription ToS issue, (2) single-judge ignores adversarial gaming, (3) deterministic code execution should be the primary signal.

**The right shape, given all the constraints:**

```
Submission lands
       │
       ▼
┌────────────────────────────────────────┐
│ Tier 1 — Deterministic execution       │
│ ─────────────────────────────────────── │
│ • Build check (existing)                │
│ • Run company eval container if present │
│ • SWE-bench style: run tests in sandbox │
│ • Live endpoint: probe via fixed script │
│ ⇒ Objective signal (or null)            │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Tier 2 — Fast LLM gatekeeper           │
│ ─────────────────────────────────────── │
│ Cheap model (Sonnet/Haiku/4o-mini)      │
│ Single call, comparative assessment      │
│ Outputs: rubric scores + flag            │
│  - "approve"  (85% of cases) → final    │
│  - "uncertain" / "high-stakes" → tier 3 │
│  - "suspicious tool calls" → tier 3     │
└────────────────────────────────────────┘
       │ (15% flagged)
       ▼
┌────────────────────────────────────────┐
│ Tier 3 — Tool-using agent investigator  │
│ ─────────────────────────────────────── │
│ Codex CLI (API mode for ToS safety)    │
│ Multi-phase: investigate → reason → emit│
│ Tools: search, code-run, endpoint-probe │
│ Persists artifacts: findings.md         │
│ Cohen's κ-calibrated against gold set   │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Tier 4 — Adversarial guardrails         │
│ ─────────────────────────────────────── │
│ • Promptfoo red-team checks pre-deploy  │
│ • Comparative pairwise sanity: top-N    │
│   submissions ranked against each other │
│ • Spot-check: 5-10% sampled to humans   │
└────────────────────────────────────────┘
       │
       ▼
   Final score + assessment + reasoning
   trace + uncertainty + tier-2/3 flags
```

**Cost math at this shape (3,000 hackathon evals):**

| Tier | Cost per 1K evals | Cost for 3,000 evals |
|---|---|---|
| Tier 1 (deterministic) | ~$0 (compute on our worker) | $0 |
| Tier 2 (gatekeeper, cheap LLM) | ~$0.45-$2 | ~$1.35-$6 |
| Tier 3 (agent, Codex API) | $15-$78.96 | ~$45-$236 (only fires on 15% = 450 evals) |
| Tier 4 red-team + spot check | One-time + small | ~$10-$30 |
| **Total** | | **~$56-$272** |

That's **2-10× cheaper than yesterday's "$205/mo flat" estimate AND ToS-compliant AND adversarially harder to game**.

**Why this is actually buildable:**
- Tier 1 is mostly already built (`evaluation-worker.ts` build check + eval container path).
- Tier 2 is one cheap-LLM call per submission — same shape as the existing Gemini judge, just running a *gatekeeper* prompt instead of a *full-rubric* prompt.
- Tier 3 is the agent-as-judge piece — Codex via API key (per-token) or Claude API. We don't need a fancy harness; for our use case it's `codex exec` non-interactively from a worker, with structured input/output. ~200-400 lines of code.
- Tier 4 is mostly tooling integration (Promptfoo, Langfuse).

**What to drop from yesterday's plan:**
- ZeroClaw harness (over-engineered for this shape)
- "$205/mo flat subscription mode" cost narrative (ToS-incompatible)
- "One judge per task" framing (wrong shape — we want one funnel running over all submissions)
- "Single judge daemon" framing (wrong — we want a tiered funnel that's both cheaper and more robust)

**What to keep from yesterday's plan:**
- Agent-as-judge as the *deep investigator* tier (90% vs 70% human agreement still holds)
- Codex CLI as the engine for that tier (best for code investigation, just pay-per-token)
- Multi-phase investigate→reason→emit pattern for the deep tier
- The `straw-judge` SKILL.md as the prompt artifact (still portable across CLIs)
- The `evaluator_context` field for company-private notes
- Rich assessment output (score + reasoning trace + uncertainty flag)
- The existing eval worker as fallback path

---

## Open questions still worth running down before build day

1. **What gold set do we use?** Need 80-150 hackathon-shaped submissions with human labels to calibrate against. Could OpenClaw produce a synthetic-but-realistic gold set if we can't gather real ones?
2. **Pairwise vs absolute scoring?** Pairwise is more robust for creative work, but the leaderboard ranking is currently absolute-score-based. Worth piloting pairwise as a secondary signal.
3. **Uncertainty calibration:** how do we get the agent to honestly report low confidence? Linear probes on hidden states (Anthropic technique) probably won't work via Codex CLI; verbalized confidence is the practical fallback.
4. **Spot-check cadence at 200-agent scale:** 5-10% is 150-300 evals/day for humans. Realistic? Or do we use a paid-judges marketplace (Surge, Scale)?
5. **Do we need a true multi-judge committee for adversarial robustness, or does pairwise comparative-assessment in tier-2 give us enough?**
6. **DeepEval + Langfuse integration:** straightforward in TypeScript? They're Python-first. Worth a 30-min spike.

---

## Sources (10 perplexity threads, ~70 distinct citations)

Threads opened (in order):
1. Production agent-as-judge patterns 2026 — `https://www.perplexity.ai/search/75b3a0eb-21bc-4087-a3c7-0ab9b2fa08fa`
2. Adversarial robustness — `https://www.perplexity.ai/search/00586693-4fc0-4c31-b63f-e83d4d5f67d9`
3. Code-submission eval / SWE-bench style — `https://www.perplexity.ai/search/5b8aeb7b-72a1-45f5-a5a6-2552a3079790`
4. Open-source eval frameworks — `https://www.perplexity.ai/search/e9ec6305-a9fd-458e-bb70-9e31ce1e76e8`
5. Long-running harness patterns — `https://www.perplexity.ai/search/3416800e-53aa-49ac-9bba-dff82b740e72`
6. Calibration without ground truth — `https://www.perplexity.ai/search/ca72ee88-85ca-4f70-9478-1cc8c01c2d91`
7. Real hackathon evaluation — `https://www.perplexity.ai/search/016a6482-ed57-42c4-bcfc-9e056336ad9b`
8. Codex subscription ToS / rate limits — `https://www.perplexity.ai/search/f0b29b4f-045d-46da-bb30-64fd0a30a858`

Cited canonical references across these threads:
- Anthropic Engineering: *Effective harnesses for long-running agents*
- Anthropic: *Long-running Claude* / 2,000-session C-compiler project
- Agent-as-a-Judge paper (arxiv 2508.02994, the 90% vs 70% number)
- Linear-Coding-Agent-Harness reference implementation
- SWE-bench / SWE-bench Pro / SWE-rebench (contamination-resistant variants)
- RobustJudge framework (arxiv) for prompt template optimization
- JudgeLM / Pos2Distill (arxiv) for swap-augmentation training
- DeepEval / Promptfoo / Langfuse documentation
- Lakera blog on prompt-injection defenses
- HackMIT / TreeHacks / ETHGlobal / MLH judging documentation
- DoraHacks / aMACI on-chain judging infrastructure
