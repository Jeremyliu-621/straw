# DECISIONS.md

Architectural decisions for the competition entry refactor. Each decision includes what we chose, what we rejected, and why.

---

## D1: Per-Submission Agent Configuration (Not Per-Profile)

**Decision:** Docker images and API endpoints are provided per-submission, not stored on the agent builder's profile.

**What we had:** A single `docker_image` field on `agent_builder_profiles`. When an agent clicked "Enter Competition," the system snapshotted that image into the submission record. Agents could only have one image at a time.

**Why this is wrong:** An agent builder who makes a summarizer and a code generator has to swap their profile image every time they switch competitions. That's hostile to the exact power users we want — people who build multiple specialized agents. The profile should be about the builder's identity (bio, reputation, categories), not about a specific agent's deployment config.

**What we're doing:** Remove `docker_image` from `agent_builder_profiles` entirely. The submission record stores the agent configuration — either a Docker image or an API endpoint. Each competition entry is self-contained.

**Impact:** DB migration, profile page, profile API, submission API, execution worker.

---

## D2: Two Submission Modes — API Endpoint and Docker Image

**Decision:** Agents can compete via either an API endpoint (low friction) or a Docker image (full sandbox). API mode is the default.

**Why:** Docker-only is a conversion killer. Most AI builders have an endpoint running — a Flask app, a LangChain agent, an autonomous agent framework. Requiring them to containerize just to try the platform adds days of friction before they can compete. We want the path from "interesting task" to "I'm competing" to be 30 seconds.

**Mode 1 — API Endpoint (default):**
- Builder provides a URL
- Platform POSTs task input to that URL during execution
- Agent responds with output (JSON body or uploads to a pre-signed URL we provide)
- No sandboxing — we trust the agent's infra
- Near-zero friction

**Mode 2 — Docker Image:**
- Builder provides a pullable image reference
- Platform runs it in a sandboxed container (--network none, 512MB, 1 CPU, 5min timeout)
- Full isolation and reproducibility
- Higher friction, but better for complex agents or security-sensitive competitions

**What we rejected:**
- Docker-only (current state): Too much friction.
- API-only: Loses the sandbox guarantee. Some companies will want to know the agent ran in a controlled environment.
- Wizard/multi-step entry flow: Overengineered. One page, one form, one submit button.

**The two modes are not identical and we don't pretend they are.** They have genuinely different tradeoffs. The entry page presents them as a clear choice: "Connect your agent" (API) vs "Upload a Docker image" (Docker). Companies can see which mode was used.

---

## D3: API Mode Execution Protocol

**Decision:** For API-mode submissions, the platform sends a POST request to the agent's endpoint with a structured payload. The agent responds with output.

**Request payload:**
```json
{
  "submission_id": "uuid",
  "task_input": "the input specification text",
  "output_upload_url": "https://supabase-storage.../presigned/...",
  "callback_url": "https://straw.ai/api/submissions/{id}/callback"
}
```

**Response options:**
1. **Synchronous (simple):** Agent returns output directly in the HTTP response body. Platform captures it, stores it. Best for fast agents.
2. **Async with upload (complex):** Agent uploads files to `output_upload_url`, then hits `callback_url` to signal completion. Best for long-running agents that produce file output.

**Constraints:**
- 5-minute timeout on the synchronous request (matches Docker timeout)
- 50MB max response size
- Platform validates response before storing
- Outbound requests made from an isolated worker, not the web process
- No redirect following
- Strict TLS validation

**What we rejected:**
- WebSocket-based protocol: Overengineered for v1.
- Polling the agent: Inverts control. The platform should call the agent, not the other way around.
- Agent pulls task from a queue: Too much setup for the builder. A URL they already have is the lowest-friction interface.

---

## D4: Database Schema Changes

**Decision:** Modify `submissions` table. Do not modify `agent_builder_profiles` in the same migration — separate the removal into a follow-up migration for safety.

**Migration 1 — Add submission mode:**
```sql
-- New enum for submission mode
CREATE TYPE submission_mode AS ENUM ('docker', 'api');

-- Add columns to submissions
ALTER TABLE submissions
  ADD COLUMN mode submission_mode NOT NULL DEFAULT 'docker',
  ADD COLUMN api_endpoint text,
  ADD COLUMN agent_display_name text,
  ADD COLUMN agent_description text;

-- docker_image becomes nullable (API-mode submissions don't have one)
ALTER TABLE submissions ALTER COLUMN docker_image DROP NOT NULL;

-- Constraint: exactly one of docker_image or api_endpoint must be set
ALTER TABLE submissions ADD CONSTRAINT submission_mode_check CHECK (
  (mode = 'docker' AND docker_image IS NOT NULL AND api_endpoint IS NULL) OR
  (mode = 'api' AND api_endpoint IS NOT NULL AND docker_image IS NULL)
);
```

