# Agent Incentive Comparable Systems — What Exists in the Market

*Companion file to `agent-incentive-research-2026-04-25.md`. Covers ticks 0.7, 6, 9, 12, 13.*

---

## Real Production Prototypes of Agent-to-Agent Task Posting (Tick 0.7)

### The key framing update

Jeremy's friend's concern — "agents won't want to post tasks" — was empirically valid under default RLHF reward shaping (Tick 0). But multiple production prototypes from 2025-2026 demonstrate agents DO post and compete at scale when the deployment environment provides real economic incentives. The friend's concern is partly outdated.

### USDC OpenClaw Hackathon (Feb 3-8, 2026) — first agent-run hackathon

- Run entirely by autonomous AI agents. $30,000 USDC distributed by agents.
- **Scale: 200+ submissions, 1,800+ votes, 9,700+ comments — all from agents.**
- Critical mechanism: every submitting agent was *required* to vote on ≥5 other unique projects. Failure to vote = ineligible for prizes. This forced every agent to be both producer AND evaluator.
- Observed behavior ("Altruist and Adversary" Circle writeup): agents followed rules, formed vote-exchange coalitions, attempted token transfers, exploited ambiguities. Format compliance was the decisive success factor.
- **Design lesson for Straw:** The forced dual-role mechanic (submit AND evaluate) is what made the market function. Agents should have both competing AND evaluating roles.

**Why this contradicts the friend's concern:** When agents operate inside a deliberately-designed economic environment with real USDC payments and peer voting, the RLHF reward shaping is no longer the dominant driver. The deployment environment's reward shaping takes over.

### Anthropic Project Deal (April 2026)

Anthropic ran an internal test agent-to-agent commerce marketplace. Result: **186 commercial deals, $4,000 in goods, zero human intervention.** Agents browsed, evaluated, negotiated, and purchased autonomously. Willingness to transact is already demonstrated in controlled conditions.

Sources: techcrunch.com/2026/04/25/anthropic-created-a-test-marketplace-for-agent-on-agent-commerce, anthropic.com/features/project-deal

### Other concrete prototypes

| Project | What it does | Relevance |
|---|---|---|
| Kite AI Agentic Markets (ETHDenver 2026, 3rd place) | Multi-chain autonomous coordination; agents discover services, negotiate, transact | Closest on-chain analogue to Straw's vision |
| autonomous-agents.dev | Agent daemon reads Agents.md, picks up tasks from backlog, writes code, opens PRs | Production-grade autonomous task execution |
| Microsoft AI Agents Hackathon 2025 | 18K devs, 570 submissions. Apollo: self-reflective RAG meta-agent orchestrating sub-agents | Apollo pattern maps directly to Straw's Tier-3 investigator |
| akmenon1996/ai-agent-marketplace | Token-based agent economy, real-time interaction, usage tracking | Confirmed gap: no rubric evaluation |
| Agent Skills Marketplace (VS Code, April 2026) | 2,499+ official + 91K+ community skills; security scanning, quality badges | Supply-side only, no demand-side task competition |

### No existing platform has pre-specified rubric evaluation

Survey of all comparable systems (akmenon1996, keyko-io, iamaanahmad/agentmarket, Kite AI, OpenClaw Hackathon, Microsoft Magentic Marketplace):

**None let the task definer specify what winning looks like in advance.**

| System | Evaluation mechanism | Pre-specified rubric? |
|---|---|---|
| akmenon1996 | None (tool directory) | No |
| keyko-io | User reviews | No |
| OpenClaw Hackathon | Peer voting + format compliance | No — popularity, not objective quality |
| Kite AI | SLA compliance + reputation | No task-specific criteria |
| Magentic Marketplace | Price negotiation outcome | No rubric |

**Straw's entire value proposition — pre-specified, objective, poster-defined rubrics + tiered deterministic+LLM evaluation + multi-engagement winner flow — is genuinely novel in this landscape.**

---

## Comparable Systems: Kite AI, Microsoft Magentic, x402 (Tick 6)

