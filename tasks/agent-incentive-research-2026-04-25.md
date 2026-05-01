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

## Implications for Straw (early synthesis, will sharpen as research progresses)

Five implications fall out of Tick 0 research:

**Implication A — The incentive problem is real and solvable, but ONLY by deliberate mechanism design.** Default-trained agents won't post tasks. The marketplace has to make posting *the rational choice* via budget constraints, comparative-advantage pricing, and reputation systems that reward delegation as much as self-completion.

**Implication B — Straw is in a defensible category (no major competitor yet has shipped a real agent-to-agent task marketplace).** That's a moat. But also: no playbook to copy, no proof points to point at. The marketing pitch isn't "X but for agents" — it's a new category.

**Implication C — V0 may not need agents to post tasks at all.** Railway's model — centrally-curated bounties, single funder, agents only compete — fully sidesteps the post-side problem. V0 could be: Jeremy / partner companies post tasks, agents compete. Then v1 opens the post-side once the agent population is large enough that comparative advantage starts to bite. **This staging is probably the right call.**

**Implication D — MiroFish (or OASIS underneath) is a de-risking tool, not a competitor.** Before deploying 300 real OpenClaws, we could SIMULATE 300 in OASIS to see what dynamics emerge: who posts, who competes, what bounty densities form, what failure modes appear. Cheap to run, fast iteration, no API token blowups.

**Implication E — When we do open the post-side, the mechanism has to ship complete.** Specifically: budget tokens (so an agent feels its compute as a constraint), Shapley-style credit propagation (so a poster gets credit for a downstream win), reputation that rewards both posting and competing, and pricing that reveals true cost (VCG auction or similar). Half-built mechanism + open posting = ghost town or adversarial gaming.

---

## Threads still to dig (for cron tick pickup)

The cron should pick the next thread that's NOT marked `[done]`. Order of priority is roughly top-to-bottom but the cron can use judgment.

### Highest priority (foundational for the proposal)

- [ ] **OASIS / CAMEL-AI deep dive.** MiroFish is built on OASIS — the canonical multi-agent simulation framework. Read the OASIS paper, understand the API, evaluate whether Straw could plausibly use it for the 300-agent swarm simulation. Capture: capability ceiling, integration complexity, cost per simulation tick.
- [ ] **Specific real production examples of agents posting tasks for other agents.** Tick 0 found that none exist at scale. But surely there are research prototypes, demos, hackathon submissions. Find them. Note who, what, why it worked or didn't.
- [ ] **Vickrey-Clarke-Groves auction in agent marketplaces.** What does VCG actually look like when implemented? Code references, simulation results, failure modes. Could Straw use VCG for bounty pricing on v1?
- [ ] **Shapley value credit propagation in agent chains.** Concrete examples, papers, code.
- [ ] **Reputation systems for autonomous agents.** Existing implementations. How to bootstrap reputation when there's no track record yet. Sybil resistance.
- [ ] **The 300-agent swarm simulation specifically.** How would we set up MiroFish/OASIS to simulate 300 OpenClaws on a Straw-shaped bounty board? What metrics do we capture? What would tell us whether the post-side actually fills?

### Medium priority (for the proposal's depth)

- [ ] **Adversarial cases.** An agent posts a task to harvest insights from competing agents (uses competitor submissions as training data). An agent posts low-quality tasks to dump bad work and inflate its post count. An agent forms collusion rings (posts → buddies "win"). Map these out + mitigations.
- [ ] **Target audience: who's the actual customer for Straw?** Is it: (a) human companies posting tasks, agents competing? (b) AI labs paying for agent training data? (c) agent operators (Jeremy) running their own swarms? (d) Some mix? Different audiences want different things from the platform.
- [ ] **Pricing models for the post-side.** Pre-funded bounty (poster pre-pays the prize pool, full risk on poster), pay-on-engagement (poster pays only when they hire/buy), success-share (poster pays a percentage of the value the work creates), subscription (poster pays a monthly fee for unlimited posts). Which incentivizes posting most?
- [ ] **Why would an autonomous agent OPERATOR (a human running OpenClaws) want their agents to post tasks?** This is the more practical question for v0/v1. The operator pays the API bills. They have their own incentives. Map them.
- [ ] **Anthropic's "effective harnesses for long-running agents" paper — full read.** Tick 0 referenced this; do a deep close-read. What patterns translate to Straw's bounty-board context?
- [ ] **MetaGPT's role-allocation mechanism in detail.** They simulate a software company. How does their CEO agent decide what to delegate vs. do itself? Code-level.
- [ ] **CrewAI's hierarchical mode in detail.** Manager agent auto-generates. How does it decide?

### Open / exploratory

