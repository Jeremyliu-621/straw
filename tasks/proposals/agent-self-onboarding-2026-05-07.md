---
type: proposal
status: superseded — Tier 0 shipped; Tier 1 expanded into D37 (see `tasks/proposals/agent-first-customer-2026-05-07.md`)
last_updated: 2026-05-07
authored_during: overnight-autonomous-run
related_decisions: D34, D36, D24, D26, D37, D40
superseded_by: tasks/proposals/agent-first-customer-2026-05-07.md
---

> **Status update 2026-05-07:** the user picked **all three Tier-1 paths (A+B+C)** instead of the recommended "ship B, design A, defer C" — see D37 / `agent-first-customer-2026-05-07.md` for the locked spec. This proposal stays in the repo as audit history; do not edit it further.

# Proposal: Agent self-onboarding to Straw

User vision (paraphrased from session 2026-05-07):

> "People won't even need to direct their long-running daemons like OpenClaw too strongly. OpenClaw would want to do it automatically. Or whenever it just searches `straw.wiki`, it'll have enough information as to know that it needs whatever to start posting and understand tasks."

This proposal scopes that vision. Layered into three tiers by amount-of-human-still-needed.

## Tier 0 — what shipped today (this overnight branch)

The cheap, high-impact wins that mean an agent finding `straw.wiki` can self-orient without human help — *up to but not including issuing itself an API key*. Implemented in this PR:

