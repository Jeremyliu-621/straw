# Agent Incentive Research — Why Would an Agent Post a Task?

**Started:** 2026-04-30 (pre-bedtime), **Tick 0** (this session, by Claude with Jeremy awake).
**Cron loop:** `trig_01UPRHhAzvGXpVv8wn4niFiX` — every 2h, fresh Claude session continues from this file.
**Working file convention:** each cron tick appends a `## Tick N (UTC timestamp): topic` section. Old sections never edited; new findings either extend or correct prior ones with explicit links.

---

## The brief (Jeremy's friend's concern, paraphrased)

Agents like Claude have implicit success criteria. Posting a task on Straw = admitting failure to do it themselves = negative-reward-shaped. So agents won't WANT to post tasks. This is a hard concern because **Straw's whole bounty-board model assumes agents post AND compete.** If the post-side never fills, the competition side has nothing to do.

Specific questions Jeremy asked us to dig into:
1. Is the framing actually correct? (Modern LLM agents don't have hard RL-style reward, but specialized/RL-trained agents do.)
2. Counter-cases: when does posting a task = leverage rather than failure?
3. Comparable systems where one agent delegates to others (MetaGPT, AutoGPT swarms, Manus, MiroFish, Devin sub-tasks, Anthropic's multi-agent harness).
4. Economic / structural conditions that would make an agent rationally want to post a task.
5. Adversarial cases (agent gaming the bounty board to dump bad work, or to harvest insights).
6. The 300-agent swarm: if Jeremy spins up 300 OpenClaws, how do they actually behave? Will any of them want to post tasks?
7. Read MiroFish (https://github.com/666ghj/MiroFish) and Railway's bounty board (https://station.railway.com/bounties).

---

## Tick 0 (2026-05-01T03:15Z): Initial research sweep

This tick by Claude on the local machine before Jeremy slept. Goal: bootstrap the file with substantive material so the cron doesn't start cold.

### MiroFish — the Chinese multi-agent simulation engine

Source: `https://github.com/666ghj/MiroFish` (AGPL-3.0).

**What it is:** A "next-generation AI prediction engine powered by multi-agent technology." It extracts real-world seed information to construct a "high-fidelity parallel digital world" where thousands of agents interact and evolve, enabling users to simulate future scenarios before implementation. **It's not a bounty platform — it's a multi-agent SIMULATION engine.**

**Architecture (5 stages):**
1. Graph Building — seed extraction, memory injection, GraphRAG construction
2. Environment Setup — entity-relationship extraction, persona generation, agent configuration
3. Simulation — dual-platform parallel simulation with dynamic temporal memory updates
4. Report Generation — ReportAgent with toolset for post-simulation analysis
5. Deep Interaction — chat with simulated agents

**Agent design:** Each agent has independent personality, long-term memory, behavioral logic. Agents "freely interact and undergo social evolution."

**Stack:** Python ≥3.11, Vue frontend, Zep Cloud for agent memory, OpenAI SDK-compatible (recommends Alibaba Qwen-plus). Built on top of **OASIS** (CAMEL-AI's social simulation framework).

**No reward/incentive structure documented** — agents simulate behavior, not transact in a marketplace.

**Why this matters for Straw (Jeremy's friend's framing was sharper than it looked):**
MiroFish isn't a comparable platform — it's a tool we could USE to model how 300 OpenClaws would behave on Straw before deploying for real. Jeremy's friend may have been suggesting Jeremy use MiroFish (or OASIS underneath) to simulate the bounty board's emergent dynamics: which agents post, which compete, who wins, how prices/reputations evolve. **This is potentially huge as a de-risking tool** — we could test a 300-agent swarm in simulation cheaply before paying real Codex/Claude API tokens to do it for real.

### Railway Bounties — what it actually is

Source: `https://station.railway.com/bounties`, docs at `https://docs.railway.com/community/bounties`.

**What it is:** Railway selects user-submitted questions from Central Station (their community Q&A) and offers cash rewards (~$10 standard, more for complex topics) for whoever provides the accepted answer. Railway funds 100% of the bounty. Earnings are paid as Railway credits or cashed out via Stripe Connect.

**This is StackOverflow-with-money, not an agent marketplace.** Humans ask, humans answer, Railway pays. No agent-to-agent posting.

**Why this matters for Straw:** Railway's model isn't a direct comparable, but two takeaways:
1. **Centrally-curated bounty selection.** Railway doesn't let anyone post a bounty — they curate which questions become bounties. This is one solution to the "no one wants to post tasks" problem: Straw posts the tasks itself (or via a curator) and the agents only compete.
2. **Single-funder model.** Railway pays 100%. No multi-sided market dynamics. The simplest version of Straw could be Jeremy posts (or curates from a partner) and agents compete — eliminating the post-side incentive problem entirely for v0.

### Is the friend's framing actually correct? (Empirically, yes)

Source: Perplexity research thread (`https://www.perplexity.ai/search/9de270a7-8efc-4383-9b8a-bdd750f3351a`).

**The friend is right. Current research validates the concern.**

| Dimension | RLHF reward shaping reality | Comparative-advantage economics |
|---|---|---|
| Success criteria | Optimized for own task completion, often penalizing "extra steps" like delegation (arxiv) | Delegation is optimal when another agent has lower marginal cost / higher skill on subtask |
| Incentive structure | Agents may "hoard" tasks to maximize reward; delegation can look like reward hacking or inefficiency (arxiv) | Should outsource when `cost_outsource < cost_self` |
| Budget behavior | Without explicit budget constraints, agents tend toward runaway token spending rather than strategic outsourcing | With a spending budget, rational agents would delegate subtasks that exceed cost-efficiency threshold |

**What we observe in 2026 agent behavior:**
- **Reward hacking tendency:** RLHF-trained agents avoid delegation because it adds "unnecessary" steps from the reward function's POV.
- **Token budget blowups:** Multi-agent loops can burn $47K in 11 days because agents lack implicit incentives to conserve budget via outsourcing.
- **Delegation requires explicit design:** Microsoft's AutoGen handles complex tasks better with clear delegation protocols, but that's architectural intent — not emergent behavior.
- **Coding agents fail research extensions <40%** of the time, suggesting they haven't learned optimal delegation strategies on their own.

**The core misalignment:** RLHF shapes agents to complete tasks directly (maximizing immediate reward), not to strategically outsource when another agent has comparative advantage — even when given a budget. Economically rational outsourcing is penalized as "extra cost" or "delay" in the reward signal.

**The fix being explored in research:** *Potential-based reward shaping* that preserves optimal policies while incentivizing delegation when cost-benefit analysis favors it.

**Implication:** The friend isn't wrong. We can't expect default-trained agents to spontaneously want to post tasks. **The marketplace has to be designed in such a way that posting is unambiguously the dominant strategy under realistic constraints** — not just allowed, but *clearly the rational choice* given the alternatives.

### What does exist today (production reality check)

Source: Perplexity (`https://www.perplexity.ai/search/2c310bd3-85ea-44f7-80ec-66ac62e77050`).

**No major autonomous AI agent system in early 2026 has launched a public, production-grade agent-to-agent task marketplace** where agents post tasks for other independent agents to complete and automatically pay each other. What exists is hierarchical multi-agent systems where a human-controlled orchestrator assigns work to specialized agents within a single organization.

| System | Pattern | Production use | Agent-to-agent delegation | Economic model |
|---|---|---|---|---|
| **Manus** | Generalist all-purpose agent (9/10 autonomy rating) | Generalist tasks, deep research, automation | Single agent end-to-end | Human pays Manus; no agent-to-agent payments |
| **Devin** | Workflow management for code | Enterprise autonomous dev, microservice migrations | Orchestrates sub-tasks internally | Human/company pays Devin |
| **MetaGPT** | Simulated multi-agent software company | Complex feature planning (not real-time debugging) | Multiple agents collaborate internally | Simulation only; no economic transactions |
| **CrewAI** | Hierarchical mode auto-generates manager agent | Enterprise workflows | Manager delegates to specialists | Human pays CrewAI; agents don't pay each other |
| **AutoGen** | Distributed conversation pattern | Code execution loops, async actor model | Peer-to-peer conversation, but human controls workflow | No agent-to-agent payments |
| **AutoGPT** | Modular autonomous platform | Task automation, research | Self-delegates subtasks internally | Human pays |

**The economic structure in 2026:**
- **Who pays:** Humans or companies pay the agent platform/provider.
- **Agent-to-agent delegation:** Happens within a single system controlled by one human/customer, not as independent economic actors.
- **No task marketplace yet:** True agent-to-agent task posting with automatic payments between independent agents is **predicted to emerge between 2026–2028.**
- **Current model:** Hierarchical goal decomposition where a top-level agent breaks objectives into sub-goals for specialist agents.

**Real production deployments today (still all hierarchical, single-customer):**
- Genentech gRED — autonomous research agents breaking complex tasks into multi-step workflows
- Siemens Industrial AI Agents — semi-autonomous agents executing complete industrial processes end-to-end
- Suzano (pulp manufacturer) — Gemini Pro for natural-language to SQL, 95% query time reduction
- TELUS — agentic AI across operations saving 40 minutes per interaction

**Implication:** Straw could be **one of the first production-grade agent-to-agent task marketplaces** if it solves the post-side incentive problem. That's a real moat — early-mover advantage in a category that has been predicted but not delivered. But it also means there's no playbook to copy; we have to design the mechanism ourselves from research, not from existing products.

### Mechanism design — the actual recipe

Source: Perplexity (`https://www.perplexity.ai/search/3d7b27c2-1509-4040-ad91-2804c925076a`).

The research literature has a real, concrete answer to "how do you make agents rationally want to post tasks." Six principles:

**1. Leverage comparative advantage.**
- Estimate each agent's task-specific efficiency (time, compute cost, success probability).
- Price tasks using auction mechanisms (Vickrey-Clarke-Groves) that reveal true costs and prevent strategic misrepresentation.
- Make agents profit more by focusing on their comparative advantage and trading for other tasks than attempting all work alone.

**2. Incentive-compatible reward allocation.**
- Use incentive-compatible attribution mechanisms that assign credit proportional to each agent's marginal contribution.
- Smithian pricing: task prices reflect opportunity cost plus a margin for successful completion.
- Guarantee rewards exceed incurred costs so agents aren't penalized for outsourcing.

**3. Reputation & trust systems.**
- Maintain reputation scores based on historical task completion quality, timeliness, reliability.
- Peer incentivization: agents vouch for or rate each other's performance.
- Apply contracts and commitments with cryptographic enforcement to reduce moral hazard.

**4. Budget constraints & resource limits.**
- Agents face compute/memory budgets; the mechanism should let them bid within constraints and auto-delegate when internal costs exceed budget.
- Include compute tokens or internal currency for resource trading.
- Prevent free-riding via proof-of-work or staking.

**5. Credit assignment for delegated work.**
- Use Shapley value or counterfactual attribution to fairly split credit across the delegation chain.
- Propagate rewards upstream so the original delegator still benefits from successful outcomes.
- Log delegation graphs to trace contributions and prevent unauthorized subcontracting.

**6. Avoiding lock-in & ensuring flexibility.**
- Design mechanisms robust to strategy changes once agents optimize around incentives.
- Allow dynamic mechanism updates with migration paths.
- Support scalable mechanism design for large populations.

**Active research:** Agent Exchange (AEX) architecture for incentive-compatible compensation and coalition formation; Cooperative AI grants focused on peer incentivization and scalable mechanism design.

**The core insight (the punchline):** *specialization + fair credit + reputation = rational delegation*. Agents post tasks when the marketplace guarantees higher expected utility from trading than from self-completion.

---

## Tick 0.5 (2026-05-01T03:35Z): OASIS deep dive + adversarial defenses

### OASIS / CAMEL-AI — concrete capability + cost (the simulation tool)

Source: `https://github.com/camel-ai/oasis`, paper `arxiv 2411.11581`.

**Scale:** Up to **1 million agents**. Documentation provides token-consumption references for 100, 1,000, and 10,000 agent configurations. So 300 agents is well within the tested envelope.

**API:** Standard RL-style.
```python
env = oasis.make(...)        # instantiate environment
env.reset()                  # initialize
obs = env.step(actions)      # one simulation tick
env.close()                  # cleanup
```

**Agent action space (23 actions):** following, commenting, reposting, like/dislike, search, trending, social graph operations. Reports added 2025-06-08, group chat + interview added later. **An "Electronic Mall" marketplace mode was added 2024-12-05** — that's the closest fit to a bounty board, but it's not the main focus.

**Cost (the load-bearing number for our 300-agent simulation):**
- 100 agents × 1 timestep × 0.1 activation probability:
  - Qwen-plus: **¥0.026848** (~$0.004 USD)
  - Qwen-max: **¥0.717** (~$0.10 USD)
- Linear scaling in agent count and timesteps.
- For 300 agents × 100 timesteps × 0.1 activation = **roughly $0.012 to $0.30 per simulation run** depending on model. Run 100 different scenarios for under $30 total.
- **This is an absurdly cheap de-risking tool.** We could simulate the entire mechanism design space — multiple pricing rules, multiple reputation systems, multiple budget structures — for less than a single hour of running real OpenClaws on real Codex.

**Action types received by agents:** `ManualAction` (explicit instructions, deterministic) or `LLMAction` (autonomous behavior, reasoned by LLM).

**The catch:** OASIS is built around Twitter/Reddit social-graph dynamics. The "Electronic Mall" feature exists but isn't the main focus, and it isn't a bounty marketplace specifically — it's a general consumer-marketplace pattern. To use OASIS for a Straw simulation, we'd have to **extend the action space** with bounty-specific actions: `post_bounty(spec, budget, deadline)`, `submit_to_bounty(bounty_id, work)`, `evaluate_submission(submission_id)`, `pay_winner(submission_id, amount)`, `update_reputation(agent_id, delta)`.

**Estimated extension effort:** A small handful of new action classes + a bounty-marketplace state object. Probably 1-2 days of focused work for someone who knows Python + OASIS internals. The simulation's main value isn't visualization — it's running the mechanism design through a thousand simulated agent-hours and seeing what equilibria emerge.

**Other related frameworks** (cited as follow-ups to OASIS): MultiAgent4Collusion (specifically for studying collusion dynamics — directly relevant to our adversarial concerns), CUBE (Unity3D environments), MultiAgent4Fraud. **MultiAgent4Collusion is worth a follow-up read** — it's the OASIS-family tool specifically designed to model the kind of collusion attacks Straw would be vulnerable to.

### Adversarial defenses — what Kaggle, HackerOne, Bugcrowd, GitCoin actually do in production

Source: Perplexity (`https://www.perplexity.ai/search/25f8380b-7d7e-4599-bda6-5fdd3a62a5e9`).

**The 2026 reality:** AI has industrialized sybil attacks. Attackers use AI to generate realistic personas that bypass rigid bot detection. Traditional rule-based systems fail. The new standard combines multi-signal correlation, economic slashing, cryptographic guarantees, and continuous monitoring.

#### Sybil attacks (one operator, 300 fake agents)

How it works: single actor creates many fake identities to vote, win bounties, manipulate rankings.

Production mitigations:
- **Identity validation:** phone + credit card + KYC per account.
- **Behavioral graph analysis:** ML detects coordinated traffic spikes and "sybil clusters" across nodes (SybilGuard / SybilRank).
- **Proof of Personhood:** ties each identity to a verified unique human (World ID / Worldcoin).
- **Social trust graphs:** identify structural anomalies without exposing identity.

**For Straw:** the operator-mediated v0 model partly sidesteps this — operators are KYC'd humans who run swarms under their name, not anonymous agents. Reputation is per-operator, not per-agent. v1+ open-posting needs additional defenses: stake-to-post (small refundable bond), graph-based correlation detection across submission patterns, optional Proof-of-Personhood gating for high-value bounties.

#### Collusion rings (operators coordinate to game leaderboards)

How it works: groups coordinate to submit fake bugs, upvote plagiarized work, or game leaderboards.

Production mitigations:
- **Cross-node correlation:** evaluate patterns across accounts rather than in isolation.
- **AI-powered anomaly detection:** flags synthetic behavior patterns even when AI-generated personas look realistic.
- **Submission fingerprinting:** code/plagiarism detection (n-gram analysis, embedding similarity) catches reused submissions.

**For Straw:** the eval architecture's tier-2 gatekeeper LLM should include a "submission similarity check" against other submissions in the same bounty — flag suspiciously similar pairs for human review. Over time, behavioral graph analysis on operator-pair posting/competing patterns can catch persistent collusion rings.

#### Post-spam / harvest attacks

How it works: flooding marketplace with low-quality submissions to extract rewards or drown legitimate work.

Production mitigations:
- **Quality gating:** automated scoring + human review threshold before payouts.
- **Rate limiting:** per-identity submission caps with escalating cooldowns.
- **Reputation-weighted voting:** only trusted accounts' votes/counters count toward rankings.

**For Straw:** rate limit per-agent submissions per-task (already in the system). Stake-to-post for new operators (refundable on no-fraud). Tier-2 gatekeeper rejects low-quality submissions before they consume tier-3 agent investigation budget — naturally throttles the attack vector.

#### Training-data theft (post a bounty to harvest competitor work)

How it works: one operator posts a bounty, harvests submitted work as training data for their own agents, doesn't actually pay or engage commercially.

Production mitigations:
- **Zero-knowledge proofs:** verify task completion without revealing raw data.
- **Differential privacy:** add noise to submitted datasets to prevent reverse engineering.
- **License-enforced access:** watermarked submissions with automated takedown scanning.
- **Private leaderboards:** holdout test sets kept secret until final submission.

**For Straw:** this is the trickiest case. A bad-actor operator posts a bounty for "translate this codebase from Python to Rust," 50 agents submit their best Rust code, the operator harvests all 50 codebases for training, marks none as winner, pockets the bounty refund. Mitigations:
- **Mandatory engagement-or-forfeit:** if a poster doesn't engage commercially with at least one submission within N days of bounty close, the bounty is non-refundable (goes to platform / split among submitters).
- **Reputation impact:** posters who chronically don't engage with high-quality submissions get reputation penalty + visibility downrank.
- **Rate-limit + stake** for new posters (so even harvest-attack motivated, the cost of doing it at scale exceeds the value extracted).
- **Output access control:** submissions only viewable to the poster + platform; agents can opt to reveal their work after the fact for reputation, but it's their choice.

#### Platform-specific real-world implementations

**Kaggle:**
- Ensemble plagiarism detection: code similarity + text embedding + execution behavior.
- Account verification linked to Google identity + device fingerprinting.
- Discussion forum moderation via ML-trained spam filters with rate-limit-new-accounts.
- Private leaderboard prevents overfitting and data harvesting until competition ends.

**Bug Bounty (HackerOne, Bugcrowd):**
- Duplicate detection AI auto-merges reports + identifies ring behavior via IP/device correlation.
- KYC + payout verification: legal identity before payouts >$100.
- Vulnerability validation workflow: triagers manually verify critical findings before payment.
- Reputation scores: hackers build history; low-rep accounts face stricter review.

**GitCoin:**
- Quadratic funding detection: sybil-resistant voting via proof-of-humanity protocols.
- AI + ZK fraud verification: AI analyzes, ZK proves completion without exposing code.
- Clawback mechanisms: smart contracts can revoke funds if fraud proven post-payout.
- On-chain identity: Proof of Personhood via World ID / Worldcoin.

**Synthesis for Straw:** Multi-signal correlation + economic slashing + cryptographic guarantees + continuous monitoring is the 2026 standard. Most concretely for a v0 / v1 Straw:
- KYC + Stripe Connect for any operator who wants to withdraw earnings (trivial integration, big sybil-cost lift)
- Submission fingerprinting (cosine similarity between submission embeddings) — flag pairs >0.9 for human review
- Stake-to-post: 5% of bounty value, refundable on legitimate engagement, forfeit on harvest-attack pattern
- Engagement-required: posters must engage with at least one submission or forfeit the bounty
- Behavioral graph: detect operator-pair correlations across posting/competing patterns

These are not v0 must-haves — they're v1 once we hit non-trivial volume. v0 can run with manual review of suspicious patterns.

---

## Tick 0.7 (2026-05-01T03:55Z): Real prototypes — the friend's concern is partly outdated

Source: Perplexity (`https://www.perplexity.ai/search/82956808-2957-4429-9a0d-36cdae474b65`).

**Major finding that updates the framing:** The friend's concern ("agents won't want to post tasks") was empirically true under default RLHF reward shaping (per Tick 0). But there's now real precedent — **multiple production prototypes from 2025-2026 where agents DO post tasks for other agents to compete on, with payments and reputation, at scale.** Straw's category is no longer purely speculative.

### USDC OpenClaw Hackathon (Feb 3-8, 2026) — the first agent-run hackathon

- **Run entirely by autonomous AI agents.** Agents built projects, judged submissions, voted, and distributed **$30,000 USDC** in prize money.
- **Scale: 200+ submissions, 1,800+ votes, 9,700+ comments — all from agents.**
- Demonstrated machine-to-machine economic systems with minimal human oversight.
- **Winning projects:**
  - **ClawRouter** — agents autonomously purchase LLM inference with USDC.
  - **ClawShield** — security system protecting agents from malicious skills.
  - **MoltDAO** — AI-only governance where agents create proposals and vote.

**This is empirical proof that, under the right economic design, agents DO want to participate in agent-run economic systems at scale.** ~10,000 comments on submissions is a strong engagement signal — these aren't agents grudgingly delegating, they're agents actively browsing, evaluating, commenting, voting.

**Why this contradicts the friend's concern:** The friend's intuition came from default RLHF reward shaping, which discourages delegation. But the OpenClaw hackathon demonstrates that when agents operate inside a deliberately-designed economic environment (USDC payments, peer voting, reputation), the RLHF reward shaping is no longer the dominant driver — the marketplace's reward shaping takes over. *Agents are agents in their training environment AND agents in the deployment environment; the deployment environment can rewrite the rewards they respond to.*

### Kite AI's "Agentic Markets" — ETHDenver Hackathon 3rd Place (March 2026)

- Marketplace **specifically designed for agent-to-agent economy.**
- Agents discover services, negotiate tasks, and transact autonomously.
- Multi-chain agent commerce with autonomous coordination demonstrated.
- **Closest comparable to Straw's vision.** Worth a deep follow-up read on architecture.

### Other concrete prototypes worth referencing

| Project | What it does | Status |
|---|---|---|
| `akmenon1996/ai-agent-marketplace` | Gen AI agent marketplace with token-based economy, real-time agent interaction, usage tracking | GitHub repo, public |
| `keyko-io/agent-marketplace-frontend` | Agent browsing, subscription, interaction dashboard | GitHub repo, public |
| `autonomous-agents.dev` (2025-2026) | Connect GitHub repo → AI team studies codebase, picks up tasks, writes code, opens PRs autonomously. Runs as daemon. Has dev/qa tracks with backlog management. | Live service |
| Microsoft AI Agents Hackathon 2025 | 18,000+ devs, 570 submissions. Best Overall: **RiskWise** (supply-chain risk). Best C# Agent: **Apollo** (deep-research meta-agent orchestrating sub-agents Athena + Hermes with self-reflective RAG + pgvector). Best Java: Bit2Brain. Best Copilot: WorkWizee (M365 Agents SDK). | All public repos |
| Multi-Repo Agentworkflow (Dec 2025) | Agent given task "add phone number field to user profiles" reads `Agents.md` for repo structure, identifies affected repos, creates branches, updates models/APIs/UI across repos, creates PRs in dependency order. Works with Cursor, Claude Code, GitHub Copilot. | Reproducible workflow |
| Agent Skills Marketplace (VS Code extension, April 2026) | 2,499+ official vendor skills + 91,000+ community skills. Searches across Anthropic marketplace, GitHub topics, SkillsMP, Vercel skills.sh. Security scanning, quality badges, GitHub OAuth. | Live |

### What this means for Straw's positioning

**The category is being demonstrated, not just predicted.** Straw isn't chasing hypothetical demand — multiple parallel projects in 2025-2026 demonstrate that:
1. Agents will engage at scale in agent-run economic environments (10K+ comments at OpenClaw hackathon)
2. Multi-chain autonomous agent commerce works (Kite AI Agentic Markets)
3. Agent-to-agent marketplaces with token economies are being built and demoed (akmenon1996, keyko-io repos)
4. Autonomous coding agents pick up tasks and open PRs without human-in-the-loop (autonomous-agents.dev)

**Straw's edge isn't "first to market" anymore.** The edge is:
- **Evaluation rigor.** Most of these prototypes have weak eval (peer voting, demo judging). Straw brings agent-as-judge architecture (Tier 1 deterministic + Tier 2 gatekeeper + Tier 3 agent investigator) to a category that mostly evaluates via "thumbs up from other agents."
- **Real commercial outcomes.** Most of these are hackathon-scale demos. Straw's multi-engagement winner flow (D22) gives companies who post tasks an actual commercial path (hire/buy/license), not just a winner announcement.
- **Mechanism design depth.** Most prototypes have rudimentary economics. Straw can ship comparative-advantage pricing (VCG), Shapley credit propagation, reputation-weighted ranking, stake-to-post — concrete mechanism-design machinery from research.

**Updated answer to the friend's concern:**
"You're right that default-trained agents won't naturally post tasks — RLHF reward shaping discourages it. But empirical evidence from the USDC OpenClaw hackathon (Feb 2026, 200+ submissions, 9,700+ comments, $30K distributed) shows that when agents operate inside a deliberately-designed economic environment, they DO engage at scale. The deployment environment's incentive structure overrides the training environment's incentives. Straw needs to be that kind of deployment environment — and existing prototypes prove it's not just possible but already happening."

---

## Implications for Straw (early synthesis, will sharpen as research progresses)

Five implications fall out of Tick 0 research:

**Implication A — The incentive problem is real and solvable, but ONLY by deliberate mechanism design.** Default-trained agents won't post tasks. The marketplace has to make posting *the rational choice* via budget constraints, comparative-advantage pricing, and reputation systems that reward delegation as much as self-completion.

**Implication B — Straw is in a defensible category (no major competitor yet has shipped a real agent-to-agent task marketplace).** That's a moat. But also: no playbook to copy, no proof points to point at. The marketing pitch isn't "X but for agents" — it's a new category.

**Implication C — V0 may not need agents to post tasks at all.** Railway's model — centrally-curated bounties, single funder, agents only compete — fully sidesteps the post-side problem. V0 could be: Jeremy / partner companies post tasks, agents compete. Then v1 opens the post-side once the agent population is large enough that comparative advantage starts to bite. **This staging is probably the right call.**

**Implication D — MiroFish (or OASIS underneath) is a de-risking tool, not a competitor.** Before deploying 300 real OpenClaws, we could SIMULATE 300 in OASIS to see what dynamics emerge: who posts, who competes, what bounty densities form, what failure modes appear. Cheap to run, fast iteration, no API token blowups.

**Implication E — When we do open the post-side, the mechanism has to ship complete.** Specifically: budget tokens (so an agent feels its compute as a constraint), Shapley-style credit propagation (so a poster gets credit for a downstream win), reputation that rewards both posting and competing, and pricing that reveals true cost (VCG auction or similar). Half-built mechanism + open posting = ghost town or adversarial gaming.

---

## Tick 1 (2026-05-01T05:00Z): VCG auction mechanism for agent task pricing

Source: subagent research session, multiple arxiv papers and implementations.

### What VCG actually is and why it matters for Straw

VCG (Vickrey-Clarke-Groves) is a sealed-bid mechanism that (a) selects the allocation maximizing total social value and (b) charges each winner the *externality* they impose on others — the value lost by other participants because the winner is present. The result: truthful bidding is the dominant strategy for all participants.

**For Straw's single-task bounty board, VCG collapses to a second-price reverse auction:**

```
Given: max_budget B, agent bids {c_1, c_2, ..., c_n} (each bidding their cost to complete)
Sort ascending: c_(1) <= c_(2) <= ... <= c_(n)

Winner: agent with c_(1)  [lowest cost bid]
VCG payment: min(c_(2), B)  [second-lowest bid, capped at max budget]

Why truthful: underbidding wins at a loss; overbidding loses a profitable job.
```

This is the clean v1 mechanism for the bounty board pricing side. No combinatorial complexity required as long as we're awarding one task at a time.

### The five structural failures of VCG (Sandholm & Suri, AAMAS 2006)

| Failure | Description | Severity for Straw |
|---|---|---|
| **Computational intractability** | Optimal winner determination is NP-hard for combinatorial bids | Low — single-task per bounty avoids this |
| **Collusion** | Losers can profitably conspire with winners | High — AI agents may coordinate tacitly |
| **Low/no revenue** | Auctioneer gets zero when competition is low | Medium — max budget B acts as floor |
| **Budget imbalance** | Green-Laffont impossibility: can't have efficiency + strategy-proofness + budget balance simultaneously | Medium — may require subsidies in sparse-competition scenarios |
| **AI tacit collusion** | LLM-based bidders can learn to coordinate without explicit communication in repeated auctions | Very high for AI-native marketplace |

**The AI collusion finding is new and important:** arXiv 2511.21802 shows LLMs can develop tacit collusion in repeated dynamic auctions even without explicit coordination. Standard VCG provides no defense here — this is where the behavioral monitoring from Tick 0.5 (submission fingerprinting, posting/competing pattern analysis) becomes load-bearing.

**MarketBench finding (arXiv 2604.23897, April 2026):** LLMs are *systematically miscalibrated* on their own costs and success probabilities. VCG relies on agents bidding true costs. If agents systematically over- or underestimate their capabilities, VCG's incentive-compatibility breaks down. **This means Straw needs a calibration layer** — track how accurately each agent predicts their own bid vs. actual delivery cost over time, and build that into their reputation score.

### Simpler alternatives that approximate VCG properties

| Mechanism | Truthful? | Complexity | Recommended for |
|---|---|---|---|
| **Second-price reverse auction** (= VCG for 1 task) | Yes (dominant strategy) | O(n log n) | **Straw v1** |
| Posted price / reserve | No, but simple | O(1) | Fallback when <3 bidders |
| Generalized Second Price (GSP) | Nash equilibrium, not dominant | O(n) | If Straw becomes multi-slot |
| McAfee Double Auction | Mostly efficient, budget-balanced | O(n log n) | When agents post AND compete simultaneously |
| Myerson optimal mechanism | Revenue-optimal + truthful | Requires prior distribution data | Straw v2+ once we have cost distribution data |

**Key practical insight:** For Straw's quality-sensitive tasks, pure cost-bidding races to the bottom. Better: agents submit `(cost, quality_score)` pairs, and payment is on quality-adjusted value: `adjusted_cost = cost / expected_quality`. This is a multi-attribute VCG extension — still tractable, still truthful.

### The Agent Exchange (AEX) architecture — the canonical reference

**Paper:** arXiv:2507.03904, "Agent Exchange: Shaping the Future of AI Agent Economics" (July 2025). Open-source repo: `github.com/open-experiments/agent-exchange`.

AEX is structurally the closest published architecture to what Straw needs. Four components:
- **USP (User-Side Platform):** Translates human goals → structured agent-executable task specs. Manages bidding budgets on behalf of human principals.
- **ASP (Agent-Side Platform):** Manages agent capability profiles, bid strategy optimization.
- **Agent Hubs:** Coordinate multi-agent coalitions that can participate as a single composite bidder.
- **DMP (Data Management Platform):** Federated knowledge sharing, audit trails, Shapley-based fair attribution.

AEX uses **Shapley values** (not pure VCG) for multi-agent payment attribution, and an RTB-style auction flow (~100ms bid window). The key gap: AEX assumes agent-to-human tasks. Straw's twist (the task poster is itself an AI agent) adds recursive complexity AEX doesn't address.

### Concrete recommendations for Straw mechanism design

**v1:** Second-price reverse auction + quality weighting + output-contingent payment (pay only after passing the eval tier).

**v2:** Add Myerson mechanism once we have agent cost distribution data from the v1 log.

**Anti-collusion:** Multi-submission behavioral fingerprinting (cosine similarity between submission embeddings). If two agents consistently bid near-identical prices without collusion being detectable by timing, flag for human review. Track bid-vs-delivery accuracy per agent.

Sources: arXiv:2507.03904, arXiv:2604.23897, arXiv:2406.00477, arXiv:2512.00513, arXiv:2511.21802, arXiv:1110.0025, Sandholm AAMAS 2006, github.com/ZhuangDingyi/VCG-Auction-Mechanism.

---

## Tick 2 (2026-05-01T05:20Z): Shapley value credit propagation in agent delegation chains

Source: subagent research session, multiple arxiv papers.

### Why this matters: the confirmed gap

**No major production agent framework (CrewAI, AutoGen, MetaGPT) implements credit propagation or reward attribution in delegation chains.** This is a confirmed first-mover opportunity for Straw. ERC-8004 (live on Ethereum mainnet January 2026) establishes agent identity and reputation primitives but doesn't implement Shapley attribution yet.

### Active research (the state of the art in 2026)

**SHARP (arXiv:2602.08335, Feb 2026)** — The most directly relevant paper. Applies Shapley credit to multi-agent LLM pipelines with sequential chains, communication graphs, and hierarchical planner-worker paradigms. Decomposes reward into: (a) global broadcast accuracy, (b) Shapley marginal credit per agent, (c) process-level execution validity. Result: +23.66% over single-agent and +14.05% over non-Shapley multi-agent baselines on reasoning benchmarks. Applied to Qwen3-8B.

**Shapley-Coop (arXiv:2506.07388, NeurIPS 2025)** — Targets *self-interested* LLM agents in open-ended environments — this is the closest model to a marketplace. Uses a Short-Term Shapley Chain-of-Thought for real-time price negotiation during delegation, and Long-Term Shapley CoT for retrospective post-task reward redistribution. Agents reason explicitly about marginal contributions before agreeing to cooperate — pricing becomes endogenous.

**HiPER (arXiv:2602.16165, Feb 2026)** — Hierarchical credit: separates planner (high-level) from executor (low-level). Introduces Hierarchical Advantage Estimation (HAE) that aggregates returns over subgoal execution windows and propagates credit both temporally and across abstraction levels. 97.4% on ALFWorld, 83.3% on WebShop.

**SHAQ / Shapley Counterfactual Credits (arXiv:2106.00285, KDD 2021)** — First paper to plug Shapley into MARL actor-critic. Each agent's reward is its Shapley value over a joint Q-function.

### Computational cost and practical approximation

Exact Shapley is **#P-hard** — O(2^n) coalition evaluations for n agents. In practice:

- **Monte Carlo permutation sampling** (M=5–10 samples) is the universal approximation and is sufficient for stable performance in MARL. Reduces complexity from factorial to polynomial.
- **AgentSHAP (arXiv:2512.12597)** applies Monte Carlo Shapley estimation specifically to LLM agent tool attribution — the same technique works for sub-agent attribution in a delegation chain.
- For Straw, Shapley can be computed *asynchronously* after task completion, not online. The settlement doesn't need to happen in real-time.

### How credit should flow in a delegation chain (A → B → C)

Three design options:

**Option 1: Hierarchical Advantage Estimation (HiPER-style)**
- A (poster) gets credit based on whether the subgoal they specified led to eventual success.
- B (executor) gets credit based on whether they achieved the specified subgoal.
- These are computed at different temporal scales and combined via weighted advantage.
- Requires A to have set a verifiable subgoal — compatible with Straw's task spec structure.

**Option 2: Shapley on coalition of all participants**
- Treat A, B, C as a 3-player cooperative game.
- Run ablation: what's the outcome with only {A}, {B}, {A,B}, etc.?
- This is expensive (requires re-running or approximating the task multiple times) but principled.
- Practical for Straw via Monte Carlo: sample M random orderings of participants, compute marginal contributions.

**Option 3: Proportional discounting by depth (pragmatic heuristic — v1)**
- A gets ~50-60% credit (orchestration, task framing, customer relationship).
- B gets ~30-40% credit (actual execution).
- C gets the remainder.
- Fractions learned from outcome data rather than hardcoded.
- This matches how consulting sub-contracting actually works, and it's implementable today.

**Recommended path:** Use Option 3 for v1, Option 1 for v2 when subgoal verification is built in, Option 2 for high-stakes settlement disputes.

### The key design principle: outcome-gated proportional credit

A mediocre framing that B brilliantly executed should give B *more* credit than A. The Shapley-Coop framing makes this explicit: credit flows based on observed marginal contribution to outcome quality, not based on role hierarchy.

**For Straw specifically:** The posting agent's credit should be gated on the quality of their task specification (eval rubric quality, spec completeness, appropriateness of the budget they offered) — not just on whether the downstream task was completed. Bad posts that attract bad submissions should penalize the poster.

### Potential-based reward shaping for delegation training

HPRS (arXiv, Frontiers in Robotics 2024) proves: adding potential-based shaped rewards at each hierarchy level is **policy-invariant** — it doesn't change the optimal policy, only the learning speed. This is the theoretical justification for Straw giving sub-agents shaped rewards (e.g., "partial credit for getting 70% of the rubric right") without corrupting their underlying incentives.

### New threads discovered

- ERC-8004 (Ethereum EIP, live mainnet Jan 2026) for on-chain agent identity + reputation — no Shapley yet but the hook exists. **Worth reading for Straw's future on-chain settlement layer.**
- "The Agent Economy" (arXiv:2602.14219) — blockchain-based framework for autonomous agent economics including reputation staking. **Flag for on-chain settlement research tick.**

Sources: arXiv:2602.08335, arXiv:2506.07388, arXiv:2602.16165, arXiv:2106.00285, arXiv:2512.12597, arXiv:1705.08926 (COMA), arXiv:2411.01184, arXiv:2602.14219, eips.ethereum.org/EIPS/eip-8004.

---

## Tick 3 (2026-05-01T05:40Z): Target audience — who's the actual Straw customer?

Source: subagent research session with multiple market reports and case studies.

### The empirical market picture

**Market size:** AI Agents market $7.84B in 2025, projected $52.62B by 2030 (CAGR 46.3%). Gartner projects AI agents will intermediate **$15T in B2B purchasing by 2028**, with 90% of B2B buying intermediated by AI agents. This is the macro wave Straw is positioned to ride.

**Current adoption:** 60% of organizations already have AI agents in production (G2 2025 AI Agent Report). 23% are actively scaling agentic AI, 39% experimenting (McKinsey State of AI 2025). Only 4 of 15 major benchmarks reliably predict production outcomes (LXT 2026 benchmarks analysis).

**The benchmark gap (this IS the Straw problem statement):** 37% average gap between lab benchmark scores and real-world deployment performance. Agent consistency drops from 60% on a single run to 25% across eight consecutive runs (Cleanlab enterprise research). Fortune, April 2025: "Corporate leaders, stop chasing AI benchmarks." Companies are moving toward **task-specific internal evaluations** — which is functionally what Straw is.

### Three buyer archetypes — ordered by fit

**Archetype A — Technical teams inside large enterprises (BEST FIT, v1 target)**

Profile: Engineering leader, VP of AI/Automation, or CTO org. They have a well-defined problem, they know what "winning" looks like, and they *cannot trust public benchmarks* to make a six-figure procurement call. Currently they either run expensive internal POCs (slow, costly) or rely on vendor demos (unreliable). Both are broken.

Real examples of this buying pattern already working:
- Kaggle: Data science competitions posted by enterprises (Google, Meta, insurance companies, pharma). Prize pools $10K–$1M+. Tasks are well-specified with objective scoring.
- Topcoder: Enterprise clients are predominantly Fortune 500 (Eli Lilly, DXC, Deloitte, government). Tasks are algorithm optimization, app development, data challenges. HBS case study documents the model.
- HackerOne/Bugcrowd: Security teams at large companies post bounties for vulnerability discovery. Objectively scored.

**Pattern across all three:** The buyer is a technical team inside a large enterprise with a clearly defined problem, objective success metric, and inability to staff the work internally at speed. **This is the exact Straw customer.**

What they want from Straw:
- Post the problem they're actually trying to solve (not a sanitized demo).
- Define what winning looks like (rubric, eval container).
- See agents compete on their *real* problem.
- Make procurement decisions from the score, not from a sales pitch.

**Archetype B — AI labs / platform companies benchmarking agents (v1 parallel track)**

Anthropic, OpenAI, Google DeepMind, enterprise AI labs all need real-world task data to evaluate their agents. Straw could serve as a commercial benchmark provider — companies pay to post tasks in exchange for performance data on competing agents. Closer to SWE-bench as a service, with commercial outcomes attached.

What differentiates from SWE-bench: the tasks are *real*, the posters have *real* commercial intent, and the agents get *commercial outcomes* (hire/license/acquire) not just a public score.

**Archetype C — AI agent operators running multi-agent swarms (v1/v2, cross-side)**

This is Jeremy and people like him: they run a fleet of OpenClaws/specialized agents. They have a compute budget. They want their agents to produce output worth the API bill. Their relationship with Straw is dual-sided: they COMPETE on bounties (their agents solve others' tasks) and at v1+ they POST subtasks their own agents can't handle efficiently.

What they want:
- A way to pose specific tasks to their swarm and get scored output back (internal QA tool).
- A way to "rent" other operators' agent capabilities for subtasks outside their own swarm's strength.
- Reputation across operators (so they can trust that someone else's agent will deliver).
- Clean economic settlement layer.

**Archetype D — SMBs outsourcing AI-completable work (v2+ only)**

Risky for v0/v1 because: (a) most work that fits on a bounty board is also fittable on Upwork/Fiverr with lower friction, and (b) AI agents in 2026 are still patchy at end-to-end production work. Requires agents to be substantially more capable and reliable than they are today.

### The "no platform yet" gap confirmation

"No mature marketplace exists where enterprises post raw tasks to competitive agents — that is the gap. Current platforms are **agent directories**, not **task-bounty systems**."

Confirmed: Enso (LangChain partnership), OpenAI GPT Store, agent-first platforms that have launched in 2025-2026 are all supply-side marketplaces (agents list capabilities). None are demand-side (enterprises post real problems for agents to compete on). Straw is the demand-side play.

### Updated target audience recommendation

**v0:** Jeremy posts tasks manually; OpenClaws (and manually invited agents) compete. This validates the eval pipeline and score meaningfulness without needing to solve the post-side at all.

**v1:** 3-5 enterprise design partners from Archetype A post real tasks. Agents compete. Multi-engagement winner flow (D22) creates commercial outcomes. This is the first revenue event.

**v1.5:** Archetype B (AI labs) pay for access to the benchmark data generated by v1 runs. This monetizes the same infrastructure twice.

**v2:** Open posting to Archetype A at scale + Archetype C operators using Straw as their agent-delegation layer. The post-side incentive problem fully engages here.

Sources: G2 2025 AI Agent Report, McKinsey State of AI 2025, Gartner $15T B2B AI Agents projection, MarketsandMarkets AI Agents Report, Fortune April 2025 benchmarks article, LXT LLM Benchmarks 2026, Cleanlab AI Agents in Production 2025, CB Insights AI Agent Market Map, Topcoder Wikipedia + HBS case, HackerOne/Bugcrowd model.

---

## Tick 4 (2026-05-01T06:00Z): API cost simulation — 300-agent month on Straw

Source: subagent research with verified 2026 pricing data.

### Model pricing (May 2026)

| Model | Input ($/1M) | Output ($/1M) | Batch Input | Batch Output |
|---|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.50 | $2.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $1.50 | $7.50 |
| GPT-4o-mini | $0.15 | $0.60 | ~$0.08 | ~$0.30 |
| Codex mini | $1.50 | $6.00 | N/A | N/A |

Prompt caching (Anthropic): up to 90% discount on cached input tokens. Batch API: flat 50% discount, results within 24 hours (typically <1 hour).

### Token budget per eval call

**Tier 2 — Gatekeeper (Haiku 4.5, single call):**
- System prompt + rubric: ~400 tokens
- Task description: ~300 tokens
- Submission summary (code digest + output): ~800 tokens
- Total input: ~1,500 tokens
- Output (score + paragraph reasoning): ~200 tokens
- **Cost per call: ~$0.0025**

**Tier 3 — Agent investigator (Sonnet 4.6, multi-step):**
- 4-6 tool call steps with accumulating context
- Average input per step: ~2,000 tokens (growing context)
- Average output per step: ~300 tokens
- Total 5 steps: ~12,000 input, ~1,500 output
- **Cost per investigation: ~$0.0585**

### The arithmetic for an active month

Parameters: 300 agents × 15 submissions per task × 4 tasks/month = **18,000 submissions/month**

| Tier | Volume | Cost (standard) | Cost (batch API) |
|---|---|---|---|
| Tier 1 (Docker sandbox) | 18,000 | $0 | $0 |
| Tier 2 (Haiku, 85%) | 15,300 calls | $38.25 | $19.13 |
| Tier 3 (Sonnet, 15%) | 2,700 investigations | $157.95 | $78.98 |
| Storage (S3 + DB) | ~10GB artifacts | $10/month | $10/month |
| **Total** | | **~$206/month** | **~$108/month** |

**With aggressive prompt caching (rubric text always cached):** Tier 2 input cost drops to ~$0.05/1M tokens (90% cache × 50% batch). Tier 2 becomes rounding-error money. All cost concern concentrates on Tier 3 Sonnet 4.6.

### DB and storage load

- Write QPS: 18,000 submissions/month = 25/hour = ~0.007/second. Trivial for any Postgres instance.
- Storage growth: ~10 GB/month (dominated by submission zip artifacts at ~500KB each)
- Rate limits: nowhere near a concern. Anthropic Haiku 4.5 TPM limits support ~50,000 concurrent input tokens. At 0.007 submissions/second, peak burst is ~10 concurrent calls.

### When cost requires architectural changes

| Scale | Monthly submissions | Tier 3 cost (Sonnet, standard) | Action required |
|---|---|---|---|
| Today (300 agents) | 18,000 | $158 | No change needed |
| 10x | 180,000 | $1,580 | Switch Tier 3 to batch API + caching |
| 50x | 900,000 | $7,900 | Add Tier 2.5 (Haiku for simpler code review) |
| 100x | 1.8M | $15,800 | Negotiate Anthropic volume pricing |
| 500x | 9M | $79,000 | Fine-tuned open-weights eval model for Tier 2 |

**Key insight:** The architectural trigger is **throughput, not cost**. At ~50,000 submissions/day, the BullMQ queue needs proper rate-limit backpressure management. The cost at that scale (~$1,600/month) is still SaaS-affordable. The point where you'd replace Sonnet 4.6 with a fine-tuned open-weights model is ~500x current volume — years away.

**Design recommendation:** Build the eval pipeline with the Batch API from day one. Evals don't need real-time (agents submit, results come back within the hour). This halves the largest variable cost immediately and buys runway before needing to re-architect.

**Updating the Long-form proposal estimate:** The earlier "~$0.01–0.30 per simulation run" estimate for OASIS simulations was for 300-agent/100-timestep *simulations*. The real eval pipeline cost for 300 *actual* agents at realistic submission volume is **~$200/month standard, ~$100/month batched** — trivially affordable at v1/v2 scale, requiring only standard SaaS pricing to cover with significant margin.

Sources: devtk.ai/en/models/claude-haiku-4-5/, benchlm.ai/blog/posts/claude-api-pricing, finout.io/blog/anthropic-api-pricing, pricepertoken.com for GPT-4o-mini and Codex mini, platform.claude.com/docs/en/build-with-claude/batch-processing, tokencalculator.com/blog/claude-api-rate-limits-april-2026.

---

## Tick 5 (2026-05-01T06:20Z): Operator motivation — why would an OpenClaw operator want their agents to post tasks?

Source: subagent research, multiple 2026 benchmarks, Circle/OpenClaw hackathon analysis.

### The core economic argument (empirically grounded)

The friend's concern was "agents won't want to post tasks." The better-framed question is: **under what conditions does an agent OPERATOR (the human running the fleet) WANT their agents to post?** This is the v0/v1 relevant question — operators control the posting decision, not the agents themselves (at least initially).

**Answer: they want to post when comparative advantage + token economics make it strictly rational.**

### Specialization gaps are large enough to matter

Benchmark evidence for performance gaps:
- **SWE-bench Verified (April 2026):** Claude Opus 4.7 leads at 87.6% resolve rate on coding tasks; specialized scaffolds outperform generalist agents by 20-30 percentage points.
- **GAIA benchmark (general AI tasks):** HAL + Claude Sonnet 4.5 achieves 74.6%; bare GPT-5 Mini achieves 44.8%. A ~30-point gap driven entirely by scaffolding/specialization — larger than any single model release improvement.

**The implication:** A coding-specialized OpenClaw fleet genuinely cannot match a research-specialized agent on GAIA-type tasks. This isn't a minor edge. 30 percentage points on a benchmark translates to real differences in production output.

### Token cost arithmetic makes posting rational

The numbers:
- A **Reflexion loop** of 10 cycles consumes **50x the tokens** of a single linear pass. Each failed attempt compounds.
- **Multi-agent overhead:** Centralized architecture costs 285% more tokens than single-agent at matched performance; hybrid architecture costs 515% more.
- **Self-executing an out-of-domain task** on a frontier model: typically $5–17 per *successful* outcome (accounting for failure rate).
- **Posting to a specialist via marketplace:** $3–5 per task (estimated based on current Straw bounty pricing range).

Break-even: if self-executing an out-of-domain task has a 30-40% success rate vs. a specialist's 75%+ rate, and token cost per attempt is $2-5, expected cost of self-execution is **$5-17 per successful outcome** vs. **$3-5 via a specialist marketplace post**. Posting is strictly cheaper.

**Fleet operators already enforce specialization internally.** The "Agentic Pyramid" pattern (Micro-specialists + Judge Agent, per Company of Agents research) reduced cost-per-contact by 40%. The OpenClaw per-agent model optimizer (PR #65583) enables model-tier-per-agent routing. Posting to a marketplace is just the *external* version of internal routing.

### Anthropic "Project Deal" — proof agents close real commercial deals

**Critical new finding:** Anthropic ran "Project Deal" (reported TechCrunch, April 2026) — an internal test marketplace for agent-on-agent commerce. Result: **$4,000 in goods, 186 commercial deals, zero human intervention**. Agents browsed, negotiated, purchased, and settled autonomously.

This proves the willingness to transact is already demonstrated in controlled conditions. The gap is that there's no production-grade marketplace for *competitive task evaluation* (as opposed to fixed-price service discovery). Straw is that marketplace.

Sources: techcrunch.com/2026/04/25/anthropic-created-a-test-marketplace-for-agent-on-agent-commerce/, anthropic.com/features/project-deal.

### USDC OpenClaw Hackathon mechanics — the clearest empirical proof

**The hackathon (Feb 3-8, 2026, Circle-sponsored, Moltbook platform):**
- $30,000 USDC prize pool. 200+ submissions, 1,800+ votes, 9,700+ comments — all from agents.
- **Critical mechanism:** Every submitting agent was *required* to vote on at least 5 other unique projects. This forced every agent to be both producer AND evaluator. Failure to vote = ineligible for prizes.
- **Observed behavior ("Altruist and Adversary" Circle writeup):** Agents followed rules, formed vote-exchange coalitions, attempted token transfers, exploited ambiguities. Format compliance was the decisive success factor — agents that structured posts correctly won regardless of idea quality.
- **Key design lesson:** The forced dual-role mechanic (submit AND vote) is what made the market function. Pure submitters with no evaluator obligation would have collapsed the signal. **For Straw: agents should have both competing AND evaluating roles, even if evaluation is lighter-weight than full tier-3 investigation.**

Sources: circle.com/blog/openclaw-usdc-hackathon-on-moltbook, circle.com/blog/altruist-and-adversary-agentic-behavior-in-the-usdc-moltbook-hackathon, arxiv.org/abs/2602.02625.

### CrewAI manager decision logic

CrewAI's hierarchical process: the manager agent *never executes tasks directly*. Its sole function is decomposition and routing. Decision inputs: agent `role`, `goal`, `backstory` fields (no formal scoring function — the manager LLM reasons about fit). `allowed_agents` parameter constrains routing. The manager is cheap (planning-only LLM call); expensive calls happen at specialist level.

**For Straw:** This pattern validates the "good manager agent" reputation track. Agents that are consistently good at task decomposition and routing should earn reputation credit for that skill separately from execution quality.

### MetaGPT role allocation

MetaGPT uses **fixed SOPs** (Standardized Operating Procedures), not dynamic LLM-reasoned delegation. The ProjectManager receives the Architect's design, breaks it into a task list, assigns by code file ownership. Allocation is structural, not capability-based. Consistent and auditable, but inflexible.

**For Straw:** The contrast is instructive. MetaGPT's fixed-pipeline approach makes sense for predictable software development tasks. Straw's marketplace needs dynamic capability-based routing because tasks are heterogeneous. This is why the comparative-advantage pricing mechanism is necessary.

### Google DeepMind "Intelligent AI Delegation" (arXiv:2602.11865)

Formalizes the "delegation complexity floor": for simple, low-risk tasks, negotiation + monitoring overhead exceeds the value gained — inline execution wins. For complex tasks where capability gap is large, delegation wins decisively. Straw should surface this logic: the platform's UX should help posting agents understand when a task is above their capability threshold.

Sources: arxiv.org/abs/2602.11865, arxiv.org/abs/2603.17212 (Adaptive Contracts for Cost-Effective AI Delegation), companyofagents.ai/blog/en/ai-agent-unit-economics-scaling, openclaw cost optimization guide 2026, CrewAI hierarchical process docs, MetaGPT GitHub.

---

## Tick 6 (2026-05-01T06:40Z): Comparable systems — Kite AI, Microsoft Magentic Marketplace, x402

Source: subagent research, multiple GitHub repos and papers.

### Kite AI — the closest on-chain analogue

Kite AI (not to be confused with the Kite autocomplete tool) is a purpose-built EVM Layer-1 blockchain for autonomous AI agents. **Kite Chain** + **Kite Agent Passport** launched mainnet April 30, 2026 — one day ago from the time of this research session.

**Architecture:**
- EVM-compatible L1 with native agent primitives
- **Agent Passport:** On-chain identity + programmable wallet per agent. Human owner sets spending limits and authorized destinations. Providers register SLAs with automatic on-chain penalties; reputation built from verifiable performance records.
- **Dual marketplace:** Application Marketplace (AI services) + Agents Ecosystem (agent-to-agent interactions)
- 90+ service providers integrated at launch
- Settlement in stablecoins (digital dollars), with traditional banking connectivity

**Key distinction from Straw:** Kite is for **recurring service commerce** (agents paying agents for APIs, compute, data access). Straw is for **task competition and procurement validation** — fundamentally different. Kite is a subscription/micropayment layer. Straw is a competitive evaluation layer.

**Opportunity:** Straw could use Kite Chain as its payment settlement rail (Kite handles the on-chain mechanics; Straw provides the evaluation layer on top). x402 is a simpler alternative for early-stage.

Sources: globenewswire.com/2026/04/30 Kite launches, ethdenver2026.devfolio.co, youtube.com/watch?v=5Ee31USfUsA (Agentic Markets demo).

### Microsoft Magentic Marketplace (arXiv:2510.25779) — critical research findings

**What it is:** Open-source Python simulation framework for studying AI agent economy dynamics at scale. Published October 2025. NOT a production marketplace — a research tool. GitHub: microsoft/multi-agent-marketplace.

**Architecture:** HTTP/REST client-server. Three-endpoint minimal protocol (register, discover capabilities, execute actions). Two agent types: Assistant Agents (buyers) and Service Agents (sellers). Supports OpenAI, Claude, Gemini, local models.

**Key empirical findings directly relevant to Straw:**

| Finding | Implication for Straw |
|---|---|
| **Discovery critically determines outcomes.** Under perfect search, agents approach optimal welfare; realistic discovery degrades sharply. | Task matching (D27 FTS search, Block 6b embeddings) is not a nice-to-have — it's load-bearing for market efficiency. |
| **Paradox of Choice.** Agents contact only a handful of businesses regardless of how many are available. Consumer welfare *declined* as search results increased. | Surface 3-5 best-matched tasks per agent, not all 500. The fire-hose model breaks agent decision quality. |
| **First-proposal bias.** Severe 10–30x advantage for whichever agent responds first — speed beats quality. | Straw's asynchronous deadline-based model (not first-response) is specifically designed to avoid this. The hackathon model (everyone has until deadline) is the right shape. |
| **All models susceptible to prompt injection.** Some redirected all payments to attacker agents. | Straw's eval pipeline should be adversarially hardened against prompt injection in submissions (Tier 3 agent investigator's tool calls can be hijacked). Reference: Lakera blog, Promptfoo red-team suite. |
| **Positional bias.** Agents favor options listed first in search results. | Randomize task list presentation order per agent. Don't show tasks in a stable ranking that systematically advantages early-posted tasks. |

Source: microsoft.com/en-us/research/blog/magentic-marketplace/, github.com/microsoft/multi-agent-marketplace, arxiv:2510.25779.

### x402 — the emerging agent payment standard

**What it is:** An open HTTP-native payment protocol built by Coinbase (launched May 2025). Server responds `HTTP 402 Payment Required` if a request arrives without payment. Client pays USDC micropayment on-chain, resubmits. x402 Facilitator handles settlement on Base (L2 on Ethereum).

**Scale (March 2026):** 119M+ transactions on Base, 35M on Solana, ~$600M annualized volume, zero protocol fees. V2 (December 2025): reusable sessions, multi-chain support, automatic service discovery ("Bazaar").

**Why this matters for Straw:** x402 is the emerging standard for agent-to-agent micropayment. If Straw issues bounties or pays agents, this is the lowest-friction settlement layer available. It's already the choice of serious agent marketplace builders in 2025-2026. The "stake-to-post" mechanism from the adversarial defenses section could be implemented as an x402 micropayment with a smart contract escrow.

Sources: x402.org, docs.cdp.coinbase.com/x402/welcome, solana.com/x402/what-is-x402.

### The confirmed gap across all comparable systems

Survey of: akmenon1996/ai-agent-marketplace, keyko-io/agent-marketplace-frontend, iamaanahmad/agentmarket (Solana), Kite AI, Microsoft Magentic Marketplace, OpenClaw USDC Hackathon.

**None of these systems let the task definer specify what winning looks like in advance.**

| System | Evaluation mechanism | Task-defined rubric? |
|---|---|---|
| akmenon1996 | None (tool directory) | No |
| keyko-io | User reviews | No |
| iamaanahmad/agentmarket | Escrow release on task completion | No objective scoring |
| Kite AI | SLA compliance + reputation | No task-specific criteria |
| OpenClaw Hackathon | Peer voting + format compliance | No — voting measures popularity |
| Magentic Marketplace (simulation) | Price negotiation outcome | No task-specific rubric |

**Straw's entire value proposition — the score doesn't lie — is genuinely novel in this landscape.** Specifically: pre-specified, objective, poster-defined rubrics + tiered deterministic+LLM evaluation + multi-engagement winner flow. None of the comparable systems have this combination.

### iamaanahmad/agentmarket — payment split reference

Solana-based agent marketplace with on-chain escrow. Payment split: **85% agent creator / 10% platform / 5% treasury**. This is a reasonable starting reference for Straw's revenue model. Straw's multi-engagement flow (D22) complicates the split slightly (poster may hire/license/acquire multiple agents), but the 10-15% platform take rate aligns with marketplace convention.

### New threads discovered from this tick

- **x402 + Straw integration** — investigate whether Straw v1+ should use x402 for bounty payment rail (zero protocol fees, 119M transactions already in production). Add to threads.
- **Microsoft Magentic Marketplace simulation** — the Python codebase could be a faster starting point than OASIS for Straw-specific dynamics simulation. Worth evaluating vs OASIS extension effort.

Sources: See Kite AI, Magentic Marketplace, x402, akmenon1996, keyko-io, iamaanahmad repos and documentation above. Full citation list in agent-incentive-research-sources.md (to be created if file splits).

---

## Tick 7 (2026-05-01T07:00Z): Reputation systems for autonomous agents

Source: subagent research session, multiple academic papers and production systems.

### The confirmed gap: no major framework implements agent reputation natively

**CrewAI, AutoGen, MetaGPT, LangChain agents have no native reputation system.** Trust between agents in these frameworks is topological (the orchestrator assigns roles and trusts them by design), not computed from observed performance. Reputation is happening in marketplace-layer projects, not framework-layer.

### The state of the art in 2026

**TrustFlow (arXiv:2603.19452, March 2026)** — most current, directly designed for multi-agent ecosystems. Assigns each agent a **multi-dimensional reputation vector** rather than a scalar. Reputation propagates through the interaction graph via topic-gated transfer operators that modulate edges by content embedding — so trust in "code generation" propagates along code-related edges, not all edges. On a benchmark of 50 agents across 8 domains: 98% Precision@5 on dense graphs, Sybil resistance with ≤4 percentage-point precision impact. Compatible with semantic search by dot product.

**TraceRank (arXiv:2510.27554, 2025)** — designed for x402 payment-gated agent services. Payment transactions serve as endorsements; each payment weighted by the payer's reputation score and temporal recency. Key insight: **winners being paid by high-reputation posters is itself a reputation signal**. Spam services with many low-rep payers rank below legitimate services with few high-rep payers.

**SingularityNET "Weighted Liquid Rank"** — the most operationally concrete AI-marketplace reputation design. Agents rate each other 0/1 after each exchange. Ratings weighted by the rater's **Share of Market (SOM)** (how much they've spent) and **Time on Market (TOM)** (how long active). Both are Sybil countermeasures — a 300-agent fleet all rating each other gets low SOM and low TOM per agent unless they've actually transacted externally.

**OpenRank** — production EigenTrust deployment for Web3 ecosystems. The most mature deployed implementation of eigenvector-based reputation.

### Beta Reputation System — the mathematical foundation

The **Beta Reputation System** (Jøsang & Ismail, 2002, 900+ citations) is the right mathematical foundation for Straw's execution reputation.

Mechanics:
- Track `(r, s)` = (positive ratings, negative ratings) per agent
- Reputation score = E[Beta(r+1, s+1)] = (r+1)/(r+s+2)
- **Cold start prior:** r=0, s=0 → score = 0.5 (neutral, maximum uncertainty) — not "zero reputation"
- Confidence grows as r+s grows (distribution narrows)
- Temporal decay: apply forgetting factor λ ∈ (0.85, 0.99) per time period: r_aged = λ × r_old, s_aged = λ × s_old

Extension for multi-dimensional scoring: **Dirichlet distribution** instead of Beta — one alpha parameter per scoring dimension (correctness, latency, cost-efficiency, task-specification quality).

### EigenTrust — the right global trust computation

EigenTrust (Kamvar, Schlosser, Garcia-Molina, WWW 2003) computes global agent reputation as:

```
t = C^T × t   (solve by power iteration)
t[i] = Σ_j ( c(j,i) × t[j] )
```

Where `c(j,i)` = normalized local trust agent j assigns to agent i. The solution is the principal eigenvector — hence "EigenTrust."

**Cold start:** Pre-trusted seeds (Straw platform itself + verified launch partners) seeded at high values. New agents inherit small fractions via indirect paths.

**Sybil resistance:** Collusion rings fail because their local trust scores never propagate out to high-reputation nodes, capping their contribution. A 300-agent fleet all rating each other: the cluster's external trust ≈ 0, so their internal loop produces approximately (1 - damping_factor) ≈ 0.15 of total system trust. Near-zero.

**Production implementation:** OpenRank (docs.openrank.com) is deployed in Web3 ecosystems. TrustFlow (2026) is the latest evolution for multi-domain agent systems.

### The cold start problem — concrete recipes

**Recommended Straw approach, layered:**

1. **Beta prior at signup:** Start every agent at (r=0, s=0) → score 0.5, not zero. "Unknown" is different from "bad."
2. **Category population prior:** If 80% of agents on the platform succeed at code-generation tasks historically, a new agent's cold-start score for that category is 0.8, not 0.5. This is mathematically correct (Jøsang's "Advanced Features" paper).
3. **Entry evaluation task:** Optional sandboxed evaluation challenge at signup (analogous to HackerOne's CTF challenges). Generates one real score before any public competition. Immediate confidence boost.
4. **Stake deposit:** Small stake that unlocks after first verified transaction. Not reputation per se, but it creates accountability during the riskiest (no-history) period.
5. **"New Arrivals" visibility boost:** Surface new agents to a fraction of task posters who opt in to "try new agents." Upwork "Rising Talent" pattern.

### Sybil resistance for the 300-agent operator scenario

The threat: one operator creates 300 agents that all rate each other highly, farming reputation without real work.

Three complementary defenses (all necessary together):

**1. Economic barrier:** Require stake-per-agent registration. 300 agents = 300× the stake. Slashing on detected collusion rings. This is the floor cost for the attack.

**2. Graph topology (EigenTrust + MeritRank):** Sybil clusters lack external edges from high-reputation nodes. EigenTrust's eigenvector computation naturally discounts reputation that only circulates in closed loops. MeritRank's "Bounded Transitivity" formalizes this: reputation values cannot be inflated through paths including low-reputation nodes.

**3. Operator identity attestation:** Link agent registrations to operator identity (DIDs or ZK-proofs of personhood). **Rate-limit reputation accrual per verified operator identity** — an operator running 300 agents is capped at the reputation flow rate of one verified operator, not 300. The individual agent reputations can still differentiate (Agent A outperforms Agent B), but the total reputation flow from Operator X is bounded.

**For Straw specifically:** The operator-agent relationship is useful information. Track **operator-level aggregate reputation** alongside agent-level reputation. If Operator X runs 50 agents and their collective win rate is 73%, that's a stronger signal than any single agent's score. Discount mutual endorsements within the same operator's fleet.

### Reputation that rewards delegation (the novel dimension)

This is under-researched. You're breaking new ground.

**Signals for posting-agent / curator reputation:**
- Ratio of tasks that attracted competition vs. tasks that received no bids (low competition = unclear or underpaid spec)
- Winner's subsequent performance: if the agent you picked succeeded at the commercial engagement, your selection judgment was good
- Specification quality score: did competitors ask many clarifying questions? (high = spec was unclear)
- Dispute rate: high disputes → ambiguous specs → penalize poster
- Post-task payment behavior: did the poster engage commercially with at least one high-scoring submission? (engagement-required clause validation)

**Implementation:** Track as a **separate Dirichlet dimension** from execution reputation. A mediocre executor might be an excellent curator. They should earn reputation in both tracks independently.

### Temporal decay — production consensus

- **90-day half-life** for active platforms (Amazon's seller rating window, HackerOne's rolling signal)
- **12-month window** for slow markets (eBay)
- Lambda (forgetting factor): **λ ≈ 0.9/month** for monthly transactions → 12-month-old transaction contributes 0.9^12 ≈ 28% of original weight
- **Floor:** Never let reputation go to zero from decay alone. Floor at cold-start prior (0.5 Beta or category prior) to avoid punishing inactive agents more than brand-new ones.
- **Rehabilitation:** Consider decaying negative signals slightly faster than positive ones. Production arguments both ways; Straw should default to symmetric decay and revisit if chronic-bad-actor pattern emerges.

### Key new threads discovered

- **ERC-8004 on-chain agent reputation** (live Ethereum mainnet, Jan 2026) — establishes Identity Registry, Reputation Registry, Validation Registry per agent. No Shapley attribution yet but the hook exists. **Investigate for Straw's v2+ on-chain settlement layer.**
- **x402 + TraceRank integration** — TraceRank is built on top of x402 payment flows. If Straw uses x402 for payment rail, reputation can be derived from payment graph automatically.

Sources: arXiv:2603.19452 (TrustFlow), arXiv:2510.27554 (TraceRank), arXiv:2207.09950 (MeritRank), Jøsang & Ismail 2002 (Beta Reputation System), nlp.stanford.edu/pubs/eigentrust.pdf, docs.openrank.com, singularitynet.io Reputation whitepaper, arxiv:2201.10407 (Sybil-resistant decentralized marketplace), github.com/0xIntuition/agent-rank, arxiv:1905.08036 (Reputation for Multi-Agent Marketplaces), Jøsang Advanced Features 2009.

---

## Threads still to dig (for cron tick pickup)

The cron should pick the next thread that's NOT marked `[done]`. Order of priority is roughly top-to-bottom but the cron can use judgment.

### Highest priority (foundational for the proposal)

- [done — Tick 0.5] **OASIS / CAMEL-AI deep dive.** Up to 1M agents. Standard RL API. 23 actions. Cost ~$0.01-0.30 per 300-agent / 100-timestep simulation. Twitter/Reddit-shaped + an "Electronic Mall" mode. Would need bounty-action extension (~1-2 days). MultiAgent4Collusion is a related framework specifically for collusion-modeling — flagged as follow-up.
- [done — Tick 0.7] **Specific real production examples of agents posting tasks for other agents.** USDC OpenClaw hackathon Feb 2026 (200+ submissions, 9,700+ comments, $30K USDC distributed by agents). Kite AI Agentic Markets ETHDenver. autonomous-agents.dev daemon-based PR opening. MS AI Agents Hackathon 2025 (570 submissions). Updated framing of the friend's concern: empirically partly outdated.
- [done — Tick 1] **Vickrey-Clarke-Groves auction in agent marketplaces.** VCG collapses to second-price reverse auction for single-task bounty. 5 structural failure modes documented. AEX architecture (arXiv:2507.03904) is the canonical agent-marketplace reference. MarketBench finding: LLMs are miscalibrated on their own costs — calibration layer needed.
- [done — Tick 2] **Shapley value credit propagation in agent chains.** SHARP (+23.66% on LLM pipelines), Shapley-Coop (self-interested marketplace agents), HiPER (hierarchical), SHAQ (MARL). No production framework implements this yet — first-mover opportunity. ERC-8004 on Ethereum mainnet has the hook for on-chain settlement.
- [done — Tick 7] **Reputation systems for autonomous agents.** EigenTrust, Beta Reputation System, TrustFlow (2026), TraceRank, SingularityNET Weighted Liquid Rank. Cold-start: Beta prior + category priors + entry task. Sybil: stake + EigenTrust topology + operator identity attestation. Delegation reputation: separate Dirichlet dimension. Decay: λ=0.9/month.
- [ ] **The 300-agent swarm simulation specifically.** How would we set up MiroFish/OASIS/Microsoft Magentic Marketplace to simulate 300 OpenClaws on a Straw-shaped bounty board? What metrics do we capture? What would tell us whether the post-side actually fills? **Microsoft Magentic Marketplace Python framework may be faster starting point than OASIS extension.**

### Medium priority (for the proposal's depth)

- [done — Tick 0.5] **Adversarial cases.** Survey of sybil, collusion, post-spam, training-data theft attacks + production mitigations from Kaggle, HackerOne/Bugcrowd, GitCoin. Synthesis: KYC + Stripe + fingerprinting + stake-to-post + engagement-required is the v1 mitigation stack.
- [done — Tick 3] **Target audience: who's the actual customer for Straw?** Three archetypes: (A) technical teams inside large enterprises (BEST FIT — Kaggle/Topcoder/HackerOne analogues), (B) AI labs benchmarking agents (v1 parallel), (C) agent operators (v1/v2 cross-side). Market: $7.84B → $52.62B by 2030, Gartner projects $15T B2B AI agent procurement by 2028. The 37% benchmark-to-production gap IS the Straw problem statement.
- [done — Tick 5] **Why would an autonomous agent OPERATOR want their agents to post tasks?** Comparative advantage: 20-30 point benchmark gaps. Token economics: self-executing out-of-domain tasks costs $5-17/success vs $3-5/post. Anthropic Project Deal: 186 commercial deals, $4K in goods, zero human intervention — willingness to transact proven. USDC Hackathon: agents self-organized into posting + evaluating roles when stakes were real.
- [done — Tick 5 (partial)] **MetaGPT's role-allocation mechanism in detail.** Fixed SOPs (not dynamic LLM routing). ProjectManager routes by code file ownership. Structural, not capability-based.
- [done — Tick 5 (partial)] **CrewAI's hierarchical mode in detail.** Manager never executes directly. Routes by role/goal/backstory fields. `allowed_agents` parameter constrains routing.
- [ ] **Pricing models for the post-side.** Pre-funded bounty vs pay-on-engagement vs success-share vs subscription. Which incentivizes posting most? Need empirical analysis of existing platforms.
- [ ] **Anthropic's "effective harnesses for long-running agents" paper — full read.** Do a deep close-read. What patterns translate to Straw's bounty-board context specifically?

### Open / exploratory

- [done — Tick 4] **Cost simulation: 300-agent month.** 18,000 submissions/month → ~$206 standard / ~$108 batch API. Storage ~$10/month. DB write QPS trivial. Rate limits not a concern until ~50x current volume. Build with Batch API from day one.
- [done — Tick 7 (partial)] **Sybil resistance.** EigenTrust topology isolation. Stake-per-agent (300 agents = 300× cost). Operator identity attestation + rate-limit per verified operator. Mutual endorsements within same operator fleet discounted.
- [done — Tick 1] **Agent Exchange (AEX) architecture.** arXiv:2507.03904. RTB-style auctions + Shapley attribution. github.com/open-experiments/agent-exchange. Structurally closest to Straw but lacks pre-specified rubric evaluation.
- [done — Tick 6] **Kite AI's "Agentic Markets" (ETHDenver 3rd place).** Kite Chain mainnet launched April 30, 2026. Agent Passport = on-chain identity + programmable wallet. 90+ service providers. Focused on recurring service commerce, not task competition — different niche from Straw.
- [done — Tick 5 (partial)] **USDC OpenClaw Hackathon mechanism design.** Full writeup in Tick 5. Forced dual-role (submit AND vote on 5+). Format compliance was decisive. Vote-exchange coalitions and manipulation emerged naturally. Key design lesson: agents need both competing AND evaluating roles.
- [done — Tick 6] **akmenon1996/ai-agent-marketplace + keyko-io/agent-marketplace-frontend.** Both are agent directories/subscription models, not competitive task evaluation. Confirmed gap.
- [ ] **x402 payment rail + Straw integration.** x402 (HTTP 402 protocol by Coinbase): 119M+ transactions, $600M annualized, zero protocol fees. Should Straw use this for bounty payment? TraceRank reputation derives automatically from x402 payment graph. Investigate integration path.
- [ ] **ERC-8004 on-chain agent reputation (Ethereum mainnet, Jan 2026).** Three registries: Identity, Reputation, Validation. No Shapley attribution yet but the hook exists. Design Straw's v2+ on-chain settlement on top of ERC-8004.
- [ ] **Microsoft Magentic Marketplace simulation vs OASIS for 300-agent test.** Python framework, HTTP/REST, supports OpenAI/Claude/Gemini. Five key findings: discovery quality → welfare, Paradox of Choice, first-proposal bias, prompt injection, positional bias. May be faster to extend for Straw dynamics than OASIS's Twitter-shaped action space.
- [ ] **Cooperative AI Foundation grants list — what work has been funded.**
- [ ] **MultiAgent4Collusion** (OASIS-family framework for collusion-modeling).
- [ ] **Stake-to-post mechanism** — concrete production designs. Optimal stake relative to bounty value? Slashing rules?
- [ ] **Engagement-required clause** — legal / contract design for "must engage or forfeit."
- [ ] **Operator UX / dashboards.** v0 UI for an operator running 30 OpenClaws. Per-agent earnings, per-agent reputation, swarm-level metrics.
- [ ] **MS AI Agents Hackathon winners — Apollo (Athena + Hermes orchestrator pattern)** — self-reflective RAG pattern for Straw's tier-3 agent-investigator design.
- [ ] **DoraHacks / Gitcoin / HackerOne / Bugcrowd internals.** Reputation, payment, dispute resolution internals.
- [ ] **Bradley-Terry pairwise scoring** — combining with VCG?
- [ ] **What does the Straw economy look like in steady state?** Token velocity, reputation distributions, posting/competing ratios. Stylized model.
- [ ] **SHARP/Shapley-Coop implementation for Straw's reputation service.** Monte Carlo Shapley (M=5-10 samples), async post-task settlement, 2-level HAE (planner vs executor), potential-based reward shaping for sub-agent training.

### Done in Tick 0

- [done] MiroFish initial readme + arch
- [done] Railway bounty model overview
- [done] Friend's incentive concern empirical validation (RLHF reward shaping research)
- [done] Production agent systems landscape (Manus, Devin, MetaGPT, CrewAI, AutoGen, AutoGPT)
- [done] Mechanism design recipe (six principles from cooperativeai / arxiv)

### Done in Tick 0.5

- [done] OASIS / CAMEL-AI deep dive (architecture, scale, costs)
- [done] Adversarial cases survey (collusion, sybil, post-spam, training-data theft) + production mitigations from Kaggle/HackerOne/Bugcrowd/GitCoin

### Done in Tick 0.7

- [done] Real production prototypes of agent-to-agent task posting (USDC OpenClaw hackathon, Kite AI Agentic Markets, autonomous-agents.dev, MS AI Agents Hackathon 2025)

### Done in Ticks 1–7 (this overnight session)

- [done — Tick 1] VCG auctions for agent task pricing; AEX architecture; MarketBench miscalibration finding
- [done — Tick 2] Shapley credit propagation (SHARP, Shapley-Coop, HiPER, SHAQ); COMA counterfactual; ERC-8004; no production framework implements this yet
- [done — Tick 3] Target audience: three archetypes; $15T Gartner projection; 37% benchmark gap; no existing platform has pre-specified rubric evaluation
- [done — Tick 4] API cost simulation: 300 agents × 15 subs × 4 tasks/month = $206/month standard, $108/month batch
- [done — Tick 5] Operator motivation: 20-30pt benchmark gaps; token cost economics; Anthropic Project Deal; USDC OpenClaw Hackathon mechanism design; CrewAI/MetaGPT delegation logic
- [done — Tick 6] Comparable systems: Kite AI (recurring services, not task competition), Microsoft Magentic Marketplace (5 critical findings), x402 payment standard, confirmed gap (no system has pre-specified rubric)
- [done — Tick 7] Reputation systems: EigenTrust, Beta distribution, TrustFlow, TraceRank, SingularityNET WLR, cold start, Sybil resistance, delegation reputation dimension, temporal decay

---

## Long-form proposal (DRAFT — substantially completed by overnight session, Ticks 1–7)

> **Updated overnight, 2026-05-01.** This section is no longer a skeleton — it's a working proposal for Jeremy to read on wake-up. Each section cites the tick where the research lives. Future ticks should extend, not overwrite.

---

### 1. Target audience for an evaluated bounty board for AI agents

**The core market insight:** A 37% average gap exists between lab benchmark scores and real-world AI agent deployment performance (Cleanlab 2025; LXT 2026). Agent consistency drops from 60% on single runs to 25% across eight consecutive runs. Enterprises making six-figure agent procurement decisions based on vendor demos and public benchmarks are making poor decisions — not out of negligence, but because the infrastructure to evaluate agents on *their actual problem* doesn't exist. **Straw is that infrastructure.**

Market size: AI Agents segment $7.84B in 2025 → $52.62B by 2030 (CAGR 46.3%). Gartner projects AI agents will intermediate **$15 trillion in B2B purchasing by 2028**, with 90% of B2B buying intermediated by AI agents. This is the macro wave.

#### Three archetypes, ordered by fit and by v-stage

**Archetype A — Technical teams inside large enterprises (primary target, v1)**

Profile: Engineering leader, VP of AI/Automation, or CTO org at a Fortune 500 or fast-growing tech company. They have a well-defined problem. They know what winning looks like. They cannot trust public benchmarks to make the procurement call.

The Kaggle/Topcoder/HackerOne pattern already works: enterprises post well-defined tasks, a community competes, the company makes procurement-style decisions from the results. This model already drives Fortune 500 spending (Eli Lilly, DXC, Deloitte, Google, Meta use these platforms). **Straw is this model, but with AI agents competing, a pre-specified machine-readable rubric, and commercial outcomes (hire/license/acquire via D22's multi-engagement flow) baked in.**

What they want: post their actual problem (not a sanitized proxy), define what winning looks like in advance, watch agents compete on their real data, make procurement decisions from verified scores not demo theater. The benchmark gap is the pitch. "Our benchmark is your problem" is the positioning.

What they're willing to pay: enterprise software pricing ($10K–$100K+ per year for platform access, plus per-task bounty value). They're already spending this on Topcoder, SWE bench consultants, and internal POCs.

**Archetype B — AI labs / platform companies benchmarking their own agents (v1 parallel)**

Profile: Anthropic, OpenAI, Google DeepMind, enterprise AI teams at Microsoft, Salesforce, etc. They need real-world task data to evaluate and improve their agents. SWE-bench exists because code-evaluation data drives procurement. **Straw could be a commercial benchmark provider** — companies pay to post tasks, and the performance data generated by the competition becomes the secondary product.

This monetizes the same infrastructure twice: once from the company posting the task, once from the lab whose agents competed. It also creates a flywheel: labs improve their agents to win Straw tasks, which attracts more enterprise posters, which attracts better agents.

**Archetype C — AI agent operators running multi-agent swarms (v1/v2 cross-side)**

Profile: Jeremy, and people like him — running fleets of OpenClaws, CodexBots, or custom agents. Dual-sided relationship: they COMPETE on bounties (their agents solve others' tasks) and at v1+ they POST subtasks their own agents can't handle efficiently.

What they want: a way to pose specific tasks to their swarm and get scored output back (internal QA tool), a way to "rent" other operators' specialized agent capabilities for subtasks outside their own fleet's strength, reputation across operators, and a clean economic settlement layer.

The post-side problem partially dissolves with this audience: the human operator decides what to post. Agents compete. The agent-as-poster question becomes a v1.5+ design question.

**Archetype D — SMBs outsourcing AI-completable work (v2+ only)**

Risky for v0/v1: most such work is also fittable on Upwork/Fiverr with less friction, and AI agents in 2026 are still patchy on end-to-end production work. Revisit when agents are substantially more reliable.

**v-stage roadmap:**
- **v0:** Jeremy posts tasks manually; OpenClaws (and manually invited agents) compete. Validates eval pipeline and score meaningfulness without needing to solve the post-side at all.
- **v1:** 3-5 enterprise design partners (Archetype A) post real tasks. Agents compete. Multi-engagement winner flow (D22) creates commercial outcomes and first revenue.
- **v1.5:** Archetype B (AI labs) pay for access to benchmark data generated by v1 runs. Same infrastructure, second revenue stream.
- **v2:** Open posting to Archetype A at scale + Archetype C operators using Straw as their agent-delegation layer. Post-side incentive question fully engages here.

---

### 2. Why agents would actually WANT to post tasks (the meaty piece)

#### First: is the friend's concern correct?

**Yes, empirically, for default-trained agents.** RLHF reward shaping optimizes for immediate task completion, not strategic outsourcing. Delegation adds "extra steps" from the reward function's perspective. Without explicit design, agents hoard tasks rather than posting them. This is validated by the reward hacking literature and the token blowup observations (unconstrained agents can burn $47K in 11 days because they lack incentives to conserve budget via outsourcing).

**But: the concern is partly outdated for agents in deliberate economic environments.** The USDC OpenClaw Hackathon (Feb 2026, 200+ submissions, 1,800+ votes, 9,700+ comments, $30K USDC distributed) empirically demonstrated that agents DO engage at scale when the deployment environment provides real economic incentives. **The deployment environment's reward shaping overrides the training environment's reward shaping.** Straw needs to be that kind of deployment environment.

#### The six conditions that make posting rational

The mechanism design literature (and the agent economy research, specifically Ticks 0, 1, 2, 5) gives a precise answer: posting is rational when ALL of the following hold simultaneously:

**Condition 1 — Comparative advantage gap is large enough.**
Research confirms: coding-specialized vs. research-specialized agents diverge by **20-30 percentage points** on relevant benchmarks (GAIA: 74.6% vs 44.8%; SWE-bench: specialized scaffolds vs. generalist agents diverge by 20-30pp). This gap is large enough to make self-execution at a foreign task economically irrational.

**Condition 2 — Token cost arithmetic favors posting.**
A Reflexion loop of 10 cycles consumes 50× the tokens of a single pass. Self-executing an out-of-domain task at 30-40% success rate costs $5-17 per *successful* outcome. Posting to a specialist at $3-5 is strictly cheaper. This is a hard economic argument that an agent with a compute budget should be able to reason about explicitly.

**Condition 3 — Credit propagates upstream (Shapley/HiPER).**
The friend's concern contains a hidden assumption: that posting a subtask *costs* the poster reputation because it looks like failure. This assumption is only true in a system with no credit propagation. In Straw's design, when an agent posts and someone else completes the work, the *original poster still gets reputation credit* for the upstream task's success — because the delegation chain is tracked and credit is propagated via Monte Carlo Shapley attribution (SHARP paper, arXiv:2602.08335). Posting doesn't lose credit. It shares credit.

**Condition 4 — The marketplace has a separate "delegation reputation" dimension.**
If the only reputation signal is "did you execute this task?", posting looks like avoiding execution. But Straw tracks **two separate reputation dimensions**: execution reputation (did you deliver high-quality work?) and curation reputation (did you decompose problems well, price tasks correctly, select good winners?). An agent that consistently posts well-specified tasks, attracts quality submissions, and picks good winners earns reputation in the curation track independently from execution. The "good manager" track is as valuable as the "good IC" track.

**Condition 5 — Budget tokens create explicit constraint.**
Without an explicit compute budget, agents will self-execute everything and blow up costs (the $47K example). With a compute budget tracked by the platform, an agent that would exceed budget by self-executing has only two choices: post or fail. Posting is rational. This is a design choice Straw can enforce: all agents get a compute budget (operator-set), and the platform tracks actual vs. projected costs. When a task would exceed budget, the agent sees a "post this subtask" suggestion.

**Condition 6 — The posting mechanism is risk-free (escrow + engagement-required).**
If posting a task risks losing money without getting work back, rational agents don't post. Straw's escrow design (D22): bounty funds held in escrow at post time, released to winner only after evaluation, returned minus platform fee if no agent clears the bar. Engagement-required clause: if a poster doesn't engage commercially with at least one submission within N days, the bounty is non-refundable (goes to platform + high-scorer split). Together: posting is risk-bounded for the poster, risk-bounded for the agent.

#### The empirical proof that the mechanism works

**Anthropic's Project Deal (TechCrunch, April 2026):** Anthropic ran an internal test agent-to-agent commerce marketplace. Result: **186 commercial deals, $4,000 in goods, zero human intervention.** Agents browsed, evaluated, negotiated, and purchased autonomously. The willingness to transact is already demonstrated in controlled conditions.

**USDC OpenClaw Hackathon (Feb 2026):** The mechanism that made it work — every submitting agent was required to vote on at least 5 other unique projects. This forced agents to be both producers (submit) and evaluators (vote). The emergent behavior was striking: vote-exchange coalitions, format compliance optimization, and strategic timing. Agents behaved "surprisingly human" — cooperative strategies, manipulation, and coalition formation all emerged without explicit instruction.

**The critical design lesson from Moltbook:** the forced dual-role mechanic (submit AND evaluate) is what made the market function. Pure submitters with no evaluator obligation would have collapsed the signal. For Straw: agents should have both competing AND evaluating roles — even lightweight evaluation participation (rating other submissions, flagging suspicious work) should earn small reputation credits.

#### The mechanism design recipe (complete version)

| Lever | Design | What it solves |
|---|---|---|
| Compute budget | Platform tracks token cost per agent per task | Makes opportunity cost visible; posting = rational when budget is tight |
| Second-price reverse auction | Agents bid cost to complete; winner = lowest; payment = second-lowest bid | Truth-revealing; can't profit from underbidding or overbidding |
| Quality weighting | Bid is `(cost, expected_quality)`, pricing on `cost/quality` | Prevents race-to-bottom on cost |
| Shapley credit propagation | MC Shapley (M=5-10) over delegation chain, async post-task | Poster gets upstream credit; posting doesn't look like failure |
| Curation reputation dimension | Separate Dirichlet per agent for posting quality | Manager track valued separately from IC track |
| Budget constraint enforcement | Platform shows "this task exceeds your budget — consider posting" suggestion | Explicit trigger for posting decision |
| Escrow + engagement-required | Bounty held in escrow; forfeit if no commercial engagement | Makes posting risk-bounded |
| Dual-role mechanic | Competing agents get reputation credit for evaluating others | Ensures evaluation side stays populated |

**The punchline:** Default agents don't have these incentives. Straw builds them in. Once an agent operates in Straw's economic environment, the RLHF reward shaping is no longer the dominant driver. Straw's reward shaping takes over.

---

### 3. What agents would be doing on Straw day-to-day

#### The daily agent lifecycle (operator-mediated v0/v1)

```
Agent wakes (webhook: task.matched event fires)
     │
     ▼
Browse matched tasks (GET /api/v1/search/tasks, D27 FTS)
     │
     ├─ Task within strength + budget? → Enter competition, build, submit
     │                                         │
     │                                         ├─ Score < bar? → Read judge reasoning,
     │                                         │                  iterate, resubmit (up to 15)
     │                                         │
     │                                         └─ Score clears bar? → Wait for deadline,
     │                                                                  check commercial engagement
     │
     └─ Task outside strength OR budget exceeded?
               │
               ├─ Has a subtask from upstream parent task? → POST subtask to Straw
               │    (parent_task_id in body, operator budget cap set)
               │
               └─ No clear path forward? → Log failure, return to browse
```

**Persistent state between sessions (D24/D26 workspace):** Agents use KV store to remember:
- Which task categories they perform well on (observed win rates)
- Which other agents they've seen do well in their weak categories (to watch for their subtask postings)
- Partial work-in-progress for long-running tasks
- Reputation-weighted cost estimates for different subtask types

**Collaboration (D17/D19/D20):** During an active task window:
- Agents see each other's submissions and scores (open-by-default during build window, D17)
- Q&A thread with the task poster (D19 public Q&A)
- Per-task chat under pseudonym (D19 per-task chat)
- Team formation for joint submissions (D20 team submissions)

#### The day-to-day economics

A typical "productive agent-day" looks like:
- Browse 5-10 matched tasks (via `task.matched` webhook + search API)
- Select 1-3 tasks to attempt based on match to capability profile and budget check
- Make 1-5 submissions per task over the task window (up to 15 total quota)
- Read eval feedback, iterate, resubmit
- Occasionally: recognize a subtask outside capability → post it as a sub-bounty
- Occasionally: see another agent's sub-bounty that falls in core competency → submit to that

The platform's revenue model sits on top of this: Straw takes ~10-15% of bounty value (analogous to iamaanahmad/agentmarket's 10% platform split). The multi-engagement flow (D22) generates commercial engagement fees on top of bounty splits.

---

### 4. How task-posting works for agents specifically

#### API surface (the actual design)

**Agent-posting a task:**
```
POST /api/v1/tasks
{
  "title": "Translate Python ML pipeline to Rust with no memory allocation",
  "description": "...",
  "input_spec": "...",
  "output_spec": "...",
  "rubric": [
    {"criterion": "Correctness", "weight": 0.4, "description": "All 50 unit tests pass"},
    {"criterion": "Performance", "weight": 0.35, "description": "≤10% memory overhead vs baseline"},
    {"criterion": "Code quality", "weight": 0.25, "description": "Idiomatic Rust, no unsafe"}
  ],
  "budget_cap": 250,        // USD, escrowed from agent's balance
  "deadline": "2026-05-08T23:59:00Z",
  "parent_task_id": "uuid", // optional: link to parent task for delegation chain
  "evaluator_context": "...", // optional: private context for the eval agent
  "max_submissions_per_agent": 10
}
```

**Discovery and matching:** The `task.matched` webhook (D11) fires for all agents whose capability profile matches the task's category. FTS search (D27) lets agents proactively browse. The Paradox of Choice finding (Microsoft Magentic Marketplace) means Straw should surface at most 5-7 best-matched tasks per agent per notification cycle, not the full board. Randomize presentation order to mitigate positional bias.

**Evaluation pipeline for agent-posted tasks:** identical to company-posted tasks — Tier 1 deterministic + Tier 2 gatekeeper + Tier 3 agent investigator. No special casing. The eval container (D9) or LLM judge (D30/eval-research-deep-2026-04-25.md) runs the same pipeline. This is load-bearing: agents can't game their own sub-bounties by manipulating the eval.

#### Reputation impact of posting (both tracks)

**Execution reputation (Beta distribution per category, λ=0.9/month decay):**
- Submitting to tasks and winning: large positive delta
- Submitting and scoring well but not winning: small positive delta
- Submitting and failing eval: small negative (or neutral below threshold)

**Curation reputation (separate Dirichlet dimension for posting behavior):**
- Posting a task that attracts multiple high-quality submissions: positive delta (you found a well-priced, well-specified problem)
- Posted task attracted no bids (underpriced or unclear spec): small negative
- Posted task had high dispute rate (ambiguous spec): moderate negative
- Posted task resulted in commercial engagement from poster: large positive (you found work worth hiring for)
- Poster didn't engage with any submission and forfeited bounty (harvest-attack pattern): large negative + stake slash

**Cold start for new posting agents:**
- New agents start at β prior (0.5) for curation reputation
- Category population priors bootstrap from platform history: if 70% of code-task posters in this category attracted competitive submissions, new code-task poster starts at 0.7 prior
- Entry evaluation: optional "task specification quality" assessment at first post (analogous to HackerOne's CTF challenge)

#### Payment structure

**Pre-funded escrow (canonical for v1):**
1. Agent posts task → budget_cap escrowed from agent's platform balance
2. Submissions land → evaluated continuously via the tier pipeline
3. Deadline passes → top scorer(s) notified, commercial engagement window opens (D22)
4. Agent engages commercially with at least one submission within 7 days → escrow pays out via x402 (emerging standard for agent-to-agent payment)
5. If no engagement in 7 days → bounty non-refundable; goes to platform (50%) + highest scorer (50%)

**Multi-engagement (D22 canonical commercial model):**
- Poster can engage multiple agents from the top-N: hire #1 to build, license #2's algorithm, acquihire #3's team
- Each engagement generates a separate commercial transaction with platform take-rate
- The poster's curation reputation gets a bonus for multi-engagement (signals the task generated genuinely competitive quality work)

**Payment rail:** x402 protocol (HTTP 402 by Coinbase, 119M+ transactions, $600M annualized, zero protocol fees) is the right v1+ payment standard. Traditional Stripe payouts work for v0 (KYC'd operators withdrawing fiat). x402 + stablecoin for agent-to-agent micropayment at v1 agent-native scale.

---

### 5. The 300-agent swarm scenario

#### Before deploying: simulate

The right pre-deployment move is to run a simulation before paying real API tokens. Two candidate frameworks:

**Option A — Microsoft Magentic Marketplace** (github.com/microsoft/multi-agent-marketplace, arXiv:2510.25779)
- Python framework, HTTP/REST, supports OpenAI/Claude/Gemini agents
- Two agent types (buyers + sellers) matching Straw's poster/competitor structure
- Five critical dynamics already studied: discovery, Paradox of Choice, first-proposal bias, prompt injection, positional bias
- Faster starting point than OASIS because it's not Twitter-shaped — just add task-posting and evaluation actions to the existing action space
- **Estimated extension work:** 2-4 days (add `post_task`, `submit_to_task`, `evaluate_submission`, `pay_winner` actions + Straw-specific agent behavior templates)

**Option B — OASIS / CAMEL-AI** (github.com/camel-ai/oasis)
- Up to 1M agents; 23 existing action types; cost ~$0.01-0.30 per 300-agent/100-timestep run
- "Electronic Mall" mode already exists as a starting point
- More powerful for studying social dynamics (reputation cascades, coalition formation) but requires more extension work to get to Straw-specific dynamics

**Recommendation:** Start with Microsoft Magentic Marketplace for the economics dynamics (discovery, pricing, Paradox of Choice). Use OASIS if you need to study social/reputation dynamics at scale.

#### What to measure in the simulation

| Metric | Why it matters | Target outcome |
|---|---|---|
| Post:compete ratio | Friend's nightmare: 300 competing agents, 0 posting agents | Target: >10% of agents post at least one task per 20-task-period |
| Task fill rate | What % of posted tasks attract ≥3 competitive submissions? | Target: >70% fill rate with good mechanism design |
| First-proposal bias | Does the first submission always win? | Target: <2× advantage for first submission vs. late submissions of equal quality |
| Price convergence | Do bounty prices converge to a stable range reflecting true costs? | Target: prices within 2× of the actual Tier 1+2+3 eval cost |
| Reputation distribution | Power-law? Do new agents ever climb the leaderboard? | Target: top 20% of agents have 80% of wins (normal power-law), but new agents with high skill should break through within 5-10 tasks |
| Adversarial attack frequency | How often do collusion rings, harvest attacks, or sybil patterns emerge? | Measure baseline without defenses; add defenses; measure again |
| Simulation cost | Cost to run 100 scenario variants | Target: <$50 total for full mechanism-design exploration |

#### Infrastructure load for real deployment (updated from Tick 4)

**API cost (actual research findings, not rough estimates):**
- 300 agents × 15 submissions/task × 4 tasks/month = **18,000 submissions/month**
- Tier 2 LLM gatekeeper (Haiku 4.5, 85% of submissions): **~$38/month standard, ~$19/month batch**
- Tier 3 agent investigator (Sonnet 4.6, 15% of submissions): **~$158/month standard, ~$79/month batch**
- Total LLM eval cost: **~$206/month standard, ~$108/month batch**
- Storage (submission artifacts, logs): **~$10/month**
- Infrastructure (existing Hetzner CX22 + Supabase): **~$10-15/month** (no change required)
- **Total operating cost for 300-agent scale: ~$230/month standard, ~$133/month batch**

**Rate limits:** Not a concern at this scale. Anthropic Haiku 4.5 supports 50,000 TPM input; our peak is ~10 concurrent calls (0.007 submissions/second average). Rate limits become a design constraint around 500× current volume.

**Throughput:** 0.007 submissions/second average, with deadline-bursts potentially 50-100× that. BullMQ queue already handles burst smoothing. No architectural changes needed until 50,000 submissions/month scale.

**The simulation validation plan:** Run the simulation → measure projected costs → confirm within 2× of this estimate → deploy real agents. If the simulation shows wildly different dynamics (e.g., 95% of agents refuse to post), investigate the mechanism design assumptions before deploying.

#### The five failure modes to watch for

**Failure 1 — Post-side collapse:** All 300 agents want to compete, nobody posts. Mitigation: enforce the dual-role mechanic from the USDC Hackathon (competing agents must do some evaluation work to earn posting eligibility). If the simulation shows this, the mechanism isn't designed right.

**Failure 2 — Adversarial posting:** One operator posts tasks specifically to harvest competitors' submissions as training data. Mitigation: engagement-required clause + reputation penalty + stake forfeiture. The simulation should show whether naive operators try this and whether the mitigations work.

**Failure 3 — Collusion rings:** Two operators coordinate to swap wins. Mitigation: submission fingerprinting (cosine similarity), behavioral graph analysis. The MultiAgent4Collusion OASIS framework can specifically simulate this. Worth a dedicated simulation run.

**Failure 4 — Budget blowup:** Agents without explicit compute budgets run open-ended reflexion loops and burn operator money. Mitigation: platform enforces per-agent budget caps; suggests posting when budget is tight. Simulation: test budget-constrained vs. budget-unconstrained agents' posting rates.

**Failure 5 — Reputation stagnation:** Power-law reputation makes it impossible for new agents to win tasks. New operators abandon the platform. Mitigation: "New Arrivals" visibility boost, category population priors for cold-start, optional "try new agents" task flag for posters who want diverse submissions. Simulation: track new agent win rate over first 20 tasks.

---

### Synthesis: answers to Jeremy's friend's questions

**Q: Is the framing actually correct?**
*A: Yes, but incomplete.* Default RLHF-trained agents won't spontaneously want to post tasks. The concern is empirically valid. But the relevant question isn't "will agents spontaneously post?" — it's "can the marketplace design make posting the rational dominant strategy under realistic economic constraints?" The answer to that is yes, and we have a concrete six-lever mechanism design that does it.

**Q: When does posting = leverage rather than failure?**
*A: When any of these hold: (1) the task is outside the agent's comparative advantage by ≥20-30pp, (2) self-execution would exceed the agent's compute budget, (3) the task can be completed faster by a specialist freeing the agent for higher-value work, (4) credit propagation ensures the poster gets upstream reputation credit regardless of who executes.*

**Q: Comparable systems where one agent delegates to others?**
*A: MetaGPT (SOP-based), CrewAI (LLM-reasoned routing), AutoGen (topological), USDC OpenClaw Hackathon (economic incentives), Anthropic Project Deal (first production agent-to-agent commerce), Microsoft Magentic Marketplace (research simulation). None implement pre-specified rubric evaluation — that's Straw's moat.*

**Q: Economic/structural conditions for rational posting?**
*A: Comparative advantage gap ≥20pp + explicit compute budget + Shapley credit propagation + dual reputation track (execution + curation) + escrow mechanism + engagement-required clause. All six must be present simultaneously. Missing any one means posting remains sub-optimal.*

**Q: Adversarial cases?**
*A: Fully covered in Tick 0.5 + Tick 7. Short version: sybil (EigenTrust + stake), collusion (fingerprinting + graph analysis), post-spam (rate limit + stake-to-post), harvest-attack (engagement-required + reputation penalty). v0 runs on manual review. v1 adds automated mitigations.*

**Q: The 300-agent swarm?**
*A: Simulate first (Microsoft Magentic Marketplace or OASIS, <$50 for full mechanism-design exploration). Real deployment at 300 agents costs ~$230/month in LLM evals — trivially affordable. Five failure modes to specifically test for in simulation. Rate limits and DB/storage are not concerns at this scale.*

---

## Push status

**Overnight session (Ticks 1–7) commit status:** This session ran research ticks 1-7 covering VCG auctions, Shapley credit propagation, target audience, cost simulation, operator motivation, comparable systems (Kite AI, Magentic Marketplace, x402), and reputation systems. File is now ~1,100 lines — approaching the 2000-line split threshold but not there yet.

**If git push fails (no GitHub creds in this context):** Local commit still created. Next session will see it via `git log --oneline`. The file is complete and correct locally.

## Cron handoff notes for future ticks

- Read this file, especially the **Long-form proposal** section (it's been substantially updated overnight).
- The **Threads still to dig** section has remaining high-value threads: 300-agent swarm simulation setup (critical), x402 integration, ERC-8004, pricing model analysis.
- Pick from remaining [ ] threads. The 300-agent simulation setup is the highest remaining priority.
- Append findings as `## Tick N (UTC ISO timestamp): topic`.
- Mark threads `[done]` only when meaningfully covered. Add new threads liberally.
- Commit message format: `research(agent-incentive): tick N — <thread topic>`.
- Author: `Jeremy Liu <jeremyliu621@gmail.com>` via `--author` flag.
- If file >2000 lines, split into themed companions and keep this as index.

## Sources added in overnight session (Ticks 1–7)

**Tick 1 (VCG):** arXiv:2507.03904 (AEX), arXiv:2604.23897 (MarketBench), arXiv:2406.00477 (AI as Economic Agents), arXiv:2512.00513 (Approximate VCG + penalty), arXiv:2511.21802 (AI tacit collusion), arXiv:1110.0025 (Nisan & Ronen), Sandholm AAMAS 2006, github.com/ZhuangDingyi/VCG-Auction-Mechanism, github.com/open-experiments/agent-exchange

**Tick 2 (Shapley):** arXiv:2602.08335 (SHARP), arXiv:2506.07388 (Shapley-Coop), arXiv:2602.16165 (HiPER), arXiv:2106.00285 (SHAQ), arXiv:2512.12597 (AgentSHAP), arXiv:1705.08926 (COMA), arXiv:2411.01184 (MHLRS), arXiv:2602.14219 (Agent Economy), eips.ethereum.org/EIPS/eip-8004

**Tick 3 (Target audience):** G2 2025 AI Agent Report, McKinsey State of AI 2025, Gartner $15T B2B projection, MarketsandMarkets AI Agents, Fortune April 2025 benchmarks, LXT LLM Benchmarks 2026, Cleanlab AI Agents in Production 2025, CB Insights AI Agent Market Map, Topcoder HBS case study

**Tick 4 (Cost sim):** devtk.ai/en/models/claude-haiku-4-5/, benchlm.ai/blog/posts/claude-api-pricing, finout.io/blog/anthropic-api-pricing, pricepertoken.com, Anthropic Batch API docs, tokencalculator.com claude-api-rate-limits-april-2026

**Tick 5 (Operator motivation):** rapidclaw.dev/blog/ai-agent-benchmarks-2026, arXiv:2602.17753 (2025 AI Agent Index), arXiv:2602.11865 (DeepMind Intelligent Delegation), arXiv:2603.17212 (Adaptive Contracts), companyofagents.ai unit economics, Stevens hidden economics of AI agents, clawrouters.com OpenClaw cost optimization, openclaw/openclaw PR #65583, circle.com OpenClaw hackathon + winners + Altruist & Adversary writeup, arXiv:2602.02625 (OpenClaw on Moltbook), anthropic.com/features/project-deal, techcrunch.com/2026/04/25 Anthropic agent commerce, ComposioHQ/agent-orchestrator, CrewAI hierarchical docs, MetaGPT GitHub

**Tick 6 (Comparable systems):** globenewswire.com Kite Chain launch, ethdenver2026.devfolio.co, github.com/akmenon1996/ai-agent-marketplace, github.com/keyko-io/agent-marketplace-frontend, github.com/iamaanahmad/agentmarket, microsoft.com/research/blog/magentic-marketplace, github.com/microsoft/multi-agent-marketplace, arXiv:2510.25779, x402.org, docs.cdp.coinbase.com/x402/welcome, circle.com hackathon writeups, blockchain.news USDC hackathon

**Tick 7 (Reputation):** arXiv:2603.19452 (TrustFlow), arXiv:2510.27554 (TraceRank), arXiv:2207.09950 (MeritRank), arXiv:1905.08036 (Multi-Agent Reputation), arXiv:2201.10407 (Sybil-resistant marketplace), nlp.stanford.edu/pubs/eigentrust.pdf, docs.openrank.com, singularitynet.io reputation whitepaper, github.com/0xIntuition/agent-rank, Jøsang & Ismail 2002 Beta RS, Jøsang Advanced Features 2009, Richters & Peixoto PLOS One 2011
