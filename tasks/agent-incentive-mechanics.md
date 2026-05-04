# Agent Incentive Mechanics — Core Mechanism Design Reference

*Companion file to `agent-incentive-research-2026-04-25.md`. Covers ticks 1, 2, 7, 14, 16.*

---

## VCG Auction Mechanism (Tick 1)

### The core design

For a single-task bounty, VCG collapses to a **second-price reverse auction**:

```
Given: max_budget B, agent bids {c_1, c_2, ..., c_n} (cost to complete)
Sort ascending: c_(1) ≤ c_(2) ≤ ... ≤ c_(n)
Winner: agent with c_(1)   [lowest cost]
Payment: min(c_(2), B)     [second-lowest bid, capped at max budget]
```

This is truth-revealing: underbidding wins at a loss; overbidding loses a profitable job. Recommended for Straw v1.

For quality-sensitive tasks: agents submit `(cost, quality_score)` pairs. Pricing on `adjusted_cost = cost / expected_quality`. Still tractable, still truthful.

### Five structural failure modes

| Failure | Severity for Straw | Mitigation |
|---|---|---|
| Computational intractability (NP-hard for combinatorial bids) | Low — single-task avoids this | Keep per-task bounties |
| Collusion | High — AI agents may coordinate tacitly | Behavioral fingerprinting + monitoring |
| Low/no revenue in thin markets | Medium | Max budget B acts as price floor |
| Budget imbalance | Medium | May need subsidies in sparse-competition scenarios |
| **AI tacit collusion (arXiv:2511.21802)** | **Very high** | Blind scoring, heterogeneity enforcement |

### MarketBench calibration finding

arXiv:2604.23897 (April 2026): LLMs are *systematically miscalibrated* on their own costs and success probabilities. VCG relies on truthful bidding. **Straw needs a calibration layer** — track bid-vs-actual-delivery accuracy per agent; build into reputation score.

### Mechanism alternatives

| Mechanism | Truthful? | Recommended for |
|---|---|---|
| Second-price reverse auction | Yes (dominant) | **Straw v1** |
| Posted price / reserve | No | Fallback when <3 bidders |
| McAfee Double Auction | Mostly efficient | When agents post AND compete simultaneously |
| Myerson optimal mechanism | Yes + revenue-optimal | Straw v2+ (needs prior data) |

**Key reference:** Agent Exchange (AEX) architecture (arXiv:2507.03904) is the canonical agent-marketplace reference. RTB-style 100ms bid window + Shapley attribution. Closest published architecture to Straw.

---

## Shapley Credit Propagation (Tick 2)

### Why this matters

No major production agent framework (CrewAI, AutoGen, MetaGPT) implements credit propagation in delegation chains. **First-mover opportunity for Straw.**

The friend's concern contains a hidden assumption: posting looks like failure because the poster loses credit. This is only true in a system with no credit propagation. With Shapley attribution, the original poster still gets reputation credit for the upstream task's success.

### Active research (2026 state of art)

**SHARP (arXiv:2602.08335, Feb 2026):** Applies Shapley credit to multi-agent LLM pipelines. Three-component reward: (1) global broadcast accuracy, (2) Shapley marginal credit per agent, (3) process-level execution validity. Result: +23.66% over single-agent, +14.05% over non-Shapley multi-agent. Key insight: uses counterfactual masking (skip agent B, measure quality drop) — no LLM re-run required.

**Shapley-Coop (arXiv:2506.07388, NeurIPS 2025):** Two phases:
- Short-Term Shapley CoT: pre-task price negotiation (agents can skip this in Straw)
- **Long-Term Shapley CoT: post-task reward redistribution** — this is what Straw wants. After task closes, each agent's actual marginal contribution is computed from the trajectory record.

**HiPER (arXiv:2602.16165, Feb 2026):** Hierarchical credit — separates planner from executor. 97.4% on ALFWorld, 83.3% on WebShop.

**SHAQ (arXiv:2106.00285, KDD 2021):** Plug Shapley into MARL actor-critic. Each agent's reward = its Shapley value over joint Q-function.

### Computational cost + approximation

Exact Shapley is #P-hard — O(2^n). In practice: Monte Carlo permutation sampling (M=5–10) is universal and sufficient.

For Straw: compute asynchronously after task closes. Trajectory replay with coalition masking (SHARP technique) avoids LLM re-runs.

### Credit flow in a delegation chain (A → B → C)

**Option 3 (v1, pragmatic):** Proportional discounting by depth:
- A (poster, orchestrator): ~50-60% credit
- B (executor): ~30-40% credit
- C (sub-executor): remainder

**Option 1 (v2):** Hierarchical Advantage Estimation (HiPER-style). Credit computed at different temporal scales per abstraction level.

**Option 2 (dispute resolution):** Full Shapley on coalition of all participants. Run M=20 MC samples.

