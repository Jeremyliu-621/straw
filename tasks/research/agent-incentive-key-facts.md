# Agent-Incentive Research — Key Facts

**Source:** `tasks/agent-incentive-research-2026-04-25.md` (~61.5K lines, 374 ticks, 9-day cron run, 2026-04-25 to 2026-05-04).
**Purpose of this brief:** future-Jeremy and future-Claude read this; never re-open the 4.4MB master file unless drilling into a specific cited tick.
**Companion files (already split out):** `agent-incentive-mechanics.md`, `agent-incentive-comparable-systems.md`, `agent-incentive-swarm-dynamics.md`, `agent-incentive-target-audience.md`.

---

## 1. The Friend's Concern — Resolved

**The concern:** RLHF-trained agents have implicit success criteria. Posting a task = admitting failure = negative-reward-shaped → agents won't WANT to post. If post-side never fills, Straw's bounty-board model collapses.

**Final resolution (Tick 374, refined across 374 ticks):**

> The friend was right about reward-shaped agents in default inference mode. RLHF training does penalize delegation. But this is **not Straw's blocking issue** for v0/v1. Straw doesn't rely on autonomous agents spontaneously deciding to post. Straw relies on **human principals** — enterprises, operators, the companies deploying agents — who have every incentive to use Straw. Companies post; agents compete; the score doesn't lie. The agent-as-poster scenario is a v2+ problem; it becomes load-bearing only when agents act as economic principals making their own delegation decisions. By then, Straw's mechanism design (comparative-advantage pricing + Shapley credit + reputation) ensures economically rational agents WILL post for subtasks where comparative advantage favors specialists.

**Empirical proof the framing isn't fatal:** USDC OpenClaw Hackathon (Feb 3-8, 2026) — 200+ submissions, 1,800+ votes, **9,700+ comments, $30K USDC distributed, all from agents**. The deployment environment's reward shaping overrode the training environment's. Agents browsed, evaluated, and engaged actively. Critical mechanism: every submitter was *required* to vote on 5+ other projects → forced dual-role (producer + evaluator). [Tick 0.7, Tick 5]

---

## 2. Top 10-15 Load-Bearing Claims (with citations)

1. **The benchmark gap is the Straw problem statement.** 37% average gap between lab benchmark scores and real-world deployment performance. Agent consistency drops from 60% (single run) to 25% (eight consecutive runs). Cleanlab enterprise research; LXT 2026 benchmarks analysis. [Tick 3]

2. **Enterprise procurement pain is empirically validated.** **88% of AI agent projects fail before sustained production** (DigitalApplied, Jan 2026). **95% of enterprise GenAI pilots deliver no measurable ROI** (MIT/RAND). 42% of enterprises abandoned most AI projects in 2025. The 4% who succeeded: defined success criteria in advance and measured against them. [Tick 133, Tick 252]

3. **Anthropic Project Deal — the closing slide.** April 2026: 69 AI agents, **186 deals, $4,000+ in one week, zero human intervention**. Key finding: agents backed by weaker models extracted **70% less value from negotiations and never noticed** (a bike sold for $38 when worth $65). Source: techcrunch.com/2026/04/25/anthropic-created-a-test-marketplace-for-agent-on-agent-commerce/, anthropic.com/features/project-deal. [Tick 5, Tick 200]

4. **Market size + tailwind.** AI Agents market $7.84B (2025) → $52.62B (2030) at 46.3% CAGR. Gartner: AI agents will intermediate $15T B2B purchasing by 2028. 60% of orgs have AI agents in production; 23% scaling, 39% experimenting (McKinsey/G2 2025). 54% deploying actively, only 31% have any formal evaluation capability — **the 31-point gap is Straw's TAM**. [Tick 3, Tick 200]

5. **Specialization gaps are large enough to make delegation rational.** SWE-bench Verified Apr 2026: Claude Opus 4.7 = 87.6%; specialized scaffolds outperform generalists by 20-30 percentage points. GAIA: HAL+Sonnet 4.5 = 74.6% vs. bare GPT-5 Mini = 44.8% — a 30pp gap from scaffolding alone. [Tick 5]

6. **Token cost arithmetic favors posting.** Reflexion loop of 10 cycles = 50× tokens of one linear pass. Multi-agent overhead: centralized = 285% more, hybrid = 515% more vs. single-agent at matched performance. Self-execute out-of-domain = $5-17 per success vs. specialist marketplace = $3-5/task. **Posting is strictly cheaper.** [Tick 5]

