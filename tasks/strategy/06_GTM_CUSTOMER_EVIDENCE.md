# Straw GTM Research: Go-to-Market Strategy & Customer Evidence

**Purpose:** YC application research. Go-to-market validation with real data.
**Date:** April 14, 2026
**Companion to:** `MARKET_RESEARCH.md` (problem validation), `MARKET_SIZING.md`, `COMPETITIVE_LANDSCAPE.md`

---

## Executive Summary

The AI agent market is $10.91B in 2026, growing at 46.3% CAGR to $52.6B by 2030. Over $2B has been invested in agentic AI startups in the past two years, with 180+ private companies mapped across the space. 99% of enterprise developers surveyed are exploring or building AI agents. The procurement process for these agents is demonstrably broken: 88-95% of pilots fail to reach production, the average failed project costs $7.2M, and companies are abandoning AI initiatives at 2.5x the rate of 2024.

Straw sits at the intersection of three converging forces: (1) exploding demand for AI agents with no evaluation methodology, (2) a massive and growing supply of agent builders with no distribution channel, and (3) regulatory mandates (EU AI Act, August 2026) requiring documented, evidence-based evaluation before deployment.

---

## 1. Ideal First Customers

### Who Is Actively Procuring AI Agents RIGHT NOW

**Technical leaders own 72% of AI purchasing decisions.** The buying authority breaks down as:
- **CTOs: 25%** of decision-making authority (2x more than CIOs at 12%)
- **Head of AI/ML: 11%** (new role, rapidly gaining authority)
- **VP Engineering, CDOs, CISOs: ~36% combined**

A new persona is emerging: the **"full-time AI buyer"** -- people whose sole job is figuring out how, when, and where to deploy AI. They report into the CIO, CTO, CDO, or COO, often within an AI Centre of Excellence.