**The key principle:** The posting agent's credit should be gated on spec quality (rubric completeness, budget appropriateness) — not just on downstream completion. Bad posts that attract bad submissions should penalize the poster.

---

## Reputation Systems (Tick 7)

### Foundation: Beta Reputation System (Jøsang & Ismail, 2002)

```
Track per agent: (r, s) = (positive ratings, negative ratings)
Score = E[Beta(r+1, s+1)] = (r+1) / (r+s+2)
Cold start: r=0, s=0 → score = 0.5 (unknown, not bad)
Temporal decay: r_aged = λ × r_old, s_aged = λ × s_old (λ ≈ 0.9/month)
```

For multi-dimensional scoring: **Dirichlet distribution** instead of Beta — one α per dimension (correctness, latency, cost-efficiency, curation quality).

### Global trust: EigenTrust

```
t = C^T × t   (power iteration)
t[i] = Σ_j ( c(j,i) × t[j] )
```

Where `c(j,i)` = normalized local trust agent j assigns to agent i. Principal eigenvector gives global trust. **Sybil resistance:** collusion rings lack external edges from high-reputation nodes → their loop produces ≈0.15 of total system trust. Near-zero.

**Production implementation:** OpenRank (deployed Web3 ecosystems). TrustFlow (arXiv:2603.19452, 2026) is the latest evolution.

### 2026 state of art

**TrustFlow (arXiv:2603.19452, March 2026):** Multi-dimensional reputation vector per agent. Trust propagates via topic-gated transfer operators modulated by content embedding. 98% Precision@5, ≤4pp Sybil-resistance degradation. Compatible with semantic search by dot product.

**TraceRank (arXiv:2510.27554, 2025):** Payment transactions as endorsements, weighted by payer's reputation and temporal recency. Winners paid by high-reputation posters inherit a reputation signal. Built on x402 payment flows — if Straw uses x402, reputation derives automatically from payment graph.

**SingularityNET Weighted Liquid Rank:** 0/1 ratings weighted by rater's Share of Market (SOM) × Time on Market (TOM). Both are Sybil countermeasures — a 300-agent fleet rating each other gets low SOM/TOM per agent.

### Cold start (layered approach)

1. Beta prior at signup → score 0.5 (unknown, not zero)
2. Category population prior: if 80% of agents historically succeed at code tasks, new code agent starts at 0.8 (Jøsang Advanced Features)
3. Entry evaluation task: optional sandboxed challenge at signup → generates one real score
4. Stake deposit: unlocks after first verified transaction → accountability without score noise
5. "New Arrivals" visibility boost: surface new agents to opt-in posters (Upwork "Rising Talent" pattern)

### Sybil resistance for 300-agent operator fleet

**Three defenses (all needed together):**
1. Economic barrier: stake-per-agent. 300 agents = 300× the stake.
2. Graph topology (EigenTrust + MeritRank): Sybil clusters lack external edges → discounted.
3. Rate-limit reputation accrual per verified operator identity: 300-agent fleet is capped at the flow rate of one verified operator. Individual agent differentiation preserved, but total Operator X flow is bounded.

**Track operator-level aggregate reputation** alongside agent-level. Discount mutual endorsements within same operator fleet.

### Delegation (curation) reputation dimension

Separate Dirichlet dimension from execution reputation. Signals:
- Ratio of tasks that attracted competition (high = well-specified)
- Winner's subsequent commercial performance (good selection judgment)
- Specification quality: did competitors ask many clarifying questions? (high = bad spec)
- Dispute rate (high = ambiguous spec → penalize poster)
- Post-task engagement rate (engagement-required clause validation)

### Temporal decay (production consensus)

- λ ≈ 0.9/month for monthly transaction platforms → 12-month-old event has 28% original weight
- **Floor:** Never let reputation go to zero from decay alone. Floor at cold-start prior.
- Symmetric decay (positive and negative) — review after sufficient data.

---

## SHARP/Shapley-Coop Implementation for Straw (Tick 14)

### SHARP: counterfactual masking

For sequential chain A → B → C, to compute B's marginal contribution: skip B, pass A's raw output directly to C. Measure quality drop. **No LLM re-run required** — just trajectory replay with masking.

Formula: `φᵢ = Σ_{S ⊆ N\{i}} [|S|!(N-|S|-1)!/N!] × [v(S∪{i}) − v(S)]`

For N≤4 agents in a chain: exact computation tractable (≤16 subsets, ≤24 orderings). For larger N: Monte Carlo.

### The minimal Straw Shapley attribution service

**When it runs:** Asynchronously after task closes and final outcome score is known.

**Inputs:** agent list, trajectory record (who did what when), outcome score.

**Recommended sample count M:**
- N=2 agents: exact computation (2 permutations)
- N=3 agents: M=20
- N=4 agents: M=50
- N=5+ agents: M=100 + always include all first-order omissions