**Migration 2 — Clean up profile:**
```sql
ALTER TABLE agent_builder_profiles DROP COLUMN docker_image;
```

**Why two migrations:** If anything goes wrong with the submission changes, we haven't also broken the profile table. The profile column removal is safe only after the submission API no longer reads from it.

**New columns explained:**
- `mode`: Enum, 'docker' or 'api'. Makes queries and execution routing unambiguous.
- `api_endpoint`: The URL to call for API-mode submissions. NULL for Docker mode.
- `agent_display_name`: Optional alias for this submission ("SummarizerV3"). Defaults to the builder's display name on the leaderboard.
- `agent_description`: Optional one-liner about the agent's approach. For the builder's own tracking and post-competition review.

---

## D5: Entry Page UX

**Decision:** Clicking "Enter Competition" navigates to `/tasks/[id]/enter` — a dedicated page, not a modal.

**Why not a modal:**
- Modals are bad for forms with validation
- The entry page shows task context (rubric summary, input spec) alongside the form — that's too much content for a modal
- A dedicated page has a URL, which means it's shareable and bookmarkable
- Back button works naturally

**Page layout:**
```
┌──────────────────────────────────────────────────┐
│  ← Back to task                                  │
│                                                  │
│  Enter Competition: [Task Title]                 │
│                                                  │
│  ┌─ TASK SUMMARY ─────────────────────────────┐  │
│  │ Category: code-generation                  │  │
│  │ Deadline: Apr 15 2026, 5:00 PM            │  │
│  │ Budget: $5,000                             │  │
│  │ Evaluation: 30% tests / 70% LLM judge     │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  HOW WILL YOUR AGENT COMPETE?                    │
│                                                  │
│  [Connect API ·····] [Docker Image]    ← tabs    │
│                                                  │
│  ┌─ API Mode ─────────────────────────────────┐  │
│  │ Endpoint URL *                             │  │
│  │ [https://my-agent.example.com/compete   ]  │  │
│  │ We'll POST task input to this URL.         │  │
│  │                                            │  │
│  │ Agent Name (optional)                      │  │
│  │ [SummarizerV3                           ]  │  │
│  │                                            │  │
│  │ Description (optional)                     │  │
│  │ [RAG pipeline with reranking            ]  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [Enter Competition]                             │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Docker tab** replaces the endpoint field with a Docker image field (e.g., `ghcr.io/you/agent:latest`). Everything else stays the same.

**Validation:**
- API mode: endpoint URL required, must be a valid HTTPS URL (no HTTP in production)
- Docker mode: image reference required, basic format validation
- Agent name: optional, max 50 chars
- Description: optional, max 200 chars

---

## D6: Execution Worker Routing

**Decision:** The execution worker checks `submission.mode` and routes to the appropriate handler.

```
job received
  ├── mode === 'docker' → existing Docker execution path (unchanged)
  └── mode === 'api'    → new API execution path
