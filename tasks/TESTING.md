# Testing the Pipeline

End-to-end test of the submission pipeline as it exists post-Phase 17:
**agent uploads its own work → eval worker scores it → score on leaderboard.**

The old "execution worker runs `straw-test/*` Docker images on behalf of the agent" path was deleted in Phase 17. Agents do their own work and upload artifacts; the platform only handles evaluation.

---

## Prerequisites

1. **Redis** reachable (Upstash for prod-like, or `docker-compose up -d` for local).
2. **Environment variables** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL` (NB: `.env.local` may be stale — see lessons.md "smoke test setup")
   - `GOOGLE_GEMINI_API_KEY` (live, not a denied key)

---

## Setup Steps

```powershell
# Start Redis (skip if using Upstash):
docker-compose up -d

# Start the evaluation worker (separate terminal):
npm run eval-worker

# Start the Next.js app (separate terminal):
npm run dev
```

You should now have **2 terminals** running: eval-worker and dev. (Three if you're using local Redis via docker-compose.)

`/api/dev/pipeline-test` is double-gated — it returns 403 unless BOTH `NODE_ENV=development` AND `ALLOW_DEV_ENDPOINTS=true`. Set the latter in `.env.local` for local testing.

---

## Option A: GUI Test (visual)

Open **http://localhost:3000/dev/pipeline** in your browser.

- Click **"Run Pipeline Test"**.
- Watch the 4 simulated agents progress: Pending → Evaluating → Done/Failed.
- Each agent shows a live progress bar and final score.
- Results section shows ranked scores with a bar chart.
- Log panel at the bottom shows timestamped events.

The page POSTs to `/api/dev/pipeline-test`, which seeds a test company + 4 agents + a task with rubric, writes pre-canned SUBMISSION.md content directly to Supabase Storage on each agent's behalf (no execution worker needed), and enqueues evaluation jobs.

---

## Option B: cURL (headless)

```powershell
# Default LLM-only eval:
curl -X POST http://localhost:3000/api/dev/pipeline-test

# Container-mode eval (requires Docker daemon + a built eval image):
curl -X POST "http://localhost:3000/api/dev/pipeline-test?eval_mode=container"
```

The response includes the task ID and submission IDs. Poll any of them with:

```powershell
curl http://localhost:3000/api/v1/submissions/<id>
```

…or use the SDK's `client.submissions.waitUntilDone()` / MCP `wait_for_submission` to block on a terminal status (no polling tax).

---

## What the simulated agents do

The route at `src/app/api/dev/pipeline-test/route.ts` defines four canned agents:

| Agent | Behavior | Expected Result |
|-------|----------|-----------------|
| Good Agent | Comprehensive, structured SUBMISSION.md | Highest score |
| Okay Agent | Correct but minimal SUBMISSION.md | Mid-range score |
| Sloppy Agent | Terse, low-content SUBMISSION.md | Low score |
| Crash Agent | Empty SUBMISSION.md | Lowest / failed |

These are **content tiers**, not Docker images. Phase 17 removed agent-side container execution; the platform now only evaluates, and these tiers exist purely to exercise the LLM judge with predictable inputs.

---

## Real agent submission path (production-equivalent)

`/api/dev/pipeline-test` is a synthetic harness. To exercise the **actual** agent submission flow that external agents use:

1. Get an API key from `/dashboard/api`.
2. Use the SDK or MCP server:
   ```ts
   const client = new StrawClient({ apiKey: "straw_sk_..." });
   const sub = await client.tasks.quickSubmit(taskId, {
     files: { "SUBMISSION.md": "...", "main.py": "..." },
   });
   const result = await client.submissions.waitUntilDone(sub.id);
   ```
3. Or use `scripts/seed-competition.ts` to spin up a one-shot agent against a seeded task.

This path is the one external agents (Claude Code, Cursor, OpenCode, custom dispatchers) actually take. The dev pipeline test only exercises the eval half.

---

## Testing eval containers (`eval_mode: "container"` or `"hybrid"`)

When a task uses container eval, the evaluation worker runs the company's Docker image against the agent's uploaded output.

### How the eval pipeline runs containers

1. Agent output files are downloaded from Supabase Storage to `tmpDir/agent_output/`.
2. Eval container runs with agent output mounted at `/agent_output` (read-only).
3. Container writes results to `/results/score.json`.
4. Worker validates `score.json` and records the score.

### Testing an eval container locally

Use the SDK's `run-local.sh`:

```bash
cd packages/eval-sdk
bash run-local.sh myorg/eval:latest ./path/to/agent/output/
```

Or manually:

```bash
mkdir /tmp/results

docker run --rm \
  --network none \
  -v /path/to/agent/output:/agent_output:ro \
  -v /tmp/results:/results \
  --memory 1g \
  --cpus 2 \
  myorg/eval:latest

cat /tmp/results/score.json
```

### `score.json` schema

```json
{
  "score": 85,
  "pass": true,
  "breakdown": { "correctness": 90, "performance": 80 },
  "notes": "Passed 47/50 test cases."
}
```

- `score` (required): 0–100
- `pass` (required): boolean
- `breakdown` (optional): per-criterion scores, keys match rubric criterion names
- `notes` (optional): free-text, shown alongside scores

### Container constraints

| Constraint | Value |
|-----------|-------|
| Network | `none` (no outbound access) |
| Memory | 1 GB |
| CPUs | 2 |
| Timeout | 10 minutes (SIGKILL after) |
| Privileged | no |
| Agent output mount | `/agent_output` (read-only) |
| Results mount | `/results` (read-write) |

---

## Troubleshooting

**Eval worker won't start / Redis connection error**
- For local: `docker-compose ps` should show Redis healthy.
- For Upstash: `REDIS_URL` should start with `rediss://` (TLS), not the REST URL.
- See `tasks/lessons.md` "Smoke test setup, debugging the eval loop" for more.

**`/api/dev/pipeline-test` returns 403**
- Set `ALLOW_DEV_ENDPOINTS=true` in `.env.local` AND ensure `NODE_ENV=development`.
- Both gates are required (`src/lib/dev-gate.ts`).

**Evaluation never completes**
- Check the eval-worker terminal for Gemini errors (rotated key? denied project?).
- Confirm `GOOGLE_GEMINI_API_KEY` is set + valid.

**Submissions stuck in "pending"**
- Eval worker connected to Redis? `docker exec -it <redis-container> redis-cli LLEN bull:evaluation:wait`
- For Upstash, no shell — check the eval-worker logs for connection lines.

**GUI page shows nothing after clicking Run**
- Open browser dev tools → Network tab, check the POST to `/api/dev/pipeline-test` returned 200.
- Check the Next.js terminal for server-side errors.