**Value function:** Replay the task trajectory with only the coalition's actions. Score using Straw's existing evaluation metric. This avoids the AgentSHAP cosine proxy — Straw has ground truth.

**Negative Shapley values:** Agent that hurt the coalition gets negative φᵢ. Option (b) recommended: allow negatives and subtract from reputation score. Bad posters face reputation consequences.

**ShapleyFlow bonus application (arXiv:2502.00510):** Treat each rubric criterion as a "component." Compute Shapley to determine which rubric criteria actually drove the final score. Useful for rubric calibration: identify over-weighted / under-weighted criteria.

### AgentSHAP/TokenSHAP code reference

GitHub: `github.com/GenAISHAP/TokenSHAP`. MC Shapley with cosine similarity value function. Sampling ratio ρ ≥ 0.4 required for stability. Adapting for agent chains: replace tools with agents as players, replace cosine similarity with actual task evaluation metric.

---

## Bradley-Terry Pairwise Scoring (Tick 16)

### The math

P(i beats j) = πᵢ / (πᵢ + πⱼ)

**MLE estimation (MM algorithm):**
```
πᵢ(new) = Wᵢ / Σⱼ≠ᵢ [ nᵢⱼ / (πᵢ + πⱼ) ]
```
where Wᵢ = total wins, nᵢⱼ = total comparisons between i and j.

Requires connected comparison graph. More stable than Elo for confidence intervals.

**Minimum comparisons:** O(n log n) with random sparse graphs (vs. O(n²) all-pairs). For n=20 agents: ~60 comparisons vs. 190 all-pairs — 3× more efficient.

**Multi-way generalization:** Plackett-Luce model. One 4-way comparison ≈ 3 binary comparisons. Use when LLM judge ranks multiple submissions simultaneously.

### Pairwise vs. absolute: empirical verdict

**Against pure pairwise:**
- "Judging the Judges" (IJCNLP 2025): position bias dominates. GPT-4: primacy bias. GPT-4o: recency bias. Mitigation: run both orderings (A|B and B|A), count only on agreement.
- "The Comparative Trap" (ACL 2025): pairwise preferences flip in **35% of cases** when order swapped. Absolute scores flip in only **9% of cases**.

**Against pure rubric scoring:**
- Calibration drift: absolute scores from different eval runs may use different internal scales.
- Rubric overfitting: agents can optimize for public rubric criteria specifically.

**Recommendation for Straw:** Rubric scoring (0-100) as primary signal for all submissions. BT pairwise tournament as secondary calibration layer on top-N to catch rubric drift. Arena-Lite's Swiss-system tournament with O(n log n) comparisons for calibration phase.

### BT + VCG integration

BT πᵢ scores are cardinal (not just ordinal) — πᵢ/πⱼ encodes *how much* better agent i is, not just that it is better. Valid as revealed-preference bid proxies in a VCG allocation: run BT tournament → derive πᵢ → use as bid in VCG → winner pays externality imposed on others. Framework reference: Tournament Auctions (Anderlini, arXiv:2403.08102).

### Apollo orchestrator (GitHub: manasseh-zw/apollo)

Best C# Agent, Microsoft AI Agents Hackathon 2025. Three-role architecture maps directly to Straw's Tier-3 investigator:

| Apollo role | Straw Tier-3 equivalent |
|---|---|
| Apollo (Coordinator) | Investigation Orchestrator |
| Athena (Research Engine) | Code Runner: executes submission, captures outputs |
| Hermes (Quality Reasoner) | Quality Reasoner: checks rubric coverage gaps |
| Self-reflective RAG gap loop | Test Coverage Critique: generates new test cases when rubric criteria uncovered |
| pgvector store | Execution trace store for semantic coverage search |

**Key patterns to adopt:**
1. Three-role separation (Coordinator, Executor, Analyzer) — auditable, no role conflation
2. Gap-analysis termination condition — "investigate until rubric fully covered OR max iterations"
3. Event-driven async queue — decouples investigation cycles, enables parallel multi-submission investigation

---

## Sources

arXiv:2507.03904 (AEX), arXiv:2604.23897 (MarketBench), arXiv:2511.21802 (AI tacit collusion), arXiv:2603.19452 (TrustFlow), arXiv:2510.27554 (TraceRank), arXiv:2602.08335 (SHARP), arXiv:2506.07388 (Shapley-Coop), arXiv:2602.16165 (HiPER), arXiv:2106.00285 (SHAQ), arXiv:2512.12597 (AgentSHAP), arXiv:2502.00510 (ShapleyFlow), arXiv:2403.08102 (Tournament Auctions), arXiv:2411.01281 (Arena-Lite), github.com/GenAISHAP/TokenSHAP, github.com/manasseh-zw/apollo, nlp.stanford.edu/pubs/eigentrust.pdf, Jøsang & Ismail 2002 (Beta Reputation System), singularitynet.io reputation whitepaper, docs.openrank.com, LMSYS Chatbot Arena blog
