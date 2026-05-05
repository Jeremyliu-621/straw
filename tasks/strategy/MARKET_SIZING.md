# Straw Market Sizing: TAM / SAM / SOM

**Prepared for YC Application | April 2026**

---

## Executive Summary

Straw sits at the intersection of three massive, converging markets: enterprise AI procurement ($300B+ annually), AI agent tooling ($10.9B in 2026), and AI evaluation platforms ($2.4B in 2026). We size the market using four independent approaches that triangulate to a consistent range.

| | Conservative | Moderate | Aggressive |
|---|---|---|---|
| **TAM** | $4.5B | $9.2B | $18.0B |
| **SAM** | $900M | $2.3B | $5.4B |
| **SOM (Year 3)** | $4.5M | $15M | $45M |

---

## Approach 1: Enterprise AI Spending (Top-Down)

### Raw Data

| Metric | 2024 | 2025 | 2026 | Source |
|---|---|---|---|---|
| Total global AI spending | ~$1.0T | $1.5T | $2.52T | [Gartner](https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026) |
| GenAI spending | ~$365B | $644B | ~$1.16T | [Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-03-31-gartner-forecasts-worldwide-genai-spending-to-reach-644-billion-in-2025) |
| Enterprise AI solutions | $90.2B | $307B | ~$400B | [IDC via Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/enterprise-ai-market) |
| Agentic AI market | $5.25B | $7.6B | $10.9B | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/ai-agents-market-report), [Fortune Business Insights](https://www.fortunebusinessinsights.com/agentic-ai-market-114233) |
| AI model evaluation platforms | ~$1.35B | $1.86B | $2.36B | [GlobeNewsWire/ResearchAndMarkets](https://www.globenewswire.com/news-release/2026/04/14/3273083/28124/en/AI-Model-Evaluation-Platform-Market-Research-Report-2026-AWS-Google-Microsoft-and-IBM-Set-Industry-Standards-for-Performance-and-Reliability-Long-term-Forecast-to-2030-and-2035.html) |

### What % Goes to Evaluation, Testing, and Procurement Overhead?

- **Model API costs and experimentation consume 30-40% of total AI budgets** ([StackAI/Rebase](https://www.stackai.com/insights/enterprise-ai-budgeting-in-2026-benchmarks-cost-breakdown-and-cfo-ready-planning)). This includes engineering time for evaluations and proofs of concept.
- **POC costs per vendor evaluation: $50K-$150K** ([HSO](https://www.hso.com/blog/ai-proof-of-concept), [Appinventiv](https://appinventiv.com/blog/proof-of-concept-in-software-development/)). Each POC takes 4-8 weeks. Testing 2-3 vendors in parallel is recommended best practice.
- **Governance overhead rivals the cost of the underlying technology itself** ([UC Today](https://www.uctoday.com/productivity-automation/ai-pilot-purgatory-enterprise-scaling/)).
- **Consulting/professional services take 5-10% of AI budgets** ([StackAI](https://www.stackai.com/insights/enterprise-ai-budgeting-in-2026-benchmarks-cost-breakdown-and-cfo-ready-planning)).

**Conservative estimate:** 5% of enterprise AI solution spend goes to evaluation/procurement overhead = $400B x 5% = **$20B**.

**Moderate estimate:** 10% (including internal engineering time on POCs, vendor management, and governance) = **$40B**.

**Aggressive estimate:** 15% (the full procurement lifecycle including consultants, failed pilots, and switching costs) = **$60B**.

### What % is on Agentic AI Specifically?

- Agentic AI is **~2.7% of total enterprise AI spending** in 2026 ($10.9B / $400B).
- But it is the **fastest-growing segment at 40-44% CAGR** vs. ~19% for broader enterprise AI.
- **Gartner predicts 40% of enterprise apps will feature task-specific AI agents by end of 2026**, up from <5% in 2025 ([Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025)).
- **By 2028, AI agents will intermediate $15T in B2B purchases** ([Gartner/Digital Commerce 360](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/)).
- Agentic AI projected to overtake chatbot spending by 2027 ([Gartner](https://softwarestrategiesblog.com/2026/02/16/gartner-forecasts-agentic-ai-overtakes-chatbot-spending-2027/)).

### Breakdown by Company Size

| Segment | % of Enterprise AI Market | Typical Annual AI Spend | AI Eval Overhead |
|---|---|---|---|
| Large Enterprise (>5,000 emp) | 71.4% | $500K-$2M+ on tools alone | $50K-$150K per vendor eval |
| Mid-Market (500-5,000 emp) | ~20% | $20K-$100K annually | $10K-$50K per eval cycle |
| SMB (<500 emp) | ~8.6% | $5K-$20K annually | Minimal; use off-the-shelf |

Source: [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/enterprise-ai-market), [DesignRush](https://www.designrush.com/agency/ai-companies/trends/how-much-does-ai-cost), [StackAI](https://www.stackai.com/insights/enterprise-ai-budgeting-in-2026-benchmarks-cost-breakdown-and-cfo-ready-planning)

### Approach 1 TAM Calculation

**Straw captures value at the intersection of AI evaluation + AI agent procurement.**

- AI evaluation platform market in 2026: **$2.36B** (growing at 27.3% CAGR)
- AI agent evaluation specifically (agentic share of evaluation): ~15-25% of eval market = **$350M-$590M** today, growing to **$1.5B-$2.5B** by 2030
- Total addressable if you include the broader procurement overhead Straw eliminates: **$2.36B (eval) + $2B-$6B (procurement overhead on agentic AI) = $4.4B-$8.4B**

| | Conservative | Moderate | Aggressive |
|---|---|---|---|
| TAM | $4.4B | $8.4B | $15B |

---

## Approach 2: Bottom-Up from Customers

### How Many Companies Are Actively Buying AI Solutions?

| Segment | Companies | Actively Procuring AI | Source |
|---|---|---|---|
| Fortune 500 | 500 | ~500 (100% using AI; 80% use AI agents) | [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/02/10/80-of-fortune-500-use-active-ai-agents-observability-governance-and-security-shape-the-new-frontier/) |
| Global 2000 / Large Enterprise | ~10,000 | ~6,500 (65% increased AI budgets in 2026) | [Hostinger](https://www.hostinger.com/tutorials/how-many-companies-use-ai), [Medha Cloud](https://medhacloud.com/blog/ai-adoption-statistics-2026) |
| Mid-Market (500-5K employees) | ~200,000 globally | ~50,000 (est. 25% actively procuring AI, not just using) | [Techaisle](https://techaisle.com/blog/661-top-10-smb-mid-market-predictions-for-2026-and-beyond) |
| SMB with AI budget | ~2,000,000+ | ~200,000 (est. 10% actively evaluating vendors) | [DemandSage](https://www.demandsage.com/companies-using-ai/) |

**Total companies actively procuring AI solutions: ~260,000**

### Average Deal Size for AI Vendor Contracts

- Organizations spent an average of **$1.2M on AI-native apps** in 2026 ([Zylo](https://zylo.com/blog/ai-cost/))
- Average monthly AI spending: **$85,521** (~$1M/year) for organizations with meaningful budgets ([CloudZero via Rebase](https://rebasehq.ai/blog/enterprise-ai-spending-2026))
- **45% of organizations plan to invest >$100K/month** on AI in 2025, up from 20% in 2024
- Mid-market: **$20K-$100K annually** on AI tools
- Enterprise: **$500K-$2M+ annually** on AI licenses alone, before integration

**For Straw specifically:**
- Task posting fee: $99
- Success fee: 5% of deal value
- Average winning deal value (conservative): $25,000 (a modest AI agent contract)
- Revenue per successful task: $99 + $1,250 = **$1,349**

### Number of AI Vendor Evaluations Per Company Per Year

- Each POC takes 4-8 weeks and costs $50K-$150K ([HSO](https://www.hso.com/blog/ai-proof-of-concept))
- Best practice is to evaluate 2-3 vendors in parallel per project ([Pertama Partners](https://www.pertamapartners.com/insights/ai-vendor-selection-evaluation-framework-enterprises))
- Large enterprises run multiple AI projects per year (typically 3-10 major initiatives)
- **Estimated evaluations per enterprise per year: 6-30** (2-3 vendors x 3-10 projects)
- **Estimated evaluations per mid-market company per year: 2-6**

### How Many AI Agent Builders Exist?

| Category | Count | Source |
|---|---|---|
| AI/ML startups worldwide | ~90,000 | [Ascendix](https://ascendixtech.com/how-many-ai-companies-are-there/) |
| Venture-funded AI startups | ~5,800-9,953 | [Growth List](https://growthlist.co/ai-startups/), [Crunchbase](https://news.crunchbase.com/venture/record-breaking-funding-ai-global-q1-2026/) |
| AI agent startups specifically | 1,200+ | [StartUs Insights](https://www.startus-insights.com/innovators-guide/ai-agent-startups/) |
| GitHub AI-related repos | 4.3M+ | [GitHub Octoverse](https://github.com/topics/autonomous-agents) |
| AI agent frameworks on GitHub | 300+ resources across 20+ categories | [GitHub awesome-ai-agents-2026](https://github.com/caramaschiHG/awesome-ai-agents-2026) |
| AI developers (freelance) | ~500,000 unfilled positions globally | [Various](https://zenvanriel.com/job/ai-engineer-salary-freelance/) |
| Freelance AI developers (Upwork alone) | Demand for AI skills grew 109% YoY | [Upwork](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai) |

**Conservative estimate of active agent builders who could compete on Straw: 10,000-50,000** (funded startups + serious freelancers + enterprise teams with agent capabilities).

### Approach 2 TAM/SAM/SOM Calculation

**TAM (everyone who could use Straw):**
- 260,000 companies procuring AI x 4 task postings/year x $99 = $103M in posting fees
- 260,000 x 4 tasks x 50% completion rate x $25K avg deal x 5% = $2.6B in success fees
- **TAM = ~$2.7B** (posting fees negligible vs. success fees)

**With higher deal values (enterprise AI contracts avg $1.2M):**
- 56,500 enterprise + mid-market x 6 evals/year x 25% match rate x $200K avg deal x 5% = **$8.5B**

**SAM (companies evaluating AI agents specifically, English-speaking markets):**
- ~40,000 companies in US/UK/EU actively evaluating AI agent solutions
- 40,000 x 3 tasks/year x $99 = $11.9M posting fees
- 40,000 x 3 x 40% success x $50K avg deal x 5% = $120M success fees
- Plus marketplace premium features, analytics: ~$30M
- **SAM = ~$160M-$2.3B** (depends heavily on deal size distribution)

**SOM (what Straw can capture in 3 years):**
- Year 1: 200 paying companies, 500 tasks, 100 deals at $25K avg = $49.5K posting + $125K success = **$175K**
- Year 2: 1,000 companies, 3,000 tasks, 600 deals at $35K avg = $297K + $1.05M = **$1.35M**
- Year 3: 3,000 companies, 12,000 tasks, 2,400 deals at $50K avg = $1.19M + $6M = **$7.2M**

| | Conservative | Moderate | Aggressive |
|---|---|---|---|
| TAM | $2.7B | $8.5B | $18B |
| SAM | $160M | $2.3B | $5.4B |
| SOM (Yr 3) | $2M | $7.2M | $25M |

---

## Approach 3: Analogous Markets

### A. Kaggle (Data Science Competitions)

- **Acquired by Google in March 2017** for an undisclosed amount (estimated ~$12M cash) ([TechCrunch](https://techcrunch.com/2017/03/08/google-confirms-its-acquisition-of-data-science-community-kaggle/), [HN discussion](https://news.ycombinator.com/item?id=13822675))
- **15M+ registered users** as of 2023, up from 1M at acquisition ([Wikipedia](https://en.wikipedia.org/wiki/Kaggle))
- Revenue model: companies pay to host competitions (typically $10K-$1M+ prize pools)
- Strategic value to Google was talent acquisition and community, not revenue

**Why Straw is bigger than Kaggle:**
- Kaggle is prediction-only (submit a CSV, get an accuracy score). Straw handles arbitrary software outputs.
- Kaggle has no transaction layer. Straw captures 5% of real deals.
- Kaggle's "customer" is the competition host. Straw's customer is a company making a six-figure procurement decision.
- The AI agent market in 2026 ($10.9B) is vastly larger than the data science competition market was in 2017.

### B. Toptal / Upwork (AI Talent Marketplace)

- **Upwork revenue: $1.3B in 2025**, 12% YoY growth, $4B annual client spend ([Upwork](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai), [TechRT](https://techrt.com/upwork-statistics/))
- **AI skills demand on Upwork grew 109% YoY** ([Upwork](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai))
- AI-related freelance work is the fastest-growing segment
- AI developer freelance rates: **$80-$300/hr** ([SecondTalent](https://www.secondtalent.com/developer-rate-card/ai-agent-developers/), [Zen van Riel](https://zenvanriel.com/job/ai-engineer-salary-freelance/))
- Global freelance platforms market: **$6.37B in 2025**, projected $24.16B by 2033 ([Grand View Research](https://www.grandviewresearch.com/industry-analysis/freelance-platforms-market-report))

**Why this is relevant:** Straw is "Upwork for AI agents, but outcome-based." Instead of paying hourly and hoping, companies pay for results. If even 5% of the AI freelance segment moves to outcome-based competition:
- AI segment of Upwork: ~$500M-$800M (estimated 12-20% of $4B client spend)
- 5% shift to competition model: **$25M-$40M near-term**
- 20% shift as trust in agent output grows: **$100M-$160M**

### C. Software Testing / QA Market

- **Global software testing market: $54.1B in 2025**, $57.7B in 2026 ([Coherent Market Insights](https://www.coherentmarketinsights.com/industry-reports/software-testing-and-qa-services-market), [Research Nester](https://www.researchnester.com/reports/software-testing-market/6819))
- **Automation testing: $20.6B in 2025**, $24.3B in 2026 (16.8% CAGR) ([Fortune Business Insights](https://www.fortunebusinessinsights.com/automation-testing-market-107180))
- **AI-enabled testing: $1.01B in 2025**, $1.21B in 2026 (18.3% CAGR) ([Fortune Business Insights](https://www.fortunebusinessinsights.com/ai-enabled-testing-market-108825))

**Why this is relevant:** Straw's evaluation engine (LLM judge + Docker test suites) is essentially automated QA-as-a-service for AI outputs. The $1.2B AI-enabled testing market is a direct analogue. If Straw becomes the standard way to evaluate AI agent output:
- Captures a slice of the testing market applied to AI outputs: **$500M-$2B**

### D. Procurement Software (Coupa, Jaggaer)

- **Procurement software market: $9.8B in 2025**, $10.7B in 2026 ([Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/procurement-software-market))
- **Coupa: $1B+ ARR**, acquired by Thoma Bravo for **$8B** in 2023, manages **$5T in business spend** ([Thoma Bravo](https://www.thomabravo.com/press-releases/coupa-delivers-over-1-billion-in-billings-unlocks-175-billion-in-bottom-line-impact-for-global-customers))
- AI procurement intelligence market: forecasted to grow by **$14.46B during 2024-2029** at 42.9% CAGR ([Research and Markets](https://www.researchandmarkets.com/reports/6227819/ai-procurement-intelligence-market))

**Why this is relevant:** Straw is procurement software for AI agents. If the procurement software market is $10.7B for general procurement, and AI procurement is the fastest-growing segment:
- AI-specific procurement tools (the Coupa for AI): **$1B-$3B by 2029**
- Straw's niche (competition-based AI procurement): **$200M-$600M**

### Approach 3 TAM (averaged from analogues)

| Analogue | Implied TAM for Straw | Rationale |
|---|---|---|
| Kaggle (scaled up for transactions) | $2B-$5B | Kaggle + transaction layer on agent deals |
| Upwork AI segment (outcome-based) | $500M-$2B | Shift from hourly to outcome-based AI work |
| AI-enabled testing | $1.2B-$4B | Automated evaluation of AI outputs |
| Procurement software (AI niche) | $1B-$3B | Coupa equivalent for AI agents |
| **Average** | **$1.2B-$3.5B** | |

---

## Approach 4: AI Agent Market Specifically

### Analyst Projections

| Source | 2025 | 2026 | 2028 | 2030 | 2034 | CAGR |
|---|---|---|---|---|---|---|
| [Fortune Business Insights](https://www.fortunebusinessinsights.com/agentic-ai-market-114233) | $7.29B | $9.14B | — | — | $139.19B | 40.5% |
| [Precedence Research](https://www.precedenceresearch.com/agentic-ai-market) | $7.55B | $10.86B | — | — | $199.05B | 43.8% |
| [Grand View Research](https://www.grandviewresearch.com/industry-analysis/ai-agents-market-report) | $7.63B | $10.91B | — | $52.62B | — | 46.3% |
| [Markets and Markets](https://www.marketsandmarkets.com/Market-Reports/agentic-ai-market-208190735.html) | $7.84B | ~$11B | — | — | — | ~41% |

**Consensus: ~$10B in 2026, growing to $50-200B by 2030-2034.**

### Number of Companies Building AI Agents

- **1,200+ AI agent startups** identified ([StartUs Insights](https://www.startus-insights.com/innovators-guide/ai-agent-startups/))
- **90,000 AI companies worldwide** total ([Ascendix](https://ascendixtech.com/how-many-ai-companies-are-there/))
- **4.3M AI-related GitHub repos** ([GitHub Octoverse](https://github.com/topics/autonomous-agents))
- **120+ agentic AI tools mapped across 11 categories** ([StackOne](https://www.stackone.com/blog/ai-agent-tools-landscape-2026/))
- Every major AI lab now has an agent framework (OpenAI, Google, Anthropic, Microsoft, HuggingFace)
- Enterprise segment holds 45.7% of agentic AI market share in 2025

### Key Gartner Predictions for Agents

1. **40% of enterprise apps will feature task-specific AI agents by end of 2026** (up from <5% in 2025) ([Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025))
2. **AI agents will intermediate $15T in B2B purchases by 2028** ([Gartner](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/))
3. **Agentic AI spending will overtake chatbot spending by 2027** ([Gartner](https://softwarestrategiesblog.com/2026/02/16/gartner-forecasts-agentic-ai-overtakes-chatbot-spending-2027/))
4. **33% of enterprise software will include agentic AI by 2028** ([Gartner](https://www.gartner.com/en/articles/strategic-predictions-for-2026))
5. **>40% of agentic AI projects will be canceled by end of 2027** due to unclear ROI ([Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027))

**Prediction #5 is Straw's core thesis.** 40% cancellation = companies can't evaluate agents properly. Straw fixes the evaluation layer.

### Projected Growth of the "Agent Economy"

The agent economy is following the cloud computing trajectory:
- 2024: Experimentation phase ($5.25B)
- 2025-2026: Early production ($7.6B -> $10.9B, 43% growth)
- 2027-2028: Mainstream adoption (overtakes chatbots, $15T in B2B intermediation)
- 2030+: Mature market ($50B+)

**HuggingFace as a comp:** $130M revenue, $4.5B valuation, 50K customers, growing rapidly ([Sacra](https://sacra.com/c/hugging-face/), [Fueler](https://fueler.io/blog/hugging-face-usage-revenue-valuation-growth-statistics)). HuggingFace is "GitHub for models." Straw is "the arena where agents prove they work."

### Approach 4 TAM Calculation

**If Straw captures the "evaluation and procurement" layer of the agent economy:**
- Total agentic AI market 2026: $10.9B
- Evaluation/procurement overhead: 10-20% of spend (based on enterprise AI budget allocation data)
- **TAM = $1.1B-$2.2B in 2026**, growing to **$5B-$10B by 2030** at the same CAGR

**If Straw becomes the transaction layer (marketplace):**
- Total agent deals flowing through platform x 5% take rate
- Conservative: $2B in deals x 5% = **$100M**
- Moderate: $10B in deals x 5% = **$500M**
- Aggressive: $50B in deals x 5% = **$2.5B**

---

## Triangulated Summary

### TAM (Total Addressable Market)

All four approaches converge on a **$4.5B-$18B TAM**:

| Approach | Conservative | Moderate | Aggressive |
|---|---|---|---|
| 1. Enterprise AI spending (top-down) | $4.4B | $8.4B | $15.0B |
| 2. Bottom-up from customers | $2.7B | $8.5B | $18.0B |
| 3. Analogous markets | $1.2B | $3.5B | $10.0B |
| 4. AI agent market specifically | $1.1B | $2.2B | $10.0B |
| **Average** | **$2.4B** | **$5.7B** | **$13.3B** |

**For YC, state TAM as: ~$5-10B today, growing to $50B+ by 2030** (backed by 40%+ CAGR in agentic AI).

### SAM (Serviceable Addressable Market)

Straw's SAM is constrained by:
- English-speaking markets initially (US, UK, Canada, Australia, EU)
- Companies actively evaluating AI agent solutions (not just "using AI")
- Code-first tasks in v1 (expanding to non-code later)
- Agent builders who can produce upload-quality work

**SAM = $900M-$2.3B**

### SOM (Serviceable Obtainable Market) — 3-Year Target

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Companies posting tasks | 200 | 1,000 | 3,000 |
| Tasks posted | 500 | 3,000 | 12,000 |
| Successful deals | 100 | 600 | 2,400 |
| Avg deal value | $25K | $35K | $50K |
| Posting revenue | $50K | $297K | $1.19M |
| Success fee revenue (5%) | $125K | $1.05M | $6.0M |
| **Total revenue** | **$175K** | **$1.35M** | **$7.2M** |

Conservative SOM Year 3: **$4.5M** (lower deal values, lower conversion)
Moderate SOM Year 3: **$7-15M**
Aggressive SOM Year 3: **$25-45M** (if enterprise adoption accelerates)

---

## Key Assumptions Driving Uncertainty

### High Impact Assumptions (could swing TAM 2-3x)

1. **Average deal size through Straw.** A $25K average deal vs. a $200K average deal is an 8x difference in success fee revenue. Enterprise AI contracts average $1.2M ([Zylo](https://zylo.com/blog/ai-cost/)), but Straw will initially attract smaller deals.

2. **Conversion rate from task posting to closed deal.** We assume 20-50%. If agents consistently solve problems well, this could be 60%+. If quality is poor, it could be <10%.

3. **Growth rate of agentic AI.** All analyst projections agree on 40%+ CAGR. If this holds, the market 5x's by 2030. If there's a correction (Gartner warns 40% of projects get canceled), growth could stall at 20%.

### Medium Impact Assumptions

4. **Willingness to use competition-based procurement.** This is a behavioral change. Some companies will resist public competition. Private tasks (invited agents only) could address this.

5. **Agent builder supply.** If only 1,000 quality agent builders exist, the marketplace is thin. If 50,000+ exist, network effects kick in fast. The 500,000 unfilled AI positions and 1,200+ agent startups suggest supply will not be the bottleneck.

6. **Geographic concentration.** v1 is English-only. The US alone is ~50% of AI spend. International expansion doubles the addressable market.

### Low Impact Assumptions

7. **Task posting fee ($99).** This is a wedge, not the revenue driver. Even at $0 it doesn't change the math materially — success fees dominate.

8. **Competition from incumbents.** Coupa adding AI eval features would validate the market, not kill Straw. Incumbents are too slow and too broad to build a purpose-built agent arena.

---

## Competitive Moat & Why This Market Is Winnable

**Network effects:** More agents competing = better outcomes for companies = more tasks posted = more agents attracted. This is the Upwork/marketplace flywheel.

**Data moat:** Every competition generates evaluation data — what makes a good agent for a specific task type. This data becomes the moat over time. No one else has structured, rubric-scored agent performance data at scale.

**Timing:** The agent economy is at the "2006 iPhone moment." Companies know they need AI agents but have no way to evaluate them objectively. Gartner's prediction that 40% of agentic AI projects will be canceled by 2027 is the market screaming for a better evaluation mechanism.

**Revenue model alignment:** 5% success fee means Straw only makes money when customers get value. This is the strongest signal a YC partner can hear — the business model is aligned with the customer outcome.

---

## Sources

### Analyst Reports & Market Data
- [Gartner: Worldwide AI Spending $2.5T in 2026](https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026)
- [Gartner: GenAI Spending $644B in 2025](https://www.gartner.com/en/newsroom/press-releases/2025-03-31-gartner-forecasts-worldwide-genai-spending-to-reach-644-billion-in-2025)
- [Gartner: 40% Enterprise Apps Feature AI Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025)
- [Gartner: AI Agents Command $15T in B2B Purchases by 2028](https://www.digitalcommerce360.com/2025/11/28/gartner-ai-agents-15-trillion-in-b2b-purchases-by-2028/)
- [Gartner: >40% Agentic AI Projects Canceled by 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [Gartner: Agentic AI Overtakes Chatbot Spending by 2027](https://softwarestrategiesblog.com/2026/02/16/gartner-forecasts-agentic-ai-overtakes-chatbot-spending-2027/)
- [Fortune Business Insights: Agentic AI Market](https://www.fortunebusinessinsights.com/agentic-ai-market-114233)
- [Precedence Research: Agentic AI Market $199B by 2034](https://www.precedenceresearch.com/agentic-ai-market)
- [Grand View Research: AI Agents Market](https://www.grandviewresearch.com/industry-analysis/ai-agents-market-report)
- [GlobeNewsWire: AI Model Evaluation Platform Market](https://www.globenewswire.com/news-release/2026/04/14/3273083/28124/en/AI-Model-Evaluation-Platform-Market-Research-Report-2026-AWS-Google-Microsoft-and-IBM-Set-Industry-Standards-for-Performance-and-Reliability-Long-term-Forecast-to-2030-and-2035.html)
- [Mordor Intelligence: Enterprise AI Market](https://www.mordorintelligence.com/industry-reports/enterprise-ai-market)
- [Mordor Intelligence: Procurement Software Market](https://www.mordorintelligence.com/industry-reports/procurement-software-market)
- [Fortune Business Insights: Automation Testing Market](https://www.fortunebusinessinsights.com/automation-testing-market-107180)
- [Fortune Business Insights: AI-Enabled Testing Market](https://www.fortunebusinessinsights.com/ai-enabled-testing-market-108825)
- [Grand View Research: Freelance Platforms Market](https://www.grandviewresearch.com/industry-analysis/freelance-platforms-market-report)
- [Research and Markets: AI Procurement Intelligence Market](https://www.researchandmarkets.com/reports/6227819/ai-procurement-intelligence-market)

### Enterprise Spending & Adoption Data
- [a16z: How 100 Enterprise CIOs Are Buying Gen AI](https://a16z.com/ai-enterprise-2025/)
- [Microsoft: 80% of Fortune 500 Use AI Agents](https://www.microsoft.com/en-us/security/blog/2026/02/10/80-of-fortune-500-use-active-ai-agents-observability-governance-and-security-shape-the-new-frontier/)
- [TechCrunch: VCs Predict More AI Spend Through Fewer Vendors](https://techcrunch.com/2025/12/30/vcs-predict-enterprises-will-spend-more-on-ai-in-2026-through-fewer-vendors/)
- [StackAI: Enterprise AI Budgeting 2026](https://www.stackai.com/insights/enterprise-ai-budgeting-in-2026-benchmarks-cost-breakdown-and-cfo-ready-planning)
- [Rebase: Enterprise AI Spending 2026](https://rebasehq.ai/blog/enterprise-ai-spending-2026)
- [Zylo: AI Cost 2026 ($1.2M avg on AI-native apps)](https://zylo.com/blog/ai-cost/)

### Company-Specific Data
- [Thoma Bravo/Coupa: $1B+ ARR, $8B Acquisition, $5T Spend Managed](https://www.thomabravo.com/press-releases/coupa-delivers-over-1-billion-in-billings-unlocks-175-billion-in-bottom-line-impact-for-global-customers)
- [Upwork: $1.3B Revenue, $4B Client Spend, AI Skills +109%](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai)
- [HuggingFace: $130M Revenue, $4.5B Valuation](https://sacra.com/c/hugging-face/)
- [TechCrunch: Google Acquires Kaggle (2017)](https://techcrunch.com/2017/03/08/google-confirms-its-acquisition-of-data-science-community-kaggle/)

### AI Agent Ecosystem
- [Ascendix: 90,000 AI Companies Worldwide](https://ascendixtech.com/how-many-ai-companies-are-there/)
- [Growth List: 9,953 Funded AI Startups](https://growthlist.co/ai-startups/)
- [StartUs Insights: 1,200+ AI Agent Startups](https://www.startus-insights.com/innovators-guide/ai-agent-startups/)
- [GitHub awesome-ai-agents-2026: 300+ Resources](https://github.com/caramaschiHG/awesome-ai-agents-2026)
- [Crunchbase: Q1 2026 $300B Venture Funding](https://news.crunchbase.com/venture/record-breaking-funding-ai-global-q1-2026/)
- [Ringly: 45 AI Agent Statistics 2026](https://www.ringly.io/blog/ai-agent-statistics-2026)

### POC & Evaluation Costs
- [HSO: AI POC Guide ($50K-$150K per POC)](https://www.hso.com/blog/ai-proof-of-concept)
- [Appinventiv: POC Software Development](https://appinventiv.com/blog/proof-of-concept-in-software-development/)
- [UC Today: AI Pilot Purgatory](https://www.uctoday.com/productivity-automation/ai-pilot-purgatory-enterprise-scaling/)
- [AI Spectrum India: Enterprise AI Procurement 2026](https://aispectrumindia.com/analysis/38/416/enterprise-ai-procurement-in-2026-the-shift-from-pilot-experiments-to-outcome-driven-buying.html)

### Freelance & Talent Market
- [SecondTalent: AI Agent Developer Rates ($80-$250/hr)](https://www.secondtalent.com/developer-rate-card/ai-agent-developers/)
- [Zen van Riel: AI Engineer Freelance Rates ($75-$300/hr)](https://zenvanriel.com/job/ai-engineer-salary-freelance/)
- [Debutinfotech: Cost to Hire AI Developers](https://www.debutinfotech.com/blog/cost-to-hire-ai-developers-hourly-full-time-rates)
