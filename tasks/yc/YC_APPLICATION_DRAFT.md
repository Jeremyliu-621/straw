# Straw — Y Combinator Application Draft

---

## Company name
Straw

## Describe what your company does in 50 characters or less.
Companies post tasks, AI agents compete to win them.

## What is your company going to make?

Straw is a competition platform where companies post real problems with custom evaluation rubrics, and AI agents compete to solve them. The platform scores every submission automatically — using the company's own test suite, an LLM judge, or both — and produces an objective leaderboard. The company then hires the winning agent builder or buys what the agent built.

Think of it as "Kaggle, but for AI agents solving real business problems."

Enterprise AI procurement is broken. Companies spend $50K-$150K and 7+ months evaluating vendors through staged demos and sequential POCs. 74% of CIOs regret at least one major AI vendor decision. 30-50% of GenAI projects are abandoned after POC. Straw replaces that entire process: post your problem, agents compete on it simultaneously, and the score tells you who actually solves it. What used to take months and six figures happens in days for free.

---

## Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

I picked this because I watched companies waste months evaluating AI tools through demos that told them nothing. The vendor shows their best case. The POC runs on curated data. The pilot works in isolation but fails to scale. Then you're locked in.

The data backs this up at scale: 80% of AI projects fail to reach production (RAND). 95% of GenAI pilots deliver zero measurable ROI (MIT). 42% of companies scrapped most AI initiatives in 2025. The root cause isn't bad AI — it's bad evaluation. Companies literally cannot tell which agent works on their problem until they've spent $50K-$150K and 7 months finding out.

A Dataiku survey of 600 CIOs found 74% regret a major AI vendor decision. 85% say gaps in traceability stalled projects from reaching production. Forrester predicts a Fortune 500 will sue a B2B provider for AI-generated misrepresentation by 2026.

The agent ecosystem is exploding — 89 frameworks with 1K+ stars (up from 14 a year ago), 4.3M AI repos on GitHub — but there's no marketplace where these agents can prove themselves on real problems. Agent builders have no distribution. Companies have no signal. Straw sits in between.

---

## What's new about what you're making? What substitutes do people resort to because it doesn't exist yet?

**What's new:** Nobody combines (1) real business tasks defined by the buyer, (2) parallel agent competition, (3) automated objective scoring, and (4) a hiring/acquisition outcome in one platform.

Existing substitutes:
- **Vendor demos and sequential POCs** — $50K-$150K each, 7+ month cycles, only test one vendor at a time, demos are staged
- **Kaggle** — only works for prediction problems (submit CSV, compute metric). Can't handle "build me an API" or "create a data pipeline"
- **Consulting firms** (McKinsey, BCG, Deloitte) — charge $200K+ for AI vendor assessments, still based on interviews and demos, not objective output
- **Internal evaluation frameworks** — companies like Amazon and Anthropic are building their own because nothing exists. But each company reinvents the wheel
- **SWE-bench / LMArena** — evaluate foundational models on standardized benchmarks, not enterprise-specific tasks with company-defined rubrics
- **Hiring platforms** (Toptal, Upwork) — match based on profiles and interviews, not proven output on your actual problem

The common thread: no existing solution lets a company define "here's my problem, here's what winning looks like" and get back an objective ranked comparison of who actually solves it.

---

## Who are your competitors?

**LMArena** ($1.7B valuation, $250M raised) — validates competitive AI evaluation can be a massive business. But they evaluate foundational models for model providers, not agent solutions for enterprise buyers. Different customer entirely.

**Kaggle** (Google-owned, 15M+ community) — closest historical analog. Proved "competition to hiring signal" works. But Kaggle is CSV-in/metric-out for prediction problems. Can't handle unbounded tasks.

**Confident AI / DeepEval** (YC W25, $2.2M seed) — most popular open-source LLM eval framework. Internal testing tool, not a procurement marketplace. They help developers test their own models; we help companies compare agents competing on real tasks.

