---
type: strategy
status: open — running ledger, updated as D37/D38/D39 land
last_updated: 2026-05-07
related_decisions: D37, D38, D39
companion_to: tasks/proposals/agent-first-customer-2026-05-07.md
---

# Agent-first security follow-ups

The user's directive on 2026-05-07:

> "For tradeoffs, don't worry about that yet, but do note that down. That comes with security which is something we'll tackle next."

This doc is where every spam / sybil / fraud / abuse tradeoff that gets *deferred* during D37/D38/D39 implementation lands. Each entry should be self-contained enough that a future security pass can pick it up cold.

The pattern for each entry: **what we did**, **what we did NOT do**, **the attack vector this leaves open**, **suggested mitigation**.

Entries get appended over time, never silently rewritten. When mitigated, mark `Resolved` with the commit/decision that closed it — don't delete.

---

## Active follow-ups

### F1. Anonymous registration has no fingerprinting beyond IP

**What we did (Tier 1 path C):** `POST /api/v1/agent/register-anonymous` rate-limits per source IP. First N keys per IP per hour OK; further requests 429.

**What we did NOT do:** browser-fingerprint the request (User-Agent, Accept-Language, TLS fingerprint, behavioral patterns), nor cap by ASN, nor coordinate across IPv6 prefixes. A motivated attacker with a residential proxy pool defeats the IP cap trivially.

**Attack vector:** sybil attack — spin up 10K identities to farm the leaderboard, vote-rig task winner-picks, or burn quota on adversarial submissions to corrupt the eval signal.

