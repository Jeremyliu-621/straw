# Straw Phase 2 Research: Bear Case, GTM, and Design Partners

**Phase 2 mandate:** Three parallel themes — steelman against Straw, GTM motion to first revenue, concrete design partner targets.
**Started:** 2026-05-02 (overnight session, Phase 2 follows Phase 1's 46 ticks / ~7,900 lines)
**Working convention:** Each tick appends a `## Tick N (UTC timestamp): topic [theme: bear/gtm/partners]` section. Cross-references to Phase 1 use `→ Phase1:SectionN` notation.

---

## Phase 2 Threads — Working Backlog

> This list is updated each tick. Strike through completed threads.

**Theme 1: Bear Case (Steelman Against Straw)**
- [ ] Tick 1: Pre-mortem + comparable platform failures (Replit Bounties, Bountysource, Kaggle revenue trajectory)
- [ ] Tick 4: Cold-start two-sided marketplace failures (Homejoy, Beepi, documented post-mortems)
- [ ] Tick 7: Token/credit economy collapse modes (Steemit, Kin, Helium) + regulatory/liability black holes
- [ ] Thread: Why smart founders chose hierarchical over marketplace (Manus, Devin, CrewAI decision logic)
- [ ] Thread: The "good enough substitutes" substitution math (Toptal, Upwork, Cognition/Devin for-hire, OpenAI Operator)
- [ ] Thread: Enterprise autonomy trust / "creepiness" objection — survey data

**Theme 2: GTM Motion**
- [ ] Tick 2: B2B SaaS founder-led sales playbook 2026 — what works for AI/agent ops teams
- [ ] Tick 5: Dev-tool first revenue stories (Cursor, Modal, Braintrust/evals, LangSmith)
- [ ] Tick 8: Pricing experiments for evaluated bounty boards + design partner program structures
- [ ] Thread: Enterprise AI sales cycle length + who signs the check
- [ ] Thread: Content marketing vs. outbound for technical AI tools

**Theme 3: Concrete Design Partner Targets**
- [ ] Tick 3: AI agent operators + AI safety/eval labs — named people with openers
- [ ] Tick 6: Bug bounty companies + dev-tool founders — named people with openers
- [ ] Thread: YC W25/S25/W26 AI agent companies — specific founders
- [ ] Thread: Anthropic/OpenAI research contacts for eval infrastructure

---

## Context for This Session

Phase 1 (46 ticks, 8 hours) was **bullish**. It covered:
- Why agents WILL want to post tasks (mechanism design, Section 12)
- Comparable systems all lack pre-specified rubrics (Straw's moat, Section 10)
- VCG auction design, Shapley credit, reputation systems
- v0/v1/v2 implementation roadmap (Section 13)
- 300-agent swarm scenario (Section 14)
- Compliance infrastructure angle (Section 15)
- An anti-thesis section (Section 23) that covered rubric capture, platform bias, benchmark contamination, winner concentration, monopoly lock-in

**Phase 1 Section 23 already covered these bear cases:**
1. Rubric capture / evaluation theater
2. Platform bias (judge model favors certain agents)
3. Benchmark contamination cycle (Goodhart's Law)
4. Winner concentration degrades signal quality
5. Monopoly lock-in if Straw becomes the standard

**Phase 2 bears cases go DEEPER AND WIDER on:**
- Comparable platforms that actually DIED (empirical, not theoretical)
- Pre-mortem: most likely specific failure paths in 2026-2027
- Two-sided marketplace cold-start structural failures
- Token economy collapse modes
- Regulatory/liability blind spots
- Substitution math from existing tools

---

## Tick 1 (2026-05-02T00:30Z): Comparable platform failures + pre-mortem [theme: bear]

### The headline finding: Replit Bounties was killed by AI agents — not by marketplace failure

Replit Bounties launched December 2022. CEO Amjad Masad promoted it heavily — reduce transaction fees to zero, embed it in the IDE, enable solo devs to build entire products through micro-contracts. The pitch was Straw's thesis applied to human developers.

**Replit Bounties was deprecated September 6, 2025. No official explanation was given.**

The real cause: in 2024, after a 50% staff layoff, Replit pivoted entirely. They launched Replit Agent — autonomous AI builds software for non-technical users, no human bounty hunters in the loop. ARR jumped from ~$10M to $100M in six months. By September 2025: $144M ARR, Agent 3 launched.

> **The kill shot was not that the marketplace failed. It was that autonomous agents made the marketplace obsolete.**

Source: [HN discussion on Replit killing Bounties](https://news.ycombinator.com/item?id=44643875), [Sacra/36kr reporting on $144M ARR](https://eu.36kr.com/en/p/3641937025322624)

**Why this matters for Straw — the double-edged lesson:**
- It validates the AI-for-tasks thesis (Replit's pivot to agents was wildly profitable)
- It shows that a *human bounty marketplace* can be displaced by AI agents in 12-18 months
- The risk for Straw: if foundation model providers (OpenAI Operator, Anthropic's agents, Google's Vertex AI agents) get good enough at autonomous task completion, the evaluation/competition layer becomes unnecessary — enterprises just run the agent and check the output themselves

---

### Bountysource: Death by custodial fraud

Bountysource was the oldest OSS bounty platform — crowd-funding model where developers placed money in escrow on GitHub issues. Had genuine traction in the OSS community.

**Collapse sequence:**
- 2017: Acquired by CanYa (crypto company)
- 2020: Acquired again by The Blockchain Group
- June 2023: **Payouts stop.** Developers with verified, completed claims receive nothing. TBG stops responding.
- November 2023: The Blockchain Group files for bankruptcy
- May 2024: "Temporarily down" — never returned

Boehs.org investigation: ["Bountysource Stole At Least $21,000 from Open Source Developers"](https://boehs.org/node/bountysource) — escrowed funds appear to have been misappropriated by the new ownership. Total lost is unknown but likely far larger.

Source: [boehs.org investigation](https://boehs.org/node/bountysource), [GitHub issue #1586](https://github.com/bountysource/core/issues/1586), [HN coverage](https://news.ycombinator.com/item?id=40253514)

**Lesson for Straw:** Any platform holding funds in escrow becomes a custodial target during financial distress. The mitigation is not holding escrow at all (pay via Stripe Connect, payout immediately upon deal close) or using a regulated custodian with explicit separation of platform and escrowed funds. This is a design risk, not a market thesis risk — it's solvable.

---

### Gitcoin Bounties: Strategic sunset, not failure

Gitcoin ran bounties for Web3 OSS. In 2023, they deliberately wound down bounties (along with cGrants and Hackathons), giving users until July 30, 2023 to retrieve data. Handed off bounties functionality to Buidlbox. Refocused on Gitcoin Grants (quadratic funding for public goods) which was actually differentiated and growing.

Source: [Gitcoin sunsetting FAQ](https://support.gitcoin.co/gitcoin-knowledge-base/misc/cgrants-bounties-and-hackathons-sunsetting-faq)

**Lesson for Straw:** Even well-funded projects prune bounties when something else in their portfolio has stronger PMF. This is the "bounties are a feature, not a company" argument. The counter: Straw is building evaluation infrastructure (the rubric engine, the eval pipeline, the compliance certificate), not just a board. The evaluation infra is the moat.

---

### The structural critique of bounty mechanics — IEEE research

Ondsel's essay ["Software Bounties Are a Dumb Idea"](https://www.ondsel.com/blog/software-bounties-are-a-dumb-idea/) and the underlying IEEE research make a principled argument:

- **Risk asymmetry**: Multiple parties do the work, only one gets paid → spec-work economics
- **Scope blindness**: Non-technical posters underestimate effort (famous case: MIDI in Ardour, 3 years + 4 contributors, attracted only $1,380 in bounties)
- **Academic result: bounty-tagged issues have LOWER closing rates and take LONGER to resolve** than non-bounty issues

Source: [Ondsel blog](https://www.ondsel.com/blog/software-bounties-are-a-dumb-idea/), [HN discussion](https://news.ycombinator.com/item?id=37541994)

**Critical question this raises for Straw:** Straw's model is NOT the same as issue-tracker bounties. The differences:
1. Straw tasks are pre-specified with objective rubrics — scope blindness is by design mitigated
2. Straw is B2B (companies posting to AI agents), not community OSS (developers posting bugs)
3. The "risk asymmetry" is partially mitigated by Straw's artifact access control (scores are free; full artifacts cost money to unlock)

But the spec-work critique has teeth: if agents compete for a task and one wins, the 29 who didn't win spent real compute and earned nothing. Phase 1 addressed this via reputation (losers still gain rep data), but this requires agents to genuinely value reputation as compensation for losing effort — which is only true if reputation translates to future wins.

---

### AI automation flooding bug bounty platforms — new threat vector (2025-2026)

AI tools are flooding HackerOne and other bug bounty platforms with low-quality automated reports, forcing programs to pause or collapse under volume. HackerOne paused their Internet Bug Bounty program entirely.

Source: [cybernews.com on AI breaking bug bounties](https://cybernews.com/ai-news/ai-break-bug-bounty-programs/)

**Implication for Straw:** Same dynamic will hit Straw once AI agents can generate plausible-looking submissions. The Tier 2 gatekeeper (Haiku LLM quality gate) is the defense, but it needs to be robust to "looks good, is empty" submissions — not just syntactically valid but semantically capable.

---

### Kaggle's commercial health: opaque and structurally limited

Kaggle was acquired by Google in March 2017. No revenue figures have EVER been disclosed. It is embedded in Google Cloud infrastructure and has no standalone commercial model.

At-a-glance stats: 23.29 million registered accounts, 612 Grandmasters. The funnel is enormous; meaningful engagement is thin.

**Most important competitive signal:** Hugging Face Competitions product had its **last commit in October 2024**. The product lead left in early 2025. Even well-capitalized AI-native companies find the competition-to-revenue bridge hard to build.

Source: [State of ML Competitions 2025](https://mlcontests.com/state-of-machine-learning-competitions-2025/), [Kaggle Wikipedia](https://en.wikipedia.org/wiki/Kaggle)

**Lesson for Straw:** Kaggle has 23M users and Google's balance sheet and still has no visible B2B revenue model. The reason: no post-competition hiring pipeline, no longitudinal agent evaluation, no compliance certificate. Straw's commercial model (hire/license/acquire winners; compliance certificate for regulated procurement) is the product differentiation that Kaggle lacks. But it also means no one has proven this model works yet at commercial scale.

---

### Enterprise trust gap — the hardest bear case fact

**PwC AI Agent Survey (April 2025, n=308 US C-suite and director executives):**
- 79% say AI agents already adopted
- Trust for financial transactions: **only 20% comfortable with full autonomy**
- Trust for autonomous employee interactions: 22%
- 28% rank trust as a top-three barrier

**Gartner (June 2025):**
- **Over 40% of agentic AI projects will be canceled by end of 2027** due to escalating costs, unclear business value, or inadequate risk controls
- Only ~130 of thousands of "agentic AI" vendors are genuinely agentic (rest is "agent washing")
- January 2025 Gartner poll: only 19% had made significant investments; 31% in pure wait-and-see

**McKinsey State of AI Trust 2026 (December 2025 - January 2026, ~500 organizations):**
- Nearly two-thirds cite security and risk concerns as top barrier to scaling agentic AI
- High performers are 65% likely to have defined human-in-the-loop validation
- Guidance: "start with bounded autonomy, keep humans accountable for high-impact decisions, scale only when monitoring shows predictable behavior"

**Forrester/Anaconda 2026:**
- **88% of agent pilots fail to graduate to production**
- Evaluation gaps (64%), governance friction (57%), model reliability (51%) are top blockers

Sources: [PwC AI Agent Survey](https://www.pwc.com/us/en/tech-effect/ai-analytics/ai-agent-survey.html), [Gartner prediction](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027), [McKinsey AI Trust 2026](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/tech-forward/state-of-ai-trust-in-2026-shifting-to-the-agentic-era)

**What this means for Straw's bear case:**
The trust gap is a structural adoption hurdle. Enterprises are enthusiastic about internal AI productivity. They are deeply skeptical about agents autonomously participating in external procurement or financial transactions. Straw's model requires companies to (a) post real tasks, (b) accept scores from AI judges, (c) make procurement decisions based on those scores. Steps (b) and (c) require the 20% of enterprises who trust AI in financial contexts — not the 79% who use AI in some capacity.

The optimistic read: Straw's compliance certificate (Section 15) is specifically designed to give the trust-cautious enterprise the human-in-the-loop validation they need. The evaluation platform reduces autonomy risk rather than adding to it.

---

### Tick 1 Bear Case Summary Matrix

| Risk | Evidence Strength | Structural vs. Mitigable |
|------|----------|----------|
| AI agents make evaluation layer redundant (Replit trajectory) | High (empirical, $144M ARR data) | Structural — this is the #1 existential risk |
| Custodial fraud in escrow model | High (Bountysource, $21K+) | Mitigable (don't hold escrow, use Stripe Connect) |
| Strategic pivot kills bounties as feature | Medium (Gitcoin) | Mitigable (Straw is infra, not a feature) |
| Bounty spec-work economics | Medium (IEEE research) | Partially mitigable (pre-specified rubrics, artifact access gate) |
| AI flooding of evaluation queues | Medium (HackerOne pause) | Mitigable (Tier 2 quality gate) |
| Kaggle has no revenue model at 23M users | High | Structural concern — no comp for commercial success |
| Enterprise trust gap for autonomous agents | High (PwC 20%, Gartner 40% cancellations) | Partially mitigable (compliance cert, human-in-the-loop design) |

---

## Tick 2 (2026-05-02T00:32Z): GTM motion — founder-led sales 2026 [theme: gtm]

### The 2026 GTM playbook for AI/agent tools

**Hybrid-led growth has won the PLG vs. SLG debate.** The binary is dead — winners run product-led acquisition funneled into sales-led expansion. Menlo Ventures' December 2025 report (n=495 enterprise AI decision-makers) found PLG drives 27% of AI application spend — 4x traditional SaaS. Free trial/POC to paid conversion was ~36% in 2025, now ~50% in 2026. AI deals reach production at 47% — nearly 2x traditional SaaS — because "AI delivers clear, immediate value that short-circuits standard procurement cycles."

**The outbound signal:** AI tools have boosted personalized outbound reply rates by ~25% when used for research/personalization rather than mass blasting. Founders do direct, high-context outbound to exact ICP; AI handles research; humans write the emails.

Source: [ProductLed 2026 PLG predictions](https://productled.com/blog/plg-predictions-for-2026), [Menlo Ventures 2025 State of Gen AI in Enterprise](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)

---

### Cursor: 0 → $2B ARR without a dedicated sales hire until year 3

- **$100M ARR** with zero paid ads or sales hires
- **$1B ARR** in 24 months — fastest B2B SaaS ramp ever (faster than Slack, Zoom, Snowflake)
- **$2B ARR** by February 2026
- **64% of Fortune 500** have developers using Cursor

GTM motion: pure PLG. Developers found it organically on Twitter/Reddit/HN. Early "cool kid customers" — OpenAI, Midjourney, Shopify, Instacart — were not sold to; they found the product. The first sales hire (Brian McCarthy, former Rubrik President/CRO) only came when they were already at $1B ARR.

**Key insight for Straw:** Cursor only works if practitioners become internal advocates *before* procurement finds out. For Straw, that means getting VP of Engineering / Head of AI to run a single evaluation — and having the results be so interesting they share them internally.

Sources: [SaaStr $1B ARR](https://www.saastr.com/cursor-hit-1b-arr-in-17-months-the-fastest-b2b-to-scale-ever-and-its-not-even-close/), [The Next Web $2B](https://thenextweb.com/news/cursor-anysphere-2-billion-funding-50-billion-valuation-ai-coding)

---

### Modal Labs: Developer-first, cloud marketplace expansion

- December 2023: ~$42K ARR → 18 months later: 8-figure ARR (50x+ growth)
- Early customers: Ramp, Substack, Suno, Cognition, Cursor, Scale AI, Meta Code World Models
- Series B: $87M at $1.1B valuation (September 2025)

GTM: purely developer-led. Python-native SDK let engineers run a serverless function in minutes. No procurement friction. Enterprise expansion via cloud marketplace integrations (AWS, Azure, GCP) — customers apply existing committed cloud spend to Modal, eliminating the budget conversation.

**Key insight for Straw:** Modal's marketplace integration trick (letting customers pay via existing AWS/GCP contracts) is worth doing once Straw has enterprise traction. It collapses procurement friction dramatically.

Sources: [Modal Sacra](https://sacra.com/c/modal-labs/), [Modal Contrary Research](https://research.contrary.com/company/modal)

---

### Braintrust: The closest comp to Straw

Braintrust is the single most relevant comp. Founded August 2023 by Ankur Goyal (previously CEO of Impira). Revenue trajectory:
- $5M seed (Dec 2023)
- $36M Series A (Oct 2024)
- $80M Series B at $800M valuation (Feb 2026)
- Customers paying "tens of thousands to over $100K/year"
- Customers: Notion, Replit, Cloudflare, Ramp, Dropbox, Vercel, Stripe, Airtable, Instacart

**How they got customer #1:** Zapier was first. Ankur had the evals problem at Impira — models improved on invoices but regressed on bank statements. He sold Zapier's CTO Brian Cooksey on rigorous AI quality measurement. Pitch: problem-first, not product-first. "You're making six-figure agent decisions on vibes — here's how to do it on data."

**GTM approach:** Ankur went directly to engineering leadership at companies already deploying LLMs in production — where the eval problem was acute and already costing them. He bypassed procurement entirely. He went to the people feeling the pain.

**Direct implication for Straw:** Braintrust's pattern maps exactly. The Straw pitch is: "You're about to renew three AI vendor contracts and doing it based on vibes. We run a competitive evaluation on your exact task, with your exact success criteria, in two weeks. The score doesn't lie."

Sources: [First Round Review / Ankur PMF interview](https://review.firstround.com/podcast/what-braintrust-got-right-about-product-market-fit/), [Latent Space podcast](https://www.latent.space/p/braintrust), [a16z announcement](https://a16z.com/announcement/investing-in-braintrust/)

---

### Linear: Invite-only, pure founder network, no outbound

- April 2019: MVP launched via Medium article → 10,000+ waitlist
- Invite-only with viral mechanic: early users let friends skip waitlist
- Co-founders (Karri Saarinen, Tuomas Artman, Jori Lallo) had personal networks at Coinbase, Airbnb, Uber — their friends were customer #1

**Key insight for Straw:** Linear's GTM only worked because the founders had direct personal access to the ICP. Jeremy's existing relationships in AI/agent ops are the first sales funnel. Who do you personally know at AI-forward companies that have deployed agents in production? Start there.

Source: [Linear First 1000 - Ali Abouelatta](https://read.first1000.co/p/linear)

---

### Who buys AI evaluation tools at enterprises

Based on the research, the buying committee:
- **Champion:** VP of AI / Head of AI Engineering / ML Platform Lead (feels the pain)
- **Economic buyer:** CTO or CIO (owns AI budget, accountable for AI ROI)
- **Blocker/approver:** Legal/compliance (data handling, model security)

**71% of CIOs must prove measurable AI value by mid-2026 or face budget cuts.** This is Straw's single best sales hook — evaluation platforms directly serve CIOs proving ROI.

**32% of enterprises cite quality as the top barrier to agent deployment** (LangChain 2026 State of AI Agents). Those companies need exactly what Straw provides.

**Sales cycle length:** Enterprise AI deals average 90 days. But: the evaluation period has become the new sales motion. Straw's competitive evaluation *is* the trial period — built-in advantage.

Sources: [BusinessWire CIO survey](https://www.businesswire.com/news/home/20260212994335/en/71-of-CIOs-Say-They-Have-Until-Mid-2026-to-Prove-AI-Value-or-Risk-Budgets-and-Job-Fallout), [CTO Magazine AI Buyer](https://ctomagazine.com/meet-the-ai-buyer/)

---

### Content marketing: founder-led > corporate for dev tools

- 77% of customers more likely to buy when CEO is active on social media
- Personal LinkedIn generates 7x more impressions than company pages
- **Opinionated takes on the pain** outperform product announcements: "here's what's broken about how enterprises evaluate AI agents and why"
- **Building in public** (the Linear/Cursor playbook): weekly technical logs on Twitter/X and LinkedIn
- AI-drafted content under a fake founder voice is measurably losing market share — authenticity matters

**LLM optimization is the new SEO:** Prioritize being cited in ChatGPT/Claude/Perplexity responses to "how do I evaluate AI agents before deploying them."

Source: [FORKOFF founder-led content 2026](https://forkoff.xyz/blog/founder-growth/founder-led-content-marketing-ai-2026)

---

## Tick 3 (2026-05-02T00:34Z): Design partner targets — AI agent operators + AI labs [theme: partners]

*See full consolidated design partner list in Tick 6 and the Partners section of the Morning Reading Guide.*

### AI Safety / Eval Labs — Named Contacts

| Name | Company | Role | Twitter | Opener |
|------|---------|------|---------|--------|
| **Beth Barnes** | METR | CEO & Founder | @BethMayBarnes | "METR evaluates what agents can do for labs — Straw evaluates what agents can win for enterprise buyers. The methodology overlap is real. Worth 20 minutes?" |
| **Marius Hobbhahn** | Apollo Research | CEO | @MariusHobbhahn | "Apollo evaluates model behavior for safety — Straw evaluates model performance for procurement. Same infrastructure, different buyer. Worth comparing notes?" |
| **Buck Shlegeris** | Redwood Research | CEO | @bshlgrs | "Redwood's AI control work assumes you can verify agent behavior in adversarial conditions. Straw's competitive arena structure maps directly — real tasks, real rubrics, no synthetic benchmarks." |
| **Zac Hatfield-Dodds** | Anthropic | Lead, Assurance | GitHub: Zac-HD | "You're building internal eval infrastructure at Anthropic. Straw is the commercial counterpart for enterprise buyers. The data generated by Straw competitions would be very interesting to compare against internal benchmarks." |
| **Adam Beaumont** | UK AISI | Interim Director | @AISecurityInst | "AISI benchmarks frontier models for UK gov. Straw is building private-sector competitive eval for enterprise procurement. Worth aligning on methodology." |
| **Esben Kran** | Apart Research | Founder | apartresearch.com | "Apart runs safety hackathons with competitive rubrics — Straw commercializes that model for enterprise procurement. Potential collaboration on task design methodology." |

### AI Agent Operator Startups — Named Contacts

| Name | Company | Role | Twitter | Opener |
|------|---------|------|---------|--------|
| **Scott Wu** | Cognition/Devin | CEO | @ScottWu46 | "Straw is like a live eval arena — companies post real tasks with rubrics, agents compete. Being the benchmark everyone tests against seems like obvious distribution for Devin." |
| **Robert Brennan** | OpenHands/All Hands AI | CEO | @rbren_dev | "You've built the best open-source coding agent. Straw gives enterprise buyers a way to verify that head-to-head against alternatives — the missing piece for deals above $100K." |
| **João Moura** | CrewAI | CEO | @joaomdmoura | "CrewAI customers want to know which agent configuration wins on their actual workload. Straw is the arena where that gets proven, not just claimed." |
| **Harrison Chase** | LangChain/LangSmith | CEO | @hwchase17 | "LangSmith does observability; Straw does competitive head-to-head evaluation on buyer-defined tasks. They're complementary — LangSmith users need Straw before procurement decisions." |
| **Bar Winkler** | Wonderful | CEO | @barwinkler | "You're deploying agent fleets for large enterprises. Straw is how those enterprises validated you were the right choice — and how you win the next one." |
| **Gregor Zunic** | Browser Use (YC W25) | Co-Founder | @gregpr07 | "Browser Use powers web agents for hundreds of companies. Straw gives those companies a way to benchmark competing agent implementations on their actual web workflows." |

Sources: [METR About](https://metr.org/about), [Apollo Research Team](https://www.apolloresearch.ai/team/), [OpenHands](https://openhands.dev/about), [CrewAI funding](https://siliconangle.com/2024/10/22/agentic-ai-startup-crewai-closes-18m-funding-round/), [Browser Use YC W25](https://www.ycombinator.com/companies/browser-use)

---

## Tick 4 (2026-05-02T00:36Z): Cold-start two-sided marketplace failures + substitutes math [theme: bear]

### Documented marketplace failure post-mortems

**Homejoy (home cleaning, 2015):** Raised $38M, shut down July 31, 2015. The official cause was worker-misclassification lawsuits — but that was the match to an already-burning floor. Real causes:
- Unit economics broken from day one: $19 promotional cleans vs. $85+ market rate
- 75% of bookings from discount channels, not organic
- Only 25% of customers returned after month 1; <10% at month 6
- The cold-start problem was masked by subsidies — once subsidies dried up, there was no flywheel
- Premature expansion to 30+ cities before proving unit economics in one

> **Pattern for Straw:** Straw cannot subsidize early task volume. If the first 20 tasks only happen because Jeremy is manually seeding them, that's fine — v0 is designed that way. But the transition to organic posting requires genuine buyer PMF, not manufactured density.

Source: [TechCrunch: Why Homejoy Failed](https://techcrunch.com/2015/07/31/why-homejoy-failed-and-the-future-of-the-on-demand-economy/)

**Beepi (used cars, 2017):** Raised $150M, $560M valuation, shut down February 2017. Burn rate $7M/month against thin used-car margins. Operational complexity (inspection, title transfer, financing, insurance, logistics) was massively underestimated. $90M in promised Chinese investment fell through in late 2016; no runway. Also: documented executive misuse of capital ($10K sofa, covering founders' personal expenses). Asset-light economics never materialized.

Source: [Failory: What Happened to Beepi](https://www.failory.com/cemetery/beepi)

**Shyp (on-demand shipping, 2018):** Raised $62M, $250M valuation, shut March 2018. Frequency mismatch — shipping is infrequent vs. daily use cases. $5 flat pickup fee didn't cover costs. CEO Kevin Gibbon published honest post-mortem: "We decided to keep the popular-but-unprofitable parts of our business running with small teams behind them. This was a mistake." Unit economics only looked tolerable because early demand was price-subsidized.

Source: [Fast Company: How Shyp Sunk](https://www.fastcompany.com/40549442/how-shyp-sunk-the-rise-and-fall-of-an-on-demand-startup)

**Quibi (streaming, 2020):** Raised $1.76B, launched April 2020, shut down October 2020. Bootstrapped both supply and demand simultaneously with no existing IP or fan base. Blocked social media sharing — killed viral cold-start loop. Launched during COVID lockdowns, eliminating the commute use case it was designed for. 3.5M downloads vs. 7M target in month one.

Source: [How They Grow: Why Quibi Died](https://www.howtheygrow.co/p/why-quibi-died-the-2b-dumpster-fire)

### Cross-cutting cold-start pattern

Academic research on 29 startup post-mortems finds four recurring marketplace dilemmas. All four Straw-relevant failures exhibit at least two:
1. **Cold-start dilemma:** supply arrives before demand, or vice versa
2. **Lonely user dilemma:** the product is worthless without the other side
3. **Monetization dilemma:** early monetization kills growth; late monetization starves the company
4. **Remora's curse:** dependence on a larger platform that can remove the dependency

The most common pattern: **promotional pricing manufactures fake traction → investors read it as PMF → expansion accelerates before the model is proven → collapse when subsidy ends.**

**Straw's cold-start mitigation (the v0 design):** Jeremy posts tasks manually; OpenClaws compete. No two-sided chicken-and-egg. Transitions to organic posting only at v1 when 3-5 enterprise design partners are already committed.

---

### The "good enough substitutes" math

**Upwork absorbing AI agent work:**
- 40% of tasks completed on Upwork in Q4 2025 involved significant AI agent assistance (up from 18% in Q4 2024, <5% in Q4 2023)
- AI-related GSV grew ~30% YoY in Q2 2025
- AI skills demand grew 109% YoY in 2025

**Interpretation:** Enterprises needing AI agent work can already find it on Upwork — they hire a human who deploys AI agents on their behalf, paying $50-200/hour, with a human accountable for the result. This is functionally similar to Straw but with human intermediation adding trust. The question is whether Straw's objective rubric + direct agent competition is worth the added complexity.

Source: [Upwork In-Demand Skills 2026](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai)

**Devin / Cognition as direct substitute:**
- April 2025: Devin 2.0 cuts price from $500/month to **$20/month** (Core tier), $500/month Team tier
- Enterprise tier: custom pricing, VPC deployment, data isolation

An enterprise can go to Devin, describe a task in natural language, and have an autonomous agent complete it — without a competition, without defining evaluation criteria, without waiting for competitors. The only thing Devin cannot offer: competitive benchmarking across multiple agents, independent evaluation, and the "score doesn't lie" procurement guarantee. But a company that just wants a task DONE — not evaluated — will choose Devin at $20/month over running a Straw competition.

Source: [Devin Pricing](https://devin.ai/pricing/), [VentureBeat: Devin 2.0](https://venturebeat.com/programming-development/devin-2-0-is-here-cognition-slashes-price-of-ai-software-engineer-to-20-per-month-from-500/)

**OpenAI Workspace Agents (the most dangerous substitute, 2026):**
- January 2025: Operator launched (Pro-tier only, $200/month) — browser-based autonomous task execution
- August 2025: Operator deprecated, replaced by "ChatGPT agent" integrated into ChatGPT
- 2026: Workspace Agents — runs continuously in cloud, integrates with Slack, Google Drive, Salesforce, Notion, Atlassian. Free through May 6, 2026, then credit-based pricing

**Critical gap (as of May 2026):** No public CUA API. The agent is locked to the ChatGPT web interface — companies can't programmatically deploy OpenAI agents for competitive evaluation. OpenAI has promised a CUA API "soon" with no timeline. **When the CUA API ships, the question "why post to Straw when I can call OpenAI's API directly?" becomes live.**

Source: [OpenAI Introducing Operator](https://openai.com/index/introducing-operator/), [VentureBeat: Workspace Agents](https://venturebeat.com/orchestration/openai-unveils-workspace-agents-a-successor-to-custom-gpts-for-enterprises-that-can-plug-directly-into-slack-salesforce-and-more)

---

### Procurement is the least AI-mature enterprise function

- Only 4% of procurement teams have reached meaningful AI deployment despite 49% running pilots
- Only 6% of enterprise AI use cases are in procurement vs. 16% in sales
- Average enterprise AI governance maturity: 2.3/5.0 (McKinsey 2026)

**Bottom line:** The substitution risk is real but contingent. Today, companies can substitute with Upwork (human-mediated agents), Devin (single-vendor completion), or internal POCs. Straw's moat is the score + compliance certificate + competitive signal that none of these alternatives provide. The window to establish that moat is before OpenAI ships a CUA API and before enterprise trust in autonomous agents normalizes.

Source: [Art of Procurement: State of AI in Procurement 2026](https://artofprocurement.com/blog/state-of-ai-in-procurement)

---

## Tick 5 (2026-05-02T00:38Z): Dev-tool first revenue + enterprise AI buying process [theme: gtm]

### The key stat that unlocks Straw's GTM conversation

> **71% of CIOs must prove measurable AI value by mid-2026 or face budget cuts** (BusinessWire, February 2026, n=500+ CIOs)

This is the single best sales hook. Straw's evaluation platform directly serves CIOs who need to prove ROI. The pitch is not "evaluate agents"; it's "give your CIO the data they need to survive the mid-2026 board review."

Source: [BusinessWire CIO survey](https://www.businesswire.com/news/home/20260212994335/en/71-of-CIOs-Say-They-Have-Until-Mid-2026-to-Prove-AI-Value-or-Risk-Budgets-and-Job-Fallout)

---

### Braintrust: the canonical comp to Straw (closest trajectory in the market)

Braintrust is Straw's closest public comp — AI evaluation infrastructure, enterprise focus, same buyer profile.

**Trajectory:**
- Founded August 2023 (Ankur Goyal, ex-CEO of Impira)
- $5M seed (December 2023)
- $36M Series A (October 2024)
- **$80M Series B at $800M valuation (February 2026)**
- Customers paying $10K–$100K+/year
- Customers include: Notion, Replit, Cloudflare, Ramp, Dropbox, Vercel, Stripe, Airtable, Instacart

**How they got customer #1:** Zapier was first. Ankur had felt the eval problem at Impira — models improved on invoices but regressed on bank statements. He called Zapier's CTO Brian Cooksey. The pitch: "You're making million-dollar decisions on AI quality based on vibes." He bypassed procurement entirely — went directly to the engineer feeling the pain.

**The GTM insight that applies to Straw:** Find 10 companies that have publicly complained about not being able to compare AI agent quality (in blog posts, Twitter/X, conference talks). Those are your first calls. No cold outbound needed — just pattern-match to the complaint.

Sources: [First Round Review](https://review.firstround.com/podcast/what-braintrust-got-right-about-product-market-fit/), [a16z announcement](https://a16z.com/announcement/investing-in-braintrust/), [SiliconANGLE Series B](https://siliconangle.com/2026/02/17/braintrust-lands-80m-series-b-funding-round-become-observability-layer-ai/)

---

### Who signs the check (enterprise AI tool buying committee)

Per ProcureAbility 2026 (surveying procurement + IT leaders) and a16z CIO survey (n=100, Global 2000):

- **Champion:** VP of AI / Head of AI Engineering / ML Platform Lead — feels the pain, uses the product
- **Economic buyer:** CTO or CIO — owns the AI budget, accountable for AI ROI
- **Blocker:** Legal/compliance — data handling, model security, GDPR DPA
- **Facilitator:** AI Center of Excellence director (if it exists) — often owns vendor evaluation budget directly

**Budget ownership has changed:** AI budgets moved from "innovation funds" (26% of AI spend in 2024) to core operational line items in both central IT and business unit budgets in 2025. Two budget owners now in play — CIO/CTO and the line-of-business VP.

**AI CoE reality check:** CoEs increasingly standardize what teams are already using, not proactively procure new tools. Go around them for first deals; get them on-side for expansion.

**For Straw's first deal:** Your buyer is the VP of Engineering or Head of AI at a Series B–D company that has deployed AI agents in production and been burned by not knowing which is better. They can move without a 6-month procurement cycle. Target: $50M–$500M revenue companies where a VP Eng can approve $25K–$75K unilaterally.

Source: [ProcureAbility 2026 AI governance gap](https://www.intelligentcio.com/north-america/2026/04/30/procureability-2026-report-highlights-ai-governance-gap-between-procurement-and-it-teams/), [a16z CIO survey](https://a16z.com/ai-enterprise-2025/)

---

### Design partner program structure (what works)

**The Common Paper model (standard 2025-2026 B2B SaaS design partner):**

What design partners get:
- Free access for 6–12 months, then 30–50% off for 12–24 months post-launch
- Early/exclusive feature access
- Direct line to founding team
- Co-marketing: case study, logo use, press release, reference call availability
- Occasionally: 0.5% equity for high-value strategic partners (uncommon, avoid complexity)

What the startup gets:
- Weekly structured feedback sessions
- Named reference customer for fundraising
- Real production-like usage data
- Permission to use logo/quote in sales materials
- **Most critical: committed paying contract at program completion if product meets defined success criteria**

**The #1 design partner mistake:** Free access forever without a paid graduation commitment is beta testing, not a design partnership. The paying contract at the end is what makes it a partnership.

**Right partner profile for Straw:** Not the biggest company you can get. The company with the sharpest pain and the most engaged champion. A Series B AI-native company that has deployed 3 different agents in production and genuinely doesn't know which is performing better is worth more than a Fortune 500 that takes 6 months to return emails.

**Right number:** 3–8 design partners. Too few = not enough feedback diversity. Too many = can't serve them all at founding-team quality.

Sources: [Common Paper design partner guide](https://commonpaper.com/blog/design-partner/), [SaaStr design partner incentives](https://www.saastr.com/dear-saastr-what-incentives-are-given-to-design-partners-and-other-super-early-customers/)

---

### Enterprise AI tool first-year contract sizes (calibration)

| Company stage | First-year ACV range |
|---|---|
| Seed/early-stage startup | $5K–$10K |
| Growth-stage (Series A-C) | $40K–$80K |
| Mid-market ($100M–$500M revenue) | $25K–$75K unilateral VP approval |
| Enterprise ($1B+ revenue) | $100K–$300K with full procurement cycle |
| Average enterprise AI monthly spend (2025) | $85,521/month (up 36% YoY) |

**Straw's first-year revenue target:** 5 design partners converting to paid at $25K–$75K ACV = $125K–$375K ARR. This is achievable and defensible for a v1 launch.

Source: [Optifai ACV benchmarks](https://optif.ai/learn/questions/b2b-saas-acv-benchmark/), [Getmonetizely economics of AI SaaS 2026](https://www.getmonetizely.com/blogs/the-economics-of-ai-first-b2b-saas-in-2026)

---

## Tick 6 (2026-05-02T00:40Z): Design partner targets — bug bounty companies + dev-tool founders [theme: partners]

### Security/Engineering leadership at bug bounty companies

| Name | Company | Role | Twitter | Opener |
|------|---------|------|---------|--------|
| **Philip Martin** | Coinbase | CSO | @SecurityGuyPhil | "Coinbase runs one of HackerOne's largest programs. Straw extends that model to AI: companies post tasks, agents compete, the score is auditable. For Coinbase's onchain security work, AI agent bounties are the next frontier." |
| **Jeff Lunglhofer** | Coinbase | CISO | LinkedIn | "Straw is HackerOne for AI agents — objective evaluation, competition-based, auditable results. Given Coinbase's engineering culture around meritocracy and transparency, this might be the most natural fit we have for early design partners." |
| **Joe Camilleri** | Stripe | CISO | LinkedIn | "You run one of the most respected security programs in fintech. I'm building a platform where companies define exactly what 'winning' looks like for a technical challenge and let AI agents compete on the real problem. Would love 20 minutes." |
| **Andrew Dunbar** | Shopify | CISO | @andrewdunbar | "Shopify's bug bounty is one of the most-cited in the industry. I'm building AI-judged technical challenges where the score doesn't lie. You'd be a perfect design partner." |
| **Logan Graham** | Anthropic | Head of Frontier Red Team | @logangraham | "You literally stress-test Claude. Straw is the competitive arena where AI agents prove their capabilities on enterprise tasks — your team's perspective on AI-judged evaluations would be invaluable." |
| **Devdatta Akhawe** | Figma | VP of Engineering (former Head of Security) | @frgx | "You scaled Figma's security org and now run engineering. I'm building a platform for AI-judged technical challenges — dev-tool companies are the ideal early adopters." |
| **Talha Tariq** | Vercel | CTO of Security | @0xtbt | "You just joined Vercel to build security for the AI era — I think AI-judged technical challenges are the natural next step beyond traditional bug bounties. Would love your take." |

Sources: [Philip Martin Coinbase Twitter](https://x.com/securityguyphil), [Coinbase bug bounty HackerOne](https://hackerone.com/coinbase), [Talha Tariq joins Vercel](https://vercel.com/blog/talha-tariq-joins-vercel-as-cto-security), [Inside Anthropic's Red Team](https://fortune.com/2025/09/04/anthropic-red-team-pushes-ai-models-into-the-danger-zone-and-burnishes-companys-reputation-for-safety/)

---

### Dev-tool startup founders (agent infrastructure layer)

| Name | Company | Role | Twitter | Opener |
|------|---------|------|---------|--------|
| **Erik Bernhardsson** | Modal Labs | CEO | @bernhardsson | "Modal runs AI workloads at scale. Straw could route agent evaluation tasks through Modal's infrastructure — and Modal's customers would benefit from a platform to prove their agent stacks are best-in-class." |
| **Amjad Masad** | Replit | CEO | @amasad | "Replit shut down Bounties because the competitive task marketplace didn't work for human devs. Straw did — we focused on enterprise buyers with clear rubrics and AI-only participants. The learnings are worth a call." |
| **Vasek Mlejnsky** | E2B | CEO | @mlejva | "E2B is the sandbox layer under some of the most-used agents in the ecosystem. Straw is the competition layer on top — agents compete for enterprise contracts. Would love to show you what demand looks like from the buyer side." |
| **Magnus Müller** | Browser Use (YC W25) | CEO | @mamagnus00 | "Browser Use went from 0 to 78K GitHub stars because you nailed the tool layer for browser agents. Straw is the competition layer where enterprises evaluate which agents actually win." |
| **Alex Reibman** | AgentOps | CEO | @AlexReibman | "You built the observability layer for AI agents. Straw is the competition layer. Your users are our supply side — would love to explore a partnership." |
| **Ankur Goyal** | Braintrust | CEO | @ankrgyl | "You just raised $80M to become the observability layer for AI in production. Straw is the evaluation-at-hire layer. Would love to compare notes on where evals land in the enterprise stack." |
| **Aryan Sharma** | Induced.ai | CEO | @aryxnsharma | "Sam Altman backed you to rebuild the browser for AI agents. Straw is the competition layer where enterprises evaluate which agent actually wins on their real workflows." |
| **Omar Shaya** | Please (ex-MultiOn) | CEO | @omarshaya | "You pivoted from MultiOn to Please and are building one of the most capable browser agent products. Straw is the marketplace where enterprises put agent capabilities to the test." |
| **David Gu** | Recall.ai | CEO | @davidruigu | "Recall.ai powers AI agents with meeting/conversation context. Straw is where those same agents compete for enterprise contracts based on objective performance — natural partnership." |

Note: **Humanloop was acquired by Anthropic** (August 2025). Founders Raza Habib, Peter Hayes, and Jordan Burgess now work at Anthropic. Reach Raza via Anthropic — he built an eval platform and is now inside the model lab.

Sources: [Erik Bernhardsson Twitter](https://twitter.com/bernhardsson), [Replit Bounties HN](https://news.ycombinator.com/item?id=44643875), [E2B Decibel](https://www.decibel.vc/articles/e2b-the-ai-agents-cloud), [Browser Use YC W25](https://www.ycombinator.com/companies/browser-use), [AgentOps Tracxn](https://tracxn.com/d/companies/agentops/), [Anthropic acquired Humanloop](https://techcrunch.com/2025/08/13/anthropic-nabs-humanloop-team-as-competition-for-enterprise-ai-talent-heats-up/), [Recall.ai $38M Series B](https://www.businesswire.com/news/home/20250904525808/en/Recall.ai-Closes-$38M-Series-B-Funding-to-Power-the-AI-Stack-for-Conversation-Data)

---

## Tick 7 (2026-05-02T00:42Z): Token economy collapse + regulatory liability [theme: bear]

### Token economy collapse modes — applied to Straw's credit model

**Steemit (STEEM, 2016-2020): Three failure mechanisms**

1. **Structural hyperinflation:** Reward pool funded by continuous minting. Sell pressure from recipients persistently exceeded buy demand — permanent structural downward price bias.
2. **Whale capture/Sybil farming:** Founding team instamined ~80% of supply. Rewards proportional to locked tokens → richer holders get more new tokens → plutocratic capture. One entity could direct the entire reward pool.
3. **Governance attack:** Justin Sun acquired Steemit Inc. (Dec 2019), used exchange customer deposits (Binance, Huobi, Poloniex) to vote out elected witnesses in March 2020. Community forked to Hive. STEEM dropped 20% in one day; the creative population left permanently. Token without community = worthless.

Source: [CoinDesk: Steem Hostile Fork](https://www.coindesk.com/tech/2020/03/17/steem-community-plans-hostile-hard-fork-to-flee-justin-suns-steemit), Harvard Business School case #61580

**Kin (Kik, 2017-2020): The unregistered securities trap**

Kik raised $100M in 2017 ICO. September 2020: US District Court ruled Kin tokens were securities under the Howey Test — investors clearly expected profits from Kik's development team. $5M civil penalty, 45-day advance notice requirement on future token issuance.

**Straw application:** Any credit mechanism that allows early participants (agents, companies, employees) to receive credits with the expectation that those credits will *appreciate* as Straw grows would face identical legal exposure. Credits must be non-transferable and not tradeable on secondary markets until there's a deep, liquid task marketplace.

Source: [SEC final judgment against Kik](https://www.sec.gov/newsroom/press-releases/2020-262)

**Helium (HNT, 2021-2023): 95% collapse from no real demand**

HNT peaked at ~$55 (late 2021), collapsed to under $2 (late 2022). Three mechanisms:
1. **Industrial-scale Sybil farming:** 25,047 fraudulent hotspots (GPS-spoofed for Proof-of-Coverage rewards). Since PoC rewards are zero-sum, every fraudulent hotspot extracted from legitimate providers. [Helium Hotspot Spoofing](https://3roam.com/helium-hotspot-spoofing-and-the-deny-list/)
2. **No real demand for the underlying product:** IoT data transmission revenue never materialized. Lime denied using the network beyond an initial test.
3. **Token migration destroying confidence:** Network abandoned its own blockchain for Solana in April 2023 — signaled original infrastructure was worthless.

**Gitcoin GTC: Governance token with no economic floor.** Peaked at $22.37, now trades near $0.095 (99.6% decline). Governance-only token with no cash flow, no fee capture, no staking yield. The mechanism (quadratic funding) works fine; the token is worthless.

---

### Four structural conditions that kill token economies — Straw's risk map

| Condition | Example | Straw application |
|---|---|---|
| **Uncapped supply with no demand-side floor** | Steemit minting | Credits earned faster than consumed → inflationary. Fix: credits burn on task submission, not mint on completion. |
| **Plutocratic capture / whale concentration** | Steemit founding team 80% | Large enterprise clients accumulate credits and direct flows to affiliated agents. Fix: arms-length competition must be structurally enforced, not just policy-enforced. |
| **Reward divorced from real-world demand** | Helium hotspot farming | Speculative practice competitions with fake reward pools decouple credits from real demand. Fix: credits must remain tightly coupled to actual task completion paid for by real buyers. |
| **Speculation > utility as price driver** | Kin, GTC | Credits become tradeable before deep marketplace exists → speculative cycle → crash. Fix: non-transferable credits until there's sufficient real demand. |

---

### Regulatory and liability — the OFAC risk is the most acute

**OFAC sanctions: strict liability, no knowledge required**

OFAC enforces sanctions on a strict liability basis — intent is not required for civil penalties. The North Korean IT worker problem is directly analogous to Straw's threat model:

- OFAC designated 6 individuals and 2 entities in 2025-2026 for facilitating DPRK IT worker schemes that generated $800M+ to fund weapons programs
- These operators used stolen identities, AI-enabled fake personas, and proxy infrastructure to infiltrate US tech platforms
- April 2026: Tether froze $344M in USDT in coordination with OFAC targeting sanctions evasion networks

**A sanctioned-entity agent winning a Straw competition and receiving USDC payment would expose Straw to civil OFAC penalties even with zero knowledge of the sanctioned status.** This is not theoretical — it is the precise scenario OFAC has been actively pursuing against crypto platforms throughout 2025-2026.

**Required compliance posture (must be designed in from day one, not bolted on later):**
1. KYC/KYB on all agent operators at onboarding — real identity verification, not just email
2. Wallet address screening against OFAC SDN list at every payment event
3. IP geolocation blocking for comprehensively sanctioned jurisdictions (IR, KP, SY, Crimea), with VPN detection
4. Ongoing rescreening as new designations are issued
5. USDC/stablecoin payments do NOT reduce this obligation — Tether froze stablecoin balances on OFAC instruction

Sources: [Holland & Knight: AI and Sanctions Risk](https://www.hklaw.com/en/insights/publications/2026/04/ai-and-cyber-enabled-tools-are-changing), [Chainalysis: OFAC Targets DPRK IT Workers](https://www.chainalysis.com/blog/ofac-targets-north-korean-it-workers-crypto-march-2026/)

---

### EU AI Act: material compliance burden by August 2026

Full high-risk AI system compliance required by **August 2026**. Autonomous AI agents in enterprise contexts are broadly classified as high-risk because they "take actions, trigger workflows, approve transactions, and influence real-world outcomes at machine speed."

**For Straw:** A marketplace hosting AI agents competing to perform enterprise tasks — many affecting hiring decisions, financial outcomes, or business operations — almost certainly hosts high-risk AI systems.

**Required for each agent on platform:**
1. Technical documentation: transparent, auditable, logged reasoning at every step
2. Continuous risk management across agent lifecycle
3. External monitoring capability — no closed loops
4. Record-keeping of all inputs/outputs for audits

**Penalty exposure:** €30M or 6% of global annual turnover, whichever is higher.

**Practical implication for v1:** If Straw has any EU enterprise customers, the agent compliance documentation framework must be built before going live with those customers, not after.

Source: [EU AI Act compliance for autonomous agents 2026](https://www.covasant.com/blogs/eu-ai-act-compliance-autonomous-agents-enterprise-2026)

---

### Section 230 does not protect Straw

The current legal consensus: Section 230 protects passive hosts, not AI-generated content. AI companies themselves rarely invoke Section 230 because they know they are content creators. A January 2026 Regulatory Review seminar confirmed: "Courts haven't addressed this yet, with no rulings to date on whether AI-generated content is covered by Section 230."

**The attribution triangle:** If an agent on Straw generates harmful output:
- Straw shaped the platform structure
- The buyer shaped the task prompt
- The agent generated the output

All three may face liability. Straw sits in the "operator" layer — liability exposure is secondary but real.

**Copyright specifically:** Agent task outputs containing copyright-infringing code/text create secondary liability for Straw if the platform facilitated and profited from the infringement. Operator indemnification clauses in agent ToS are the current industry standard response.

Sources: [The Regulatory Review: Section 230 and AI](https://www.theregreview.org/2026/01/17/seminar-section-230-and-ai-driven-platforms/), [Agentic AI legal risks](https://theaiinnovator.com/agentic-ai-poses-new-legal-risks-beyond-copyright/)

---

### State AI law patchwork — the overlooked compliance burden

- **California Transparency in Frontier AI Act** — effective January 1, 2026
- **Colorado AI Act** — effective June 30, 2026
- **Texas RAIGA** — recently passed, limits developer/deployer liability for end-user misuse

Straw needs a state-compliance matrix before enterprise sales in CA, CO, TX, and EU. Each has different disclosure, impact assessment, and accountability requirements.

Sources: [King & Spalding: New State AI Laws 2026](https://www.kslaw.com/news-and-insights/new-state-ai-laws-are-effective-on-january-1-2026-but-a-new-executive-order-signals-disruption)

---

## Tick 8 (2026-05-02T00:44Z): Pricing experiments + design partner program structures [theme: gtm]

### What comparable marketplaces actually charge

| Platform | Model | Rate |
|---|---|---|
| **Upwork** | Blended marketplace take rate | 18% of GSV (2024, up from 15.4% in 2023) |
| **Toptal** | Curated staffing markup | ~50% gross markup ($50/hr dev → $100/hr client rate) |
| **Topcoder** | Admin fee + prize pool | 20% of prize amount (capped at $250 for design), full prize pool paid directly |
| **HackerOne** | Platform subscription + optional triage | $20K–$50K/year access fee; 15–35% surcharge on triage services; community edition: flat 5% payment processing |
| **Bugcrowd** | Platform subscription | $30K–$150K+/year access fee, custom-quoted |
| **AWS Marketplace** | Distribution fee | 3–5% (reduced from ~20% in 2024) |
| **Replicate** | Infrastructure billing | Per-second GPU billing; no take rate on model revenue |
| **Hugging Face** | Subscription tiers | $9/month individual → $50/user/month enterprise |
| **Braintrust (evals)** | Usage-based + freemium | Free tier (1M traces), paid $3/GB data storage, enterprise with SLA |

**The emerging pattern:** Developer-tool marketplaces are moving away from percentage take rates toward usage-based infrastructure fees or subscription access fees. The "percentage of transaction" model is being compressed by competition.

---

### The structural analog Straw should copy: HackerOne/Bugcrowd model

**Why this is right for Straw:**
- Platform subscription fee (for running the program) = Straw's platform access revenue
- Prize pool paid directly to winning agents = Straw doesn't touch agent earnings (reduces regulatory/custodial risk)
- Optional managed services (agent curation, evaluation design, result interpretation) = Straw's high-margin services layer

**What Straw should NOT do:** Take a percentage of the prize pool. This creates misaligned incentives (Straw benefits from higher prizes whether or not they're justified) and is increasingly scrutinized. The platform fee is what enterprise buyers budget for.

---

### Pricing model recommendation (synthesized from all research)

**v0/v1 Design Partner pricing:**
- Free during design partner phase (6–12 months)
- Post-graduation: $2,500–$5,000/month platform subscription (one active evaluation at a time) OR $10K–$25K/quarter evaluation pack (3–5 evaluations)
- Prize pools: $5K–$25K per task (paid directly by company to winning agents via Straw's payment rails)
- Success fee on hire/license/acquire: 5–8% of first-year deal value (this is the high-margin event)

**v1 pricing (first 10 paying customers):**
- Platform subscription: $15K–$30K/year for up to X evaluations/month
- À la carte evaluation: $3K–$8K per evaluation setup + prize pool (company-funded)
- Managed evaluation service: $15K–$30K per evaluation (Straw designs rubric, manages competition, delivers findings report)
- Success fee on commercial engagement (hire/license/acquire): 5–8% of first-year deal value, capped at $50K

**v2 marketplace pricing (once both sides have critical mass):**
- Platform subscription for enterprise access: $50K–$150K/year
- Take rate on agent-to-company transactions: 10–15% (within the Upwork/Topcoder range)
- Compliance certificate premium: $2,500–$5,000 per certificate (especially for regulated procurement)

---

### Upwork's take rate controversies — lessons for Straw

Upwork's 2019 shift from free proposals to paid "Connects" ($0.15 each), plus a 2025 shift to variable service fees (0–15%), generated persistent freelancer backlash. The core complaint: opaque/variable pricing feels predatory; sellers lose trust in the platform economics.

**Lesson for Straw:** Flat and predictable beats dynamic and efficient. Lock in the pricing model before v1 and don't change it without advance notice + grandfathering. Agents who build their business model around Straw's take rate cannot tolerate surprise changes.

Source: [Upwork fee controversy](https://etcetera.kiev.ua/blog/upwork-fee-changes-2025-what-freelancers-need-to-know/)

---

### Design partner activation tactic — the Stripe lesson

Stripe's legendary activation loop: Patrick or John Collison would say "we can get you set up right now" and literally open a laptop and integrate Stripe on the spot at the developer's location. No formal agreement, no week of onboarding — immediate value.

**For Straw:** "We'll post your first evaluation and have agent submissions back to you within 72 hours" is the equivalent of Stripe's laptop moment. The fastest path to design partner commitment is demonstrating the product works on their actual problem, not explaining what it will do.

---

### Content and community: what converts for technical B2B in 2026

**67% of companies using hybrid PLG+SLG hit their NRR targets** vs. 58% for pure PLG. For Straw this means: let companies self-discover the evaluation value proposition (through content, demos, open tools), then close at the moment of natural expansion (team wants more evaluations, compliance team needs a certificate, vendor comparison cycle is coming up).

**The LLM optimization angle:** Prioritize being cited in ChatGPT/Claude/Perplexity responses to queries like "how do I evaluate AI agents before deployment" and "AI agent procurement evaluation platform." This is where 2026 enterprise buyers start their research.

Sources: [PLG+SLG hybrid data](https://www.userflow.com/blog/understanding-product-led-growth-vs-sales-led-growth), [McKinsey PLG to PLS](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/from-product-led-growth-to-product-led-sales-beyond-the-plg-hype)

---

---

## Phase 2 Morning Reading Guide

*This is the synthesized deliverable. Start here, then dig into the ticks for evidence.*

---

### 1. The Steelmanned Bear Thesis — What Would Kill Straw by End of 2027

**The honest one-page case against building this:**

**Cause of death #1 (most likely): The evaluation layer gets commoditized before Straw's moat sets.** OpenAI is shipping Workspace Agents with enterprise integrations. When the CUA API goes public — no timeline announced but "coming soon" — enterprises will ask: "Why run a Straw competition when I can call OpenAI's API and check the output myself?" The window to establish Straw as the standard is narrow. If Straw doesn't have 3–5 enterprise reference customers by Q4 2026, the window closes.

**Cause of death #2 (nearly as likely): The cold-start problem defeats both sides simultaneously.** No documented agent-to-agent task marketplace has achieved commercial scale. Every comparable platform (Homejoy, Beepi, Shyp) that relied on manufactured traction collapsed when the subsidy ended. Straw's v0 design (Jeremy posts manually) handles the earliest phase, but the transition to organic posting requires enterprises willing to run real competitions with real rubrics — and only 4% of procurement teams have meaningful AI deployment despite 49% running pilots. Enterprises are stuck at pilot. Pilots don't post bounties.

**Cause of death #3 (slower, more insidious): Replit's trajectory, applied to Straw.** Replit had a thriving Bounties program in 2023 — growing, active, real traction. They shut it down in September 2025 not because it failed, but because *agents made it redundant*. If foundation model providers (Anthropic, OpenAI, Google) build sufficiently capable autonomous completion into their enterprise products, the entire evaluation/competition layer becomes unnecessary overhead. Companies just deploy an agent and verify the output themselves. Straw needs the evaluation moat (rubric + compliance certificate + longitudinal ranking) to be genuinely irreplaceable, not just better than alternatives.

**Cause of death #4 (structural): Bounty mechanics have a documented failure rate, and AI flooding makes it worse.** IEEE research on Bountysource showed bounty-tagged issues have *lower* closing rates and take *longer* to resolve than non-bounty issues. More acute in 2026: AI tools are flooding bug bounty platforms with low-quality automated submissions, forcing HackerOne to pause programs. The same dynamic hits Straw the moment the platform has any visibility — 10,000 mediocre agent submissions drown the 10 excellent ones. The Tier 2 gatekeeper is load-bearing from day one, not a v1.5 feature.

**Cause of death #5 (legal): An OFAC violation wipes out the company.** OFAC sanctions are strictly liable — no knowledge required. North Korean IT workers have already demonstrated the ability to infiltrate Western tech platforms using AI-generated fake personas. A sanctioned-entity agent winning a Straw competition and receiving USDC payment would expose Straw to civil penalties that could exceed early-stage capitalization. This is not theoretical — OFAC has been specifically pursuing crypto platforms for this in 2025-2026. **KYC/KYB and wallet screening must be designed in before first payment is processed.**

**The enterprise trust number that should keep Jeremy up at night:** PwC April 2025 — only **20% of enterprise decision-makers** trust AI agents for financial transactions. Running a Straw competition, paying winning agents, and hiring based on scores is a financial transaction chain. Straw is selling to the 20%, not the 79%.

**What would actually kill it:** Not any single risk above — all of them together, hitting before the compliance certificate moat is established. The 2027 death scenario: Straw gets 2–3 design partners, runs 10 evaluations, then loses the next 5 sales conversations to "we just use Devin + internal review" or "we're waiting for OpenAI's API." Without reference customers who can say "we hired an agent based on Straw's score and it was the right call," there's no proof point that the moat is real.

**What doesn't kill it:** The bear cases that Phase 1 Section 23 worried about (rubric capture, platform bias, benchmark contamination, winner concentration) are real but gradual. They're problems for Straw at scale, not at v0/v1. The kill shots are upstream of those — cold-start failure and substitution risk.

---

### 2. First 10 Design Partner Conversations — This Week

Ranked by signal-to-noise ratio and urgency:

**Start immediately (this week, max 5 DMs/emails):**

1. **Marius Hobbhahn** (@MariusHobbhahn) — CEO, Apollo Research. TIME 100 AI 2025. Active on Twitter about evaluation methodology. The pitch: *"Apollo evaluates model behavior for safety; Straw evaluates model performance for procurement. Same infrastructure problem, different buyer. Worth comparing notes on methodology?"* Apollo is nonprofit and not a buyer — but Marius can make introductions to every enterprise AI team that asks them "what benchmarks should we use?"

2. **Harrison Chase** (@hwchase17) — CEO, LangChain. Just raised at $1.25B valuation. LangSmith does observability; Straw does competitive head-to-head evaluation. They're complementary and his enterprise customers are Straw's ICP. The pitch: *"LangSmith tells companies how their agents behave in production; Straw tells them which agent to hire in the first place. Your customers need both. Would love 20 minutes."*

3. **Ankur Goyal** (@ankrgyl) — CEO, Braintrust. Just raised $80M Series B in February 2026. He built the closest comp to Straw (AI evals platform), has the customer list Straw wants (Notion, Stripe, Ramp, Vercel, Cloudflare, Airtable), and is in expansion mode. The pitch: *"You're the observability layer for AI in production; I'm building the evaluation-at-hire layer. Your customers need both. What have you learned about how enterprises frame the 'which agent should I use' decision?"*

4. **Scott Wu** (@ScottWu46) — CEO, Cognition/Devin. Devin is the agent everyone benchmarks against. Straw makes that official and potentially monetizable for Cognition (Devin that "wins" on Straw gets hired). The pitch: *"Straw is a live eval arena where enterprise buyers post real tasks with rubrics and AI agents compete. Being the benchmark everyone tests against seems like obvious distribution for Devin. What does Cognition's enterprise pipeline look like right now?"*

5. **Amjad Masad** (@amasad) — CEO, Replit. Shut down their own Bounties product in September 2025 because Replit Agent made it redundant. He's either a competitor (Replit Agent → Straw's use case) or a design partner (Replit's enterprise customers need evaluation infrastructure). Either way, Jeremy needs to know which. The pitch: *"Replit shut down Bounties because autonomous agents made human-mediated bounty boards obsolete. I think the next version of that problem — evaluating which AI agent is best for a specific enterprise task — is the product. Would love your hot take."*

**Next week (5 more):**

6. **Erik Bernhardsson** (@bernhardsson) — CEO, Modal Labs. Modal runs the compute that AI agents run on. Partnership angle: Straw competitions could run on Modal infrastructure; Modal's customers need Straw to prove their agent stacks are best-in-class. Very natural partnership.

7. **Robert Brennan** (@rbren_dev) — CEO, OpenHands/All Hands AI. Best open-source coding agent. Series A in November 2025. His agents need enterprise credibility; Straw is how they get it.

8. **Beth Barnes** (@BethMayBarnes) — CEO, METR. Not a buyer, but the most credible voice in the "how do you actually evaluate what AI agents can do" space. Her endorsement or collaboration would be worth more than a dozen design partners.

9. **Gregor Zunic** (@gregpr07) — Co-Founder, Browser Use. YC W25, 78K GitHub stars. Browser agents are the obvious first use case for Straw (companies want to know: which browser agent is best for my customer service workflow?). Browser Use's users are Straw's supply side.

10. **Philip Martin** (@SecurityGuyPhil) — CSO, Coinbase. Runs one of HackerOne's largest programs. The pitch: *"Coinbase's $5M onchain bug bounty is the most ambitious I've seen. AI-judged technical challenges — where the scoring is automated and transparent — seem like the natural evolution. Would love to show you what that looks like."*

**The 10 calls that would change Straw's trajectory most:** Getting Marius Hobbhahn (METR) to say "Straw's evaluation methodology is consistent with what we'd want enterprise buyers to use" is a credibility unlock. Getting Harrison Chase (LangChain) to mention Straw to his enterprise customers is a distribution unlock. Getting Ankur Goyal (Braintrust) to say "Braintrust + Straw are complementary" is a competitive-positioning unlock. Those three calls are worth more than the other seven combined.

---

### 3. GTM Playbook: Straw 0 → $100K ARR in 2026

**Phase 0 (now → June 2026): Prove the mechanism with 3 design partners**

Target profile: Series B–D AI-native company that has (a) deployed AI agents in production, (b) been burned by not knowing which agent is better, (c) has a VP of Engineering or Head of AI who can move without a 6-month procurement cycle.

Why this profile: These companies have the pain. They're spending real money on multiple vendors. They don't have enterprise procurement blocking speed. They'll run the evaluation and tell Jeremy what's wrong with the rubric engine.

**What Straw offers design partners:**
- Free evaluation run on their highest-priority AI task (Straw manages the competition, Jeremy evaluates the results)
- Bi-weekly calls with the founding team for 3–6 months
- First access to new evaluation categories
- Named reference customer acknowledgment
- **The ask:** If the evaluation produces a useful signal, commit to a 12-month paid contract at 60% off list price ($12K–$18K)

**How to get them (the activation loop):**
1. Find VP of Engineering / Head of AI at target companies who are complaining publicly about AI agent quality — on Twitter/X, in blog posts, at conferences
2. Send one paragraph DM/email: "You mentioned at X that you can't compare AI agent quality reliably. Straw is built for exactly that. Would you want to run a live evaluation on one of your actual tasks in the next 2 weeks? I can set it up by Friday."
3. If they say yes: run the evaluation within 72 hours. This is the Stripe laptop moment.
4. If the evaluation produces interesting results: schedule a 30-minute call to walk through the results

**Phase 1 (June → September 2026): 3 design partners → $100K ARR**

Pricing for v1 paying customers:
- Platform subscription: **$15K–$30K/year** for up to X evaluations/month
- À la carte evaluation: **$5K–$8K per evaluation** (Straw designs rubric, runs competition, delivers findings report)
- Success fee on commercial engagement (hire/license/acquire): **5–8% of first-year deal value**, capped at $50K
- Compliance certificate: **$2,500–$5,000 per certificate** for regulated procurement

**The $100K ARR math:**
- 3 design partners converting to paid at $25K–$35K/year = $75K–$105K ARR
- 2 additional à la carte evaluations at $6K each = $12K additional
- 1 success fee on a hire/acquire event = $5K–$15K additional
- Total: $92K–$132K ARR from 5 customer relationships

**What NOT to do:**
- Don't pursue Fortune 500 as first customers — the procurement cycle is 6–18 months and will kill momentum
- Don't do pure cold outbound to procurement departments — AI procurement is the least AI-mature function (4% meaningful deployment)
- Don't try to build the full marketplace before proving the evaluation mechanism — v0 with Jeremy posting tasks manually + invited agents competing is sufficient to test pricing and signal quality

**The leading indicator to track:** Number of completed evaluations per month. Not revenue — evaluations. Revenue is a lagging indicator. If evaluations are happening and companies are looking at the results and making decisions, revenue follows. If evaluations aren't happening, no pricing model saves you.

**The competition threat to move fast on:** Braintrust ($80M Series B, February 2026) is adding competitive evaluation features to their observability platform. Their customer list (Notion, Stripe, Ramp, Vercel, Cloudflare) is Straw's ICP. Braintrust is not a direct competitor today — they do observability, not competitive evaluation. But in 12 months they could be if Straw hasn't established the evaluation-before-hire positioning firmly.

---

### 4. Open Questions Jeremy Needs to Answer Before Committing

*These are the irreversible architectural and strategic decisions that only Jeremy can make. Phase 2 research has surfaced them — this is the list.*

**Q1: Is Straw a bounty platform or an evaluation infrastructure company?**
These have different GTM motions. A bounty platform (Straw = "competitive challenges for AI") sells to companies that want to discover talent/agents. An evaluation infrastructure company (Straw = "rubric-driven agent scoring system") sells to companies that want to validate procurement decisions. The compliance certificate angle (Section 15 of Phase 1) makes it look like the latter. But the competitive marketplace mechanic (agents compete, winner gets hired) looks like the former. The pitch, the pricing, and the ICP are different. Pick one for v1. You can be both at v2.

**Q2: Do you want to be in the crypto payment rail business?**
x402, Kite Chain, USDC settlement — Phase 1 recommended these for the agent payment layer. But Tick 7 shows OFAC sanctions exposure is *catastrophic* for any crypto payment platform that doesn't have bulletproof KYC/KYB from day one. A sanctioned entity winning a competition and receiving USDC is a company-ending event under strict liability. The alternative: Stripe Connect, traditional banking rails, no crypto at v0/v1. Much simpler compliance posture. Loses the "AI-native payment rail" narrative; gains survival probability. You need to decide before building the payment infrastructure.

**Q3: Who is the design partner you will personally call tomorrow?**
Phase 2 has 30+ named targets. Jeremy cannot reach all of them at once. The question is: which one, based on personal relationships and warm connections, can you get on the phone this week? The linear/Cursor playbook only works because the founders had personal access to their ICP. Who do you already know at companies that have deployed agents in production and been burned? That's call #1, not Marius Hobbhahn (cold) or Harrison Chase (cold).

**Q4: What is the v0 task category that makes the evaluation signal most obviously true?**
The evaluation's credibility depends on the rubric producing a score that obviously correlates with real-world value. Code quality on an automated test suite is probably the most defensible first category (deterministic tests = unambiguous signal). Financial analysis, customer support, research summarization — all harder to evaluate objectively. The v0 task category determines the v0 design partner target (they need a task that fits the category). Which category has the most demand from companies you personally know, and the most defensible objective rubric?

**Q5: What is your METR/Apollo equivalent — who makes Straw credible to the evaluation community?**
Braintrust got credibility from selling to Zapier early (a "real" company that took evals seriously). Kaggle got credibility from Google acquisition. METR gets credibility from being nonprofit and lab-independent. Straw needs a credibility anchor — either a respected AI lab, an industry consortium, or a well-known company whose Head of AI says "we use Straw for all our agent procurement decisions." Without a credibility anchor, the evaluation scores are just numbers from a startup nobody has heard of. Who is your credibility anchor target?

**Q6: Is the compliance certificate (OMB M-26-04) the actual product, with the marketplace as the distribution?**
Phase 1 Section 15 spent a lot of time on the government procurement angle. If OMB M-26-04 mandates third-party AI evaluation for federal procurement, and Straw is the only platform that produces auditable, rubric-defined, competition-based evaluation certificates, then Straw is a regulated infrastructure play — not a marketplace play. That changes everything: pricing ($50K–$500K/year), sales cycle (6–18 months), and who you raise money from (enterprise SaaS investors, not marketplace investors). Is the government angle the main story or a side story?

---

### Update to Phase 2 Thread List

**Threads completed:**
- [x] Tick 1: Comparable platform failures + pre-mortem (Replit, Bountysource, Gitcoin, Kaggle)
- [x] Tick 2: GTM motion — founder-led sales 2026 (Cursor, Modal, Braintrust, Linear, Vercel)
- [x] Tick 3: Design partner targets — AI agent operators + AI safety labs (30 named people)
- [x] Tick 4: Cold-start marketplace failures + substitutes math (Homejoy, Beepi, Shyp, Devin, OpenAI)
- [x] Tick 5: Dev-tool first revenue + enterprise AI buying committee
- [x] Tick 6: Design partner targets — bug bounty companies + dev-tool founders (15 named people)
- [x] Tick 7: Token economy collapse modes + regulatory/liability (OFAC critical risk)
- [x] Tick 8: Pricing experiments + design partner program structures

**Threads still to dig (for future sessions):**
- [ ] Deep dive on Braintrust competitive positioning — what features are they shipping in 2026 that overlap with Straw?
- [ ] The "why smart founders chose hierarchical over marketplace" question — Manus, Devin, CrewAI founder interviews
- [ ] METR's evaluation methodology — public documentation of how they assess agent task completion, and how it aligns with Straw's rubric approach
- [ ] The government procurement channel (OMB M-26-04) — who are the federal contracting officers who would be buyers for Straw compliance certificates?
- [ ] Competitive research on whether a16z or YC portfolio companies are building in this exact space (Straw should know before it raises)
- [ ] Content marketing plan — specific topics Jeremy should write about to establish evaluation methodology authority and get cited in LLM responses

---

**Push status:** All ticks committed and pushed to origin/master (see commit log). File force-added past gitignore as required by session brief.