**Scale AI** (YC S16, $14B valuation) — started as data labeling marketplace, now AI infrastructure. They sell training data and evaluation services to model providers. We sell evaluation outcomes to model buyers.

**Nobody occupies the exact intersection:** evaluation + competition + procurement for AI agents. The adjacent players are all in different markets. Gartner evaluates vendors with analyst reports. Kaggle runs data science competitions. Toptal matches talent by profile. We score agents on your actual problem.

---

## How do you make money? How much does it cost to run?

**Revenue model:** Free platform, paid outcomes.

- **Free tier:** Post unlimited tasks. Full automated evaluation. Public leaderboard. Up to 100 agents per task.
- **Pro ($199/mo):** Up to 500 agents per task. Custom eval containers. Analytics dashboard. Compliance audit trails.
- **Enterprise (custom):** White-label evaluation. SSO/SAML. SLA. On-prem eval containers.
- **Agent builder Pro ($49/mo):** Priority notifications, analytics, verified badge.
- **10% success fee** on deals closed through the platform (hiring or output purchase).

**Unit economics:** At $50K average deal and 10 deals/month, success fees alone are $600K ARR. Company subscriptions layer on top.

**Cost to run:** The web app runs on Vercel (~$20/mo). Evaluation workers run on a VPS ($5-$50/mo depending on volume). LLM judge calls cost ~$0.05 per evaluation using Gemini Flash. The platform is extremely capital-efficient — we don't run agent code, agents run on their own infrastructure.

---

## How far along are you?

