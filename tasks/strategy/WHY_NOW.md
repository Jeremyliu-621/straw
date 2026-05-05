# Straw: "Why Now?" — Market Timing Research

**Purpose:** YC application "Why Now?" argument. Every data point cited with sources.
**Date:** April 14, 2026

---

## TL;DR for YC Application

The AI agent market hit $7.6B in 2025 and is growing at 49.6% CAGR. There are now 89 agent frameworks with 1,000+ GitHub stars (up from 14 in 2024). Every major cloud vendor and model provider has shipped agent SDKs. Enterprise adoption is at 79%. Yet there is no standard way to compare agents on real enterprise tasks — existing benchmarks show a 37% performance gap between lab tests and production. Evaluation infrastructure (LLM-as-judge, sandboxed execution, cheap inference) only matured in the last 18 months. The EU AI Act is now enforcing transparency and audit requirements. The market has supply (thousands of agents), demand (enterprises spending billions), and zero objective comparison infrastructure. Straw is that infrastructure.

---

## 1. The AI Agent Explosion

### 1.1 Framework Proliferation

The number of AI agent frameworks with 1,000+ GitHub stars grew from **14 in 2024 to 89 in 2025** — a 535% increase. The total ecosystem now includes 40+ frameworks in active production use.

**Key frameworks and traction:**
- **LangChain/LangGraph:** 126K GitHub stars. 47M+ PyPI downloads. Running in production at LinkedIn, Uber, and 400+ companies. 300% increase in downloads Q1 2024 to Q1 2025.
- **CrewAI:** 44K stars. $18M Series A. $3.2M ARR by July 2025. 100,000+ agent executions/day. 150+ enterprise customers. 60% of Fortune 500 companies now using it.
- **AutoGen (Microsoft):** 54K stars. Merged with Semantic Kernel into unified Microsoft Agent Framework (GA Q1 2026). Production SLAs, multi-language support, deep Azure integration.
- **OpenAI Agents SDK:** Launched March 11, 2025. Open-source, provider-agnostic. Supports tool use, handoffs, guardrails, and tracing.