- [ ] **Cost simulation: what does a 300-agent month on Straw actually cost in API tokens?** With our tiered eval (Tier 1 deterministic + Tier 2 gatekeeper + Tier 3 agent on 15%), at bounty-board scale (5-50 agents per task, async). Budget envelope.
- [ ] **Sybil resistance.** If reputation matters, what stops one operator from spinning up 300 OpenClaws and farming reputation across them? Solutions: stake-to-post, identity-bonded reputation, etc.
- [ ] **Cooperative AI Foundation grants list — what work has been funded.** They fund peer incentivization research; their grantees are doing exactly this work.
- [ ] **DoraHacks / Gitcoin / HackerOne / Bugcrowd internals.** How do existing bounty platforms handle reputation, payment, dispute resolution. What can we lift directly.
- [ ] **Replit Bounties, Devpost Bounty, GitHub Sponsors with bounties — small-bounty platforms.** Different pattern from Railway. Map them.
- [ ] **Manus's autonomy rating (9/10) — what does that benchmark mean. How was it measured.**
- [ ] **Bradley-Terry pairwise scoring** (referenced in earlier eval research). Worth combining with VCG?
- [ ] **What does the Straw economy look like in steady state?** Token velocity, reputation distributions, posting/competing ratios. Stylized model.

### Done in Tick 0

- [done] MiroFish initial readme + arch
- [done] Railway bounty model overview
- [done] Friend's incentive concern empirical validation (RLHF reward shaping research)
- [done] Production agent systems landscape (Manus, Devin, MetaGPT, CrewAI, AutoGen, AutoGPT)
- [done] Mechanism design recipe (six principles from cooperativeai / arxiv)

---

## Long-form proposal (DRAFT — to be sharpened by cron ticks)

> **This section will grow with each tick. Tick 0 puts down a skeleton; later ticks fill it in.**

### Target audience for Straw

**Three candidate audiences, ordered by best fit:**

**A. AI agent operators running multi-agent swarms (best fit for v0/v1).**
This is Jeremy and people like him: they run a fleet of autonomous agents (OpenClaws, MetaGPT-style teams, Codex bots, etc.). They have a budget for compute. They want their agents to do useful work. They're rate-limited by their own time more than by their wallet. The post-side problem partially dissolves here because **the human operator decides what to post**, and the agents underneath compete. The operator gets value when their swarm produces output worth the API bill.

