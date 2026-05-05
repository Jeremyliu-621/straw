# Honest Critique: What's Wrong with Straw

Internal document. Not for the application — for us to fix before applying.

---

## Pricing Is Wrong

**The $99/task fee:**
- Too low for enterprises ($99 is a rounding error on their AI budget — Deloitte found 22% of CPOs plan $1M+ annual GenAI spend)
- Too high for indie builders who'd drive early volume
- Kaggle charges $10K-$100K per competition. We're 100x cheaper with no explanation for why
- $99 signals "toy" to a procurement team used to $50K-$150K POCs

**The 5% success fee:**
- Unenforceable. Deals close off-platform. Company contacts winner, negotiates privately, Straw never knows.
- 5% is far below marketplace comparables: Toptal 30-50%, Upwork 10-25%, Hired 15%
- No transaction infrastructure (escrow, contracts, milestones) to justify staying on-platform

**Recommendation:**
- Tier the task posting: Free (public, limited), $499 (private, priority matching), $2,999 (enterprise, white-glove)
- Or: free to post, charge agent builders for premium analytics/priority access
- Build deal facilitation (contract templates, milestone tracking, escrow) before charging success fees
- Consider outcome-based pricing: "you pay when you find an agent worth hiring"

---

## The Chicken-and-Egg Problem

**Current state:** Zero tasks. Zero agents. Zero completions. The seed script creates fake data.

**Why this matters for YC:** They'll ask "how many people are using this?" and the answer is zero. Phase 18 ("Prove It Works") has never been executed. The product has never processed a real submission in production.

**The structural challenge:**
- Companies won't post if no agents exist (why waste time defining rubrics for an empty arena?)
- Agents won't come if no tasks exist (why register for a platform with nothing to compete on?)
- Kaggle solved this by starting with $25K prize pools from their own money + early academic partnerships

**Recommendation:**
- Before applying to YC: run at least 3 real competitions yourself
- Seed both sides: post real tasks (from friends, from your own needs), compete as an agent yourself
- Show a live leaderboard with real scores to prove the eval engine works
- Even 1 completed competition with 3 agents is infinitely more convincing than 0

---

## LLM-as-Judge Has a Trust Problem

**The promise:** "The score doesn't lie."
**The reality:** LLM judges are inconsistent, biased, and gameable.

**Research findings (2025-2026):**
- RAND found no LLM judge was "uniformly reliable" — frontier models exceed 50% error rates on bias tests
- Position bias: two identical responses score differently based on presentation order
- Length bias: verbose answers score higher regardless of quality
- Provenance bias: responses from well-known models score higher

**Why this matters:** One agent builder who feels screwed by the LLM judge will destroy trust publicly. "Straw's scoring is rigged" on Twitter kills the platform.

**Mitigations already in place:**
- Eval container mode (company writes real tests) — this is the real solution
- Per-criterion scoring with visible reasoning — transparency helps
- Immutable scores — can't be tampered with after the fact

**Recommendation:**
- Default new tasks to hybrid mode (container + LLM) instead of LLM-only
- Show confidence intervals or agreement rates when using LLM-only
- Let agent builders dispute scores with a structured appeal process
- Consider multi-judge (run 3 LLMs, report median + variance)
- Be honest about this in marketing: "Automated scoring with full transparency" not "the score doesn't lie"

---

## Over-Engineered for Zero Users

**What we built:** 341 tests, 17 phases, eval containers, webhook workers, agent SDK, presigned URLs, HMAC-signed webhooks, three eval modes, company-configurable container constraints, platform build checks.

**What we needed:** One working competition that a real agent can submit to.

**YC's perspective:** "Did you talk to customers, or did you just build?" The engineering is genuinely impressive, but it's a yellow flag when the product has zero usage. They'll worry the founders are builders, not sellers.

**Recommendation:**
- For the application, lead with the problem and customer evidence, not the tech
- Demo a real completed competition, not a feature tour
- Be ready to answer: "How many companies have you talked to? What did they say?"
- The tech becomes a strength ONLY when paired with evidence of demand

---

## Upload-Only Model Limits the Market

**Current model:** Agents build on their own infra over hours/days, zip it up with SUBMISSION.md, upload.

**Who this works for:** Sophisticated autonomous agents (OpenClaw, Devin-like systems). This is a tiny market right now.

**Who this doesn't work for:**
- An ML engineer who wants to paste a Python script and see how it scores
- A prompt engineer who built an agent in 20 minutes using LangChain
- A team that just wants to demo their API endpoint

**The browser upload we just built helps, but:**
- Still requires building offline, creating a zip, including SUBMISSION.md
- No "paste code here" or "connect your API" option
- The mental model is "hackathon" when most potential users think "demo"

**Recommendation:**
- Add a "quick submit" mode: paste code or connect a GitHub repo
- Auto-generate SUBMISSION.md from the code (LLM can do this)
- Keep upload-only as the "full submission" mode for serious agents
- Lower the floor without removing the ceiling

---

## The "Hire or Buy" Outcome Is Vague

**What happens after a competition closes:**
1. Company sees leaderboard
2. Company clicks "Contact Winner"
3. Platform sends... an email?
4. Deal happens off-platform
5. We charge 5% of a deal we'll never know about

**The value we're providing:** An introduction. That's it. We're charging 5% for an introduction.

**What we'd need to justify a success fee:**
- Contract templates and SOW generation
- Escrow for the first payment
- Milestone tracking for ongoing engagements
- Code transfer and IP assignment facilitation
- At minimum: structured deal close with both parties confirming terms on-platform

**Recommendation:** Either build deal infrastructure or drop the success fee and monetize differently (subscription, premium features, data insights).

---

## What IS Strong

Despite all of the above, the fundamentals are genuinely good:

1. **The problem is real and massive.** 80% of AI projects fail. $547B wasted. Gartner says 40% of agentic AI projects will be canceled by 2027 due to "unclear business value." Companies literally cannot evaluate AI agents.

2. **The timing is perfect.** Agent frameworks grew 535% YoY. EU AI Act mandates pre-deployment testing by August 2026. 40% of enterprise apps will have AI agents by end of 2026 (up from 5%). The need for evaluation infrastructure is exploding.

3. **Nobody is doing this.** The competitive landscape audit found zero companies at the intersection of "evaluation + competition + procurement." Adjacent players (Kaggle, LMArena, Scale AI) are all in different markets.

4. **The evaluation engine design is sound.** Three modes (LLM, container, hybrid), company-owned rubrics, immutable scores, structured feedback loop — this is architecturally correct for the problem.

5. **The tech is real.** This isn't a mockup or a Figma prototype. It's a working platform with real evaluation infrastructure, a complete API, and an agent SDK. When paired with real usage data, this becomes a massive strength.

---

## Priority Fixes Before YC Application

1. **Run 3 real competitions** (even if you're both the company and the agent)
2. **Talk to 10 potential customers** and document what they say
3. **Fix pricing** (tier it, or make posting free)
4. **Record a 60-second demo** of a real agent competing and getting scored
5. **Prepare the chicken-and-egg answer** (how you'll seed both sides)
