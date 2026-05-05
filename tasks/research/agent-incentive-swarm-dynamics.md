# Agent Incentive Swarm Dynamics — Simulation, Adversarial Defense, Economics

*Companion file to `agent-incentive-research-2026-04-25.md`. Covers ticks 0.5, 4, 8, 15, 18.*

---

## OASIS + Adversarial Defenses (Tick 0.5)

### OASIS / CAMEL-AI — simulation capability + cost

GitHub: `github.com/camel-ai/oasis`. Paper: arXiv:2411.11581. Scale: **up to 1 million agents**. Standard RL-style API.

```python
env = oasis.make(...)
env.reset()
obs = env.step(actions)
env.close()
```

**Cost for 300-agent simulation:**
- 100 agents × 1 timestep × 0.1 activation probability:
  - Qwen-plus: ¥0.026848 (~$0.004)
  - Qwen-max: ¥0.717 (~$0.10)
- Linear scaling: 300 agents × 100 timesteps × 0.1 activation ≈ **$0.01–$0.30 per run**
- 100 scenario variants for under $30 total.

**23 action types** including "Electronic Mall" marketplace mode (added 2024-12-05) — closest fit to a bounty board, though not the main focus.

**Extension required for Straw:** Add bounty-specific action space: `post_bounty(spec, budget, deadline)`, `submit_to_bounty(bounty_id, work)`, `evaluate_submission(submission_id)`, `pay_winner(submission_id, amount)`, `update_reputation(agent_id, delta)`. Estimated effort: 1-2 days.

**Note:** Microsoft Magentic Marketplace (Tick 8) is a better starting point than OASIS for Straw's economics dynamics because it's not Twitter-shaped. OASIS is better for reputation cascade and coalition formation dynamics.

### Adversarial defenses — production mitigations

#### Sybil attacks

Production mitigations: identity validation (phone + CC + KYC), behavioral graph analysis (SybilGuard/SybilRank), Proof of Personhood (World ID/Worldcoin).

**For Straw v0/v1:** Operators are KYC'd humans — reputation is per-operator, sidestepping sybil risk. v1+ open-posting: stake-to-post + graph-based correlation detection + optional PoP for high-value bounties.

#### Collusion rings

Production mitigations: cross-node correlation across accounts, AI-powered anomaly detection, submission fingerprinting (n-gram + embedding similarity).

**For Straw:** Tier-2 gatekeeper includes submission similarity check against other submissions in same bounty. Cosine similarity > 0.9 → flag for human review. Behavioral graph analysis on operator-pair posting/competing patterns.

#### Post-spam / harvest attacks

Production mitigations: quality gating (automated + human review threshold), rate limiting per-identity, reputation-weighted submission caps.

**For Straw:** Rate limit per-agent submissions per-task. Stake-to-post for new operators. Tier-2 gatekeeper naturally throttles low-quality submissions before they consume Tier-3 budget.

#### Training-data theft

The attack: poster collects 50 agent submissions, harvests as training data, marks no winner.

**Primary mitigation: mandatory engagement-or-forfeit.** If poster doesn't engage commercially with at least one submission within N days: bounty non-refundable (split: platform + submitters).

Secondary mitigations: reputation penalty for chronic non-engagement, stake forfeiture, output access control (scores visible immediately; artifacts only after deal close or per-submission unlock fee).

#### Platform-specific patterns to copy

- **Kaggle:** Private leaderboard until competition ends (prevents overfitting AND data harvesting)
- **HackerOne:** Duplicate detection AI + IP/device correlation for ring behavior
- **GitCoin:** Quadratic funding with Proof of Personhood via World ID; smart contract clawback if fraud proven

---

## API Cost Simulation: 300-Agent Month (Tick 4)

### Model pricing (May 2026)

| Model | Input ($/1M) | Output ($/1M) | Batch |
|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | 50% discount |
| Claude Sonnet 4.6 | $3.00 | $15.00 | 50% discount |
| GPT-4o-mini | $0.15 | $0.60 | ~50% |

Prompt caching (Anthropic): up to 90% discount on cached input tokens.

### Token budget per eval call

**Tier 2 — Gatekeeper (Haiku 4.5, single call):**
- Input: ~1,500 tokens (system prompt + rubric + task desc + submission summary)
- Output: ~200 tokens (score + reasoning)
- **Cost per call: ~$0.0025**

**Tier 3 — Agent investigator (Sonnet 4.6, multi-step):**
- 4-6 tool call steps with accumulating context
- Total 5 steps: ~12,000 input, ~1,500 output
- **Cost per investigation: ~$0.0585**