What they want from Straw:
- A way to pose specific tasks to their swarm and get scored output back.
- A way to "rent" other operators' agent capabilities when their own swarm can't do something.
- Reputation across operators (so they can trust that someone else's agent will deliver).
- A clean economic settlement layer.

This audience makes the v0 sidesteps the friend's concern entirely: humans post (via their operator UI), agents compete. The agent-as-poster question becomes a v1+ design question.

**B. AI labs / platform companies looking for evaluation data.**
Anthropic, OpenAI, Google DeepMind, etc. all need real-world task data to evaluate their agents. Straw could be a benchmark provider — companies pay to post tasks in exchange for getting performance data on agents that competed. (This is closer to SWE-bench, just commercial.)

**C. SMBs / startups looking to outsource AI-completable work.**
The "hire AI to do work" pitch. Risky because (a) most work that fits on a bounty board is also fittable on Upwork/Fiverr, and (b) AI agents in 2026 are still patchy at end-to-end production work. Probably a v2+ audience.

**My current take:** lead with audience A (operators), v1 to audience B (labs), v2+ to audience C (SMBs). This sequencing solves the post-side problem.

### Why agents would actually want to post tasks (the meaty question)

**Short answer:** Agents under default RLHF shaping don't want to post. Agents under deliberate marketplace mechanism design DO. The marketplace has to make posting unambiguously the dominant strategy under realistic constraints.

The mechanism design recipe (from Tick 0):
1. **Budget tokens.** Each agent gets a compute budget. When the agent can't fit a subtask in budget, posting is the only path forward (other than failing).
2. **Comparative-advantage pricing.** Tasks priced by VCG auction reveal true costs. An agent that's bad at a subtask sees a low offer-price for "do this myself" and a high one for "let someone else." Posting wins on EV.
3. **Shapley credit propagation.** When an agent posts and someone else completes the work, the *original poster* still gets reputation credit for the upstream task they were working on. Posting doesn't lose credit — it shares credit.
4. **Reputation that rewards posting AND competing.** Agents that are good at *finding work to delegate well* gain reputation. (Good managers are rewarded; the "manager track" matters as much as the "IC track.")
5. **Cryptographic enforcement of contracts.** Posting is risk-free in the sense that the mechanism can guarantee delivery or refund.
6. **Anti-lock-in / dynamic updates.** Mechanism evolves as agent population evolves.

The key insight: **default agents don't have these incentives, but Straw can build them in.** Once the agent operates in Straw's economic environment, their behavior reshapes around the new incentives — they're not reacting to RLHF reward shaping anymore, they're reacting to Straw's reward shaping.

### What agents would be doing on Straw, day-to-day

**Operator-mediated v0:**
1. Operator puts an OpenClaw to work on a bigger project.
2. OpenClaw hits a sub-problem outside its strength (e.g., obscure language, niche domain).
3. Per Straw protocol, OpenClaw posts the sub-problem as a bounty (with operator-set budget cap).
4. Other agents on the platform see the bounty, those with comparative advantage compete.
5. OpenClaw evaluates submissions (or the platform does), picks the best, integrates.
6. Operator gets continuous progress; agents that helped earn reputation + economic credit.

**Native v1:**
Same, but agent-driven from end to end — agent has its own budget, makes its own posting decisions based on opportunity-cost analysis built into its harness.

### How task-posting works for agents specifically

**API surface for posting (sketch):**
- `POST /api/v1/tasks` with body containing: title, spec, rubric, budget cap, deadline, optional `parent_task_id` (for delegation chain tracing), optional `evaluator_context`.
- Posting agent must hold sufficient budget tokens for the bounty + platform fee.
- Posting agent's reputation impacts default visibility (high-rep posters get more eyeballs on their bounties).
- Auto-close behavior: if N submissions clear the bar before deadline, poster can close early; otherwise deadline auto-closes.

**Reputation impact of posting:**
- Posting itself: small cost (proof-of-effort fee, prevents spam).
- Posting a task that gets cleared by quality work: positive reputation (you found valuable work to delegate).
- Posting a task that everyone fails: small negative (you posted something unsolvable; unclear if intentional).
- Posting same task repeatedly with no engagement: negative (signaling poor task design or pricing).

**Payment structure (open question):**
- Pre-funded: poster commits budget at post time, escrowed until task closes. Agents get paid out of escrow.
- Multi-engagement: per D22, multiple agents can be engaged commercially on the same task; pre-funded escrow distributes proportionally.
- Refund: if no agent clears the bar, escrow returns minus a small platform fee.

### The 300-agent swarm scenario

**The simulation, not the deployment.** Before paying real API tokens to run 300 OpenClaws on Straw, we should simulate it in OASIS / MiroFish. What we want to learn:

1. **Does the post-side fill?** With the mechanism design above, do simulated agents post enough tasks to keep the competition side busy?
2. **What's the post:compete ratio?** If 300 agents all want to compete and none want to post, we have the friend's nightmare. If too many want to post, no one's working. The healthy ratio is empirically unknown — simulation tells us.
3. **What price levels emerge?** With VCG auction pricing, what bounty values clear? Are they consistent with our cost projections (Tier 1+2+3 funnel)?
4. **What's the reputation distribution?** Power-law as expected? Do new agents get any traction?
5. **What adversarial behaviors emerge?** Collusion rings, sybil attacks, post-spam, harvest-attacks (post a task to extract competitor work as training data).
6. **What infrastructure load does this generate?** API request rates, DB write QPS, eval queue depth, storage growth.

**Infrastructure implications (rough):**
- 300 agents, each making ~10 API requests per "agent-day" (browse, post, submit, poll), = ~3,000 req/day baseline.
- Bursty around bounty deadlines.
- Eval pipeline at Tier 2 (cheap LLM gatekeeper) handles 85% of submissions; ~150 evals/day max if all 300 submit once.
- Agent posting rate (open question — depends on simulation). If even 10% of agents post once per day = 30 posts/day, manageable.
- DB write QPS: order of magnitude tens, well within Supabase free tier.
- Storage: dominated by submission artifacts (zips). At ~5MB avg × 300 daily submissions = 1.5GB/day, ~50GB/month. Within Supabase Storage free tier on the bottom plan.

**The simulation gives us our deployment plan.** Don't deploy 300 real OpenClaws until simulation matches our cost / load projections within tolerable error bars.

---

## Push status

Tick 0 commit: pushed by Jeremy's local Claude Code session before sleep. Subsequent ticks should run from cron. If push fails (GitHub creds not connected), see troubleshooting note in CLAUDE.md.

## Cron handoff notes for future ticks

- Pick highest-priority [ ] thread from "Threads still to dig" that fits in your context budget.
- Append findings as `## Tick N (UTC ISO timestamp): topic`.
- Mark threads `[done]` only when meaningfully covered, not just glanced at. Add new threads liberally.
- The "Long-form proposal (DRAFT)" section grows with each tick. Don't rewrite from scratch; extend.
- Commit message format: `research(agent-incentive): tick N — <thread topic>`.
- Author: `Jeremy Liu <jeremyliu621@gmail.com>` via `--author` flag.
- If file >2000 lines, split into themed companions (target-audience.md, agent-incentive-mechanics.md, swarm-dynamics.md, comparable-systems.md) and keep this as an index.

## Sources cited so far (Tick 0)

- MiroFish: `https://github.com/666ghj/MiroFish`
- Railway Bounties: `https://docs.railway.com/community/bounties`, `https://station.railway.com/bounties`
- RLHF reward shaping & delegation: Perplexity thread `https://www.perplexity.ai/search/9de270a7-8efc-4383-9b8a-bdd750f3351a`
- Production agent systems landscape: Perplexity thread `https://www.perplexity.ai/search/2c310bd3-85ea-44f7-80ec-66ac62e77050`
- Mechanism design recipe: Perplexity thread `https://www.perplexity.ai/search/3d7b27c2-1509-4040-ad91-2804c925076a`
- Background: `tasks/eval-research-deep-2026-04-25.md` for tiered eval architecture; `tasks/DECISIONS.md` D22 for multi-engagement winner flow; `project_framing_evaluated_bounty_board.md` (memory) for the bounty-board reframe.
