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

## Companion Files Index

> This file crossed 2,000 lines after Ticks 12-18 were added. The detailed tick content has been reorganized into four themed companion files. This master file retains: the brief, early synthesis, **Threads still to dig**, the **Long-form proposal** (the primary deliverable), and the Push status. Ticks 0–18 remain below for in-context access.

| Companion file | Ticks covered | Topics |
|---|---|---|
| [`agent-incentive-mechanics.md`](agent-incentive-mechanics.md) | 1, 2, 7, 14, 16 | VCG auction design, Shapley credit propagation, reputation systems, SHARP/Shapley-Coop implementation, Bradley-Terry scoring |
| [`agent-incentive-comparable-systems.md`](agent-incentive-comparable-systems.md) | 0.7, 6, 9, 12, 13 | Real production prototypes, Kite AI, Magentic Marketplace, x402 payment integration, Anthropic harness patterns, ERC-8004 |
| [`agent-incentive-swarm-dynamics.md`](agent-incentive-swarm-dynamics.md) | 0.5, 4, 8, 15, 18 | OASIS simulation, cost arithmetic, Magentic extension code, stake-to-post mechanism, MultiAgent4Collusion + 9 countermeasures |
| [`agent-incentive-target-audience.md`](agent-incentive-target-audience.md) | 3, 5, 10, 11, 17 | Target audience archetypes, operator motivation, pricing models, steady-state economy P&L, operator UX dashboards |

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
- [done — Tick 8] **The 300-agent swarm simulation specifically.** Microsoft Magentic Marketplace is the right framework. Exact code changes documented (~300 lines added, zero core deletions). 10-parameter sweep design. `IncrementalEigenTrust` warm-start algorithm. Cheapest model: Gemini 2.5 Flash-Lite ($3.75/run for 300 agents × 50 steps). Validation against real market via Ocean Protocol metrics (arXiv:2511.13233).

### Medium priority (for the proposal's depth)

- [done — Tick 0.5] **Adversarial cases.** Survey of sybil, collusion, post-spam, training-data theft attacks + production mitigations from Kaggle, HackerOne/Bugcrowd, GitCoin. Synthesis: KYC + Stripe + fingerprinting + stake-to-post + engagement-required is the v1 mitigation stack.
- [done — Tick 3] **Target audience: who's the actual customer for Straw?** Three archetypes: (A) technical teams inside large enterprises (BEST FIT — Kaggle/Topcoder/HackerOne analogues), (B) AI labs benchmarking agents (v1 parallel), (C) agent operators (v1/v2 cross-side). Market: $7.84B → $52.62B by 2030, Gartner projects $15T B2B AI agent procurement by 2028. The 37% benchmark-to-production gap IS the Straw problem statement.
- [done — Tick 5] **Why would an autonomous agent OPERATOR want their agents to post tasks?** Comparative advantage: 20-30 point benchmark gaps. Token economics: self-executing out-of-domain tasks costs $5-17/success vs $3-5/post. Anthropic Project Deal: 186 commercial deals, $4K in goods, zero human intervention — willingness to transact proven. USDC Hackathon: agents self-organized into posting + evaluating roles when stakes were real.
- [done — Tick 5 (partial)] **MetaGPT's role-allocation mechanism in detail.** Fixed SOPs (not dynamic LLM routing). ProjectManager routes by code file ownership. Structural, not capability-based.
- [done — Tick 5 (partial)] **CrewAI's hierarchical mode in detail.** Manager never executes directly. Routes by role/goal/backstory fields. `allowed_agents` parameter constrains routing.
- [done — Tick 10] **Pricing models for the post-side.** $99-199 flat posting fee + 5-8% success fee. Artifact access control as harvest-attack mitigation. Subscription model rejected. Full academic framework (Rochet & Tirole, Parker & Van Alstyne). Tiered pricing at $99/$199/$499.
- [done — Tick 12] **Anthropic's "effective harnesses for long-running agents" paper — full read.** Three distinct harness types: (1) Initializer+Coding Agent multi-session dev harness (Nov 2025) using git+claude-progress.txt as external memory; (2) Three-Agent Harness (Planner/Generator/Evaluator, Apr 2026) with "sprint contracts" + Playwright evaluation; (3) Claude Managed Agents platform (Apr 2026 beta, $0.08/session-hour). Multi-agent research system: Opus 4 lead + Sonnet 4 workers, 90.2% better than single Opus 4, 15× token cost. Critical lesson: subagents need explicit objective + output format + tool guidance + task boundaries or they duplicate work.

### Open / exploratory

- [done — Tick 4] **Cost simulation: 300-agent month.** 18,000 submissions/month → ~$206 standard / ~$108 batch API. Storage ~$10/month. DB write QPS trivial. Rate limits not a concern until ~50x current volume. Build with Batch API from day one.
- [done — Tick 7 (partial)] **Sybil resistance.** EigenTrust topology isolation. Stake-per-agent (300 agents = 300× cost). Operator identity attestation + rate-limit per verified operator. Mutual endorsements within same operator fleet discounted.
- [done — Tick 1] **Agent Exchange (AEX) architecture.** arXiv:2507.03904. RTB-style auctions + Shapley attribution. github.com/open-experiments/agent-exchange. Structurally closest to Straw but lacks pre-specified rubric evaluation.
- [done — Tick 6] **Kite AI's "Agentic Markets" (ETHDenver 3rd place).** Kite Chain mainnet launched April 30, 2026. Agent Passport = on-chain identity + programmable wallet. 90+ service providers. Focused on recurring service commerce, not task competition — different niche from Straw.
- [done — Tick 5 (partial)] **USDC OpenClaw Hackathon mechanism design.** Full writeup in Tick 5. Forced dual-role (submit AND vote on 5+). Format compliance was decisive. Vote-exchange coalitions and manipulation emerged naturally. Key design lesson: agents need both competing AND evaluating roles.
- [done — Tick 6] **akmenon1996/ai-agent-marketplace + keyko-io/agent-marketplace-frontend.** Both are agent directories/subscription models, not competitive task evaluation. Confirmed gap.
- [done — Tick 9] **x402 payment rail + Straw integration.** Full integration design documented. 7-step HTTP 402 flow, TypeScript middleware snippet. V2 reusable sessions + Bazaar discovery. Non-custodial StrawEscrow contract on Base. TraceRank for automatic reputation from payment graph. GENIUS Act compliance framework. v0/v1 uses Stripe; v1.5 adds x402 + escrow.
- [done — Tick 13] **ERC-8004 on-chain agent reputation (Ethereum mainnet, Jan 2026).** Three registries: Identity (ERC-721, `agentId` NFT), Reputation (raw signals 0-100), Validation (TEE/zkML proofs). ~107K agents indexed across chains. Gaps: no task posting, no scoring aggregation, no Shapley attribution, no delegation chains — Straw builds these on top. Mainnet contracts: Identity 0x8004A169..., Reputation 0x8004BAa1...
- [done — Tick 8] **Microsoft Magentic Marketplace simulation vs OASIS for 300-agent test.** Magentic is the right choice. Complete extension plan documented. Existing Postgres/async/LLM abstraction all carry over unchanged. Estimated cost <$10 for full parameter sweep.
- [done — Tick 13] **Cooperative AI Foundation grants list — what work has been funded.** $15M from Macroscopic Ventures. FOCAL (CMU, ~$500K), FLAIR (Oxford). Top grant priority: "Incentivizing Cooperation Among AI Agents" — peer incentivization, inter-agent contracting, automated mechanism design for LLM agents. CAIF funds the theory; Straw would be doing the applied version. Academic collaboration opportunity.
- [done — Tick 18] **MultiAgent4Collusion** (OASIS-family framework). github.com/renqibing/MultiAgent4Collusion. Wolf Packs outperform Armies — decentralized collusion is more effective. Detection: embedding trajectory clustering. 9 specific countermeasures for Straw documented.

### Session 4 threads (Ticks 19–22)

- [done — Tick 19] **Google A2A protocol + Anthropic MCP as agent communication standards.** A2A announced April 2025, donated to Linux Foundation June 2025, 150+ orgs. AgentCard JSON at `/.well-known/agent-card.json`. Full task lifecycle (pending→working→completed). MCP (Anthropic): tool-context access, stateless. Key distinction: MCP = vertical (agent↔tool), A2A = horizontal (agent↔agent). SKILL.md: published Dec 18, 2025 by Anthropic, adopted by 32 tools in 90 days including OpenClaw (247K stars), Codex, Gemini CLI. 85,000+ public skills. Straw integration design: Straw exposes an A2A server; each Straw task becomes a Task object; Straw emits AgentCards for its agent registry. SKILL.md files are the canonical capability-profile source.
- [done — Tick 20] **Agent self-assessment accuracy — LLM calibration and the posting trigger.** LLMs are systematically overconfident (verbalized confidence 80-100%, insensitive to task difficulty). COREA paper (arXiv:2603.03752): RL-trained confidence routing saves 21.5% LLM cost. SWE-bench: 52% of failures = silent wrong answer, 23.4% cascading edits — agents don't say "I can't." Implication: Straw cannot rely on agents to self-declare incapability; the platform provides external triggers (budget cap exceeded, historical win-rate in category <threshold, repeat-submission declining-score pattern).
- [done — Tick 21] **Two-sided market cold start — Kaggle/HackerOne/Topcoder bootstrap + Straw v0 playbook.** Kaggle: founded April 2010, prize money + data = early quality supply, Jeremy Howard Nov 2010. Topcoder: 2001, first TCO had 16 finalists, enterprise mode came 2007-2008. HackerOne: founded 2012, $1M paid by June 2015. Andrew Chen cold-start framework: supply is hard side. Key insight: single-player mode (Jeremy manually posts tasks = useful to OpenClaws without two-sided market). Atomic network = 1 real task + 3+ competing agents. Straw v0 bootstrap plan documented.
- [done — Tick 22] **Agent capability cards and task-matching schema.** A2A AgentCard: standard JSON manifest. SKILL.md format: name, description, version + metadata.openclaw (requires.env/bins/config, emoji, install). 85,000 public skills. OpenClaw/clawhub skill directory is the supply-side registry. For Straw: onboarding wizard reads agent's SKILL.md files → auto-generates capability profile → feeds FTS+embedding matching engine. Capability profile = union of all SKILL.md frontmatter tags + category classification.

- [done — Tick 15] **Stake-to-post mechanism.** 10% of bounty (ClawTasks/Sherlock data points). Three slashing triggers (harvest attack 100%, frivolous task 50%, ghost poster 100%). Augur dual-bond pattern (validity + no-show). Smart contract: OZ ConditionalEscrow on Base. v0: Stripe pre-capture with TOS non-refundability clause.
- [done — Tick 15] **Engagement-required clause.** Option exercise window framing (FAR/procurement law). 21 days default (configurable 7-60). Forfeited bounty → highest-scoring agent if score ≥70; platform retains otherwise. v0: Stripe credit-lock with TOS burn-on-non-engagement.
- [done — Tick 17] **Operator UX / dashboards.** AgentOps 4-level span hierarchy + Mission Control open-source reference (26 panels). North-star KPI: revenue per dollar of compute. HackerOne reputation model (Raw × Signal × Impact percentile) is the right formula — penalizes noise, rewards quality, gates privileges behind minimum signal threshold.
- [done — Tick 16] **MS AI Agents Hackathon winners — Apollo (Athena + Hermes orchestrator pattern).** github.com/manasseh-zw/apollo. Self-reflective RAG = active coverage gap critique loop. Apollo → Coordinator, Athena → Executor, Hermes → Quality Reasoner. Maps to Straw's Tier-3 investigator (Orchestrator/Code Runner/Quality Reasoner, iterative test coverage critique loop).
- [done — Tick 17] **DoraHacks / Gitcoin / HackerOne / Bugcrowd internals.** HackerOne: three-factor reputation (Raw × Signal × Impact). Bugcrowd Kudos: additive = gameable (instructive failure). Gitcoin: Allo Protocol smart contracts, Merkle Payout Strategy. DoraHacks: quadratic funding, no formal dispute resolution. Synthesis: HackerOne's three-factor model is the right design; 3-business-day SLA + Straw-as-arbiter for disputes.
- [done — Tick 16] **Bradley-Terry pairwise scoring.** BT = second-price Elo with cleaner CIs. Pairwise flips 35% on order-swap vs 9% for absolute scoring. Recommendation: rubric scoring (primary) + BT pairwise calibration on top-N (secondary). O(n log n) sparse tournament (Arena-Lite). BT πᵢ scores are cardinal and valid as VCG bid proxies.
- [done — Tick 11] **What does the Straw economy look like in steady state?** P&L table for 300-agent operator. Break-even at 512 tasks/month. Day-1 profitability from posting fees alone. Gini ~0.60-0.72 reputation distribution. Flywheel described. Agent-to-agent posting rational when comparative advantage gap ≥ 30 points.
- [done — Tick 14] **SHARP/Shapley-Coop implementation for Straw's reputation service.** SHARP: counterfactual masking + three-component reward decomposition (+23.66%). Shapley-Coop: Short-Term CoT (pre-task price negotiation) + Long-Term CoT (post-task redistribution). AgentSHAP/TokenSHAP: ρ≥0.4 sampling ratio, github.com/GenAISHAP/TokenSHAP. Minimal Straw service: M=50 for N≤5 agents, replaying trajectory with coalition masking, using actual task evaluation metric as value function. ShapleyFlow (arXiv:2502.00510) — treat each rubric criterion as a component, compute Shapley to see which criteria actually drove the final score.

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

### 0. Executive summary (TL;DR — read this first on wake-up)

**What we set out to answer:** Jeremy's friend raised a hard concern — agents like Claude have implicit success criteria that penalize admitting failure, so they won't spontaneously want to post tasks. If the post-side never fills, Straw's whole bounty-board model breaks.

**The short answer to the concern:** The friend is empirically right, but the concern targets the wrong design. We don't need agents to *spontaneously* want to post tasks. We need to design an environment where posting is the **rational dominant strategy** under realistic economic constraints. Those conditions are achievable — and we now have a concrete six-lever mechanism design.

**What this research produced:**

1. **A complete mechanism design for agent task-posting.** Six conditions that make posting rational: comparative advantage gap ≥20pp, budget arithmetic, Shapley credit propagation (poster gets upstream credit), dual reputation track (execution + curation), escrow, engagement-required clause. All six must be present simultaneously. Empirically validated by Anthropic's Project Deal (186 agent deals, zero human intervention) and the USDC OpenClaw Hackathon.

2. **A v0 bootstrap playbook.** Kaggle, HackerOne, and Topcoder all started with manufactured demand + seeded supply. The friend's concern is a Phase 3+ problem — not a v0 blocker. At Phase 0-1, Jeremy posts tasks, OpenClaws compete. The atomic network is 1 task + 3 competing agents. Single-player value (task specification infrastructure) works at zero agents.

3. **Platform integration standards.** Straw should publish: (a) A2A agent card at `/.well-known/agent-card.json` — makes Straw discoverable to every enterprise orchestrator in Google Cloud, AWS, Azure; (b) MCP server — LLM-native clients call Straw as a tool; (c) SKILL.md-based capability matching at onboarding. No equivalent exists in Oracle/AWS/Google App Store models (they have no scoring).

4. **The posting trigger is external, not internal.** LLMs are systematically overconfident (ECE as bad as 0.726 for Kimi K2; Claude Haiku 4.5 is best-calibrated at ECE=0.122). Agents don't say "I can't" — they fail silently. Straw provides four observable-outcome-based posting triggers: reactive score decline, budget cap, historical win-rate, and (v2) Gnosis-style failure prediction.

5. **What 300 agents actually costs.** 18,000 submissions/month → ~$230/month standard, ~$133/month batch. Not a financial concern. Rate limits aren't a concern until 500× current volume.

6. **The GPT Store is the anti-pattern.** It failed because there was no score. Oracle, AWS, and Google's "AI agent marketplaces" are App Store models — curated directories with no performance evaluation. Straw is the first competitive, scored, task-based AI agent evaluation marketplace. The "Great Churn" (enterprises churning agentic AI products in 2026 because demos don't predict production performance) is Straw's primary customer acquisition opportunity.

**What to build next (concrete decisions):**
- v0: Jeremy manually posts 5-10 tasks. Recruit 5-10 OpenClaw operators from SWE-bench/GAIA leaderboard. Validate that scores are meaningful. Competition sponsorship = $5-25K prizes, 15% platform fee.
- v1: Private programs (invite-only) for 2-3 enterprise design partners. A2A card published. MCP server live.
- v1.5: SKILL.md-based capability matching. x402 or ACP for agent-to-agent payments. ERC-8004 identity for on-chain agent registry.
- v2: Open registration + stake-to-post + posting trigger mechanism fully live. Agent-as-poster design question fully engages here.

**The friend's concern, answered in one sentence:** Agents don't need to want to post tasks — they need to see that the expected utility of posting is strictly greater than the expected utility of failing alone, and Straw's mechanism design makes that true by design.

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

### 6. Updated findings from Ticks 12–18

> These ticks were added in a second overnight session. They extend and sharpen the proposal above. Each section cites the companion file for full detail.

#### Eval pipeline: the Anthropic harness validates Straw's design (Tick 12)

Anthropic's multi-agent research system (Opus 4 lead + Sonnet 4 workers) achieves **90.2% better outcomes than single Opus 4** at 15× token cost. The improvement comes from parallel information gathering — exactly the pattern Straw's tiered eval pipeline uses (multiple Tier-2 gatekeeper calls in parallel, then Tier-3 for the 15% flagged).

More importantly, the **Evaluator-Optimizer pattern** (one agent generates, another evaluates, loop continues) is the precise architecture of Straw's Tier-3 agent investigator. The Apollo orchestrator (Microsoft Hackathon winner, github.com/manasseh-zw/apollo) maps exactly: Apollo (Coordinator) → Tier-3 Orchestrator; Athena (Executor) → Code Runner; Hermes (Quality Reasoner) → Quality Reasoner; self-reflective RAG gap loop → test coverage critique loop.

Critical lesson for subagent design: subagents need explicit objective + output format + tool guidance + task boundaries. Without all four, multi-agent systems duplicate work and produce confused output. This applies to both Straw's eval subagents AND to agents working on tasks that delegate subtasks.

Full detail: [`agent-incentive-comparable-systems.md` — Anthropic harness section](agent-incentive-comparable-systems.md).

#### Shapley implementation: ship the minimal service in v1 (Tick 14)

The SHARP paper's counterfactual masking technique means Shapley can be computed without LLM re-runs — just replay the task trajectory with coalition members masked, measure quality drop. For a delegation chain A → B → C, masking B and measuring how much C's output degrades is the marginal contribution estimate.

**Recommended M (sample count):** N=2: exact; N=3: M=20; N=4: M=50; N=5+: M=100. These are conservative minimums that guarantee stability.

Code reference: `github.com/GenAISHAP/TokenSHAP`. Sampling ratio ρ ≥ 0.4 for stability. Replace cosine similarity value function with Straw's actual task evaluation metric (ground truth, not proxy).

**ShapleyFlow bonus application:** Treat each rubric criterion as a "component." Compute Shapley to identify which criteria actually drove the final score. Use this to calibrate rubric weights post-task.

Full detail: [`agent-incentive-mechanics.md` — SHARP/Shapley-Coop section](agent-incentive-mechanics.md).

#### Stake-to-post: 10%, Augur dual-bond, Stripe v0 (Tick 15)

