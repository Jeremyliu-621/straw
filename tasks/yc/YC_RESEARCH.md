# YC Application Research for Straw

Compiled April 2026. All citations linked below.

---

## 1. YC Application Best Practices

### What YC Partners Look For

**Garry Tan (CEO, Y Combinator)**
- "Teach the reader something new as fast as you can. Since the world's most successful people tend to be extremely curious, if you can tell them something interesting and true they didn't know, you have their attention." ([TechCrunch, 2024](https://techcrunch.com/2024/05/22/garry-tan-y-combinator-accelerator-insights/))
- YC partners look for "first principles thinkers" who "not only believe what no one believed yet, but set about figuring out what the necessary things were to build." ([Garry Tan's tips](https://www.ycombinator.com/library/J7-garry-tan-s-tips-for-applying-to-yc))
- "Short words have long legs, and the worst thing you can do is alienate people using jargon." ([TechCrunch, 2024](https://techcrunch.com/2024/05/22/garry-tan-y-combinator-accelerator-insights/))
- YC wants founders who "treat AI agents not as features but as the core operating system of brand-new companies and industries." ([Garry Tan on X, Spring 2025 RFS](https://x.com/garrytan/status/1920153493492674984))

**Michael Seibel (Former CEO, Y Combinator)**
- The biggest mistake: "After reading your answer to 'what does your company do?' readers still don't know what your company does, often because of jargon and buzzwords." ([YC Essential Startup Advice](https://www.michaelseibel.com/blog/yc-s-essential-startup-advice))
- "Eliminate jargon, acronyms, marketing speak, and any ambiguous terms such as 'platform.'" ([YC Library](https://www.ycombinator.com/library/66-biggest-mistakes-first-time-founders-make))
- Outsourcing engineering is "a common error that is a huge red flag for future investors." ([Michael Seibel on X](https://x.com/mwseibel/status/982266625096208392))

**Dalton Caldwell (Managing Director, Y Combinator)**
- "You don't need to spend dozens of hours on the application or contact alumni excessively -- there's no strong correlation between time spent and getting in." ([TechCrunch, 2022](https://techcrunch.com/2022/04/27/how-to-get-into-y-combinator-dalton-caldwell/))
- The first thing he looks at is the team, specifically looking for technical excellence. ([Lenny's Podcast](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups))
- "Truly unique things come from domain expertise on something rare or interesting -- not from trying too hard to be weird." ([YC Library](https://www.ycombinator.com/library/6t-how-to-apply-and-succeed-at-y-combinator))

**Jared Friedman (Managing Director, Y Combinator)**
- YC's bias is "for big, ambitious ideas." Many entertainment and community ideas "are just not really big, ambitious ideas." ([FundersClub interview](https://fundersclub.com/blog/2016/03/31/digging-true-origins-startups-y-combinators-jared-friedman/))
- "There's hardly ever any one thing -- it's a complicated calculus based on a lot of different factors that vary from business to business." ([Mixpanel interview](https://mixpanel.com/blog/getting-accepted-into-y-combinator/))

### Common Mistakes in YC Applications

1. **Jargon and buzzwords** -- The #1 killer. If your grandmother can't understand it, rewrite it.
2. **No technical founder** -- Outsourcing engineering is a massive red flag.
3. **Lack of commitment** -- Founders who aren't "all in" and want YC to validate them.
4. **Overselling instead of showing facts** -- "If there is any part of the app that feels like it's 'selling' or 'pitching', consider replacing it with facts and numbers." ([Flowjam Guide](https://www.flowjam.com/blog/yc-application-tips-2025))
5. **Too brief** -- "Write everything interesting and unique about yourself since only 7% of applicants make it to interviews." ([arc.dev Guide](https://arc.dev/employer-blog/y-combinator-application-tips/))
6. **Lying or exaggerating** -- Caldwell explicitly warns: "Don't lie in your application."

### What Makes a Demo Video Compelling

- **Under 1 minute**, featuring only the founders
- **No scripts** -- "People delivering memorized speeches usually come off as stupid." Use bullet points instead. ([Startup Grind Tutorial](https://www.startupgrind.com/blog/y-combinator-application-video-tutorial/))
- **Show, don't tell** -- Demonstrate the product. "Demonstrating progress, regardless of how small or unfinished, is more compelling than merely describing an idea." ([Pilot Blog](https://pilot.com/blog/how-prepare-yc-application-video))
- **Record 4-5 takes**, spend about an hour total
- **Focus on founder dynamics and communication skills** -- The video is reviewed after the written application shows promise, primarily to assess the team
- **Include a demo of the product** -- YC explicitly says: "Include a demo." ([YC Library](https://www.ycombinator.com/library/J8-yc-application-tips-include-a-demo))

### Traction vs. Idea vs. Team

**Team is paramount.** "We fund teams, not ideas" -- repeated like a mantra by YC partners.

**Traction is the best evidence for everything else.** It proves you have a good team that can execute and that your idea solves a real problem. But traction isn't just revenue -- it's any evidence you're building something people want: users, waitlists, LOIs, deep customer interviews.

**Ideas are secondary but still matter.** On average, ~40% of companies YC funds in each batch are "just an idea." About 1/3 of founders accepted had little more than an idea and a pitch deck. To get in without traction you need "either a very good team who's been building things before and proving they can do it, or a crazy idea or some unique insight that solves a problem in a way that's never been thought of before." ([GrowthMentor](https://www.growthmentor.com/blog/how-to-get-into-y-combinator/))

**The best approach:** "The best way to improve your chances is to work hard and have your startup improve between application and interview -- whether through launching, product improvements, or increased revenue." ([Dalton Caldwell, YC Library](https://www.ycombinator.com/library/6t-how-to-apply-and-succeed-at-y-combinator))

---

## 2. Relevant YC Companies and Competitive Landscape

### Adjacent YC Companies

**AI Evaluation & Testing (Direct competitors to parts of Straw's eval engine):**

| Company | Batch | What They Do | Key Difference from Straw |
|---------|-------|-------------|--------------------------|
| **Confident AI** | W25 | Open-source LLM evaluation framework (DeepEval). 600K+ daily evals for BCG, AstraZeneca, AXA. | Evaluates LLM outputs, not agent capabilities on real tasks. Developer tool, not marketplace. |
| **HUD** | W25 | Evaluation platform for Computer Use Agents. Works with frontier labs. 100+ benchmarks. | Focused on CUA-specific evals (browser agents), not general-purpose task competition. |
| **Kashikoi** | Recent | Simulation engine to benchmark AI agents. Generates world models for behavioral assessment. | Simulation-based benchmarking, not real-task competition with real business problems. |
| **Lucidic** | W25 | Debug, test, and evaluate AI agents in production. | Production observability, not competitive evaluation. |
| **Asteroid** | W25 | Runtime supervision for AI agents with guardrails and human oversight. | Safety/guardrails layer, not evaluation or procurement. |

**Key Insight:** These companies all evaluate AI in synthetic/controlled environments. **None of them evaluate agents by having them compete on real enterprise problems with company-defined rubrics.** This is Straw's unique positioning.

**Marketplaces & Developer Tools:**

| Company | What They Do | Relevance |
|---------|-------------|-----------|
| **Scale AI** (S16) | Data labeling for AI training. Now $7B+. | Started as marketplace for human labelers, pivoted to AI infrastructure. |
| **Toptal** | Curated developer marketplace. 30-50% take rate. | Talent marketplace model, but for humans. |
| **Mercor** (S23) | AI-powered hiring. $100M+ revenue. | Uses AI to evaluate human talent, not AI agents. |

### Scale AI's YC Story

Alexandr Wang entered YC S16 with a chatbot-for-doctors idea. Mid-batch, he was "very lost." Then he noticed many YC batchmates were building chatbots that needed training data. In three days, he bought scaleapi.com, built a landing page, and launched on ProductHunt. ([YC Library](https://www.ycombinator.com/library/MV-alexandr-wang-building-scale-ai-transforming-work-with-agents-competing-with-china), [Founder Story](https://www.frederick.ai/blog/alexandr-wang-scale-ai))

**Lesson for Straw:** Scale AI succeeded by identifying an infrastructure need that was invisible to companies building the end product. Straw does the same -- companies need to evaluate AI agents but the tooling doesn't exist.

### Kaggle's History

- Founded 2010 by Anthony Goldbloom
- Revenue: fees charged to companies for hosting competitions + sponsorship deals + premium features
- For typically less than the cost of one full-time data scientist ($100K+/year), companies got an army of freelancers building bespoke models ([Harvard Digital Innovation](https://d3.harvard.edu/platform-digit/submission/kaggle-building-a-market-for-data-science-and-scientists/))
- **Acquired by Google in March 2017** primarily for: (1) community access to 500K+ data scientists, (2) talent recruiting pipeline, (3) strategic AI ecosystem control
- The community itself was the real asset, not the competition IP ([VentureBeat](https://venturebeat.com/2017/03/15/what-the-kaggle-acquisition-by-google-means-for-crowdsourcing/))

**Why Kaggle model doesn't work for enterprise AI procurement:**
- Kaggle is purely metric-based (submit CSV, compute RMSE/AUC)
- All Kaggle tasks are prediction problems with fixed output formats
- Straw's tasks are unbounded: code, APIs, simulators, agents themselves
- Enterprise buyers need custom rubrics, not platform-defined metrics

### Recent YC Batch Trends (W24, S24, W25, S25)

- **W24:** 260 startups, 50%+ building around AI
- **S24:** 255 companies, 67% categorized as AI, 50%+ founders with Master's/PhD
- **W25:** 58/163 startups are AI agent companies. Agent evaluation and oversight companies prominent (Confident AI, HUD, Asteroid, Lucidic)
- **S25:** 67/144 startups described as "AI agents." 40+ companies building infrastructure for agentic workflows (observability, evaluation, memory)
- **Roughly 80% of W25 presenters were AI-focused** ([CNBC, 2025](https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html))

**YC S25 trend:** "Infrastructure is back in vogue" -- the prevalence of dev-tool startups significantly higher than Spring '25.

---

## 3. Positioning Strategy

### The Four Positioning Options

| Positioning | Pros | Cons | YC Fit |
|------------|------|------|--------|
| **(a) Marketplace** | Huge outcome potential (Airbnb, DoorDash). Network effects. | Chicken-and-egg. Capital-intensive. "Two-sided marketplace" raises eyebrows. | Mixed -- YC's biggest wins are marketplaces, but they know the challenges. |
| **(b) Evaluation platform** | Hot space (Confident AI, HUD in W25). Clear technical moat. | Smaller TAM. Doesn't capture deal value. Competes with well-funded YC companies. | Good -- but may feel "same-ish" after 5+ eval companies in recent batches. |
| **(c) Procurement tool** | Enterprise pain is real and validated. B2B SaaS framing. | Less exciting. "Procurement" sounds boring. Smaller vision. | Moderate -- practical but not inspiring. |
| **(d) Competition platform** | Unique angle. Teaches something new. Kaggle analogy is powerful. | May sound like a feature, not a company. | Good -- if you make the enterprise buyer the hero. |

### Recommended Positioning: Hybrid (d) + (a) -- "Competition Platform That Becomes a Marketplace"

**Lead with the competition/arena framing, but make the business model a marketplace.**

**Why:**
1. "Competition platform for enterprise AI procurement" teaches the reader something new immediately (Garry Tan's advice)
2. It's not "yet another eval tool" -- it's differentiated from Confident AI, HUD, Kashikoi
3. The Kaggle analogy is instantly understood but the enterprise twist makes it novel
4. The marketplace emerges naturally from the competition (winners get hired)

### Best Framing for YC

**Recommended one-liner:** "Companies post real tasks, AI agents compete to solve them, and the best agent wins the contract."

**NOT recommended:**
- "We're Kaggle for enterprise AI" -- Too backward-looking. Kaggle is 16 years old and was acqui-hired.
- "We fix enterprise AI procurement" -- Too boring. Procurement isn't exciting.
- "We're the arena where AI agents compete" -- Too vague. Who cares if agents compete? What's the business?

**BEST framing:** "We replace enterprise AI vendor demos with objective, scored competition on real problems." This:
- Identifies a specific villain (vendor demos)
- Proposes a mechanism (scored competition)
- Has a clear buyer (enterprise)
- Teaches something new (this doesn't exist yet)

### Is "Marketplace" a Good or Bad Word at YC?

**It's a loaded word.** YC's four biggest outcomes by market cap are consumer marketplaces (Airbnb, Coinbase, DoorDash, Instacart), so they know the upside is enormous. But they also know:

- Two-sided marketplaces are "notoriously expensive to get started and require subsidizing one side"
- Chicken-and-egg problem is the #1 reason marketplace startups die
- YC has shifted from primarily consumer to primarily B2B investor

**Recommendation:** Don't lead with "marketplace." Lead with "competition platform" and explain that the business model is marketplace economics (posting fee + success fee). The marketplace is the outcome, not the pitch.

### Addressing the Chicken-and-Egg Problem

This WILL come up in the interview. Straw's answer:

**Supply side (agents) is self-recruiting:**
- Autonomous AI agents scout for tasks via API -- they don't need a human to sign up
- Agent builders are motivated by reputation scores (like GitHub contribution graphs)
- Open-source agent frameworks (e.g., OpenClaw) can integrate Straw's API in a day

**Demand side (companies) needs seeding:**
- Start with "come for the tool, stay for the network" -- even with zero agents, the task creation flow + rubric builder is useful as an internal evaluation framework
- Seed with design partners who get free task postings
- Run company-sponsored bounties to attract initial agent builders

**The 19 proven marketplace tactics include:**
1. Get the hardest side first (companies)
2. Find one giant user for initial supply or demand
3. Provide single-user utility ("come for the tool, stay for the network")
4. Subsidize the most valuable side

([NFX: 19 Marketplace Tactics](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem))

---

## 4. Traction Metrics YC Cares About

### What Pre-Revenue Marketplaces Should Show

**In order of impact:**

1. **Paid pilots or design partners** -- "Unpaid pilots are seen as a strong negative. Unpaying customers don't count." Ask for paid pilots or refundable deposits. ([The LOI Fallacy](https://medium.com/entrepreneurs-first/the-letter-of-intent-fallacy-9929c5fc3e2a))

2. **LOIs with specifics** -- Letters of Intent are useful but limited. "LOIs can be useful evidence of traction, but their weight depends on content, context, and corroboration." Make them concrete: company name, problem description, willingness to pay $X, timeline. ([Hacker News discussion](https://news.ycombinator.com/item?id=3063958))

3. **Waitlist with engagement** -- Not just signups, but people who respond to updates, refer others, or provide detailed use case descriptions.

4. **Working product with demo** -- "In 2025, 'MVP in private beta' is table stakes." ([Flowjam Guide](https://www.flowjam.com/blog/yc-application-tips-2025))

5. **Agent-side pull** -- Number of agents/builders who have signed up, created API keys, or expressed interest.

### Week-Over-Week Growth Benchmarks

- **YC's standard:** 5-7% weekly growth is good. 10%+ is exceptional. 1% means you haven't figured it out. ([Paul Graham, "Startup = Growth"](https://www.ycombinator.com/library/8s-startup-growth))
- **Recent W25 batch:** "The whole batch grew 10% week on week" -- this is the new bar, driven by AI companies. ([CNBC, 2025](https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html))
- **Revenue is the best growth metric.** Second best is active users.
- **Context matters** -- look at the trend, not individual weeks.

### What Counts as "Traction" for B2B SaaS at Application Stage

For ~40% of YC companies, it's "just an idea" at application. But for those with traction:

- **Best:** Paying customers (even a few at low price points)
- **Strong:** Committed design partners running pilots
- **Good:** Signed LOIs with specific dollar amounts
- **Acceptable:** Waitlist with 100+ qualified signups, deep customer interviews showing acute pain
- **Weak:** "We've talked to 50 companies and they all said they'd use it" (verbal interest is nearly worthless)

**Garry Tan, 2025:** "For about a quarter of the current YC startups, 95% of the code was written by AI." Companies are reaching $10M revenue with teams of less than 10 people. This means YC expects more product progress, faster. ([CNBC, 2025](https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html))

---

## 5. Business Model Validation

### Is $99/task + 5% Success Fee the Right Model?

**The $99 task posting fee:**
- Low enough to be a no-brainer for enterprise buyers (less than 1 hour of an engineer's time)
- Creates a quality filter (only serious tasks get posted)
- Comparable: Kaggle charged companies significantly more ($10K-$100K+ per competition)
- Risk: May be too low to sustain as primary revenue. Consider tiered pricing ($99 basic, $499 priority, $999 featured)

**The 5% success fee:**
- **Very low compared to comparables:**
  - Toptal: 30-50% markup (hidden in rates)
  - Upwork: 5-15% from freelancers + 5-10% from clients = 10-25% total
  - Fiverr: 20% from freelancers + 5.5% from buyers = ~25.5% total
  - Airbnb: 6-12% from guests + 3% from hosts = 9-15%
  - Recruitment agencies: 15-25% of first-year salary
- 5% is defensible for v1 (low friction adoption) but leaves money on the table
- Consider: 5% on first deal, graduated to 10% on subsequent deals. Or 5% for output purchase, 15% for ongoing agent hire.

### Kaggle's Business Model Evolution

1. **Competition hosting fees** -- Companies paid $10K-$100K+ to host competitions
2. **Problem setup consulting** -- Additional revenue from helping companies structure competitions
3. **Sponsorship deals** -- Companies sponsored competitions for marketing/recruiting
4. **Community value** -- 500K+ data scientists became the real asset (recruited by Google)
5. **Google acquisition (2017)** -- Acquired for community access + talent pipeline + ecosystem control

**Lesson:** Kaggle's fee-per-competition model worked but wasn't huge revenue. The community and data flywheel were the real value. Straw should think about what compounds -- reputation data, evaluation benchmarks, agent performance history.

### Marketplace Take Rate Reference Table

| Platform | Take Rate | Model |
|----------|-----------|-------|
| Toptal | 30-50% | Hidden markup on developer rates |
| Fiverr | 20% seller + 5.5% buyer | Both sides pay |
| Upwork | 5-15% seller + 5-10% buyer | Sliding scale |
| Airbnb | 3% host + 6-12% guest | Both sides pay |
| Amazon | 6-45% | Category-dependent referral fee |
| Average marketplace | 10-30% | Varies widely |
| **Straw** | **$99 flat + 5% success** | **Listing fee + transaction fee** |

**Assessment:** Straw's blended take rate is well below market average. This is fine for launch (reduces adoption friction) but should increase over time. The $99 flat fee is a good anchor -- it creates revenue even without deal completion. The 5% success fee is where the real revenue growth will come from as deal sizes increase.

### Recommended Model Evolution

1. **Phase 1 (Launch):** $99/task + 5% success fee -- maximize adoption
2. **Phase 2 (Product-market fit):** Tiered task pricing ($99/$499/$999) + 5-10% success fee
3. **Phase 3 (Scale):** Enterprise annual contracts + higher success fees + premium features (priority matching, dedicated scoring, SLA guarantees)

---

## 6. Draft YC Application Answers

### "What does your company do?" (One sentence, then one paragraph)

**One sentence:**
"Companies post real tasks, AI agents compete to solve them, and the winner gets hired."

**One paragraph:**
"Straw is where companies evaluate AI agents on their actual problems, not vendor demos. A company posts a task with a custom rubric -- what does good output look like and how much does each dimension matter. AI agents discover the task, build solutions on their own infrastructure, and upload their work before the deadline. Our evaluation engine (LLM judge + optional company-provided Docker test suites) scores every submission and produces an objective leaderboard. The company hires the winning agent builder or buys what the agent built. We charge $99 per task posting and a 5% success fee on completed deals."

**Why this works:**
- No jargon. A grandmother could follow it.
- Describes the mechanism, not just the vision.
- Revenue model in the description (shows business thinking).
- "Not vendor demos" immediately establishes the problem.

### "Why now?"

"Three things changed simultaneously. First, AI agents are now capable enough to produce real work output -- not toy demos, but actual code, APIs, and products that enterprises pay for. Enterprise AI agent spending hit $13B in 2025, up from $5B in 2024. Second, enterprise AI procurement is broken and everyone knows it -- one IDC survey found companies ran an average of 24 GenAI pilots in one year but only 3 reached production. Companies are making six-figure decisions based on vendor demos that tell them nothing about real-world performance. Third, autonomous AI agents now exist that can scout for work, build solutions over days, and submit without human intervention. These agents need a marketplace to find customers, and companies need an objective way to find the best agent. Nobody has connected these two sides yet."

**Why this works:**
- Three concrete, verifiable claims
- Market data (enterprise spending, pilot failure rates)
- Structural shift argument (agents can now work autonomously)
- The gap is clear: supply exists, demand exists, no marketplace connects them

### "What's your unfair advantage?"

"We're building the platform that both sides of the AI agent economy need but can't build themselves. Companies can't objectively evaluate agents -- they rely on demos, which are theater. Agent builders can't prove they're good -- they have no credible track record. Straw is the only place where an agent's score on a real enterprise problem is immutable, auditable, and public. Every competition generates reputation data that makes the next competition more valuable. An agent with 50 verified wins on Straw is simply more trustworthy than one with a pitch deck. This data flywheel compounds -- the more competitions run, the more valuable the platform becomes to both sides. Nobody else has this data because nobody else runs real-task competitions."

**Key moats (per YC's 7 AI Moats framework):**
1. **Network effects** -- More agents attract more companies, more companies attract more agents. Reputation scores only exist on Straw.
2. **Data compounding** -- Every evaluation generates agent performance data that no one else has.
3. **Switching costs** -- Agent reputation is non-portable. Companies' rubric templates live on Straw.
4. **Speed** -- First mover in "real-task agent competition." Others evaluate synthetic benchmarks.

### "How do you make money?"

"$99 per task posted, plus a 5% success fee when the company hires the winning agent or buys their output. The task fee is our primary revenue at launch. As deal flow increases, the success fee becomes dominant. On a $50K agent hire, we earn $2,599 ($99 + $2,500 success fee). Our TAM bottoms-up: if 10,000 companies each post 5 tasks/year at an average deal value of $30K, that's $99M in success fees plus $5M in task fees. The enterprise AI market is $115B in 2026 and growing 19% annually."

### "What's your 5-year vision?"

"In five years, Straw is the default way companies buy AI. Every enterprise AI purchase starts with a Straw competition -- post your real problem, let agents compete, hire the winner. We're the trusted scoring layer for the entire AI agent economy. Agent builders optimize for their Straw reputation the way developers optimize for GitHub stars. Our evaluation data becomes the industry standard for 'how good is this agent, really?' -- replacing vendor demos, POCs, and procurement theater entirely. We expand from code tasks to every domain: legal document review, financial modeling, design, content creation. Straw becomes to AI agents what LinkedIn became to professionals: the platform where your track record lives."

---

## 7. Strategic Recommendations

### For the Application

1. **Lead with the problem, not the solution.** "Companies make six-figure AI decisions based on vendor demos" is a hook that teaches something new.

2. **Avoid the word "platform" or "marketplace" in the one-liner.** These are red-flag words at YC. Use concrete language: "Companies post tasks. Agents compete. Winners get hired."

3. **Show the product.** In the video, demo the task creation flow, the agent API, and a scored leaderboard. Even with fake data, a working product is 10x more compelling than a pitch deck.

4. **Quantify the pain.** "24 GenAI pilots per company, 3 reach production" (IDC). "One CIO: 'We've seen dozens of demos this year. Maybe one or two are genuinely useful.'"

5. **Address chicken-and-egg proactively.** Don't wait for them to ask. Include your strategy in the application.

6. **Position against the eval companies in W25.** "Confident AI, HUD, and Kashikoi evaluate AI in synthetic environments. Straw evaluates AI on real enterprise problems. They're the unit test; we're the job interview."

### For the Interview

1. **Have your 30-second pitch cold.** Practice until it's natural, not memorized.
2. **Know your numbers.** TAM, deal size, pilot status, waitlist size.
3. **Be ready for:** "Isn't this just Kaggle?" (No -- Kaggle is CSV submissions against known metrics. Straw is real-task competition with company-defined rubrics, for a different buyer.)
4. **Be ready for:** "How do you solve cold start?" (Agents self-recruit via API. We seed demand with design partners. Single-user utility of rubric builder.)
5. **Be ready for:** "What's your moat?" (Reputation data that only exists on Straw. Network effects. First-mover in real-task agent competition.)
6. **Be ready for:** "Why won't OpenAI/Anthropic/Google just build this?" (They are agent providers, not neutral evaluators. A company wouldn't trust the LSAT if it were administered by one law school.)

### For the Demo Video

1. **Open with the problem** (10 seconds): "Companies spend months and hundreds of thousands of dollars evaluating AI agents through staged vendor demos."
2. **Show the product** (30 seconds): Task creation, rubric builder, agent uploading a submission, scores appearing on leaderboard.
3. **Close with traction/conviction** (20 seconds): Design partners, waitlist, or why you're uniquely positioned to build this.

---

## Sources

### YC Partner Advice
- [Garry Tan's tips for applying to YC](https://www.ycombinator.com/library/J7-garry-tan-s-tips-for-applying-to-yc)
- [Garry Tan's 'secret sauce' for getting into YC (TechCrunch, 2024)](https://techcrunch.com/2024/05/22/garry-tan-y-combinator-accelerator-insights/)
- [Garry Tan: YC Startups Growing 5X Faster (Mixergy)](https://mixergy.com/interviews/garry-tan-y-combinator-startups-growing-5x-faster-heres-what-changed/)
- [Michael Seibel: YC's Essential Startup Advice](https://www.michaelseibel.com/blog/yc-s-essential-startup-advice)
- [Michael Seibel: Biggest mistakes first-time founders make](https://www.ycombinator.com/library/66-biggest-mistakes-first-time-founders-make)
- [Dalton Caldwell: How to get into YC (TechCrunch, 2022)](https://techcrunch.com/2022/04/27/how-to-get-into-y-combinator-dalton-caldwell/)
- [Dalton Caldwell: Lessons from 1000+ YC startups (Lenny's Podcast)](https://www.lennysnewsletter.com/p/lessons-from-1000-yc-startups)
- [Dalton Caldwell: How to Apply and Succeed at YC](https://www.ycombinator.com/library/6t-how-to-apply-and-succeed-at-y-combinator)
- [Jared Friedman / FundersClub interview](https://fundersclub.com/blog/2016/03/31/digging-true-origins-startups-y-combinators-jared-friedman/)
- [The 7 Most Powerful Moats for AI Startups (YC Library)](https://www.ycombinator.com/library/Mx-the-7-most-powerful-moats-for-ai-startup)

### YC Application Process
- [YC Interview Guide](https://www.ycombinator.com/interviews)
- [YC Application Guide (Leland, 2025)](https://www.joinleland.com/library/a/yc-application)
- [YC Application Tips 2025 (Flowjam)](https://www.flowjam.com/blog/yc-application-tips-2025)
- [32 Successful YC Application Examples (Shizune)](https://shizune.co/yc-application-examples)
- [How to write a successful YC application (Basedash)](https://www.basedash.com/blog/how-to-write-a-successful-yc-application)
- [Dropbox's original YC application](https://www.ycombinator.com/apply/dropbox)
- [YC Application Tips: Include a Demo](https://www.ycombinator.com/library/J8-yc-application-tips-include-a-demo)
- [How to make money: 32 successful YC examples](https://shizune.co/yc-application-examples/how-do-or-will-you-make-money)

### Demo Video
- [YC Application Video Tutorial (Startup Grind)](https://www.startupgrind.com/blog/y-combinator-application-video-tutorial/)
- [How to Prepare for Your YC Application Video (Pilot)](https://pilot.com/blog/how-prepare-yc-application-video)
- [The Perfect YC Application Video Formula](https://www.techwisehub.com/blog/perfect-yc-application-video)

### Growth & Metrics
- [Paul Graham: Startup = Growth](https://www.ycombinator.com/library/8s-startup-growth)
- [YC startups fastest growing in fund history because of AI (CNBC, 2025)](https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html)
- [Pre-revenue traction metrics (ForumVC)](https://www.forumvc.com/thought-pieces/a-founders-guide-to-measuring-b2b-saas-startup-traction)
- [The Letter of Intent Fallacy](https://medium.com/entrepreneurs-first/the-letter-of-intent-fallacy-9929c5fc3e2a)

### Competitive Landscape
- [Confident AI (YC W25)](https://www.ycombinator.com/companies/confident-ai)
- [HUD (YC W25)](https://www.ycombinator.com/companies/hud)
- [Kashikoi: Simulation Engine for Benchmarking AI Agents](https://www.ycombinator.com/launches/Nfa-kashikoi-simulation-engine-for-benchmarking-ai-agents)
- [Asteroid (YC W25)](https://www.ycombinator.com/companies/asteroid)
- [Scale AI (YC S16)](https://www.ycombinator.com/companies/scale-ai)
- [Alexandr Wang: Building Scale AI (YC Library)](https://www.ycombinator.com/library/MV-alexandr-wang-building-scale-ai-transforming-work-with-agents-competing-with-china)

### Market & Industry
- [Enterprise AI market size (Mordor Intelligence)](https://www.mordorintelligence.com/industry-reports/enterprise-ai-market)
- [Enterprise AI Procurement 2026: Shift to Outcome-Driven Buying](https://aispectrumindia.com/analysis/1/416/enterprise-ai-procurement-in-2026-the-shift-from-pilot-experiments-to-outcome-driven-buying.html)
- [VCs predict enterprises will spend more on AI through fewer vendors (TechCrunch, 2025)](https://techcrunch.com/2025/12/30/vcs-predict-enterprises-will-spend-more-on-ai-in-2026-through-fewer-vendors/)
- [AI agent startups top 20 revenue (CB Insights)](https://www.cbinsights.com/research/ai-agent-startups-top-20-revenue/)
- [Kaggle CEO on Google acquisition (Architecht/Medium)](https://medium.com/architecht/kaggle-ceo-breaks-down-google-acquisition-and-the-state-of-machine-learning-a463d12a0ff4)
- [What Kaggle acquisition means for crowdsourcing (VentureBeat)](https://venturebeat.com/2017/03/15/what-the-kaggle-acquisition-by-google-means-for-crowdsourcing/)
- [Kaggle: Building a Market for Data Science (Harvard Digital Innovation)](https://d3.harvard.edu/platform-digit/submission/kaggle-building-a-market-for-data-science-and-scientists/)

### Marketplace Economics
- [Toptal pricing model (FatCat Remote)](https://fatcatremote.com/blog/toptal-pricing-model)
- [Upwork pricing (Teilur Talent)](https://www.teilurtalent.com/insights/upwork-pricing-how-much-does-it-cost-to-hire-with-them)
- [Fiverr commission rates (Quora)](https://www.quora.com/What-are-the-commission-rates-on-Fiverr-and-Upwork)
- [19 Marketplace Tactics for Chicken-and-Egg Problem (NFX)](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem)
- [Marketplace take rate guide (Sharetribe)](https://www.sharetribe.com/academy/how-to-set-pricing-in-your-marketplace/)

### YC Batch Analysis
- [YC S25 Batch Profile and AI Trends (Catalaize)](https://catalaize.substack.com/p/y-combinator-s25-batch-profile-and)
- [YC S24: AI Agents for the Enterprise (Wing VC)](https://www.wing.vc/content/y-combinator-demo-day-2024-ai-agents)
- [YC going all-in on AI agents (PitchBook)](https://pitchbook.com/news/articles/y-combinator-is-going-all-in-on-ai-agents-making-up-nearly-50-of-latest-batch)
- [YC Requests for Startups 2025](https://www.ycombinator.com/rfs)
- [Top AI Companies from YC W24 (Unwind AI)](https://unwindai.substack.com/p/top-ai-companies-from-yc-w24)
