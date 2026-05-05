# Straw Market Research: Enterprise AI Evaluation & Procurement

**Purpose:** YC application research. Problem space validation with real data.
**Date:** April 14, 2026

---

## Executive Summary

Enterprise AI procurement is a $2.52 trillion market (Gartner, 2026) with an 80%+ project failure rate. Companies make six- and seven-figure decisions based on vendor demos, sequential POCs, and public benchmarks that academic research shows are fundamentally flawed. The result: $547 billion wasted globally in 2025 alone. There is no standard way to objectively compare AI vendors on your actual problem, with your actual data, at the same time. Straw fixes that.

---

## 1. How Enterprises Currently Buy AI

### The Typical Procurement Process

Enterprise AI procurement follows a waterfall pattern inherited from traditional software buying:

1. **Business unit identifies need** (weeks)
2. **Internal alignment and budget approval** (weeks to months)
3. **RFI phase** -- market scan, 2-4 weeks response window
4. **RFP phase** -- detailed evaluation, 4-8 weeks with 15-25 criteria matrices
5. **Vendor demos** -- staged presentations, typically 2-5 vendors
6. **POC/pilot** -- sequential trials, one vendor at a time, 3-6 months each
7. **Security/compliance review** (weeks to months)
8. **Procurement committee sign-off** (weeks)
9. **Contract negotiation** (weeks)

**Total cycle: 6-18 months from identified need to deployed solution.**

