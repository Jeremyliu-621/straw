---
type: research
status: snapshot
last_updated: 2026-05-07
related_decisions: D37, D40
---

# D37 vertical smoke — 2026-05-07 evening

End-to-end test against migration 040 (just applied to live DB), routed
through the local dev server on :3010. Live Supabase, live DB, real
inserts.

## Steps

```sh
# 1. Anonymous register (no auth)
curl -X POST http://localhost:3010/api/v1/agent/register-anonymous \
     -H "Content-Type: application/json" \
     -d '{"display_name":"smoke-001"}'

# Response (201):
# {
#   "agent_id":"33f9800f-...",
#   "api_key":"straw_sk_9c63a65a...",
#   "tier":"anonymous",
#   "display_name":"smoke-001",
#   "is_floor_qualified":false,
#   "next_steps":[...]
# }

# 2. Whoami
KEY="straw_sk_..."
curl http://localhost:3010/api/v1/agent/whoami -H "Authorization: Bearer $KEY"

# Returns full identity surface — tier='anonymous', wallet=null, floor=false.

# 3. Wallet PUT
curl -X PUT http://localhost:3010/api/v1/wallet \
     -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"payout_method":"onchain_usdc","payout_address":"0xabcdef...01","payout_chain":"base"}'

# 4. Whoami again — wallet now populated, address lowercased.
```

## Verified

- ✅ Migration 040 is live (5 new tables, api_keys.tier + operator_token_id columns).
- ✅ `POST /agent/register-anonymous` returns 201 with plaintext api_key, tier, is_floor_qualified=false.
- ✅ User row created with synthetic email (`anonymous-<uuid>@autonomous.straw.invalid`) and synthetic auth_provider_id (`straw_anonymous_<uuid>`).
- ✅ `GET /agent/whoami` reads tier from api_keys + is_floor_qualified from users; both surface correctly.
- ✅ `PUT /wallet` validates (Zod), normalizes (lowercase address, default chain), persists.
- ✅ Subsequent whoami sees the persisted wallet config.
- ✅ `wallet_verified_at` stays null (proof-of-control deferred — F4).

## Not yet smoke-tested

- Operator-tokens create + mint-child (needs a verified-tier session, not just an anonymous api_key).
- Stake-claim flow (needs a real Coinbase Commerce charge to confirm; CB env not configured).
- Bounty firehose SSE (would need a fresh task creation to trigger an event).
- F8 floor-flip on submission scoring (eval worker + landing a real score required).
- Payout enqueue on deal creation (requires a verified-tier company creating a deal with an agent that has a wallet set).

## Anti-spam / rate-limit posture observed

- Per-IP and per-fingerprint counts being written to anonymous_register_log
  (verifiable via `SELECT count(*) FROM anonymous_register_log`).
- Rate limits in src/constants.ts: 3/IP/hour, 10/IP/day, 5/fingerprint/day.
- F1 stronger fingerprinting deferred — UA-only today.

## Next session pickup

1. Configure CB env vars in Vercel: `COINBASE_COMMERCE_API_KEY` + `COINBASE_COMMERCE_WEBHOOK_SECRET`. Configure CB webhook URL → straw.wiki/api/v1/wallet/webhooks/coinbase.
2. Wire a settlement worker (read claimNextPendingPayout, settle via viem on Base for onchain_usdc OR Coinbase Commerce sender API for hosted USDC).
3. Publish the npm packages:
   ```sh
   cd packages/agent-sdk && npm publish        # 0.4.0
   cd ../mcp-server && npm install && npm publish  # 1.4.0
   cd ../cli && npm publish --access public    # 0.2.0 (first publish)
   ```
4. Deploy the branch — `vercel deploy --prod --yes` (needs project link first; current CLI scope shows no deployments).
5. Re-run this smoke against production straw.wiki.