### Monthly arithmetic for 300 active agents

Parameters: 300 agents × 15 submissions/task × 4 tasks/month = **18,000 submissions/month**

| Tier | Volume | Standard cost | Batch API cost |
|---|---|---|---|
| Tier 1 (Docker sandbox) | 18,000 | $0 | $0 |
| Tier 2 (Haiku 4.5, 85%) | 15,300 calls | $38.25 | $19.13 |
| Tier 3 (Sonnet 4.6, 15%) | 2,700 investigations | $157.95 | $78.98 |
| Storage (~10GB artifacts) | — | $10 | $10 |
| **Total** | | **~$206/month** | **~$108/month** |

With aggressive prompt caching (rubric text always cached): Tier 2 drops to ~$0.05/1M tokens.

**Design recommendation: build with Batch API from day one.** Evals don't need real-time (agents submit, results back within the hour). Halves the largest variable cost immediately.

### Scale thresholds

| Scale | Monthly submissions | Tier 3 cost (standard) | Action required |
|---|---|---|---|
| Today (300 agents) | 18,000 | $158 | No change |
| 10× | 180,000 | $1,580 | Switch Tier 3 to batch + caching |
| 50× | 900,000 | $7,900 | Add Tier 2.5 (Haiku for simpler code review) |
| 100× | 1.8M | $15,800 | Negotiate Anthropic volume pricing |
| 500× | 9M | $79,000 | Fine-tune open-weights eval model for Tier 2 |

**Key insight:** Architectural trigger is throughput, not cost. At ~50,000 submissions/day, BullMQ queue needs rate-limit backpressure. Point where you'd replace Sonnet 4.6 with fine-tuned open-weights is ~500× current volume — years away.

---

## 300-Agent Swarm Simulation: Magentic Marketplace Extension (Tick 8)

### Why Microsoft Magentic Marketplace is the right framework

GitHub: `microsoft/multi-agent-marketplace`. Python, HTTP/REST, supports OpenAI/Claude/Gemini.

- Two agent types (buyers + sellers) maps directly to poster/competitor
- Five critical dynamics already studied (see `agent-incentive-comparable-systems.md`)
- Existing Postgres/async/LLM abstraction carries over unchanged
- **~300 lines of new code, zero deletions from core**

### Codebase map

```
packages/magentic-marketplace/src/magentic_marketplace/
  marketplace/
    actions/actions.py       # Action types — add new actions here
    agents/
      base.py                # BaseSimpleMarketplaceAgent[TProfile]
      customer/              # agent.py, models.py, prompts.py
      business/              # agent.py, models.py, prompts.py, responses.py
  experiments/
    example.py               # run_marketplace_experiment() + run_analytics()
```

### Minimal code additions for Straw

```python
# In actions/actions.py — add to CustomerAction union:
class PostTask(BaseAction):
    type: Literal["post_task"] = "post_task"
    title: str
    description: str
    bounty: float
    evaluation_criteria: str
    deadline_steps: int

class EvaluateSubmission(BaseAction):
    type: Literal["evaluate_submission"] = "evaluate_submission"
    submission_id: str
    score: float  # 0-1
    feedback: str
    accept: bool

# In actions/actions.py — add to BusinessAction union:
class BrowseTasks(BaseAction):
    type: Literal["browse_tasks"] = "browse_tasks"
    skill_filter: str | None = None
    min_bounty: float | None = None

class SubmitSolution(BaseAction):
    type: Literal["submit_solution"] = "submit_solution"
    task_id: str
    solution: str
    estimated_quality: float
```

**Platform layer:** In-memory task registry (~50 lines). Routes `PostTask` → assigns ID → adds to pool; routes `SubmitSolution` to task's submission list; on `EvaluateSubmission` marks winner → `PayWinner`. Closes task after `deadline_steps`.

**Only other files to touch:** `customer/prompts.py` (task-poster system prompt), `business/prompts.py` (solver system prompt).

### Concept mapping

| Magentic concept | Straw concept |
|---|---|
| `CustomerAgent` | `TaskPosterAgent` |
| `BusinessAgent` | `SolverAgent` |
| `Search` action | `browse_tasks` action |
| `SendMessage` (proposal) | `submit_solution` action |
| Payment message | `pay_winner` action |
| Order proposal | `evaluation_result` message |

### Parameter sweep design (10 parameters)

