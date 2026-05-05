# Phase 2 Key Facts — Bear Case, GTM, Design Partners

**Source:** `tasks/straw-bear-case-and-gtm-2026-05-01.md` (1,397 lines, 12 ticks)
**Read time:** 10 min. Goal: know what to act on tomorrow.

---

## 1. BEAR THESIS — The 5 Most Credible Death Scenarios

### #1: Foundation models commoditize the eval layer before Straw's moat sets
- **Claim:** When OpenAI ships the CUA API publicly, enterprises will run agents directly and verify output themselves — no competition needed.
- **Evidence:** Replit shut down Bounties Sept 2025 not because it failed, but because Replit Agent made it obsolete (ARR jumped $10M → $144M). OpenAI Workspace Agents (free through May 6, 2026) integrates Slack/Salesforce/Notion. CUA API "coming soon."
- **Falsifier:** 3–5 enterprise reference customers by Q4 2026 saying "we hired an agent based on Straw's score and it was the right call."

### #2: Cold-start defeats both sides simultaneously
- **Claim:** No agent-to-agent task marketplace has reached commercial scale; manufactured traction collapses when subsidy ends.
- **Evidence:** Homejoy ($38M), Beepi ($150M), Shyp ($62M), Quibi ($1.76B) all died from this. Only 4% of procurement teams have meaningful AI deployment despite 49% running pilots. Pilots don't post bounties.
- **Falsifier:** 10+ organic (non-Jeremy-seeded) tasks posted in a single month with real prize pools.

### #3: Enterprise trust gap is structural, not solvable by good UX
- **Claim:** Only 20% of C-suite trust AI agents for financial transactions (PwC). 88% of agent pilots fail to graduate to production (Forrester). Straw's whole flow IS a financial transaction chain.
- **Evidence:** Gartner predicts >40% of agentic AI projects canceled by end of 2027. Trust in agentic AI dropped 89% May→July 2025 (Deloitte TrustID).
- **Falsifier:** First paying customer signs an annual contract within 90 days of a single eval run.

### #4: AI floods the platform faster than Tier-2 gatekeeper can sort
- **Claim:** AI tools are flooding HackerOne with low-quality reports, forcing program pauses. Straw will hit this dynamic the moment it has visibility — 10,000 mediocre submissions drown 10 excellent ones.
- **Evidence:** HackerOne paused IBB. IEEE research: bounty-tagged issues have *lower* close rates than non-bounty.
- **Falsifier:** Tier-2 gatekeeper deployed and demonstrated to filter >85% noise without losing a real winner across 50+ runs.

### #5: OFAC strict-liability extinction event
- **Claim:** A sanctioned-entity agent winning USDC payment exposes Straw to civil penalties exceeding seed capitalization. No knowledge required.
- **Evidence:** OFAC pursued crypto platforms throughout 2025–26. Tether froze $344M in April 2026 in coordination with OFAC. North Korean IT workers using AI personas already infiltrate Western platforms.
- **Falsifier:** KYC/KYB + wallet screening + IP geo-block live before first payment processed. (Or: drop crypto rails entirely, use Stripe Connect.)

### Bonus structural bear (Tick 12): Braintrust adds "Vendor Comparison" in 12–18 months
- $80M Series B Feb 2026, customer list = Straw's ICP (Notion, Stripe, Ramp, Vercel, Cloudflare). Inside-out positioning is different from Straw's outside-in, but they ship a feature; Straw ships a whole product.
- **The 12–18 month moat to build:** outcome corpus + neutrality + compliance certificate.

---

## 2. DESIGN PARTNERS — Top 10 with Honest Read

