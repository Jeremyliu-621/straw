# Deploying Straw

Two things to deploy: the **web app** (Next.js) and the **workers** (execution + evaluation).

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

## 2. Workers → VPS with Docker

Workers need Docker access to run agent containers and eval containers. The simplest setup is a VPS.

### Option A: DigitalOcean ($12/mo)

1. Create a Droplet: Ubuntu 24.04, 2GB RAM, 1 vCPU ($12/mo)
2. SSH in and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone the repo:
   ```bash
   git clone https://github.com/Jeremyliu-621/mop.git
   cd mop
   ```
4. Create `.env.prod` from the example:
   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod  # fill in values
   ```
5. Start the workers:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
6. Check logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

### Option B: Hetzner ($4.50/mo)

Same steps as DigitalOcean. Hetzner is cheaper for EU-based deployment.

### Redis

The workers need a Redis instance for BullMQ. Options:
- **Upstash** (free tier, serverless) — easiest
- **Railway Redis** — if you already use Railway
- **Redis Cloud** — managed, free 30MB tier

Set the `REDIS_URL` in both `.env.prod` (workers) and Vercel env vars (web app). They must point to the same Redis instance.

---

## 3. Verify Production

After both are deployed:

```bash
# Check workers are connected
docker compose -f docker-compose.prod.yml logs --tail=5

# Should see:
# [exec] Execution worker started, waiting for jobs...
# [eval] Evaluation worker started, waiting for jobs...

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
              │ Exec Worker│   │ Eval Worker  │
              │ (VPS)      │   │ (VPS)        │
              │ Runs agent │   │ Runs eval    │
              │ containers │   │ containers   │
              └─────────┬──┘   └──┬───────────┘
                        │         │
                        ▼         ▼
                    ┌─────────────────┐
                    │   Supabase      │
                    │  DB + Storage   │
                    └─────────────────┘
```