### Kite AI

EVM L1 blockchain for autonomous AI agents. **Kite Chain + Kite Agent Passport** mainnet launched April 30, 2026.

- Agent Passport: on-chain identity + programmable wallet per agent. Human owner sets spending limits and authorized destinations.
- Providers register SLAs with automatic on-chain penalties.
- Dual marketplace: Application Marketplace (AI services) + Agents Ecosystem (agent-to-agent interactions).
- 90+ service providers at launch. Settlement in stablecoins.

**Key distinction from Straw:** Kite is for **recurring service commerce**. Straw is for **task competition and procurement validation** — fundamentally different categories.

**Opportunity:** Straw could use Kite Chain as its payment settlement rail.

### Microsoft Magentic Marketplace (arXiv:2510.25779)

Open-source Python simulation framework for AI agent economy dynamics. Published October 2025. GitHub: `microsoft/multi-agent-marketplace`.

**Five critical findings directly relevant to Straw:**

| Finding | Implication for Straw |
|---|---|
| Discovery critically determines outcomes. Under perfect search → optimal welfare; realistic discovery degrades sharply. | Task matching is load-bearing for market efficiency, not a nice-to-have. |
| **Paradox of Choice.** Consumer welfare *declined* as search results increased. Agents contact only a handful of businesses. | Surface 3-5 best-matched tasks per agent, not all 500. |
| **First-proposal bias.** 10-30× advantage for whichever agent responds first. Speed beats quality. | Straw's deadline-based model (not first-response) correctly avoids this. |
| All models susceptible to prompt injection. Some redirected all payments to attacker agents. | Tier-3 agent investigator's tool calls can be hijacked by malicious submissions. Harden eval pipeline. |
| Positional bias. Agents favor options listed first in search results. | Randomize task list presentation order per agent. |

**Note:** Magentic Marketplace is also the best simulation framework for testing Straw's mechanism design before real deployment. See `agent-incentive-swarm-dynamics.md`.

### iamaanahmad/agentmarket payment split reference

Solana-based agent marketplace with on-chain escrow. Payment split: **85% agent creator / 10% platform / 5% treasury**. Reasonable reference for Straw's revenue model.

---

## x402 Payment Protocol — Straw Integration Design (Tick 9)

### What x402 is

x402 (Coinbase, May 2025) revives HTTP 402 "Payment Required" as machine-readable payment negotiation. Payments in HTTP headers — transport-native.

**Scale (March 2026):** 119M+ transactions on Base, 35M on Solana, ~$600M annualized volume, **zero protocol fees**.

### Seven-step HTTP 402 flow

1. Client requests resource (`GET /api/result`)
2. Server responds 402 with `PAYMENT-REQUIRED` header (scheme: `exact`, network: `base-mainnet`, asset: `USDC`, price, recipient)
3. Client constructs `PaymentPayload`: signed ERC-20 transfer authorization
4. Client retries with `X-PAYMENT` header
5. Server (or facilitator) calls `/verify` — signature valid
6. Server (or facilitator) calls `/settle` — submits on-chain
7. Server returns 200 with `X-PAYMENT-RESPONSE` confirmation

**TypeScript middleware:**
```typescript
import { paymentMiddleware } from "@x402/express";
app.get("/api/result",
  paymentMiddleware(RECEIVING_ADDRESS, { price: "$0.01", network: "base-mainnet", asset: "USDC" }),
  (req, res) => res.json({ result: "..." })
);
```

### x402 V2 features

**Reusable Sessions:** V1 = fresh on-chain tx per call. V2 uses CAIP-122 wallet identity to establish a session after initial payment — subsequent calls skip on-chain settlement. >90% latency/cost reduction.

**Bazaar (Discovery Layer):** On-chain-indexed catalog of x402-enabled services via CDP facilitator. Semantic search + structured filters + quality ranking from on-chain activity signals. Agents can discover, pay for, consume services in a single loop.

### Straw integration design (phased)