| # | Name | Handle | Why care | 1-line opener (paraphrased) | Honest read |
|---|------|--------|----------|------------------------------|-------------|
| 1 | **Marius Hobbhahn** (Apollo Research) | @MariusHobbhahn | Eval methodology credibility unlock | "Apollo evaluates safety, Straw evaluates procurement. Same infra, different buyer." | **Polite-no.** Apollo is nonprofit and not a buyer. Pitch is generic — "compare notes on methodology" lands flat from a stranger. He gets dozens of these. Skip unless warm intro. |
| 2 | **Harrison Chase** (LangChain) | @hwchase17 | LangSmith customers = Straw ICP; distribution unlock | "LangSmith does observability; Straw does evaluation-at-hire. Complementary." | **Likely responds, polite-no on partnership.** Harrison is reachable and thoughtful, but LangChain is positioning LangSmith into the same competitive-eval space. Worth a 20-min call for intel; don't expect a deal. |
| 3 | **Ankur Goyal** (Braintrust) | @ankrgyl | Closest comp; just raised $80M | "You're observability-in-prod; I'm eval-at-hire. What have you learned about how enterprises decide?" | **Will respond, will be friendly, will steal the idea.** He's running the same thesis from a different angle. Useful intel call but he is your most likely competitor — be careful what you share. |
| 4 | **Scott Wu** (Cognition/Devin) | @ScottWu46 | Devin is the agent every Straw competitor benchmarks against | "Being the benchmark seems like obvious distribution for Devin." | **Polite-no.** Cognition wants to BE the agent, not be benchmarked against alternatives. The pitch implicitly asks them to expose themselves to losing publicly. They won't. |
| 5 | **Amjad Masad** (Replit) | @amasad | Killed his own bounty product; has the scar tissue | "Replit shut down Bounties because agents made human bounties obsolete. Hot take?" | **Will respond.** Amjad is loud, opinionated, replies to good DMs. Won't be a customer. Will be a useful sounding-board and possible amplifier if he likes the framing. Worth one shot. |
| 6 | **Erik Bernhardsson** (Modal) | @bernhardsson | Compute partnership; his customers are Straw supply | "Straw competitions could run on Modal; Modal customers need to prove agents are best-in-class." | **Will respond.** Erik is reachable, blogs publicly, takes meetings. Not a buyer — a possible infra partner. Real conversation possible. |
| 7 | **Robert Brennan** (OpenHands) | @rbren_dev | Best OSS coding agent; needs enterprise credibility | "Your agents need enterprise credibility; Straw is how they get it." | **Will respond, may say yes.** OpenHands is supply-side, not demand. Useful as agent-pool seed, not as paying customer. |
| 8 | **Beth Barnes** (METR) | @BethMayBarnes | Credibility unlock | "METR evaluates labs, Straw evaluates procurement. Worth 20 min?" | **Likely no response.** Beth is selective; METR has a clear nonprofit mission and limited capacity for commercial-startup conversations. Generic pitch unlikely to break through. |
| 9 | **Aparna Dhinakaran** (Arize) | @aparnadhinak | Posts daily about evals; 70K followers; engaged | "Phoenix evals understands behavior; Straw decides which agent before deployment." | **Highest receptivity in the whole list.** Active on socials, talks evals constantly, Arize's customers ARE Straw's ICP. Real shot at productive conversation. |
| 10 | **Jeffrey Ip** (Confident AI / DeepEval) | @jeffr_yyy | DeepEval = 12K stars, 2M evals/day; users = Straw buyers | "You built the eval infra; Straw is the competition layer on top." | **Likely responds.** YC W25 founder, building adjacent infra, his users feel the procurement pain. Real shot. |

### Skip these (cron hallucinated the fit)
- **Logan Graham (Anthropic Frontier Red Team):** Pitch is "you stress-test Claude" — true, but irrelevant to enterprise procurement. Won't engage.
- **Jack Clark (Anthropic Institute):** Pitch is generic AI-governance posturing. Anthropic Institute is policy, not commercial.
- **Sam Bowman:** Alignment researcher. Has zero to do with procurement.
- **Zac Hatfield-Dodds (Anthropic):** Internal eval lead. Will not respond to "compare notes" from a startup.
- **Adam Beaumont (UK AISI):** Government safety institute. Wrong buyer entirely.
- **Philip Martin / Jeff Lunglhofer (Coinbase CISOs):** Pitch conflates "bug bounties" with "AI agent procurement." They run security programs; AI procurement is a different team. Cold pitch lands wrong.
- **YC W26 founders (Pragya Saboo, Charu Sharma, Oskar Block, Rithvik Vanga, Corvera):** All are themselves selling agents. They're not buyers — they're competitors-on-supply-side. Useful only as agent-pool participants, not design partners.

### The realistic top 5 to actually DM this week
1. **Aparna Dhinakaran** (warmest, most public, most engaged)
2. **Jeffrey Ip** (Confident AI — adjacent, eats the same dog food)
3. **Erik Bernhardsson** (real partnership angle, replies to thoughtful DMs)
4. **Amjad Masad** (one-shot for amplification + scar-tissue intel)
5. **Robert Brennan** (supply-side seed)

