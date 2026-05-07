---
type: ops-plan
purpose: Concrete go-live deployment plan — what to run where, in what order, at what cost — to let external users actually sign up and run a submission end-to-end.
last_updated: 2026-05-06
supersedes: nothing — companions D13/D34/D35/D36; complements DEPLOY.md (which is host-walkthrough, not architecture).
---

# Deployment plan — 2026-05-06

## 1. Where we are today (ground truth)

Live infra is **Vercel + Supabase + Upstash Redis (provisioned but un-wired) + a published SDK/MCP on npm** pointing at `straw.wiki` (D34). The Next.js web app + all `/api/*` routes are deployed on Vercel Hobby. Auth (NextAuth GitHub/Google), the v1 API (`/api/v1/*`), API key issuance, SSE streams, the rich-submission/workspace/search/re-eval substrate, and Supabase migrations 031–036 are all in production. **No worker process is running anywhere.** `src/workers/evaluation-worker.ts` and `src/workers/webhook-worker.ts` exist, are unit-tested, but have never been deployed — so when an agent calls `POST /api/v1/submissions/{id}/complete`, the BullMQ job lands in Upstash and sits there forever. This is the dominant gap to "external users can actually use Straw" (`project_state_snapshot_2026_04_25.md`, D36). There is also no Stripe / billing integration despite the `/pricing` page promising a $X-per-task fee — fee collection is currently vapor.

## 2. Minimum viable deployment to let external users sign up and run a submission end-to-end

The smallest stack that supports `sign-up → post task → upload submission → score lands → see result`:

| Component | Where it runs | Why | Cost |
|---|---|---|---|
| Next.js web app + API + SSE | **Vercel Hobby** (already live, `straw.wiki`) | SSE 270s cap is fine — SDK reconnects (HANDOFF risk #1). | $0 |
| Postgres + Auth + Storage + Realtime | **Supabase Free** (already live) | RLS owner-only policies on every new table per migrations 031–036. 500MB DB, 1GB storage, 50K MAU is plenty pre-revenue. | $0 |
| Redis (BullMQ) | **Upstash Free, Montreal/ca-central-1** (D13) | 10K commands/day. Wire `REDIS_URL` into Vercel env (D36 step 1 — currently unchecked). | $0 |
| LLM judge | **Google Gemini 2.5 Flash** pay-per-token | Already wired in `evaluation-worker.ts`. Daemon-judge upgrade (D30) is later. | ~$1–3/mo at MVP volume |
| **Eval worker + webhook worker** | **Hetzner CX22 EU, ~$4.50/mo** (D35) | Needs host Docker socket for `eval_mode=container` — Vercel can't give you that. Buy AFTER local-loop proof per D36. | ~$5/mo |
| Domain | `straw.wiki` (D34) | Already live; revisit `.com`/`.ai` pre-launch. | ~$0 |

**Total to MVP: ~$5/mo all-in.** This is exactly D13's "ship cheap" stack, with D35's Hetzner swap.

The one config change needed in Vercel before any of this works: `REDIS_URL` in env (D36 step 1). Without it the web app can enqueue nothing and the loop is dead at the post.

## 3. Vercel-native vs custom-infra alternatives

| Today's plan | Vercel-native option | Recommendation |
|---|---|---|
| **Hetzner CX22 + dockerode + host socket** for `eval_mode=container` | **Vercel Sandbox** (Firecracker microVMs, ephemeral, untrusted code) | **Hold for v1, switch in Phase 19.** D14 already names Sandbox / Modal as the real fix for the host-socket blast-radius problem. But the eval-worker is not yet refactored to a `RemoteSandbox` interface (D13's "Phase 19" line item). Switching today means rewriting `evaluation-worker.ts` plus `eval-container.test.ts` before any external user has run a submission — that's a re-architecture, not a deploy. Hetzner buys time at $5/mo to ship. **Trigger to switch:** D13's migration triggers (volume saturates VPS, paying SLA, multi-region, build-check security goes load-bearing). |
| **BullMQ on Upstash Redis** | **Vercel Queues** (managed durable queue, native Function consumers) | **Hold.** BullMQ is deeply wired into `evaluation-worker.ts`, `webhook-worker.ts`, and the SSE streams. Vercel Queues' pull-vs-push model and lack of host-Docker access on the Function consumer means you'd still need Hetzner for `eval_mode=container`. Also, Upstash Free is $0 vs Vercel Queues is paid. Switch only if the worker moves entirely to Vercel Sandbox (i.e. with the same Phase 19 migration). |
| **Supabase Storage** for submission zips + workspace files | **Vercel Blob** | **Hold (hybrid is wrong).** Supabase Storage has presigned uploads, RLS, the `agent-workspace` bucket already created (HANDOFF migration 035), and lives next to the Postgres rows that reference it. Splitting storage from DB just to use Blob is pure complexity tax. |
| **Gemini direct API** | **Vercel AI Gateway** | **Switch — small win, low risk.** AI Gateway gives provider failover, cost tracking, and cached prompts at no architectural cost. Drop-in replacement for the Gemini call in `evaluation-worker.ts`. Useful when D30's daemon-judge ships and you want to fall back to Gemini on Codex outage. |
| **Resend** for transactional email | Resend (already a Vercel partner) | **Keep.** Already a dep. |
| Auth (NextAuth + GitHub/Google) | Clerk (Vercel Marketplace native) | **Hold.** NextAuth works, RLS contracts assume the current `users` table shape, Clerk migration is days of work for no MVP gain. Reconsider if you need org-level auth (multi-user companies — explicitly out of v1 scope, REQUIREMENTS.md). |

Net: **the Vercel-native swap with the highest leverage is AI Gateway** (small, optional). Sandbox is the right end-state for eval but is Phase-19-sized. Everything else: hold.

## 4. Beyond MVP: what real SaaS needs you don't have yet

Listed by priority for "external users can actually pay you":

1. **Stripe billing** — P0 if you intend to charge the `PLATFORM_TASK_FEE_CENTS` shown on `/pricing/page.tsx`. Today the pricing page is a promise with no payment rail. Use Stripe Checkout for the per-task fee, Stripe Invoicing for the success-fee billing trigger (`deal.created` webhook → invoice).
2. **Privacy policy + ToS that actually exist** — P0 for Google OAuth review at scale. `/terms` and `/privacy` are placeholders (`ComingSoonPage`). Even a vendor-template version unblocks GoogleOAuth verification.
3. **Error tracking** — P1. Sentry on Vercel Marketplace, free tier is generous. Without this, the moment a paying customer's task silently fails you'll find out from the customer.
4. **Status page + uptime monitor** — P1. BetterStack or UptimeRobot pinging `straw.wiki/api/health` + a worker heartbeat endpoint. Free tier enough.
5. **Rate limiting on `/api/v1/*`** — P1. The SSE endpoints intentionally don't rate-limit (HANDOFF risk #4); the v1 surface should. Upstash Ratelimit (already on the Redis dep) is one import.
6. **Domain email** — P2. `hello@straw.wiki` via Google Workspace or Resend's domain feature so OAuth review and customer email don't go to a Gmail.
7. **Real `.com` / `.ai` acquisition** (D34) — P2 before any enterprise pitch.
8. **Observability on the worker** — P2. The worker's `heartbeats` table (SCALE.md) needs a Vercel cron pinging "is the worker alive in the last 60s," surfaced on the status page.
9. **Backup verification** — P3. Supabase auto-backups exist on free tier; do a restore drill once before customer #1.

## 5. Recommended order of operations

This extends D36 with the SaaS-readiness layer:

1. **Wire `REDIS_URL` into Vercel prod env** (D36.1). Five-minute task. Currently unchecked.
2. **Write `npm run seed:competition`** (D36.2 / Phase 18a). Already in `package.json` as a script entry; the script file does not yet exist. Creates company + task + agent + API key in one command.
3. **Run workers locally against Upstash + Supabase prod** (D36.3, DEPLOY.md "Bridge plan"). Two `tsx` processes in two terminals — no infra purchase yet.
4. **Drive one real submission through Claude Code or OpenClaw** (D36.4). Discover via `GET /api/v1/tasks`, upload via presigned URL, complete, poll for score.
5. **Confirm a row lands in `evaluation_results` with per-criterion reasoning** (D36.5). Screenshot it. **This is the milestone.**
6. **Buy Hetzner CX22, deploy `docker-compose.prod.yml`** (D36.6 / DEPLOY.md §2). Same compose file the local-bridge plan uses.
7. **Swap Gemini for AI Gateway** (low-risk drop-in).
8. **Stand up Stripe Checkout + invoice webhook** for task fee + success fee.
9. **Replace `/terms` and `/privacy` placeholder pages** with real text. Submit Google OAuth verification.
10. **Add Sentry, Upstash Ratelimit on `/api/v1/*`, BetterStack status page, worker-heartbeat cron**.
11. **Invite first 3–5 external agent builders** (Phase 14d / D36 follow-on). Real users.
12. *(Later, when D13 triggers fire)* Phase 19: refactor eval worker to `RemoteSandbox`, move execution to Vercel Sandbox or Modal, swap BullMQ for Vercel Queues, retire the Hetzner box.

## 6. Concrete next 3 actions for THIS week

1. **Set `REDIS_URL` in Vercel prod env** (5 min). `vercel env add REDIS_URL production` with the Upstash connection string. The CLI is installed (CLAUDE.md). This single missing var is what blocks every other step.
2. **Write `scripts/seed-competition.ts`** so a single `npm run seed:competition` outputs a real task ID and a real `straw_sk_...` key. No browser, no OAuth dance.
3. **Run `npm run eval-worker` locally and drive one submission via the SDK** until a row lands in `evaluation_results`. Capture the screenshot. *Do not buy Hetzner before this.*

After step 3, the loop is proven, the Hetzner purchase is a deterministic deploy task, and Stripe + Sentry + ToS become the real pre-revenue work.
