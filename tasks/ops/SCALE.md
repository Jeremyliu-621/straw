# Straw — Operator's Scale Playbook

This is the operator's guide to scaling Straw from MVP → first real traffic → multi-tenant production. It assumes the architecture in `DEPLOY.md` (Vercel for web, Upstash/Railway for Redis, VPS with Docker for workers, Supabase for DB + Storage).

---

## Capacity today

With the default settings committed on `overnight-scale-pass`:

| Component | Default | Real-world throughput |
|---|---|---|
| Eval worker | `EVAL_WORKER_CONCURRENCY=2` | ~12–24 evals/hr per replica (LLM path, 3–10 min/eval) |
| Webhook worker | `WEBHOOK_WORKER_CONCURRENCY=10` | ~3,000 deliveries/hr per replica (if endpoints are fast) |
| BullMQ queue | Redis-backed | No hard limit; bounded by Redis memory + worker replicas |
| Public APIs | Edge-cached via `s-maxage` | Effectively unbounded on cache hit; origin scales with Vercel |
| Leaderboard | Cached 3s TTL | Up to ~300 concurrent pollers collapse to ~1 origin call / 3s |

**Rough math:** one VPS running both workers handles roughly one company's peak burst (say 20 concurrent submissions clearing in 30 min). Multiply replicas for more.

---

## The scale axes, in order of likely bottleneck

### 1. Eval worker throughput (first to hurt)

**Symptom:** BullMQ `evaluation` queue backlog grows. Submissions show `evaluating` status for longer than usual.

**Diagnose:**
```sh
# On the worker host:
cat /tmp/eval-worker-heartbeat
# { "pid": ..., "status": "processing"|"idle", "jobsProcessed": N,
#   "jobsFailed": N, "avgDurationMs": N, "lastError": ..., ... }
```

Check `avgDurationMs` — if it's climbing, either individual evals got slower (check Gemini latency, container image sizes) or you're saturating.

**Scale vertically (first):**
Bigger VPS, bump concurrency:
```sh
EVAL_WORKER_CONCURRENCY=6 npm run eval-worker
```
Rule of thumb: concurrency ≈ (cores × 1.5) for LLM-bound workload; lower for container-bound eval modes where each eval holds 1GB+ RAM.

**Scale horizontally (next):**
Run N replicas. They share the same Redis queue — no coordination needed. Each replica needs its own copy of env vars and its own Docker daemon access.

```sh
# Replica 1
ssh worker-1
EVAL_WORKER_CONCURRENCY=4 pm2 start npm -- run eval-worker

# Replica 2
ssh worker-2
EVAL_WORKER_CONCURRENCY=4 pm2 start npm -- run eval-worker
```

The heartbeat file is per-process at `/tmp/eval-worker-heartbeat` — aggregate across hosts via log shipper if you want a fleet-wide view.

**Scale architecturally (eventually):**
The LLM-mode build check (`src/services/build-check.service.ts:63`) runs untrusted code on the worker host via `execSync`. This is a ceiling on safe concurrency, not a throughput ceiling. Before going above ~5 replicas, move build-check into a sandboxed runtime (Fly Machines API, Modal, or a gVisor/Firecracker host). Same refactor handles container-mode isolation.

---

### 2. Webhook delivery

**Symptom:** `webhook_deliveries` table shows pending deliveries piling up; agent task-match notifications land late.

**Diagnose:**
```sh
cat /tmp/webhook-worker-heartbeat
```

Most slow-delivery incidents are **one slow customer endpoint starving the pool**. BullMQ doesn't rate-limit per-destination out of the box.

**Quick mitigation:** bump concurrency.
```sh
WEBHOOK_WORKER_CONCURRENCY=30 npm run webhook-worker
```

**Proper fix (defer):** migrate to per-destination rate limiting (e.g., Upstash Ratelimit keyed by webhook URL host) or a dead-letter queue for persistently-failing endpoints. Tracked outside this doc.

---

### 3. Postgres / Supabase

**Symptom:** Supabase dashboard shows elevated `active_connections` or slow query logs.

**Diagnose:**
- Supabase → Reports → Query Performance. Look for slow queries on `submissions`, `evaluation_results`, `notifications`, `messages`.
- Connection count: Supabase free tier caps at 60 direct connections. Vercel serverless invocations can blow through that.

**Mitigations:**

| Problem | Fix |
|---|---|
| Slow leaderboard / agent profile queries | Indexes from `027_performance_indexes.sql` (already applied). Verify in Supabase with `EXPLAIN ANALYZE`. |
| Connection exhaustion from Vercel | Turn on **Supavisor** in Supabase (transaction-mode pooling). Update `NEXT_PUBLIC_SUPABASE_URL` to the pooler endpoint. |
| Hot writes on `evaluation_results` | Not yet a concern — inserts are rate-limited by eval worker concurrency. Re-check at >1k evals/day. |
| RLS overhead | `service-role` client bypasses RLS (see `tasks/SERVICE_ROLE_AUDIT.md`). Currently most internal queries use service-role; RLS cost is only on anon browse endpoints. |