---

## 3. GTM PLAYBOOK — 0 → $100K ARR

### Phase 0 (now → June 2026): 3 design partners
**ICP:** Series B–D AI-native company that has (a) deployed agents in prod, (b) been burned by not knowing which is better, (c) VP Eng/Head of AI who can approve $25–75K unilaterally.

**Activation loop (Stripe-laptop equivalent):**
1. Find VP Eng publicly complaining about agent quality.
2. One-paragraph DM: "You mentioned X. I can run a live eval on one of your real tasks within 72 hours. Want it set up by Friday?"
3. Run eval in 72 hours.
4. 30-min results walkthrough.

**Design partner deal:** Free 6–12 months → committed $12–18K/yr (60% off list) on graduation, contingent on success criteria.

### Phase 1 (June → Sept 2026): 3 partners → $100K ARR

**Pricing (verbatim from cron):**
- Platform subscription: **$15K–$30K/year** (up to N evals/month)
- À la carte eval: **$5K–$8K** per eval (rubric design + run + report)
- Managed eval service: **$15K–$30K** per eval (full-service)
- Success fee on hire/license/acquire: **5–8%** of first-year deal value, **capped at $50K**
- Compliance certificate: **$2,500–$5,000** per cert (regulated procurement)

**$100K ARR math:**
- 3 partners × $25–35K/yr = $75–105K
- 2 à la carte evals × $6K = $12K
- 1 success fee = $5–15K
- **Total: $92–132K from 5 customer relationships**

**v2 marketplace (post-PMF):** $50–150K/yr enterprise sub + 10–15% take rate on transactions + $2.5–5K certs.

### Weak assumptions in the GTM math
- **"VP Eng can approve $25–75K unilaterally"** — true at some Series B–D, but the AI buying committee research in Tick 5 says CTO/CIO is the actual economic buyer. Unilateral VP approval is increasingly rare for tools categorized as "AI infra."
- **"5 design partners convert at 60–80% rate"** — typical SaaS design partner conversion is 30–50%. Cron is implicitly assuming 100%.
- **"Success fee on hire/license"** — assumes the company actually hires the winning agent. Cron never models the case where the eval runs, score is produced, and the company says "interesting" and does nothing. This is the *modal* outcome for free trials in enterprise AI.
- **"Stripe laptop in 72 hours"** — requires the eval worker to actually be deployed. It's not. (Per project memory: eval worker built but never deployed.)
- **No CAC modeling** — cron assumes inbound. At v0 with no brand, all 3 design partners come from Jeremy's personal network or cold outbound. Time cost is enormous and not priced.

---

## 4. OPEN QUESTIONS FOR JEREMY (verbatim)

> **Q1: Is Straw a bounty platform or an evaluation infrastructure company?**
> These have different GTM motions. A bounty platform sells to companies that want to discover talent/agents. An evaluation infrastructure company sells to companies that want to validate procurement decisions. Pick one for v1. You can be both at v2.

> **Q2: Do you want to be in the crypto payment rail business?**
> x402, Kite Chain, USDC settlement vs. Stripe Connect / traditional rails. OFAC strict liability is catastrophic without bulletproof KYC/KYB. Decide before building payment infra.

> **Q3: Who is the design partner you will personally call tomorrow?**
> Phase 2 has 30+ named targets. The Linear/Cursor playbook only works because founders had personal access. Who do you already know at companies that have deployed agents and been burned? That's call #1, not Marius (cold).

> **Q4: What is the v0 task category that makes the evaluation signal most obviously true?**
> Code quality on automated test suite is most defensible (deterministic = unambiguous). Financial analysis, customer support, research summarization — all harder. Which category has the most demand from people you know AND the most defensible objective rubric?

> **Q5: What is your METR/Apollo equivalent — who makes Straw credible to the evaluation community?**
> Without a credibility anchor, scores are just numbers from an unknown startup. Who is your credibility anchor target?

> **Q6: Is the compliance certificate (OMB M-26-04) the actual product, with the marketplace as the distribution?**
> If OMB M-26-04 mandates third-party AI eval for federal procurement, Straw is a regulated infra play, not a marketplace play. Different pricing ($50–500K), different sales cycle (6–18mo), different investors. Main story or side story?

---

## 5. POST-MORTEM PATTERNS — What killed comparable platforms