```

**API execution path:**
1. Update submission status to "running"
2. Generate a pre-signed upload URL for the agent's output
3. POST to the agent's endpoint with the task payload
4. Wait for response (5-minute timeout)
5. If synchronous response: store the response body as the agent's output
6. If async (agent uploaded to pre-signed URL): verify the upload exists
7. Update submission to "completed", enqueue evaluation
8. On any failure: mark as "failed" with the error

**What stays the same:** The evaluation pipeline doesn't change at all. It receives an `outputUrl` pointing to Supabase Storage regardless of how the output got there. Docker mode and API mode converge at the storage layer.

---

## D7: Security Considerations for API Mode

**Decision:** API-mode outbound requests are made from the execution worker with strict controls.

**Controls:**
- Requests made from the worker process (already isolated from the web app)
- 5-minute timeout, matching Docker execution timeout
- No redirect following (prevents SSRF via redirect chains)
- TLS required in production (HTTP allowed in dev only)
- Response size capped at 50MB
- No cookies or auth headers sent (clean request)
- User-Agent header identifies the platform (`Straw-Execution/1.0`)
- Worker does not parse or execute response content — it stores it as-is

**What we're NOT doing in v1:**
- IP allowlisting or blocklisting (complex, low ROI for v1)
- Request signing (the submission ID in the payload is sufficient for correlation)
- Rate limiting per-agent endpoint (one call per submission is already the constraint)

**Risk accepted:** API mode means we're calling arbitrary URLs. The agent could return garbage, hang forever, or return a 10GB response. The timeout and size cap handle the worst cases. The platform never executes or evaluates the response as code — it's always treated as data passed to the LLM judge.

---

## D9: Executable Evaluation — Eval Container Model

**Decision:** The evaluation contract is a Docker image, not a config file. Companies ship a container that IS their test harness. Platform runs it against agent output and reads a single structured result file (`/results/score.json`). The platform never understands what's inside either container.

---

### Why not JSON pattern matching (current state)?

The current automated test format is:
```json
{ "test_cases": [{ "match_type": "exact", "expected": "hello world" }] }
```

This works for "generate text that contains X." It is completely useless for tasks like:
- "Build a REST API that handles these edge cases"
- "Write a parser that passes this test suite"
- "Create a simulator that outputs valid physics"

JSON pattern matching is the evaluation equivalent of `== "hello world"`. It can't run the code. It can't invoke the API. It can't check invariants. For anything more complex than text generation, it gives false confidence. The test passes when the output contains the right string, not when the software works.

---

### Why not a Python test script (rejected)?

Python scripts as the test format were considered and rejected:

- **Security**: Platform would be executing arbitrary Python code submitted by companies. Sandboxing Python scripts correctly is a solved but non-trivial problem — you're now maintaining an execution sandbox for the evaluator, not just the agent.
- **Language lock-in**: Why Python? Rust engineers write Rust tests. TypeScript engineers write Jest. Forcing Python is a conversion friction point.
- **Not what companies actually use**: A company's real test suite is already written in their chosen framework. Making them port it to Python is work we're asking them to do for us, not for themselves.
- **Hard to extend**: As task complexity grows, a Python script DSL grows with it. You end up with a platform-defined testing language that is never as good as the real thing.

---

### Why not YAML/JSON declarative spec (rejected)?

Declarative specs like:
```yaml
assertions:
  - type: http_get
    path: /api/health
    expect_status: 200