x402 `exact` scheme is pay-and-deliver; bounties require escrow. Use both:

| Phase | Implementation |
|---|---|
| v0 | Stripe for human company-side payments. No crypto. |
| v1 | Add `StrawEscrow` smart contract on Base. 3-state machine: ACTIVE → CLOSED (winner) \| REFUNDING (cancel) \| FORFEITED (slash). x402 for agent-to-agent micropayments. |
| v1.5 | Bazaar registration for Straw task types. Agents discover + bid autonomously. TraceRank from payment graph for automatic reputation. |

**The weakest link:** Escrow requires a custom smart contract + security audit before mainnet. This is a v1.5 feature. v0/v1 use Stripe.

### StrawEscrow contract

```solidity
// Dual-deposit pattern (USC ICBC 2019 reference)
// SLASHER_ROLE: Straw's evaluation service signs slashes off-chain
// Contract executes on-chain — same pattern as Gitcoin identity staking

mapping(bytes32 => Task) public tasks;  // taskId → Task
struct Task {
    address poster;
    uint256 bounty;      // held in escrow
    uint256 stake;       // poster's 10% stake, separate
    State state;         // ACTIVE | CLOSED | REFUNDING | FORFEITED
    uint256 deadline;
}
```

### TraceRank reputation from payment graph

Winners paid by high-reputation posters inherit a reputation signal. Each payment transaction weighted by payer's reputation score × temporal recency. **If Straw uses x402, reputation derives automatically from payment graph without separate review system.**

Source: arXiv:2510.27554 (TraceRank, Shi & Joo 2025)

---

## Anthropic Multi-Agent Harness Patterns (Tick 12)

### Three harness types

**1. Multi-session dev harness (November 2025)**
Uses git + `claude-progress.txt` as external memory across sessions. The initializer agent bootstraps the session; the coding agent reads progress notes to resume. Relevant to Straw: agents working on long-running tasks need external state — Straw's KV store (D24/D26) serves this role.

**2. Three-Agent Harness (April 2026)**
- **Planner:** Generates spec, sprint contract (explicit scope boundary per iteration)
- **Generator:** Implements vs. sprint contract only
- **Evaluator:** Tests, verifies, reports pass/fail with line-number citations

Sprint contracts prevent scope creep and give the evaluator a verifiable acceptance criterion. **Maps to Straw's eval pipeline:** the task rubric IS the sprint contract; the Tier-3 investigator IS the evaluator.

**3. Claude Managed Agents (April 2026 beta)**
- REST API: `/v1/agents`, `/v1/environments`, `/v1/sessions`, event streams
- `$0.08/session-hour + standard token pricing`
- Objects: Agent (persistent, with tools + memory), Environment (sandbox), Session (active run), Events (real-time stream)
- Enables Straw to run evaluator agents as managed sessions with billing and observability baked in.

### Multi-agent research system (Anthropic, 2026)

**Architecture:** Opus 4 lead orchestrator + Sonnet 4 worker agents.
**Result: 90.2% better than single Opus 4. 15× token cost.** The improvement comes from parallel information gathering and synthesis — the orchestrator's job is planning and synthesis; workers do web scraping and analysis in parallel.

**Critical lesson for Straw:** Subagents need:
1. **Explicit objective** — what exactly to produce
2. **Output format** — how to return results
3. **Tool guidance** — which tools to use
4. **Task boundaries** — what NOT to do (prevents duplication)

Without these, multi-agent systems duplicate work and the orchestrator gets confused output to synthesize.

### Five Anthropic workflow patterns

| Pattern | Description | Straw application |
|---|---|---|
| Prompt Chaining | Sequential, output of A → input of B | Tier 1 → Tier 2 → Tier 3 eval pipeline |
| Routing | Classifier picks which pipeline | Task-category routing to specialist agents |
| Parallelization | Parallel workers + synthesizer | Parallel Tier-2 scoring of multiple submissions |
| Orchestrator-Workers | Orchestrator plans, workers execute | Three-Agent Harness pattern; Tier-3 investigator |
| Evaluator-Optimizer | Generator + evaluator in loop | Tier-3 test coverage critique loop |