| Platform | Cause of death | Applies to Straw? |
|----------|---------------|-------------------|
| **Replit Bounties** | Killed by autonomous agents making human-mediated bounty boards obsolete | **YES — top existential risk.** This is bear case #1. |
| **Bountysource** | Custodial fraud after acquisition by crypto company; $21K+ stolen from devs | **MITIGABLE.** Don't hold escrow. Use Stripe Connect, payout immediately. |
| **Gitcoin Bounties** | Strategic sunset — bounties were a feature, not the company; pruned in favor of Grants | **PARTIAL.** Straw must be eval *infrastructure* not "bounties as feature" or it's dead. |
| **Kaggle** | 23M users, Google balance sheet, no visible B2B revenue. No hiring pipeline, no longitudinal eval, no cert | **HIGH.** No comp has proven the commercial model. Compliance cert + acquisition workflow is the differentiation, but unproven. |
| **Bountysource (IEEE structural critique)** | Bounty-tagged issues had *lower* close rates and *longer* resolution than non-bounty | **PARTIAL.** Straw has pre-specified rubrics + B2B + artifact gate, which mitigates. But spec-work risk for losing agents is real. |
| **Homejoy** | Subsidies masked broken unit economics; collapsed when promo pricing ended | **YES.** Don't subsidize early task volume. v0 manual seeding is fine; transition to organic must be real. |
| **Beepi** | Underestimated operational complexity; founders misused capital; runway ran out | Less relevant — different category. |
| **Shyp** | Frequency mismatch; flat pricing didn't cover costs; kept unprofitable products running | **YES.** Don't keep unprofitable lines running out of attachment. |
| **Quibi** | Bootstrapped both supply + demand simultaneously with no IP/fan base; killed viral loop | **YES.** Use Jeremy's existing network as IP/fan base. Don't try to build both sides cold. |
| **Steemit / Kin / Helium / GTC** | Token economy collapse — uncapped supply, plutocratic capture, no real demand, securities trap | **PARTIAL.** Only relevant if Straw uses transferable tokens. Non-transferable credits + USD/USDC pricing avoids this. |

---

## 6. GAPS / WEAKNESSES in the Research

### What the cron didn't cover
- **Daemon-first reality.** Project memory says daemon-first is the actual current architecture. The cron's GTM playbook still talks about "VP Eng posts task → agents compete" as if humans are the primary actors. There's no analysis of "what does GTM look like if the design partner is themselves a daemon-builder running OpenClaw?"
- **Eval worker isn't deployed.** Every GTM tactic ("run live eval in 72 hours") assumes operational eval infrastructure. Per `project_state_snapshot_2026_04_25`, eval worker is built but never deployed. The GTM cannot start until that ships. Cron didn't flag this.
- **Pricing power validation.** The $15–30K/yr platform sub is asserted, not derived. No price-sensitivity research. No "what would a Series B AI company actually pay" interviews referenced.
- **Failure mode if first eval is unimpressive.** If the eval produces a mushy score where 3 agents are within 5% of each other, what's the GTM motion? Cron only models the "clear winner" case.
- **Channel economics.** No CAC math. No time-cost-of-Jeremy estimate. "Founder-led sales" is asserted but never quantified.
- **What "compliance certificate" actually is.** OMB M-26-04 is referenced repeatedly but never specified. Is it audit-trail JSON? A signed PDF? A regulator-recognized accreditation? Big difference.

### Where the cron is bullshitting
- **Twitter handles look real but are unverified.** @ScottWu46 is real. @MariusHobbhahn is real. @aparnadhinak is real. But @SecurityGuyPhil, @0xtbt, @jeffr_yyy, @blockoskar, @rithvanga — these need verification before sending DMs. Cron probably hallucinated some.
- **Openers are recycled GPT pap.** Most openers follow "[They do X] — Straw does Y. Same infra, different buyer." This template will be recognized as AI-generated within 3 examples and earn instant ignore.
- **"Pitches a generic AI safety thing to AI safety people"** — exactly the failure mode flagged. Marius/Beth/Buck/Sam Bowman pitches are this. They won't land.
- **YC W26 list is filler.** All 5 are agent-builders, i.e. supply-side, not buyers. Pitching them as "design partners" is a category error. Useful for agent-pool seed, not GTM.
- **"Get on Latent Space" advice is real but generic.** Cron knows swyx exists; doesn't have a thesis on what Jeremy should *actually pitch* that gets a slot.
- **Statistics with no provenance:** "67% of companies using hybrid PLG+SLG hit NRR targets" — Userflow blog citation, secondary source, probably traces back to an unrepresentative survey.
- **AI Engineer World's Fair speaker slot** — described as "highest-ROI conference investment" without modeling cost (sponsorship?), realistic acceptance rate for unknown founders, or lead time.