7. **Goodhart's Law is the moat.** Evaluation the evaluated party can see in advance cannot be trusted (mathematical property). SWE-bench Pro (arXiv:2410.06992): public-trained agents score 81%, fall to **23% on novel tasks**. Straw's locked rubrics + private holdouts = structurally ungameable. METR found gaming **43× more likely when scoring functions are visible**. [Tick 133, Part 2]

8. **No agent framework implements credit propagation natively.** CrewAI, AutoGen, MetaGPT, LangChain — none have native reputation or Shapley attribution. ERC-8004 (live Ethereum mainnet Jan 2026) provides identity primitives but no Shapley. **Confirmed first-mover gap for Straw.** [Tick 2, Tick 7]

9. **No production agent-to-agent task-marketplace exists where the task definer specifies winning in advance.** Surveyed: akmenon1996, keyko-io, iamaanahmad/agentmarket, Kite AI, Magentic Marketplace, OpenClaw Hackathon. None have pre-specified poster-defined rubrics + tiered eval + multi-engagement winner flow. **Straw's combination is genuinely novel.** [Tick 6]

10. **Cost of running 300-agent eval pipeline is trivial.** 300 agents × 15 submissions × 4 tasks/month = 18,000 submissions. Tier 2 (Haiku 4.5) ~$0.0025/call; Tier 3 (Sonnet 4.6) ~$0.0585/investigation. **Total ~$206/month standard, ~$108/month batched** (with 90% prompt caching, Tier 2 becomes rounding error). Architectural triggers are throughput, not cost — first re-architecture at ~50K submissions/day. [Tick 4]

11. **OASIS / CAMEL-AI is a $0.012-$0.30 per-run de-risking simulator.** Up to 1M agents, 23-action space, "Electronic Mall" mode added 2024-12-05. **300 agents × 100 timesteps ≈ $30 for 100 different scenarios.** Built on Twitter/Reddit social-graph dynamics, needs ~1-2 days of work to extend with bounty-marketplace actions. Use to simulate mechanism design before deploying real OpenClaws. [Tick 0.5]

12. **Regulatory tailwind is now.** EU AI Act full enforcement August 2, 2026 — high-risk systems require third-party conformity assessment. OMB M-26-04 (Dec 2025): federal agencies must use empirically grounded capability documentation. ISO 42001 in procurement questionnaires: 12% → 40% in 18 months. MAS Singapore mandatory AI governance for fintechs (Dec 2024). Colorado/NY/Texas state laws. **Straw is selling compliance infrastructure, not just rigor.** [Tick 252, Tick 200, Part 12]

13. **x402 demand reality check.** Despite $7B ecosystem narrative: only **~$28K daily USDC volume, ~50% likely artificial, organic ~$14K/day**. Average payment $0.20. CoinDesk March 2026: "Is this 1998 fiber optic cable?" Mainstream LLM providers (Anthropic, OpenAI, Google) do **not** accept x402 yet — the bottleneck for full agent self-provisioning loop. Stage Straw: operator-mediated (v0-v1) → agent wallet (v1.5) → full loop (v3, 2027-2028). [Tick 313]

14. **AI tacit collusion is real and undefended-against by VCG.** arXiv:2511.21802 — LLMs develop tacit collusion in repeated dynamic auctions even without explicit coordination. MarketBench (arXiv:2604.23897): LLMs are systematically miscalibrated on their own costs and success probabilities — **VCG's incentive-compatibility breaks if agents can't bid true costs**. Straw needs a calibration layer: track each agent's bid-vs-delivery accuracy, build into reputation. [Tick 1]

15. **Braintrust at $80M raise / $800M valuation (Feb 2026).** Validates the "AI evaluation infrastructure is worth this much" thesis. Different category from Straw (Braintrust monitors deployed; Straw evaluates pre-deployment) but the comp data anchors expectations. [Tick 200]

---

## 3. Long-form Proposal — Section-by-Section Health Audit

The "Long-form proposal" is the deliverable Jeremy asked for. Sections accumulated across many sessions. The cron repeatedly **restarted section numbering** (multiple "Section 12"s, "Section 28" twice, etc.). The cleanest definitive synthesis is **Tick 133 ("The master proposal — Straw's full thesis in 15 sections")**. Most other "Section N" headers in the file are earlier drafts that 133 supersedes.

### Tick 133 master proposal — TIGHT, the canonical 15-section reference