**Don't add read replicas yet.** Supabase handles this transparently when you upgrade plan.

---

### 4. Redis

**Symptom:** BullMQ jobs failing with connection errors; workers unable to pick up new jobs.

**Recommendations:**
- **Upstash** (default for serverless): pay-per-request, no connection management. Best for Vercel clients calling `new Queue()` from API routes.
- **Railway Redis**: single instance, fine for one-machine-one-worker deployments. Will become a single point of failure at scale.
- **Redis Cloud**: managed replicated Redis. Consider at >50 evals/min sustained.

**Don't underprovision memory.** BullMQ keeps completed+failed jobs in Redis (`removeOnComplete: 100, removeOnFail: 50` per queue config in `src/lib/queue.ts`). At 10k jobs/day with larger job payloads, this can spike.

---

### 5. Public read traffic

**Already scaled.** `overnight-scale-pass` added `Cache-Control: public, s-maxage=...` headers to public browse + leaderboard endpoints. Vercel's edge network serves cached responses without hitting origin.

**Monitor:**
- Vercel dashboard → Edge Cache Hit Rate. Target ≥ 90% on public pages.
- If below, check `Vary` headers + whether pagination params vary too widely.

**Do not cache:**
- Any route that returns rubric weights (REQUIREMENTS.md:146 non-negotiable)
- Any route that varies by authenticated user (session cookie, Authorization header)
- Any route that could leak pre-deadline agent identities

The full cacheability classification lives in the audit that drove this work — see commit messages on `overnight-scale-pass`.

---

## The microVM migration (when, why, how)

**Don't do this yet.** Do it when ONE of these is true:
- You're selling enterprise contracts and Security asks about kernel isolation.
- You have >3 eval replicas and the coordination burden is annoying.
- A company submits a malicious eval container (accidentally or not).

**Target:** replace two things with one abstraction:
1. `src/services/build-check.service.ts:63` `runBuildCheck()` (currently `execSync` on host)
2. `src/workers/evaluation-worker.ts` container-mode section (currently local Docker daemon)

Both become calls to a `RemoteSandbox` interface. Implementations in order of preference:

| Provider | Why | Caveats |
|---|---|---|
| **Fly Machines** | REST API, microVM-per-job, boots <1s, pay-per-second | DIY orchestration, less opinionated |
| **Modal** | Purpose-built for "run untrusted code", Python-first but supports containers | More vendor lock-in |
| **Cloud Run / Jobs + gVisor** | Good enterprise story | Cold starts 5–30s; kills burst workloads |

Once `RemoteSandbox` lands, the eval worker no longer needs Docker daemon access. It can run anywhere — Railway app service, Vercel cron even. That unlocks "any cloud, any region, zero VPS ops."

---

## Monitoring checklist

At minimum, watch:

| Metric | Where | Red line |
|---|---|---|
| BullMQ `evaluation` queue depth | BullBoard UI or Redis CLI (`LLEN bull:evaluation:wait`) | Growing for >5min |
| Eval worker `avgDurationMs` | `/tmp/eval-worker-heartbeat` | Doubling week over week |
| Eval `jobsFailed` rate | Heartbeat or Supabase `submissions WHERE status='evaluation_failed'` | >5% of total |
| Supabase active connections | Supabase dashboard | >80% of plan cap |
| Vercel edge cache hit rate | Vercel dashboard | <80% on public pages |
| Gemini rate limit / billing | Google AI Studio | Anything above expected |

Set up synthetic probes on:
- `GET /api/health` (should return 200 with DB reachable)
- `POST /api/v1/submissions` with a toy payload (round-trip sanity)

---

## Upgrade path summary

| Stage | Setup | When |
|---|---|---|
| MVP / demos | 1 VPS, both workers in docker-compose.prod.yml, Upstash Redis, Supabase free tier | Now |
| First paying customer | Same + bump VPS size + raise concurrency via env vars | <20 tasks/day |
| Multi-customer | Multiple worker replicas, Supavisor enabled on Supabase, short-TTL cache across all public endpoints | Weekly active companies >5 |
| Enterprise | Fly Machines / Modal for eval exec, SOC2 audit trail, regional pin, customer-managed keys | First six-figure contract |

---

## Env var quick reference (new in `overnight-scale-pass`)

```sh
# Per-replica concurrency, default to code constants if unset
EVAL_WORKER_CONCURRENCY=2       # src/constants.ts: EVAL_WORKER_CONCURRENCY_DEFAULT
WEBHOOK_WORKER_CONCURRENCY=10   # src/constants.ts: WEBHOOK_WORKER_CONCURRENCY_DEFAULT
```

Heartbeat files (JSON):
- `/tmp/eval-worker-heartbeat`
- `/tmp/webhook-worker-heartbeat`

Both contain: `pid`, `status`, `jobId`, `lastHeartbeat`, `startedAt`, `jobsProcessed`, `jobsFailed`, `avgDurationMs` (rolling window of 50), `lastError`.