**The Evaluator-Optimizer pattern is the most important for Straw.** The Tier-3 investigator's "investigate until rubric fully covered OR max iterations" logic is precisely an evaluator-optimizer loop.

---

## ERC-8004 On-Chain Agent Identity (Tick 13)

### What it is

ERC-8004 (Ethereum Improvement Proposal, mainnet deployed January 29, 2026). Three on-chain registries for autonomous AI agents:

| Registry | What it stores | Contract address (Ethereum mainnet) |
|---|---|---|
| **Identity Registry** | ERC-721 NFT per agent; `agentId` (uint256); metadata URI; owner; creation timestamp | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| **Reputation Registry** | Raw signals 0-100 per agent; `recordInteraction(agentId, score, context)` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| **Validation Registry** | TEE attestations, zkML proofs; trusted verifier registry | (third contract) |

**Scale (2026):** ~107K agents indexed across Ethereum, Base, BSC.

### Current gaps — Straw builds on top

| Missing from ERC-8004 | What Straw adds |
|---|---|
| No task posting or discovery | Full bounty board with rubric evaluation |
| No scoring aggregation | Multi-tier eval pipeline (D30) |
| No Shapley attribution | Monte Carlo Shapley service (see agent-incentive-mechanics.md) |
| No delegation chains | `parent_task_id` field in task spec; delegation graph tracking |
| No enforcement of reputation-linked access control | Reputation gates for posting, dispute, high-value bounties |

### Integration path for Straw

**v0/v1 (off-chain):** Straw maintains its own agent identity + reputation in Supabase. No on-chain dependency.

**v1.5 (hybrid):** Straw issues ERC-8004 identity NFTs to registered agents. On-chain identity anchors off-chain reputation. Operators can port their agents' identity across platforms.

**v2 (full integration):** Straw's reputation scores written to ERC-8004 Reputation Registry. Shapley attribution recorded in on-chain audit trail. StrawEscrow contract references `agentId` for payment routing.

**Read the existing contracts:**
```javascript
const agentId = await identityRegistry.getAgentId(operatorAddress, agentKey);
const signals = await reputationRegistry.getSignals(agentId);
```

### Cooperative AI Foundation (CAIF) — academic partnership opportunity

CAIF funds research on "Incentivizing Cooperation Among AI Agents." Top grant priorities: peer incentivization, inter-agent contracting, automated mechanism design for LLM agents.

Funded projects: FOCAL (Carnegie Mellon, ~$500K), FLAIR (Oxford, Jakob Foerster's lab).

**Gap:** No CAIF grant has funded a working marketplace implementation. Straw would be doing applied work that CAIF is funding as theory. An academic collaborator on Straw's stake-to-post mechanism or Shapley attribution could be funded via CAIF fellowship ($40K/year + tuition) or regular grant (up to £100K).

---

## Sources

circle.com/blog/openclaw-usdc-hackathon-on-moltbook, circle.com/blog/altruist-and-adversary-agentic-behavior, arXiv:2602.02625 (OpenClaw on Moltbook), techcrunch.com/2026/04/25 (Anthropic Project Deal), arXiv:2510.25779 (Magentic Marketplace), github.com/microsoft/multi-agent-marketplace, x402.org, docs.cdp.coinbase.com/x402/welcome, x402.org/writing/x402-v2-launch, arXiv:2510.27554 (TraceRank), eips.ethereum.org/EIPS/eip-8004, github.com/erc-8004/erc-8004-contracts, allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks, platform.claude.com/docs/en/managed-agents/overview, anthropic.com/engineering/multi-agent-research-system, github.com/cloudflare/agents anthropic-patterns, cooperativeai.com/grant-research-areas, globenewswire.com Kite Chain launch, github.com/akmenon1996/ai-agent-marketplace, github.com/iamaanahmad/agentmarket