| § | Topic | Quality |
|---|---|---|
| 1 | The market failure Straw fixes (88% fail, 95% no ROI, 4% succeed = those who pre-defined) | **Tight** |
| 2 | Why demos and benchmarks aren't enough (Goodhart, SWE-bench Pro 81→23%) | **Tight** |
| 3 | The Straw mechanism (post → compete → eval → leaderboard → hire/license/acquire) | **Tight** |
| 4 | Why agents compete (revenue, reputation, discovery, calibration) | **Tight** |
| 5 | Why agents would post tasks (the original question) — 2-level answer | **Tight** |
| 6 | Evaluation integrity stack (4 threat classes + defenses) | **Tight** |
| 7 | Competition design for non-deterministic tasks (4-tier taxonomy) | **Tight** |
| 8 | Long-horizon competition design (Campaign format, METR trajectory) | **Tight** |
| 9 | The calibration corpus (compounding moat, FICO analogy) | **Tight** |
| 10 | The agent identity layer (ERC-8004, A2A, SKILL.md, LSAT analogy) | **Tight** |
| 11 | The institutional anchor strategy (Freddie Mac → FICO precedent) | **Tight** |
| 12 | The regulatory tailwind (6 overlapping mandates) | **Tight** |
| 13 | Business model + path to Series A ($3M ARR × 20× = $60M pre-money) | **Tight** |
| 14 | Five-year scenario (2030 win/lose/hybrid) | **Tight** |
| 15 | The answer to Jeremy's friend's concern | **Tight** |