Sources:
- [AI Agent Framework Landscape 2025](https://medium.com/@hieutrantrung.it/the-ai-agent-framework-landscape-in-2025-what-changed-and-what-matters-3cd9b07ef2c3)
- [Best AI Agent Frameworks 2025](https://www.getmaxim.ai/articles/top-5-ai-agent-frameworks-in-2025-a-practical-guide-for-ai-builders/)
- [Langfuse Agent Comparison](https://langfuse.com/blog/2025-03-19-ai-agent-comparison)
- [AI Agent Frameworks 2026 Comparison](https://fungies.io/ai-agent-frameworks-comparison-2026-langchain-crewai-autogen/)

### 1.2 GitHub & Package Growth

- GitHub hosts **4.3M+ AI-related repositories** as of 2025, with 178% YoY growth in LLM-focused projects.
- **1.1M+ public repositories** now import an LLM SDK (+178% YoY).
- **1.05M+ contributors** and **1.75M monthly commits** to LLM projects (+4.8X since 2023).
- **693K+ new generative AI repositories** created in the last 12 months, up from ~400K in 2024.
- Over **70,000 new public generative AI projects** created in both 2024 and early 2025.

Sources:
- [GitHub Octoverse 2024](https://github.blog/news-insights/octoverse/octoverse-2024/)
- [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [Top AI GitHub Repos 2026 — ByteByteGo](https://blog.bytebytego.com/p/top-ai-github-repositories-in-2026)

### 1.3 Big Three Agent Bets

**OpenAI:**
- Agents SDK launched March 2025 (open source, Python + TypeScript).
- Contributed AGENTS.md specification (August 2025), adopted by 60,000+ open-source projects.
- Co-founded the Agentic AI Foundation under the Linux Foundation (December 2025).

**Anthropic:**
- Released Model Context Protocol (MCP) as open standard (November 2024). Now supported by Microsoft Copilot, ChatGPT, Gemini, and dozens of dev tools.
- Shipped Claude computer use capabilities.
- Co-founded Agentic AI Foundation. Donated MCP to the Foundation.
- Published "Demystifying Evals for AI Agents" — a foundational guide on agent evaluation.

**Google:**
- Launched Antigravity agentic development platform (supports Gemini, Claude, and GPT models).
- Joined the Agentic AI Foundation as a member alongside AWS, Microsoft, Cloudflare, and others.

**Together (December 2025):** OpenAI, Anthropic, and Block co-founded the Agentic AI Foundation (AAIF) under the Linux Foundation. Members include AWS, Google, Microsoft, Cisco, IBM, Oracle, Salesforce, SAP, Snowflake, and Hugging Face. The Foundation consolidates MCP, AGENTS.md, and Block's Goose framework into a neutral consortium for agent interoperability standards.

Sources:
- [OpenAI Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/)
- [Linux Foundation AAIF Announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [Anthropic MCP Donation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- [TechCrunch AAIF Coverage](https://techcrunch.com/2025/12/09/openai-anthropic-and-block-join-new-linux-foundation-effort-to-standardize-the-ai-agent-era/)
- [Anthropic Demystifying Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 1.4 Enterprise Adoption Data

- **79% of organizations** report some level of agentic AI adoption (2025).
- **96% plan to expand** AI agent usage.
- **62% of organizations** are experimenting with AI agents, but **fewer than 10% are scaling** them.
- **78% of companies** use AI in at least one function (up from 55% in 2023) — McKinsey 2025.
- **88% of business leaders** plan to increase AI-related budgets in the next 12 months — PwC 2025.
- Gartner projects **33% of enterprise software** will include agentic AI by 2028, up from **less than 1% in 2024**.
- Gartner predicts **40% of enterprise apps** will feature task-specific AI agents by 2026, up from **less than 5% in 2025**.

Sources:
- [McKinsey State of AI 2025](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)
- [PwC AI Agent Survey](https://www.pwc.com/us/en/tech-effect/ai-analytics/ai-agent-survey.html)
- [Gartner: 40% of Enterprise Apps by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025)
- [Datagrid AI Agent Statistics](https://datagrid.com/blog/ai-agent-statistics)
- [Writer Enterprise AI Adoption 2025](https://writer.com/blog/enterprise-ai-adoption-survey/)

### 1.5 Market Size & Funding

- AI agent market: **$5.4B (2024) → $7.6B (2025) → $10.9B (2026)**. CAGR: **49.6%**.
- Long-term projection: **$180B+ by 2033**.
- AI agent startups raised **$3.8B in 2024** alone (3x the prior year).
- Total AI investment in 2025: **$202.3B** (75%+ YoY growth from $114B in 2024).
- Notable agent-specific rounds:
  - Cognition (Devin): $400M Series C at $10.2B valuation (September 2025). ARR from $1M to $73M in 9 months.
  - Sierra AI: $350M at $10B valuation (September 2025). Crossed $100M ARR in 7 quarters.
  - E2B (sandbox infra): $21M Series A (July 2025). ~50% of Fortune 500 as customers.

Sources:
- [MarketsandMarkets AI Agents Market](https://www.marketsandmarkets.com/Market-Reports/ai-agents-market-15761548.html)
- [Precedence Research AI Agents Market](https://www.precedenceresearch.com/ai-agents-market)
- [TechCrunch: US AI Startups $100M+ Rounds in 2025](https://techcrunch.com/2026/01/19/here-are-the-49-us-ai-startups-that-have-raised-100m-or-more-in-2025/)
- [Cognition AI $400M Raise](https://techcrunch.com/2025/09/08/cognition-ai-defies-turbulence-with-a-400m-raise-at-10-2b-valuation/)
- [E2B $21M Series A](https://siliconangle.com/2025/07/28/e2b-shares-vision-sandboxed-cloud-environments-every-ai-agent-raising-21m-funding/)
- [Crunchbase: AI Funding Trends 2025](https://news.crunchbase.com/ai/big-funding-trends-charts-eoy-2025/)

---

## 2. The Evaluation Gap

### 2.1 Current Benchmarks Are Broken

**SWE-bench:** ~68% of tasks in original SWE-bench were unsolvable due to underspecified problems or unfair tests, leading to the creation of SWE-bench Verified. Even then, augmented tests changed 41% of rankings.

**Enterprise gap:** A 2025 survey of 120 agent evaluation frameworks found missing enterprise requirements including multi-step granular evaluation, cost-efficiency measurement, safety/compliance focus, and live adaptive benchmarks. Analysis of 12 major agentic benchmarks documented validity issues affecting 7 out of 10 benchmarks with cost misestimation rates up to 100%.

**Domain blind spots:** Current benchmarks are confined to domains with available environments — WebArena for web browsing, OSWorld for desktop, SWE-bench for code repos, TAU-bench for retail/airline APIs. The vast majority of high-value professional work has no benchmark coverage at all.

**Lab vs. production:** There is a **37% performance gap** between benchmark performance and production deployment success. Current benchmarks optimize for task completion accuracy while enterprises need holistic evaluation across cost, reliability, security, and operational constraints.

Sources:
- [Multi-Dimensional Framework for Enterprise Agentic AI](https://arxiv.org/html/2511.14136v1)
- [SWE-Bench Pro](https://openreview.net/forum?id=9R2iUHhVfr)
- [The Reliability Gap: Agent Benchmarks for Enterprise](https://simmering.dev/blog/agent-benchmarks/)
- [Best AI Agent Evaluation Benchmarks 2025](https://o-mega.ai/articles/the-best-ai-agent-evals-and-benchmarks-full-2025-guide)
- [Stanford HAI 2025 AI Index Report](https://hai.stanford.edu/ai-index/2025-ai-index-report)

### 2.2 "Evals Are the New Unit Tests"

**Garry Tan, CEO of Y Combinator (February 21, 2025):**
> "Evals are emerging as the real moat for AI startups. Hard won insights about customers and their business logic discovered by founders acting almost as ethnographers spelunking in the underserved slices of the GDP pie chart."

The phrase "evals are the new unit tests" has become an industry mantra. Unlike traditional tests, AI evals must handle:
- **Non-deterministic outputs:** The same prompt can generate dozens of valid responses.
- **Graded performance:** Outputs exist on a spectrum (excellent to terrible), not pass/fail.
- **Slow feedback loops:** Running comprehensive evals can take minutes or hours.

McKinsey's Q2 2025 survey shows **72% of organizations** ramped up LLM spending by 2024, pushing them to evaluate for real risks. Teams now treat evals like unit and integration tests in CI, staging, and production shadow mode.

Sources:
- [Garry Tan Tweet on Evals](https://x.com/garrytan/status/1892952656940880036)
- [AI Evals as the New Unit Tests — Medium](https://aakashgupta.medium.com/why-ai-evals-are-the-new-unit-tests-the-quality-assurance-revolution-in-genai-456888217342)
- [Why Evals Matter 2025 — Maxim](https://www.getmaxim.ai/articles/why-evals-matter-the-backbone-of-reliable-ai-in-2025/)
- [Time: AI Evaluations Safety](https://time.com/7203729/ai-evaluations-safety/)

### 2.3 Anthropic's Own Assessment of the Problem

Anthropic's engineering blog ("Demystifying Evals for AI Agents") states that agent evaluations are fundamentally harder because agents use tools across many turns, modify environmental state, and adapt as they go — mistakes compound. They cite a case where Claude Opus found a creative loophole in a benchmark (better for the user, but "failed" the eval as written), demonstrating that static evals cannot capture real-world agent quality.

Source:
- [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### 2.4 Stanford AI Index Findings

Stanford's 2025 AI Index Report found that:
- In **short time-horizon** settings (2 hours), top AI agents score **4x higher** than human experts.
- But with **more time** (32 hours), **humans outperform AI 2-to-1**.
- This suggests that quick benchmarks systematically overstate agent capability for real-world tasks that take days or weeks — exactly the kind of work Straw evaluates.

Source:
- [Stanford HAI 2025 AI Index Report](https://hai.stanford.edu/ai-index/2025-ai-index-report)

---

## 3. The Procurement Shift

### 3.1 From "Buy Software" to "Hire Agents"

**Satya Nadella (Microsoft Build 2025):** Declared the end of the chatbot era and the beginning of the agent era. Predicted that AI agents will "consume database backends directly," rendering traditional SaaS UIs obsolete. The SaaS model is vulnerable because agents don't need user interfaces.

**Sam Altman (2025):** Said agents would "join the workforce" in 2025. Emphasized that agents will eat "the coordination layer of work, not just the content layer."

**a16z:** "AI is the best thing that ever happened to the software industry." Value shifts from "users" (seats) to "output" (work performed). Pricing models are fundamentally changing from per-seat to per-outcome.

**Gartner:** Predicts **90% of all B2B purchases** will be handled by AI agents within 3 years, channeling **$15 trillion** in spending through automated exchanges.

Sources:
- [Satya Nadella 2025 Quotes](https://www.digit.in/features/general/satya-nadella-in-2025-5-huge-quotes-by-microsoft-ceo-on-ai-and-future.html)
- [Microsoft CEO: AI Agents Will Transform SaaS](https://www.cxtoday.com/data-analytics/microsoft-ceo-ai-agents-will-transform-saas-as-we-know-it/)
- [a16z: AI Will Eat Application Software](https://a16z.com/good-news-ai-will-eat-application-software/)
- [a16z: AI Is Upending SaaS Pricing](https://a16z.com/podcast/ai-is-upending-saas-pricing/)
- [Gartner: AI Agents $15T in B2B Purchases by 2028](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/)

### 3.2 M&A Validates the Category

- **ServiceNow acquired Moveworks** for **$2.85B** (March 2025, completed December 2025) — the largest acquisition in ServiceNow history, specifically to add agentic AI capabilities. Inside ServiceNow, AI agents already resolve 90% of IT and 89% of customer support requests autonomously.
- **Salesforce launched Agentforce** as its core AI agent platform.
- Gartner estimates only **~130 of thousands** of agentic AI vendors are "real" — meaning most buyers have no way to distinguish signal from noise. This is exactly the problem Straw solves.

Sources:
- [ServiceNow Moveworks Acquisition](https://techcrunch.com/2025/03/10/servicenow-buys-moveworks-for-2-85b-to-grow-its-ai-portfolio/)
- [Gartner: Only 130 Real Agentic AI Vendors](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)

### 3.3 The Demo Problem

Enterprise AI procurement is fundamentally broken:
- Companies compare vendors on **demos, brand strength, or feature breadth** before agreeing on what evidence should decide the outcome.
- Many vendors produce compelling demos. **Far fewer** support multi-step, agentic workflows in production with security, auditability, and operating model requirements.
- Average monthly AI spending surged from **$62,964 in 2024 to $85,521 in 2025** (+36%), yet evaluation processes still rely on "sanitized demos" rather than testing on real data in real workflows.
- MIT research found AI tools built through **external vendor partnerships succeeded ~2x as often** as internal builds — domain expertise matters more than model sophistication. But there's no marketplace to find and validate that domain expertise.

Sources:
- [AI Vendor Selection Pitfalls — Dunnixer](https://www.dunnixer.com/insights/articles/the-four-classic-pitfalls-in-ai-vendor-selection-and-how-to-avoid-them)
- [6 Dimensions of AI Vendor Evaluation — Dunnixer](https://www.dunnixer.com/insights/articles/the-six-dimensions-of-ai-vendor-evaluation-that-matter-most)
- [Enterprise AI Trends 2025 — Superhuman](https://blog.superhuman.com/enterprise-ai-trends/)

---

## 4. Infrastructure Timing

### 4.1 What Didn't Exist 2 Years Ago

| Capability | 2023 State | 2025 State |
|---|---|---|
| LLM-as-Judge | Academic concept (Zheng et al. 2023) | Production-grade. Comprehensive surveys. Used at scale by major AI labs. |
| Agent SDKs | LangChain only real option | OpenAI Agents SDK, Anthropic MCP, Microsoft Agent Framework, CrewAI, 40+ others |
| Sandboxed execution | DIY Docker setups | E2B (15M sessions/month), Docker Sandboxes (microVM), Daytona (sub-90ms cold starts) |
| Inference cost | $20/M tokens (GPT-3.5 level, Nov 2022) | $0.07/M tokens (same performance) — 285x cheaper |
| Agent interoperability | None | MCP standard, AGENTS.md (60K+ repos), Agentic AI Foundation |
| Open agent standards | None | Linux Foundation AAIF (Dec 2025) with OpenAI, Anthropic, Google, Microsoft, AWS |

### 4.2 LLM-as-Judge: From Paper to Production

The "LLM-as-judge" technique was named in Zheng et al. (2023) and has since become an industry-standard evaluation method. Key papers published at NAACL 2024, EMNLP 2024, ACL 2024, and ICLR 2024. A comprehensive survey (updated October 2025) covers strategies for improving consistency, mitigating biases, and adapting to diverse assessment scenarios.

**Reliability profile:**
- Agreement with human experts: **60-68%** in specialized domains (dietetics, mental health).
- Known biases: position bias (order effects), multilingual inconsistency, length bias.
- Best practice: Combined with rubric-based scoring and optional automated tests — exactly what Straw does (hybrid eval = container tests + LLM judge).

**Who uses it:** Every major AI lab, enterprise evaluation platforms, academic benchmarks, CI/CD pipelines for LLM-powered applications.

Sources:
- [Survey on LLM-as-a-Judge (arXiv)](https://arxiv.org/abs/2411.15594)
- [Reliability of LLM-as-a-Judge (arXiv)](https://arxiv.org/abs/2412.12509)
- [LLMs-as-Judges Comprehensive Survey](https://arxiv.org/html/2412.05579v2)
- [LLM-as-Judge Best Practices — Monte Carlo Data](https://www.montecarlodata.com/blog-llm-as-judge/)

### 4.3 Inference Cost Collapse

The cost of running LLM-based evaluations has dropped dramatically:
- **GPT-3.5 equivalent performance:** $20/M tokens (Nov 2022) → $0.07/M tokens (Oct 2024) = **285x decrease**.
- **GPT-4o vs GPT-4:** 83% reduction for output tokens, 90% drop for input tokens in 16 months.
- **Broad trend:** 10x annual decline in inference costs. Post-January 2024 median: **200x per year** price decline for equivalent performance.
- **What cost $60/M tokens in 2021 costs $0.06/M tokens today** — a 1,000x reduction in ~3 years.
- This means running an LLM judge over 100 submissions costs pennies, not hundreds of dollars. Evaluation-as-a-service becomes economically viable at any scale.

Sources:
- [Epoch AI: LLM Inference Price Trends](https://epoch.ai/data-insights/llm-inference-price-trends/)
- [AI Inference 280x Slide](https://www.aicerts.ai/news/ai-inferences-280x-slide-18-month-cost-optimization-explained/)
- [a16z: LLMflation](https://a16z.com/llmflation-llm-inference-cost/)

### 4.4 Sandbox Infrastructure Matured

E2B went from **40K sandbox sessions/month (March 2024) to 15M/month (March 2025)** — a 375x increase. Sandbox run time increased 10x, driven by long-running agent workflows.

Docker Sandboxes (released March 2026) run each agent in a lightweight **microVM with its own Linux kernel** — not just container isolation, but hardware-level separation. Daytona pivoted to AI agent infrastructure in early 2025, offering sub-90ms cold starts.

~50% of Fortune 500 companies now run agent workloads on E2B. This infrastructure is what makes Docker-based evaluation containers (Straw's `container` eval mode) production-grade.

Sources:
- [E2B Growth and Vision](https://siliconangle.com/2025/07/28/e2b-shares-vision-sandboxed-cloud-environments-every-ai-agent-raising-21m-funding/)
- [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/)
- [Docker + E2B Partnership](https://www.docker.com/blog/docker-e2b-building-the-future-of-trusted-ai/)

---

## 5. Regulatory Tailwinds

### 5.1 EU AI Act (In Force August 2024)

The EU AI Act is the world's first comprehensive AI regulation. Its phased implementation creates **mandatory demand** for auditable AI evaluation:

- **February 2025:** Prohibited AI systems must be withdrawn.
- **March 2025:** General-purpose AI providers must implement transparency notices.
- **August 2025:** High-risk AI systems must complete risk assessments and conformity evaluations.
- **December 2025:** Registration of high-risk AI systems in EU database mandatory before market entry.

**Key requirements that Straw addresses:**
- Technical documentation covering training, testing, and evaluation processes.
- Detailed content/data summaries for transparency.
- Periodic compliance audits.
- Human oversight mechanisms.

Enterprises deploying AI agents in the EU will need **auditable, documented evaluation trails** — exactly what Straw's immutable, append-only scoring produces.

Sources:
- [EU AI Act Compliance Timeline](https://trilateralresearch.com/responsible-ai/eu-ai-act-implementation-timeline-mapping-your-models-to-the-new-risk-tiers)
- [EU AI Act Overview — European Parliament](https://www.europarl.europa.eu/topics/en/article/20230601STO93804/eu-ai-act-first-regulation-on-artificial-intelligence)
- [EU AI Act Transparency Obligations](https://artificialintelligenceact.eu/article/50/)

### 5.2 NIST AI Risk Management Framework

NIST AI RMF is not legally required (yet), but it is the de facto standard for U.S. enterprise AI governance. Emerging federal, state, and local AI regulations are expected to draw heavily from NIST guidance, making early adoption a proactive compliance strategy.

NIST extends across enterprise risk and compliance structures: AI risks appear in risk registers, control libraries, and escalation pathways. Organizations align AI policies with security policies (ISO 27001) and privacy standards (SOC 2).

Source:
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST AI RMF & ISO 42001 Crosswalk](https://blog.rsisecurity.com/nist-ai-risk-management-framework-iso-42001-crosswalk/)

### 5.3 ISO/IEC 42001 Adoption Accelerating

ISO/IEC 42001 is the international standard for AI management systems. Certification requires comprehensive audits of how organizations manage AI systems: governance policies, data practices, and technical safeguards.

**Who's certified (2024-2025):**
- Microsoft (365 Copilot)
- IBM (Granite — first open-source model family to achieve certification)
- Autodesk
- Cornerstone

ISO certifications increased **20% worldwide in 2024** vs 2023, and ISO 42001 demand is expected to match or exceed 2024 growth in 2025. Microsoft's SSPA v10 AI updates are driving supply chain pressure for AI compliance.

**Relevance to Straw:** Companies pursuing ISO 42001 need documented evidence of how they evaluated and selected AI systems. Straw's immutable scoring, rubric transparency, and audit trails directly serve this compliance need.

Sources:
- [ISO 42001 Governance — Protecht](https://www.protechtgroup.com/en-us/blog/ai-governance-iso-42001-certification)
- [Deloitte ISO 42001 Standard](https://www.deloitte.com/us/en/services/consulting/articles/iso-42001-standard-ai-governance-risk-management.html)
- [IBM ISO 42001 Certification](https://www.ibm.com/new/announcements/ibm-granite-iso-42001)
- [ISACA: ISO 42001 and EU AI Act](https://www.isaca.org/resources/news-and-trends/industry-news/2025/isoiec-42001-and-eu-ai-act-a-practical-pairing-for-ai-governance)

---

## 6. Cultural Shift: More Builders, More Need for Evaluation

### 6.1 Vibe Coding and the Democratization of Agent Building

**Andrej Karpathy (February 2, 2025):**
> "There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists."

By early 2026, Karpathy retired the term in favor of **"agentic engineering"** — signaling that AI-assisted development has matured from experiment to professional discipline.

**Key statistics:**
- **92% of US developers** use AI coding tools daily (82% globally weekly).
- **41% of all code** is now AI-generated (256B lines written in 2024).
- **25% of YC W25 startups** have codebases that are 95% AI-generated.
- **$4.7B global market** for vibe coding platforms, projected to reach $12.3B by 2027.
- Productivity: 74% of developers report increased productivity. 26% improvement in overall work completion speed. Up to 81% time savings on routine tasks.
- **But: Up to 45% of AI-generated code contains security vulnerabilities.**

The implication: when anyone can build an AI agent, the bottleneck shifts from creation to evaluation. The supply of agents is exploding. The infrastructure to objectively evaluate them doesn't exist. Straw is that infrastructure.

Sources:
- [Karpathy Vibe Coding Tweet](https://x.com/karpathy/status/1886192184808149383)
- [Vibe Coding Statistics 2026](https://www.secondtalent.com/resources/vibe-coding-statistics/)
- [Vibe Coding Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding)
- [Karpathy: Vibe Coding to Agentic Engineering](https://thenewstack.io/vibe-coding-is-passe/)
- [2025 State of Visual Development — Bubble](https://bubble.io/blog/2025-state-of-visual-development-ai-app-building/)

### 6.2 YC's Own Signal

Y Combinator's actions tell the story:

- **Spring 2025 RFS:** "YC wants founders who treat AI agents not as features but as the core operating system of brand-new companies and industries." — Garry Tan
- **Summer 2025 batch:** 40+ companies building infrastructure for agentic workflows (observability, optimization, evaluation, memory).
- **Fall 2025 RFS:** Explicitly calls for "Infrastructure for Multi-Agent Systems" managing hundreds of thousands of subagents.
- **Fall 2025 batch:** 13 startups building agent infrastructure (memory, integration, development, observability, payments).
- **Y Combinator startups** are the "fastest growing, most profitable in fund history" — driven by AI.

Sources:
- [YC Request for Startups](https://www.ycombinator.com/rfs)
- [Garry Tan Spring 2025 RFS Tweet](https://x.com/garrytan/status/1920153493492674984)
- [CNBC: YC Startups Fastest Growing](https://www.cnbc.com/2025/03/15/y-combinator-startups-are-fastest-growing-in-fund-history-because-of-ai.html)
- [CB Insights: YC Spring 2025 Agentic AI](https://www.cbinsights.com/research/y-combinator-spring25-agentic-ai/)
- [CB Insights: YC Fall 2025](https://www.cbinsights.com/research/y-combinator-fall2025/)

### 6.3 Tech Leader Quotes on the Agent Economy

**Satya Nadella (Microsoft Build 2025):** "The agent era" has begun. SaaS models are vulnerable to disruption because agents will consume backends directly, bypassing UIs.

**Sam Altman (2025):** Agents will "join the workforce." AI will eat "the coordination layer of work, not just the content layer."

**Garry Tan (February 2025):** "Evals are emerging as the real moat for AI startups."

**Satya Nadella (November 2025, memo on Shared Economic Gains):** Warned the tech industry against "extraction" — where AI companies capture all the value. Argued that for the AI revolution to be sustainable, it must create more wealth for its users than for its creators.

Sources:
- [Satya Nadella 2025 Quotes](https://www.digit.in/features/general/satya-nadella-in-2025-5-huge-quotes-by-microsoft-ceo-on-ai-and-future.html)
- [What Tech Leaders Said About AI in 2025](https://pressinsider.com/news/what-techs-most-powerful-leaders-said-about-ai-in-2025/)

---

## 7. The "Why Now?" Synthesis

### What converged in the last 18 months:

1. **Supply explosion:** 89 agent frameworks (535% YoY growth), 4.3M AI repos on GitHub, every major tech company shipping agent SDKs. Anyone can build an agent.

2. **Demand explosion:** 79% enterprise adoption, $7.6B market growing at 49.6% CAGR, $202B invested in AI in 2025. Companies are spending but can't compare.

3. **Evaluation infrastructure matured:** LLM-as-judge went from academic paper to production standard. Inference costs dropped 1,000x. Sandboxed execution at scale (E2B: 15M sessions/month). Agent interoperability standards (MCP, AGENTS.md) adopted by 60K+ projects.

4. **Regulatory forcing function:** EU AI Act enforcement began. ISO 42001 certifications up 20%. NIST AI RMF becoming de facto standard. Enterprises need auditable evaluation trails.

5. **The evaluation gap is now visible:** 37% lab-to-production performance gap. 7 of 10 major benchmarks have validity issues. SWE-bench had 68% unsolvable tasks. Gartner says only ~130 of thousands of agentic AI vendors are real. No standard way to compare.

6. **Democratization created quality uncertainty:** 41% of code is AI-generated. 45% of AI-generated code has security vulnerabilities. 25% of YC startups have 95% AI-generated codebases. More builders = more agents = more need for objective comparison.

### The one-liner:

**Two years ago, there weren't enough agents to compare. One year ago, there wasn't infrastructure to compare them. Now there are thousands of agents, the evaluation infrastructure exists, regulations demand auditability, and there is still no marketplace where a company can post a real problem, have agents compete on it, and get an objective, auditable answer about which one is best. That's Straw.**

### Why not earlier:

- LLM-as-judge was unreliable and expensive before 2024.
- Agent SDKs didn't exist (OpenAI Agents SDK: March 2025, MCP: November 2024).
- Sandboxed execution wasn't production-grade (E2B went from 40K to 15M sessions/month in one year).
- Agent interoperability standards didn't exist (AAIF: December 2025).
- The EU AI Act wasn't in force (August 2024).
- There weren't enough agents to create a competitive marketplace.

### Why not later:

- Gartner: 40% of enterprise apps will have task-specific agents by 2026 (up from <5% in 2025).
- Gartner: 90% of B2B purchases handled by agents within 3 years ($15T).
- 40%+ of agentic AI projects will be canceled by 2027 due to unclear evaluation.
- First-mover in marketplace dynamics creates network effects that compound.
- The companies that establish evaluation standards now will own the category.

---

## Appendix: Key Numbers at a Glance

| Metric | Value | Source |
|---|---|---|
| AI agent market size (2025) | $7.6B | MarketsandMarkets |
| AI agent market CAGR | 49.6% | Grand View Research |
| Agent frameworks (1K+ stars) | 89 (up from 14) | GitHub analysis |
| AI repos on GitHub | 4.3M | GitHub Octoverse 2025 |
| Enterprise agent adoption | 79% | Industry surveys |
| Enterprise scaling agents | <10% | McKinsey 2025 |
| Inference cost reduction | 1,000x in 3 years | Epoch AI |
| E2B sandbox sessions | 15M/month (375x YoY) | E2B |
| Total AI investment (2025) | $202.3B | Crunchbase |
| AI agent startup funding (2024) | $3.8B (3x prior year) | Industry data |
| Lab-to-production gap | 37% | Academic research |
| Benchmark validity issues | 7 of 10 benchmarks | Enterprise survey |
| AI-generated code share | 41% of all code | Developer surveys |
| EU AI Act | In force August 2024 | European Parliament |
| ISO 42001 certifications | +20% YoY | ISO data |
| Gartner: Real agentic vendors | ~130 of thousands | Gartner 2025 |
| B2B purchases via agents (2028) | $15 trillion | Gartner |