### Date hygiene
- Cron is dated 2026-05-02 (today is 2026-05-04). Cites "2025-2026" data and "April 2026" events as if they're past. Some of this may be confabulated near-future data. Treat any 2026-Q1/Q2 statistic as "claim, not fact" until verified.

---

## 7. CONTRADICTIONS WITH PHASE 1

### Phase 1 said vs. Phase 2 says

| Claim | Phase 1 (`agent-incentive-research-2026-04-25.md`) | Phase 2 | Resolution |
|-------|----------------------------------------------------|---------|------------|
| **Will agents post tasks?** | YES — USDC OpenClaw hackathon (200+ submissions, $30K, 9,700+ comments) proves it. Friend's concern was wrong. | Mostly silent. Returns to "humans post tasks → agents compete" framing. | Phase 2 implicitly **walks back** Phase 1's agent-posting bullishness. v0 design here is "Jeremy posts manually," not "agents post." |
| **Crypto rails (x402, Kite, USDC)** | Recommended as the agent-native payment layer | OFAC catastrophic-risk warning; "use Stripe Connect, drop crypto at v0/v1" | **Phase 2 supersedes.** Crypto rails come back at v2 only with full KYC/KYB + sanctions screening. Q2 is the explicit decision point. |
| **300-agent swarm scenario** | Centerpiece of Phase 1; OASIS/CAMEL-AI for de-risking | Not mentioned | Phase 2 implicitly **deprioritizes.** The first $100K ARR doesn't require the 300-agent swarm to work. |
| **Mechanism design (VCG, Shapley, reputation)** | Heavy investment; "mature mechanism design" gates v1 | GTM playbook says nothing about mechanism design; pricing is flat-fee SaaS | **Phase 2 supersedes for v0/v1.** Mechanism design matters at v2 marketplace scale, not at 5 design partners. |
| **Pre-specified rubrics are the moat** | Section 10 of Phase 1 | Rubrics are "the entry fee," not the moat. **The moat is neutrality + outcome corpus + compliance cert.** | **Phase 2 corrects.** Rubrics are table stakes. The moat is data accumulation + regulatory positioning. |
| **Compliance certificate angle** | Section 15 — important but one of many threads | Promoted to potential **main product** (Q6). OMB M-26-04 could make Straw a regulated-infra play. | **Phase 2 elevates.** This is now a strategic fork Jeremy must decide. |
| **Bounty marketplace cold-start** | Phase 1 was sanguine — "agents will engage if mechanism design is right" | Phase 2 — Replit Bounties killed itself, Bountysource died, Gitcoin sunset, Kaggle has no revenue. **Empirical track record is bad.** | **Phase 2 raises the bar.** Phase 1's mechanism-design optimism doesn't survive contact with the empirical post-mortems. |

### What Jeremy should update priors on
1. **Crypto rails are deprioritized.** Don't build USDC payment infra at v0. Stripe Connect.
2. **Agent-posting (the friend's original concern) is back as an open question for v1+.** Phase 1's hackathon evidence is weaker than the empirical platform post-mortems (Bountysource, Replit Bounties).
3. **The compliance certificate may be the actual product.** Q6 is the big strategic fork. Marketplace vs. regulated-infra are different companies.
4. **Braintrust is the real competitor, not the existing eval marketplaces.** 12–18 month window before they ship a comparison feature.

---

## What to do tomorrow

1. **Decide Q1 (bounty vs. eval-infra) and Q2 (crypto vs. Stripe).** These gate everything else.
2. **Ship the eval worker.** Per project memory it's built but not deployed. Without it, the "live eval in 72 hours" GTM motion is fiction.
3. **DM Aparna Dhinakaran, Jeffrey Ip, Erik Bernhardsson** with non-template openers.
4. **List 5 people in Jeremy's existing network** at AI-native Series B–D companies. Q3 is the question that actually unlocks first revenue.
5. **Pick the v0 task category** (Q4) — almost certainly code quality with deterministic test suite, given the eval-worker dependency.