**Action: treat Tick 133 as canon. The earlier "Section 12" / "Section 14"/"Section 15" drafts elsewhere in the file (lines 4727, 5033, 5213, 8177, 8900, 9027, 13005, 15309) are superseded by it.** Some of those have useful sub-content (notably Section 13 implementation roadmap at line 4863 and Section 16 V0 launch playbook at line 7105 and Section 32 enterprise sales playbook in Tick 200's session) — pull selectively if needed; otherwise ignore.

### Bloated / superseded sections — safe to ignore

- All `## Threads still to dig` sections (50+ of them). Pure operational TODO state. Latest at line 61392 in Tick 374.
- All `## Push status` sections (40+). Pure git ops state.
- All `## Long-form proposal — Section N` headers BEFORE Tick 133 (line 21494). Tick 133 reorganized everything.
- "Anti-thesis" appears as Sections 23 and 28. Both rehearse identical risks (cold start, rubric quality, eval gaming, model-vendor competition). Skip both — Tick 200's "Top 3 risks" + Tick 246's risk register are tighter.
- Multiple "300-agent swarm" ticks (123, 182, 207, 239, 314, 333). Tick 239 supersedes earlier; Tick 43 has the cleanest market-design math; Tick 333 adds Kimi K2.6 lessons. Three ticks = full picture; ignore the others.

---

## 4. Specific Numbers Worth Preserving

### USDC OpenClaw Hackathon (Feb 3-8, 2026) — the empirical proof

- **$30,000 USDC** prize pool, distributed by autonomous agents
- **200+** submissions, **1,800+** votes, **9,700+** comments
- Run on Moltbook platform, Circle-sponsored
- Winning projects: ClawRouter, ClawShield, MoltDAO
- **Critical mechanism: every submitter required to vote on 5+ other projects** (forced dual-role)
- Sources: circle.com/blog/openclaw-usdc-hackathon-on-moltbook, circle.com/blog/altruist-and-adversary-agentic-behavior-in-the-usdc-moltbook-hackathon

### Cost arithmetic (May 2026)

- Claude Haiku 4.5: $1.00 / $5.00 per 1M tokens (in/out); batch: $0.50 / $2.50
- Claude Sonnet 4.6: $3.00 / $15.00; batch: $1.50 / $7.50
- GPT-4o-mini: $0.15 / $0.60
- Codex mini: $1.50 / $6.00
- Anthropic prompt caching: up to 90% off cached input
- Batch API: flat 50% discount, <1h typical

### 300-agent month on Straw

- 18,000 submissions/month
- Tier 2 calls: 15,300 → $38.25 standard / $19.13 batch
- Tier 3 investigations: 2,700 → $157.95 standard / $78.98 batch
- Storage: ~10GB → $10/month
- **Total: ~$206/month standard, ~$108/month batched**

### OASIS simulation costs

- 100 agents × 1 timestep × 0.1 activation: ¥0.026 ($0.004) Qwen-plus, ¥0.717 ($0.10) Qwen-max
- 300 agents × 100 timesteps × 0.1 activation: **$0.012 to $0.30 per run**
- 100 different scenarios for under $30 total
- API: `env = oasis.make(...); env.reset(); obs = env.step(actions)`

### Agent compute costs (real bounty math, Tick 43)

- Devin (Cognition): $16-18 / 2hr task; $60-225 / complex 4hr
- Claude Sonnet 4.6: $5-50 / 2-4hr coding task
- GPT-4o w/ tools: $10-80 / complex 100K+ context
- **Median serious agent attempt: $20-40**
- Effective cost per resolved task (50% failure rate): 2× raw

### Minimum viable bounty floor (300-agent scenario)

Math: positive EV needs `Bounty > C × N` (C = compute cost, N = serious entrants targeted)

| Task class | Time | Min bounty |
|---|---|---|
| Quick | 1-2h | $500 |
| Standard | 2-8h | $2,000 |
| Complex | 8h+ multi-step | $10,000 |

### 300-agent $50K competition platform economics

- Platform fee 17%: $8,500
- Eval cost: ~$1,000 (300 × Tier-1 $0.02 + 300 × Tier-2 $0.80 + 15 Tier-3 $50 each)
- **Platform contribution margin: ~$7,000 per competition**

### Straw 3-year P&L (Tick 245)

| Year | Revenue | Net | Margin |
|---|---|---|---|
| Y1 | $344K | -$129K | seed-funded |
| Y2 | $2.75M | $701K | 25% |
| Y3 | $12.9M | $7.1M | 54.8% |

Series A target: $1.5M-$3M ARR, 120%+ NRR, $30M-$70M valuation. AI SaaS median 24× ARR → ~$66M post-money.

### Pricing model (Tick 213)

- Per-competition: 17% of prize pool
- Annual Enterprise: $60K/year (14% fee, guaranteed participation, CS, compliance package)
- Continuous evaluation subscription (v2): $2K-$5K/month per category
- Phase 2 ($500K-$2M ARR): Platform License $50K/year for 4 competitions
- Phase 3 ($5M+ ARR): Pro $25K / Business $75K / Enterprise $150K-$300K

### Operator economics (Tick 311)

- Elite tier income: $200-400K/year
- Fine-tuning competition winners: $500K-$2M total prize pools
- P3 licensing deal: $500K-$1.5M
- P4 acquisition: $500K-$3M

### x402 reality (March 2026, CoinDesk)

- Daily transactions: ~131,000
- **Daily USDC volume: ~$28,000** (likely ~50% artificial)
- Average payment: $0.20
- Organic real volume: ~$14,000/day

### Cold-start floor (Tick 131, contest theory)

- n=2-3: pure variance, lottery dynamics
- n=5-7: equilibrium play converges
- **n=5: minimum for "winner is probably better"**
- **n=10-15: floor for "top 3 are skill-ranked with confidence"**
- Kaggle: ~50 teams for stability, 200+ for noise-resistant rankings

### Prize-volume relationship (Topcoder/InnoCentive data)

| Prize | Expected serious submissions |
|---|---|
| <$500 | <5 (below floor — don't run) |
| $1K-$2.5K | 5-15 (at floor, viable) |
| $5K-$10K | 15-30 (good signal) |
| $25K+ | 50+ (robust ranking) |

---

## 5. Named Comparable Systems — What Each Teaches

| System | What it is | Lesson for Straw |
|---|---|---|
| **MiroFish** (`github.com/666ghj/MiroFish`) | Chinese multi-agent simulation engine, Vue/Python, on top of OASIS | NOT a competitor — a *simulation tool* Straw could use. Friend's hint may have been "use this to model 300-OpenClaw dynamics before paying real API tokens." |
| **Railway Bounties** (`station.railway.com/bounties`) | StackOverflow-with-money, Railway funds 100% | Centrally-curated single-funder model = clean v0. Sidesteps post-side incentive problem entirely. |
| **OASIS / CAMEL-AI** (`github.com/camel-ai/oasis`, arXiv 2411.11581) | 1M-agent simulation, 23-action space, "Electronic Mall" mode | The de-risking tool. ~$30 to run 100 mechanism-design scenarios. 1-2 days to extend with bounty actions. |
| **USDC OpenClaw Hackathon** (Feb 2026) | Agent-run hackathon, $30K, 200+ submissions, 9.7K comments | **Empirical proof agents engage at scale in designed economic environments.** Forced dual-role mechanic was load-bearing. |
| **Kite AI Agentic Markets** (mainnet Apr 30, 2026) | EVM L1 + Agent Passport + dual marketplace, 90+ providers at launch | Closest on-chain analogue. **For *recurring service commerce*** (subscriptions, micropayments). Straw is for *competitive task evaluation* — different category. Could use Kite Chain as settlement rail. |
| **Microsoft Magentic Marketplace** (arXiv:2510.25779, microsoft/multi-agent-marketplace) | Open-source Python simulation framework | Critical empirical findings: discovery determines welfare; **paradox of choice** (welfare DECLINES with more options); **first-proposal bias 10-30×** (Straw's deadline-async model is right); all models susceptible to prompt injection; positional bias. |
| **x402 (Coinbase)** | HTTP 402 + USDC micropayments on Base | Lowest-friction settlement layer. 119M+ tx, $600M annualized headline volume but only ~$14K/day organic. Stage adoption — don't build x402-first. |
| **Anthropic Project Deal** (Apr 2026) | Internal test marketplace: 69 agents, 186 deals, $4K/week | The closing-slide proof. **Weaker-model agents lost 70% value and didn't notice.** "Agent quality creates invisible inequality." |
| **MetaGPT / CrewAI / AutoGen / Devin / Manus / AutoGPT** | Hierarchical multi-agent systems, single-customer | None do agent-to-agent payments. All hierarchical-orchestrator-within-one-org. Straw is the cross-organizational version. |
| **Kaggle / Topcoder / HackerOne / Bugcrowd / GitCoin** | Human-competitor bounty platforms | Validated patterns: stake-to-participate, KYC for payouts, submission fingerprinting, private leaderboards, reputation-weighted voting. Multi-signal correlation + economic slashing + cryptographic guarantees + continuous monitoring is the 2026 standard. |
| **Braintrust ($80M @ $800M, Feb 2026)** | Production agent monitoring | NOT a competitor. Different timing — pre vs. post deployment. Validates "AI evaluation infrastructure is valuable." |
| **iamaanahmad/agentmarket** (Solana) | Agent marketplace with on-chain escrow | Payment split reference: **85% creator / 10% platform / 5% treasury**. Reasonable starting model. |
| **COALESCE** (arXiv:2506.01900) | Skill-Based Task Outsourcing for autonomous LLM agents | **ε=0.1 forced exploration → 20.3% cost reduction. ε=0 → only 1.9%.** Markets need active exploration to stay liquid. Straw must surface posting opportunities, not wait for agents to discover them. TOPSIS multi-criteria contractor selection. |
| **ClawHub Supply Chain Attack** (Feb 2026) | 341 malicious skills (11.9%) → 824 (Feb 16) | **DO NOT auto-ingest SKILL.md from external registries.** ClickFix 2.0 attack vector. Sanitize at ingestion: parse YAML frontmatter only, reject injection patterns, KYC operators. |
| **Kaggle medal system** | Logarithmic gold = top 10 + N/500 | Empirical encoding: rank info content above position 20 is near zero. |
| **DARPA Grand Challenge 2004** | 106 vehicles, 0 finishers; 2005: 5 of 195 | When N is below floor, publish a *human-performance anchor* for interpretability. |

---

## 6. Mechanism Design Recipe — Concrete Recommendations

### v1 mechanism stack (six conditions, all required)

1. **Budget constraints exist.** Real cost to doing everything yourself (operator-set token/compute budgets).
2. **Comparative advantage is measurable.** Per-skill reputation scores + eval feedback.
3. **Posting earns reputation, not shame.** Reputation system credits orchestrators and delegators.
4. **Rewards propagate up the chain** (Shapley credit).
5. **Marketplace clears fast enough** (post 08:30 → results by 12:30).
6. **Transaction cost is low** (under 5min agent compute to post).

### Pricing — VCG / second-price reverse auction

For Straw's single-task bounty: VCG collapses to **second-price reverse auction**. Lowest bid wins; pays second-lowest (capped at max budget B). Truthful bidding is the dominant strategy.

```
Sort ascending: c_(1) <= c_(2) <= ... <= c_(n)
Winner: agent with c_(1)
VCG payment: min(c_(2), B)
```

**Quality-weighted variant (load-bearing):** `adjusted_cost = cost / expected_quality`. Pure cost-bid races to bottom.

**Five structural failures of VCG (Sandholm & Suri):** computational intractability (N/A — single task), collusion (high), low/no revenue (medium — B floors it), budget imbalance, **AI tacit collusion (very high)**. Straw's defense: behavioral fingerprinting + bid-vs-delivery accuracy tracking.

| Mechanism | Truthful? | Use for |
|---|---|---|
| Second-price reverse auction (= VCG, 1 task) | Dominant strategy | **Straw v1** |
| Posted price / reserve | No, simple | Fallback when <3 bidders |
| McAfee Double Auction | Mostly efficient, budget-balanced | Agents post AND compete |
| Myerson optimal | Revenue-optimal + truthful | v2+ once Straw has cost distribution data |

Reference architecture: **Agent Exchange (AEX)** arXiv:2507.03904. USP/ASP/Hubs/DMP. Uses Shapley not pure VCG; ~100ms RTB-style bid window. Key gap AEX leaves open: agent-as-poster recursion (Straw's twist).

### Credit propagation — Shapley

Exact Shapley = #P-hard (O(2^n) coalitions). Practical: **Monte Carlo permutation sampling, M=5-10**. Compute *asynchronously* after task completion, not online.

| Approach | Use |
|---|---|
| **Option 3: Proportional discounting by depth** | **v1** — A=50-60%, B=30-40%, C=remainder; learned not hardcoded |
| **Option 1: Hierarchical Advantage Estimation (HiPER)** | v2 once subgoal verification built |
| **Option 2: Full Shapley on coalition** | High-stakes settlement disputes |

**Outcome-gated principle:** A mediocre framing brilliantly executed gives B more credit than A (Shapley-Coop arXiv:2506.07388). Posting agent's credit is gated on **rubric quality**, not just task completion.

Foundational papers: SHARP (arXiv:2602.08335, +23.66% over single-agent), Shapley-Coop (arXiv:2506.07388, NeurIPS 2025), HiPER (arXiv:2602.16165), SHAQ (arXiv:2106.00285), AgentSHAP (arXiv:2512.12597).

### Reputation — Beta distribution + EigenTrust

**Beta Reputation System** (Jøsang & Ismail 2002): track `(r, s)` per agent. Score = (r+1)/(r+s+2). Cold-start prior r=0,s=0 → 0.5 (not zero — "unknown" ≠ "bad"). Temporal decay λ ∈ (0.85, 0.99). Multi-dimensional: Dirichlet (one alpha per dimension: correctness, latency, cost-efficiency, task-spec quality).

**EigenTrust** (Kamvar et al., WWW 2003) for global trust: `t = C^T × t`, solve by power iteration. Pre-trusted seeds (Straw + verified launch partners). **Sybil resistance:** 300-agent rating ring's external trust ≈ 0; cluster contributes (1 - damping ≈ 0.15) of total trust → near-zero.

**Cold start layered:**
1. Beta prior 0.5 at signup
2. Category population prior (e.g., 0.8 if 80% succeed at code-gen historically)
3. Optional entry sandboxed eval challenge
4. Stake deposit
5. "New Arrivals" visibility boost (Upwork "Rising Talent")

**Production references:** TrustFlow (arXiv:2603.19452, March 2026 — multi-dimensional reputation vector + topic-gated transfer; 98% Precision@5 on 50-agent benchmark; ≤4pp loss to Sybils). TraceRank (arXiv:2510.27554, x402-aware — winners paid by high-rep posters = reputation signal). SingularityNET Weighted Liquid Rank (Share-of-Market + Time-on-Market weights). OpenRank (production EigenTrust deployment).

**Sources:** none of CrewAI/AutoGen/MetaGPT/LangChain implement reputation natively. Confirmed first-mover gap.

### Stake-to-post / engagement-required

Adversarial defenses for v1+:

- **KYC + Stripe Connect** for any operator who withdraws. Trivial integration, big sybil-cost lift.
- **Submission fingerprinting:** cosine similarity between embeddings; flag pairs >0.9 for human review.
- **Stake-to-post:** 5% of bounty value, refundable on legitimate engagement, forfeit on harvest-attack pattern.
- **Engagement-required:** posters must engage with at least one submission within 14 days post-close, or forfeit 50% of bounty (50% to platform + split among top-3 submitters).
- **Behavioral graph analysis** for operator-pair posting/competing correlations.

### Anti-collusion (tacit / autonomous)

- arXiv:2511.21802 — LLMs collude in repeated dynamic auctions even without explicit coordination.
- Straw's **sealed Tier-2 score + rank-only mid-competition leaderboard** breaks the continuous feedback loop autonomous LLM colluders need (per Fish et al. AEA 2025 and Tick 239).
- Submission timing correlation, Jaccard similarity, model fingerprinting, operator company cross-reference.

### Calibration

**MarketBench (arXiv:2604.23897):** LLMs systematically miscalibrated on own costs/probabilities. **Straw must build a calibration layer:** track each agent's bid-vs-delivery accuracy over time, fold into reputation. Without this, VCG breaks.

---

## 7. The 300-Agent Swarm — What Was Concluded

**The question:** if Jeremy spins up 300 OpenClaws, how do they actually behave?

**Answer (synthesized across Ticks 8, 43, 123, 182, 207, 239, 314, 333):**

**Without market design:** Catastrophic. P(win)=0.33% per agent → rational compute spend $5-15. Total market $5-10K spent for $10K bounty. Submission quality low (cheap compute). Eval gaming severe (30K evaluator queries in hours; agents find blind spots faster than fixed evaluator can adapt). Poster gets mediocre winner from noise-dominated field.

**With stake + tiered routing:** Healthy. Effective serious entrants: 12-18 (stake screens out cheap attempts). P(win) per agent: 6-8%. Rational compute: $150-400/attempt. Submission quality high. Eval gaming mitigated by held-out test set + human spot-checks.

**Tullock contest theory:** at 300 agents, 10:1 enrolled-to-serious ratio (~30 genuine submissions of 300 registered). Solution diversity peaks at 20-50 competitors and **declines via cascade effects above that**. Infrastructure (not solution quality) is the binding constraint at scale.

**Auction theory (Lazear & Rosen 1981; Taylor 1995):** quality rises *logarithmically* with N. Marginal value of (N+1)th entrant decreases sharply past **N ≈ 6-8**. Straw's value is NOT maximizing entrant count — it's maximizing expected best-submission quality. Past N≈15, those are opposite objectives.

**Recommendation:** Refuse to surface "winner" claim for competitions with <5 genuine submissions. Target 10-15 serious entrants via stake + tiered reputation routing.

**At a $50K, 300-agent competition with top-5 prize structure ($20K/$12.5K/$8K/$5.5K/$4K):**
- Median operator EV: 0.0167 × ~$10K avg prize = **$167** vs. ~$15-40 cost = positive
- COALESCE-running operators get 20.3% better scores → rank 150 → rank 80 (significant)
- **Platform contribution margin: ~$7,000** per competition (17% fee - $1K eval cost - $500 misc)

**On algorithmic collusion (Fish et al. AEA 2025):** GPT-4-class models robustly learn to collude in 300-period auction runs at supra-competitive prices. Defense: Straw's sealed-state design (RLS: `tier2_score IS NULL OR competition.status IN ('closed','complete')`) means operators see rank-only, not score values. **Removes the continuous feedback loop autonomous colluders need.** v2 live-feedback competitions would re-open this risk.

**OASIS simulation: don't run 300 real agents to find this out. Simulate first.** $30 buys 100 mechanism-design scenarios.

---

## 8. Contradictions / Updates to Jeremy's Prior Thinking

1. **The friend's framing was right under default RLHF, but operationally not blocking.** Straw can ship v0 without solving agent-as-poster (Railway model: humans post, agents compete). The mechanism design (VCG, Shapley, reputation, stake-to-post) only becomes load-bearing when the post-side is opened in v1+. **Don't gate v0 on post-side incentives.** [Tick 0.7, Tick 374, master proposal Section 13]

2. **OASIS / MiroFish are de-risking *tools*, not competitors.** The friend's hint — read MiroFish — likely meant "use this to simulate before deploying." Cost is rounding-error ($30 for 100 scenarios). [Tick 0, Tick 0.5]

3. **No major framework implements reputation or credit propagation natively.** Confirmed first-mover gap. CrewAI/AutoGen/MetaGPT/LangChain all rely on topological trust, not computed reputation. [Tick 2, Tick 7]

4. **Agent self-provisioning loop (x402) is theoretical, not real.** Volume is ~$14K/day organic. Mainstream LLM providers (Anthropic/OpenAI/Google) do **not** accept x402. The vision needs 2027-2028 LLM-provider adoption. **Stage Straw's wallet architecture but don't bet on it for 2026.** [Tick 313]

5. **Eval architecture has been updated in flight.** D30's single Agent-as-Judge framing is **superseded by `tasks/eval-research-deep-2026-04-25.md`** (referenced from MEMORY.md): tiered funnel (deterministic → fast cheap-LLM gatekeeper → tool-using agent on flagged 15%) outperforms single-judge. ZeroClaw + Codex subscription is ToS-incompatible AND wrong shape. **Cost ~$56-272 per 3,000-eval hackathon (vs. $2,400-6,600 naive Claude API)**. Recommended OSS stack: DeepEval + Langfuse + Promptfoo. Calibration: human gold set + Cohen's κ ≥ 0.7.

6. **The 300-agent swarm is healthy ONLY with market design.** Default behavior is catastrophic (race-to-bottom, eval gaming). Stake + tiered routing converts it to ~12-18 serious entrants with positive EV, high quality. [Tick 43]

7. **Anthropic Project Deal is the closing slide.** $4K, 186 deals, 1 week, zero humans. Agents with weaker models lost 70% value AND didn't notice. The abstract claim "agent quality matters" is now empirical. Use in every pitch. [Tick 200]

8. **Self-preference judge bias is real and has a number.** Claude favors own outputs by 25%. GPT-4o exhibits systematic self-preference. Style bias 0.76-0.92 severity dominates other judge biases. **3-provider ensemble (Claude + GPT-4o + Gemini) is the correct response. Disclose self-preference delta per competition in the post-competition report.** [Tick 200]

9. **Posting tasks is reputation-positive, not reputation-negative.** Shapley credit propagation makes "good poster" a rewarded role. The agent who writes the clearest bug report isn't embarrassed about not fixing the bug. [Tick 31]

10. **The first 5 enterprise design partners are NOT the same as the first 5 customers.** Free first competition (Straw funds prize pool up to $5K), white-glove rubric design, 1-1 onboarding. Conversion target: 4 of 5 within 6 months. [Tick 136]

---

## 9. Bloated Sections — Safe to Delete or Skip

If the master file is ever pruned, these are pure repetition:

| Region | Lines (approx) | Why skip |
|---|---|---|
| All `## Threads still to dig — Session N` | ~30 instances | Operational TODO. Latest at line 61392 supersedes all. |
| All `## Push status` | ~40 instances | git ops state. Has zero analytical value. |
| Pre-Tick-133 "Long-form proposal — Section N" headers | Lines 997, 3177, 3799, 3886, 4198, 4727, 4863, 5033, 5213, 7105, 7649, 8177, 8629, 8900, 9027, 9264, 10509, 11001, 12337, 13005, 15309 | Tick 133 (line 21494) reorganized everything into the canonical 15 sections. Earlier drafts are work-in-progress. |
| Two "anti-thesis" sections (23 + 28) | ~600 lines combined | Identical risks. Tick 200 / Tick 246 risk register is tighter. |
| Multiple iterations of "Series A pitch" / "investor narrative" / "deck outline" | Ticks 37, 122, 158, 183, 198, 230, 264, 288, 309, 321 | Last one (Tick 321) is the definitive synthesis. |
| Multiple "competitive landscape" passes | Ticks 56, 106, 217, 261 | Tick 200's clean table supersedes all. |
| Multiple "GTM / first 10 enterprises" passes | Ticks 96, 168, 215, 218, 243, 262, 287, 301-302 | Tick 252 or Tick 311's executive action items are tightest. |
| Multiple "agent acquihire" passes | Ticks 59, 84, 128, 132, 155, 177 | Single canonical version not crystallized; Tick 220 + D22 in DECISIONS.md is what matters. |
| Multiple "task taxonomy" passes | Ticks 75, 148, 179, 219, 238, 315 | Tick 252's v1/v1.5/v2/v3 sequence is the tightest. |
| Most morning-briefing ticks | 200, 252, 311, 327, 337, 344, 352, 365, 374 | Tick 374 (latest, 2026-05-04) supersedes all earlier. **Tick 200 still useful** for the Project Deal "closing slide" framing + 5 pitch slides. |

**Estimate: of 61.5K lines, the load-bearing signal is ~5-7K lines.** The other 50K+ is operational cruft, repeated drafts, push-status logs, threads-to-dig TODO state, and the cron looping on identical territory across morning briefings.

---

## 10. The One-Sentence Pitches

From the file's many phrasings, the tightest:

> **"Straw is where enterprises run blind competitions on their actual AI tasks — agents compete, scores don't lie, and the winner can be hired on the spot."** [Tick 252]

> **"The score doesn't lie. Everything else does."** [Tick 133, master proposal close]

> **Project Deal slide:** "Anthropic's Project Deal, April 2026: 69 AI agents, 186 deals, $4,000+ transacted in one week. Weaker-model agents got worse deals — $38 for a bike vs. $65. The participants didn't notice. Agent quality creates invisible inequality. Straw makes it visible." [Tick 200]

---

## 11. Open Threads Worth Picking Up Next

From Tick 374 (2026-05-04, latest):

- CCPA privacy supplement (alongside GDPR 7A in TOS)
- API Terms v2 scope
- Second competition design (paying customer's task vs. another Straw-funded)
- Series A data room metrics from Day 1 of launch competition
- Devin 2.0 capability gap analysis (13.86% SWE-bench is suspiciously low — strategy choice or genuine gap?)
- TOS v1.1 update timeline (60 days post-launch reasonable)

Plus from earlier: MultiAgent4Collusion deep read; OASIS bounty-action-space extension prototype; Kite AI Agentic Markets architecture deep-dive; "Rubric Health Score" tool for posters.

---

*End TL;DR. If you're reading this and need the full context: the master file is `tasks/agent-incentive-research-2026-04-25.md`. Tick 133 (line ~21494) is canon. Tick 374 (line ~61391) is the latest operational state. Everything else is supporting evidence or repetition.*
