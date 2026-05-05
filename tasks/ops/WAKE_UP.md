# Session Briefing — 2026-04-12

> **⚠️ Note for future sessions:** This briefing is dated 2026-04-12. The eval architecture has since been redirected (D30 in `DECISIONS.md`, decided + revised 2026-04-25): one **ZeroClaw** (Rust, <5MB/agent) judge daemon per task, powered by **Codex CLI in ChatGPT Pro subscription mode** (~$205/mo flat, $0 marginal per eval). NOT OpenClaw (200x heavier). NOT Claude API (Anthropic blocked third-party-harness subscription on 2026-04-04). The deploy step below still installs the single-Gemini worker as the ultimate fallback path. When you stand up the judge Gateway, add `STRAW_JUDGE_GATEWAY_URL` to `.env.prod` (the Codex auth lives on the box via `zeroclaw auth --provider openai-codex`). See memory file `project_eval_setup_openclaw_codex.md` for the full setup playbook.

## What's Done

### Phase 13: Eval Container Model ✅
Companies ship Docker eval containers. Platform runs them against agent output, reads score.json. Three modes: LLM / Container / Hybrid.

### Agent Resubmission ✅
Up to 15 attempts per task by default (poster-configurable, hard cap 25). Best score counts. Leaderboard deduplicates.

### Docs ✅
- /docs page rewritten for agent readability (Python + Node.js examples, all fields documented)
- GET /api/docs — JSON API spec for programmatic access

### Deployment ✅ (partial)
- **Vercel**: live, auto-deploys from master, all env vars set
- **Worker Dockerfiles + docker-compose.prod.yml**: ready
- **Workers NOT deployed yet** — need Hetzner VPS + Upstash Redis

### Other
- Rate limiting on submissions, API keys, messages
- Task detail page redesigned (two-column layout)
- Leaderboard fixes (Supabase join format, dedup, adaptive columns)
- Local Docker image pull fix
- API keys migration (020) applied
- 317 tests, 0 TS errors, clean production build

---

## What You Need To Do Next

### 1. Deploy workers (30 min)

```bash
# a) Sign up for Upstash (upstash.com) — get a Redis URL (free tier)

# b) Create Hetzner VPS: hetzner.com → CX22 ($4.50/mo) → Ubuntu 24.04

# c) SSH into VPS and run:
curl -fsSL https://get.docker.com | sh
git clone https://github.com/Jeremyliu-621/straw.git
cd straw
cp .env.prod.example .env.prod
nano .env.prod  # fill in: SUPABASE_URL, SUPABASE_KEY, REDIS_URL, GEMINI_KEY
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

### 2. Update OAuth callbacks

Change GitHub + Google OAuth app callback URLs to your production Vercel domain.

### 3. Create test-suites bucket

Supabase dashboard → Storage → New bucket → `test-suites`, private.

### 4. Test production E2E

Sign in on your Vercel URL → create a task → submit an agent → verify workers pick it up.

---

## Full guide: DEPLOY.md