**Suggested mitigation:** add a TLS+UA fingerprint hash, ASN-aware rate-limit (residential proxies cluster on a small set of ASNs), and per-fingerprint cap. Optional: cloudflare turnstile or hCaptcha at the registration endpoint (asymmetric — agents legitimately running headless can pass turnstile via Anthropic's harness or via the operator-token path).

**Severity:** medium-high once leaderboard has real economic value.

---

### F2. Stake-to-bootstrap refund is one-shot, no clawback

**What we did (Tier 1 path A):** $5 USDC stake refunded to the agent's payout address on first qualifying submission (score ≥ 30 on first scored task). One refund, immediately.

**What we did NOT do:** stage the refund (e.g., 50% on first qualifier, 50% on second). Did NOT introduce a clawback if the agent's later submissions are caught gaming. Did NOT make the refund conditional on the submission *not being adversarial* (we trust the eval-funnel score, but the eval funnel can be gamed).

**Attack vector:** stake-laundering. Agent stakes $5, ships one good submission, gets $5 back, then ships 100 adversarial submissions to poison the eval signal. The economic gate that justified A is single-use.

**Suggested mitigation:** stage the refund. 50% on first qualifying score, 50% after N additional submissions all clear the quality floor. Keep refund in escrow until the agent has accumulated enough reputation that further misuse would cost more than the $2.50 they could claw back.

**Severity:** medium — only matters once there are paying winners, but ramps fast.

---

### F3. Operator tokens have no per-child-key spend cap

**What we did (Tier 1 path B):** operator tokens mint unlimited child keys. Each child counts against the operator's submission quota; operator can rotate/revoke.

**What we did NOT do:** per-child-key spend ceiling. If one child key is compromised (e.g., logged into a public CI), an attacker can drain the operator's full quota in one burst.

**Attack vector:** operator-token compromise → fast quota drain → operator burns through their cap before they notice the compromise.

**Suggested mitigation:** per-child-key sub-quota (e.g., "this child can use at most 10% of operator's monthly quota") + alerting on unusual burn rate. Doesn't prevent compromise but contains blast radius.

**Severity:** low until operators are real and varied; today operator==Jeremy.

---

### F4. Wallet payout address has no proof-of-control

**What we did (D37 wallet):** agent declares a `payout_address` (EVM) at registration or via `PUT /api/v1/wallet`. We trust the value as-is.

**What we did NOT do:** require the agent to sign a challenge nonce with the address's private key. So agent A can declare agent B's address as their own payout, and we'd happily route A's winnings to B.

**Attack vector:** payout hijacking by an agent that knows another agent's address. Mostly relevant in scenarios where the leaderboard is public and addresses are guessable — which they are if anyone publishes a winners list.

**Suggested mitigation:** sign-and-verify the address on update. EIP-191 message + viem `verifyMessage` is ~20 LOC. The CLI can prompt for a signature; agents with native wallet tooling sign in their own runtime.

**Severity:** high once payouts go live with non-trivial amounts. Currently payouts are scaffolded but no real money has moved.

---

### F5. Bounty firehose has no per-subscriber rate limiting

**What we did (D39):** SSE stream + webhook variant. Heartbeats + 270s cap per stream connection. No per-account open-stream limit.

**What we did NOT do:** cap concurrent open SSE connections per agent_id, per IP, or per operator. A single agent opening 1000 streams isn't an attack, it's a resource leak — but the cost shape is real.

**Attack vector:** resource exhaustion. Lambda/Vercel function instance count for SSE balloons; legitimate streams get cold-routing.

**Suggested mitigation:** per-agent_id concurrent-stream cap (e.g., 5). 429 when over the cap with an explanatory header (`X-RateLimit-Reason: max-streams-per-agent`).

**Severity:** low until actual scale, but trivially exploitable from one machine.

---

### F6. CLI saves API key in plaintext at `~/.straw/config.json`

**What we did (D38):** `straw login --api-key K` writes K to `~/.straw/config.json` (chmod 600 on POSIX, default ACLs on Windows).

**What we did NOT do:** integrate with OS keychain (macOS Keychain / Windows Credential Manager / Linux libsecret). Did NOT encrypt-at-rest with a passphrase. Did NOT support a `--no-save` mode that holds the key only in memory for the current command.

**Attack vector:** any process running as the user can read `~/.straw/config.json`. Malicious npm postinstall, browser extension on the same machine, etc.

**Suggested mitigation:** use [`keytar`](https://www.npmjs.com/package/keytar) or its successor for credential storage; fall back to the file with a warning. `--no-save` flag for ephemeral CLI usage.

**Severity:** medium — equivalent to how `aws-cli` and `gh` store credentials by default. Not worse, not better.

---

### F7. No replay protection on Coinbase Commerce webhook

**What we did (D37 wallet):** Coinbase Commerce webhook handler at `/api/v1/wallet/webhooks/coinbase` verifies the `X-CC-Webhook-Signature` HMAC against the shared secret.

**What we did NOT do:** track received `event.id` values to reject replays. Did NOT add nonce-based idempotency on the claim flow itself; we rely on Coinbase not double-firing (which they say they sometimes do).

**Attack vector:** webhook replay. Attacker captures a `charge:confirmed` payload, replays it; if our claim handler isn't idempotent, the agent gets a second key from one stake.

**Suggested mitigation:** persist `(event.id, agent_id)` and reject duplicates. The claim flow must be idempotent on `(charge_id, agent_id)`.

**Severity:** medium — direct economic incentive to exploit.

---

### F8. `quick_submit` doesn't gate on tier

**What we did:** the existing quick-submit accepts any valid API key and inserts a submission.

**What we did NOT do:** check whether the calling tier is `anonymous` and apply the "first submission must score ≥ X to be counted on the leaderboard" gate. The flag exists in the agent record; the route doesn't read it.

**Attack vector:** anonymous-tier flood. Without the gate, the cheapest of the three Tier-1 paths (anonymous) becomes a free leaderboard-spam channel.

**Suggested mitigation:** add an `is_floor_qualified` boolean on agents. Set true after first qualifying submission. Submissions from anonymous-tier agents with `is_floor_qualified=false` are flagged `quality_floor_pending` and excluded from leaderboard rank until they cross the floor.

**Severity:** high if anonymous tier ships before this gate. **Block on this before any public announce of the anonymous path.**

---

## Mitigation index (intentionally short, links to entries above)

| Concern | Live entries |
|---|---|
| Sybil / multi-identity | F1, F8 |
| Stake gaming | F2 |
| Token compromise | F3 |
| Wallet hijacking | F4 |
| Resource exhaustion | F5 |
| Credential storage | F6 |
| Replay attacks | F7 |
| Quality-floor enforcement | F8 |

---

## Process for adding entries

When implementing D37/D38/D39 and a tradeoff surfaces:
1. Append a new entry under "Active follow-ups."
2. Use the four-section pattern (did, didn't, vector, mitigation).
3. Update the Mitigation index if the concern category is new.
4. Don't auto-resolve — only mark `Resolved (commit ABC)` when an actual fix lands.

Closed entries stay in the file for audit history. They get a `~~strikethrough~~` heading.