Sources: [Futurum: Technical Leaders Own 72% of Enterprise AI Purchasing Power](https://futurumgroup.com/press-release/technical-leaders-own-72-of-enterprise-ai-purchasing-power/), [CTO Magazine: Inside the Mind of the AI Buyer](https://ctomagazine.com/meet-the-ai-buyer/)

### Industries Leading AI Agent Adoption

| Industry | Key Signal | Why They Buy First |
|----------|-----------|-------------------|
| **Financial Services** | 19.6% of global AI market, $11.3M avg failed project | Data-rich, clear ROI metrics, regulatory pressure |
| **Healthcare** | 36.8% CAGR, ~$1.5B vertical AI spend in 2025 | Half of all vertical AI spend, FDA/HIPAA compliance demands |
| **Technology & Telecom** | Highest absolute adoption rates | Technically sophisticated buyers, fastest movers |
| **Retail & E-commerce** | Customer service + commerce agents leading adoption | Clear revenue impact, measurable conversion metrics |
| **Legal** | $650M vertical AI spend in 2025 | Document-heavy workflows, high hourly-rate savings |
| **DevTools** | $4.2B in AI coding tools alone (largest single category) | Developer-buyers understand the product natively |

Sources: [Salesmate: AI Agent Adoption Statistics by Industry 2026](https://www.salesmate.io/blog/ai-agents-adoption-statistics/), [Menlo Ventures: 2025 State of Generative AI](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/), [a16z: Where Enterprises are Actually Adopting AI](https://a16z.com/where-enterprises-are-actually-adopting-ai/)

### Company Size Sweet Spot

**Mid-market (50-1,000 employees) is the sweet spot.** Here's why:

- **Gartner projects 40% of SMBs will have at least one AI agent deployed by end of 2026.** This segment is moving fastest.
- **50%+ of mid-size companies are increasing AI investments in 2026** (Gartner), citing strong demand for efficiency.
- **Enterprise (1,000+) is scaling but slowly:** Only 23% are scaling agentic AI; 39% still experimenting. Most scaling in only 1-2 functions.
- **Startups move fast but don't need a marketplace** -- they build or use point solutions.
- **B2B companies with $10K+ average deal sizes** are the primary buyers of AI agents from startups.

The mid-market buyer has budget pressure (can't waste $7.2M on a failed AI project), technical sophistication to understand the value proposition, and faster decision cycles than enterprise.

Sources: [Warmly: 35+ AI Agent Statistics 2026](https://www.warmly.ai/p/blog/ai-agents-statistics), [Riseup Labs: AI Development for Mid-Size Companies 2026](https://riseuplabs.com/ai-development-services-for-mid-size-companies/), [Deloitte: State of AI in the Enterprise 2026](https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html)

### Champion Roles (Who to Sell To)

| Role | Authority | Why They Champion Straw |
|------|----------|------------------------|
| **CTO** | 25% of AI purchasing decisions | Needs objective technical evaluation, tired of vendor demos |
| **Head of AI/ML** | 11% and growing | Owns agent deployment, needs systematic evaluation |
| **VP Engineering** | Execution-focused | Wants to reduce integration failures, prove solutions work |
| **Full-Time AI Buyer** | Emerging role in AI CoEs | Entire job is evaluating and procuring AI -- Straw is their tool |
| **Chief AI Officer (CAIO)** | Strategy + governance | Needs audit trail for AI decisions, regulatory compliance |

Source: [Futurum: Technical Leaders Own 72% of Enterprise AI Purchasing Power](https://futurumgroup.com/press-release/technical-leaders-own-72-of-enterprise-ai-purchasing-power/)

---

## 2. Evidence of Demand

### The Evaluation Pain is Real and Well-Documented

**causaLens published "The Death of AI PoCs"** arguing the traditional POC model is fundamentally broken for AI:
- "Business leaders are growing impatient with lengthy evaluations that produce little more than a slide deck."
- 95% of generative AI pilots never make it into production.
- Proposed alternative: deploy AI live for a 30-day probation period with measurable KPIs, not sandbox tests.
- "The true value of AI happens in deep integration into existing workflows -- sandbox PoCs don't reveal real operational value."

Source: [causaLens: The Death of AI PoCs](https://causalens.com/blogs/the-death-of-ai-pocs-a-new-model-for-buying)

**Anthropic published "Demystifying Evals for AI Agents"** acknowledging the evaluation gap:
- "The capabilities that make agents useful also make them more difficult to evaluate."
- "Without good evaluations, teams get stuck in reactive loops -- catching issues only in production."
- Recommends 20-50 simple tasks drawn from real failures, grading outcomes not process.
- This is essentially describing what Straw automates.

Source: [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**AWS published "Evaluating AI Agents: Real-World Lessons"** documenting a three-layer evaluation framework:
- Bottom layer: benchmark foundation models
- Middle layer: evaluate agent components (intent detection, tool-use)
- Upper layer: assess response quality, task completion, cost
- "Latency, cost per task, token efficiency, tool reliability, and policy compliance determine whether a technically capable agent is viable at enterprise scale."

Source: [AWS: Evaluating AI Agents](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/)

### Enterprise Evaluation Frameworks Being Built Internally

Companies are building this in-house because no product exists:

- **Amazon** built a three-layer evaluation framework (described above)
- **Aisera** built an enterprise AI benchmark with 682 tasks simulating enterprise workflows
- **Arxiv paper (Nov 2025)** proposed CLASSic framework: Cost, Latency, Accuracy, Stability, Security -- because "enterprises require holistic evaluation across cost, reliability, security, and operational constraints, rather than optimizing solely for task completion accuracy"
- **2025 survey of 120 agent evaluation frameworks** identified missing enterprise requirements: multistep granular evaluation, cost-efficiency measurement, safety/compliance focus, and live adaptive benchmarks

Sources: [Aisera: Enterprise AI Benchmark](https://aisera.com/blog/enterprise-ai-benchmark/), [Arxiv: Multi-Dimensional Framework for Evaluating Enterprise Agentic AI](https://arxiv.org/html/2511.14136v1), [InfoQ: Evaluating AI Agents in Practice](https://www.infoq.com/articles/evaluating-ai-agents-lessons-learned/)

### RFP Templates and Evaluation Scorecards

The proliferation of AI vendor evaluation templates confirms the pain:

- **Nvelop** offers free RFP vendor scorecards, evaluation templates, and requirements checklists
- **SpecLens** provides vendor scorecards, evaluation matrices, and due diligence checklists
- **Inventive.ai** publishes RFP evaluation criteria guides with scoring best practices
- These templates are manual, static, and don't produce objective evidence -- they're the duct tape solution

Sources: [Nvelop: RFP Vendor Scorecard Template](https://nvelop.ai/resources/templates/rfp-vendor-scorecard), [SpecLens: Free Procurement Templates](https://www.speclens.ai/templates)

### The Pilot Purgatory Problem (Quantified)

- **88% of AI pilots fail to reach production** (IDC/Gartner)
- **95% of GenAI pilots deliver no measurable P&L impact** (MIT NANDA)
- **42% of organizations abandoned most AI projects in 2025** (up from 17% in 2024)
- **30% of GenAI projects will be abandoned after POC phase by end of 2025** (Gartner)
- **Pilot purgatory costs the average enterprise $15-25M annually** in wasted dev resources, infrastructure, and opportunity costs
- **Average cost to repair a failed AI implementation: EUR 710,000** -- often double the initial budget

Sources: [CIO: 88% of AI Pilots Fail](https://www.cio.com/article/3850763/88-of-ai-pilots-fail-to-reach-production-but-thats-not-all-on-it.html), [Unframe AI: 95% of AI Pilots Fail](https://www.unframe.ai/blog/mit-reports-state-of-ai-in-business-2025), [National CIO Review: Compounding Cost of AI Mistakes](https://nationalcioreview.com/articles-insights/extra-bytes/the-compounding-cost-of-ai-mistakes-inside-the-enterprise/)

### Online Discussion and Community Evidence

- **80% of AI projects fail** is now a commonly cited statistic across multiple sources (RAND, MIT, Gartner, IDC)
- **ChatGPT is being used for "vendor bake-offs"** -- people are turning to AI itself to help evaluate AI vendors, indicating the evaluation process is so broken people are grasping at any tool
- **AI vendor evaluation checklist articles** have proliferated: Netguru, VKTR, Amplience, Clustox, TrustPath, Sprinklenet all published guides, indicating massive search demand
- **HN discussions** show enterprise frustration with AI governance, vendor relationships, and whether tools deliver promised productivity

Sources: [Scrunch: Vendor Bake-Offs with ChatGPT](https://scrunch.com/blog/2025-09-why-people-are-turning-to-chatgpt-for-'vendor-bake-offs'/), [Netguru: AI Vendor Selection Guide for CTOs](https://www.netguru.com/blog/ai-vendor-selection-guide)

---

## 3. The Agent Builder Side (Supply)

### Market Size: How Many People Are Building AI Agents

- **99% of enterprise developers surveyed are exploring or building AI agents** (IBM/Morning Consult, 1,000 developers)
- **$2B+ invested in agentic AI startups in the past two years**, focused on enterprise
- **180+ private AI agent companies** mapped across 10 distinct use cases (Finro)
- **LangChain: 97K+ GitHub stars**, 50K+ production apps
- **CrewAI: 46K GitHub stars**, 100K+ certified developers, 12M+ daily agent executions
- **AutoGen: 55.6K GitHub stars**
- **94K+ GitHub stars across top frameworks** with 500%+ growth in community size 2023-2024
- **40+ active agent frameworks in production**
- **25% of companies launched agentic AI pilots in 2025** (Deloitte), growing to 50% in 2027

Sources: [IBM/Morning Consult survey](https://www.ibm.com/think/insights/ai-agents-2025-expectations-vs-reality), [Finro: AI Agents Valuation 2025](https://www.finrofca.com/news/ai-agents-valuation-2025), [CrewAI GitHub](https://github.com/crewAIInc/crewAI), [Index.dev: 50+ AI Agent Statistics](https://www.index.dev/blog/ai-agents-statistics)

### Where Agent Builders Hang Out

| Community | Type | Size/Activity |
|-----------|------|--------------|
| **LangChain Discord** | Framework community | Massive, linked to 97K GitHub stars |
| **CrewAI Discord + /r/AtomicAgents** | Framework community | 100K+ certified developers |
| **AutoGen Discord** | Framework community | 55K+ GitHub stars |
| **GPT Researcher, Flowise** | Open source tools | Active developer communities |
| **Lablab.ai** | Hackathon platform | Regular AI agent hackathons |
| **Devpost** | Hackathon platform | Hosts major agent competitions |
| **AI Agent Store** | Marketplace/directory | Agent listing and discovery |
| **GitHub (awesome-ai-agents)** | Curated lists | 1,500+ resources and tools |
| **Twitter/X #BuildWithAI** | Social | Where agent builders share work |
| **HackerNews** | Forum | Technical discussion and launches |
| **r/LocalLLaMA, r/artificial** | Reddit | AI development discussion |

Sources: [GitHub: discord-servers-for-ai-agents](https://github.com/best-ai-agents/discord-servers-for-ai-agents), [GitHub: awesome-ai-agents](https://github.com/jim-schwoebel/awesome_ai_agents), [AI Agent Store](https://aiagentstore.ai/)

### What Motivates Agent Builders

**1. Money (Prize pools are substantial and growing):**
- Microsoft AI Agents Hackathon 2025: $20K best overall + $5K category winners
- Global Agent Hackathon: $25K+ in cash and credits
- Google ADK Hackathon: $50K+ in prizes
- Salesforce Agentforce Hackathon: $140K total
- Mode AI Agent Hackathon: $75K prize pool
- Agent hackathons: fewer submissions per prize = higher expected value than traditional dev competitions

**2. Customer leads and distribution:**
- Hackathons are the "highest-EV path for agents with no distribution"
- Agent builders with no existing customer base have very few ways to find enterprise buyers
- Google Cloud Marketplace partners see **112% larger deal sizes** and faster deal cycles
- AWS Marketplace launched with 900+ agent listings from day one -- demand exists

**3. Reputation and portfolio:**
- Winners are "spotlighted for their execution, originality, and agentic thinking"
- Kaggle-style ranking creates portable credibility
- Enterprise buyers need third-party validation before purchasing from unknown builders

Sources: [Microsoft AI Agents Hackathon](https://microsoft.github.io/AI_Agents_Hackathon/), [Agentforce Hackathon](https://agentforcehackathon.devpost.com/), [Google Cloud AI Agent Marketplace](https://cloud.google.com/blog/topics/partners/google-cloud-ai-agent-marketplace)

### How Agent Builders Currently Find Customers

| Channel | Effectiveness | Problem |
|---------|--------------|---------|
| **Cold outreach** | Low conversion, high effort | Hard to prove capability without reference customers |
| **Word of mouth** | High quality but slow | Doesn't scale, requires existing network |
| **Cloud marketplaces (AWS, Google)** | Growing but generic | Listings are catalog-style, not competition-based |
| **Hackathons** | Good for visibility | One-off events, no ongoing pipeline |
| **Freelance platforms (Upwork, Toptal)** | Competitive on price | Race to bottom, hourly billing misaligned |
| **Content marketing / GitHub** | Long-term play | Slow to convert to enterprise deals |

**The gap:** No platform lets agent builders prove their capability against real enterprise problems in a head-to-head format, with the winner getting the deal. Straw fills this gap.

---

## 4. Go-to-Market Playbook

### Two-Sided Marketplace Strategies (NFX's 19 Tactics)

NFX identified 19 tactics from advising 60+ early marketplace startups. The most relevant for Straw:

| Tactic | How Straw Applies It |
|--------|---------------------|
| **#1: Get the hardest side first** | Supply (agent builders) is easier than demand (companies). Start with demand. |
| **#2: Appeal tightly to a niche** | Start with one vertical (e.g., customer service agents or coding agents) |
| **#3: Subsidize the most valuable side** | Free task posting for early companies; prize pools for builders |
| **#7: Build a SaaS tool for one side** | Evaluation-as-a-service for companies (standalone value even without marketplace) |
| **#9: Find one giant user** | Land one marquee company (a YC company, a known brand) |
| **#12: Product first, marketplace second** | Build the evaluation engine first, then open the marketplace |
| **#13: Connect sides by hand** | Manually match early companies with qualified builders |
| **#17: Set a time constraint** | Time-bounded competitions create urgency and excitement |

Source: [NFX: 19 Tactics to Solve the Chicken-or-Egg Problem](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem)

### How Kaggle Bootstrapped Supply

**Kaggle's founder insight:** "Most CIOs had predictive modeling near the top of their priority list, but they were finding it a difficult product to buy: one vendor would sell a 'Support Vector Machine' solution for $2M, another a 'Neural Network' solution for $1M, and it's impossible to know which would work best on their problem."

**Growth trajectory:**
1. **2010 (Launch):** Started with sponsored competitions (Merck, Allstate, NASA). Had 17,000 PhDs and data scientists in early community.
2. **2011:** Heritage Health Prize ($3M) brought global attention. Raised $12.5M.
3. **2014:** CERN Higgs Boson Challenge proved platform could tackle cutting-edge science.
4. **2015-2020:** Rapid expansion. Kaggle Learn launched. Educational partnerships.
5. **2017:** Crossed 1M registered users. **Acquired by Google.**
6. **2023:** Over 15M users in 194 countries.

**Key lessons for Straw:**
- Started demand-side: companies with real problems provided competitions
- Supply followed naturally: data scientists came for prizes, stayed for reputation
- Prize money was the hook; leaderboard ranking was the retention mechanism
- Credibility came from real-world sponsors (NASA, CERN), not synthetic problems

Sources: [Kaggle Wikipedia](https://en.wikipedia.org/wiki/Kaggle), [Medium: Kaggle's Meteoric Rise](https://medium.com/data-science-clarity/kaggles-meteoric-rise-how-it-became-the-world-s-largest-data-science-community-c0e578875865), [Fast Company: Kaggle's Anthony Goldbloom](https://www.fastcompany.com/1789736/kaggles-anthony-goldbloom-helps-companies-crunch-data-crowdsourcing-quant-geniuses)

### How Toptal Bootstrapped Demand

**Toptal's strategy:** Quality curation over open access.

1. **Rigorous supply-side filtering:** Only top 3% of applicants approved. This created scarcity and premium positioning.
2. **Human-driven matching:** Company reaches out to understand needs, manually matches freelancers. High-touch, not automated.
3. **Premium pricing:** Quality positioning enabled higher transaction values and commission rates than Upwork/Fiverr.
4. **Captured the high-end segment:** While competitors raced to the bottom on price, Toptal owned the quality tier.

**Key lessons for Straw:**
- Curate the supply side ruthlessly -- top agents only
- Quality > quantity in early marketplace
- Premium positioning attracts enterprise buyers
- Manual matching early on; automate later

Source: [Harvard Digital Innovation: Toptal Growing in Competitive Space](https://d3.harvard.edu/platform-digit/submission/toptal-com-growing-a-new-marketplace-platform-in-a-competitive-space/)

### Should Straw Start Supply-Side or Demand-Side?

**Start demand-side (companies), for three reasons:**

1. **Companies define the problems.** Without real tasks, agent builders have nothing to compete on. The tasks ARE the product.
2. **Supply is abundant.** 99% of developers are building agents. 100K+ certified on CrewAI alone. Supply will come if there are real problems with real prize money.
3. **Kaggle proved it.** Kaggle started with company-sponsored competitions. Supply followed the prizes.

**The sequence:**
1. Land 3-5 companies willing to post real tasks (free or heavily subsidized)
2. Recruit 50-100 agent builders through hackathon communities, Discord, Twitter
3. Run the first competitions manually if needed
4. Let results speak -- winning agents create case studies
5. Word of mouth from both sides feeds the flywheel

### Minimum Viable Marketplace for Straw

**The smallest version that works:**

- **3-5 companies** posting real tasks with $500-5,000 bounties
- **50-100 agent builders** competing on those tasks
- **Automated scoring** (LLM judge + optional Docker test suites)
- **Public leaderboard** showing results
- **One vertical** (e.g., customer service agents, or coding tasks)

**What you DON'T need at launch:**
- Thousands of tasks
- Every industry
- Complex matchmaking
- Self-serve everything
- Payments infrastructure beyond Stripe

**NFX's advice:** "Start in a really, really small niche. Bring in the supply side by showing them the buyer potential. Bring in just enough customers to match with the first small group of sellers."

Source: [NFX: 19 Tactics](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem)

---

## 5. Pricing Research

### What Companies Currently Pay for AI Evaluations/POCs

| Stage | Cost Range | Details |
|-------|-----------|---------|
| **Early-stage validation** | $10K-$100K | Within weeks, initial feasibility |
| **AI Agent POC** | $10K-$60K | Depending on complexity, data needs, integrations |
| **Full POC** | $50K-$150K | Delivers insights that improve implementation success |
| **POC to production transition** | 250-400% of POC cost | Infrastructure, data pipelines, integration |
| **Average monthly AI spending** | $85,521 (2025) | 36% increase from 2024's $62,964 |
| **Investment per AI use case** | $1.0M-$2.6M | Average across enterprise |

Sources: [USM Systems: AI Project Cost Estimation 2026](https://usmsystems.com/ai-project-cost-estimation/), [Zylo: AI Pricing 2026](https://zylo.com/blog/ai-cost/), [a16z: How 100 Enterprise CIOs Are Building and Buying Gen AI](https://a16z.com/ai-enterprise-2025/)

### Cost of a Bad AI Vendor Decision

| Failure Type | Cost | Source |
|-------------|------|--------|
| **Average sunk cost per abandoned initiative** | $7.2M | Pertama Partners |
| **Average repair cost for failed implementation** | EUR 710,000 (often 2x initial budget) | National CIO Review |
| **Pilot purgatory annual cost (avg enterprise)** | $15-25M | Industry estimates |
| **Stock-out surge from bad AI deployment** | $8M in lost sales + 4 months rollback | Preferred Data case study |
| **Undocumented AI service spending** | $280K/month discovered at one company | Medium |
| **AI-related cloud waste** | 30-50% of spend evaporates | CloudZero |

Sources: [Pertama Partners: AI Project Failure Statistics](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026), [National CIO Review: Compounding Cost of AI Mistakes](https://nationalcioreview.com/articles-insights/extra-bytes/the-compounding-cost-of-ai-mistakes-inside-the-enterprise/), [GetLeverage: Hidden Costs of AI Failures](https://www.gettheleverage.com/p/the-hidden-costs-of-ai-failures)

### How $99/Task + 5% Compares

**Straw's proposed pricing: $99 per task posted + 5% of hire/acquisition price.**

| Current Cost | Straw Cost | Savings |
|-------------|-----------|---------|
| $50K-$150K for a single POC | $99 to post + eval multiple agents | **99.8%+ reduction in evaluation cost** |
| 3-6 months per sequential POC | Days to weeks for parallel evaluation | **90%+ reduction in evaluation time** |
| $7.2M avg sunk cost on wrong vendor | $99 + evidence-based selection | **Prevention of catastrophic misselection** |
| $15-25M annual pilot purgatory cost | $99/task, pay only for what you evaluate | **Eliminates open-ended pilot spending** |

**The value proposition isn't the $99 fee. It's the $7.2M in sunk costs you avoid.**

At $99/task, Straw is priced to be an impulse decision for any team with an AI evaluation budget. The 5% on hire/acquisition is where the real revenue comes from -- and it's trivially justified against the alternative cost of getting the decision wrong.

### Pricing Comparables

| Platform | Model | Revenue |
|----------|-------|---------|
| **Kaggle** | Free competitions + corporate sponsorships ($10K-$3M prizes) | Acquired by Google (2017) |
| **Toptal** | Take rate on freelancer billing | $600M+ revenue |
| **Hired.com** | Placement fee (% of salary) | Acquired by Vettery (2020), after raising $133M |
| **HackerRank** | SaaS + assessment fees | $100M+ ARR |
| **AI consultancies** | $600-$1,200/day | Per-engagement |

---

## 6. Distribution Channels

### AI Conferences Where Buyers and Builders Overlap

| Event | Date | Location | Audience | Why It Matters |
|-------|------|----------|----------|---------------|
| **AI Dev 26 x SF** | Apr 28-29, 2026 | San Francisco | 1,200+ developers, builders, researchers | Builder-dense, high engagement |
| **AI INFRA Summit 5** | May 1, 2026 | Sunnyvale (Plug and Play) | Operators, builders, investors | Infrastructure focus, decision makers |
| **AI Engineer World's Fair** | Jun 30, 2026 | Moscone Center, SF | Engineers building with AI APIs | Perfect audience for both sides |
| **Agentic AI Summit** | 3-week virtual | Online | Builders, engineers, business professionals | Agent-specific, hands-on workshops |
| **AI Infra Summit** | Sep 15-17, 2026 | Santa Clara | Infrastructure builders | Technical depth |
| **The AI Summit London** | Jun 2026 | London (Tech Week) | Enterprise AI practitioners | Enterprise buyers |
| **The AI Summit New York** | Dec 9-10, 2026 | Javits Center | Business leaders, technologists | Enterprise scale |
| **TechEquity AI Silicon Valley** | 2026 | Silicon Valley | 3,000+ leaders, builders, policymakers | Cross-cutting audience |

Sources: [Vendelux: AI Conferences Guide 2026](https://vendelux.com/blog/ai-conferences), [InnoLead: Top AI Conferences for Enterprise Executives](https://www.innovationleader.com/topics/articles-and-content-by-topic/scouting-trends-and-tech/top-ai-conferences-and-trade-shows-for-enterprise-executives-2025-and-2026/)

### Online Communities Where AI Procurement Happens

| Community | Type | Decision-Maker Density |
|-----------|------|----------------------|
| **HackerNews** | Forum | CTOs, VPs Engineering, founders -- high |
| **AI Twitter/X** | Social | Agent builders, VCs, technical leaders -- high |
| **r/artificial, r/MachineLearning** | Reddit | Researchers, developers -- medium |
| **LangChain/CrewAI/AutoGen Discords** | Framework communities | Builders -- very high |
| **CTO Craft, LeadDev** | Professional communities | Engineering leaders -- very high |
| **Chief AI Officer networks** | Professional | Enterprise buyers -- very high |

### Partnership Opportunities

**Tier 1: Cloud Providers**
- AWS Marketplace (900+ agent listings, Anthropic partner, standardized templates)
- Google Cloud AI Agent Marketplace (A2A protocol, Gemini integration)
- Microsoft AI Cloud Partner Program (400,000+ partners worldwide)

**Tier 2: AI Consultancies & System Integrators**
- Accenture (multi-cloud AI partnerships with AWS, Microsoft, Google)
- BCG (formal partnerships with OpenAI and Anthropic)
- McKinsey (1,000+ partners including all major cloud providers)
- Deloitte (3,235 leaders surveyed for State of AI report -- they have the relationships)

**Tier 3: Agent Framework Communities**
- LangChain (97K GitHub stars, natural distribution partner)
- CrewAI (100K+ certified developers)
- AutoGen (55K+ GitHub stars)

Sources: [Google Cloud AI Agent Marketplace](https://cloud.google.com/blog/topics/partners/google-cloud-ai-agent-marketplace), [AWS: AI Agents and Tools in Marketplace](https://aws.amazon.com/about-aws/whats-new/2025/07/ai-agents-tools-aws-marketplace/), [Virtasant: Big Five Consulting AI Partnerships](https://www.virtasant.com/ai-today/big-five-consulting-betting-billions-on-ai-partnerships)

### Content Marketing Angles

**High-value content plays:**

1. **"AI Agent Benchmark Reports"** -- Run public evaluations of popular agents on standardized tasks. Publish results. Become the trusted source of truth. (This is how Straw becomes the NIST of AI agents.)

2. **"Cost of Wrong Vendor" Calculator** -- Interactive tool showing $7.2M avg sunk cost, time wasted, opportunity cost. CTOs share this with their CFOs.

3. **"Enterprise AI Evaluation Playbook"** -- Free guide that establishes Straw's framework as the standard. Downloads = leads.

4. **Industry-specific case studies** -- "How [Company X] saved $2M by evaluating 5 AI agents in parallel instead of running sequential POCs."

5. **Leaderboard as content** -- Public leaderboard generates organic traffic from people searching for "best AI agent for [task]."

---

## 7. Case Studies from Analogous Companies

### Hired.com: Companies Post, Candidates Compete

**The model:** Reversed the job application process. Instead of candidates applying to companies, companies bid on candidates with interview requests.

**What worked:**
- Founded 2012 by Matt Mickiewicz, Douglas Feirstein, Allan Grant
- Raised $133M in funding (Sierra Ventures, Crosslink Capital)
- "Talent Advocate" model: users receive guidance throughout the process
- Transparency: employers see competing offers, recruit with insight
- Grew to meaningful scale before acquisition by Vettery in 2020

**What went wrong:**
- Once valued at $500M, discussed winding down before acquisition
- The reverse marketplace only works if the supply side is scarce and high-quality
- Commoditized talent platform struggled against LinkedIn and direct hiring

**Lessons for Straw:**
- Quality curation of the supply side is critical (agents, not just anyone)
- Transparency (showing competing solutions) is a genuine differentiator
- The marketplace must deliver unique value that neither side can get elsewhere
- Don't let the supply side become commoditized

Sources: [HN: Job Site Hired Discusses Winding Down](https://news.ycombinator.com/item?id=25164655), [HR Dive: Vettery Acquires Hired](https://www.hrdive.com/news/vettery-acquires-hired-to-advance-recruiting-marketplace-model/591907/)

### Brex: Founder-Friendly GTM in a Broken Enterprise Process

**The model:** Corporate cards for startups that traditional banks wouldn't serve.

**What worked:**
- Founded 2017 by Henrique Dubugras and Pedro Franceschi (W2017 YC)
- Identified a gap: startups "literally couldn't get a card" from traditional providers
- **80% of YC companies used Brex** -- YC batch was the distribution channel
- Bay Area billboards built brand awareness with the startup ecosystem
- From zero to 50%+ market share in startup corporate cards (Q2 2018 to Q2 2021)
- "One in every three startups in the US" used Brex by January 2024
- Revenue growth accelerated 3x, sales efficiency improved 40% after simplification

**Key GTM lessons for Straw:**
- Start with a concentrated community (YC startups) and dominate it
- Use accelerator networks as distribution channels
- The product should be radically simpler than the alternative
- Grow with your customers: startups using Brex at seed still used it at Series D
- Simplify sales motion: removing management layers improved results

Source: [Contrary Research: Brex Business Breakdown](https://research.contrary.com/company/brex)

### Figma: Community-Led Growth from Stealth to Enterprise

**The model:** Browser-based design tool that spread bottom-up through individual designers, then sold top-down to enterprises.

**5 phases of community-led growth:**

1. **Stealth (2012-2015):** Individual relationships. Feedback over sales. "We wanted to build credibility by really taking their feedback to heart."
2. **Launch (2015):** Data-driven outreach. CEO built a script mapping influence nodes on Design Twitter. Targeted influencers strategically.
3. **Evangelists (2015-2017):** Hired first advocate organically. Created "Pixel Pong" -- livestreamed design competitions. Small events, big engagement.
4. **Pricing (2017, ~2 years free):** Strategic gating. Free users got unlimited collaboration but limited files. "Gate should funnel customers toward your magic moment."
5. **Enterprise (2019+):** Sales team added ONLY after bottom-up motion worked. Sales assisted existing internal champions, didn't cold-pitch.

**Key GTM lessons for Straw:**
- Map the influence network in your community (AI Twitter, GitHub stars, Discord moderators)
- "Things that don't scale" early: pizza gatherings, manual matching, personal demos
- Make the product free long enough for word of mouth to work
- Let enterprise adoption happen organically before adding sales
- Evangelists > marketing spend in early days
- Competition events (Pixel Pong) drove engagement and visibility

Source: [First Round Review: The 5 Phases of Figma's Community-Led Growth](https://review.firstround.com/the-5-phases-of-figmas-community-led-growth-from-stealth-to-enterprise/)

---

## 8. Competitive Landscape for Agent Marketplaces

### Who's Already in the Space

| Competitor | Model | Limitation vs. Straw |
|-----------|-------|---------------------|
| **AWS AI Agent Marketplace** | Catalog of 900+ agents for purchase | No head-to-head evaluation. Catalog, not competition. |
| **Google Cloud AI Agent Marketplace** | Discovery + purchase via GCP | Tied to Google ecosystem. No custom evaluation. |
| **Salesforce AgentExchange** | Agent marketplace within Salesforce | Salesforce-only. Not cross-platform. |
| **AI Agent Store** | Directory/listing platform | No evaluation, no competition, just a catalog |
| **Kaggle** | ML competition platform | Fixed-format predictions. Not for agents, APIs, or complex artifacts. |
| **HackerRank** | Developer assessment | Evaluates developers, not AI agents |
| **Maxim AI** | Agent evaluation platform | Developer tool for testing own agents, not a marketplace |
| **SWE-bench** | Coding agent benchmark | Standardized tasks only, not custom enterprise problems |
| **MLE-bench** | ML engineering benchmark | Research benchmark, not a buying platform |

**The gap Straw fills:** No platform combines custom evaluation criteria + head-to-head competition + enterprise procurement + marketplace for hiring/acquiring. AWS and Google are catalogs. Kaggle is research. HackerRank is hiring. Maxim is dev tooling. Straw is the only platform where the evaluation IS the marketplace.

Sources: [AWS: AI Agents and Tools in Marketplace](https://aws.amazon.com/about-aws/whats-new/2025/07/ai-agents-tools-aws-marketplace/), [AI Agents Directory: AI Agents Marketplaces](https://aiagentsdirectory.com/blog/ai-agents-marketplaces-5-top-platforms-and-how-to-choose)

---

## 9. Recommended GTM Sequence

### Phase 0: Pre-Launch (Now - Launch)

1. **Identify 10 target companies** in one vertical (suggest: customer service or coding tasks)
2. **Recruit 5 companies** to post inaugural tasks (free, subsidized, or with co-funded prize pools)
3. **Build relationships** in LangChain, CrewAI, AutoGen Discord communities
4. **Create content:** "AI Agent Evaluation Playbook" guide, open benchmark reports
5. **Map influence network** on AI Twitter (a la Figma's CEO)

### Phase 1: Launch (Months 1-3)

1. **Run first 5-10 competitions** with real enterprise tasks
2. **Manually recruit** 50-100 agent builders from hackathon communities
3. **Connect sides by hand** where needed (NFX tactic #13)
4. **Publish results** as case studies and benchmark reports
5. **Target one marquee customer** to anchor credibility (NFX tactic #9)

### Phase 2: Prove the Model (Months 3-6)

1. **Land 25-50 paying companies** posting tasks
2. **Grow builder pool to 500+** through word of mouth and content
3. **Establish public leaderboard** as a content/SEO play
4. **Start charging:** $99/task + 5% on hire/acquisition
5. **Build case studies** showing time/cost savings vs. traditional POC

### Phase 3: Scale (Months 6-12)

1. **Expand to 2-3 verticals**
2. **Partnership with one cloud provider** (AWS or Google Cloud marketplace integration)
3. **Add self-serve for both sides**
4. **Content marketing flywheel** producing benchmark reports, leaderboards, case studies
5. **Enterprise sales motion** to companies with AI evaluation teams

### Phase 4: Dominate (Year 2+)

1. **Become the standard** for AI agent evaluation
2. **Partnership with consultancies** (Deloitte, BCG, McKinsey use Straw in engagements)
3. **Regulatory positioning:** Straw evaluations satisfy EU AI Act documentation requirements
4. **International expansion**
5. **Platform effects:** Agent builders NEED to be on Straw, companies NEED to use Straw

---

## Key Sources

- [NFX: 19 Tactics to Solve the Chicken-or-Egg Problem](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem)
- [First Round Review: 5 Phases of Figma's Community-Led Growth](https://review.firstround.com/the-5-phases-of-figmas-community-led-growth-from-stealth-to-enterprise/)
- [Contrary Research: Brex Business Breakdown](https://research.contrary.com/company/brex)
- [Harvard: Toptal Growing in Competitive Space](https://d3.harvard.edu/platform-digit/submission/toptal-com-growing-a-new-marketplace-platform-in-a-competitive-space/)
- [causaLens: The Death of AI PoCs](https://causalens.com/blogs/the-death-of-ai-pocs-a-new-model-for-buying)
- [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [AWS: Evaluating AI Agents](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/)
- [Futurum: Technical Leaders Own 72% of AI Purchasing Power](https://futurumgroup.com/press-release/technical-leaders-own-72-of-enterprise-ai-purchasing-power/)
- [CTO Magazine: Inside the Mind of the AI Buyer](https://ctomagazine.com/meet-the-ai-buyer/)
- [Menlo Ventures: 2025 State of Generative AI in the Enterprise](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)
- [a16z: Where Enterprises are Actually Adopting AI](https://a16z.com/where-enterprises-are-actually-adopting-ai/)
- [a16z: How 100 Enterprise CIOs Are Building and Buying Gen AI](https://a16z.com/ai-enterprise-2025/)
- [Kaggle Wikipedia](https://en.wikipedia.org/wiki/Kaggle)
- [Medium: Kaggle's Meteoric Rise](https://medium.com/data-science-clarity/kaggles-meteoric-rise-how-it-became-the-world-s-largest-data-science-community-c0e578875865)
- [Deloitte: State of AI in the Enterprise 2026](https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html)
- [Google Cloud AI Agent Marketplace](https://cloud.google.com/blog/topics/partners/google-cloud-ai-agent-marketplace)
- [AWS: AI Agents and Tools in Marketplace](https://aws.amazon.com/about-aws/whats-new/2025/07/ai-agents-tools-aws-marketplace/)
- [Salesmate: AI Agent Adoption Statistics by Industry](https://www.salesmate.io/blog/ai-agents-adoption-statistics/)
- [Pertama Partners: AI Project Failure Statistics](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026)
- [National CIO Review: Compounding Cost of AI Mistakes](https://nationalcioreview.com/articles-insights/extra-bytes/the-compounding-cost-of-ai-mistakes-inside-the-enterprise/)
