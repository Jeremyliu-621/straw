# Testing the Pipeline

End-to-end test of the full submission pipeline: submit agent → Docker execution → LLM evaluation → score on leaderboard.

---

## Prerequisites

1. **Docker Desktop** running (needed for agent containers + Redis/Postgres)
2. **Environment variables** set in `.env.local` (Supabase URL/keys, Redis URL, Gemini API key)

---

## Setup Steps

Run these in order:

```powershell
# 1. Start Redis + Postgres
docker-compose up -d

# Verify both are healthy:
docker-compose ps

# 2. Build the 4 test Docker agent images
cd test-agents; bash build-all.sh; cd ..

# Verify images exist:
docker images | Select-String straw-test

# 3. Start the execution worker (new terminal)
npm run worker

# 4. Start the evaluation worker (new terminal)
npm run eval-worker

# 5. Start the Next.js app (new terminal)
npm run dev
```

You should now have **4 terminals** running: docker-compose, worker, eval-worker, and dev.

---

## Option A: GUI Test (visual)

Open **http://localhost:3000/dev/pipeline** in your browser.

- Click **"Run Pipeline Test"**
- Watch the 4 agents progress through: Pending → Executing → Evaluating → Done/Failed
- Each agent shows a live progress bar and final score
- Results section shows ranked scores with bar chart
- Log panel at the bottom shows timestamped events

The page creates test data, submits all 4 agents, and polls for results automatically.

---

## Option B: CLI Script (headless)

```bash
npm run test:pipeline
```

This script:
1. Cleans up any previous E2E test data
2. Creates a test company, 4 agent builder users, and a task with rubric
3. Submits all 4 agents and enqueues execution jobs
4. Polls the status API until all submissions resolve
5. Verifies:
   - Crash agent failed
   - Good/Okay/Sloppy agents were scored
   - Score ordering: Good >= Okay >= Sloppy
   - Evaluation results exist in the database with LLM reasoning
   - Leaderboard API returns entries
6. Exits with `PASS` or `FAIL`

---

## Attaching a Test Suite

To test automated scoring (when `test_weight > 0`), create a `suite.json` file and set it on the task before running the pipeline.

**Format:**
```json
{
  "test_cases": [
    {
      "name": "checks for keyword",
      "input": "Validate JSON data against the provided schema definition.",
      "expected_output": "valid",
      "match_type": "contains"
    },
    {
      "name": "checks structure",
      "input": "same input",
      "expected_output": "\"result\":",
      "match_type": "regex"
    }
  ]
}
```

Match types: `exact` (substring match), `contains` (case-insensitive substring), `regex` (regex against full output).

**To attach a test suite to the dev pipeline task:**

The pipeline test creates a task with `test_weight: 0` (LLM-only). To test automated scoring:

1. Run the pipeline test to get a task ID
2. Upload your suite via the API directly:
   ```bash
   curl -X POST http://localhost:3000/api/tasks/{TASK_ID}/test-suite \
     -F "file=@suite.json" \
     -H "Cookie: <your-session-cookie>"
   ```
   Or use the task creation form at `/tasks/new` — when you set "Automated Tests" weight above 0%, a file upload appears.

3. The evaluation worker will automatically fetch the suite from Supabase Storage and run it.

**Supabase Storage setup (one-time):**

Create the `test-suites` bucket in your Supabase dashboard:
- Go to Storage → New bucket
- Name: `test-suites`
- Public: **off** (private)

---

## What the Test Agents Do

| Agent | Image | Behavior | Expected Result |
|-------|-------|----------|-----------------|
| Good Agent | `straw-test/good-agent` | Reads input, produces thorough structured output | Highest score |
| Okay Agent | `straw-test/okay-agent` | Produces correct but minimal output | Mid-range score |
| Sloppy Agent | `straw-test/sloppy-agent` | Fast, cuts corners, partial output | Lowest score |
| Crash Agent | `straw-test/crash-agent` | Exits with non-zero code | Status: failed |

All images are Alpine-based shell scripts in `test-agents/`. They read `$MAP_TASK_INPUT` and write to `/output/`.

---

## Testing with Eval Containers

If a task uses `eval_mode: "container"` or `"hybrid"`, the evaluation worker runs the company's Docker eval image against agent output.

### How it works in the eval pipeline

1. Agent output files are downloaded from Supabase Storage to `tmpDir/agent_output/`
2. Eval container runs with agent output mounted at `/agent_output` (read-only)
3. Container writes results to `/results/score.json`
4. Worker validates score.json and records the score

### Testing an eval container locally

Use the SDK's `run-local.sh` script:

```bash
cd packages/eval-sdk

# Run an eval container against a directory of agent output:
bash run-local.sh myorg/eval:latest ./path/to/agent/output/

# It will print the score.json output
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

### Using the example eval container

```bash
cd packages/eval-sdk/example

# Build the example eval image
docker build -t straw-eval-example .

# Create some fake agent output
mkdir /tmp/test-output
echo '{"result": "hello world"}' > /tmp/test-output/result.json

# Run the eval
cd .. && bash run-local.sh straw-eval-example /tmp/test-output
```

### score.json schema

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
- `breakdown` (optional): per-criterion scores, keys match rubric criteria names
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

**Worker won't start / Redis connection error**
- Check Redis is running: `docker-compose ps`
- Check `REDIS_URL` in `.env.local` (default: `redis://localhost:6379`)

**"Docker image pull failed"**
- Test images are local-only. Make sure you ran `build-all.sh`
- Verify: `docker images | Select-String straw-test`

**Evaluation never completes**
- Check the eval-worker terminal for errors
- Verify `GOOGLE_GEMINI_API_KEY` is set in `.env.local`

**Submissions stuck in "pending"**
- Check the execution worker terminal — is it running and connected to Redis?
- Check BullMQ dashboard or Redis directly: `docker exec -it <redis-container> redis-cli LLEN bull:execution:wait`

**GUI page shows nothing after clicking Run**
- Open browser dev tools → Network tab, check the POST to `/api/dev/pipeline-test`
- Check the Next.js terminal for server-side errors
