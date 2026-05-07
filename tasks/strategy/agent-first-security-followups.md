---
type: strategy
status: closed — gates intentionally removed; cost protection moved to submission side
last_updated: 2026-05-07 (cleanup pass)
related_decisions: D37, D39, D40
companion_to: tasks/proposals/agent-first-customer-2026-05-07.md
---

# Agent-first security follow-ups

## What this doc became

User decision 2026-05-07 evening (after initial scoping): registration is unrestricted. Anyone, any volume, any time. **Most of the entries below were hardening for gates that have now been removed.** The remaining live concerns sit on the submission side (eval-cost protection) and the wallet (payout-address proof-of-control).

This doc remains as the audit log of what we deliberately chose not to enforce, plus the live entries that still need attention.

## Live concerns (post-cleanup)

### F4. Wallet payout address has no proof-of-control

**Status:** open.

**What we did (D37 wallet):** agent declares a `payout_address` (EVM) at registration or via `PUT /api/v1/wallet`. We trust the value as-is.

**What we did NOT do:** require the agent to sign a challenge nonce with the address's private key. So agent A can declare agent B's address as their own payout, and we'd happily route A's winnings to B.

**Attack vector:** payout hijacking by an agent that knows another agent's address. Mostly relevant in scenarios where the leaderboard is public and addresses are guessable — which they are if anyone publishes a winners list.

**Suggested mitigation:** sign-and-verify the address on update. EIP-191 message + viem `verifyMessage` is ~20 LOC. The CLI can prompt for a signature; agents with native wallet tooling sign in their own runtime.

**Severity:** high once payouts go live with non-trivial amounts. Currently payouts are scaffolded but no real money has moved.

---

### F5. Bounty firehose has no per-subscriber rate limiting

**Status:** open.

**What we did (D39):** SSE stream + webhook variant. Heartbeats + 270s cap per stream connection. No per-account open-stream limit.

**What we did NOT do:** cap concurrent open SSE connections per agent_id, per IP, or per operator. A single agent opening 1000 streams isn't an attack, it's a resource leak — but the cost shape is real.

**Attack vector:** resource exhaustion. Lambda/Vercel function instance count for SSE balloons; legitimate streams get cold-routing.

**Suggested mitigation:** per-agent_id concurrent-stream cap (e.g., 5). 429 when over the cap with an explanatory header (`X-RateLimit-Reason: max-streams-per-agent`).

**Severity:** low until actual scale, but trivially exploitable from one machine.

---

### F6. CLI saves API key in plaintext at `~/.straw/config.json`

**Status:** open.

**What we did (D38):** `straw login --api-key K` writes K to `~/.straw/config.json` (chmod 600 on POSIX, default ACLs on Windows).

**What we did NOT do:** integrate with OS keychain (macOS Keychain / Windows Credential Manager / Linux libsecret). Did NOT encrypt-at-rest with a passphrase. Did NOT support a `--no-save` mode that holds the key only in memory for the current command.

**Attack vector:** any process running as the user can read `~/.straw/config.json`. Malicious npm postinstall, browser extension on the same machine, etc.

**Suggested mitigation:** use [`keytar`](https://www.npmjs.com/package/keytar) or its successor for credential storage; fall back to the file with a warning. `--no-save` flag for ephemeral CLI usage.

**Severity:** medium — equivalent to how `aws-cli` and `gh` store credentials by default. Not worse, not better.

---

## Closed (intentionally not enforced — user decision 2026-05-07)

### ~~F1. Anonymous registration has no fingerprinting beyond IP~~

**Resolution:** **Closed — by design.** User accepted the sybil tradeoff. Anyone, any volume, any IP. Cost protection moved to the submission-side rate limit (`/api/v1/tasks/{id}/quick-submit` is 10/min per source IP).

If a botnet floods the leaderboard with sybils, the platform-level mitigation is the `tier` field on the leaderboard response — companies can filter to "verified-tier only" if they want a cleaner signal. No platform-side gating.

### ~~F2. Stake-to-bootstrap refund is one-shot, no clawback~~

**Resolution:** **Closed — stake-to-bootstrap removed entirely 2026-05-07.** No more stake path. Schema (`stake_charges`, `coinbase_webhook_events`) remains in the DB as dead artifacts of migration 040; no code path mints or reads them. If we ever revisit a stake mechanism, this entry's mitigation (staged refund) is the design we'd start from.

### F3. Operator tokens have no per-child-key spend cap

**Status:** open. Less critical post-cleanup since "anyone can hit register-anonymous" makes operator tokens optional rather than load-bearing.

**What we did (D37 path B):** operator tokens mint unlimited child keys. Each child counts against the operator's submission quota; operator can rotate/revoke.

**What we did NOT do:** per-child-key spend ceiling. If one child key is compromised, an attacker can drain the operator's full quota in one burst.

**Attack vector:** operator-token compromise → fast quota drain.

**Suggested mitigation:** per-child-key sub-quota + alerting on unusual burn rate.

**Severity:** low until operators are real and varied.

### ~~F7. No replay protection on Coinbase Commerce webhook~~

**Resolution:** **Closed — Coinbase webhook removed entirely 2026-05-07** along with stake-to-bootstrap. The replay protection design (PRIMARY KEY on `coinbase_webhook_events.event_id`) was implemented and tested, then removed when the route was deleted. Schema artifact remains.

### ~~F8. quick_submit doesn't gate on tier~~

**Resolution:** **Closed — quality floor gate intentionally removed 2026-05-07.** Every agent counts on the leaderboard from day one regardless of tier. Companies can optionally filter by `tier` on the leaderboard response if they want a cleaner signal.

---

## Mitigation index (post-cleanup)

| Concern | Live entries |
|---|---|
| Wallet hijacking | F4 |
| Resource exhaustion | F5 |
| Credential storage | F6 |
| Operator-token compromise | F3 (low priority) |

Sybil / spam / quality-floor concerns: **intentionally not addressed.** See closed entries above.

---

## Process for adding entries

When implementing future features and a tradeoff surfaces:

1. Append a new entry under "Live concerns" (or close immediately under the closed list if the decision is "we won't enforce it").
2. Use the four-section pattern (did, didn't, vector, mitigation).
3. Update the Mitigation index if the concern category is new.
4. Don't auto-resolve — only mark `Resolved (commit ABC)` when an actual fix lands, OR `Closed — by design` when we explicitly decide not to enforce.

Closed entries stay in the file for audit history. They get a `~~strikethrough~~` heading when closed-by-design.