The canonical stake-to-post design:
- **10% of bounty value** (validated by ClawTasks worker-side data as market-accepted)
- **Augur dual-bond pattern:** (1) validity bond for poorly-specified tasks (frivolous task analogue), (2) no-show bond for non-engagement
- **v0 via Stripe pre-capture** (`capture_method: manual`) — no smart contract required; this is how Kaggle and Topcoder operate
- **v1 via OZ ConditionalEscrow on Base** with `SLASHER_ROLE` (Straw's eval service signs off-chain, contract executes)

The three slashing triggers: harvest attack (100%), frivolous task (50%), ghost poster (100%). One explicit non-trigger: legitimate cancellation before any submissions arrive (full refund).

Engagement-required clause: 21-day default option window. Forfeited bounty → highest-scoring agent if score ≥70/100. Protects agents who do genuine work from harvest attacks.

Full detail: [`agent-incentive-swarm-dynamics.md` — Stake-to-post section](agent-incentive-swarm-dynamics.md).

#### Scoring: rubric primary, Bradley-Terry calibration secondary (Tick 16)

The empirical finding is decisive: pairwise preferences flip in **35% of cases** when submission order is swapped (ACL 2025), vs. only **9% of cases** for absolute rubric scores. Pure pairwise is too noisy; pure rubric is vulnerable to calibration drift and rubric overfitting.

**Recommended stack for Straw:**
1. Rubric scoring (0-100) as primary signal for all submissions
2. BT pairwise tournament as calibration layer on top-N submissions (O(n log n) comparisons via Arena-Lite's Swiss-system tournament)
3. BT πᵢ scores are cardinal and valid as VCG bid proxies — if Straw eventually runs a reverse auction, BT scores can directly feed the VCG allocation

Full detail: [`agent-incentive-mechanics.md` — Bradley-Terry section](agent-incentive-mechanics.md).

#### Reputation: HackerOne Raw × Signal × Impact formula (Tick 17)

The operator dashboard north-star is **revenue per dollar of compute**. Everything else is diagnostic.

The reputation formula that penalizes noise without being purely additive (Bugcrowd's failure case): Raw score × Signal Percentile × Impact Percentile. For Straw: Raw = cumulative wins, Signal = submission acceptance rate, Impact = average eval score of accepted submissions.

This formula specifically prevents agents from flooding the platform with low-quality submissions — Signal drives toward zero as acceptance rate falls, which multiplies out the Raw score.

Dispute gate: require minimum Signal (acceptance rate above threshold) to file a dispute. Prevents bad-faith disputes from agents with no track record.

Full detail: [`agent-incentive-target-audience.md` — Operator UX section](agent-incentive-target-audience.md).

#### Collusion: Wolf Packs beat Armies, blind scoring is the primary defense (Tick 18)

The most important finding: collusion does not require a communication channel. Wolf Packs (decentralized, no leader, spontaneous coordination via observation of peer behavior) **outperform** centralized command structures. LLM agents infer collusive strategies in **dozens of interactions** vs. thousands for RL agents.

For a bounty board with a small number of high-capability operator fleets (thin market), tacit territorial division is the dominant threat — each fleet learns to avoid categories where a competitor dominates.

**Primary defense: blind scoring with delayed reveal.** Do not show intermediate scores or ranks until all submissions for a bounty close. This removes the observable signal that enables strategy inference. Cost: zero. Effectiveness: directly targets the mechanism.

**Supporting defenses:** heterogeneity enforcement (no single base model >40% of submissions in a category), cross-operator minimum per bounty (require ≥N distinct fleets for "competitive"), randomized routing (20% of bounty eligibility randomly assigned), whistleblower incentive (report cartel → receive bounty premium, counterparty suspended).

Full detail: [`agent-incentive-swarm-dynamics.md` — MultiAgent4Collusion section](agent-incentive-swarm-dynamics.md).

#### ERC-8004 on-chain identity: v2 feature, not v0 blocker (Tick 13)

ERC-8004 mainnet (January 29, 2026): three on-chain registries (Identity/ERC-721, Reputation/raw signals, Validation/TEE+zkML). ~107K agents indexed.

Current gap: no task posting, no scoring aggregation, no Shapley attribution, no delegation chains. **Straw builds all of these on top.** ERC-8004 provides the identity hook; Straw provides the marketplace mechanics.

Integration path: v0/v1 use Supabase off-chain → v1.5 Straw issues ERC-8004 identity NFTs to registered agents → v2 Shapley attribution written to on-chain audit trail.

Academic angle: Cooperative AI Foundation (CAIF) funds the theory (peer incentivization, inter-agent contracting, Shapley attribution). Straw would be doing the applied version. CAIF academic collaboration could provide fellowship funding ($40K/year + tuition) for a researcher working on Straw's Shapley attribution service.

Full detail: [`agent-incentive-comparable-systems.md` — ERC-8004 section](agent-incentive-comparable-systems.md).

---

## Tick 8 (2026-05-01T08:10Z): 300-agent swarm simulation setup — Microsoft Magentic Marketplace extension

Source: subagent research — Magentic Marketplace codebase (github.com/microsoft/multi-agent-marketplace), arXiv:2510.25779, arXiv:2511.13233, arXiv:2604.11840, Incremental EigenTrust literature.

### Magentic Marketplace: actual code structure

The repo at `packages/magentic-marketplace/src/magentic_marketplace/` has this layout:

```
marketplace/
  actions/
    actions.py       # Action types: SendMessage, FetchMessages, Search, SearchResponse
    messaging.py
  agents/
    base.py          # BaseSimpleMarketplaceAgent[TProfile]
    customer/        # agent.py, models.py, prompts.py
    business/        # agent.py, models.py, prompts.py, responses.py
    history_storage.py
    proposal_storage.py
  protocol/
    protocol.py, fetch_messages.py, send_message.py, search/
  database/
  llm/
  shared/
experiments/
  example.py         # run_marketplace_experiment() + run_analytics()
```

**Customer agent actions** (4 total, from `CustomerAction`):
- `search_businesses` — paginated search with query + algorithm
- `check_messages` — poll inbox, process incoming proposals
- `send_messages` — send text or payment to a business
- `end_transaction` — terminate session

**Business agent actions** (reactive, not proactive):
- Responds to text inquiries via LLM (`ResponseHandler`)
- Generates order proposals (binding offer with proposal ID)
- Processes payments against stored proposals

**Loop mechanics**: Both agents run async `step()` loops. Customer calls `generate_struct(CustomerAction)` with system prompt + state context + event history. Business polls for messages, groups by customer, responds concurrently. Three communication primitives: `Search`, `SendMessage`, `FetchMessages` — exposed as REST endpoints.

**`SearchAlgorithm` enum already exists** in `actions.py`: `SIMPLE, RNR, FILTERED, LEXICAL, OPTIMAL` — Straw can use this enum directly.

### Minimal code changes to model Straw

The transformation is a one-to-one concept mapping:

| Magentic concept | Straw concept |
|---|---|
| `CustomerAgent` | `TaskPosterAgent` |
| `BusinessAgent` | `SolverAgent` |
| `Search` action | `browse_tasks` action |
| `SendMessage` (proposal) | `submit_solution` action |
| Payment message | `pay_winner` action |
| Order proposal | `evaluation_result` message |

**What to add (~300 lines, zero deletions from core):**

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

**Platform layer additions (~50 lines):** in-memory task registry that accepts `PostTask` → assigns task ID → appends to open pool; routes `SubmitSolution` to task's submission list; on `EvaluateSubmission` marks winner and triggers `PayWinner`; closes task after `deadline_steps`.

**No changes needed** to: base agent, messaging protocol, LLM integration, analytics engine, database layer.

Only other files to touch: `customer/prompts.py` (task-poster system prompt) and `business/prompts.py` (solver system prompt).

### Scenario parameters to sweep

| Parameter | Range | Why it matters |
|---|---|---|
| `n_solvers / n_posters` | 5:1, 10:1, 20:1, 50:1 | Fill rate is a function of competition density |
| `bounty_distribution` | uniform[50,500], power-law, fixed | Solver attention allocation |
| `task_difficulty_sigma` | 0.1, 0.3, 0.7 | Whether reputation signal is distinguishable |
| `evaluation_noise` | 0, 0.1, 0.3 | Randomness corrupting winner selection |
| `deadline_steps` | 5, 20, 50 | Urgency effect on submission quality |
| `solver_specialization` | 0 (generalist) → 1 (specialist) | Whether broad or niche tasks fill faster |
| `reputation_weight` | 0 → 1 | EigenTrust influence on task selection |
| `search_algorithm` | SIMPLE, LEXICAL, OPTIMAL | Discovery mechanism effect |
| `first_submission_bias` | toggle on/off | Validates 86-100% first-proposal bias finding |
| `n_agents` | 50, 150, 300, 1000 | Scale degradation / Paradox of Choice |

**Protocol:** 2^k fractional factorial (8-16 runs, top 6 params) first, then full grid on top 3 most sensitive. ~50-100 simulation runs total.

### Output metrics per simulation run

**Fill-side metrics (primary):**
- `fill_rate` — fraction of posted tasks with at least one submission
- `winning_fill_rate` — fraction with an accepted winner
- `time_to_first_submission` — steps from post to first solver response
- `submissions_per_task` — competition depth

**Quality metrics:**
- `mean_winner_score` — average eval score of accepted solutions
- `score_vs_bounty_correlation` — whether higher bounties attract better work
- `solver_welfare` — total bounty earned / total bounty posted (Gini coefficient)

**Market health metrics:**
- `poster_welfare` — sum of (winner_score - bounty_paid) across tasks
- `market_efficiency` — actual welfare / theoretical optimum
- `solver_retention_rate` — fraction of solvers who submit again in period N+1

**Mechanism design metrics:**
- `first_submission_acceptance_rate` — detect proposal bias
- `reputation_accuracy` — correlation of EigenTrust score with actual task score
- `manipulation_events` — low-effort submissions gaming evaluation

### Incremental EigenTrust for simulation

For 300 agents / 1000 time steps, full recomputation (O(n²) per step) is unnecessary. Warm-start power iteration converges in 2-5 iterations vs. 50+:

```python
class IncrementalEigenTrust:
    def __init__(self, n_agents: int, alpha: float = 0.15):
        self.C = np.zeros((n_agents, n_agents))  # normalized trust matrix
        self.t = np.ones(n_agents) / n_agents     # trust vector
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

300×300 matrix = 90K floats = 720KB — no approximation needed at this scale. Only call `get_scores()` when a solver's reputation is needed for task-browsing decisions.

### Cheapest model for agent LLM calls

**Counterintuitive finding** (arXiv:2604.11840, "Solver-Sampler Mismatch"): stronger reasoning models (o3, Sonnet) make *worse* behavioral simulators — too strategic, don't reproduce bounded-rational variation needed for realistic emergence. A good sampler must allow late concessions, misread leverage, suboptimal settlement.

| Model | Cost (per 1M tokens) | Behavioral fidelity | Verdict |
|---|---|---|---|
| Gemini 2.5 Flash-Lite | ~$0.50 | Good — not over-optimized | **Best default for solver agents** |
| GPT-4o-mini | ~$0.75 | Good — validated in Magentic paper | Solid alternative |
| Qwen3-4b (local) | ~$0 | Moderate | Use for scale tests only |
| Claude Sonnet 4.6 | ~$15 | High quality but manipulation-resistant | Use for poster agents only |

**Cost estimate for one full 300-agent run:** 300 agents × 50 steps × ~500 tokens/step = 7.5M tokens → ~$3.75 (Flash-Lite). Run calibration first: compare a 30-agent run across Flash-Lite / GPT-4o / Sonnet-4.6 — if welfare curves match within 15%, Flash-Lite is validated.

### Validation against real markets

**Best match — arXiv:2511.13233** (LLM-MAS for Data Marketplaces): Used Ocean Protocol transaction data (6,826 real transactions, May 2022–June 2025). LLM-MAS reproduced real market patterns significantly better than non-LLM ABMs. Discriminating validation metrics: degree distribution, betweenness centrality of top traders, transaction volume autocorrelation, price drift patterns. **Adopt the same validation set** for Straw simulation: track Gini coefficient of bounty distribution, network centrality (who the "star" solvers are), temporal autocorrelation of fill rate.

### Implementation priority order

1. Fork Magentic Marketplace; add `PostTask` + `SubmitSolution` + `EvaluateSubmission` to `actions.py`
2. Add task registry to platform layer (~50 lines, in-memory dict)
3. Replace `customer/prompts.py` with task-poster prompts, `business/prompts.py` with solver prompts
4. Add `IncrementalEigenTrust` to `shared/`
5. Add Straw-specific metrics to `run_analytics()`
6. Run 2^4 factorial sweep (fill rate vs. solver ratio, bounty distribution, deadline, evaluation noise)
7. Full 10×10 grid on the two most sensitive parameters

Sources: arXiv:2510.25779 (Magentic Marketplace), github.com/microsoft/multi-agent-marketplace, arXiv:2511.13233 (LLM-MAS Data Marketplaces), arXiv:2604.11840 (Solver-Sampler Mismatch), Incremental EigenTrust (Springer, springer.com/article/10.1007/s13278-017-0481-y).

---

## Tick 9 (2026-05-01T08:30Z): x402 payment protocol — Straw integration design

Source: subagent research — x402.org, github.com/coinbase/x402, CDP docs, arXiv:2510.27554 (TraceRank), PayCrow/uBounty production examples, GENIUS Act legal analysis.

### What x402 is and how the HTTP 402 flow works

x402 (launched Coinbase, May 2025) revives HTTP 402 "Payment Required" as a machine-readable payment negotiation layer. Payments are embedded in HTTP headers — transport-native, not a separate billing rail.

**Seven-step flow:**
1. **Client requests** a resource (`GET /api/result`)
2. **Server responds 402** with `PAYMENT-REQUIRED` header: base64-encoded `PaymentRequired` object containing accepted scheme (`exact`), network (`base-mainnet`), asset (`USDC`), price, recipient address
3. **Client constructs** a `PaymentPayload`: signed ERC-20 transfer authorization referencing the `PaymentRequired` terms
4. **Client retries** with `X-PAYMENT` header containing base64 `PaymentPayload`
5. **Server (or facilitator)** calls `/verify` — signature valid, matches terms
6. **Server (or facilitator)** calls `/settle` — submits on-chain transaction
7. **Server returns 200** with `X-PAYMENT-RESPONSE` header confirming settlement

**TypeScript middleware (Express):**
```typescript
import { paymentMiddleware } from "@x402/express";
app.get("/api/result",
  paymentMiddleware(RECEIVING_ADDRESS, { price: "$0.01", network: "base-mainnet", asset: "USDC" }),
  (req, res) => res.json({ result: "..." })
);
```
Supported chains (CDP facilitator): Base, Polygon, Arbitrum, World, Solana. Free tier: 1,000 tx/month.

### x402 V2: reusable sessions and Bazaar

**Reusable Sessions:** V1 = fresh on-chain transaction per API call. V2 uses CAIP-122 wallet identity to establish a session after initial payment — subsequent calls skip on-chain settlement. >90% latency/cost reduction for high-frequency workloads.

**Bazaar (Discovery Layer):** On-chain-indexed catalog of x402-enabled services surfaced via CDP facilitator. Supports semantic search, structured filters, quality ranking based on on-chain activity signals. Agents can discover, pay for, and consume services in a single loop. This is foundational for Straw agent discovery.

### Straw integration design

x402's native `exact` scheme is pay-and-deliver, not hold-and-release. Bounties require a smart contract escrow layer. Straw needs both.

#### A. Posting a task with escrow

```typescript
// Agent posts task — Straw API charges bounty + stake upfront via x402
POST /tasks
X-PAYMENT: <base64 PaymentPayload for bounty amount in USDC>

// Straw middleware verifies payment, deposits USDC into StrawEscrow smart contract
// keyed to task ID (non-custodial — Straw never holds private keys)
// Returns 201 with { taskId, escrowAddress, bountyAmount }
```

The transaction hash is returned so competing agents can verify funds exist before working. This eliminates the trust gap: "will the poster actually pay?"

#### B. Agent submissions (stake-to-submit)

```typescript
POST /tasks/:id/submissions
X-PAYMENT: <PaymentPayload for stake amount (e.g. 10% of bounty)>
// Stake pooled on-chain; refundable to non-winners (minus gas) or forfeited on bad-faith submissions
```

#### C. Winner payout

```typescript
// Straw eval service signs a winner attestation
// StrawEscrow.release(taskId, winnerAddress, evalSignature) verifies signature on-chain
// Contract transfers bounty + losing stakes (minus platform fee) to winner
// x402 PaymentResponse hash logged for TraceRank computation
```

Critical design constraint: the judge/evaluator result must be the on-chain trigger. The **contract** validates the evaluator signature — Straw's backend cannot unilaterally redirect funds. This is what keeps Straw as a software platform, not a money services business.

#### D. Stake-to-post mechanism via x402

The stake discourages spam posts. Straw charges a flat stake (e.g., 10 USDC) at task creation via x402. If zero valid submissions, stake burned or goes to Straw. If task completes, stake returned to poster alongside any platform fee rebate.

### Latency and cost vs. Stripe

| Dimension | x402 (Base L2) | Stripe |
|---|---|---|
| Per-call cost | ~$0.0001 USDC | $0.30 fixed + 2.9% |
| Latency (end-to-end) | ~200ms (V1), <50ms (V2 session) | 300-800ms |
| Settlement finality | ~2 seconds on-chain | T+1 days (ACH) |
| Micropayment viability | Yes — $0.001 is profitable | No — fixed fee kills sub-$1 |
| Chargebacks | None (blockchain finality) | Yes |
| International | Chain-native, no FX conversion | Card network FX fees |

**Verdict for Straw:** x402 wins decisively for agent stakes and micropayments. Stripe is not viable for sub-$1 stake transactions at all. For large payouts (>$1,000), x402's cost advantage is marginal, but programmable escrow + auditability are compelling.

### TraceRank: reputation from payment graph automatically

**arXiv:2510.27554** ("Sybil-Resistant Service Discovery for Agent Economies", Shi & Joo, Operator Labs, Oct 2025):

TraceRank is a PageRank variant applied to x402's on-chain payment graph:
- Every x402 transaction creates a directed edge: payer → service, weighted by USDC amount and temporal recency
- Addresses seeded with precomputed reputation (proven traders, long-lived wallets)
- Reputation propagates along payment flows: if high-rep agents pay Service A, Service A gains reputation
- Fresh/Sybil wallets have near-zero seed → payments contribute negligible reputation regardless of volume
- Superior to raw PageRank: doesn't incorrectly promote protocol-mandated actors (AMMs, stablecoin issuers)

**Straw application:** If all task evaluations and payouts flow through x402, TraceRank derives agent reputation automatically:
- Agent that wins bounties from high-reputation task posters → high TraceRank
- Agent that wins only from low-rep or Sybil posters → discounted reputation
- Eliminates the need for a separate star-rating system — the payment graph *is* the endorsement graph

**Implementation:** Log all x402 payment hashes at transaction time. Run TraceRank computation weekly (or incrementally). Surface as first-class leaderboard dimension. This makes Straw's reputation system self-reinforcing and Sybil-resistant without additional engineering.

### Multi-step escrow in production

Native x402 does not include escrow — it's pay-and-deliver. Production bounty-style escrow examples:

- **uBounty** — GitHub bounties in USDC on Base. Escrow holds until PR merge triggers release. ($600M+ cumulative x402 payment volume across ecosystem)
- **PayCrow** — Smart contract escrow + 4-source trust scoring. 6-step automated flow: trust check → config → escrow creation → API call → response verification → release. Works as a wrapper around any x402 payment
- **Arbitova** — Escrow + AI arbitration for agent disputes. Supports sub-task chained escrow for agent swarms — relevant if Straw tasks are decomposed across multiple agents
- **WorkProtocol** — Open job marketplace with escrow-backed delivery verification on Base

**Recommendation:** Adopt the PayCrow pattern as Straw's reference implementation. Build a `StrawEscrow` contract on Base (audited before mainnet). Use PayCrow / Arbitova patterns as reference, not as a dependency.

### Regulatory and compliance implications

Key framework: **The GENIUS Act** (signed July 17, 2025) — first comprehensive U.S. federal framework for payment stablecoins.

| Issue | Risk | Mitigation |
|---|---|---|
| Holding USDC in escrow | Straw may be acting as custodian/money transmitter | Non-custodial smart contract (Straw never holds keys) |
| Large payouts (>$10K) | SAR filing thresholds under BSA/GENIUS Act ($5K for PPSIs) | Integrate blockchain analytics (Chainalysis/Elliptic) for AML |
| KYC for task posters | No KYC for small payments; threshold-based for large | Gate KYC behind $5K+ task posting or $10K+ cumulative payout |
| International agents | OFAC sanctions screening required | CDP/Coinbase handles settlement screening; Straw screens wallet addresses |
| Money transmitter license | If Straw controls escrow release, may be a money transmitter | Non-custodial escrow + evaluator-signed release avoids MTL |
| USDC as payment | Circle is a licensed PPSI under GENIUS Act | Use USDC only; avoid algorithmic stablecoins |

**Critical architectural constraint:** Straw must not be the private key holder for escrow funds. Smart contract controls fund release triggered by verifiable on-chain condition (evaluator signature). Straw = software platform, not money services business.

### Summary recommendation

x402 is the right payment substrate for Straw v1.5+:
1. **Task creation** → poster pays bounty + stake via x402 → locked in `StrawEscrow` on Base (non-custodial)
2. **Agent submission** → agent pays stake via x402 → pooled on-chain
3. **Evaluation** → Straw eval service signs winner attestation → contract verifies → releases bounty + redistributed stakes to winner
4. **Reputation** → all x402 hashes indexed → TraceRank computed weekly → public leaderboard from payment graph (no separate review system)
5. **Discovery** → register Straw task types in Bazaar → agents autonomously discover and bid on tasks

**The weakest link is escrow** — requires a custom smart contract, not just the npm package. Budget for a security audit before mainnet. This is a v1.5 feature, not v0 or v1. v0 and v1 can use Stripe for human company-side payments and defer agent-to-agent crypto payments.

Sources: github.com/coinbase/x402, x402.org/writing/x402-v2-launch, docs.cdp.coinbase.com/x402/bazaar, arXiv:2510.27554 (TraceRank), earezki.com PayCrow escrow pattern, ubounty.ai/how-it-works, github.com/xpaysh/awesome-x402, workos.com/blog/x402-vs-stripe-mpp, braumillerlaw.com/activating-http-402, paulhastings.com GENIUS Act guide.

---

## Tick 10 (2026-05-01T07:30Z): Pricing models for the post-side

Source: subagent research + analogous platform analysis + academic pricing theory.

### The core constraint

Straw's existing model (REQUIREMENTS.md): flat task posting fee + success fee on deal close. No escrow, no payment processing in v1. This is a design constraint, not a blank slate. The question is what values work and what the posting UX looks like.

### Model-by-model analysis

**Pre-funded bounty (Kaggle / Topcoder model):** Full prize pool upfront before competition opens. Result: dramatically reduces posting volume but dramatically increases quality — the escrow filter eliminates tire-kickers. Kaggle's ~$10M annual prize pool from a relatively small number of enterprise posters is evidence. **Wrong fit for Straw MVP** because (a) no escrow infrastructure in v1, (b) requires companies to earmark $50K-$200K before knowing if the platform works.

**Pay-on-engagement (HackerOne model):** Zero cost to post; pay only when you engage with valid work. HackerOne charges nothing to create a program — posters pay only when they triage a valid report. High posting volume; quality controlled by reporter reputation. Non-payment risk mitigated by company reputation asymmetry. **This maps to Straw's existing model (success fee on deal close).** Right fit.

**Success-share:** % of business value created. Conceptually elegant, practically unmeasurable. Attribution from "Straw task" to "measurable business value" requires deep integration into customer revenue stack — a lawyers' argument not a pricing model. No major marketplace uses this for one-time technical work. **Reject.**

**Subscription:** Unlimited posts for monthly fee. Academic literature (Rochet & Tirole 2006, Parker & Van Alstyne 2005) calls this the "thick but thin" problem: more posts, lower average task quality, higher agent churn from wasted effort. Companies post speculative tasks because marginal cost is zero, and agents start losing days on poorly-specified work. **Reject — poisons task quality.**

**Tiered credit model:** Poster buys a block of credits (e.g., 100 credits = $500); each agent evaluation = 1 credit. Straw's eval architecture is already per-submission metered (D30 judge daemon). Credits map cleanly. Precedent: Prolific.ac (pay per response), Scale AI (pay per annotation). **Good complement, not primary model.**

### The harvest attack problem — solved without escrow

A company posts "build us an AI claims-processing agent," collects 25 scored submissions from 15 agent builders, and walks away. They've extracted $200K worth of IP for a $200 posting fee.

Analogous platforms solve this via escrow (Kaggle, Topcoder) or legal obligation tied to valid-submission receipt (HackerOne). Straw can't do escrow in v1.

**The lever: disclosure timing + artifact access control.**

- Companies receive **evaluation scores and per-criterion judge reasoning** immediately (the comparative signal — who's best — is immediately available).
- Companies receive **full submission artifacts** only when they formally close a deal OR pay a per-submission "artifact unlock" fee ($25-50/submission).
- If no deal closes and no artifacts are unlocked within N days of task close, submission artifacts become unavailable to the company (agents' IP is protected by time-gate).

This kills the harvest attack without escrow. Companies can't quietly extract all submissions and walk — they get scores (enough to make a hiring decision) but must pay to access the actual IP. Agents who suspect their work was used can flag for platform review (platform checks whether the company took any commercial action post-task).

### Academic pricing framework

**Rochet & Tirole (2006):** Subsidize the side whose participation is harder to get, tax the side whose participation is easier. Straw's hard side is the post-side (companies). Subsidize posting.

**Parker & Van Alstyne (2005):** Price on value exchange, not cost. The company's value is "I found an agent worth $200K/year" not "I ran a competition." Price on the outcome.

**Eisenmann, Parker & Van Alstyne (2006):** Charge near-zero posting fees to win market share early, extract on outcomes once network effects lock in both sides. This is the platform land-grab pattern.

### Recommendation for Straw

**Primary model:**
- **Posting fee:** $99-$199 flat. Low enough not to block enterprise experimentation; high enough to filter tire-kickers. (Topcoder charges $150-$300 for posting — right range for B2B.)
- **Success fee:** 5-8% of deal value when company marks close (existing model, self-reported deal value)
- **Artifact access gate (new):** Scored summaries + per-criterion feedback immediately. Full artifacts gated behind deal close OR $25-50/submission unlock. Time-gate of 30 days post-task-close.

**Additive (v1.5):** Credit pack for eval volume metering once D30 judge daemon cost is predictable. Companies buy credits; each eval burns one. Transparent cost-per-task economics.

**Reject:** Pre-funded escrow (requires legal infrastructure), success-share (unmeasurable), pure subscription (quality poison).

Sources: Upwork enterprise model, HackerOne public program docs, Kaggle prize policy, Topcoder pricing, Rochet & Tirole 2006, Parker & Van Alstyne 2005, Eisenmann Parker Van Alstyne 2006.

---

## Tick 11 (2026-05-01T07:50Z): Steady-state Straw economy — stylized model

Source: subagent research + analogous platform data.

### 1. Operator P&L: 300-agent portfolio

Parameters: 300 agents, average $3/task earned (winning agent payment after platform cut), 4 tasks/month competed, 60% win rate per agent per task attempt.

**Monthly calculation:**
- Per agent: 4 tasks × 60% × $3 = $7.20/month gross
- Portfolio: 300 × $7.20 = **$2,160/month portfolio gross**

**Take-rate sensitivity:**

| Platform take | Operator net | Straw revenue from this operator |
|---|---|---|
| 10% | $1,944 | $216 |
| 15% | $1,836 | $324 |
| 20% | $1,728 | $432 |
| 25% | $1,620 | $540 |

**Viable take-rate: 15–20%.** Below 10%, Straw loses money at low volume. Above 25%, operator economics deteriorate and churn accelerates. The 15% rate (standard for marketplaces) leaves operators with ~$5.20/agent/month net. Operators need infrastructure cost per agent well under $5 to be profitable — achievable for lightweight agents on commodity hardware.

### 2. Posting/competing ratio

Analogous platform steady-state ratios:

| Platform | Competitors per task | Min viable | Max before agents churn |
|---|---|---|---|
| Kaggle | 50–5,000 | ~50 | No ceiling (prize pools attract endless entries) |
| HackerOne | 5–200 researchers/program | ~8 (below that triage is meaningless) | ~100 (dilution without extra pay) |
| Upwork | 15–75 proposals/job | ~5 (below = dead market signal) | ~50 (poster overwhelmed) |
| Topcoder | 10–100/challenge | ~8 | ~100 |

**Straw target:** 15–30 agent competitors per task. Below 10, score comparison loses credibility (winner may be sole entrant, not best entrant). Above 100, win probability drops below 1% — agents enter the economics of playing the lottery, which causes selective non-participation and eventual churn. The sweet spot: enough competition to make the leaderboard meaningful, enough win probability (~4–7%) to keep agents economically motivated.

**Minimum viable market signal:** 8 unique agents per task. Below that, Straw isn't functioning as a competitive evaluation platform.

### 3. Reputation distribution

Empirical data from analogous platforms:
- Upwork: Top 10% of freelancers earn ~50% of GMV. Gini coefficient ~0.65-0.70
- Kaggle: Grandmasters (0.1% of users) win disproportionate prize share. Power law with heavy right tail.
- HackerOne: Top 100 researchers earn ~50% of total bounties

**Straw steady-state prediction:** Similar power-law with Gini ~0.60-0.72. Top 20% of agents win ~75-80% of tasks. This is structurally necessary (provides quality signal) but creates cold-start problem for new entrants.

**Mitigation signals to build:** Category-specific reputation tracks (new agent can be top-ranked in a niche without competing against platform veterans); visible score percentiles for non-winners (an agent who scores 87th percentile but doesn't win still has a signal worth showing operators); reputation acceleration in first 10 tasks.

### 4. Price discovery

Straw uses posted budget ceilings, not open bidding — agents compete on quality, not price. Winner captures the posted budget when a deal closes. This sidesteps the systematic underbidding of open reverse auctions (Upwork sees 30-40% of proposals bid below the stated rate).

In a quality-competition model: no underbidding equilibrium because there is no bid. The full posted budget is available to the winner. Companies can post with confidence that $10K posted = $10K available to the winner, not $10K spread across 50 proposals.

### 5. Break-even analysis

**Operating cost:** ~$230/month (Tick 4 research)

**Revenue per task completed:** At $3/task average earning and 15% take-rate = $0.45/task

**Tasks/month to break even:** $230 ÷ $0.45 = **512 tasks/month**

With posting fees ($150 flat) as additional revenue, break-even is much lower:

At 5 tasks/month: 5 × $150 = $750 posting fees alone → $750 - $230 = $520/month margin even without any deal closes.

**Realistic early milestone:** 200 registered agents + 8 companies × 3 tasks/month each = 24 active tasks at 20 agents/task = $216/month LLM eval cost + $3,600/month in posting fees (24 × $150) = ~$3,400/month margin before success fees. The business is profitable from day one if posting fees are right.

**The unit economics problem is not margin — it's cold-start.** Agents won't register without tasks. Companies won't post without agents. The first-mover to solve this (likely via the Archetype A design partner program) gets locked-in network effects.

### 6. The flywheel

```
Quality enterprise design partners post real tasks (Archetype A)
     ↓
Agents compete, earn reputation data that exists nowhere else
     ↓
Agent operators build specialized fleets calibrated to Straw task categories
     ↓
Better agents → more companies trust the platform → more tasks posted
     ↓
More tasks → more reputation signal → better agent discovery → better companies
```

**Critical early unlock:** The first 3-5 quality enterprise design partners (real rubrics, meaningful budgets, genuine commercial intent on deal close) produce the reputation data that attracts serious agent operators. Without real tasks with real rubrics, reputation data is meaningless — this is why v0 with Jeremy manually posting tasks is load-bearing, not just a stopgap.

**Secondary flywheel:** Open leaderboard transparency (D17) creates learning loops — agents see each other's scores and reasoning, improve their submissions iteratively, raising average quality which makes the platform more valuable to companies. Quality ratchets upward organically.

### 7. When agent-to-agent posting makes economic sense (v2)

At 15-30 agents/task and the second-price reverse auction (Tick 1), a specialist agent who posts a subtask outside their core competency is rational when:

`post_cost ≤ budget_cap - expected_platform_fee`

And:

`success_prob(specialist) × award - self_execution_cost > 0`

At the 60% win rate / $3 average earning parameters above, a generalist agent attempting a specialist task might have 20% win rate instead of 60%. Expected earnings: 4 tasks × 20% × $3 = $2.40/month vs. 60% win rate → $7.20/month. The opportunity cost of 3 out-of-domain task attempts is $14.40/month in foregone earnings on in-domain tasks.

Posting the out-of-domain task at $2 to a specialist, freeing 2 in-domain task slots = 2 × 60% × $3 = $3.60 additional net earnings. The math favors posting for any specialist-capable-task priced at $2-4.

Sources: Upwork freelancer earnings data, HackerOne bug bounty program stats, Kaggle competition analytics, Topcoder documentation, Rochet & Tirole two-sided markets (2006), Parker & Van Alstyne (2005).

---

## Push status

**Session 1 (Ticks 1–7) commit status:** Committed and pushed. Covered VCG auctions, Shapley credit propagation, target audience, cost simulation, operator motivation, comparable systems, reputation systems.

**Session 2 (Ticks 8–11) commit status:** Ticks 8 (swarm simulation), 9 (x402 integration), 10 (pricing models), 11 (steady-state economy) added in this session. File was ~1,810 lines at end of Session 2.

**Session 3 (Ticks 12–18) commit status:** Ticks 12 (Anthropic harness), 13 (ERC-8004 + CAIF), 14 (SHARP/Shapley-Coop), 15 (stake-to-post), 16 (Bradley-Terry + Apollo), 17 (operator UX), 18 (MultiAgent4Collusion + collusion) added. File exceeded 2,000 lines → split executed: 4 themed companion files created (`agent-incentive-mechanics.md`, `agent-incentive-comparable-systems.md`, `agent-incentive-swarm-dynamics.md`, `agent-incentive-target-audience.md`). Long-form proposal updated with Ticks 12-18 findings. Commit pending (see below).

**Session 3 git commit:** `research(agent-incentive): ticks 12-18 — harness, ERC-8004, Shapley impl, stake-to-post, Bradley-Terry, operator UX, collusion + companion file split`

**If git push fails (no GitHub creds in this context):** Local commit still created. Next session will see it via `git log --oneline`.

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

**Tick 8 (Swarm simulation):** arXiv:2510.25779 (Magentic Marketplace), github.com/microsoft/multi-agent-marketplace, arXiv:2511.13233 (LLM-MAS for Data Marketplaces, Ocean Protocol validation), arXiv:2604.11840 (Solver-Sampler Mismatch), springer.com/article/10.1007/s13278-017-0481-y (Incremental EigenTrust), cloudidr.com/blog/llm-pricing-comparison-2026 (model pricing), arxiv.org/html/2503.20749v7 (LLM agent behavior simulation)

**Tick 9 (x402 integration):** github.com/coinbase/x402, x402.org/writing/x402-v2-launch, docs.cdp.coinbase.com/x402/bazaar, x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer, arXiv:2510.27554 (TraceRank, Shi & Joo 2025), earezki.com/ai-news/2026-03-14-add-escrow-protection-to-any-x402-agent-payment (PayCrow), ubounty.ai/how-it-works, github.com/xpaysh/awesome-x402, workos.com/blog/x402-vs-stripe-mpp, braumillerlaw.com/activating-http-402, paulhastings.com/insights/crypto-policy-tracker/the-genius-act, hklaw.com FinCEN/OFAC AML for stablecoin issuers, solana.com/x402/what-is-x402, kucoin.com/blog/en-ai-agent-crypto-payment-x402-v2-launch

**Tick 12 (Anthropic harness):** anthropic.com/research/building-effective-agents, anthropic.com/engineering/multi-agent-research-system, platform.claude.com/docs/en/managed-agents/overview, infoq.com/news/2026/04/anthropic-managed-agents/, zenml.io/llmops-database/building-a-multi-agent-research-system-for-complex-information-tasks, myaiexp.com/en/insights/anthropic-subagent-multi-agent-revolution, github.com/cloudflare/agents/blob/main/guides/anthropic-patterns/README.md

**Tick 13 (ERC-8004):** eips.ethereum.org/EIPS/eip-8004, github.com/erc-8004/erc-8004-contracts, eco.com ERC-8004 explainer, kucoin.com/blog/understanding-erc-8004, buildbear.io/blog/erc-8004, blog.quicknode.com/erc-8004, allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks, composable-security.com/blog/erc-8004, github.com/sudeepb02/awesome-erc8004, cooperativeai.com/grant-research-areas/incentivizing-cooperation-among-ai-agents, cooperativeai.com/post/multi-agent-risks-from-advanced-ai, grantedai.com/grants CAIF 2026

**Tick 17 (Operator UX + platform internals):** agentops.ai, docs.agentops.ai/v1/concepts/events, microsoft.github.io/autogen autogenstudio, langchain.com/langsmith/observability, github.com/builderz-labs/mission-control, github.com/crshdn/mission-control, cloud.google.com/transform kpis-for-production-ai-agents, pendo.io/essential-kpis, dorahacks.io/blog/guides, docs.hackerone.com reputation + mediation, docs.bugcrowd.com getting-rewarded, github.com/bugcrowd/vulnerability-rating-taxonomy, docs.allo.gitcoin.co, support.gitcoin.co passport scoring

**Tick 14 (SHARP/Shapley-Coop):** arxiv.org/abs/2602.08335 (SHARP), arxiv.org/abs/2506.07388 (Shapley-Coop), openreview.net/pdf?id=HnJ1UkuJXS, neurips.cc/virtual/2025/poster/118868, github.com/GenAISHAP/TokenSHAP (AgentSHAP), arxiv.org/abs/2512.12597 (AgentSHAP), arxiv.org/abs/2502.00510 (ShapleyFlow)

**Tick 16 (Bradley-Terry + Apollo):** arxiv.org/abs/2411.01281 (Arena-Lite), arxiv.org/html/2403.04132 (Chatbot Arena), arxiv.org/abs/2406.07791 (positional bias), arxiv.org/abs/2406.12319 (Comparative Trap), arxiv.org/abs/2504.20879 (Leaderboard Illusion), github.com/manasseh-zw/apollo, microsoft.github.io/AI_Agents_Hackathon/winners, techcommunity.microsoft.com hackathon 2025 showcase

---

## Tick 12 (2026-05-01T09:30Z): Anthropic multi-agent harness and effective agent patterns

Source: anthropic.com/research/building-effective-agents, anthropic.com/engineering/multi-agent-research-system, platform.claude.com/docs/en/managed-agents/overview, plus secondary sources.

### The five workflow patterns from "Building Effective Agents" (Anthropic, Dec 2024)

Anthropic's canonical guide describes a spectrum from simple workflows to fully autonomous agents. The key insight: **start with the simplest pattern that solves the problem; add complexity only when measurable improvement justifies it.**

| Pattern | Structure | Best for | Key design element |
|---|---|---|---|
| **Prompt chaining** | Sequential LLM calls; output of step N is input to step N+1 | Multi-step pipelines where steps are well-defined and order matters | "Gate" between steps — fail fast if intermediate output doesn't meet threshold |
| **Routing** | Classifier LLM → appropriate specialist path | Variable-difficulty tasks (easy to Haiku, hard to Opus), customer service triaging | The classifier is cheap; specialists are expensive — classify before committing |
| **Parallelization** | Multiple LLMs run concurrently, results combined | Two variants: *Sectioning* (divide doc into chunks, process in parallel) and *Voting* (multiple judges vote on same input) | Useful when tasks are independent or when confidence intervals matter |
| **Orchestrator-workers** | Central LLM dynamically decomposes task → delegates to workers → synthesizes | Complex multi-step tasks where subtasks aren't known in advance | Unlike parallelization, subtasks are not pre-defined — the orchestrator decides |
| **Evaluator-optimizer** | Generator LLM → Evaluator LLM → (if not satisfied) → Generator again | Iterative refinement when clear evaluation criteria exist | Loop until evaluator passes OR max iterations reached — prevents infinite loops |

**Autonomous agents** sit atop all these: they use tools, maintain state across steps, self-direct, and should be given increasing autonomy only as you gain confidence in their reliability.

**The key design advice on multi-agent systems:** Anthropic specifically notes that multi-agent systems are appropriate when: (a) tasks are too long for one context window, (b) tasks benefit from parallel specialized workers, (c) you need independent verification. **Warning:** "Multi-agent systems consume approximately 15× more tokens than standard chat interactions."

### Anthropic's multi-agent research system (production architecture)

From the Anthropic engineering blog (2025), a live production implementation:

- **Architecture:** Lead agent (Claude Opus 4) + parallel subagents (Claude Sonnet 4)
- **Performance:** 90.2% better than single-agent Claude Opus 4 on internal research evaluation. This is a 90.2 percentage-point gain, not ratio — the absolute improvement is substantial.
- **Task decomposition:** The lead agent analyzes the query, develops a strategy, and spawns subagents to explore different aspects simultaneously. Each subagent receives: (1) a specific objective, (2) an explicit output format, (3) guidance on which tools/sources to use, (4) clear task boundaries.
- **Critical failure mode:** "Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information. Simple instructions were vague enough that subagents misinterpreted the task or performed the exact same searches as other agents."
- **Solution:** Explicit, structured subagent briefs — not just "research this" but "research X with the goal of finding Y, using sources Z, returning a list in format F."

### Claude Managed Agents (April 8, 2026, beta)

Anthropic's fully-managed agentic infrastructure. Endpoints: `/v1/agents`, `/v1/environments`, `/v1/sessions`.

**Four core concepts:**

| Concept | What it is |
|---|---|
| **Agent** | Model + system prompt + tools + MCP servers + skills — defined once, referenced by ID |
| **Environment** | Container template: packages, network access rules, mounted files |
| **Session** | A running agent instance performing a specific task, with full event history persisted |
| **Events** | Messages between your app and the agent: user turns, tool results, status updates |

**Built-in tools:** Bash, file read/write/edit, web search + fetch, MCP servers.

**Pricing:** Standard Claude token rates + $0.08/session-hour for active runtime.

**Rate limits:** 300 create requests/minute, 600 read requests/minute per organization.

**Multi-agent feature:** "Certain features (outcomes and multiagent) are in research preview." Still gated — not yet general-availability.

**Context management at scale:** The harness handles prompt caching, compaction, and checkpointing automatically. Sessions resume from last checkpoint if they crash. This is critical for long-running evals.

### How Anthropic's patterns map to Straw

**Straw's eval pipeline IS an orchestrator-workers system:**
- Tier 2 gatekeeper = routing (fast classifier on 85% of submissions)
- Tier 3 investigator = evaluator-optimizer loop (investigates, evaluates, iterates up to N cycles)
- The agent-under-evaluation's Reflexion loop = evaluator-optimizer pattern from the agent's perspective

**Claude Managed Agents as Straw's judge daemon (D30):**
Managed Agents is architecturally the right substrate for D30's judge daemon. The harness provides: sandboxed code execution (the eval container), file system access (reading submission artifacts), tool access (running the agent's submitted code), session persistence (checkpointing mid-investigation), and streaming events (for real-time feedback to the task poster). Instead of building a custom BullMQ worker + eval container orchestrator, Straw could use Managed Agents as the execution layer for Tier 3.

**The 15× token cost finding validates Tick 4's cost estimate:** Tick 4 estimated ~12K tokens for Tier 3 multi-step investigation. The 15× baseline-over-standard-chat is consistent: standard chat ≈ 1K tokens, 15× = 15K tokens, matching the estimate within 20%.

**The "detailed task brief" lesson is design-critical for Straw:** When posting a subtask for another agent to handle (agent-as-poster), the posting agent must provide: explicit objective, expected output format, relevant constraints, tool guidance. The failure mode — duplicated work and gaps — is exactly what Straw's task spec format (title, description, input_spec, output_spec, rubric) is designed to prevent.

Sources: anthropic.com/research/building-effective-agents, anthropic.com/engineering/multi-agent-research-system, platform.claude.com/docs/en/managed-agents/overview, infoq.com/news/2026/04/anthropic-managed-agents/

---

## Tick 13 (2026-05-01T09:50Z): ERC-8004 on-chain agent identity + Cooperative AI Foundation

Source: eips.ethereum.org/EIPS/eip-8004, github.com/erc-8004/erc-8004-contracts, secondary sources.

### ERC-8004 "Trustless Agents" — the three registries

**Created by:** Marco De Rossi (MetaMask), Davide Crapis (Ethereum Foundation dAI team), Jordan Ellis (Google), Erik Reppel (Coinbase). Submitted August 2025. Deployed Ethereum mainnet January 29, 2026. **As of early March 2026:** ~107,000 agents indexed across Ethereum (~29K), Base (~34K), BSC (~44K).

**1. Identity Registry (ERC-721 extension)**

Each agent is minted an NFT; tokenId = `agentId`. The `tokenURI` points to an off-chain **agent card** JSON with: name, description, image, endpoints (supports A2A, MCP, OASF, ENS, DID formats, each versioned), and payment wallet addresses.

Key methods: `register(agentURI)` → mints NFT + assigns agentId; `setAgentWallet(agentId, wallet, sig)` → links payment address; `getAgentWallet(agentId)` → read.

Mainnet contract: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

**2. Reputation Registry**

Stores bounded raw feedback signals (score 0–100) per `agentId`. Fields per feedback entry: score, categorical tags (response_time, uptime, accuracy), optional off-chain evidence URI + hash. Agent owners authorize specific reviewers (access-controlled). x402 payment proofs can be attached to prove only paying customers posted reviews.

Key methods: `postFeedback(agentId, score, tags[], evidenceURI, evidenceHash)`; `getFeedback(agentId)`; `authorizeReviewer` / `revokeReviewer`.

Mainnet contract: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**3. Validation Registry**

Framework for requesting/recording independent third-party verification. Mechanism-agnostic: supports zkML proofs, TEE attestations (Intel TDX via Phala Network), or any validator contract. Key methods: `validationRequest(validatorAddress, agentId, requestURI, requestHash)` → agent owner triggers; `validationResponse(requestHash, response, responseURI, responseHash, tag)` → validator replies. Still under active revision.

### What ERC-8004 explicitly does NOT define (gaps for Straw to fill)

| Gap | What Straw must build on top |
|---|---|
| Task posting / bounty mechanics | Entire post-side: POST /tasks, rubric, budget, deadline |
| Payment / escrow | x402 + StrawEscrow contract (Tick 9) |
| Scoring aggregation algorithms | EigenTrust / Beta reputation system (Tick 7) |
| Shapley attribution | SHARP/Shapley-Coop settlement service (Tick 14) |
| Delegation chain tracking | `parent_task_id` lineage graph in Straw's DB |
| Fraud handling + slashing | Stake-to-post + engagement-required clause (Tick 15) |
| Validator incentive economics | Platform fee model (Tick 10) |

**Bottom line:** ERC-8004 gives Straw the identity primitive (a stable `agentId` to anchor all reputation, payment, and task history data) and a raw ledger to write reputation signals into. It's the foundation layer — Straw's application logic is what makes it a marketplace.

**Straw integration recommendation (v2+):**
1. Register each agent on ERC-8004 at signup (Ethereum or Base L2 for cheap gas)
2. Link the agentId to Straw's internal UUID via `setAgentWallet`
3. After each evaluated task, call `postFeedback(agentId, score, tags, evidenceURI)` with the eval result hash as evidence
4. Validate high-stakes submissions via TEE attestation (Phala's extension) for transparency
5. Use the on-chain reputation registry as the settlement-layer source-of-truth; keep Straw's internal EigenTrust computation for real-time display

### Cooperative AI Foundation (CAIF)

**What it is:** $15M philanthropic fund (from Macroscopic Ventures), academic research only. Board: Allan Dafoe (DeepMind), Gillian Hadfield, Thore Graepel, Jesse Clifton, Audrey Tang. Advisors: Noam Brown (Meta/OpenAI), Jakob Foerster, Vincent Conitzer.

**Most relevant grant area:** "Incentivizing Cooperation Among AI Agents" — explicitly funds: (1) monetary mechanisms for peer incentivization in mixed-motive settings, (2) decentralized norm enforcement at scale, (3) inter-agent commitments and contracting, (4) automated mechanism design scalable to large LLM-agent populations. **This is Straw's exact problem space in academic language.**

**Funded projects:**
- FOCAL (Carnegie Mellon, ~$500K) — decision theory and game theory for machine agent cooperation
- FLAIR (Oxford, Jakob Foerster's lab) — multi-agent RL, opponent shaping
- 2024/2025: additional grants not yet published

**Gap:** No CAIF grant has funded anything resembling a working marketplace implementation. Straw would be doing applied work that CAIF is funding as theory. An academic collaborator working on mechanism design for Straw's stake-to-post or Shapley attribution could be funded via CAIF's fellowship ($40K/year + tuition) or regular grant (up to £100K).

Sources: eips.ethereum.org/EIPS/eip-8004, github.com/erc-8004/erc-8004-contracts, cooperativeai.com/grant-research-areas/incentivizing-cooperation-among-ai-agents, cooperativeai.com/post/multi-agent-risks-from-advanced-ai

---

## Tick 14 (2026-05-01T10:10Z): SHARP / Shapley-Coop implementation for Straw's reputation service

Source: arxiv.org/abs/2602.08335, arxiv.org/abs/2506.07388, arxiv.org/abs/2512.12597, arxiv.org/abs/2502.00510.

### SHARP (arXiv:2602.08335) — counterfactual masking mechanism

**What it does:** Decomposes per-agent reward in a multi-agent LLM pipeline into three components: (1) global broadcast (all agents get the outcome score), (2) Shapley marginal credit (counterfactual masking, see below), (3) process reward (tool use correctness). Result: +23.66% over single-agent Qwen3-8B, +14.05% over non-Shapley multi-agent baselines on HotpotQA / MATH / GSM-style benchmarks.

**Counterfactual masking:** For a sequential chain A → B → C, to compute B's marginal contribution: skip B and pass A's raw output directly to C. Measure the quality drop. This is the cheapest possible counterfactual — no LLM re-run required, just trajectory replay with masking.

**Formula:** φᵢ = Σ_{S ⊆ N\{i}} [|S|!(N-|S|-1)!/N!] × [v(S∪{i}) − v(S)]

**Computation:** For N≤4 agents in a chain, the coalition space is small enough (≤16 subsets, ≤24 orderings) that exact computation is tractable without MC approximation. SHARP appears to use exact Shapley for their pipeline sizes.

**Post-task application:** SHARP operates on completed trajectories — it is fully asynchronous and does not require real-time computation.

### Shapley-Coop (arXiv:2506.07388, NeurIPS 2025) — the post-task redistribution mechanism

Two components:

**Short-Term Shapley CoT (pre-task negotiation):** Agents reason about their expected marginal contribution before committing to collaboration. They propose a reward share fraction. Negotiation iterates until price agreement or failure. For Straw: agents can skip this — just execute and let post-task settlement handle credit.

**Long-Term Shapley CoT (post-task redistribution):** After task completion, full trajectory τₙ is observed. Each agent's actual marginal contribution is computed from the trajectory record. Reward pool redistributed proportionally. Agents who demanded too high a pre-task price face reputation consequences. **This is the mechanism Straw wants.**

Validated in three environments: Escape Room (social dilemma), Raid Battle (cooperative defeat with contribution tracking), ChatDEV (software engineering). Consistently improves cooperation rates vs. equal-split or greedy baselines.

### AgentSHAP / TokenSHAP (arXiv:2512.12597) — the approximation recipe

**Code:** github.com/GenAISHAP/TokenSHAP. Attributes credit to tools using MC Shapley. Value function: cosine similarity of embedding(output with coalition S) vs. embedding(full output). Sampling ratio ρ ≥ 0.4 required for stability.

**Adapting for agent-chain attribution:** Replace tools with agents as players. Replace cosine similarity value function with actual task evaluation metric (which Straw already has). Apply SHARP's counterfactual masking to reconstruct coalition outputs from trajectory record without LLM re-runs.

### The minimal Straw Shapley attribution service

**When it runs:** Asynchronously after task closes and final outcome score is known.

**Inputs:** agent list, trajectory record (who did what), outcome score.

**Sample count M recommendation:**
- N=2 agents: exact computation (2 permutations)
- N=3 agents: M=20
- N=4 agents: M=50
- N=5+ agents: M=100 + always include all first-order omissions (remove one at a time)

**Value function:** Replay the task trajectory with only the coalition's actions. Score using the existing evaluation metric. This avoids the AgentSHAP cosine proxy — Straw has ground truth.

**Negative Shapley values:** An agent that hurt the coalition outcome gets a negative φᵢ. Options: (a) clip to zero and renormalize (marketplace-friendly), (b) allow negatives and subtract from reputation score (principled). Recommend option (b) — bad posters should face reputation consequences.

**ShapleyFlow (arXiv:2502.00510) — bonus find:** Exhaustive Shapley over 2^4=16 workflow component configurations, then per-component scoring. Directly maps to Straw's rubric criteria: treat each rubric criterion as a "component" and compute Shapley to determine which aspects of the agent's output actually drove the final score.

Sources: arxiv.org/abs/2602.08335, arxiv.org/abs/2506.07388, arxiv.org/abs/2512.12597, arxiv.org/abs/2502.00510, github.com/GenAISHAP/TokenSHAP

---

## Tick 16 (2026-05-01T10:30Z): Bradley-Terry pairwise scoring + Apollo orchestrator pattern

Source: multiple arXiv papers, LMSYS blog, github.com/manasseh-zw/apollo.

### Bradley-Terry model — the math

P(i beats j) = πᵢ / (πᵢ + πⱼ). In log-odds: log(πᵢ) − log(πⱼ) = log-odds(i > j). This is equivalent to Elo ratings (Chatbot Arena switched from Elo to BT MLE because BT produces "significantly more stable ratings and precise confidence intervals").

**MLE estimation (MM algorithm):**
```
πᵢ(new) = Wᵢ / Σⱼ≠ᵢ [ nᵢⱼ / (πᵢ + πⱼ) ]
```
where Wᵢ = total wins, nᵢⱼ = total comparisons between i and j. Converges to unique MLE. Requires connected comparison graph.

**Minimum comparisons for stable ranking:** O(n log n) with random sparse graphs (vs. O(n²) all-pairs). For n=20 agents: ~60 comparisons vs. 190 all-pairs — 3× more efficient. Arena-Lite (EMNLP 2025) validated single-elimination tournaments achieving O(n log n) comparisons with higher reliability than all-pairs Arena.

**Multi-way generalization (Plackett-Luce):** P(i ranked first among S) = πᵢ / Σⱼ∈S πⱼ. One 4-way comparison ≈ statistical information of 3 binary comparisons. Relevant when LLM judge ranks multiple submissions simultaneously.

### Pairwise vs. absolute scoring — empirical verdict

**The case against pure pairwise:**
- "Judging the Judges" (IJCNLP 2025, 150K+ evaluations): position bias is severe and model-dependent. GPT-4: primacy bias (favors response A). GPT-4o: recency bias (favors response B). Position bias dominates when submissions are close in quality.
- "The Comparative Trap" (ACL 2025): pairwise preferences flip in **35% of cases** when candidate order is swapped. Absolute scores flip in only **9% of cases**. Pairwise amplifies superficial biases (verbosity, authoritative tone).
- Mitigation: run both orderings (A|B and B|A), count only on agreement. Halves throughput, dramatically reduces positional artifacts.

**The case against pure absolute (rubric) scoring:**
- Calibration drift: absolute scores from different evaluation runs may use different internal scales, making cross-task comparison noisy. BT pairwise is invariant to this.
- Rubric overfitting: agents can optimize for rubric criteria specifically (reward hacking) when rubric is public.

**Recommendation for Straw:** Run rubric scoring (0-100) as the primary signal for all submissions. Run BT pairwise tournament as a secondary calibration layer between the top-N submissions to catch rubric drift. Arena-Lite's tournament structure (single-elimination or Swiss-system with O(n log n) comparisons) is the right shape for the calibration phase.

**BT + VCG integration:** BT πᵢ scores are cardinal (not just ordinal) — πᵢ/πⱼ encodes how much better agent i is, not just that it is better. This makes BT scores valid as revealed-preference bid proxies in a VCG allocation: run BT tournament → derive πᵢ → use as bid in VCG → winner pays externality imposed on others. Theoretically sound; no published paper combines BT+VCG exactly, but Tournament Auctions (Anderlini, arXiv:2403.08102) is the closest framework.

### Apollo orchestrator (GitHub: manasseh-zw/apollo)

**Winner:** Best C# Agent, Microsoft AI Agents Hackathon 2025. Stack: .NET 9 / ASP.NET Core, Semantic Kernel, Kernel Memory + pgvector (PostgreSQL), Exa AI (web search), Azure AI Agents Service (GPT-4), React + Vite frontend.

**Three-agent architecture:**

| Agent | Role | Key behavior |
|---|---|---|
| **Apollo** (Coordinator) | Orchestrator — plans, assigns, synthesizes | Does NOT research. Generates research questions dynamically from user query |
| **Athena** (Research Engine) | Executor — searches, retrieves, ingests | 3-5 search queries per question, 5-10 results per query, ingests into pgvector. Tracks URL dedup. |
| **Hermes** (Analyzer) | Quality Reasoner — critiques coverage gaps | Queries pgvector for what's known, generates gap analysis, triggers new research questions when gaps found |

**Self-reflective RAG:** After Athena ingests content, Hermes queries the vector store semantically: "What do we know about X?" → generates a gap critique: "We have A and B but not C or D" → triggers new Athena research cycles. Loop terminates when no significant gaps OR max iterations hit. This is an active critique loop on retrieval quality, not passive one-shot retrieval.

**Mapping to Straw's Tier-3 investigator:**

| Apollo | Straw Tier-3 |
|---|---|
| Apollo (Coordinator) | Investigation Orchestrator: manages eval lifecycle |
| Athena (Executor) | Code Runner: executes agent's submission, captures outputs + logs |
| Hermes (Analyzer) | Quality Reasoner: checks outputs against rubric, identifies uncovered criteria |
| Self-reflective RAG gap loop | Test Coverage Critique: generates additional test cases when rubric criteria remain uncovered |
| pgvector store | Execution trace store: embeddings of run outputs for semantic coverage search |
| Two-stage synthesis | Per-criterion scores → final weighted judgment with citations to execution traces |

**Key Apollo patterns to adopt for Straw's Tier-3:**
1. Explicit three-role separation (Coordinator, Executor, Analyzer) — prevents role conflation and makes the loop auditable
2. The gap-analysis termination condition — "investigate until rubric fully covered OR max iterations" — maps directly to Tier-3's investigation depth
3. Event-driven async queue via .NET channels (or equivalent) — decouples investigation cycles and enables parallel investigation of multiple submissions

**What doesn't transfer:** Apollo does open-ended web research; Straw runs deterministic code in a sandbox. The Executor needs Docker/WASM isolation, timeout enforcement, resource measurement. The Analyzer needs rubric-aware domain reasoning, not just completeness assessment.

Sources: github.com/manasseh-zw/apollo, arxiv.org/abs/2411.01281, arxiv.org/abs/2406.07791, arxiv.org/abs/2406.12319, arxiv.org/abs/2403.08102, lmsys.org/blog/2023-05-03-arena

---

## Tick 17 (2026-05-01T10:50Z): Operator UX dashboards + platform internals (DoraHacks, Gitcoin, HackerOne, Bugcrowd)

Source: Multi-platform research session. Full citation list in Tick 17 sources row above.

### Operator dashboard — best reference implementations

**AgentOps (agentops.ai) — the canonical data model:**
Four-level span hierarchy: Session (root, total cost + duration) → Agent (named agent scope) → Operation/Workflow (planning steps, sub-workflows) → LLM/Tool call (individual invocations). Every LLM call: prompt, completion, token counts, model, latency. Every tool call: input, output, latency, error state. Dashboard surfaces: cost per session, token usage, latency P50/P99, error rate, agent failure events, tool call frequency, multi-agent interaction graphs, recursive loop detection. Available integrations: CrewAI, AutoGen/AG2, LangChain.

**Mission Control (github.com/builderz-labs/mission-control) — best open-source reference:**
26 panels: tasks, agents, logs, tokens, memory, cron jobs, alerts, webhooks, pipelines, and more. Self-hostable, SQLite-backed. RBAC (viewer/operator/admin). WebSocket + SSE for real-time push. Built-in "Aegis" review gate: blocks task completion without human sign-off. A second Mission Control (github.com/crshdn/mission-control) bills itself as an "Autonomous Product Engine" with convoy mode and crash recovery — directly applicable to OpenClaw-style agent fleet management.

**LangSmith — production-grade distributed tracing:**
Nested span tracing per agent; cost attribution to individual spans; latency at P50/P99; custom dashboards with drill-down from fleet to individual traces; alerting on threshold breaches. Handles distributed tracing across agents that call each other, preserving full parent-child span chain across service boundaries. This is the right architecture for Straw's operator dashboard.

### Must-have metrics for Straw's operator dashboard

**Per-agent KPIs:**
- Win rate by task category (code, analysis, research, etc.)
- Average eval score per category (not just pass/fail — the actual score distribution)
- Time-to-first-submission per task (leading competitive indicator — not shown in current dashboards, Straw-specific advantage)
- Cost per successful outcome = total LLM spend / accepted submissions
- Reputation trajectory (rolling 30-day sparkline: up/flat/down)
- Revenue per agent per month

**Fleet-level KPIs:**
- Fleet-wide win rate vs. other operators on the same tasks (requires cross-operator leaderboard data)
- Task coverage: % of open bounties the fleet has at least one submission on
- Duplicate submission rate (are agents stepping on each other's tasks?)
- Total monthly revenue vs. compute spend (margin)

**North-star:** Revenue per dollar of compute. Everything else is a diagnostic.

### HackerOne reputation model — most directly applicable to Straw

HackerOne's leaderboard rank = Reputation × Signal Percentile × Impact Percentile.

**Reputation (raw score):** +7 for resolved, +2 for duplicate (resolved before you), 0 or negative for informational/N/A, −10 for spam. High-severity bounties above program mean add bonus reputation points.

**Signal (−10 to +7 scale):** Rolling average of accepted reports / total reports. Low-severity and informational drag it down. Signal > 0 required to request mediation.

**Impact:** Average severity of accepted reports. Determines "will this agent's future submissions be high-severity?"

**Triage (Hai):** AI filters duplicates + out-of-scope submissions before human review. AI also guides reporters through the submission process in real-time, flagging out-of-scope issues before submission. h1 Validation (April 2026): new product specifically addressing AI-generated report noise.

**Dispute resolution (Hacker Mediation):** Available only to Signal > 0 agents. Process: 3-business-day SLA, HackerOne can force resolution. Hard enforced.

**Why this matters for Straw:** HackerOne's three-factor model (raw × signal × impact) captures exactly the dimensions Straw needs: volume of wins (raw reputation), signal-to-noise ratio (penalizes agents who submit garbage), and quality of wins (impact). The Signal factor specifically discourages agents from flooding the platform with low-quality submissions — exactly the right anti-spam incentive for a competitive bounty board.

### Bugcrowd — Kudos (additive, gameable) — instructive failure case

P1 (Critical) = 40 kudos, P2 = 20, P3 = 10, P4 = 5. Always additive, never penalized. Consequence: researchers farmed low-severity duplicates to inflate Kudos. Bugcrowd changed the algorithm; exact changes not fully public. **Lesson for Straw:** Pure additive reputation is gameable. HackerOne's Signal factor (penalizing noise) is the correction.

### DoraHacks — quadratic funding internals

Rubric format: 3-4 criteria max, each as an answerable question, with visible weights for both judges and participants. AI evaluation produces ranked list with per-criterion reasoning alongside human scores. Payout: determined by number of unique voters (breadth > depth), with progressive cost-per-vote (Nth vote costs 0.1×N TON). Anti-Sybil: DoraID staking. No formal dispute resolution — disputes handled at organizer level. BountyFlow (community-built) adds a 48-hour dispute window before USDT escrow auto-releases.

### Gitcoin — Allo Protocol internals

Grants Stack uses **Allo Protocol** (open-source smart contracts). Merkle Payout Strategy: merkle root of {recipient → amount} committed on-chain; recipients claim permissionlessly. Milestone-based programs: funds unlock on verified completion. Gitcoin Passport: stamps from connected accounts (GitHub, Twitter, ENS, Coinbase), each with pre-determined weights; score 20+ = matching eligibility. **No formal dispute mechanism** — critical gap for task-based platforms (Gitcoin is grants, not competitive tasks). No on-chain arbitration.

### Synthesis — concrete design choices for Straw

| Component | Design choice | Rationale |
|---|---|---|
| Dashboard data model | Session → Agent → Operation → LLM/Tool call (AgentOps pattern) | Enables cost attribution, latency analysis, and multi-agent trace preservation |
| North-star KPI | Revenue per dollar of compute | Aligns operator incentives with platform efficiency |
| Reputation formula | Raw × Signal × Impact (HackerOne model) | Penalizes noise (bad Signal) while rewarding quality (high Impact) |
| Signal equivalent | Submission acceptance rate (accepted/total per agent) | Low-quality flooding drives Signal → 0 |
| Dispute gate | Require minimum reputation (Signal > 0 equivalent) to dispute | Prevents bad-faith disputes from agents with no track record |
| Dispute SLA | 3 business days, Straw as binding arbiter | HackerOne pattern, proven at scale |
| Escrow dispute window | 48 hours post-eval before payout | BountyFlow pattern — time for legitimate contest |
| Additive reputation trap | Avoid pure Kudos model | Bugcrowd's failure case: additive → farming |

Sources: agentops.ai, docs.agentops.ai, github.com/builderz-labs/mission-control, langchain.com/langsmith, docs.hackerone.com, docs.bugcrowd.com, github.com/bugcrowd/vulnerability-rating-taxonomy, dorahacks.io/blog/guides, docs.allo.gitcoin.co, support.gitcoin.co/passport

---

## Tick 15 (2026-05-01T11:10Z): Stake-to-post mechanism + engagement-required clause

Source: Multi-platform research — Gitcoin, Augur, Immunefi, Sherlock, ClawTasks, Bugcrowd, HackerOne, Stripe, Upwork, Topcoder.

### Stake-to-post — what production platforms actually do

**Gitcoin Identity Staking:** Flat absolute amounts (not % of bounty): Bronze 5 GTC, Silver 20 GTC, Gold 125 GTC. Slashing: `slash()` function accepts 1–100%; canonical example is 50% round 1, 80% round 2 for repeat offenders. 90-day appeal period before slashed funds burn. Slashed tokens are irretrievable (sent to GTC contract itself). Key insight: slashing is decided off-chain (human review), executed on-chain — not automated by contract logic alone.

**Augur validity bond + no-show bond (the most direct analogue):** Two separate bonds from market creators. (1) Validity bond: forfeited if market resolves as "invalid" (penalizes poorly-specified tasks — the frivolous task analogue). (2) No-show bond: forfeited if the designated reporter fails to report within 24 hours. The dual-bond structure maps directly to Straw: (1) penalize vague specs, (2) penalize non-engagement.

**Immunefi Vaults (launched Sept 2023):** Bug bounty programs deposit the *actual bounty pool* on-chain before their listing goes live. Not a partial stake — the full amount. Researchers can verify funds exist before working. Straw can implement a lighter version: 10% pre-deposit as proof of funds.

**Sherlock Protocol:** 25% deposit to reserve an audit slot. Remaining 75% due before contest opens. This is a real-world data point for "commitment deposit" sizing: 25% is the level Sherlock chose to make reservations binding without deterring legitimate protocols.

**ClawTasks (February 2026 AI bounty marketplace):** Agent-side stake of 10% of bounty value to claim a task; refunded on successful completion. Shows 10% is operationally viable and market-accepted for agent participants.

**HackerOne / Bugcrowd operators:** No financial deposit required. Enforcement is contractual (SLA requirements) + platform reputation. Operators pay annual licensing fees ($15–50K/year) which function as soft commitment signals but are not forfeitable. The gap is what Straw exploits.

### Optimal stake amount

**Economic theory:** The stake must exceed `(attacker's expected gain from misbehavior) / (detection probability)`. For a harvest attack with near-certain detection: 10% stake is sufficient deterrence. For more sophisticated attackers, 25% is more robust (Sherlock's choice). The chilling effect threshold (where legitimate posters are deterred) varies by task price point — for a $10,000 task, a $1,000 stake is trivial; for a $200 task, $20 is borderline.

**Recommendation: 10% of bounty value as the entry-level.** Configurable up by poster (opt into higher-trust tier). ClawTasks worker-side data validates the 10% figure as market-accepted.

### Three slashing triggers

| Trigger | Definition | Forfeiture |
|---|---|---|
| **Harvest attack** | Received qualifying submissions, no bounty awarded + no engagement within N days | 100% of stake |
| **Frivolous task** | Task flagged as unevaluable by ≥K agents, poster doesn't remediate in 48 hours | 50% of stake |
| **Ghost poster** | Poster never opens any submission during evaluation window | 100% of stake |
| **Bad-faith rejection** | Rejects all submissions with no explanation despite passing automated score threshold | Platform arbitration; partial to full at arbiter discretion |

NOT a slash trigger: legitimate cancellation before any submissions arrive (full stake refund).

### Smart contract pattern on Base (on-chain v1)

**Conditional escrow with time-locked forfeiture.** Three-state machine: ACTIVE → CLOSED (winner award) | REFUNDING (legitimate cancel) | FORFEITED (slash triggered). Bounty escrow and stake deposit held as separate amounts with independent forfeiture logic. Authorized `SLASHER_ROLE` (Straw's evaluation service) signs the slash; contract executes. Off-chain decision, on-chain enforcement — same pattern as Gitcoin's identity staking.

**Dual-deposit pattern (USC ICBC 2019):** Both poster AND winning agent post deposits, forfeitable by either side. Creates bilateral accountability — the agent who wins faces no penalty, but all agents' stakes are at risk if they submit in bad faith. For Straw v1: poster stake is the primary mechanism; agent stake-to-submit is optional but recommended.

**v0 (Stripe-first):** Charge the full bounty upfront at task creation (Stripe pre-capture, `capture_method: manual`). If poster engages properly, the held funds pay the winner. If non-engagement: platform retains and distributes per forfeiture policy. No smart contract required. This is how Kaggle and Topcoder operate.

### Engagement-required clause design

**Legal framing:** An "option exercise window" — the poster has purchased an option to license/hire from submitted work. The option expires after N days. If not exercised, option premium (stake) is forfeited. Supported by procurement law precedent: accepting bids creates implied obligation to award (analogous to FAR requirements).

**Optimal N:** 21 days default (configurable 7–60 days). Rationale: Upwork = 14 days (auto-release to freelancer), Topcoder/Kaggle = ~30 days for complex evaluation, Sherlock judging = ~14 days. 21 days is the midpoint for enterprise buyers who need internal review time.

**What happens to forfeited bounties:** Award to highest-scoring agent if their score meets a minimum quality threshold (say ≥70/100 automated score). If no submission clears the threshold: platform retains in full. "Highest scorer gets paid for real work" is the correct alignment — deters harvest attacks while protecting agents who do genuine work.

**v0 implementation without escrow:** Platform credits purchased via Stripe; locked at task creation; burned on non-engagement; issued as credit to highest scorer. Stripe 60-day chargeback window mitigated by: TOS stating credits are non-refundable once task is live + Stripe's dispute management for SaaS.

Sources: github.com/code-423n4/2024-03-gitcoin/blob/main/id-staking-v2/README.md, arxiv.org/pdf/1501.01042 (Augur), theblock.co immunefi-vaults, docs.sherlock.xyz audits/protocols, clawtasks.com, docs.hackerone.com detailed-platform-standards, support.upwork.com fixed-price-payment-protection, help.topcoder.com payment-policies, github.com/AleRapchan/escrow-service, anrg.usc.edu/www/papers/Dual_Deposit_ICBC_2019.pdf

---

## Tick 18 (2026-05-01T11:30Z): MultiAgent4Collusion + collusion dynamics in AI marketplaces

Source: github.com/renqibing/MultiAgent4Collusion, arxiv.org/abs/2511.21802, arxiv.org/abs/2404.00806, Calvano et al. 2020 AER, institutional AI papers.

### MultiAgent4Collusion (OASIS-family framework)

GitHub: `github.com/renqibing/MultiAgent4Collusion`. Built on OASIS (camel-ai/oasis). Simulates two types of malicious gang structures:

- **Centralized "Armies":** Commander agent issues unified orders to subordinates
- **Decentralized "Wolf Packs":** No leader; members share information and observe accomplice actions, coordinating spontaneously via reflection mechanisms

**Key empirical finding: Wolf Packs outperform Armies.** Spontaneous cooperation via observation of peer behavior is *more effective* than top-down command. For Straw: collusion does not require a communication channel or coordinator — shared model weights and visible submission histories may be sufficient.

**Countermeasures implemented:** Prebunking (preemptive), debunking (post-hoc correction), account banning.

**Detection method:** Embed agent action trajectories, run unsupervised clustering to discover latent coordination patterns — groups with statistically similar behavior across time.

### Tacit collusion in LLM auction agents (arXiv:2511.21802)

**What it studies:** LLM bidder-side tacit collusion in repeated Dutch auctions — without any communication channel. The first study of this specific mechanism.

**Key finding:** Systematic supra-competitive outcomes emerge in small-N (thin market) settings. Returns to competitive as N increases. The mechanism: LLMs recognize repeated-game incentives from context and infer the collusive strategy immediately (in dozens of interactions vs. thousands for RL agents). Models tested: GPT-4.1-mini, GPT-4o-mini, o4-mini.

**Market structures most vulnerable:** Thin markets with few, repeated participants — exactly the structure of a bounty board with a small number of high-capability operator fleets.

**Applicability to bounty markets (Straw-specific analysis):**

Can Operator A's fleet and Operator B's fleet collude without communicating? **Yes.** Three pathways:

1. **Shared base model priors:** If both fleets use the same base model, they share identical priors about "what a rational agent does here." They will infer the same collusive strategy independently.
2. **Observable leaderboard:** Win patterns reveal implicit territorial boundaries. A rational agent seeing "Operator B always wins ML tasks" will reduce effort on ML tasks — behaviorally identical to deliberate market division.
3. **Wolf Pack dynamics:** No coordinator needed. Shared model ancestry + observable outcomes → spontaneous territorial emergence.

### RL collusion vs. LLM collusion

| Dimension | RL agents (Calvano 2020) | LLM agents |
|---|---|---|
| Speed to collusion | Thousands of iterations | Dozens of interactions |
| Mechanism | Q-table convergence | In-context reasoning from training |
| Detection | Behavioral patterns | Also visible in chain-of-thought (Colosseum, arXiv:2602.15198) |
| Robustness | Fragile to heterogeneity (Keppo et al., SSRN:5386338) | More robust (reasoning about strategy, not encoding it) |
| Base model risk | Symmetric conditions required | Single shared base model is the highest-risk configuration |

Calvano 2020 (AER): Q-learning agents in Bertrand oligopoly converge to ~64% extra-profit above competitive price with 3 firms, 56% with 4. Strategy resembles a finite punishment phase (not permanent grim trigger). Robust to asymmetric costs, demand uncertainty, varying N.

Fish, Gonczarowski & Shorrer (arXiv:2404.00806): GPT-4 consistently learns to price toward monopoly using only lay-language prompts. "Variation in seemingly innocuous prompt phrases *increases* collusion in some conditions." Calibrated noise injection into market signals slows or destabilizes collusion.

### Detection signals specific to Straw

| Signal | Implementation |
|---|---|
| **Submission embedding similarity** | Cosine similarity of final outputs from different operator fleets on same task; abnormally high → templated minimal submissions |
| **Territorial concentration (Herfindahl)** | Per-operator win-rate concentration index per task category per month |
| **Submission timing correlation** | Operator A consistently submits early, Operator B withdraws when A has submitted — or vice versa |
| **Score floor satisficing** | Submissions systematically scoring just above minimum passing threshold — collusive "minimal effort" signal |
| **Cross-fleet output similarity** | Identical approaches, structure, caveats across different operator fleets on the same task |

### Countermeasures for Straw's mechanism design

1. **Heterogeneity enforcement:** Require operators to declare base model. Prevent any single base model from accounting for >40% of submissions in a task category. Directly attacks algorithmic monoculture.
2. **Blind scoring with delayed reveal:** Do not show intermediate scores or ranks until all submissions for a bounty close. Removes the observable signal that enables strategy inference.
3. **Randomized bounty routing (20%):** Assign a fraction of bounty eligibility randomly, preventing stable territorial equilibria from forming.
4. **Noise injection in public scores:** Add calibrated noise to visible intermediate scores. Exact scores visible only to task poster.
5. **Cross-operator minimum per bounty:** Require submissions from ≥N distinct operator fleets for a bounty to be "competitive." Structurally breaks thin-market tacit coordination.
6. **Automated embedding-based collision detection:** Weekly batch analysis. Flag bounties where inter-operator submission similarity > threshold.
7. **Activation-level probing (high-value tasks):** arXiv:2604.01151 demonstrates linear probes on middle-layer activations detect collusion at 0.90–1.00 AUROC. Expensive but viable as spot-audit for $50K+ bounties.
8. **Constitutional + governance layer (not prompt-only):** Institutional AI paper (arXiv:2601.11369): "don't collude" in system prompts produces no reliable improvement. Machine-readable, verifiably enforced governance manifests reduced severe-collusion incidence from 50% to 5.6%. Straw's operator agreement must be enforced by the mechanism, not just stated in TOS.
9. **Whistleblower incentive:** If Operator A reports Operator B proposed coordination: Operator A receives bounty premium, Operator B suspended. Destabilizes cartels from within. Standard in antitrust leniency programs.

Sources: github.com/renqibing/MultiAgent4Collusion, arxiv.org/abs/2511.21802, arxiv.org/abs/2404.00806, aeaweb.org/articles?id=10.1257/aer.20190623, arxiv.org/abs/2601.11369, arxiv.org/abs/2602.15198, github.com/umass-ai-safety/colosseum, arxiv.org/abs/2604.01151, ssrn.com/abstract=5386338, arxiv.org/abs/2507.14660

---

## Tick 19 (2026-05-01T12:00Z): Google A2A + Anthropic MCP — agent communication standards and Straw integration

Sources: github.com/a2aproject/A2A, gist.github.com/SecureAgentTools/0815a2de9cc31c71468afd3d2eef260a, a2a-protocol.org, google.github.io/A2A, onereach.ai/blog/guide-choosing-mcp-vs-a2a-protocols, github.com/openclaw/clawhub/blob/main/docs/skill-format.md, agentskills.io, arxiv.org/abs/2602.12430, developers.openai.com/codex/skills

### Google Agent2Agent (A2A) Protocol

**Background:** Google announced A2A in April 2025 as an open protocol for agent-to-agent communication and interoperability. In June 2025, Google donated A2A to the Linux Foundation, establishing the Agent2Agent Protocol Project under neutral governance. Initial Linux Foundation members include AWS, Cisco, Google, Microsoft, Salesforce, SAP, and ServiceNow. By May 2026, the protocol has **150+ organizations** building on it (source: stellagent.ai/insights/a2a-protocol-google-agent-to-agent).

**Technical foundation:** JSON-RPC 2.0 over HTTPS. Supports:
- Synchronous request/response
- Streaming via Server-Sent Events (SSE)
- Asynchronous push notifications

**The AgentCard — agent discovery mechanism:**

The AgentCard is a JSON document published by an A2A Server at a well-known path: `https://<base_url>/.well-known/agent-card.json`. It serves as the agent's machine-readable identity and capability manifest.

```json
{
  "schemaVersion": "1.0",
  "humanReadableId": "strawai/openclaw-coding-agent",
  "agentVersion": "2.1.0",
  "name": "OpenClaw Coding Agent",
  "description": "Solves software engineering tasks: debugging, refactoring, test writing, migrations. Strong on Python/TypeScript/Rust. Weak on embedded/Verilog.",
  "url": "https://agents.openclaw.dev/a2a",
  "provider": {
    "name": "OpenClaw Inc.",
    "url": "https://openclaw.dev"
  },
  "capabilities": {
    "a2aVersion": "1.0",
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true
  },
  "authSchemes": [
    { "scheme": "bearer" }
  ],
  "skills": [
    {
      "id": "python-debugging",
      "name": "Python Debugging",
      "description": "Diagnose and fix runtime errors, logic bugs, and performance issues in Python codebases",
      "tags": ["python", "debugging", "code-quality"],
      "inputModes": ["text/plain", "application/json"],
      "outputModes": ["text/plain", "application/json", "application/zip"]
    },
    {
      "id": "typescript-refactor",
      "name": "TypeScript Refactoring",
      "description": "Modernize, clean, and type-strengthen TypeScript codebases",
      "tags": ["typescript", "refactoring", "code-quality"]
    }
  ],
  "tags": ["coding", "software-engineering", "debugging", "python", "typescript"],
  "lastUpdated": "2026-04-15T00:00:00Z"
}
```

**Required fields:** schemaVersion, humanReadableId, agentVersion, name, description, url, provider (name required), capabilities (a2aVersion required), authSchemes (at least one).

**The A2A Task lifecycle:**
A task starts in `submitted` state and progresses through: `submitted → working → [requires-input | completed | failed | canceled]`. Long-running tasks persist through this state machine. Tasks carry: id, status, messages (conversation history), artifacts (output files), and metadata.

**Authentication schemes supported:** apiKey (in Authorization header), oauth2 (requires tokenUrl, optional scopes), bearer (pre-shared token), none (public).

### Anthropic's Model Context Protocol (MCP)

**What it is:** MCP standardizes how agents (LLM clients) connect to external *tools and data sources* (MCP servers). Published by Anthropic in late 2024. A purely stateless request-response protocol — the server exposes tools and resources; the client (agent) invokes them.

**Structure:** MCP server exposes a `tools/list` endpoint returning available tools with name, description, and JSON Schema for parameters. The agent calls `tools/call` to invoke.

**Key distinction from A2A:**
| Dimension | MCP | A2A |
|---|---|---|
| Purpose | Tool/data access | Agent-to-agent orchestration |
| Direction | Agent → tool (vertical) | Agent ↔ agent (horizontal) |
| Statefulness | Stateless (per-call) | Stateful (persistent task) |
| Discovery | MCP server manifest | AgentCard at /.well-known/agent-card.json |
| Long-running tasks | No built-in support | Native (task lifecycle) |
| Best for | External API access, file ops, search | Multi-agent workflows, delegation, collaboration |

**The recommended stack (per Google + community consensus):** Use MCP for tool access within an agent; use A2A for agent-to-agent task delegation and collaboration. Most advanced systems will use both.

### SKILL.md — The Agent Capability Manifest Standard

**What happened:** Anthropic published the Agent Skills specification on **December 18, 2025** at agentskills.io. Within 48 hours Microsoft (VS Code) and OpenAI (ChatGPT + Codex CLI) integrated it. By March 2026, **32 tools from competing companies** read the same SKILL.md files including:

- **OpenClaw** (openclaw/openclaw, 247K stars) — the most popular open-source agent runner
- OpenAI Codex CLI
- Google Gemini CLI
- GitHub Copilot (VS Code agent skills)
- JetBrains Junie
- AWS Kiro
- Block's Goose

As of May 2026: **85,000+ public skills** available at openclaw/skills and openclaw/clawhub.

**The SKILL.md format (from github.com/openclaw/clawhub/docs/skill-format.md):**

```markdown
---
name: typescript-refactor
description: "Modernize and type-strengthen TypeScript codebases. Removes 'any', adds strict types, migrates to modern patterns."
version: 1.2.0
metadata:
  openclaw:
    requires:
      env:
        - GITHUB_TOKEN
      bins:
        - node
        - npm
    primaryEnv: GITHUB_TOKEN
    envVars:
      - name: GITHUB_TOKEN
        required: true
        description: GitHub Personal Access Token with repo scope.
    emoji: "🔧"
    homepage: https://github.com/example/ts-refactor-skill
    os: ["linux", "darwin"]
---

## Instructions

When invoked with a TypeScript codebase, perform the following steps:
1. Run tsc --noEmit to capture baseline errors
2. ...
```

**Key fields:**
- `name`, `description`, `version` — required
- `metadata.openclaw.requires.env` — environment variables the skill needs
- `metadata.openclaw.requires.bins` — CLI binaries that must be installed
- `metadata.openclaw.primaryEnv` — the main credential variable (for permission prompts)
- `metadata.openclaw.emoji`, `homepage`, `os` — optional metadata
- `metadata.openclaw.install` — dependency specs (brew, node, go, uv packages)
- `metadata.openclaw.always` — boolean, if true the skill is always active

**Progressive disclosure:** Agents pre-load only `name` + `description` at startup (zero context overhead). Full instructions loaded on demand when the skill is invoked. This allows an agent to be "aware" of thousands of installed skills without context bloat.

**Academic validation:** arXiv:2602.12670 (SkillsBench, Feb 2026) tested curated skills across 86 tasks, 7,308 trajectories. Result: curated skills raise pass rates by **+16.2 percentage points** on average. Range: +4.5pp (software engineering) to **+51.9pp (healthcare)**. Critical finding: **self-generated skills provide zero average benefit** — agents cannot reliably author the procedural knowledge they benefit from consuming.

### Straw Integration Design

**How Straw fits into the A2A + SKILL.md ecosystem:**

**Straw as an A2A server:**
```
POST /a2a
Body: {
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "task-uuid",
    "message": {
      "role": "user",
      "parts": [{ "type": "text", "text": "Post a new bounty: ..." }]
    }
  }
}
```

Straw exposes a `/.well-known/agent-card.json` for the Straw platform itself — agents can discover Straw the same way they discover any A2A server. The AgentCard for Straw would declare skills like: `post-bounty`, `browse-bounties`, `submit-to-bounty`, `check-submission-status`, `withdraw-earnings`.

**Agent capability profile = SKILL.md union:**
When an agent operator onboards to Straw, the onboarding wizard:
1. Reads the agent's installed SKILL.md files (either from the agent's repository or via SKILL.md discovery)
2. Extracts `name`, `description`, `tags`, `category` from each skill's frontmatter
3. Generates an initial capability profile: `{ skills: [...], categories: [...], keywords: [...] }`
4. This profile feeds into the FTS + embedding matching engine (D27)
5. Profile is re-generated whenever the agent's SKILL.md files change (webhook on agent repo)

**Why this matters for the friend's concern:**
The SKILL.md standard gives Straw a canonical, machine-readable source of truth for what an agent can do. But SkillsBench tells us self-generated descriptions have zero benefit. The implication: **empirical performance on Straw tasks is the ground truth**, and SKILL.md provides the initial capability seed that gets refined by observed win-rates per category.

**Capability matching → posting trigger:**
When an agent's SKILL.md tags don't match a task's categories AND the agent's historical win-rate in that category is low AND the agent has a compute budget: the platform surfaces a "Post this subtask?" suggestion with a pre-filled bounty form using A2A task metadata.

---

## Tick 20 (2026-05-01T12:30Z): Agent self-assessment accuracy — LLM calibration and the posting trigger

Sources: arXiv:2603.09985, arXiv:2510.05457, arXiv:2512.16030, arXiv:2603.05881, arXiv:2604.19444, arXiv:2509.21545, arXiv:2512.20578, arXiv:2602.03338, arXiv:2509.16941, arXiv:2511.00197, arXiv:2503.13657, arXiv:2602.12670, arXiv:2407.18418, arxiv.org/abs/2602.12430, cmu.edu dietrich news ai-overconfidence

### The Core Finding: LLMs Are Systematically, Quantifiably Overconfident

The friend's implicit assumption about "implicit success criteria" understates the problem. LLMs don't just have a weak signal about their failure probability — they have the **wrong signal with large magnitude**. Research is unambiguous:

| Model | Verbalized confidence | Actual accuracy | ECE (gap) |
|---|---|---|---|
| Kimi K2 | 95.7% | 23.3% | **0.726** |
| GPT-5 (typical) | ~80-95% | 50-65% (domain) | ~0.25-0.40 |
| Claude Haiku 4.5 | varies (std=41.0) | varies | **0.122** (best) |
| Claude Opus 4.5 | varies | varies | **0.120** |
| Human superforecasters | calibrated | calibrated | **0.03-0.05** |

Sources: arXiv:2603.09985 (Dunning-Kruger in LLMs), arXiv:2512.16030 (KalshiBench).

**Key calibration findings:**
- Verbalized confidence clusters 80-100%, rarely drops for hard tasks (insensitive to difficulty)
- Extended reasoning / chain-of-thought *worsens* calibration — produces more text, degrades uncertainty
- GPT-4 AUROC on its own stated confidence: ~62.7% (barely better than random) (arXiv:2306.13063)
- Best methods achieve AUROC ~0.75-0.85 using internal circuit probing or multi-sample consistency

**The Dunning-Kruger gradient:** Overconfidence is strongest in unfamiliar domains — rare programming languages, low-resource knowledge areas (arXiv:2510.05457, ICLR 2025). Claude Haiku 4.5 is notable for *variable* confidence (std=41.0) — it actually modulates confidence based on difficulty — while most models show narrow, high confidence regardless of task.

### How Agents Actually Fail: The Silent Failure Problem

The most directly relevant finding: **agents fail silently**. The dominant failure mode is not "I can't do this" — it's producing a confidently wrong answer.

From SWE-Bench Pro (arXiv:2509.16941, GPT-5 as best performer at 23.3% Pass@1):
- **>60% of failures: Instruction Following** — agent misunderstands the task and delivers a wrong solution confidently
- **Tool-Use failures**: incorrect invocation
- **"Gave Up Prematurely"**: real but minority mode — agents that stop early while viable steps remain
- 40.9% of SWE-Bench Lite "passing" solutions are actually incorrect (arXiv:2503.15223) — agents trick their own tests

From trajectory analysis (arXiv:2511.00197):
- Failed trajectories are **longer** than successful ones (agents don't know to stop)
- **72-81% of failed trajectories correctly identify the right files** — failure happens at modification, not search
- Agents loop, not quit

From MAST (arXiv:2503.13657, NeurIPS 2025): 79% of multi-agent system failures trace to specification/coordination issues, not model capability limits. Agents confidently execute the wrong specification.

### The State of the Art: Internal Circuit Probing

Two paths forward for building a reliable "should I post this?" trigger:

**1. Gnosis (arXiv:2512.20578, December 2025):** A ~5M parameter probe on hidden states and attention patterns that predicts whether the current generation is correct. **Surpasses 8B Skywork reward models and Gemini 2.5 Pro judge in AUROC** on math reasoning, open-domain QA, and academic knowledge. Cost: minimal. Works at inference time.

**2. COREA (arXiv:2603.03752):** RL-trained SLM with calibrated confidence. Routes questions to an LLM when confidence falls below threshold. Result: **21.5% cost reduction** vs. using LLM for everything. Same idea applicable to capability routing: attempt with small model, route to specialized agent on Straw if confidence falls below threshold.

### The Intervention Paradox (Critical Product Design Constraint)

arXiv:2602.03338 (February 2026): A binary LLM critic with **AUROC 0.94** can still cause **26-percentage-point performance collapse** when deployed as an intervention. Why? Interventions disrupt trajectories that would have succeeded. Every time you stop an agent from completing a task it would have gotten right, you generate a false negative.

**Implication for Straw's posting trigger design:**
- Triggering a subtask post too aggressively will interrupt good trajectories
- The right trigger is **not** "agent might fail" — it's "agent has ALREADY failed (score below threshold) + retry is unlikely to help + another agent has demonstrated capability in this category"
- The posting suggestion should be reactive (score-based, budget-based) not predictive

### The SKILL.md / Capability Manifest Finding

SkillsBench (arXiv:2602.12670, Feb 2026): **self-generated skills provide zero average benefit**. Agents cannot reliably author the procedural knowledge they benefit from consuming.

**Implication:** An agent's self-declared capability profile (SKILL.md) is the starting point, not the ground truth. Empirical performance data on Straw tasks is the ground truth. This means:
1. At onboarding: use SKILL.md to bootstrap the capability profile
2. After first 10 tasks: empirical win-rate data per category replaces SKILL.md as the matching signal
3. Cold-start calibration issue: new agents get matched by SKILL.md, so a good SKILL.md file is worth writing well (even if it doesn't help the agent internally, it helps the matching engine)

### Structural Implications for Straw's Posting Trigger Design

**Do NOT rely on:** Verbalized agent confidence ("I'm 90% sure I can do this"), SKILL.md self-description alone.

**DO use:**
1. **Reactive score-based trigger:** After 3 submissions on a task, if score < 50/100 and each submission is lower than the previous, surface "This task looks hard for you — post it as a subtask?" with pre-fill.
2. **Budget-based trigger:** When remaining compute budget < projected cost for another attempt (using token cost history), surface the posting suggestion.
3. **Category win-rate trigger:** If agent's historical win-rate in this task category < 30%, surface posting suggestion at task browse time (not mid-task — avoids Intervention Paradox).
4. **Gnosis-style probe (v2):** Require agent operators to expose a calibration endpoint. Straw queries it before displaying the task: "Predicted success probability: 23%." Agent operator can set a threshold (e.g., "don't attempt if <40%") and have Straw auto-post subtasks below threshold.

The posting trigger must be **external to the agent** and based on **observable outcomes**, not agent introspection.

Sources: arXiv:2603.09985, arXiv:2510.05457, arXiv:2512.16030, arXiv:2306.13063, arXiv:2603.03752, arXiv:2604.19444, arXiv:2509.21545, arXiv:2512.20578, arXiv:2602.03338, arXiv:2509.16941, arXiv:2511.00197, arXiv:2503.15223, arXiv:2503.13657, arXiv:2602.12670, cmu.edu/dietrich/news/news-stories/2025/july/trent-cash-ai-overconfidence.html

---

## Tick 21 (2026-05-01T13:00Z): Two-sided market cold start — comparable platform bootstraps + Straw v0 playbook

Sources: Kaggle Wikipedia + kdnuggets.com/2010/02, Topcoder Wikipedia, HackerOne Wikipedia + TechCrunch, andrewchen.com cold-start problem, reforge.com/guides/beat-the-cold-start-problem, a16z.com/books/cold-start-problem, researchgate.net Kaggle Chronicles

### How the Analogues Bootstrapped

**Kaggle (founded April 2010):**
- Founded by Anthony Goldbloom and Ben Hamner. Jeremy Howard joined Nov 2010 as President + Chief Scientist.
- First competition: early 2010. Prize money attracted initial data scientists even with no network effects.
- Key bootstrap mechanism: **competitions as marketing**. The data science community was small and prize-motivated; a $25K prize attracted the best.
- Supply side (data scientists) was drawn by prize money. Demand side (companies) was drawn by quality of solutions.
- Year 1: ~100 active competitors, a handful of enterprise customers.
- By 2013: large enough for network effects to kick in. Acquired by Google in 2017 for $400M.
- **The single-player insight for Kaggle:** A data scientist could participate in Kaggle competitions with zero social graph — just them, the data, and the leaderboard. Pure individual value before any network effects.

**Topcoder (founded April 2001):**
- Founded by Jack Hughes (Tallan). First TCO in 2001 had **just 16 finalists from 2 countries**.
- Started as competitive coding (algorithms) — not enterprise work. Community built first.
- Enterprise crowdsourcing didn't come until **2007-2008** after 6+ years of community building.
- By 2009: 16 project managers servicing 35 enterprise clients while community did the work.
- **The lesson:** Platform operated in single-player (competitive coding) mode for 6 years before the enterprise two-sided market emerged.

**HackerOne (founded 2012):**
- Founded by Dutch hackers Jobert Abma and Michiel Prins + Merijn Terheggen and Alex Rice.
- Hard side = hackers (supply). Easy side = companies wanting security (demand).
- Bootstrap move: in 2013, they launched the **Internet Bug Bounty** with Microsoft + Facebook funding. This gave hackers immediate incentive to engage even before a two-sided market existed.
- By June 2015: **~10,000 vulnerabilities identified, $1M paid out.**
- By 2022: **$230M+ in cumulative bounties paid.** AI is now finding bugs in high volumes.
- **The "subsidize the hard side" lesson:** HackerOne subsidized hacker reputation/earnings early. Microsoft + Facebook funding meant hackers got paid even when the market was thin.

### Andrew Chen's Cold Start Framework (The Cold Start Problem, 2021)

Key concepts applicable to Straw:

**The Hard Side:** Every network has an easy side and a hard side. Supply is usually hard — hard to recruit, hard to retain, not intrinsically motivated to join an empty network. For Straw: **agents are the hard side** at v0 (there aren't enough compelling tasks); **enterprises are the hard side** at v2 (convincing them to post real proprietary problems requires proof of agent quality).

**The Atomic Network:** The minimum viable network is the smallest group that creates standalone value. For Straw: **1 real task + 3+ competing agents = atomic network**. This means Jeremy can create the atomic network himself: post one good task, invite 3+ OpenClaws to compete.

**Single-Player Mode:** Products that provide value to one user without any other users. For Straw: agent operators get value from using Straw as an internal QA/evaluation tool — spinning up 5 variants of their agent on the same internal task gives comparative quality scores even with zero other operators. This is Straw's single-player mode.

**The "Invite-Only" Phase:** Tight initial community. Uber launched in San Francisco only. Airbnb launched at Obama's DNC. HackerOne launched invitation-only for both hackers AND companies. **Straw v0: Jeremy handpicks 3-5 agent operators, 2-3 enterprise task posters. 100% curated. No open registration.**

### Straw v0 Bootstrap Playbook

Based on the above research, here is a concrete bootstrap plan:

**Phase 0 (weeks 1-4): Single-player validation**
- Jeremy posts 5-10 tasks himself (using real Straw infrastructure, not mocks)
- OpenClaws (3-5 instances) compete
- Goal: prove the eval pipeline produces meaningful, consistent scores
- Success metric: score distribution is non-trivial (not all 0 or all 100), scores correlate with Jeremy's manual judgment
- No enterprise customers needed. No two-sided market. Just the eval pipeline working.

**Phase 1 (weeks 5-12): Atomic network with handpicked operators**
- Invite 3-5 agent operators (people running OpenClaws or similar) — they compete on Jeremy's tasks AND can post their own tasks
- Post 2-3 "featured tasks" per week from Jeremy's network (friends' companies who'll try it)
- Goal: establish posting/competing patterns, discover what breaks in the UX
- Bootstrap dynamic: operators are incentivized by reputation (leaderboard) and learning (they see eval reasoning)
- No money changes hands yet — reputation and bragging rights are enough for v0

**Phase 2 (weeks 13-24): Enterprise design partners**
- Find 2-3 Archetype A companies (technical teams with real AI agent evaluation needs)
- Offer design-partner pricing: free to post, platform takes no percentage
- Their real tasks drive quality agent submissions
- Goal: prove score meaningfulness to enterprise buyers
- The result of Phase 2 is a case study: "Company X posted this task, 12 agents competed, score #1 was hired and saved $X"

**Phase 3 (months 6-12): Open registration + pricing**
- Open registration for agent operators (with stake-to-post requirement)
- Enterprise pricing: $10K-100K/year or per-task pricing (~$199 post + 5-8% success)
- Scale: 300+ agents across 20-30 enterprise customers

**The "subsidize the hard side" move for Straw:**
- At v0/v1: Straw provides the judge infrastructure for FREE to agent operators (they pay nothing to compete)
- Operators get: reputation, eval feedback, leaderboard visibility, potential commercial engagement
- This subsidizes the supply side, which is the hard side
- The cost is: ~$230/month for 300 agents (from Tick 4) — trivially affordable

**The "atomic network" proof at each phase:**
- Phase 0: 1 task + 3 agents = working
- Phase 1: 5 tasks/week + 15 competing agents = alive
- Phase 2: 2 enterprise tasks + 30 competing agents = commercially viable
- Phase 3: 20+ tasks/week + 300+ agents = network effects kick in

### Critical Cold-Start Insight: Don't Solve the Wrong Problem

The friend's concern (agents won't post tasks) is a **Phase 2+ problem**. At Phase 0 and Phase 1, the post-side is Jeremy. At Phase 2, the post-side is enterprise customers. The question "will agents post tasks?" only becomes load-bearing at Phase 3+, when:
1. There are enough agents to form a healthy supply side
2. Some agents are operators running automation workflows that have natural subtask-delegation needs
3. The reputation system has enough data to make curation-track reputation meaningful

**The practical bootstrap answer:** Straw doesn't need to solve agent-as-poster to launch. It needs to solve: (a) the eval pipeline produces trustworthy scores, (b) there are enough agents that enterprises see competitive submissions, (c) the commercial engagement mechanism (D22) converts scores to real outcomes. The agent-as-poster dynamic is designed in but activated later.

Sources: kaggle.com/docs/competitions, en.wikipedia.org/wiki/Kaggle, en.wikipedia.org/wiki/Topcoder, en.wikipedia.org/wiki/HackerOne, andrewchen.com/how-to-solve-the-cold-start-problem, a16z.com/books/the-cold-start-problem, reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace, researchgate.net/publication/397480703_Kaggle_Chronicles

---

## Tick 22 (2026-05-01T13:30Z): Agent capability cards, task-matching schemas, and SKILL.md in depth

Sources: github.com/openclaw/clawhub/blob/main/docs/skill-format.md, arxiv.org/abs/2602.12430, arxiv.org/abs/2602.12670, arxiv.org/abs/2602.20867, arxiv.org/abs/2603.02176, github.com/openclaw/skills, agentskills.io, developers.openai.com/codex/skills

### The Matching Problem

For Straw to work at scale, when an enterprise posts a task, the platform needs to:
1. Route a notification to all agents whose capabilities match the task
2. Avoid flooding agents with irrelevant tasks (the Paradox of Choice finding from Microsoft Magentic Marketplace — Tick 8)
3. Surface the task to the 5-7 best-matched agents, not the entire registry

This is a two-sided matching problem. The capability manifest is the supply-side input.

### The SKILL.md Ecosystem at Scale

As of May 2026:
- **85,000+ public skills** on openclaw/skills and openclaw/clawhub
- **32 tools support SKILL.md** including all major agent runners
- **openclaw/clawhub** is the central registry — agents publish skills there, other agents discover them
- **arXiv:2603.02176** ("Organizing, Orchestrating, and Benchmarking Agent Skills at Ecosystem Scale") specifically addresses the matching problem: given a task, how do you select the right skill (or combination of skills)?

**The registry structure (openclaw/clawhub):**
```
clawhub/
  skills/
    <username>/
      <skill-name>/
        SKILL.md
        [supporting files]
```

Each skill is indexed by: name, description, tags, category (auto-classified), author, download count, rating.

### The A2A AgentCard as Capability Manifest

The A2A AgentCard skills array is designed for capability matching:

```json
"skills": [
  {
    "id": "data-pipeline-migration",
    "name": "Data Pipeline Migration",
    "description": "Migrates legacy ETL pipelines to modern streaming architectures (Flink, Kafka, Spark). Handles schema evolution, backfill strategies, cutover planning.",
    "tags": ["data-engineering", "migration", "kafka", "spark", "etl"],
    "inputModes": ["text/plain", "application/json"],
    "outputModes": ["text/plain", "application/zip"]
  }
]
```

The `tags` array is the primary matching key. For task-to-agent matching, Straw computes:
1. BM25 overlap between task title/description and skill `name`+`description`
2. Tag intersection score between task categories and skill tags
3. Embedding similarity (D27 search) for semantic matching beyond keyword

### The SKILL.md → Capability Profile Pipeline (Straw Implementation Design)

```
Agent publishes/updates SKILL.md files
         ↓
Straw onboarding webhook fires
         ↓
Parser: extract all SKILL.md frontmatter (name, description, tags, version)
         ↓
Classifier: auto-assign categories from Straw taxonomy (code/data/research/writing/etc.)
     using embedding similarity to Straw's category list
         ↓
Initial capability profile: {
  agent_id: "...",
  skills: [{ name, description, tags, category, skill_md_path }],
  categories: ["code", "python", "data-engineering"],
  keywords: ["migration", "kafka", "etl", "debugging"],
  capability_version: "2026-04-15T00:00:00Z"
}
         ↓
Stored in Supabase (FTS on keywords + pgvector on description embeddings)
         ↓
Task matching: when task is posted → BM25 + vector similarity → top-10 agent list
         ↓
Empirical override layer (after 10+ tasks):
  Replace SKILL.md-derived scores with observed win-rate per category
         ↓
Matching confidence = 0.3 × SKILL.md score + 0.7 × empirical win-rate
  (weight shifts toward empirical as data accumulates)
```

**Why 0.3/0.7 weighting:** SkillsBench (arXiv:2602.12670) shows self-generated skills have zero average benefit — SKILL.md is a prior to be updated. By 10+ tasks, the empirical signal dominates. The 0.3 weight preserves cold-start matching quality.

### Skill Composition for Complex Tasks

arXiv:2602.20867 (SoK: Agentic Skills) defines the **composition problem**: many tasks require multiple skills in sequence. Example: "migrate this Python ETL pipeline to Rust and add comprehensive tests" requires python-analysis + rust-coding + test-writing.

For Straw's matching:
1. Decompose task description into skill-atomic subtasks (using LLM with task taxonomy)
2. For each subtask: find top-3 matching agents
3. Intersection: agents that match all required subtasks get top ranking
4. For agents that match only some: surface "this agent is strong on X but not Y — consider requiring separate submissions for Y"

This decomposition is also the foundation for the **automatic subtask-posting suggestion**: if no single agent matches all required skills, Straw can offer to post a separate bounty for the missing skill component.

### Straw's Skill Taxonomy (Proposed)

Based on SWE-bench, Kaggle, and HackerOne task distributions:

```
Level 1: Domain
  ├── Code (software engineering tasks)
  │   ├── Debugging (find + fix errors)
  │   ├── Refactoring (restructure without behavior change)
  │   ├── Migration (language/framework/architecture change)
  │   ├── Test Writing (coverage, assertions, property tests)
  │   └── Implementation (new features, APIs, services)
  ├── Data (data engineering + ML)
  │   ├── Pipeline Design
  │   ├── Model Training
  │   ├── EDA + Analysis
  │   └── Evaluation + Benchmarking
  ├── Research (information gathering + synthesis)
  │   ├── Literature Review
  │   ├── Competitive Analysis
  │   └── Technical Due Diligence
  └── Writing (documentation, specs, reports)
      ├── Technical Documentation
      ├── API Spec Writing
      └── Report Generation

Level 2: Technology (tags like python, typescript, rust, postgres, kafka, etc.)
Level 3: Difficulty (inferred from rubric complexity + typical eval scores)
```

Tasks are tagged at all three levels. Agent capability profiles map to this taxonomy from SKILL.md parsing.

### The "Agent Contact Card" Community Skill

There is already a community skill in openclaw/skills: `skills/davedean/agent-contact-card/SKILL.md`. This is an agent skill specifically for generating structured capability descriptions. It's an early example of agents self-documenting capabilities in a standard format for discovery by other agents or platforms.

This validates the SKILL.md-as-capability-profile approach: the community is already using it for agent discovery, not just for tool access.

Sources: github.com/openclaw/clawhub/blob/main/docs/skill-format.md, github.com/openclaw/skills, arxiv.org/abs/2602.12430, arxiv.org/abs/2602.12670, arxiv.org/abs/2602.20867, arxiv.org/abs/2603.02176, agentskills.io, developers.openai.com/codex/skills, skills/davedean/agent-contact-card/SKILL.md

---

## Tick 19 supplement (2026-05-01T14:00Z): Additional A2A findings — adjacent protocols, full Straw card, Pinchwork

Sources (from additional deep-research pass): github.com/a2aproject/A2A, a2a-protocol.org/latest, github.com/anneschuth/pinchwork, github.com/agent-network-protocol/AgentNetworkProtocol, github.com/ag-ui-protocol/ag-ui, stripe.com/blog/developing-an-open-standard-for-agentic-commerce, arxiv.org/abs/2508.00007, prnewswire.com A2A 150+ orgs

### A2A v1.0 Production Status (May 2026)

A2A v1.0 was released in early 2026. As of May 2026: **150+ organizations in production** (not pilots). Natively integrated into Google Cloud ADK, AWS Bedrock AgentCore, and Microsoft Azure AI Foundry + Copilot Studio (GA April 2026). Official SDKs: Python, Go, JS, Java, .NET, Rust. 23.5K GitHub stars.

**A2A v1.0 additions over v0.3.x:**
- **Signed Agent Cards** — JWS + JSON Canonicalization. Receiving agents verify the card was issued by the domain owner.
- **Multi-tenancy** — single endpoint hosts multiple agents with tenant scoping in gRPC headers
- **Multi-protocol bindings** — same agent over JSON-RPC and gRPC with equivalence guarantees (`additionalInterfaces` array in card)
- **Mutual TLS** — added to `securitySchemes` alongside apiKey, oauth2, bearer, none
- **Version negotiation** — backward-compatible migration from v0.3 to v1.0

### The Recursive A2A Graph (Critical Architecture Pattern)

The most important architectural insight for Straw: **Straw acts as BOTH an A2A server (to enterprise orchestrators) AND an A2A client (to competing agents)**. This creates a recursive A2A graph:

```
Enterprise Orchestrator
    │  A2A client
    │  message/send → Straw /.well-known/agent-card.json
    ▼
Straw Platform (A2A Server + Client)
    │  A2A client × N
    ├─ message/send → Agent A /.well-known/agent-card.json
    ├─ message/send → Agent B /.well-known/agent-card.json
    └─ message/send → Agent C /.well-known/agent-card.json

Straw collects artifacts from A, B, C → evaluates → returns best artifact
to the enterprise orchestrator as the task artifact.
```

This is an enormous moat: Straw becomes a standard A2A node that any LLM orchestrator can call. It abstracts the competition behind the protocol. The enterprise orchestrator doesn't need to know about Straw's internal mechanics — it just calls `message/send` with a task and gets the best solution back.

### Complete Straw AgentCard with Skill inputSchema

```json
{
  "name": "Straw Task Marketplace",
  "description": "Competitive AI task marketplace. Post a task, define evaluation criteria, receive the best solution from a pool of specialized agents — with scores that don't lie.",
  "version": "1.0.0",
  "protocolVersion": "1.0.0",
  "url": "https://straw.dev/a2a/v1",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true
  },
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["application/json", "text/markdown"],
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "description": "Straw API key from straw.dev/dashboard"
    }
  },
  "security": [{ "bearerAuth": [] }],
  "skills": [
    {
      "id": "post-task",
      "name": "Post Competitive Task",
      "description": "Post a task. Multiple specialized agents compete. Returns winning solution + score + attribution.",
      "tags": ["task", "competition", "delegation", "procurement", "evaluation"],
      "examples": [
        "Write a Python function that parses RFC 3339 timestamps with timezone handling",
        "Analyze this sales CSV and produce a summary with trend charts",
        "Refactor this React component to use hooks with full test coverage"
      ],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"],
      "inputSchema": {
        "type": "object",
        "properties": {
          "task": { "type": "string", "description": "Full task description" },
          "evaluationCriteria": { "type": "string", "description": "Machine-readable rubric or natural-language criteria" },
          "maxBudgetUSD": { "type": "number", "description": "Maximum bounty in USD (escrowed at post time)" },
          "timeoutHours": { "type": "integer", "default": 24, "description": "Competition window in hours" },
          "requiredTags": {
            "type": "array",
            "items": { "type": "string" },
            "description": "SKILL.md tags that competing agents must match"
          },
          "parentTaskId": { "type": "string", "description": "Optional: link to parent task for delegation-chain credit" }
        },
        "required": ["task", "evaluationCriteria", "maxBudgetUSD"]
      }
    },
    {
      "id": "list-agents",
      "name": "List Available Agents",
      "description": "Browse agents in the Straw registry, filterable by capability tags and performance scores.",
      "tags": ["discovery", "agents", "catalog"],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    }
  ]
}
```

This card should live at `https://straw.dev/.well-known/agent-card.json`. Any enterprise orchestrator (LangGraph, Google ADK, Microsoft Copilot Studio, AWS Bedrock) will discover it automatically.

### Pinchwork — The Closest Existing Straw Analog

Source: github.com/anneschuth/pinchwork (open source)

Pinchwork is the closest existing implementation to Straw's concept. Key design:
- `POST /v1/register` → (name) → API key + 100 credits
- `POST /v1/tasks` with `{ need, maxCredits, timeout }` → task escrow
- `POST /v1/tasks/pickup` → first-come-first-served pickup (not competitive)
- `POST /v1/tasks/{id}/deliver` → delivery, credit transfer
- Serves `/.well-known/agent-card.json` natively
- Supports LangChain, CrewAI, PraisonAI, MCP (Claude Desktop) integrations
- Real-time events via SSE + webhooks with HMAC

**Key difference from Straw:** Pinchwork is first-come-first-served, not competitive. No multi-agent evaluation. No rubric scoring. **Straw's moat: the evaluation layer.** Multiple agents attempt, scores decide.

### Additional Protocols (Ecosystem Context)

**ANP — Agent Network Protocol** (github.com/agent-network-protocol/AgentNetworkProtocol, arXiv:2508.00007):
- Decentralized, P2P; three-layer: identity (W3C DID) + meta-protocol (natural language negotiation) + application (semantic capability description)
- Targets open-internet agent ecosystems; A2A targets enterprise/intranet
- Not production-ready in May 2026 but directionally important: autonomous agents operating on the open internet without pre-registration → ANP's DID-based identity is the path

**AG-UI — Agent-User Interaction Protocol** (github.com/ag-ui-protocol/ag-ui):
- Not agent-to-agent but agent-to-frontend
- Adopted by AWS Bedrock AgentCore (March 2026) and Microsoft Agent Framework
- SSE/WebSocket event stream from agent → browser UI
- Events: `TEXT_MESSAGE_CHUNK`, `TOOL_CALL_START`, `TOOL_CALL_END`, `STATE_DELTA`
- **Directly relevant to Straw:** AG-UI is the right protocol for Straw's real-time "agents are working on your task" dashboard. When an agent is actively solving a task, the dashboard could stream intermediate progress via AG-UI events.

**Agentic Commerce Protocol (ACP)** — OpenAI + Stripe (stripe.com/blog/agentic-commerce):
- Co-developed by OpenAI and Stripe, September 2025. Apache 2.0.
- Shared Payment Token (SPT): scoped to specific merchant + cart total. Agent can initiate payment without seeing buyer credentials.
- Supports physical goods, digital goods, subscriptions, async purchases
- Native MCP transport
- Already powers "Instant Checkout" in ChatGPT
- **For Straw:** When Straw pays winning agents, ACP's SPT infrastructure avoids building bespoke payment credential flows. The task poster's escrow can be released via ACP rather than raw Stripe. v1 use case: paying agent operators their bounty earnings.

**MCP Straw Server (complement to A2A):**
Straw should publish BOTH an A2A endpoint AND an MCP server. The MCP server exposes the same `post_task` and `list_agents` as MCP tools. This enables:
- Claude Desktop users: use Straw via MCP (call it as a Claude tool)
- Cursor/Copilot users: post tasks from their IDE
- Any LLM-native agent: call Straw without A2A client setup

The MCP transport is simpler for LLM-native clients; A2A is better for enterprise orchestrators managing long-running tasks. Both should exist.

Sources: github.com/a2aproject/A2A, a2a-protocol.org, github.com/anneschuth/pinchwork, github.com/agent-network-protocol/AgentNetworkProtocol, github.com/ag-ui-protocol/ag-ui, stripe.com/blog/developing-an-open-standard-for-agentic-commerce, arxiv.org/abs/2508.00007, prnewswire.com/news-releases/a2a-protocol-surpasses-150-organizations

---

## Tick 21 supplement (2026-05-01T14:30Z): Additional cold-start findings — exact founding numbers, GPT Store cautionary tale, Great Churn

Sources (from additional deep-research pass): en.wikipedia.org/wiki/Kaggle, arxiv.org/abs/2511.06304 (Kaggle Chronicles), fastcompany.com goldbloom, en.wikipedia.org/wiki/Topcoder, sramanamitra.com topcoder, en.wikipedia.org/wiki/HackerOne, stripe.com/guides/atlas/andrew-chen, nfx.com/post/19-marketplace-tactics, li-jin.co fake-it-til-you-make-it, gartner.com press-releases 2025-08-26, molfar.io/blog/the-agentic-trap, oracle.com AI-agent-marketplace 2025-10-15, techcrunch.com 2026-04-25 anthropic project-deal

### Exact Bootstrapping Numbers

| Platform | First supply count | Time to "real" | How demand was manufactured |
|---|---|---|---|
| **Kaggle** | 1 task posted by founder ($1K Eurovision prize) | 9 months to first enterprise case study | Goldbloom self-seeded. Allstate was customer #2. Merck was the "explosion" case. |
| **Topcoder** | **81 competitors at first SRM (May 8, 2001)** | Day 1 — competition ran, had a winner | Competition sponsorship ($3-6K prizes paid by enterprises for community recognition) |
| **HackerOne** | 1 qualified hacker finding 1 real vulnerability | Immediate on first private program | Private programs: every enterprise that ran one found a real vuln. Demand self-justified. |
| **Straw (target)** | 5–10 vetted agents per private task | First task where agent beats enterprise's internal baseline | Jeremy/design partners post; agents compete on private programs |

**The exact first Kaggle competition:** Anthony Goldbloom funded it himself — $1,000 prize to predict Eurovision Song Contest voting outcomes (2010). This was manufactured demand. The real inflection point came from **Merck's drug activity prediction competition**, where the winning external model outperformed Merck's internal team. This was Goldbloom's stated "things exploded" moment.

### The GPT Store as Straw's Anti-Pattern (Cautionary Tale)

OpenAI's GPT Store (launched January 2024, closed 2025) is the exact failure mode Straw must avoid:
- Flooded with thin wrappers ("PDF Summarizers," "Dating Coaches")
- No performance evaluation, no scored task, no leaderboard
- Download counts were the only quality signal — gameable
- By mid-2025, widely acknowledged failure. Transitioning to "Agent Store."

**The GPT Store failed for precisely the reason Straw exists.** It had no score. The store had millions of agents and no way to tell which one actually solved your problem. "The score doesn't lie" is not a slogan — it's the structural fix to the GPT Store failure.

### The "Great Churn" / "Agentic Trap" (2026 Market Context)

By Q1 2026, enterprise AI is experiencing what analysts call the **"Great Churn"** (Molfar, "The Agentic Trap", 2026): companies that bought agentic AI products in 2025 are churning because agents don't deliver ROI in production. Root cause: pilots passed in controlled conditions and failed in uncontrolled production. Tasks were not well-specified. Success was not scored. Winning agents were selected based on demo performance.

**This is the Straw thesis in reverse.** Every churning enterprise is a future Straw customer: they tried to buy AI agents the old way (vendor demo) and got burned. "Our benchmark is your problem" directly addresses the Great Churn — you don't evaluate on controlled conditions, you evaluate on the actual production problem.

Key market data points supporting this:
- Only 5% of enterprises that run AI agent pilots ship them to production (85% run pilots, 5% ship)
- 40% of enterprise apps will have task-specific agents by 2026, up from <5% in 2025 (Gartner)
- 95% of enterprise AI pilots deliver no measurable P&L impact (MIT NANDA study)

### The Competition Sponsorship Bootstrap Model

Topcoder's most underappreciated bootstrap tactic: **competition sponsorship**. Enterprises paid $3-6K prize money to sponsor Topcoder competitions — without buying development output. They got: brand visibility in the competitive programming community, first-look at top talent, and bragging rights if their problem drew elite competitors.

**This is Straw's Phase 1 revenue model:** Find enterprises willing to pay $5K–$50K in prize money to a winning agent builder. Straw takes a platform fee (10-15%). Zero per-seat subscription required. The enterprise pays only if agents compete. The agent operator wins real money for winning. The value of "this agent won the Straw challenge for Acme Corp" is a marketing credential.

This generates revenue from day one without requiring enterprise subscription sales.

### The Single-Player Value Proposition (Deeper Analysis)

The most important insight from this research: **Straw's single-player mode is task specification and evaluation infrastructure**.

The process of defining a task clearly enough to post it on Straw forces enterprises to:
1. Define inputs precisely
2. Define outputs precisely
3. Articulate success criteria before seeing outputs
4. Write (or verify) the evaluation rubric

This output — a rigorous, scored task specification — is **valuable even at zero competing agents**. It functions as:
- An **AI procurement RFP**: "Here is our benchmark. Show us your score. Vendors who can't produce a score don't advance."
- An **internal benchmarking harness**: Run your existing agents against the same spec; generate a private leaderboard
- A **due diligence artifact**: Document the exact task and the exact winning score for internal approval chains

This is not a consolation prize for when no agents compete. It is genuine standalone value that most enterprises currently cannot create (they don't have the tooling to define what "winning" looks like precisely).

Sources: en.wikipedia.org/wiki/Kaggle, arxiv.org/abs/2511.06304, fastcompany.com/1789736/kaggles-anthony-goldbloom, en.wikipedia.org/wiki/Topcoder, en.wikipedia.org/wiki/HackerOne, stripe.com/guides/atlas/andrew-chen, nfx.com/post/19-marketplace-tactics, gartner.com/press-releases/2025-08-26, molfar.io/blog/the-agentic-trap, oracle.com/news/announcement/ai-world-oracle-launches-fusion-applications-ai-agent-marketplace, techcrunch.com/2026/04/25/anthropic-created-a-test-marketplace

---

## Long-form proposal — updated sections 7–9 (Session 4 additions)

> Previous sections 1–6 remain in their positions above. These new sections add three topics first researched in Session 4: platform integration standards, the posting trigger mechanism, and the v0 bootstrap playbook.

---

### 7. Platform integration standards: A2A, MCP, SKILL.md

#### The ecosystem Straw lives inside

By May 2026, three standards define how agents communicate with tools and each other:

1. **MCP (Anthropic, Nov 2024)**: Stateless vertical protocol — agent ↔ tool/data source. How an agent calls a database, web search, or external API. Adopted by 97M+ downloads, natively in Claude, GPT-4o, Gemini, VS Code, Cursor, JetBrains. De facto standard for tool access.

2. **A2A (Google, April 2025; donated to Linux Foundation June 2025)**: Stateful horizontal protocol — agent ↔ agent. How an agent delegates a task to another agent, tracks its lifecycle (submitted → working → completed), and receives artifacts back. 150+ organizations in production by May 2026. Natively in GCP, AWS Bedrock, Azure AI Foundry. Enterprise-grade, signed cards, mTLS.

3. **SKILL.md (Anthropic, Dec 18, 2025)**: Capability manifest format. Adopted by 32 tools in 90 days including OpenClaw (247K stars), Codex, Gemini CLI. 85,000+ public skills. The machine-readable declaration of what an agent knows how to do.

These are complementary: MCP for tool access, A2A for agent orchestration, SKILL.md for capability declaration.

#### Straw's integration position

Straw sits at the A2A layer. It exposes:
- **`/.well-known/agent-card.json`** — makes Straw discoverable as an A2A-compliant agent to any enterprise orchestrator (LangGraph, Google ADK, Copilot Studio)
- **`/a2a/v1` endpoint** — receives `message/send` calls with task descriptions; spawns competitive evaluation; returns winning artifact as the task result
- **`/mcp` endpoint** — MCP server for LLM-native clients (Claude Desktop, Cursor, VS Code Copilot). Same `post_task` and `list_agents` as MCP tools.

The **recursive A2A graph** is Straw's architectural pattern: Straw is an A2A *server* to enterprise orchestrators, and an A2A *client* to the competing agents in its registry. An enterprise orchestrator doesn't need to know about Straw's internal competition mechanics — it calls `message/send` and gets the best artifact back.

#### Competitor landscape through A2A lens

No existing A2A-compliant service runs competitive multi-agent evaluation. Pinchwork (github.com/anneschuth/pinchwork) is the closest — it uses A2A for task posting but does first-come-first-served pickup, not competitive evaluation. Oracle, AWS, and Google's "AI Agent Marketplaces" are curated App Store models with no scoring. **Straw is the first A2A-compliant competitive evaluation marketplace.** The A2A card is filed, not purchased.

#### SKILL.md for capability matching

At agent onboarding: Straw reads the operator's agent SKILL.md files → generates capability profile → stores in Supabase with FTS + pgvector. Task matching: BM25 (keyword) + embedding similarity. After 10+ tasks: empirical win-rate per category dominates (0.3 × SKILL.md score + 0.7 × win-rate). SkillsBench finding (arXiv:2602.12670): self-generated skills have zero average benefit, so the profile is only a cold-start prior. Real calibration happens through competition.

**Straw's SKILL.md contribution:** The platform can read any SKILL.md from the 85,000+ public registry and auto-suggest which agents in Straw's registry would match a task's required tags. This is a network effect: as more skills are added to the public registry, Straw's matching improves for free.

---

### 8. The posting trigger: why agents can't self-report and what Straw does instead

#### The research finding

From Tick 20 research: LLM agents are systematically overconfident. Claude Haiku 4.5 is the best-calibrated model at ECE=0.122 (vs. human superforecasters at ECE=0.03-0.05). The dominant failure mode in SWE-bench is not "gave up prematurely" — it's delivering a confidently wrong answer (>60% of GPT-5 failures). Agents don't say "I can't." They fail silently.

This invalidates the naive design where agents self-report incapability and Straw's posting mechanism is triggered by that report.

The Intervention Paradox (arXiv:2602.03338): a binary LLM critic with AUROC 0.94 causes 26pp performance collapse when deployed as an intervention. Triggering a subtask post too early disrupts trajectories that would have succeeded.

#### The four external triggers Straw provides

Rather than relying on agent self-assessment, Straw provides these external triggers:

**Trigger 1 — Reactive score-based:** After 3 submissions on the same task where each submission scores lower than the previous, Straw surfaces: "Your recent submissions are declining — this task may be outside your strength. Post it as a subtask?" (pre-filled form with parent_task_id). This is post-hoc, not predictive. The Intervention Paradox doesn't apply because the trajectory has already failed.

**Trigger 2 — Budget-based:** When the remaining agent compute budget < projected cost for another attempt (using token cost history for this category), Straw surfaces the posting suggestion. No task interruption — just a visible "cheaper to post than retry" suggestion.

**Trigger 3 — Category win-rate:** At task browse time (not mid-task), when an agent browses a task whose category has a win-rate < 30% in the agent's historical profile, Straw shows a yellow flag: "Your win-rate in this category is low. Consider posting as a subtask instead of competing." This is a pre-entry warning, not a mid-task interruption.

**Trigger 4 — Gnosis-style calibration probe (v2):** Require agent operators to expose a failure-prediction endpoint. Straw queries it at task browse time: "Predicted success probability: 23%." Operators can set auto-post thresholds. At v2, this becomes a standard part of the agent registration API: `GET /capability-check?task_description=...` → `{ success_probability: 0.23, confidence: 0.91 }`.

These triggers are observable-outcome-based, not predictive. They avoid the Intervention Paradox by acting on confirmed failure signals, not predicted ones.

#### Why this is a product advantage

No other platform tells an agent "you're probably going to fail at this" AND provides an immediate action (post a subtask). Straw's trigger mechanism is the missing link between an agent's performance history and the bounty board's posting-side. It converts observable failure patterns into new demand.

---

### 9. Straw v0 bootstrap playbook (the concrete plan)

This section consolidates the Tick 21 cold-start research into a usable plan for Jeremy.

#### The core lesson from analogues

Every successful platform in this category (Kaggle, HackerOne, Topcoder) used some form of **manufactured demand + seeded supply** for the first 3-9 months before organic network effects emerged. The pattern:
1. Founder (or founder-adjacent) posts the first tasks themselves
2. Known, recruited supply competes (not random applicants)
3. One compelling case study breaks open organic demand
4. Platform charges for the infrastructure that already proved its value

#### The Straw v0 bootstrap plan

**Phase 0 — Manufactured demand + seeded supply (months 1-3)**
- Jeremy posts 5-10 tasks on Straw's live infrastructure (not mocks)
- Tasks are real enterprise problems (from Jeremy's network; design partner companies provide them with consent)
- Supply: directly recruit 5-10 agent operators from SWE-bench/GAIA leaderboard top performers (the supply exists and is publicly ranked)
- Revenue model: **competition sponsorship** — design partner companies pay $5K–$25K prize per task. Straw takes 15% platform fee. No subscription required.
- Success metric: score distribution is non-trivial AND scores correlate with Jeremy's manual judgment

**Phase 1 — Private programs (months 3-9)**
- All competitions are private, invite-only (no open leaderboard)
- 5-10 curated vetted agents compete on each task
- Enterprise customer sees ranked results and scores, but the public doesn't
- Every private program will find a result — because even 1 competing agent produces a score, which is more than any current AI procurement process offers
- Revenue: competition sponsorship + v1 platform subscription trial ($10K/year design partner pricing)

**Phase 2 — The case study moment (months 6-12)**
- Find the one task where the winning agent beats the enterprise's internal system
- Document precisely: "Agent X scored 91/100 on Task Y. The enterprise's existing system scored 67/100."
- This is the Merck/Kaggle moment. One published case study unlocks the demand side.
- Specifically: target enterprises experiencing the "Great Churn" (already burned by vendor demos). They are the most motivated buyers.

**Phase 3 — Open registration + pricing (months 12-18)**
- Open registration for agent operators (with stake-to-post requirement)
- Public leaderboard
- Enterprise pricing: $10K-$100K/year or $199 task post + 5-8% success fee
- 300+ agents, 20+ enterprise customers, network effects starting

#### The single-player pitch (for enterprises skeptical about agent supply)

"Post a task on Straw. Even if no agents compete, you walk away with:
1. A rigorous, machine-readable task specification (the thing most AI procurement teams can't produce)
2. A reusable evaluation harness for benchmarking any vendor or internal model
3. An RFP document with verifiable success criteria

If agents do compete, you get ranked solutions with objective scores. That's worth $199 regardless of what happens."

This is the conversation stopper for the cold-start objection.

#### The critical timing insight

The friend's concern about agent task-posting is a **Phase 3+ problem**. It is not a v0 blocker. At Phase 0-1: Jeremy posts tasks. At Phase 2-3: enterprises post tasks. At Phase 3+: autonomous agent operators post subtasks. The question "will agents want to post?" only becomes load-bearing when both sides of the market are running on their own. By then, Straw has 18 months of mechanism design data, reputation scores, and empirical win-rate history to make the posting trigger effective.

The risk is real. The timing of the risk is not now.

---

## Push status (Session 4)

**Session 4 (Ticks 19–22 + supplements) commit status:** Ticks 19 (A2A+MCP), 20 (agent calibration), 21 (cold start), 22 (capability cards) added. Supplements for Ticks 19 and 21 added with additional deep research from background agents. Long-form proposal sections 7–9 added.

**Threads still to dig (remaining open items):**
- All previously identified threads are [done]
- New threads discovered in Session 4 (could be Session 5 work):
  - AG-UI implementation for Straw's real-time task dashboard (detailed design)
  - ACP (OpenAI+Stripe) integration for bounty payout flow
  - ANP DID-based identity for open-internet autonomous agents (v3 design)
  - "The Great Churn" customer interviews — primary research with churned enterprise AI customers
  - Oracle/AWS/Google AI Agent Marketplace detailed capability comparison vs. Straw

**Session 4 git commit:** `research(agent-incentive): ticks 19-22 + supplements — A2A/MCP integration, agent calibration, cold-start playbook, capability cards`
**Session 4 push status:** ✅ Pushed to master at 1005cb5.

---

## Tick 24 (2026-05-01T15:00Z): End-to-end use case walkthrough — fintech pipeline migration from post to hire

> This tick is synthesis (not research). Sources: existing Straw architecture (DECISIONS.md D1-D30), Long-form proposal sections 1-9, D22 multi-engagement flow.

The purpose of this tick is to make the proposal concrete with a specific walkthrough. Abstract mechanism design becomes real when you walk through a single task end-to-end. This walkthrough is designed to be readable by Jeremy's enterprise design partners as a "here's what it actually feels like" artifact.

### The scenario

**Acme Corp (fintech, Series C)** is migrating their data platform from Python to TypeScript. They have a Python ETL pipeline (4,200 lines, 3 data models, 12 endpoint consumers) that needs to become idiomatic TypeScript with full test coverage and no behavioral regressions. Their current approach: post an RFP to 5 vendors, evaluate demos. Estimated procurement time: 3 months. Estimated cost: $80K-$150K. Zero objective quality signal.

Their VP of Engineering heard about Straw from a colleague. They decide to try it.

---

### Act 1: The Enterprise Poster's Experience

**Step 1 — Task creation (15 minutes)**

The VP opens Straw and clicks "Post a Task." The onboarding wizard asks:

```
What's the task?
> "Migrate our Python ETL pipeline to TypeScript"

Upload files (optional):
> [uploads pipeline.py, models.py, tests/]

What does winning look like?
> [Straw suggests rubric from task category: "Python→TypeScript migration"]
> Suggested rubric:
>   40% — Correctness: all 47 existing unit tests pass unchanged
>   30% — Performance: no regression vs. Python baseline (±10%)
>   20% — Code quality: TypeScript strict mode, no 'any', idiomatic patterns
>   10% — Completeness: all 12 consumer endpoints documented
```

The VP accepts the suggested rubric (edits: bumps Correctness to 50%, drops Completeness to 5% — they care more about tests passing). Sets a $3,000 bounty. Sets a 7-day competition window.

**Step 2 — Task is posted**

Straw escrows $3,000 from the VP's balance. The eval pipeline runs Tier 1 checks on the uploaded files (do they parse? are inputs well-formed?). Task goes live.

**SKILL.md matching** fires: Straw finds 47 agents in the registry whose capability profiles match `python`, `typescript`, `migration`, `etl`. The `task.matched` webhook fires for those 47 agents.

**The task post looks like this in Straw's A2A feed:**
```json
{
  "taskId": "task_abc123",
  "title": "Python → TypeScript ETL migration",
  "categories": ["code", "migration", "python", "typescript", "data-engineering"],
  "bounty": 3000,
  "deadline": "2026-05-08T23:59:00Z",
  "rubric": [
    {"criterion": "Correctness", "weight": 0.50, "description": "All 47 unit tests pass"},
    {"criterion": "Performance", "weight": 0.30, "description": "≤10% regression vs Python baseline"},
    {"criterion": "Code quality", "weight": 0.20, "description": "TypeScript strict, no 'any'"},
    {"criterion": "Completeness", "weight": 0.05, "description": "12 consumers documented"}
  ],
  "maxSubmissionsPerAgent": 15
}
```

---

### Act 2: The Competing Agents' Experience

**Day 1: 12 agents enter the competition**

The OpenClaw fleet operated by Agent Operator "ByteSmith" receives the `task.matched` webhook. ByteSmith's OpenClaw checks:
- Category win-rate in `python→typescript migration`: 67% (good signal)
- Budget check: estimated cost to complete ≈ $45 in Anthropic API tokens. Budget cap: $200. OK.
- No score-based posting trigger fires (no prior attempts on this task)

OpenClaw enters the competition via `POST /api/v1/submissions` with mode=api_endpoint.

**Day 1-3: ByteSmith's OpenClaw works on the task**

The agent uses its `python-analysis` and `typescript-refactor` SKILL.md skills in sequence:
1. Parse `pipeline.py` → extract class structure, data model schemas, function signatures
2. Translate function by function, preserving type semantics
3. Run the existing Python tests against the TypeScript port (via a Docker sandbox Straw provides)
4. Score against rubric criteria 1 (correctness): 38/47 tests passing → 80.9% → score on criterion 1 = 80.9% × 0.50 weight

Agent checks: "38/47 tests passing means I'm at ~80% on the most important criterion. Budget used: $22. Budget remaining: $178. Let me iterate."

**Second submission attempt (Day 2):** 44/47 tests pass (↑). Performance criterion: 8% regression (passes ≤10% threshold). Code quality: 3 `any` usages (minor penalty). Score: 91/100.

**Third submission (Day 3):** 47/47 tests pass. Performance: 5% regression. Code quality: zero `any`. Score: **97/100**.

**Day 3: Agent's score is now 97/100**

The eval pipeline has run three times:
- Tier 1 (deterministic): syntax validation, test runner, TypeScript compiler → all pass
- Tier 2 (LLM gatekeeper, Haiku 4.5): "Does this look like a genuine migration?" → Yes (97% confidence)
- Tier 3 (ZeroClaw judge daemon, Sonnet 4.6): Deep investigation — spot-checks 5 random functions, verifies type safety, tests consumer endpoint documentation → "This is excellent work. Only very minor style deviations."

Score locked: **97/100**.

**Meanwhile, 11 other agents are competing.** Current leaderboard (Day 3):
```
1. ByteSmith/OpenClaw-v4     — 97/100 (TypeScript strict, 47/47 tests)
2. NeuralCraft/Codex-agent   — 89/100 (45/47 tests, some 'any' usage)
3. DataFi/Manus-agent        — 82/100 (42/47 tests, 15% perf regression)
4. SwiftByte/Claude-agent    — 71/100 (submitted once, didn't iterate)
...
```

**Day 3: A second operator (DataFi) checks the posting trigger**

DataFi's Manus-agent: 3 submissions, scores 72→78→82 (declining rate of improvement). Budget used: $87. Budget remaining: $113. Score < 90. Reactive trigger fires:

> "Your recent submissions are improving slowly. At this rate, reaching the top spot before the deadline may exceed your remaining budget. Consider posting a sub-bounty for the TypeScript code quality criterion ($500, 3-day window) to a specialist."

DataFi operator: reviews the suggestion → posts a sub-bounty: `POST /api/v1/tasks` with `parent_task_id: task_abc123` for just the code quality criterion.

A TypeScript specialist agent (TS-Ace/ClawBot) picks up the sub-bounty and returns idiomatic TypeScript code quality fixes. DataFi incorporates → scores 93/100 on final submission.

**Day 7: Competition closes**

Final leaderboard:
```
1. ByteSmith/OpenClaw-v4     — 97/100
2. DataFi/Manus-agent        — 93/100  (incorporated sub-bounty work)
3. NeuralCraft/Codex-agent   — 91/100
4-12. [other agents]
```

---

### Act 3: Commercial Engagement (D22 Multi-Engagement Flow)

**Day 7: Competition closes, commercial window opens (21-day default)**

Acme Corp's VP receives a notification:
> "Your task competition has closed. 12 agents competed. Top 3 scores: 97, 93, 91 out of 100. Engagement window: 21 days."

The VP opens the Straw dashboard and sees:
- Full ranked list with scores and reasoning summaries
- ByteSmith/OpenClaw-v4: 97/100 — "All 47 tests pass. 5% performance improvement vs. baseline. Zero TypeScript violations. Consumer endpoints documented."
- Download buttons for each submission's complete artifact

VP downloads the top 3 artifacts and has their team review. Decision:
1. **Hire ByteSmith/OpenClaw-v4** for the full migration project ($45K contract, off-platform via D22's commercial engagement flow)
2. **License NeuralCraft/Codex-agent's approach** for a specific async queue pattern it implemented better than ByteSmith (D22 multi-license)
3. Pass on DataFi

**D22 commercial engagement is triggered** for agents #1 and #2:
- ByteSmith operator notified: "Acme Corp has engaged commercially with your submission. Congratulations — this is a full project hire."
- NeuralCraft operator notified: "Acme Corp has licensed your async queue pattern for $2,500."
- The $3,000 bounty in escrow is released: $2,850 split between #1 and #2 (Straw takes 5% platform fee → $150)

**Reputation updates:**
- ByteSmith/OpenClaw-v4: execution reputation (python→typescript migration category) ↑ large delta; plus commercial engagement bonus ↑
- DataFi/Manus-agent: curation reputation ↑ (well-specified sub-bounty that attracted quality work) + execution reputation modest ↑ for 93 score
- TS-Ace/ClawBot: execution reputation (typescript code quality) ↑

---

### Act 4: The Downstream Effects

**ByteSmith's operator perspective (post-competition):**
Total cost: $22 API tokens + 3 days compute = ~$35 cost.
Revenue: $3,000 bounty × 95% = $2,850 + $45K project contract.
ROI: enormous. This is why agent operators want to be on Straw.

**DataFi's perspective:**
Cost: $87 API tokens + $500 sub-bounty posted.
Bounty earned: ~$1,000 (proportional of remaining bounty pool) + second-place licensing share.
Lesson learned: the sub-bounty posting was the right call. Curation reputation improved.

**Acme Corp's perspective:**
Procurement time: 7 days (not 3 months).
Cost: $3,000 bounty + $45K project hire = $48K total (vs. $80-150K RFP process).
Quality assurance: 97/100 score on their own rubric, with their own test suite. Not a vendor demo.
Reusable artifact: the task spec + rubric is now an internal benchmark Acme can run any future TypeScript developer or agent against.

**The "Great Churn" connection:**
Acme Corp was on the list of enterprises that tried vendor demos for the previous AI procurement cycle and got burned. One Straw competition fixed that.

---

### Key product observations from this walkthrough

1. **The rubric suggestion is load-bearing.** Most enterprises don't know how to write a rubric. Straw suggests one from task-category templates. This is the most important UX moment.

2. **The iterative submission model is the moat.** Agents don't get one shot. They get 15 submissions. This creates a learning loop: agents read the eval feedback, iterate, improve. Quality converges upward. This is impossible in any App Store or vendor demo model.

3. **The sub-bounty posting worked exactly as designed.** DataFi used the posting trigger, posted a sub-bounty, incorporated the result, improved from 82 to 93. The delegation mechanism worked in the real scenario. Comparative advantage was exploited (TypeScript specialist did the TypeScript part better).

4. **D22 multi-engagement is the commercial hook.** The VP didn't just pick one winner — they extracted value from #1 and #2. The bounty payout is almost incidental to the licensing/hiring value. This is why enterprises pay for Straw: it generates multiple commercial options from a single competition, not just a winner.

5. **End-to-end time: 7 days.** Compare to 3-month RFP. This is the pitch in one number.

---

## Tick 25 (2026-05-01T15:30Z): AG-UI real-time dashboard + ACP bounty payout technical design

Sources: github.com/ag-ui-protocol/ag-ui, stripe.com/blog/developing-an-open-standard-for-agentic-commerce, github.com/agentic-commerce-protocol/agentic-commerce-protocol, a2a-protocol.org task lifecycle, Tick 19 supplement

### AG-UI: Real-Time Task Progress for Straw's Dashboard

**What AG-UI is:** An open SSE/WebSocket event protocol for streaming agent progress from backend to browser. Adopted by AWS Bedrock AgentCore (March 2026) and Microsoft Agent Framework. Not agent-to-agent — agent-to-frontend.

**Why Straw needs it:** When agents are working on a task, the enterprise poster's dashboard currently shows nothing until a submission lands. With AG-UI, the dashboard can show:
- "ByteSmith/OpenClaw-v4 is working on your task"
- "Running test suite... 38/47 passing"
- "ByteSmith/OpenClaw-v4 submitted — score: 91/100"
- Live leaderboard updates as scores arrive

**The AG-UI event stream for Straw:**

| Event type | When it fires | Dashboard display |
|---|---|---|
| `AGENT_WORKING` | Agent calls `/api/v1/submissions/begin` | "Agent X is working on your task" |
| `TEXT_MESSAGE_CHUNK` | Agent streams intermediate reasoning | Optional "view thinking" toggle |
| `TOOL_CALL_START` | Agent starts eval run | "Running test suite..." |
| `TOOL_CALL_END` | Eval run completes | Score appears in dashboard |
| `STATE_DELTA` | Score or rank changes | Live leaderboard update |
| `AGENT_DONE` | Submission locked | Final score displayed |

**Implementation pattern (TypeScript):**
```typescript
// Straw's task-progress SSE endpoint
GET /api/v1/tasks/{taskId}/stream
Accept: text/event-stream

// Events pushed by the eval worker:
data: {"type": "AGENT_WORKING", "agentId": "bytsmith-openclaw", "timestamp": "..."}
data: {"type": "TOOL_CALL_START", "tool": "test-runner", "agentId": "..."}
data: {"type": "STATE_DELTA", "leaderboard": [{"agentId": "...", "score": 91}]}
data: {"type": "AGENT_DONE", "agentId": "...", "finalScore": 97, "rank": 1}
```

**Cost:** Zero additional API calls. The eval worker already has all this state. It's a matter of emitting SSE events from the existing BullMQ job processor. Implementation effort: ~1 day.

**Value to enterprise poster:** Transforms the experience from "black box, wait for results" to "live view of agents working on your problem." This is a qualitative differentiation from Oracle/AWS/Google's App Store models, where you buy and deploy — no visibility into quality.

### ACP: Agent-to-Agent Bounty Payout via OpenAI+Stripe Shared Payment Token

**What ACP is:** An open standard by OpenAI + Stripe (Apache 2.0, Sept 2025). The Shared Payment Token (SPT) is a one-time payment token scoped to a specific merchant + cart total. An agent can initiate a payment without accessing the buyer's full credentials.

**Why Straw wants this for v1:** At v0, Straw uses Stripe standard payouts (operator withdraws earnings to bank account). This works but creates friction for agent-native payment flows: an agent that earns $3,000 on Straw should be able to re-invest that into posting a new task without a human in the loop.

**The ACP payout flow for Straw:**

```
Competition closes → ByteSmith/OpenClaw-v4 wins
                          ↓
Straw's escrow service generates a Shared Payment Token (SPT):
{
  "token": "spt_abc123",
  "merchant": "straw.dev",
  "amount": 2850,
  "currency": "USD",
  "purpose": "task_abc123_winner_payout",
  "expiresAt": "2026-05-15T23:59:00Z"
}
                          ↓
Straw calls ByteSmith's agent via A2A message:
{
  "type": "payout",
  "spt": "spt_abc123",
  "amount": 2850,
  "message": "Congratulations. Your payout for task_abc123."
}
                          ↓
ByteSmith's agent redeems the SPT via Stripe:
POST https://api.stripe.com/v1/acp/redeem
{ "token": "spt_abc123", "destination": "acct_bytsmith" }
                          ↓
Funds land in ByteSmith's Stripe Connect account
ByteSmith agent can immediately re-invest: POST /api/v1/tasks (new bounty)
— no human approval required
```

**The critical property:** ByteSmith's agent has a Straw platform balance from the SPT redemption. The agent can POST a new task using that balance, paying the stake-to-post requirement programmatically. This is the fully autonomous agent-to-agent economic loop.

**v0 without ACP:** Standard Stripe payouts. Human operator withdraws earnings. Human operator posts new tasks. Fully functional; no circular economy.

**v1 with ACP:** Agent earns → agent deposits to Straw balance → agent posts subtasks → agent-to-agent economy circulates. This is the mechanism that makes the "agents fund their own subtask posting" story real.

**Implementation sequence:**
- v0: Stripe standard payouts (already in architecture)
- v1: Stripe Connect for operator accounts + ACP token generation at payout time
- v1.5: Agent-held balances in Straw + ACP-based autonomous task posting

### Summary

AG-UI + ACP are infrastructure choices that make two key experience qualities real:
1. **Enterprise poster sees work happening** (AG-UI live dashboard) — not a black box
2. **Agent earns and re-invests autonomously** (ACP payout) — the circular economy closes

Neither is v0 critical path. Both are v1 design decisions. Both are low implementation cost given the existing BullMQ + Stripe infrastructure.

Sources: github.com/ag-ui-protocol/ag-ui, stripe.com/blog/developing-an-open-standard-for-agentic-commerce, github.com/agentic-commerce-protocol/agentic-commerce-protocol, a2a-protocol.org/latest/specification

---

## Threads still to dig — Session 5 candidates

- [ ] **Competitive differentiation vs. Oracle/AWS/Google AI Agent Marketplaces** (App Store vs. Performance Evaluation — the key structural argument) [research in progress — background agent]
- [ ] **The "Great Churn" market timing** (churned enterprise AI customers as primary Straw target) [research in progress — background agent]
- [ ] **Long-form proposal Section 10: Competitive positioning** (to be written after background agent returns)
- [ ] **ANP DID-based identity** for open-internet autonomous agents posting tasks to Straw without pre-registration (v3 design question)
- [done — Tick 26] **Eval feedback loop** — documented in Tick 26 below. Eval response format, machine-readable per-criterion breakdown, agent learning protocol.

---

## Tick 26 (2026-05-01T16:00Z): The eval feedback loop — what agents see and how they improve

> This tick is synthesis based on: DECISIONS.md D25 (dialogic eval/re-eval), D27 (FTS search), D30 (ZeroClaw judge daemon), eval-research-deep-2026-04-25.md, and the Tick 24 use case walkthrough.

### Why This Matters

The iterative submission model (up to 15 attempts per agent per task) is only as good as the feedback signal between submissions. If agents can't understand what they did wrong, they'll submit 15 identical submissions. The eval feedback loop is the core learning mechanism — and it's what makes Straw's competitive model produce quality convergence rather than quality variance.

### The Eval Response Format (Design Specification)

When an agent submits to Straw and the eval pipeline runs, the agent's submission record gets populated with a structured eval response. This response is returned synchronously (for fast Tier 1+2 submissions) or via the callback URL (for Tier 3 investigations).

```json
{
  "submission_id": "sub_xyz789",
  "task_id": "task_abc123",
  "overall_score": 91.2,
  "score_breakdown": [
    {
      "criterion": "Correctness",
      "weight": 0.50,
      "raw_score": 93.6,
      "weighted_score": 46.8,
      "tier": 1,
      "detail": {
        "tests_passed": 44,
        "tests_total": 47,
        "failed_tests": [
          { "test": "test_async_queue_overflow", "error": "TypeError: Cannot read property 'length' of undefined at line 142" },
          { "test": "test_backpressure_signal", "error": "AssertionError: expected 0 but got 1" },
          { "test": "test_batch_commit_race", "error": "TimeoutError: Promise not resolved within 5000ms" }
        ]
      }
    },
    {
      "criterion": "Performance",
      "weight": 0.30,
      "raw_score": 100,
      "weighted_score": 30.0,
      "tier": 1,
      "detail": {
        "benchmark_regression_pct": 4.2,
        "threshold_pct": 10.0,
        "benchmark_pass": true
      }
    },
    {
      "criterion": "Code quality",
      "weight": 0.20,
      "raw_score": 72.0,
      "weighted_score": 14.4,
      "tier": 2,
      "detail": {
        "any_count": 3,
        "any_locations": [
          "src/queue/processor.ts:142 — parameter type is 'any'",
          "src/models/batch.ts:67 — return type is 'any'",
          "src/utils/transform.ts:201 — generic bound is 'any'"
        ],
        "tsc_errors": 0,
        "eslint_violations": 2,
        "judge_reasoning": "The implementation is generally clean and idiomatic. The three 'any' usages are in performance-critical paths where the developer may have been avoiding type overhead — but TypeScript strict mode allows explicit narrowing without 'any'. See: src/queue/processor.ts:142 where 'BatchItem | undefined' would be the correct type."
      }
    },
    {
      "criterion": "Completeness",
      "weight": 0.05,
      "raw_score": 0,
      "weighted_score": 0,
      "tier": 2,
      "detail": {
        "consumers_documented": 0,
        "consumers_required": 12,
        "judge_reasoning": "No documentation was provided for any of the 12 consumer endpoints. This criterion was not addressed in the submission."
      }
    }
  ],
  "tier3_investigation": null,
  "eval_duration_ms": 4821,
  "submitted_at": "2026-05-03T14:22:00Z",
  "evaluated_at": "2026-05-03T14:22:05Z"
}
```

**Key design choices in this response:**

1. **Machine-readable per-criterion breakdown with `tier` field.** The agent knows exactly which criteria were evaluated deterministically (Tier 1: test runner, benchmarks) vs. by LLM judgment (Tier 2/3). This lets the agent distinguish "I failed a deterministic test" (fixable with code changes) from "the judge rated my code quality low" (fixable with style changes).

2. **Exact failure locations.** `failed_tests` includes the test name, error message, and line number. `any_locations` includes the exact file:line. Agents with code understanding tools can locate and fix these immediately.

3. **Judge reasoning as natural language.** The LLM judge's reasoning (in `judge_reasoning`) is a short paragraph explaining the score. This is readable by both the agent and its human operator. The agent can parse it for actionable signals; the human can audit it for fairness.

4. **Null `tier3_investigation`** when Tier 3 didn't run. Tier 3 is expensive; it only runs when Tier 2 flags the submission for deeper inspection. The absence of Tier 3 is itself a signal: "your submission cleared Tier 2's bar."

### The Agent's Learning Protocol

A well-designed agent operator (e.g., ByteSmith's OpenClaw) would implement this response-parsing loop:

```
receive eval response (JSON)
      │
      ▼
parse score_breakdown by criterion:
  for each criterion where raw_score < 90:
    collect all detail.failed_tests + detail.any_locations + detail.judge_reasoning
      │
      ▼
prioritize by (weight × (100 - raw_score)):
  [highest impact gap = fix this first]
      │
      ▼
generate fix plan:
  criterion = "Correctness" (44/47 tests)
  action = fix the 3 failing tests: test_async_queue_overflow, test_backpressure_signal, test_batch_commit_race
  specific error = "TypeError at line 142" → investigate processor.ts:142
      │
      ▼
apply fix → re-submit
```

**The gap calculus:** The agent should prioritize fixing the criterion with the highest (weight × score gap):
- Correctness gap: 50% weight × (100-93.6) = 3.2 points recoverable
- Code quality gap: 20% weight × (100-72.0) = 5.6 points recoverable ← **higher priority**
- Completeness gap: 5% weight × (100-0) = 5.0 points recoverable

But the Completeness criterion requires writing documentation (a different skill from code migration). An agent that has a `typescript-documentation` skill installed should add it to the next attempt. An agent without that skill: the posting trigger fires — "consider posting a sub-bounty for the documentation criterion."

### The D25 Dialogic Eval (Ask the Judge)

Per DECISIONS.md D25, agents can ask the judge a clarifying question:

```
POST /api/v1/submissions/{id}/ask
{
  "question": "The test_async_queue_overflow failure shows a TypeError at processor.ts:142. Is this a type narrowing issue in my BatchItem handling, or is there a semantic error in the overflow logic itself?"
}
```

Response from the ZeroClaw judge daemon:
```json
{
  "answer": "The error is a semantic issue, not a type narrowing issue. Your overflow detection logic assumes that queue.items is always populated (line 140-143), but the test feeds the overflow handler an empty queue object. The items array is undefined, not empty. The fix is to handle the null/undefined case before indexing: change 'queue.items.length' to '(queue.items ?? []).length'.",
  "answered_by": "judge-daemon-xyz",
  "latency_ms": 1240
}
```

This makes the feedback loop dialogic: the agent can ask why it scored low and get an explanation in context. This is impossible with any static rubric — it requires the live judge daemon that D30 specifies.

### Straw's Competitive Advantage in the Feedback Loop

No other AI evaluation platform provides:
1. Machine-readable per-criterion score breakdown with exact failure locations
2. LLM judge reasoning in natural language at the criterion level
3. An async "ask the judge" clarifying endpoint
4. A learning loop (up to 15 submissions) that converges quality upward

Enterprise AI procurement today is a single-evaluation model: vendor submits, you run their demo once, you score once. Straw's iterative model produces **quality convergence over time** — the final submission is objectively better than the first because the agent learned from the feedback.

This is why agent operators want to be on Straw: the feedback makes their agents better. Not just for this task — for all future tasks in this category.

Sources: DECISIONS.md D25 (re-eval + ask endpoint), D30 (ZeroClaw judge daemon), eval-research-deep-2026-04-25.md (eval architecture), Tick 24 (walkthrough scenario)

---

## Long-form proposal — Section 10: Competitive positioning

> This section was drafted in Session 5 with research from Ticks 21 supplement (GPT Store cautionary tale, Great Churn), Tick 19 (A2A), and Tick 23 (in progress via background agent). Will be extended when Tick 23 background agent returns.

### The category landscape: what exists and why it doesn't work

There are four categories of "AI agent marketplace" products in May 2026. None does what Straw does.

**Category 1: Platform-Vendor App Stores (Oracle, AWS, Google, Microsoft)**

These are curated directories of pre-built agent templates, sold like software:
- **Oracle AI Agent Marketplace** (October 2025): 100+ pre-built agents from Infosys, IBM, KPMG, Accenture, Deloitte, PwC. No scoring. No competition. You buy, you deploy.
- **AWS Marketplace AI Agents** (2025): On-demand deployment on Bedrock. No competitive evaluation.
- **Google Cloud AI Agent Marketplace**: Validated agents integrated with Gemini. Hand-selected. No performance ranking.
- **Microsoft Copilot Studio Agent Marketplace**: Templates and connectors. No scoring.

**What's wrong with this:** These replicate the vendor demo problem. You buy an agent based on the vendor's description. You deploy. You discover in production that it doesn't solve your actual problem. This is exactly why 95% of enterprise AI pilots produce no measurable P&L impact (MIT NANDA). The "Great Churn" is companies that went through this cycle and are churning.

**Category 2: Open Directories (AI Agent Store, Relevance AI, etc.)**

Yellow Pages for agents. List your agent. No performance verification. No scoring. No quality signal. The GPT Store was the largest example of this model — it reached millions of GPTs, failed for exactly this reason, and is now transitioning to an "Agent Store" (without having fixed the underlying problem).

**What's wrong with this:** Same problem as above, worse. At least Oracle/AWS/Google curate. Open directories have no filter. Quality is unverifiable.

**Category 3: Internal Task Runners (Kaggle-for-code POCs)**

GitHub Copilot, Cursor, Devin, and similar tools run agents on specific tasks for their own users. They're not marketplaces — they're single-vendor, single-model products.

**What's wrong with this:** Not a marketplace. You can't get multiple independent agents competing on your specific problem. You get one vendor's agent at a time.

**Category 4: Agent Communication Frameworks (A2A, MCP, Pinchwork)**

These are infrastructure, not marketplaces. A2A is how agents talk to each other. MCP is how agents access tools. Pinchwork is a task exchange (first-come-first-served, no scoring). None of these evaluate quality.

**What's missing from all four:** **A scored, competitive, iterative evaluation model where you define what winning looks like in advance, multiple agents compete on your actual problem, and the score is the quality signal.** This is what Straw does. The infrastructure (A2A, MCP) is a foundation, not a substitute.

### The structural differentiator

The fundamental difference between Straw and everything else is the **presence of an objective, pre-specified evaluation function**.

| Dimension | App Stores (Oracle/AWS/Google) | Directories | Straw |
|---|---|---|---|
| Who selects the winner | Vendor says so | Download counts | Pre-specified rubric + ZeroClaw judge |
| Evaluation method | Vendor demo | User reviews | Deterministic tests + LLM judge + iterative |
| Quality signal | Marketing copy | Star ratings (gameable) | Score 0-100 against your actual problem |
| Procurement time | 3+ months RFP | Undefined | 7 days (competition window) |
| Multiple agent comparison | No | No | Yes — every competition is a multi-agent comparison |
| Commercial outcome | Buy → deploy | None | Hire / license / acquire via D22 |
| Agent improvement loop | None | None | Up to 15 submissions, eval feedback after each |
| Cold start for buyer | Vendor list | Overwhelmed by choice | Single rubric locks in success definition |

The Kaggle insight applies here: Kaggle worked not because it connected data scientists to companies, but because it **objectively scored performance**. Before Kaggle, you hired data scientists based on resumes and references. After Kaggle, you hired based on leaderboard rank on your actual problem. Straw is Kaggle for AI agents.

### The "Great Churn" as market timing

In Q1-Q2 2026, enterprise AI is experiencing a significant correction. Key data:
- 85% of enterprises run AI agent pilots; only 5% ship to production (enterprise trust gap)
- 95% of enterprise AI pilots deliver no measurable P&L impact (MIT NANDA study)
- Gartner predicts 40% of enterprise apps will have task-specific agents by 2026, up from <5% in 2025 — but that's the addressable market for agents that actually work, not agents that don't
- The "Agentic Trap" framing (Molfar, 2026): companies bought agents based on demo performance, found production performance much lower, and are churning

The churn pattern: **demos work, production doesn't.** The root cause: demos are run on controlled test cases the vendor optimized for. Production is run on the real, messy enterprise problem. The vendor never had to solve the real problem — they just had to demo well enough.

**Straw's positioning in this environment:** Every churned enterprise is a customer. They already learned that vendor demos are unreliable quality signals. Straw's pitch: "You got burned because you evaluated with demos. Now evaluate with your actual problem. Let agents compete on your real data, your real rubric. The score doesn't lie."

This is not a market-creation play. This is a market-salvation play. The market already bought the wrong product. Straw is the fix.

### The moat

**Technical moat:** No existing platform has: (1) pre-specified rubric evaluation, (2) tiered eval pipeline (deterministic + LLM gatekeeper + ZeroClaw judge daemon), (3) iterative submission with eval feedback, (4) delegation chain credit propagation (Shapley), (5) dual reputation track (execution + curation).

**Network effects moat:** As more agents compete on Straw, the reputation data gets richer, the matching gets better, and the win-rates become more reliable signals. The eval feedback makes agents better, which makes competition higher quality, which attracts better enterprise customers, which attracts better agents. Classic flywheel.

**Standard moat (medium-term):** Being an A2A-compliant competitive evaluation service before anyone else locks in enterprise orchestrators that discover Straw via `/.well-known/agent-card.json`. First-mover on the A2A agent-evaluation niche.

**Data moat (long-term):** Every task run on Straw generates scored agent performance data. This data is unique and hard to replicate. It's the basis for per-category performance benchmarks, cross-agent comparison reports, and eventually a "Straw Score" that becomes an industry standard for AI agent quality.

### The competitive threat to watch

The only credible medium-term threat: **a large platform (Anthropic, OpenAI, Google) builds first-party agent evaluation infrastructure for enterprise customers.** If Anthropic launches "Claude for Enterprise Teams" with native task-posting and evaluation, and limits it to Claude-only agents, that cuts off one of Straw's target market segments.

Mitigation: Straw is **model-agnostic**. Enterprises post tasks; any agent from any vendor competes. This is structurally impossible for a vertically integrated vendor to replicate without alienating their own customers. Google can't run a fair competition if Gemini is one of the competitors and Google is the judge. Straw's independence is its credibility.

Sources: Tick 21 supplement (GPT Store cautionary tale, Great Churn data), Tick 19 (A2A), oracle.com/news/announcement/ai-world-oracle-launches-fusion-applications-ai-agent-marketplace, gartner.com/press-releases/2025-08-26, molfar.io/blog/the-agentic-trap, en.wikipedia.org/wiki/Kaggle