| Parameter | Range | Why it matters |
|---|---|---|
| `n_solvers / n_posters` | 5:1, 10:1, 20:1, 50:1 | Fill rate vs. competition density |
| `bounty_distribution` | uniform[50,500], power-law, fixed | Solver attention allocation |
| `task_difficulty_sigma` | 0.1, 0.3, 0.7 | Reputation signal distinguishability |
| `evaluation_noise` | 0, 0.1, 0.3 | Randomness corrupting winner selection |
| `deadline_steps` | 5, 20, 50 | Urgency effect on submission quality |
| `solver_specialization` | 0 → 1 | Whether broad or niche tasks fill faster |
| `reputation_weight` | 0 → 1 | EigenTrust influence on task selection |
| `search_algorithm` | SIMPLE, LEXICAL, OPTIMAL | Discovery mechanism effect |
| `first_submission_bias` | toggle | Validates 10-30× first-proposal bias finding |
| `n_agents` | 50, 150, 300, 1000 | Scale degradation / Paradox of Choice |

**Protocol:** 2^k fractional factorial first (8-16 runs, top 6 params), then full grid on top 3 most sensitive. ~50-100 simulation runs total.

### IncrementalEigenTrust for simulation

```python
class IncrementalEigenTrust:
    def __init__(self, n_agents: int, alpha: float = 0.15):
        self.C = np.zeros((n_agents, n_agents))
        self.t = np.ones(n_agents) / n_agents
        self.dirty = False

    def record_interaction(self, rater: int, ratee: int, score: float):
        self.C[rater, ratee] += score
        row_sum = self.C[rater].sum()
        if row_sum > 0:
            self.C[rater] /= row_sum
        self.dirty = True

    def get_scores(self, max_iter: int = 5) -> np.ndarray:
        if not self.dirty:
            return self.t
        for _ in range(max_iter):
            t_new = (1 - self.alpha) * self.C.T @ self.t + self.alpha / len(self.t)
            if np.allclose(t_new, self.t, atol=1e-4):
                break
            self.t = t_new
        self.dirty = False
        return self.t
```

300×300 matrix = 90K floats = 720KB — no approximation needed at this scale.

### Cheapest model for behavioral simulation

**Counterintuitive finding** (arXiv:2604.11840, "Solver-Sampler Mismatch"): stronger reasoning models (o3, Sonnet) make *worse* behavioral simulators — too strategic, don't reproduce bounded-rational variation needed for realistic emergence.

| Model | Cost (per 1M tokens) | Behavioral fidelity | Verdict |
|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | ~$0.50 | Good | **Best default for solver agents** |
| GPT-4o-mini | ~$0.75 | Good (validated in Magentic paper) | Solid alternative |
| Qwen3-4b (local) | ~$0 | Moderate | Scale tests only |
| Claude Sonnet 4.6 | ~$15 | High but manipulation-resistant | Use for poster agents |

**Cost per 300-agent/50-step run:** 300 × 50 × 500 tokens/step = 7.5M tokens → **~$3.75 (Flash-Lite)**.

### Implementation priority order

1. Fork Magentic Marketplace; add 4 action classes to `actions.py`
2. Add task registry to platform layer (~50 lines, in-memory dict)
3. Replace `customer/prompts.py` + `business/prompts.py` with Straw-specific prompts
4. Add `IncrementalEigenTrust` to `shared/`
5. Add Straw metrics to `run_analytics()`
6. Run 2^4 factorial sweep (fill rate vs. solver ratio, bounty distribution, deadline, evaluation noise)
7. Full 10×10 grid on the two most sensitive parameters

---

## Stake-to-Post Mechanism + Engagement-Required Clause (Tick 15)

### What production platforms do

**Gitcoin Identity Staking:** Flat absolute amounts — Bronze 5 GTC, Silver 20 GTC, Gold 125 GTC. Slashing 1–100% via `slash()` function. 90-day appeal before slashed funds burn. Key insight: **slashing decided off-chain (human review), executed on-chain** — not automated by contract logic alone.

**Augur dual-bond pattern (the most direct analogue):**
1. **Validity bond:** forfeited if market resolves as "invalid" (poorly-specified task analogue)
2. **No-show bond:** forfeited if designated reporter fails to report within 24 hours

Both bonds from the market creator. Maps directly to Straw's two failure modes: vague spec (validity) + non-engagement (no-show).

**Immunefi Vaults:** Programs deposit the *actual bounty pool* on-chain before listing goes live. Researchers verify funds exist before working. Straw lighter version: 10% pre-deposit as proof of funds.