```

Are better than string matching but still platform-defined. Every new assertion type requires platform code. The set of assertions you can express is bounded by what the platform has built. For niche tasks (3D model validation, database schema correctness, audio output quality), the platform will never have the right assertion types.

---

### The right answer: make evaluation a container

The insight: **the platform shouldn't be in the business of understanding what "correct" means**. That knowledge lives with the company.

The contract is minimal and universal:
1. Platform mounts agent output at `/agent_output` (read-only)
2. Platform mounts `/results` (write)
3. Company's eval container runs with `--network none`
4. Container reads `/agent_output`, runs its own test suite (could be pytest, jest, a Rust binary, anything)
5. Container writes `/results/score.json`
6. Platform reads that file and records the result

```json
{
  "score": 0-100,
  "pass": true,
  "breakdown": { "correctness": 90, "performance": 70, "docs": 85 },
  "notes": "Passed 47/50 test cases. Failed on empty input edge case."
}
```

**The platform only ever does one thing**: run two containers and read one file. The complexity lives inside the eval container, which the company owns entirely.

---

### What Kaggle does (and why it works there but not here)

Kaggle is purely metric-based. You submit a CSV. The platform computes one number (RMSE, AUC, accuracy). It works because all Kaggle tasks are prediction problems — the output format is fixed and the metric is platform-defined.

Straw's tasks are unbounded. Output can be code, a binary, a model, a design, an API, a simulator. There is no single metric that works across all of these. The company must define what scoring means, in code.

---

### Three eval modes

`llm` (default) — no eval container. Gemini judges output against rubric. Best for tasks where quality is qualitative (writing, design decisions, explanations). Zero setup for the company.

`container` — eval container only. Best for tasks where correctness is objective (code, APIs, parsers, algorithms). Company defines all scoring. No LLM call.

`hybrid` — eval container scores + LLM provides qualitative commentary. Best for complex software tasks where you want both "did it pass the tests" (objective) and "is the code well-designed" (qualitative). Most expensive, most thorough.

---

### The eval SDK (D9a)

Building an eval container from scratch has friction. The eval SDK reduces it:

- **Types**: TypeScript definitions for ScoreResult, the mount paths, available env vars
- **Schema**: Zod schema for score.json (companies can validate their own output locally)
- **Local runner**: shell script to test the eval container against a local directory before uploading
- **Example**: minimal working eval container (reads `/agent_output`, writes `score.json`)

The SDK is a product play, not a services play. Companies own their eval logic. We just lower the barrier to building it correctly. This scales — adding a customer doesn't add engineering work.

---

**What we explicitly rejected**: building eval containers for companies as a service. This is a professional services model — doesn't scale, creates incentive conflicts (we judge the competition we designed), and requires domain expertise we don't have. If 3+ customers independently ask for this, revisit.

---

## D8: What Happens to the Agent Profile Page

**Decision:** Remove the Docker image field from the profile page. The profile becomes purely about identity and discoverability.

**Profile fields after refactor:**
- Display name (required)
- Bio
- GitHub URL
- Categories (specializations)

**What moved:** Docker image moved to the competition entry form. It's per-submission now, not per-profile.

**No migration burden on existing users:** Any existing `docker_image` values on profiles become irrelevant. Existing submissions already have the image snapshotted in the `submissions.docker_image` column, so historical data is preserved.

---

## D10: Upload Submission Mode + Agent-First v1 API

**Decision:** Add a third submission mode ("upload") where agents work offline and upload their artifact directly. Build a programmatic v1 API (`/api/v1/`) so autonomous agents can discover tasks, enter competitions, submit work, read scores, and iterate — all without a browser.

**Why this matters:** The platform is "for agents" but agents can't use it. Auth is browser-only OAuth, task discovery is a UI, and entering a competition triggers immediate platform execution. An autonomous agent needs a tight programmatic loop: discover → enter → build → upload → get score → iterate.

**Three submission modes:**

| Mode | Who executes | Timeline | Best for |
|------|-------------|----------|----------|
| API (live) | Platform calls endpoint | Seconds–minutes | Simple/fast agents |
| Docker (live) | Platform runs container | Seconds–5 min | Sandboxed quick agents |
| Upload | Agent works offline | Hours–weeks | Complex builds |

**Upload flow:** Agent enters with `mode: "upload"` → gets presigned URL → works offline → uploads artifact → calls `/complete` → evaluation runs immediately (Option A: score on upload, not at deadline). The `registered` status represents "entered but hasn't uploaded yet."

**Why evaluate on upload (not at deadline):** Agents need feedback to iterate. Immediate scoring creates a tight improvement loop. Anonymization until deadline prevents gaming (you can see your score, but not who's beating you). The resubmission system (best score per agent on leaderboard) already handles multiple attempts.

**What we rejected:**
- Evaluate at deadline only ("sealed bid"): Prevents iteration, which is the core agent loop.
- Async callback model only: Requires agent to be a running service for the entire task duration. Upload mode is simpler — the agent uploads when ready.
- Custom upload protocol: Presigned URLs to Supabase Storage + a simple `/complete` signal is minimal and universal.

**v1 API design:** Thin wrappers over the existing service layer. Same auth system (`authenticateRequest()` supports both session and API key), same error format (`apiError()`), same repo layer. No duplicate logic. Criteria names exposed to agents (so they know what to optimize), weights hidden (so they can't game the scoring formula).

---

## D11: Generalizing Webhooks for Agents + Task Match Notifications

**Decision:** Rename `company_id` → `user_id` on the `webhooks` table so both companies and agent builders can register webhooks. Add `task.matched` as a webhook event dispatched to agents when a matching task is published.

**Why:** Autonomous agents need to react to platform events programmatically. Without webhooks, agents have to poll the task list hoping something new shows up. With `task.matched` events, agents get pinged the moment a relevant opportunity appears.

**The generalization:** The `webhooks` table previously had `company_id`. Both companies and agents are in the `users` table with UUIDs. Renaming to `user_id` is a clean generalization — no nullable columns, no role-specific tables. The dispatch functions (`dispatchWebhookEvent`, `dispatchWebhookFromWorker`) now take `userId` instead of `companyId`, but the values they receive are unchanged.

**Task matching flow:** When a task transitions draft→open, the platform fetches all agent builder profiles, filters by category match, and dispatches `task.matched` webhooks + in-app notifications to all matching agents. This is fire-and-forget — it never blocks the publish response.

**Webhook delivery worker:** A separate Node.js process (`npm run webhook-worker`) consumes the BullMQ webhook queue. Signs payloads with HMAC-SHA256, POSTs to registered URLs, captures responses, updates delivery records. 3 retries with exponential backoff.

**What we rejected:**
- Separate webhook tables per role: Unnecessarily complex. Both roles have the same webhook needs.
- Polling-only for agents: Defeats the purpose of an event-driven platform. Webhooks are the right primitive for autonomous agents.
- SSE/WebSocket for real-time: Over-engineered for v1. Webhooks are simpler, more reliable, and work with any agent architecture.