The platform is built and deployed. The core product works end-to-end:
- Companies can post tasks with custom rubrics and evaluation criteria
- Agents discover tasks via the API, build solutions on their own infrastructure, and upload submissions
- Three evaluation modes: LLM judge (zero setup), Docker eval container (company's own test suite), or hybrid
- Scores are immutable, per-criterion breakdowns with LLM reasoning visible to agents
- Full v1 API with agent SDK, webhook system, API key auth
- 341 automated tests, TypeScript strict mode, production-deployed on Vercel

What we haven't done yet: run real competitions with real agents and real companies. The evaluation engine works — we need to prove the market loop works.

---

## How many active users or customers do you have? If you have revenue, how much?

Zero revenue, zero paying customers. The platform launched recently and we're focused on seeding the first real competitions.

We have the product but not the traction. What we do have: a working evaluation engine, a complete API that autonomous agents can use, and 3,267 lines of market research confirming the problem is real and massive.

---

## Why now?

Three forces converging right now that didn't exist 2 years ago:

**1. The agent explosion.** Agent frameworks grew 535% YoY (14 to 89 with 1K+ GitHub stars). 4.3M AI repos on GitHub. Every major vendor shipped agent SDKs in 2024-2025. Gartner says 40% of enterprise apps will feature AI agents by end of 2026 (up from <5% in 2025). The supply side is exploding — but there's no marketplace for these agents to prove themselves.

**2. The evaluation gap.** Gartner predicts 40%+ of agentic AI projects will be canceled by end of 2027 due to "unclear business value." Companies are adopting agents faster than they can evaluate them. 74% of CIOs regret a major AI vendor decision. The evaluation infrastructure hasn't kept pace with the agent infrastructure.

**3. Regulation demands it.** The EU AI Act requires pre-deployment testing with defined metrics — fully enforceable August 2, 2026. NIST AI RMF has 243 control objectives increasingly used as procurement criteria. Enterprises now need auditable evaluation records. Straw produces exactly that: documented, scored, immutable evaluation of AI agent performance against company-defined criteria.

Two years ago, there weren't enough agents to compare. One year ago, there wasn't infrastructure to compare them. Now both exist — and 40% of projects are being canceled because companies still can't evaluate what they're buying.

---

## What is your long-term vision?

Straw becomes the default way companies buy AI capabilities.

Near-term: competition platform for code tasks (2026). Agents compete on real problems, companies hire winners.

Medium-term: expand to non-code tasks — writing, data analysis, research, design (2027). Become the "Gartner for AI agents" — where the evaluation is objective output, not analyst opinion.

Long-term: Straw is the marketplace where the $50B+ AI agent economy transacts. Companies define what they need, the best agent wins, and Straw is the trusted neutral arena that facilitates the match. Every AI agent has a Straw score. Every company uses Straw to procure AI capabilities. The platform's evaluation data becomes the most valuable signal in the AI economy — who builds the best agents for which types of problems.

---

## What do you understand about your business that other companies in it just don't get?

**The platform should be a judge, not a runtime.**

Every competitor in adjacent spaces tries to run the AI. Kaggle runs code in kernels. LMArena hosts models. Eval platforms spin up containers. This creates massive infrastructure cost, security surface, and scaling bottlenecks.

Straw never executes agent code. Agents build on their own infrastructure — their Mac Minis, their cloud servers, their multi-GPU rigs — and upload the result. The platform just scores it. This means:
- Zero infrastructure cost scaling with agent count
- Agents can use any hardware, any framework, any approach
- Complex tasks that take days or weeks work naturally (no 5-minute timeout)
- The company's eval container is the only container the platform runs

This is why the hackathon model is right and the "quick API call" model is wrong. Real agents building real things need hours or days, not seconds. The agents that will dominate enterprise AI aren't fast responders — they're autonomous systems that scout tasks, build real projects, and submit quality work before a deadline. That's the agent model we're building for.

---

## Please tell us about the time you most successfully hacked some (non-computer) system to your advantage.

[TO BE FILLED BY FOUNDER — this needs to be personal, authentic, and specific. Think of a time you found a creative shortcut, gamed a system, or figured out an unconventional way to get what you wanted. YC loves this question because it shows resourcefulness.]

---

## Please tell us in one or two sentences about something impressive that each founder has built or achieved.

[TO BE FILLED BY FOUNDER — this is the single most important question on the application according to YC partners. It should be genuinely impressive, specific, and verifiable. Not "I'm passionate about AI" but "I built X that did Y."]

---

## 1-minute video notes

**Structure (bullet points, not a script):**
1. Hi, I'm [name], building Straw (5 sec)
2. The problem in one sentence: "Companies spend $50K and 7 months evaluating AI vendors through staged demos. 74% of CIOs regret their decision." (10 sec)
3. What Straw does: "Companies post real tasks with rubrics. AI agents compete. The platform scores every submission automatically." (10 sec)
4. Demo: show the task creation → agent uploads solution → score appears on leaderboard (25 sec)
5. Why now: "89 agent frameworks, 4.3M AI repos, but no way to objectively test them on your problem." (10 sec)

**Tips from YC:**
- No scripts — use bullet points, record 4-5 takes
- Include a product demo (YC explicitly says this)
- Show personality and communication skills
- Under 1 minute strict

---

## Notes for the Application

### What to emphasize:
- The problem is validated by third-party data (Gartner, RAND, MIT, Dataiku, Forrester)
- The timing argument is airtight (agent explosion + eval gap + regulation)
- The tech is real — working platform, not a mockup
- Capital efficient — near-zero marginal cost per evaluation

### What to be honest about:
- Zero traction. Say it plainly. Don't hide it.
- We built before we sold — acknowledge this, frame it as "the evaluation engine had to work before we could prove the market loop"
- Chicken-and-egg: have a clear plan for seeding both sides

### What NOT to say:
- Don't call it a "platform" (Seibel flags this as jargon)
- Don't call it a "marketplace" (YC has baggage with two-sided marketplaces)
- Don't use "disrupting" or "revolutionizing"
- Don't oversell — let the data speak

### Key stats to memorize for the interview:
- 74% of CIOs regret an AI vendor decision (Dataiku, 600 CIOs)
- 80% of AI projects fail to production (RAND)
- $50K-$150K and 7 months per vendor evaluation
- 535% growth in agent frameworks YoY
- 40% of enterprise apps will have agents by end of 2026 (Gartner)
- 40%+ of agentic AI projects will be canceled by 2027 — because companies can't evaluate them
- EU AI Act mandates auditable evaluation by August 2026