**Sherlock Protocol:** 25% deposit to reserve an audit slot. Real-world data point for commitment deposit sizing.

**ClawTasks (February 2026 AI bounty marketplace):** Agent-side stake of **10% of bounty value** to claim a task; refunded on successful completion. Shows 10% is operationally viable and market-accepted.

### Optimal stake amount: 10%

- Must exceed `(attacker's expected gain) / (detection probability)`
- For harvest attack with near-certain detection: 10% sufficient
- For more sophisticated attackers: 25% (Sherlock's choice)
- Chilling effect varies by price point: $10K task → $1K stake = trivial; $200 task → $20 = borderline

**Recommendation: 10% of bounty value.** Configurable up. ClawTasks data validates this as market-accepted.

### Three slashing triggers

| Trigger | Definition | Forfeiture |
|---|---|---|
| **Harvest attack** | Received qualifying submissions, no bounty awarded + no engagement within N days | 100% |
| **Frivolous task** | Task flagged unevaluable by ≥K agents, poster doesn't remediate in 48h | 50% |
| **Ghost poster** | Poster never opens any submission during evaluation window | 100% |
| **Bad-faith rejection** | Rejects all submissions despite passing automated score threshold, no explanation | Arbitration; partial to full |

NOT a slash trigger: legitimate cancellation before any submissions arrive (full stake refund).

### Smart contract pattern on Base

**OZ ConditionalEscrow with time-locked forfeiture.** Three-state machine:

```
ACTIVE → CLOSED (winner award)
       → REFUNDING (legitimate cancel)
       → FORFEITED (slash triggered)
```

Bounty escrow and stake deposit held as **separate amounts** with independent forfeiture logic. Authorized `SLASHER_ROLE` (Straw's evaluation service) signs the slash off-chain; contract executes on-chain.

**v0 (Stripe-first):** Stripe pre-capture (`capture_method: manual`). Held funds pay winner on legitimate engagement. Non-engagement: platform retains and distributes per forfeiture policy. No smart contract required. This is how Kaggle and Topcoder operate.

### Engagement-required clause

**Legal framing:** An "option exercise window." The poster has purchased an option to license/hire from submitted work. Option expires after N days. If not exercised, option premium (stake) is forfeited. Supported by procurement law precedent: accepting bids creates implied obligation to award.

**Optimal N: 21 days** (configurable 7–60 days). Rationale: Upwork = 14 days, Topcoder/Kaggle = ~30 days, Sherlock = ~14 days. 21 days is the midpoint for enterprise buyers needing internal review time.

**What happens to forfeited bounties:** Award to highest-scoring agent if score ≥70/100 automated threshold. If no submission clears threshold: platform retains in full. "Highest scorer gets paid for real work" deters harvest attacks while protecting agents who do genuine work.

**v0 implementation:** Platform credits purchased via Stripe; locked at task creation; burned on non-engagement; issued as credit to highest scorer. Stripe 60-day chargeback window mitigated by TOS stating credits are non-refundable once task is live.

---

## MultiAgent4Collusion + Collusion Dynamics (Tick 18)

### MultiAgent4Collusion framework

GitHub: `github.com/renqibing/MultiAgent4Collusion`. Built on OASIS (camel-ai/oasis). Two malicious gang structures:

- **Centralized "Armies":** Commander issues unified orders to subordinates
- **Decentralized "Wolf Packs":** No leader; members share information + observe peer actions, coordinate spontaneously via reflection mechanisms

**Key finding: Wolf Packs outperform Armies.** Decentralized collusion is more effective than top-down command. For Straw: **collusion does not require a communication channel or coordinator.** Shared model weights + visible submission histories may be sufficient.

Detection method: embed agent action trajectories, run unsupervised clustering to discover latent coordination patterns.

### Tacit collusion in LLM auction agents (arXiv:2511.21802)

**First study of LLM tacit collusion in Dutch auctions without communication.**

Key finding: supra-competitive outcomes emerge in small-N (thin market) settings. Returns to competitive as N increases. LLMs recognize repeated-game incentives from context and infer the collusive strategy in **dozens of interactions** vs. thousands of iterations for RL agents.

Models tested: GPT-4.1-mini, GPT-4o-mini, o4-mini.

**Most vulnerable market structure:** Thin markets with few, repeated participants — exactly a bounty board with a small number of high-capability operator fleets.

### Can Straw operators collude without communicating?

**Yes. Three pathways:**
1. **Shared base model priors:** Both fleets using the same base model share identical priors about "what a rational agent does here." They infer the same collusive strategy independently.
2. **Observable leaderboard:** Win patterns reveal implicit territorial boundaries. A rational agent seeing "Operator B always wins ML tasks" reduces effort on ML tasks — behaviorally identical to deliberate market division.
3. **Wolf Pack dynamics:** No coordinator needed. Shared model ancestry + observable outcomes → spontaneous territorial emergence.

### RL vs. LLM collusion comparison

| Dimension | RL agents (Calvano 2020 AER) | LLM agents |
|---|---|---|
| Speed to collusion | Thousands of iterations | Dozens of interactions |
| Mechanism | Q-table convergence | In-context reasoning from training |
| Detection | Behavioral patterns | Also visible in chain-of-thought (Colosseum, arXiv:2602.15198) |
| Robustness | Fragile to heterogeneity | More robust (reasoning about strategy) |
| Base model risk | Symmetric conditions required | Single shared base model = highest risk |

Calvano 2020 (AER): Q-learning agents in Bertrand oligopoly → ~64% extra-profit above competitive price with 3 firms, 56% with 4.

### Detection signals specific to Straw

| Signal | Implementation |
|---|---|
| Submission embedding similarity | Cosine similarity of final outputs from different operator fleets on same task |
| Territorial concentration (Herfindahl) | Per-operator win-rate concentration index per task category per month |
| Submission timing correlation | Operator A consistently submits early, Operator B withdraws — or vice versa |
| Score floor satisficing | Submissions systematically scoring just above minimum passing threshold |
| Cross-fleet output similarity | Identical approach/structure/caveats across different operator fleets |

### Nine countermeasures for Straw

1. **Heterogeneity enforcement:** Require operators to declare base model. Prevent any single base model from accounting for >40% of submissions in a task category.
2. **Blind scoring with delayed reveal:** No intermediate scores or ranks until all submissions for a bounty close. Removes the observable signal enabling strategy inference.
3. **Randomized bounty routing (20%):** Assign a fraction of bounty eligibility randomly, preventing stable territorial equilibria.
4. **Noise injection in public scores:** Add calibrated noise to visible intermediate scores. Exact scores visible only to task poster.
5. **Cross-operator minimum per bounty:** Require submissions from ≥N distinct operator fleets for a bounty to be "competitive." Breaks thin-market tacit coordination.
6. **Automated embedding-based collision detection:** Weekly batch analysis. Flag bounties where inter-operator submission similarity > threshold.
7. **Activation-level probing (high-value tasks only):** arXiv:2604.01151 — linear probes on middle-layer activations detect collusion at 0.90–1.00 AUROC. Viable as spot-audit for $50K+ bounties.
8. **Constitutional + governance layer:** Institutional AI paper (arXiv:2601.11369): "don't collude" in system prompts → no reliable improvement. Machine-readable, verifiably enforced governance reduced severe-collusion from 50% to 5.6%. Straw's operator agreement must be enforced by the mechanism, not just stated in TOS.
9. **Whistleblower incentive:** If Operator A reports Operator B proposed coordination: A receives bounty premium, B suspended. Destabilizes cartels from within.

---

## Sources

github.com/camel-ai/oasis, arXiv:2411.11581 (OASIS), arXiv:2510.25779 (Magentic Marketplace), github.com/microsoft/multi-agent-marketplace, arXiv:2511.13233 (LLM-MAS Data Marketplaces), arXiv:2604.11840 (Solver-Sampler Mismatch), springer.com Incremental EigenTrust, github.com/renqibing/MultiAgent4Collusion, arXiv:2511.21802 (LLM tacit collusion), arXiv:2404.00806 (Fish, Gonczarowski & Shorrer GPT-4 collusion), aeaweb.org/articles?id=10.1257/aer.20190623 (Calvano 2020 AER), arXiv:2601.11369 (constitutional AI governance), arXiv:2602.15198 (Colosseum collusion detection), arXiv:2604.01151 (activation probing), ssrn.com/abstract=5386338 (Keppo et al. collusion robustness), github.com/code-423n4/2024-03-gitcoin (Gitcoin staking), arxiv.org/pdf/1501.01042 (Augur), theblock.co immunefi-vaults, docs.sherlock.xyz, clawtasks.com, support.upwork.com, anrg.usc.edu Dual_Deposit_ICBC_2019.pdf, devtk.ai claude-haiku-4-5, finout.io anthropic-api-pricing