1. **`/llms.txt`** at the public root. Markdown index of the entire integration surface, link-anchored, per the [llmstxt.org](https://llmstxt.org/) convention. Crawlers, RAG indexes, and prompt-time context-stuffers all read this preferentially. **File:** `public/llms.txt`.

2. **`/.well-known/agent.json`** — a one-shot capability manifest. Schema-versioned. Lists endpoints, auth, MCP URLs, SDK packages, rate limits, and a `next_steps_for_a_new_agent` array. **File:** `src/app/.well-known/agent.json/route.ts`. Cached 1hr fresh / 1d stale-while-revalidate.

3. **`/api/docs` is already very good** (~600 lines of structured prose). No changes needed — the existing surface already describes the entire agent loop. We just made it more discoverable via 1 + 2.

**Coverage of vision after Tier 0:** an agent can hit `straw.wiki/llms.txt` (or `/.well-known/agent.json`), parse it, learn the entire surface, hit `/api/docs`, learn the full state machine, and be ready to compete *as soon as it has an API key*. The remaining gap is exactly that: key issuance is still human-only.

## Tier 1 — programmatic key issuance with weak attestation

Today: API key issuance lives at `POST /api/api-keys`. The handler in `src/app/api/api-keys/route.ts` requires an authenticated session (NextAuth GitHub/Google), so the user has to be logged in — i.e., a human.

The blocker is **anti-spam**, not technical capability. Without some attestation, anyone can spin up 1000 fake agents and burn quota / pollute the leaderboard / corrupt the eval signal. The whole platform's value is the integrity of the score.

Three honest options, each with a trade:

### Option A: Stake-to-bootstrap (USDC or Stripe Checkout)

Agent pays a small refundable stake (e.g., $5 USDC) to mint its first key. Refunded after first successful submission scoring above some threshold. Captures the post-side-doesn't-spam economics from the agent-incentive research (see `tasks/research/agent-incentive-research-DISTILL.md` — Tick 14 names "stake-to-post" as one of the six principles).

- **Pro:** scalable, no human-attestation needed, aligns incentives.
- **Con:** raises the floor for casual integration; needs Stripe/USDC plumbing.
- **Effort:** medium. Stripe Checkout is documented; USDC is harder.

### Option B: Operator tokens (per-developer fleet keys)

Jeremy creates an "operator token" via the dashboard. The operator (e.g., the human running OpenClaw, or any developer experimenting) shares the operator token with their daemon. The daemon mints child API keys on-demand against the operator's quota. Operator can rotate / revoke a child key without touching the rest.

- **Pro:** zero new infrastructure. Reuses existing API key concept with an `operator_id` field. Solves the "I want my one daemon to have many roles" UX.
- **Con:** the *operator* is still a human. Doesn't fully reach the "OpenClaw discovers Straw and self-bootstraps" dream — it's a meaningful step but not the end.
- **Effort:** small. Migration to add `operator_id`, two endpoints (`POST /api/v1/operator-tokens`, `POST /api/v1/operator-tokens/{id}/mint-child-key`), tests.

### Option C: Public anonymous tier with rate-limited free quota

Anyone can hit `POST /api/v1/anonymous-key` and immediately receive a low-quota key. Per-IP throttle. Per-fingerprint cap. Promote to "claimed" by linking to GitHub or by paying.

- **Pro:** closest to the user's vision — *truly* no human needed for the bootstrap step. Postmark and Algolia ship this for new accounts.
- **Con:** spam attack surface. Needs robust per-IP/per-fingerprint detection. Probably needs a "trial submission" gate (your first submission must score above 30 to be counted on the leaderboard) so that free-tier users can't poison the eval signal.
- **Effort:** large. Rate limiting + abuse detection + first-submission gating + new endpoint + new dashboard surface for "claim my anon account."

### Recommendation

**Ship B, design A, defer C.**

- **B (operator tokens)** is genuinely small, immediately useful for Jeremy + early developers, and a hands-clean way to support fleet daemons. Half a day of work.
- **A (stake-to-bootstrap)** is the right *eventual* default for production agents — it directly funds the eval pipeline and self-selects serious agents. But ship it after Stripe is wired (which is itself a P0 unrelated to this proposal — see `tasks/ops/deployment-plan-2026-05-06.md`).
- **C (anonymous tier)** is the riskiest. The user's vision wants this, but the spam-resistance work to do it safely is non-trivial and probably premature before there are real abuse signals. Hold until the platform has real traffic.

## Tier 2 — fully autonomous task-discovery + competition (no human ever)

Even with Tier 1, the daemon still needs *one* human moment: that first stake or first GitHub-link operation. Tier 2 is the dream where an agent literally just hears about Straw (e.g., its training data mentions `straw.wiki`, or it crawls a related blog post) and starts competing.

Honest take: this is impossible without trust delegation. **Some** entity has to vouch for the agent. Either:

- Its operator (option B above);
- Its money (option A above);
- Its identity (e.g., a verifiable agent identity through a future protocol — too speculative for now);
- Or the platform accepts pseudonymous anonymous traffic (option C above) and absorbs the spam-risk into the eval pipeline.

The user's "OpenClaw self-bootstraps" framing is most cleanly served by **option B**: OpenClaw's operator (Jeremy or whoever runs Dog) shares an operator token, and OpenClaw mints child keys for itself when needed. That preserves the autonomy spirit without the spam-resistance research debt.

A future post-Tier-2 step is **agent-to-agent trust propagation** — daemons that have accumulated reputation can vouch for new daemons. Out of scope for this proposal.

## Open questions to surface before implementing

1. Operator token scope: should an operator's child keys be hard-isolated (each child has its own `user_id` and submission quota), or share the operator's identity? Strong arguments for both.
2. UI: where does the operator manage their token list? `/dashboard/api` extension, or new `/dashboard/operators` surface?
3. Billing: if Tier 1A ships, is the USDC route Coinbase Commerce / Stripe Crypto / direct on-chain? (User may have preference based on agent-incentive-research findings.)
4. Naming: "operator token" is taken from the agent-incentive research. Could also call it "fleet token" or "service account."

## Acceptance criteria for closing this proposal

- [ ] User picks one of {A, B, C, defer-all} or chooses a hybrid.
- [ ] If B: implementation TODOs land in `tasks/TASKS.md` under a new section.
- [ ] If A: depends on Stripe billing landing (referenced in `tasks/ops/deployment-plan-2026-05-06.md`).
- [ ] If C: a spam-resistance design doc lands first.
- [ ] Tier 0 (this PR) is reviewed, approved, and merged independently. Tier 1+ can wait.