Sources: [Ivalua: Vendor Selection Process](https://www.ivalua.com/blog/vendor-selection-process/), [Arphie: RFI, RFP, RFQ Guide](https://www.arphie.ai/articles/understanding-rfi-rfp-and-rfq-a-comprehensive-guide-for-businesses)

### Who's Involved

The average B2B buying committee has **11 members** (Gartner, 2025). For enterprise AI specifically, this spans:

- **Business unit sponsors** -- define the problem, own the outcome
- **IT / technical evaluators** -- assess integration, architecture, security
- **Procurement** -- vendor risk, contract terms, compliance
- **Legal / compliance** -- privacy, regulatory, liability
- **Finance** -- ROI modeling, budget allocation
- **CISO / security** -- data handling, threat surface
- **C-suite sponsor** -- strategic alignment, executive cover

For enterprise-level AI deals, committees can exceed **20 stakeholders**. Each adds evaluation criteria, review cycles, and potential veto points.

Sources: [Gartner: B2B Buying Committees](https://www.gartner.com/en/articles/cio-challenges), [Traction Complete: Mapping B2B Buying Committees](https://tractioncomplete.com/articles/mapping-the-b2b-buying-committee/), [The Smartekers: Buying Committee Marketing](https://thesmarketers.com/blogs/buying-committee-marketing-abm/)

### What Goes Wrong

**Sequential evaluation is structurally broken.** Companies run POCs one vendor at a time, each taking months. By the time vendor #3 is evaluated, the conditions that made vendor #1's results valid may have changed. There is no consistent basis for comparison.

**The shift from experimentation to permanent spending is happening without better evaluation.** Enterprise AI budgets have graduated from pilot programs and innovation funds to permanent IT and business unit line items. Innovation budgets dropped from 25% to 7% of LLM spending year-over-year, meaning AI is no longer experimental -- but the buying process is still ad hoc.

**Speed of technology outpaces procurement.** As one CIO noted: *"The time it takes us to study a new technology now exceeds that technology's relevance window."*

Sources: [a16z: How 100 Enterprise CIOs Are Building and Buying Gen AI in 2025](https://a16z.com/ai-enterprise-2025/), [Gartner: Top CIO Challenges](https://www.gartner.com/en/articles/cio-challenges)

---

## 2. Pain Points With the Current Process

### The Evaluation Gap

There is no standard way for enterprises to objectively compare AI vendors. The current process relies on:

- **Vendor demos** -- staged, best-case scenarios with curated data
- **Public benchmarks** -- academically questionable, not domain-specific
- **Sequential POCs** -- expensive, slow, non-comparable
- **RFP scoring matrices** -- subjective, gameable, favor polish over substance

A study analyzing **445 LLM benchmarks** from leading conferences found that "almost all articles have weaknesses in at least one area," with:
- **47.8%** of benchmark definitions "contested" with multiple interpretations
- Only **16%** used uncertainty estimates or statistical tests
- **27%** used convenience sampling with reused exam questions
- Data contamination meant models memorized test questions rather than reasoning

As the researchers concluded: a 2% performance difference on a benchmark could be random chance, not genuine capability. Enterprise leaders committing **$100M+ budgets** are making decisions on this basis.

Sources: [AI News: Flawed AI Benchmarks Put Enterprise Budgets at Risk](https://www.artificialintelligence-news.com/news/flawed-ai-benchmarks-enterprise-budgets-at-risk/), [MIT Technology Review: AI Benchmarks Are Broken](https://www.technologyreview.com/2026/03/31/1134833/ai-benchmarks-are-broken-heres-what-we-need-instead/)

### Expert Quotes on What's Broken

**On vendor survey-driven purchasing (Grammarly CISO):**
> *"They send the survey to the employees and seven fill it out and the vendor says, 'Here's the survey data. Please purchase this tool for $200,000'... There is no way I am going to pay $200,000 to anybody because seven dudes were happy with the tool that was deployed."*

**On automating without redesigning (Gartner):**
> Gartner predicts that **40% of agentic AI projects will fail by 2027** -- not because the technology doesn't work, but because organizations are automating broken processes instead of redesigning operations.

**On ROI discipline (AI Governance Today):**
> *"The companies that are getting real ROI from AI are not the ones that moved fastest. They are the ones that moved with the most discipline."* -- Leonardo Ramirez

**On the fundamental mismatch (MIT NANDA):**
> *"It is not primarily the model technology that is failing, but the integration into workflows, organizational alignment, and underlying data readiness."*

Sources: [Gartner: Emerging AI Challenges](https://www.gartner.com/en/newsroom/press-releases/2024-10-21-gartner-identifies-four-emerging-challenges-to-delivering-value-from-ai-safely-and-at-scale), [AI Governance Today: $665B Spending Crisis](https://www.aigovernancetoday.com/news/enterprise-ai-spending-crisis-2026), [ServicePath: AI Integration Crisis](https://servicepath.co/2025/09/ai-integration-crisis-enterprise-hybrid-ai/)

### Cost of Getting It Wrong

- **Vendor lock-in is expensive.** Single-vendor AI strategies cost up to **80% more** in unnecessary expenses. Migration costs average **$315,000 per project**. Multi-vendor organizations negotiate **15-30% better pricing**.
- **In early 2025, Azure OpenAI customers experienced a pricing increase that doubled AI spend overnight.** In June 2025, OpenAI's global outage paralyzed business-critical processes across thousands of enterprises.
- **67% of organizations** are now actively working to avoid single-provider dependency.

Sources: [Airia: Hidden Risk of Single-Vendor AI](https://airia.com/ai-vendor-lock-in-hidden-risks-single-vendor-strategy/), [Swfte AI: Breaking Free from AI Vendor Lock-in](https://www.swfte.com/blog/avoid-ai-vendor-lock-in-enterprise-guide), [Kai Waehner: Enterprise Agentic AI Landscape 2026](https://www.kai-waehner.de/blog/2026/04/06/enterprise-agentic-ai-landscape-2026-trust-flexibility-and-vendor-lock-in/)

---

## 3. Failed AI Projects -- The Numbers

### Headline Statistics

| Metric | Value | Source |
|--------|-------|--------|
| AI projects failing to deliver business value | **80.3%** | RAND Corporation 2025 |
| GenAI pilots failing to deliver measurable ROI | **95%** | MIT Project NANDA |
| AI pilots failing to reach production | **87-88%** | Gartner / IDC |
| Companies abandoning AI initiatives (2025) | **42%** (up from 17% in 2024) | S&P Global |
| Average sunk cost per abandoned initiative | **$7.2 million** | Pertama Partners |
| Median time to abandonment | **11 months** | Pertama Partners |
| Global AI investment in 2025 | **$684 billion** | Pertama Partners |
| Amount that failed to deliver value | **$547 billion (80%)** | Pertama Partners |

Sources: [Pertama Partners: AI Project Failure Statistics 2026](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026), [CIO.com: 88% of AI Pilots Fail](https://www.cio.com/article/3850763/88-of-ai-pilots-fail-to-reach-production-but-thats-not-all-on-it.html), [CIO Dive: AI Project Failure Rates Rising](https://www.ciodive.com/news/AI-project-fail-data-SPGlobal/742590/)

### How Projects Fail

Of failed AI projects (RAND Corporation analysis):

- **33.8%** abandoned before ever reaching production
- **28.4%** reach completion but fail to deliver expected business value
- **18.1%** deliver value but cannot justify costs

The financial impact by failure mode:
- Abandoned projects: average **$4.2M** sunk cost
- Completed-but-failed: **$6.8M** cost, delivering **$1.9M** value (ROI: **-72%**)
- Cost-unjustified: **$8.4M** cost for **$3.1M** value (ROI: **-63%**)

Source: [Pertama Partners: AI Project Failure Statistics 2026](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026)

### Why They Fail (Tie to Procurement)

Analysis of **140 enterprise AI implementations** found:
- **77% of failures were organizational, not technical**
- **41%** were "AI without a home" -- delivered technically but never operationally adopted
- **34%** solved the wrong problem -- AI met technical specs but addressed the wrong business need
- **61%** of projects were approved **without post-deployment measurement** (MIT Sloan 2025)

**The procurement connection is direct.** When companies evaluate AI through demos and POCs rather than on their actual problems with their actual data, they systematically select solutions optimized for staged scenarios rather than production reality. The 80% failure rate is not a technology problem -- it is a procurement problem.

Sources: [AI Governance Today: $665B Spending Crisis](https://www.aigovernancetoday.com/news/enterprise-ai-spending-crisis-2026), [Talyx: Why 90% of Enterprise AI Implementations Fail](https://www.talyx.ai/insights/enterprise-ai-implementation-failure)

### Industry-Specific Failure Rates

| Industry | Failure Rate | Avg. Failed Project Cost |
|----------|-------------|-------------------------|
| Financial Services | **82.1%** | $11.3M |
| Healthcare | **78.9%** | $8.7M |
| Manufacturing | **76.4%** | $6.1M |
| Retail | **73.8%** | $5.4M |
| Professional Services | **68.7%** | $4.2M |

Source: [Pertama Partners: AI Project Failure Statistics 2026](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026)

---

## 4. The "Demo Problem"

### Why Vendor Demos Are Misleading

**The quality of a vendor demo has almost zero correlation with implementation success.** Vendor demos are optimized for winning the deal, using clean, curated data that perfectly fits the tool's capabilities.

Key structural problems:

1. **Curated data vs. production data.** Demos use synthetic or hand-picked datasets. Production data is messy, incomplete, edge-case-heavy, and domain-specific. A fashion inventory demo that works on "in stock / out of stock" fails when stock means "quantity by color, by size, by variant."

2. **Controlled environment vs. integration reality.** Demos run in isolation. Production requires integration with legacy systems, authentication layers, rate limits, stale data feeds, and real-world latency.

3. **Token cost at demo scale vs. production scale.** One case study showed a retail insights agent scaled from $50/month (one store) to $280/month (five stores), projecting $2,000+ for fifty stores. Architecture optimized for "does it work?" becomes unsustainable at scale.

4. **Manual intervention hidden in demos.** The most common warning sign in POCs is heavy manual intervention -- manually preparing prompts, curating datasets, or running processes outside the real workflow. If that happens during the pilot, the solution is not operational.

Sources: [Provarity: POC vs. Custom Enterprise Demo](https://provarity.ai/blog/why-a-proof-of-concept-poc-is-not-the-same-as-a-custom-enterprise-demo/), [Cash & Cache: Built for the Demo, Not for Production](https://cashandcache.substack.com/p/built-for-the-demo-not-for-production), [DEV: Why Your AI Agent Demo Falls Apart in Production](https://dev.to/wassimchegham/why-your-ai-agent-demo-falls-apart-in-production-1320)

### The POC-to-Production Gap

**For every 33 AI proofs of concept launched, only 4 reached production -- a 12% success rate.**

The single most common reason AI pilots don't reach production: **they were solving the wrong problem to begin with.** Someone identified a process that looked automatable, got impressive demo results, and then discovered the process was never well-defined enough to run without constant human intervention.

As NTT DATA consultant Alex Potapov put it: *"The model is rarely the main problem."* The real barriers are integration, organizational alignment, and data readiness -- none of which are visible in a demo.

**AI prototypes are fundamentally misleading about behavior.** The demo produces correct outputs on demo inputs, which creates the inference that the system produces correct outputs generally. That inference is wrong.

Sources: [Astrafy: Scaling AI from Pilot Purgatory](https://astrafy.io/the-hub/blog/technical/scaling-ai-from-pilot-purgatory-why-only-33-reach-production-and-how-to-beat-the-odds), [Dataconomy: Why Most Enterprise AI Projects Never Reach Production](https://dataconomy.com/2026/04/06/why-most-enterprise-ai-projects-never-reach-production-the-model-is-rarely-the-main-problem-says-ntt-data-consultant-alex-potapov/), [Andrew Baker: The Pilot Trap](https://andrewbaker.ninja/2026/02/26/the-pilot-trap-why-your-ai-project-will-never-see-production/)

### What's Actually Needed

**Head-to-head evaluation on real problems.** Vendors need to be benchmarked side-by-side, on the same dataset, with the same criteria, in the same evaluation window. The single best evaluation method is to run a proof of concept using your actual data, with your actual users, in your actual environment.

Any vendor that refuses to compete on your real problem should be treated with extreme caution.

Source: [Pertama Partners: How to Compare AI Vendors](https://www.pertamapartners.com/insights/how-to-compare-ai-vendors-structured-evaluation)

---

## 5. Enterprise AI Spending

### Total Market

| Year | Worldwide AI Spending | Source |
|------|----------------------|--------|
| 2023 | ~$300B (est.) | Industry estimates |
| 2024 | ~$1.04T | Gartner |
| 2025 | **$1.5 trillion** | Gartner |
| 2026 | **$2.52 trillion** (44% YoY growth) | Gartner |
| 2030 | $4-5T (projected) | Multiple analysts |

Sources: [Gartner: Worldwide AI Spending $1.5T in 2025](https://www.gartner.com/en/newsroom/press-releases/2025-09-17-gartner-says-worldwide-ai-spending-will-total-1-point-5-trillion-in-2025), [Gartner: Worldwide AI Spending $2.5T in 2026](https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026)

### Enterprise AI Software Specifically

| Year | Enterprise Gen AI Software | YoY Growth | Source |
|------|---------------------------|------------|--------|
| 2023 | $1.7 billion | -- | Menlo Ventures |
| 2024 | $11.5 billion | 6.8x | Menlo Ventures |
| 2025 | **$37 billion** | 3.2x | Menlo Ventures |

Enterprise AI now captures **6% of global SaaS market** -- the fastest-scaling software category in history.

Source: [Menlo Ventures: 2025 State of Generative AI in the Enterprise](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)

### Spending Breakdown

**By Layer (2025, Menlo Ventures):**
- Applications: **$19 billion** (51%)
  - Coding/developer tools: $4.0B
  - General copilots: $7.2B
  - Agents: $750M
  - Healthcare vertical: $1.5B
  - Legal vertical: $650M
- Infrastructure: **$18 billion** (49%)
  - Foundation model APIs: $12.5B
  - Model training: $4.0B

**By Company Size (Mordor Intelligence):**
- Large enterprises: **71.43%** of market share (2025)
- SMEs growing at **19.34% CAGR** through 2031

**By Industry (Mordor Intelligence):**
- Banking/Financial Services/Insurance: **23.67%** market share (2025)
- Healthcare: fastest growth at **20.77% CAGR** through 2031

**Enterprise AI Platform Market:**
- 2026: **$114.87-116.6 billion**
- 2031: **$273.08 billion** (18.91% CAGR)

Sources: [Menlo Ventures: 2025 State of Generative AI](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/), [Mordor Intelligence: Enterprise AI Market](https://www.mordorintelligence.com/industry-reports/enterprise-ai-market), [Gartner: GenAI Spending $644B in 2025](https://www.gartner.com/en/newsroom/press-releases/2025-03-31-gartner-forecasts-worldwide-genai-spending-to-reach-644-billion-in-2025)

### Buy vs. Build Trend

The enterprise is decisively shifting toward purchasing AI over building internally:
- **2024:** 47% built internally, 53% purchased
- **2025:** 24% built internally, **76% purchased**

This means the procurement decision -- which vendor to buy from -- is becoming the single most consequential AI decision enterprises make.

Source: [Menlo Ventures: 2025 State of Generative AI](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)

### Budget Maturation

- Average monthly AI spending surged from **$62,964** in 2024 to **$85,521** in 2025 (36% increase)
- CIOs now allocate roughly **9% of IT budgets** to AI vendor price increases alone
- LLM spending expected to grow **75%** over the next year
- Investment per use case: **$1.0M-$2.6M** on average

Sources: [a16z: How 100 Enterprise CIOs Are Building and Buying Gen AI in 2025](https://a16z.com/ai-enterprise-2025/), [Agenticaipricing: AI Pricing for Compliance](https://www.agenticaipricing.com/ai-pricing-for-compliance-heavy-procurement-reviews/)

---

## 6. AI Agent Adoption Specifically

### Market Size and Growth

| Year | AI Agents Market | Growth |
|------|-----------------|--------|
| 2025 | **$7.63 billion** | -- |
| 2026 | **$10.91 billion** | +43% YoY |
| 2030 | **$50.31 billion** | 46.3% CAGR |

Sources: [Ringly: 45 AI Agent Statistics 2026](https://www.ringly.io/blog/ai-agent-statistics-2026), [OneReach: Agentic AI Stats 2026](https://onereach.ai/blog/agentic-ai-adoption-rates-roi-market-trends/)

### Enterprise Adoption Velocity

- **100%** of surveyed enterprises ($100M+ revenue) plan to expand agentic AI use in 2026 (CrewAI survey, 500 C-level execs)
- **72%** of Global 2000 companies now deploy AI agents beyond pilot programs
- **40%** of enterprise applications will include task-specific AI agents by end of 2026, up from **<5%** in 2025 (Gartner)
- **23%** of organizations are scaling an agentic AI system; an additional **39%** are experimenting (McKinsey 2025)
- True agents in production: **16% enterprise, 27% startups** -- most deployments are still fixed-sequence workflows (Menlo Ventures)

Sources: [Gartner: 40% of Enterprise Apps Will Feature AI Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025), [OneReach: Agentic AI Stats 2026](https://onereach.ai/blog/agentic-ai-adoption-rates-roi-market-trends/), [Menlo Ventures: 2025 State of Generative AI](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)

### Gartner's $15 Trillion Prediction

Gartner predicts that by 2028, **90% of all B2B purchases will be handled by AI agents**, channeling more than **$15 trillion** in spending through automated exchanges. This represents a fundamental shift from human-mediated procurement to machine-to-machine negotiation.

Source: [Digital Commerce 360: Gartner AI Agents $15T in B2B Purchases by 2028](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/)

### What's Different About Agent Procurement

Agent procurement is fundamentally different from traditional AI/ML procurement:

1. **Agents are autonomous.** They don't just answer questions -- they take actions, make decisions, and chain together multi-step workflows. This makes evaluation dramatically harder. You can't test an agent with a single prompt-response pair.

2. **Multi-agent orchestration is the emerging pattern.** The future isn't buying one agent -- it's orchestrating multiple specialized agents that collaborate. This requires evaluation of agent interoperability, not just individual performance.

3. **Failure modes are different.** Traditional AI fails by giving wrong answers. Agents fail by taking wrong actions -- which can have cascading real-world consequences. Gartner predicts **40% of agentic AI projects will fail by 2027** because organizations automate broken processes.

4. **No established evaluation methodology.** For traditional ML, you have accuracy, precision, recall, F1. For agents, there's no standard way to evaluate whether an agent that works in a demo will work on your actual workflow with your actual data.

5. **Agent spend is growing faster than any AI category.** The agent market is growing at **46.3% CAGR** -- faster than the overall AI market. But the evaluation infrastructure hasn't kept up.

Sources: [Gartner: Strategic Predictions for 2026](https://www.gartner.com/en/articles/strategic-predictions-for-2026), [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), [Aisera: AI Benchmarking Framework](https://aisera.com/blog/enterprise-ai-benchmark/)

### The Evaluation Gap for Agents

Current AI benchmarks are fundamentally inadequate for agent evaluation:

- Benchmarks focus on **workflow completion rates** which provide an incomplete view of agent utility
- Existing benchmarks rely on **synthetic datasets and toy environments** that fail to reflect real-world enterprise complexity
- AI is "almost never used in the way it is benchmarked" -- evaluations assess performance in a vacuum, but agents operate in messy environments with multiple interacting systems
- Public AI benchmarks are **not a substitute for domain-specific evaluation** -- a high leaderboard score does not mean fitness for a specific business purpose

Source: [Invisible Tech: Guide to Enterprise AI Model Evaluation](https://invisibletech.ai/blog/guide-to-enterprise-ai-model-evaluation), [Aisera: AI Benchmarking Framework](https://aisera.com/blog/enterprise-ai-benchmark/)

---

## 7. Regulatory and Compliance Pressures

### EU AI Act (Enforcement: August 2, 2026)

The EU AI Act is the world's first comprehensive AI regulation. Key provisions driving demand for transparent AI evaluation:

**Timeline:**
- February 2025: Prohibited AI practices and AI literacy obligations
- August 2025: Governance rules and GPAI model obligations
- **August 2, 2026: Full applicability** (high-risk AI system rules)
- August 2027: Extended transition for regulated product-embedded AI

**Procurement-Relevant Requirements:**
- **Article 9 (Risk Management):** High-risk AI systems require a continuous risk management system throughout their lifecycle, including testing "against prior defined metrics and probabilistic thresholds" before deployment
- **Transparency obligations:** Users must be informed when interacting with AI; AI-generated content must be labeled
- **Testing before deployment is mandatory:** "Testing of high-risk AI systems shall be performed... prior to their being placed on the market or put into service"
- **Conformity assessments:** High-risk systems require documented evidence of compliance, not just declarations

**Impact on procurement:** Enterprises must now incorporate AI compliance assessments into procurement -- requiring vendors to provide Model Cards, data governance statements, bias testing reports, and risk assessment results. As enforcement approaches, "screenshots and declarations are no longer sufficient -- only operational evidence counts."

Sources: [EU AI Act Official](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [Orrick: 6 Steps Before August 2026](https://www.orrick.com/en/Insights/2025/11/The-EU-AI-Act-6-Steps-to-Take-Before-2-August-2026), [Sombra: AI Regulations 2026](https://sombrainc.com/blog/ai-regulations-2026-eu-ai-act)

### NIST AI Risk Management Framework

The NIST AI RMF is voluntary but increasingly functions as procurement criteria:

- **Four pillars -- Govern, Map, Measure, Manage** -- now serve as vendor evaluation criteria
- Organizations can evaluate vendors against **243 control objectives** via the AI-CAIQ questionnaire
- Pre-deployment testing is a core pillar, requiring systematic evaluation of AI system behavior before deployment
- **RMF 1.1** guidance expected through 2026 with expanded profiles and more granular evaluation methodologies
- In April 2026, NIST released a concept note for an AI RMF Profile on **Trustworthy AI in Critical Infrastructure**
- NIST has also launched an **AI Agent Standards Initiative** seeking industry input on agent-specific evaluation

Sources: [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework), [Pillsbury: NIST AI Agent Standards Initiative](https://www.pillsburylaw.com/en/news-and-insights/nist-ai-agent-standards.html), [Cycore: AI Security Frameworks 2026](https://www.cycoresecure.com/blogs/best-ai-security-frameworks-organizations-2026)

### US Federal AI Procurement

The OMB has issued requirements for federal agencies on AI procurement and risk management:

- Agencies must implement requirements for AI acquisition, especially for rights-impacting or safety-impacting AI
- Requirements include: impact assessments, testing in real-world environments, independent evaluation, regular risk mitigation, and fail-safe procedures
- Agencies are writing **performance and output-based deliverables** into requirements, including testing and evaluation data

Source: [OMB AI Use and Procurement Requirements](https://www.insideglobaltech.com/2025/04/09/omb-issues-first-trump-2-0-era-requirements-for-ai-use-and-procurement-by-federal-agencies/)

### ISO/IEC 42001

The international standard for AI management systems works alongside the EU AI Act and NIST RMF. Together, these three frameworks define how organizations design, deploy, and monitor AI systems in 2026.

**IDC projects 70% of firms will formalize AI risk oversight by 2025** -- driving demand for evaluation infrastructure that produces auditable, transparent results.

Sources: [Regulativ AI: AI Regulations Overview](https://www.regulativ.ai/ai-regulations), [EC Council: EU AI Act vs NIST vs ISO/IEC 42001](https://www.eccouncil.org/cybersecurity-exchange/responsible-ai-governance/eu-ai-act-nist-ai-rmf-and-iso-iec-42001-a-plain-english-comparison/)

### Regulatory Tailwind for Straw

Every major regulatory framework -- EU AI Act, NIST AI RMF, ISO 42001, OMB guidance -- converges on the same requirement: **systematic, documented, evidence-based evaluation of AI systems before deployment.** The era of "trust the vendor demo" is ending by regulation, not just by preference.

Straw's model -- objective evaluation on real tasks with auditable scoring -- is precisely the kind of evaluation infrastructure these regulations demand. Companies that use Straw get documentation, reproducibility, and an audit trail for every AI decision they make.

---

## 8. The Opportunity for Straw

### Why Now

1. **$2.52 trillion is being spent on AI in 2026.** 80% of AI projects fail. The procurement process is the root cause, not the technology.

2. **76% of enterprises now buy rather than build AI.** The vendor selection decision is the highest-leverage moment in the entire AI lifecycle -- and there is no objective way to make it.

3. **AI agents are the fastest-growing category** (46.3% CAGR) with the weakest evaluation infrastructure. Gartner says 40% of enterprise apps will include AI agents by end of 2026. No one knows how to evaluate them.

4. **Regulations are mandating what Straw provides.** The EU AI Act (fully enforceable August 2026), NIST RMF, and federal procurement rules all require documented, evidence-based AI evaluation before deployment.

5. **The demo-to-production gap is getting worse, not better.** 87% of pilots never reach production. 42% of companies scrapped AI initiatives in 2025, up from 17% in 2024. The current approach is demonstrably broken.

### The Market Gap

Kaggle proved the competition model works for ML -- but Kaggle evaluates fixed-format predictions (CSV outputs, accuracy metrics) for research problems. Enterprise AI tasks produce code, APIs, agents, and complex artifacts. The output format is unbounded. The evaluation must be defined by the buyer, not the platform.

No platform exists that lets companies:
- Define their own evaluation criteria
- Have multiple AI agents compete simultaneously on the same real problem
- Get objective, auditable, immutable scoring
- Compare vendors head-to-head with zero integration work

**Straw is that platform.**

### The Bottom Line

Enterprise AI procurement is a multi-trillion-dollar market with an 80% failure rate, driven by an evaluation process that relies on staged demos, sequential trials, and flawed benchmarks. Regulations are mandating better evaluation. The shift to buying over building makes vendor selection the critical decision. AI agents -- the fastest-growing category -- have no standard evaluation methodology at all.

The companies that figure out how to objectively evaluate AI before buying it will capture an outsized share of the $2.52 trillion being spent. Straw is the infrastructure that makes that possible.

---

## Key Sources

- [Gartner: Worldwide AI Spending $2.52T in 2026](https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026)
- [Gartner: 40% of Enterprise Apps Will Feature AI Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025)
- [Gartner: AI Agents $15T in B2B Purchases by 2028](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/)
- [a16z: How 100 Enterprise CIOs Are Building and Buying Gen AI in 2025](https://a16z.com/ai-enterprise-2025/)
- [Menlo Ventures: 2025 State of Generative AI in the Enterprise](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/)
- [McKinsey: The State of AI Global Survey 2025](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)
- [Pertama Partners: AI Project Failure Statistics 2026](https://www.pertamapartners.com/insights/ai-project-failure-statistics-2026)
- [AI Governance Today: $665B Enterprise AI Spending Crisis](https://www.aigovernancetoday.com/news/enterprise-ai-spending-crisis-2026)
- [MIT Technology Review: AI Benchmarks Are Broken](https://www.technologyreview.com/2026/03/31/1134833/ai-benchmarks-are-broken-heres-what-we-need-instead/)
- [AI News: Flawed AI Benchmarks Put Enterprise Budgets at Risk](https://www.artificialintelligence-news.com/news/flawed-ai-benchmarks-enterprise-budgets-at-risk/)
- [EU AI Act Official](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [CIO.com: 88% of AI Pilots Fail to Reach Production](https://www.cio.com/article/3850763/88-of-ai-pilots-fail-to-reach-production-but-thats-not-all-on-it.html)
- [S&P Global / CIO Dive: AI Project Failure Rates Rising](https://www.ciodive.com/news/AI-project-fail-data-SPGlobal/742590/)
- [Deloitte: State of AI in the Enterprise 2026](https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html)
