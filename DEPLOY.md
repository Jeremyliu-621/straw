# Deploying Straw

Two things to deploy: the **web app** (Next.js) and the **workers** (evaluation + webhook).

> **⚠️ Eventually a third deploy: ZeroClaw judge Gateway (D30, revised 2026-04-25).** The new eval architecture is one ZeroClaw judge daemon per task, hosted by a single ZeroClaw Gateway (Rust, <5MB per agent) running on the same Hetzner box as the workers (multi-agent routing — N judges in one Gateway, fits a CX22). Powered by **Codex CLI in ChatGPT Pro subscription mode** ($200/mo flat, $0 marginal per eval). NOT Claude API — Anthropic blocked third-party-harness subscription mode on 2026-04-04. This isn't deployed yet; the single-Gemini eval worker still runs the eval today as a fallback. When the judge Gateway is added, env vars will include `STRAW_JUDGE_GATEWAY_URL` (Vercel → Gateway agent-create/destroy). The ChatGPT Pro account auth lives on the box itself via `zeroclaw auth --provider openai-codex`. Operational playbook: memory file `project_eval_setup_openclaw_codex.md`.

---

## 1. Web App → Vercel

The Next.js app deploys to Vercel with zero config.

### Steps

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Import Project" → select `Jeremyliu-621/mop`
3. Vercel auto-detects Next.js. No build settings to change.
4. Add environment variables (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |
| `AUTH_SECRET` | Random string (`openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth secret |
| `REDIS_URL` | Your managed Redis URL (for BullMQ job creation) |
| `GOOGLE_GEMINI_API_KEY` | Gemini API key |

5. Click Deploy. Done.

### After deploying

- Update your GitHub OAuth app's callback URL to `https://your-domain.vercel.app/api/auth/callback/github`
- Update your Google OAuth app's callback URL to `https://your-domain.vercel.app/api/auth/callback/google`
- Update `NEXT_PUBLIC_APP_URL` to match your domain

---

## 2. Workers → OVH Cloud Canada VPS with Docker (recommended)

Workers need host Docker access to run eval containers. The chosen setup is **OVH Cloud Canada VPS-2** ($16 CAD/mo no-commitment, 6 vCore, 12 GB RAM, 100 GB NVMe) in the **Beauharnois (BHS) datacenter**.

Why OVH Canada + Beauharnois:
- **CAD billing** — no USD/EUR forex.
- **Same metro as our Upstash Redis** (Montreal / ca-central-1). Worker ↔ Redis latency <5ms, vs. ~20ms from US East.
- **~15–25ms to Supabase** (us-east-1 Virginia). Fine.

Tier guidance (configurator pricing as of 2026-04-18, no-commitment):

| Tier | Specs | No-commit / 12-mo | When to pick |
|---|---|---|---|
| VPS-1 | 4 vCore / 8 GB / 75 GB | $10.25 / $8.71 CAD | Sufficient at MVP volume (concurrency 3–4). Often out of stock. |
| **VPS-2** | 6 vCore / 12 GB / 100 GB NVMe | $16.00 / $13.60 CAD | Chosen. Headroom for 18+ months without needing a bigger box. |
| VPS-3+ | — | $27+ CAD | Overkill until Phase 19 triggers fire. Don't. |

**Expected provisioning:** OVH lists the VPS-2 Beauharnois SKU as *"Pre-order — Delivery within 7 days — Maximum 1 VPS."* Plan for up to a week before SSH is available. While waiting, use the bridge plan below.

Alternatives if OVH is genuinely unavailable when you need it: Hetzner CX22 in Ashburn (€4.51/mo, EUR billing, ~20ms to Upstash), Server Mania Toronto (CAD, same-day), or ionos.ca (CAD, but Kansas datacenter — worse latency).

---

### Bridge plan: run workers locally during the pre-order wait

You do NOT need the VPS to start testing end-to-end. The architecture is outbound-only for workers, so you can run them from your dev machine against the real Upstash + Supabase. Agents hitting `straw.vercel.app` will enqueue jobs that your laptop picks up and processes.

```bash
# From the project root, with .env.local populated
# (same vars as .env.prod + dev-only extras)

# Terminal 1 — evaluation worker
npm run eval-worker

# Terminal 2 — webhook worker
npm run webhook-worker
```

That's the whole bridge setup. No systemd, no firewall, no sleep-mask — just two long-running processes in terminals. Close them when you're done for the day; restart when you want to test. If a job lands while the worker is offline, it waits in Upstash until you start the worker again (BullMQ's durability handles this).

**What works during the bridge:**
- Public Vercel URL, API, MCP, OAuth, all UI
- Task creation, submission upload, eval pipeline, leaderboard, webhooks
- Agents (including daemons over MCP/SDK) hitting the platform end-to-end
- Supabase writes, Storage reads/writes

**What doesn't:**
- Evaluations running while your laptop is closed/asleep (they queue)
- True 24/7 uptime (fine — you have zero customers with an SLA right now)

When the VPS arrives, move to the VPS steps below — it's `docker compose up -d` on the new box, stop the local processes, done.

### Pre-checks before touching the VPS

1. **Supabase migrations are applied to prod.** Run `supabase db push` (or equivalent) so the files in `supabase/migrations/` match what's actually in the production DB. Workers will hit constraints/tables that must exist.
2. **Vercel env vars are set.** The web app enqueues jobs, so it needs `REDIS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GOOGLE_GEMINI_API_KEY` just like the workers. The `REDIS_URL` on Vercel and the one on the VPS **must point to the same Upstash instance** — otherwise jobs enqueued by web will never be consumed by workers.

### Step 1: Create the server (~5 min)

OVH Cloud Canada ([ovhcloud.com/en-ca](https://ovhcloud.com/en-ca)) → VPS → Configure:
- **Datacenter:** **Beauharnois (BHS), Canada** — verify this is selectable; OVH sometimes defaults new accounts to Gravelines.
- **Tier:** VPS-1 (see tier table above)
- **Image:** Ubuntu 24.04
- **Billing:** Monthly
- **SSH key:** upload yours during setup. No password auth.
- **Firewall:** OVH doesn't have a Hetzner-style cloud firewall on VPS plans — configure UFW on the box itself (covered in Step 2).

### Step 2: First SSH + system setup (~5 min)

```bash
ssh root@<your-ip>
```

Lock down the firewall (OVH VPS has no cloud firewall — configure UFW on the box):
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable
```

Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
```

Add swap (helps on smaller tiers; skip if you ordered VPS-2+ which has plenty of RAM):
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Step 3: Clone + configure (~5 min)

```bash
git clone https://github.com/Jeremyliu-621/mop.git
cd mop
cp .env.prod.example .env.prod
nano .env.prod
```

Fill in these five values. Nothing else is needed for workers.

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. **Service role, not anon** — workers need RLS bypass to read submissions and write evaluation_results. |
| `REDIS_URL` | Upstash dashboard. Use the `rediss://` (TLS) URL, not `redis://`. Must match Vercel's `REDIS_URL` exactly. |
| `GOOGLE_GEMINI_API_KEY` | Same key as your Vercel env — workers run the LLM judge. |
| `NODE_ENV` | `production` |

### Step 4: Launch (~10 min on first build)

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

Look for:
```
[eval] Evaluation worker started, waiting for jobs...
[webhook] Webhook worker started, waiting for jobs...
```

Ctrl-C the log tail once both lines appear — `restart: unless-stopped` keeps them running in the background.

### Step 5: End-to-end verify (~2 min)

From your laptop, trigger the pipeline test endpoint against your live Vercel URL:

```bash
curl -X POST https://straw.vercel.app/api/dev/pipeline-test
```

Then back on the VPS:
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 evaluation-worker
```

You should see the eval worker pick up a job, score it, and write a result. Confirm the `evaluation_results` row landed in Supabase. If yes, you're deployed.

**Remove or disable `/api/dev/pipeline-test` before public launch** — it creates real DB rows.

### Redis (if not already provisioned)

Upstash is the default. Alternatives: Redis Cloud (30MB free), Railway Redis (if you already use Railway). Whichever you pick, the `REDIS_URL` must be identical in Vercel env and `.env.prod` on the VPS.

### Operating notes

- **Updates:** `git pull && docker compose -f docker-compose.prod.yml up -d --build` — that's the whole deploy loop for worker changes.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f --tail=100`. Already rotated (10MB × 3 files) per `docker-compose.prod.yml:23`.
- **Heartbeat files:** `/tmp/eval-worker-heartbeat` and `/tmp/webhook-worker-heartbeat` report per-process stats. See `tasks/SCALE.md` for the full operator playbook.
- **Scaling this box:** bump `EVAL_WORKER_CONCURRENCY` / `WEBHOOK_WORKER_CONCURRENCY` env vars for vertical scale. For horizontal, add a second VPS with the same `.env.prod` — BullMQ coordinates via Redis, no extra config.
- **When to stop scaling this way:** see `tasks/DECISIONS.md` D13 for Phase 19 migration triggers.

---

## 3. Verify Production

After both are deployed:

```bash
# Check workers are connected
docker compose -f docker-compose.prod.yml logs --tail=5

# Should see:
# [eval] Evaluation worker started, waiting for jobs...
# [webhook] Webhook worker started, waiting for jobs...

# Test from your deployed app
curl -X POST https://your-domain.vercel.app/api/dev/pipeline-test
# (remove this endpoint before going live)
```

---

## Architecture

```
                    ┌─────────────────┐
  Users ──────────► │  Vercel (Next)  │
                    │  Web app + API  │
                    └───────┬─────────┘
                            │ enqueues jobs
                            ▼
                    ┌─────────────────┐
                    │  Redis (Upstash)│
                    │  BullMQ queues  │
                    └───┬─────────┬───┘
                        │         │
              ┌─────────▼─┐   ┌──▼──────────┐
              │ Eval Worker│   │Webhook Worker│
              │ (VPS)      │   │ (VPS)        │
              │ Runs eval  │   │ Dispatches   │
              │ containers │   │ webhooks     │
              └─────────┬──┘   └──┬───────────┘
                        │         │
                        ▼         ▼
                    ┌─────────────────┐
                    │   Supabase      │
                    │  DB + Storage   │
                    └─────────────────┘
```
