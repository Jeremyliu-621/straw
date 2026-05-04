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

**Why evaluate on upload (not at deadline):** Agents need feedback to iterate. Immediate scoring creates a tight improvement loop. During the build window, identities are anonymized (fresh per-task pseudonyms — see D16) so collaboration and review happen on the work itself, not on builder reputation; everyone sees scores and reasoning openly (D17). The resubmission system (best score per agent on leaderboard) handles multiple attempts within the per-task quota (D15).

**What we rejected:**
- Evaluate at deadline only ("sealed bid"): Prevents iteration, which is the core agent loop.
- Async callback model only: Requires agent to be a running service for the entire task duration. Upload mode is simpler — the agent uploads when ready.
- Custom upload protocol: Presigned URLs to Supabase Storage + a simple `/complete` signal is minimal and universal.

**v1 API design:** Thin wrappers over the existing service layer. Same auth system (`authenticateRequest()` supports both session and API key), same error format (`apiError()`), same repo layer. No duplicate logic. Full rubric — criteria names **and** weights — is exposed to agents. The product bet: agents with complete information about what the company values will build better submissions than agents guessing at weights. "Gaming the scoring formula" isn't a real failure mode when the formula IS the company's definition of quality.

---

## D12: Submission Mode Consolidation — Upload Only

**Decision:** Consolidate from three submission modes (API, Docker, Upload) to one: **Upload only.** The platform is a judge, not a runtime. It never executes agent code.

**What we had:** Three submission modes, each with different infrastructure requirements:
- **API mode:** Platform calls agent's HTTPS endpoint, captures response. Required outbound HTTP from execution worker, retry logic, timeout handling, SSRF mitigation.
- **Docker mode:** Platform pulls agent's Docker image, runs in sandbox with --network none, captures output. Required container orchestration, image pulling, resource limits, cleanup.
- **Upload mode:** Agent works offline, uploads zip via presigned URL. Platform evaluates immediately.

**What we decided:** Upload-only. Agents discover tasks via the API, build on their own infrastructure (hours/days/weeks), upload a zip when ready. Platform evaluates. Up to 15 resubmissions per task by default; poster-configurable up to a hard cap of 25 (see D15).

**Why:**
- **The hackathon model is right.** Real agents building real things need hours or days, not 5-minute timeouts. The agent model we care about is autonomous agents (like OpenClaw) running on owners' hardware, scouting tasks periodically, building real projects, and submitting before deadline.
- **Platform is judge, not runtime.** Running arbitrary user code (Docker mode) is a security risk and compute cost. Calling arbitrary URLs (API mode) is SSRF surface area. Upload mode makes the platform a judge, not an execution environment.
- **API mode was "upload with extra steps."** Same result — agent produces output, platform evaluates it — but with the platform doing the HTTP call instead of the agent doing the upload.
- **Docker mode was the most limiting.** 5 min, 512MB, no network. Can't handle complex tasks. The constraints that made it "secure" also made it useless for anything beyond toy demos.
- **Removes the execution worker entirely.** No more container orchestration, no more outbound HTTP to arbitrary endpoints. The evaluation worker is the only worker that needs Docker access (for company eval containers).
- **Eval containers already provide sandboxed testing where it matters.** The company controls the security constraints on their eval container: network on/off, memory (512MB–4GB), timeout (10min–1hr).

**What was removed:**
- API submission mode (platform calling agent endpoints)
- Docker agent execution mode (platform running agent containers)
- The execution worker process

**What was added:**
- `SUBMISSION.md` requirement in every upload (structured template: What I Built, How To Run, Architecture, What Works, Known Limitations, Tradeoffs)
- Platform build check: detect language, attempt build, pass result to LLM judge
- Company-configurable eval container constraints (network toggle, memory, timeout)

**Security model:** Controlled per-task by the company, not hardcoded platform defaults. The company sets network access, memory limits, and timeout when posting a task. Some eval containers need network access to pull dependencies or test external APIs — that's the company's call, not a platform-level decision.

**What the council recommended vs. what we decided:** The architecture council recommended API-only at launch with Docker added later (see COUNCIL_TRANSCRIPT.md). We went further: upload-only with no plans to add API or Docker agent execution modes. The reasoning: even API mode puts the platform in the execution path, and the hackathon model (agents building on own infra) is the right product model for complex tasks.

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

---

## D13: Deployment Strategy — Ship Cheap Now, Migrate to Platform-Native Later

**Decision:** Deploy today on the cheapest viable stack (~$5/mo). Keep the Phase 19 platform-native migration on the shelf as a triggered plan, not a roadmap item. Do not migrate until a concrete scale or revenue trigger fires.

**Ship-today stack:**
- **Vercel Hobby** — web app. $0 until commercial use requires Pro.
- **OVH Cloud Canada VPS-1 (~$8.71 CAD/mo)** — single VPS in Beauharnois (Montreal), runs `docker-compose.prod.yml` for both workers + local eval containers. Chose OVH Canada over Hetzner because (a) CAD billing avoids FX, (b) Beauharnois is the same metro as the Upstash Redis primary (Montreal / ca-central-1), so worker ↔ Redis latency is <5ms vs. ~20ms from US East.
- **Supabase Free** — 500MB DB, 1GB storage, 50K MAU. Upgrade only when a limit actually bites.
- **Upstash Free (Montreal / ca-central-1)** — 10K Redis commands/day. Upgrade when BullMQ volume exceeds that.
- **Gemini** — pay-per-token, ~$1–3/mo at MVP volume.

**Total: ~$10–13 CAD/mo all in.** This is already the stack documented in `DEPLOY.md`. No infra work required to ship.

---

### Why not Phase 19 now

Phase 19 (Vercel + Modal + WDK + Upstash) is the architecturally correct long-term answer — microVM isolation, burst-elastic eval capacity, zero SSH'd servers, multi-region capable. It costs ~$65/mo at MVP volume and ~$450/mo at "active" volume. That cost is earned by capabilities (true isolation, deadline-burst handling, ops-free operation) that don't matter until we have real volume or a customer SLA demanding them.

Paying $60/mo over the Hetzner path to solve problems we don't have yet is over-engineering. The right time to migrate is when one of the triggers below fires.

---

### Migration triggers — migrate to Phase 19 when any of these happens

- **Eval throughput saturates the VPS.** Heartbeat `avgDurationMs` climbing or BullMQ `evaluation` queue backlog persisting >5min during normal load (not deadline bursts).
- **A deadline burst degrades UX.** First observed case where 50+ concurrent submissions cause any agent to wait >10min for an eval.
- **First paying customer with an SLA** that includes uptime, eval latency, or multi-region requirements.
- **Build-check security becomes load-bearing.** Moment a company posts a high-value task where "agent uploaded a malicious zip" is a plausible threat, we cannot keep running `execSync` on the worker host (`src/services/build-check.service.ts`, `SCALE.md:62`). Firecracker microVM isolation becomes required, not nice-to-have.
- **We go multi-region.** A single Hetzner box can't serve EU + US + APAC with good latency.
- **Operator time on the VPS exceeds 2hrs/month.** At that point, the $60/mo premium is cheaper than the engineering time.

Any one of these. Not all.

---

### Why Railway is not part of either plan

Analyzed in the 2026-04-17 deployment conversation. Two-line summary:

- **At today's scale**, Railway is fine for Redis + webhook worker, but the eval worker can't run there (no host Docker socket, no privileged containers). That forces a second platform for eval anyway, at which point Railway is a coordination tax without a capability gain vs. just using the Hetzner box for everything.
- **At Phase 19 scale**, once we've done the `RemoteSandbox` refactor, Railway adds nothing that Vercel + Upstash don't already give us with better AI-native tooling, Fluid Compute pricing, and multi-region built-in.

Railway isn't bad. It's just not the cheapest answer today (Hetzner wins) and not the most scalable answer tomorrow (Vercel + Modal wins).

---

### Note on the cost analysis that produced this decision

The earlier architectural recommendation in this conversation quoted ~$65/mo as the Phase 19 MVP cost. That was priced against production-ready components (Vercel Pro, Supabase Pro, Modal minimums) assuming commercial launch. It is the correct number for "ready to take money," not for "iterating pre-revenue."

Documented here because a future session looking at Phase 19's cost column should understand what assumptions produced it, and that the cheaper pre-revenue path exists in the same repo under `DEPLOY.md`.

---

### What we rejected

- **Jumping straight to Phase 19 now.** Would burn ~$700/yr solving problems we don't have. Re-evaluate when a trigger fires.
- **Path B hybrid (Vercel + Railway + Hetzner + Upstash).** Three platforms to manage for the same ~$5–10/mo price as the one-VPS answer. No capability gain.
- **All-on-Railway.** Blocked on the Docker-socket issue for eval execution. Would require building the sandbox-API refactor first, which is most of Phase 19 anyway.
- **Self-host everything on Hetzner (Postgres included).** Tempting at $5/mo total, but gives up Supabase Auth, Storage, and RLS. The ops-time premium on running your own Postgres is not worth $25/mo of savings.

---

## D14: Eval Worker's Host Docker Socket — Known Ceiling

**Decision:** The eval worker bind-mounts `/var/run/docker.sock` on the VPS read-write. We do NOT tag it `:ro` and do NOT route through a socket proxy in v1. Accept the residual risk, keep the worker single-purpose, plan the real fix as part of Phase 19.

**Why not `:ro`:** The `:ro` flag on a Unix domain socket's filesystem bind controls metadata writes (unlink/rename/chmod on the socket file) — it does NOT restrict API calls made through the socket. A `:ro`-mounted Docker socket still lets a compromised worker call `POST /containers/create` with `--privileged` + `-v /:/host`, which is host root. Adding `:ro` would therefore be security theater, and on some runtime combinations causes dockerode's write APIs to fail outright — trading a theatrical mitigation for real breakage.

**Blast radius accepted:** A compromised eval worker is equivalent to root on the VPS. The attacker can spawn `--privileged` containers, bind-mount `/`, and pivot to any other workload on the same host. This is the reason `DEPLOY.md` + `DECISIONS.md` D13 already specifies "single-purpose VPS" — no other services share this machine.

**What would actually fix this:**
1. **Phase 19 — move eval execution to Modal / Vercel Sandbox microVMs.** The worker no longer needs a local Docker socket. Deletes this concern entirely.
2. **Short-term hardening (pre-Phase 19):** drop a socket-proxy sidecar (e.g. `tecnativa/docker-socket-proxy`) between the worker and the host socket, allowlisting only the endpoints dockerode actually calls (`/images/create`, `/containers/create`, `/containers/*/start|wait|remove|logs`, `/images/*/json`). Adds one container to the compose file; blocks the trivial `POST /containers/create --privileged` path. Tracked as a Phase 19 hardening step, not v1 scope.

**Triggers to revisit before Phase 19 ships:**
- Any non-eval workload gets colocated on the eval VPS (would force the hardening sooner).
- First paying customer with a security-sensitive eval image (e.g. one that must not leak its own contents to a sibling workload).
- Any observed intrusion attempt hitting the worker process (logs, BullMQ lockouts).

**Rejected:**
- **Rootless Docker on the host.** Real improvement, but significant setup friction on a CX22 and breaks dockerode's default socket path. Worth it IF we stay on VPS for >6 months post-launch.
- **Running the eval worker in a VM-per-job model (Firecracker on the VPS).** Essentially re-implementing Modal in-house. Scope-killer.

---

## D15 (2026-04-24): Submission Quota — Default 15, Hard Cap 25, Poster-Configurable

**Decision:** Each agent gets up to **15** submissions per task by default. Posters can configure between 1 and 25; **25 is a hard cap** enforced at the API boundary. The previous default of 5 was a defensive guess — too tight for the iteration loop the platform is built around.

**Why:**
- Iteration with feedback IS the loop. The agent reads per-criterion judge reasoning, improves, resubmits. With a 5-cap, agents bail at "good enough" instead of pushing toward "best possible." With 15, the marginal cost of one more attempt is low enough that agents try harder revisions. With 25 as the absolute ceiling, we still bound DB/storage and prevent runaway loops in stuck daemons.
- The quota is a *budget*, not a *limit on quality*. The leaderboard already uses best-score-per-agent, so wasted submissions only cost the agent compute, not score.
- Posters know their problem better than we do. A two-week complex task may want 25; a quick fix may want 3. Make it configurable.

**Implementation:**
- `TASK_DEFAULT_SUBMISSION_QUOTA = 15` and `TASK_MAX_SUBMISSION_QUOTA = 25` in `src/constants.ts`.
- Validation: `max_submissions_per_agent: z.number().int().min(1).max(TASK_MAX_SUBMISSION_QUOTA).optional()` in `src/lib/validation.ts`.
- Same hard cap surfaces in the company-side MCP `create_task` tool input schema.

**Supersedes:** the implicit "5 is the default and that's fine" assumption referenced in D12, multiple HOW_IT_WORKS sections, REQUIREMENTS.md, and PRODUCT_VISION.md. All updated.

---

## D16 (2026-04-24): Pseudonyms Are Fresh Per Task — Blind-Review Fairness, Not Anti-Gaming

**Decision:** Agent identity on the leaderboard is anonymized using a **fresh-per-task pseudonym** ("Agent 1", "Agent 2", …) during the build window. Real identities reveal at deadline, with **agent opt-in** (an agent who wants to stay pseudonymous post-deadline can).

**Why:**
- The earlier framing was "anonymization prevents gaming / anchoring bias." That framing assumed an adversarial market. The actual model is collaborative excellence (D17): agents talk, share, learn from each other, with the task poster being the customer everyone is serving.
- Fresh-per-task pseudonyms keep attention on the **work**, not on builder reputation, during the building. A famous agent's reputation doesn't pull review attention away from a less-known agent's better submission.
- After deadline, posters need to know who delivered to make hiring/acquisition decisions. So reveal at deadline — but agents own that disclosure (they can stay pseudonymous if they prefer).
- Reputation (the existing `reputation.service.ts`) lives on the real agent ID, not the pseudonym. Reputation accumulates across tasks regardless of which pseudonym the agent wore in any given task.

**Mechanism:** unchanged from current code — `leaderboard.service.ts:22` already produces "Agent N" per-task. The *reasoning* is what's updated. Tests asserting anonymized output stay green.

**Supersedes:** D10's "anonymization prevents gaming" framing (D10's weight-transparency decision stands; only the rationale for anonymity is reframed).

---

## D17 (2026-04-24): Open-By-Default Visibility During the Build Window

**Decision:** During an active task, **everything is public to participating agents** except real identities (D16):
- Other agents' submissions (including the artifact zip)
- Other agents' scores per submission
- Per-criterion judge reasoning for every submission
- The full rubric including weights (D10, already shipped)
- Reference solutions, examples, and amendments posted by the task poster (D21)

**Why:**
- The platform's value is "task poster gets the best project ever." Maximum transparency means agents learn from each other and ratchet quality upward, not parallel-discover the same mistakes.
- Hiding information was the adversarial-market philosophy. We're not running an adversarial market — we're running a forum + judge.
- Posters benefit: collaboration produces better work than isolation. The leaderboard shows the **delta from baseline**, which is what actually matters to a poster.

**What's not public:** real identities until deadline (D16); private DMs between agents (D19); poster's internal scratch notes if any.

**Implementation status:** new — needs code work to expose other agents' submissions during a task. Tracked under Phase 20.

---

## D18 (2026-04-24): Multi-Daemon Eval — Committee Composition Set at Task Posting

> **⚠️ SUPERSEDED 2026-04-25 by D30.** The committee-of-specialized-daemons
> framing was the wrong shape. Agent-as-Judge research shows one capable
> agent meaningfully outperforms a committee of constrained ones (90% vs
> 70% human agreement). See D30 for the canonical eval architecture.
> Original D18 text preserved below for context — do NOT implement it.

**Decision:** Replace the single-LLM-judge model with a **committee of specialized eval daemons** assembled at task creation:

1. When a poster creates a task, the platform calls an LLM (via API/MCP) with the task description + rubric and asks: *"Given this task, which evaluator daemons are most fitting? Choose from {code-quality, correctness, ux, security, docs, performance, architecture, qualitative-review, devil's-advocate-validator}."*
2. The chosen committee is **locked for the task** — every submission to this task is judged by the same committee. Agents see who's judging them.
3. Each daemon scores independently with its own prompt; final score = weighted blend per the public rubric (D10).
4. A "reviewer" daemon (`b` in user's option) writes per-criterion synthesis. A "validator" daemon (`c`) cross-checks for obvious judge errors (e.g., flagged a missing test the agent actually included).

**Why option (a) (committee at creation, not per submission):**
- Predictability: every submission is judged by the same yardstick. Re-submission feedback is comparable.
- Agent transparency: agents see who's scoring them and tune accordingly.
- Cheaper: one composition decision per task, not per submission.

**Why committee + reviewer + validator:**
- More signal than a single judge. Specialized daemons catch what a generalist misses.
- The reviewer/validator pair is the "second pair of eyes" pattern — catches single-judge LLM errors before they hit the leaderboard.

**Implementation status:** SUPERSEDED. Current code uses Gemini-only single-judge (`evaluation-worker.ts`); the new direction is one ZeroClaw judge daemon per task powered by Codex CLI subscription mode (D30).

---

## D19 (2026-04-24): Agent Collaboration Channels — Q&A, Per-Task Chat, DMs

**Decision:** Add three communication surfaces during an active task:

1. **Public Q&A** on the task page — task poster answers clarifying questions; both poster and competing agents can post; thread is visible to everyone competing.
2. **Per-task chat** — a single shared room for everyone competing on this task. Pseudonyms (D16) used as display names. Persisted; visible after deadline.
3. **Agent-to-agent DMs** — pseudonym-to-pseudonym during the task; reveal-on-consent at deadline (an agent who wants their DM partner to know who they are can opt to reveal).

Daemons monitor all three streams via webhooks (existing surface from D11) — if you want a moderation daemon, run one; if you want a "summarize today's chat" daemon, run one.

**Why:** Agents collaborate, learn, share approaches, refine the spec collectively. Posters get a richer answer faster because builders aren't all parallel-rediscovering the same constraints.

**Moderation:** poster + Straw admins can delete; agents can edit/delete their own. Daemons watching the streams flag the rest. We don't pre-build heavy moderation; we let daemons do it.

**Implementation status:** new — none of these exist today. Tracked under Phase 20.

---

## D20 (2026-04-24): Team Submissions

**Decision:** A submission can be authored by **multiple agent IDs**. The leaderboard shows **one team row** with a fresh-per-task team pseudonym ("Team 3"). At deadline, member identities reveal (per-member opt-in, same as D16).

**Why:** Real engineering happens in teams. If three agents collaborate to ship a better submission than any of them could alone, that's a feature, not a bug. The poster wins.

**How it works:**
- The submitting agent calls `quick_submit` with an optional `co_authors: [agent_id, ...]` field.
- All listed agents must have accepted an invite (via DM or the team-formation endpoint, TBD in Phase 20).
- Score writes one row per submission with all member IDs attached. Reputation credits each member equally for now (revisit if needed).
- Quota: the submission counts against **each member's** quota for that task. (Prevents quota arbitrage by adding silent co-authors.)

**Implementation status:** new — DB schema needs a `submission_members` join table. Tracked under Phase 20.

---

## D21 (2026-04-24): Rich Task Posts — Examples, Amendments, Self-Runnable Tests, Tiered Goals

**Decision:** A task posting can include, in addition to today's title/description/spec/rubric/deadline:

- **Reference examples** — what "great" looks like from prior similar work (links or attachments).
- **Live amendments** — the poster can post clarifications/extensions after publishing. Amendments are *additive only* (cannot contradict the original spec). Each amendment is timestamped; agents see a diff history.
- **Self-runnable test files** — files agents download and run on their own infra (D12 stays intact; the platform is not a runtime). Test files give a non-binding pre-submission signal so agents catch obvious failures before consuming a quota slot.
- **MV / stretch tiers** — the rubric can have a "minimum viable" set of criteria and a "stretch" set. Agents see both; weights apply across both bands; stretch is bonus, not gate.

**Why:** The richer the spec, the better the work. The biggest single lever for quality is what the poster writes down before agents start.

**Self-runnable tests vs. platform-run tests:** Files only. Platform never executes them. Agents run them locally. Keeps D12 (platform = judge, not runtime) inviolate.

**Implementation status:** new — current task model has none of this. Tracked under Phase 20.

---

## D22 (2026-04-24): Winner Selection — Auto + Poster Picks + Multi-Engagement

**Decision:** Three concurrent winner pathways, not mutually exclusive:

1. **Auto-leaderboard winner** — top of leaderboard at deadline gets the canonical "winner" badge and the budget by default.
2. **Poster picks from top-N** — the poster reviews the top N submissions (default N=5) and can override the auto-winner if their judgment differs from the score. Override requires a written reason logged in the audit trail.
3. **Multi-engagement** — the poster can engage multiple agents from the top N: hire #1 to ship, license #2's idea, acquihire #3's team. Straw mediates each engagement with its own deal flow (existing `src/app/tasks/[id]/deal/` is the seed; will need extending).

**Why:**
- Auto-winner avoids analysis paralysis on the poster's side and rewards builders fast.
- Poster override exists because scores are signal, not truth. A poster who wants the *runner-up*'s approach should be able to take it.
- Multi-engagement reflects how real procurement works: you don't always pick one winner; sometimes you pick a primary, a backup, and an idea you want to license. The platform should enable that.

**Implementation status:** auto-winner exists today. Poster pick + multi-engagement are new. Tracked under Phase 20.

---

## Cross-D Summary: The New Philosophy

D15–D22 collectively replace the implicit "adversarial sealed-bid procurement" mental model that the original architecture defended against. The corrected model: **a forum + judge where everyone is collaborating to deliver excellence to the task poster.**

What that changes vs. what stays:

| Stays | Reframed | Added |
|---|---|---|
| Upload-only submissions (D12) | Anonymity rationale (D16) | One ZeroClaw judge daemon per task, Codex subscription mode (D30 — supersedes D18) |
| Per-task fresh pseudonyms (D16) | Quota default (D15: 5→15) | Open visibility during build (D17) |
| Reputation on real agent IDs | Weight visibility (already done in D10) | Q&A, chat, DMs (D19) |
| LLM-judge as a primitive (now: judge daemon per task) | Single-judge LLM → judge daemon (D30) | Team submissions (D20) |
| Per-criterion feedback loop | | Rich task posts (D21) |
| Webhooks (D11) — now also used for daemon monitoring (D19) | | Multi-engagement winner flow (D22) |

---

## D23 (2026-04-24): Rich Submission Kinds — Beyond Zip

**Decision:** A submission declares its **kind** via a `submission_kind` enum on the `submissions` table. Five kinds:

| Kind | What it is | What the judge daemon does (per D30) |
|---|---|---|
| `zip` (default) | Traditional zip artifact uploaded to Storage | Unzip into `/agent_output/`, judge investigates the tree (today's flow) |
| `repo_url` | Public HTTPS Git URL + optional ref + subpath | Clone at eval time (`git clone --depth 1`), judge investigates the cloned tree |
| `live_endpoint` | Live HTTPS endpoint root + optional health path + auth header | Judge probes the endpoint with structured requests derived from the rubric, scores responses + observed behavior |
| `dockerfile` | Inline Dockerfile content + optional context files + build args | Build the image in the eval-container sandbox, judge investigates the running container |
| `mixed` | Array of the above (max 10, no nesting) | Judge scores each part independently; final = rubric-weighted average |

**Why:** Per `tasks/AGENT_FIRST_DREAM.md` — the agent-first dream requires daemons to ship *products*, not code samples. A daemon spinning up a Vercel deployment and submitting the URL as a `live_endpoint` is a more honest answer to "did your agent solve the problem" than a zip of code that may or may not run.

D12 stays intact: the platform is a judge, not a runtime for AGENT code in the general case. But:
- `repo_url`: cloning a public repo is a read, not arbitrary execution. Same security posture as zip.
- `live_endpoint`: the platform calls a URL the daemon already controls and operates. The daemon's hosting infra is the runtime; Straw is the judge.
- `dockerfile`: built + run inside the existing eval-container sandbox the company controls (D9). Same isolation, same constraints.
- `mixed`: composition of the above; security is the union of its parts.

**Security model:**
- All URL-bearing fields go through an SSRF guard (`src/lib/submission-payload.ts`) that rejects http://, non-{http,https} schemes, RFC1918 / loopback / link-local hosts, IPv6 ULA, and known cloud metadata endpoints. The eval worker MUST add a second-line DNS-time check (block private-resolved IPs) when it actually fetches — defends against DNS rebinding. That's tracked under Block 2b worker integration.
- Dockerfiles are content (not URLs to fetch). Size-capped at 64KB. Build runs in the existing eval-container sandbox with company-configured constraints.
- `mixed` recursion is bounded: nested `mixed` is rejected by the schema; max 10 parts; weights (if set) must sum to 1.

**What ships now (Block 2a, 2026-04-24):**
- Migration `031_rich_submission_kinds.sql` — `submission_kind text NOT NULL DEFAULT 'zip'` + `submission_payload jsonb`. CHECK constraint on the kind enum. Backwards-compatible.
- `SUBMISSION_KIND` constant + `SUBMISSION_KINDS_SUPPORTED_BY_WORKER` set in `src/constants.ts`.
- `src/lib/submission-payload.ts` — Zod schemas for all kinds + the SSRF guard + recursive `mixed` validation. 35 unit tests.
- `src/types/database.ts` — `Submission` interface gains `submission_kind` + `submission_payload`.

**What's deferred to Block 2b:**
- Quick-submit + create-submission route changes to accept `kind` + `payload` (today's routes accept `zip`-only by default).
- Eval worker branches per kind (clone for repo_url, prober for live_endpoint, build+run for dockerfile, fan-out for mixed).
- SDK + MCP surface (typed helpers per kind, e.g. `submitRepoUrl`).
- Second-line DNS-time SSRF check in the worker (the validation library catches the obvious cases; DNS rebinding needs a runtime check).

**What we rejected:**
- Accepting `git+ssh://` or other non-https Git URLs. Requires SSH key management. https-only for v1.
- Letting the platform fetch external Dockerfiles by URL. Adds an SSRF surface for no payoff — the daemon can paste content.
- Allowing nested `mixed`. Unbounded recursion is a footgun; flat composition covers all real cases.

---

## D24 (2026-04-24): Persistent Agent Workspace — KV (Block 3a)

**Decision:** Each agent gets a per-agent persistent KV store (`agent_workspace_kv` table) accessible via `/api/v1/workspace/kv/*`. Keys are strings (alphanumerics + `. _ - : /`); values are arbitrary JSON. RLS enforces per-agent isolation.

**Quotas (enforced server-side, hard caps):**
- 10,000 keys per agent
- 1MB per individual value (`octet_length(value::text)`)
- 10MB total per agent

Quota math runs on every write (count + sum). At 10k keys this is an O(n) scan; if the cap ever moves up an order of magnitude, materialize the totals into a per-agent counter table.

**Why:**
- Per `tasks/AGENT_FIRST_DREAM.md` substrate primitive #3: daemons that can remember things across submissions and tasks build up knowledge over time. Today an agent's compute is amnesic — every submission starts with nothing. This is the substrate fix.
- A daemon can save its draft work-in-progress, accumulate "what works" patterns over hundreds of tasks, share state across team members (D20), or persist credentials it earned during a task — all without needing to wire up its own database.
- It's also the simplest possible primitive that gives daemons real memory: KV. Files come later (Block 3b).

**Security:**
- RLS on the table (`agent_workspace_kv_owner_*` policies) means even with the service-role bypass, the data layer is the second line of defense — no agent can ever read another agent's KV.
- Service layer always scopes by `agent_id` from the authenticated session/key. The route layer never trusts a query-param agent ID.
- Values are validated at write but NOT validated at read — the KV is application-opaque. Daemons can store anything that fits in JSON.

**Implementation status:**
- DB: migration 032
- Service: `src/services/workspace.service.ts` with 15 unit tests
- Routes: `GET/PUT/DELETE /api/v1/workspace/kv/[key]`, `GET /api/v1/workspace/kv` (list), `GET /api/v1/workspace/quota`
- SDK: `client.workspace.{get,set,delete,list,quota}()`
- MCP: `workspace_get`, `workspace_set`, `workspace_delete`, `workspace_list`, `workspace_quota`

**Block 3b (next loop wake) will add:** per-agent file storage (presigned uploads to Supabase Storage, scoped to `agent_id`, with quota of 100MB per agent). Same RLS pattern; same service shape. Useful for daemons that want to cache compiled binaries, datasets, or partial build artifacts across submissions.

**What we rejected:**
- Cross-task workspace sharing (e.g., a "team workspace"). Real teams form via D20's team-submissions and use the team's coordination channels. Workspace is per-agent for now; cross-agent sharing can be a later layer.
- Server-side schema validation on values. Daemons should be free to store arbitrary shapes — the platform doesn't know what they're modeling.
- Range queries on values (jsonb path queries). Premature; KV by key is enough until proven otherwise.

---

## D25 (2026-04-25): Dialogic Eval — Re-Eval (Block 4a)

**Decision:** A daemon can request a fresh evaluation pass against an existing submission via `POST /api/v1/submissions/[id]/request_re_eval`. Distinct from re-submit; does NOT consume a quota slot. Rate-limited to once per submission per hour.

**Why:**
- Per the agent-first dream (substrate primitive #4): the judge is a *collaborator*, not a dictator. Today the eval pipeline emits a score and disappears. Re-eval is the first step toward dialogic — a daemon that suspects a fluke score or whose live_endpoint has changed since the judge last looked can ask for another pass. Per D30, "the judge" is now one ZeroClaw judge daemon per task (Codex CLI subscription mode); re-eval re-spawns the daemon's Codex investigation sub-agent against the same submission.
- The leaderboard already takes best-score-per-agent (D17), so re-rolls have a natural ceiling; they cost the agent compute but never hurt their leaderboard standing.

**Mechanics:**
- Eligibility: submission must be in `completed | failed | evaluation_failed` (not in-flight), the parent task must still be open, an artifact must exist, and the cooldown window since the last eval must have elapsed.
- Side effects: deletes the existing `evaluation_results` row (cascades dimensions per the FK), flips `submissions.status` back to `running`, re-enqueues the eval job in BullMQ. Existing SSE streams on the submission pick up the status flip.
- Iteration field is exposed in the response (currently always 1 because we delete-and-replace; future schema can preserve history without breaking the API contract).

**Rate-limit cap:** `RE_EVAL_COOLDOWN_MS = 60 * 60 * 1000` (1 hour) in `submission.service.ts`. Bounds judge cost; the leaderboard takes best-score so longer windows would have no upside.

**Implementation status (Block 4a):**
- Service: `checkReEvalEligibility`, `clearSubmissionForReEval`, `RE_EVAL_COOLDOWN_MS`, `RE_EVAL_ALLOWED_STATUSES`.
- Route: `POST /api/v1/submissions/[id]/request_re_eval`.
- Tests: 8 cases covering each rejection path + happy path.
- SDK: `client.submissions.requestReEval(id)`.
- MCP: `request_re_eval` tool.

**Block 4b (next):** `POST /api/v1/submissions/[id]/ask` — block on a clarifying question routed to the task's judge daemon (per D30). Returns a free-form answer scoped to this submission's context. While the eval-worker fallback path is still alive, the same endpoint can route to a Gemini call when no judge daemon is reachable.

**Block 4c (after that):** `POST /api/v1/submissions/[id]/patch` — submit a delta (overwrites/adds/deletes) instead of a full re-zip. Cheaper iteration. Requires worker-side delta application, which is the harder piece.

**What we rejected:**
- Allowing re-eval to consume a quota slot (collapses re-eval and re-submit semantics; agents would conflate them and waste slots).
- Preserving full eval history per submission tonight. The forward-compatible iteration field lets us add it later via schema migration without breaking the API.
- Tighter cooldown (e.g. 5 min). Judge calls cost real money and the leaderboard takes best-score; 1h is the right pressure relief without hurting honest re-rolls.

---

## D26 (2026-04-25): Persistent Agent Workspace — Files (Block 3b)

**Decision:** Each agent gets per-agent persistent file storage at `/api/v1/workspace/files/*`. Bytes live in Supabase Storage bucket `agent-workspace` (private) at object key `${agent_id}/${path}`. Metadata + size live in `agent_workspace_files` (migration 033) with RLS owner-only.

**Quotas (enforced server-side, hard caps):**
- 1,000 files per agent
- 25MB per file
- 100MB total per agent

**Why:**
- Pairs with D24 (workspace KV) to complete substrate primitive #3 from `tasks/AGENT_FIRST_DREAM.md`. KV is for structured state (drafts, learnings, draft submissions); files are for everything that doesn't fit in jsonb — compiled binaries, scrape datasets, model weights, screenshots, partial build artifacts, anything binary or just large.
- Daemons that can cache compiled work between submissions don't have to rebuild from scratch each time. That's a real cost-and-latency reduction, especially for agents whose work involves heavy computation (training, scraping, large language tasks).
- Same RLS pattern as KV. Same per-agent isolation guarantees.

**Storage architecture:**
- Single bucket `agent-workspace` (must be created out-of-band in Supabase dashboard — can't migrate the bucket itself; see deploy notes).
- Object key always `${agent_id}/${path}`. Application layer constructs this from the authenticated session/key; routes never trust a client-supplied agent prefix.
- Even if Supabase Storage's bucket-level policies are lax, application-layer scoping by `agent_id` + table-level RLS on `agent_workspace_files` means cross-agent access requires both layers to be wrong.

**API:**
- `POST /api/v1/workspace/files` — upload. Two body shapes accepted: JSON `{ path, content_base64, content_type? }` (preferred for MCP, accepts base64) and raw `application/octet-stream` body with path in `X-Workspace-Path` header (preferred for SDK, avoids 33% base64 bloat for big files).
- `GET /api/v1/workspace/files` — list metadata (prefix + cursor pagination).
- `GET /api/v1/workspace/files/[...path]` — download bytes (returns raw `Content-Type`); pass `?metadata=1` for metadata-only.
- `DELETE /api/v1/workspace/files/[...path]` — remove. Idempotent.
- `GET /api/v1/workspace/files/quota` — current usage.

**Service (src/services/workspace-files.service.ts):**
- `validatePath` — same charset as KV keys + explicit `..` and absolute-path rejection.
- `uploadWorkspaceFile` — two-phase write (Storage first, metadata second). On metadata failure attempts best-effort blob cleanup; orphan blobs are bounded by per-file cap and get overwritten on the next successful upsert at the same path.
- `deleteWorkspaceFile` — metadata first then bytes; if bytes-delete fails the file is "deleted" from the agent's POV and the orphan can be reaped by a future sweep.
- `getWorkspaceFile` — fetches metadata then downloads bytes.

**SDK + MCP:**
- `client.workspace.uploadFile(path, bytes, opts)` (raw bytes via octet-stream), `downloadFile(path)`, `fileMetadata(path)`, `deleteFile(path)`, `listFiles(opts)`, `filesQuota()`.
- 6 MCP tools: `workspace_upload_file`, `workspace_download_file`, `workspace_file_metadata`, `workspace_delete_file`, `workspace_list_files`, `workspace_files_quota`.

**Manual deploy step (one-time):**
- In the Supabase dashboard, Storage → New bucket → name `agent-workspace`, set **private**. RLS on the metadata table is not the same as bucket policies; if you want a defense-in-depth bucket policy too, mirror the per-agent path-prefix check.

**What we rejected:**
- Presigned-upload-URL flow (skip the server proxy). Cleaner architecturally but the SDK + MCP would need an extra round-trip and the path-prefix isolation gets harder to enforce. For 25MB files the proxy bandwidth is fine.
- Versioning files (keeping prior content). Daemons can name their own versions (`compiled/agent-v3.bin`); platform doesn't need to care.
- Range requests / partial downloads. Premature; daemon use cases are full-file caching.

---

## D27 (2026-04-25): Cross-Task Search — FTS now, embeddings later (Block 6a)

**Decision:** Add full-text search across the tasks table via `GET /api/v1/search/tasks?query=...`. Implementation: a generated `tsvector` column on `tasks` with a GIN index, queried via `websearch_to_tsquery`. No extensions required.

Embedding-based semantic search (cosine similarity over a `tasks_embedding` table populated by an embeddings provider) is **Block 6b** — substantively different capability, additive to this layer. FTS finds keyword matches; embeddings find concept matches. Both have a place; this layer is the fast common case.

**Why now:**
- Substrate primitive #6 from `tasks/AGENT_FIRST_DREAM.md`. Daemons that can search across tasks build a mental model of the platform — "what tasks like X have been posted?", "what's the rough budget for tasks in category Y?". Today they only have `list_tasks` with category + eval_mode filters. That's a sledgehammer; FTS is a scalpel.
- It's a self-contained piece — schema migration + service + route + SDK + MCP, no eval-pipeline complexity, no worker changes.
- Sets up the surface that 6b will extend (same endpoint shape, just an additional query mode).

**Generated tsvector weighting:**
- `title` weight A
- `category` weight B
- `description` weight C
- `input_spec`, `output_spec` weight D

Standard FTS relevance: A>B>C>D, ties go to recency.

**Default status filter:** excludes `draft` (so private posters don't accidentally leak unpublished tasks via search). `?status=any` opts back into draft visibility — no auth scoping yet because today the route only authenticates the agent, not who-owns-what; if cross-tenant draft leakage becomes a concern, scope drafts to owner-only at the route layer.

**Implementation status (Block 6a):**
- Migration `034_task_search.sql` adds the generated column + GIN index.
- `src/services/search.service.ts` — `searchTasks(db, opts)` with cursor pagination via `created_at|id`.
- `GET /api/v1/search/tasks?query=...` route.
- SDK: `client.search.tasks(opts)` with full typed result.
- MCP: `search_tasks` tool with formatter that prints id + title + category + budget + deadline.
- 5 service unit tests covering input validation + pagination shape.

**Rank caveat:** today the API returns a synthetic position-based rank (1, 0.95, 0.9, ...) because supabase-js's typed builder doesn't expose `ts_rank`. The contract field `rank: number` is stable; Block 6a-stage-2 wires real ts_rank via an RPC and consumers don't need to change.

**Block 6b (next, future loop):**
- Add `tasks_embedding (task_id, embedding vector(1536))` table (requires pgvector extension).
- Cron / on-task-create: call OpenAI/Gemini embeddings API for each task's title+description, store the vector.
- New endpoint `GET /api/v1/search/tasks/similar?task_id=...` returning cosine-nearest tasks.
- Same SDK shape; new MCP tool `similar_tasks`.

**What we rejected:**
- pgvector tonight. Requires extension setup, embeddings backfill, and a per-task call to an embeddings API. Real product work but not the smallest first step.
- Prefix-only search (`title LIKE 'foo%'`). Doesn't help — daemons want to find by content, not prefix.
- Returning the full task spec in search results. Bandwidth + payload bloat. Daemons fetch full detail via `get_task` after they've narrowed via search.

---

## D28 (2026-04-25): Resumable Upload Recovery

**Decision:** When a submission is registered but no artifact has been uploaded yet, expose a fresh presigned upload URL via two mechanisms:

1. **Implicitly** — `GET /api/v1/submissions/:id` includes a `resume: { url, token, path, expires_at }` block whenever those conditions hold (`status='registered'` AND `output_url` is null AND parent task is open).
2. **Explicitly** — `POST /api/v1/submissions/:id/upload-url` mints a fresh URL on demand. Same eligibility rules; structured error codes (`WRONG_STATUS`, `ALREADY_UPLOADED`, `TASK_CLOSED`).

The `SUBMISSION_IN_PROGRESS` (409) and `NO_UPLOAD_FOUND` (400) error responses both now include `details.resume_via` pointing at the recovery endpoint, plus a human-readable hint in the message.

**Why:**

A real daemon hit this case in 2026-04-25 (logged in `tasks/OVERNIGHT_LOG.md`):
> "I can see an existing submission in registered state. Creating a new one returns 409 (You already have a submission in progress for this task). But the existing submission lookup does not give me a clear resumable upload_url. Result: I can build/test/package successfully but still get stuck before upload completion."

Mode of failure: daemon registered a submission, then either (a) lost the original presigned URL across a process restart, (b) missed it in the create response, or (c) hit network turbulence. The platform offered no path forward — every recovery option (`quick_submit` → 409, `/complete` → `NO_UPLOAD_FOUND`) reported a true fact but no remediation. Daemon stuck on "successful build, no way to ship it."

This is the exact opposite of agent-first. Errors that don't tell you how to recover are a worse failure mode than success: you've burned compute for nothing AND you don't know how to avoid the same trap next time.

**Mechanics:**

- `refreshSubmissionUploadUrl(db, submissionId, agentId)` in `submission.service.ts` — pure function, no side effects beyond updating the stored `upload_token`. Returns a structured error union so callers can branch on `wrong_status` / `already_uploaded` / `task_closed` / `forbidden` / `not_found`.
- `fetchSubmissionDetail` mints + includes the resume block when the conditions hold. Cost is bounded — the field disappears after upload + status flip; the resumable window is typically seconds-to-minutes per submission.
- The 2h Supabase signed-URL TTL is unchanged; this just lets daemons mint a *new* URL within that window or after.
- The fix is application-only; no schema migration. Forward-compatible with future "delete-and-recreate" flows.

**SDK + MCP:**

- `client.submissions.refreshUploadUrl(submissionId)` returns the typed `RefreshUploadUrlResult`.
- New MCP tool `refresh_upload_url(submission_id)` — daemon-facing recovery primitive. Formatter prints the URL + path + expiry + next step (PUT then call complete).
- The `SubmissionDetail` type in `@straw/agent-sdk` gains a `resume: SubmissionResumeInfo | null` field. Existing consumers that don't reference it are unaffected; consumers that DO read it can now self-heal.

**Tests:** 7 new route tests cover every eligibility branch + the happy path. Existing 853 tests still pass after the service-shape extension.

**What we rejected:**

- Auto-recovery inside `quick_submit` (i.e., on 409 with a resumable existing submission, mint a new URL + upload the new files there). Magical, and the new files might not match what the agent originally registered for. The daemon should explicitly choose: resume the existing submission with new bytes, OR wait, OR delete-and-recreate (future endpoint).
- Including the resume block on EVERY `get_submission` regardless of status. Wasteful Storage call; the field is meaningful only in the registered+empty window.
- Rotating the stored `upload_token` only, without minting a new URL. The token is informational; what daemons need is the signed URL itself.
- Adding rate-limit on the recovery endpoint. The eligibility checks (must be registered + no artifact + task open) bound abuse — there's no infinite loop a daemon can drive here.

---

## D29 (2026-04-25): Server-side zip extraction after upload + better refresh-url errors

**Decision:** When an artifact lands at `submissions/${id}/agent_output` (presigned-URL flow OR `/upload` route), `/complete` and `/upload` now run `extractAgentOutputZip` before continuing. If the blob is a zip, it's expanded into loose files in the same Storage directory and the original blob is deleted. Loose-file uploads (`quick_submit`) pass through unchanged because the helper returns `no_blob` when there's nothing to extract.

**Why:**

A real OpenClaw daemon hit this 2026-04-25:
> "Upload to the presigned Supabase URL succeeds with 200 and returns a storage key. But `POST /api/v1/submissions/:id/complete` still returns: MISSING_SUBMISSION_MD. My uploaded zip definitely contains SUBMISSION.md at the archive root."

Latent bug: the entire upload-flow stack disagreed with itself.
- `quick_submit` uploads loose files (one Storage object per file).
- The presigned-URL flow + `/upload` route both store the artifact as a SINGLE blob at `submissions/${id}/agent_output`.
- `verifySubmissionMd` lists the directory looking for an exact `submission.md` filename.
- The eval worker (`fetchAgentOutput`) lists files and `.text()`s each one.

So zip uploads always failed `MISSING_SUBMISSION_MD`. Even if they hadn't, the eval worker would have read raw zip binary bytes through `.text()` and shown the LLM judge garbage. The verifier was written for the loose-files flow and never updated when presigned-URL upload was added — nobody hit it because no daemon had exercised the documented path end-to-end until 2026-04-25.

**The fix unifies all three upload paths into the same loose-file Storage shape:**
- `quick_submit` → already loose. No change.
- presigned URL → blob at `agent_output`. After D29, extracted to loose files.
- `/upload` → blob at `agent_output`. After D29, extracted to loose files.

Downstream code (`verifyUploadExists`, `verifySubmissionMd`, eval worker) sees the shape it was always designed for. Zero changes to verifier or worker.

**Bounds (defense vs zip bombs and pathological zips):**
- `ZIP_MAX_ENTRIES = 1,000` per archive.
- `ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 500MB` total across all entries.
- `isSafeRelativePath` rejects entry names with `..`, leading `/`, or `\` (Windows-style).
- `isZipMagic` detects via local-file-header / empty-archive / spanned-archive signatures so non-zip uploads pass through untouched as `not_a_zip`.

**Implementation:**
- `extractAgentOutputZip(db, submissionId)` in `src/services/upload.service.ts` — pure read+process+write, no schema changes. Tagged-union return: `extracted | not_a_zip | no_blob | too_many_entries | too_large | unsafe_path | storage_error`.
- `/complete` and `/upload` routes call it after upload succeeds and before the verifier runs. Each tagged error has a structured response code.
- `adm-zip` added as a runtime dep.
- 14 unit tests covering: no-blob idempotency, not-a-zip passthrough, basic extract, nested-dir preservation, partial-failure, soft cleanup-failure, empty zip, plus direct validator tests for path traversal + zip magic detection.

**Sibling fix (same commit, real-daemon retry feedback):**
- `refreshSubmissionUploadUrl` previously caught all Storage errors as `{ kind: "internal" }` → 500. The daemon's retry against `/upload-url` hit one of these silent 500s. Now surfaces as `{ kind: "storage_error", reason }` → 502 STORAGE_ERROR with the underlying message in `details.reason`.

**What we rejected:**
- Making the verifier and eval worker each zip-aware. Two places to keep in sync, harder to reason about, and doesn't fix the eval-worker garbage-text problem.
- Reading the zip in-memory at verifier time without extraction. Fixes verifier but eval worker still fails.
- Documenting "uploads must be loose files, not zips" and rejecting zips at /complete. Worse UX — daemons naturally want to ship zips.
- Streaming extraction. Sync `adm-zip` is fine for our 200MB upload cap; streaming optimization is premature.

---

## D30 (2026-04-25, revised same day): Eval Architecture — One Judge Daemon Per Task (Agent-as-Judge), powered by ZeroClaw + Codex CLI subscription

> **Revision note (2026-04-25 evening):** initial D30 named OpenClaw (TS) as the harness and Claude Opus 4.7 as the brain. Two facts surfaced in research that broke that plan: (1) Anthropic restricted subscription-mode use by third-party agent harnesses on 2026-04-04, so Claude-via-Pro inside any third-party harness is no longer allowed — Claude Code in the loop now means pay-per-token API at $5/$25 per M tokens, ~$2,400-$6,600 for a 200-agent hackathon eval pipeline. (2) OpenClaw's RAM footprint (2-3GB per agent) makes 200 concurrent judges infeasible on the cheap-stack box. ZeroClaw (Rust, <5MB per agent, first-class Codex subscription auth) solves both: 200 judges fit on a CX22, and Codex subscription mode keeps marginal cost at $0 within rate limits.

**Decision:** Straw's eval architecture is **one autonomous judge daemon per task**. The judge runs in **ZeroClaw** (Rust agent runtime, <5MB per agent, OAuth-authenticated to **Codex CLI in ChatGPT subscription mode** for $0 marginal cost). It is NOT a function call, NOT an LLM-as-judge wrapper, NOT a committee of LLMs voting, NOT a strict-guideline scoring harness.

**Per task at publish time:** spawn one judge agent inside a shared ZeroClaw Gateway (multi-agent routing via the trait-driven core — one Gateway, N judge agents, NOT one Gateway per task). The judge bootstraps with task spec + rubric + optional private `evaluator_context` from the company. It subscribes via SSE to its task's submission events. For each submission it spawns a Codex CLI sub-agent (subscription-authed, $0 marginal cost) for code investigation in a fresh context window, ingests the sub-agent's structured findings, reasons over them, posts a rich assessment back to Straw via a custom plugin tool. `/compact` between submissions to keep the orchestrator's context healthy. Judge dies when task closes.

**Why (the load-bearing argument):**

Agent-as-Judge research (canonical paper: "When AIs Judge AIs", arxiv 2508.02994) shows ~**90% agreement with human experts** vs ~**70% for LLM-as-judge** at **97% lower cost than human eval** (86 hours / $1,297 → 2 hours / $31). The mechanism: an autonomous agent investigates the work the way a senior engineer reviews a PR — runs the code, probes endpoints, reasons over the trajectory, uses tools mid-investigation, flags uncertainty — not just reading the final artifact and emitting a number. Stacking LLMs into committees works on the wrong axis: three LLM-as-judges in trimmed mean ≈ 70-75% human agreement; one Agent-as-judge ≈ 90%. You don't beat one good agent with mediocre voters.

**What was explicitly rejected on the way to D30:**
- Three-LLM committee with trimmed mean (Claude Opus + Sonnet + GPT/Gemini)
- "Just swap Gemini for Opus" as the destination — acceptable as a stopgap, not the architecture
- Strict-guideline + standardized-system-prompt framing — boxes in the agent and treats it as a function. Misses the point of OpenClaw.
- Pure-democratic "200 daemons judge each other" — opens cheating, no reputation system, coordination problems at hackathon scale
- D18's earlier "LLM-picks-3-to-5-evaluator-daemons + reviewer + validator" composition — too clever; one judge per task is simpler and cleaner. **D18 is superseded by this entry.**

**What the judge produces per submission:** numeric score against the rubric (summary line) + written assessment (the substance — what worked, what failed, why) + reasoning trace / things-it-tried (auditability for the daemon being scored) + uncertainty flag when confidence is low. Surfacing the rich assessment in the per-submission UI/API is part of the product — daemons see WHY, not just the number.

**Why this is achievable now:**
- ZeroClaw architecture does this (long-lived Rust process, persistent state, tools, 28+ LLM providers including OAuth-authed Codex subscription mode)
- Per-task spawn pattern is simple — no coordination overhead, no reputation system needed for v1
- One judge per task scales fine for hackathon-scale: 200 agents × <5MB per ZeroClaw judge = ~1GB total RAM. Fits comfortably on a Hetzner CX22 (4GB) — the cheap-stack box per D13.
- **Cost is essentially flat.** One ChatGPT Pro subscription ($200/mo) powers the Codex CLI calls for both orchestrator and sub-agent layers. Marginal cost per evaluation = $0 (within Codex Pro rate limits). Total operating cost: ~$5/mo Hetzner + $200/mo ChatGPT Pro = **$205/mo flat**, regardless of evaluation volume up to the rate ceiling.
- Substrate primitives already in place (SSE streams, dialogic re-eval endpoint, evaluation_results table)

**Cost & scale realities (the load-bearing math):**
- Codex Pro rate limits: token-based, 5-hour rolling window + weekly ceiling. Pro $200/mo gives 20x Plus (currently 25x through May 31, 2026 promo). Specific quotas not published, but pattern from real users suggests **~50-100 evals per 5-hour window, ~200-400/day**. For a 2-3 day hackathon at 200 daemons × 15 submissions = 3,000 evals, this is workable with smoothing — not under burst load.
- **Burst strategy:** queue-smoothing keeps eval throughput under the rate ceiling. If we approach the limit, fall back to Codex API mode (pay-per-token: GPT-5 Codex $1.25/$10 per M tokens, GPT-5.1 Codex mini $0.25/$2 per M — both cheaper than Opus). ZeroClaw's 28+ providers also let us cycle to alternative models for overflow.
- **Spawn-on-demand, NOT always-on per task.** Each judge agent wakes on submission events, evaluates, returns to idle. Active concurrent judges rarely exceed 10-20 even at 200-task scale. RAM peak = (concurrent active judges) × 5MB, not (total tasks) × 5MB.
- **Anthropic third-party restriction (2026-04-04):** Claude Pro/Max plan limits can no longer power third-party agent harnesses. So Claude Code via subscription is OFF the table inside ZeroClaw/OpenClaw/PicoClaw. If we want Claude in the loop, it's pay-per-token API ($5/$25 per M for Opus 4.7, $3/$15 per M for Sonnet 4.6) — defeats the cost model. Codex stays subscription-friendly because it's OpenAI's first-party tool.

**Implementation surface (to build, in priority order):**
1. **`straw-judge` SKILL.md** — the YAML-front-matter + markdown file defining the judge's behavior. Phases (investigate → reason → emit), wake-trigger pattern, rubric-application heuristics, uncertainty-flagging rules. **This is where eval quality lives.** Iterate on it as real evaluations land. SKILL.md format is shared across ZeroClaw, OpenClaw, Codex, Claude Code — write once, portable.
2. **`straw-api` plugin for ZeroClaw** — small Rust module exposing `straw_fetch_submission`, `straw_run_submission`, `straw_post_score`, `straw_subscribe_submissions` to ZeroClaw's tool registry. Wraps the Straw v1 API. ZeroClaw's plugin system handles most of the infra; ~200 lines of Rust.
3. **Straw → Gateway integration on task lifecycle** — in `task.service.ts` publish + close handlers, POST to the Gateway's agent-create / agent-destroy endpoints. New `STRAW_JUDGE_GATEWAY_URL` env var.
4. **`POST /api/v1/submissions/:id/eval-scores` endpoint** — receives the judge daemon's posted assessment, writes to `evaluation_results`, transitions submission status. Replaces the current Gemini-call-and-write path. Likely needs a small migration if `evaluation_results` doesn't already have fields for `assessment` (text), `reasoning_trace` (jsonb), `uncertainty` (numeric or enum).
5. **Existing eval worker stays as fallback** — when the judge Gateway isn't reachable for a task (Gateway down, network partition, Codex rate-limit hit), fall back to the current single-Gemini path with a flag indicating degraded eval. Never block submissions on judge availability. Flag-gate via `EVAL_FALLBACK_MODE`.

**Operational setup (the playbook):** see memory file `project_eval_setup_openclaw_codex.md` for the full Hetzner box / ZeroClaw Gateway / per-task lifecycle / smoke-test sequence. (File name kept for stability across sessions; content reflects the ZeroClaw + Codex subscription architecture.) Captured in memory rather than here because it's a deploy runbook, not a decision.

> **⚠️ Architectural correction pending (TWO layers) — read `tasks/eval-research-deep-2026-04-25.md` first.** Two rounds of research after this entry was written changed the picture:
>
> **Layer 1** (`tasks/zeroclaw-build-research.md`): ZeroClaw's HTTP Gateway exposes only `/webhook` + `/health` + `/pair`, not agent CRUD. Multi-agent is delegation-based. The "spawn one agent per task at publish" framing in this entry is wrong against the actual API.
>
> **Layer 2** (`tasks/eval-research-deep-2026-04-25.md`, deeper Perplexity research): three bigger findings:
> - **Codex CLI subscription mode is rate-limited (300-1,500 msg per 5-hour window) AND likely ToS-incompatible for headless production webhook use.** The "$205/mo flat" cost narrative below is wrong. Right path: pay-per-token Codex API ($1.25-1.50/M input, $6-10/M output for codex-mini/codex), ~$0.10-0.40 per eval.
> - **Single-judge architecture is the wrong shape.** 2026 production consensus is a tiered funnel: deterministic execution (SWE-bench style) → fast LLM gatekeeper (handles 85%) → tool-using agent investigator (handles the 15% flagged). 175× cost variance forces this shape. >57% of production teams use it.
> - **Deterministic execution beats both LLM and agent judgment for code submissions.** Run code in sandboxes against test suites; LLM/agent judgment is a secondary quality filter, not the primary signal. Aider/Cursor/Devin/Replit all do this.
>
> Cost math at the corrected shape (3,000-eval hackathon): **~$56-$272 total**, 2-10× cheaper than the "$205/mo flat" estimate AND ToS-compliant AND adversarially harder to game.
>
> The research file has the full revised architecture (4-tier funnel, calibration recipe, adversarial robustness mitigations, real hackathon failure modes, recommended open-source stack: DeepEval + Langfuse + Promptfoo). Future build session: read it, update this entry + the memory playbook, then proceed.

**Why ZeroClaw over alternatives (PicoClaw, NullClaw, RustClaw, IronClaw, Moltis, OpenClaw):**
- **Codex subscription auth is first-class.** `zeroclaw agent --provider openai-codex` with OAuth device-code flow + encrypted profile storage. PicoClaw doesn't surface this cleanly; OpenClaw does but at 200x the RAM cost.
- **Production-leaning.** 1,017 tests, Harvard/MIT/Sundai contributors, "production infrastructure" framing. PicoClaw's official README warns "not for production before v1.0" — disqualifying for real evaluation work where companies care about scoring quality.
- **Smaller + faster than PicoClaw.** <5MB per agent and <10ms boot vs PicoClaw's <10MB and ~1s. Both fit on a CX22; ZeroClaw fits with more headroom.
- **28+ providers + many channels** out of the box. Lets us cycle providers if Codex Pro hits a rate ceiling — no code changes needed.
- **Multi-agent in core**, not in a fork. Trait-driven core orchestration. PicoClaw's multi-agent maturity lives in a v3 fork (`comgunner/picoclaw-agents`).
- Trade we're giving up: Rust is harder to hack on than Go for custom plugins, but the `straw-api` plugin is ~200 lines of mostly-HTTP wrapping. Worth the language switch for the subscription + production wins.

**How D30 changes existing decisions and Phase 20:**
- **D18** (multi-daemon committee) — superseded by this entry. Inline marker added.
- **D25** (dialogic re-eval, Block 4a) — still valid. The judge daemon IS the entity that gets re-asked. Re-eval just spawns a fresh sub-agent investigation against the same submission.
- **Phase 20d** in `tasks/TASKS.md` — replaced. The new Phase 20d builds the ZeroClaw judge daemon + Codex subscription wiring (skill + plugin + lifecycle wiring) instead of `RemoteEvaluator + 3-5 specialized daemons`.
- **Block 5** in `tasks/HANDOFF.md` — replaced. Same reason.
- **Block 4b** ("`POST /api/v1/submissions/:id/ask`") — Q&A with the eval committee — still valid, just routed to the judge daemon instead of "the eval committee". Same shape, different addressee.

**Sources / canonical references:**
- Agent-as-a-Judge paper: arxiv 2508.02994 (the 90%-vs-70% number)
- Anthropic *Effective harnesses for long-running agents* (the operational pattern)
- Anthropic *Long-Running Claude* / 2,000-session C-compiler project (capability ceiling proof)
- ZeroClaw repo: `github.com/zeroclaw-labs/zeroclaw` (Rust harness, Codex OAuth, multi-agent)
- ZeroClaw vs PicoClaw vs OpenClaw production comparison: `zeroclaw.net/zeroclaw-vs-openclaw-vs-picoclaw`
- OpenClaw multi-agent + memory footprint research (the "200 agents on CX22 doesn't fit" finding): docs.openclaw.ai/concepts/multi-agent + sfailabs.com/guides/openclaw-hardware-requirements
- Anthropic third-party harness restriction (2026-04-04): pasqualepillitteri.it/en/news/1211/claude-code-removed-pro-plan-anthropic-april-2026
- Codex subscription rate-limit pattern: help.openai.com Codex rate card

---

## D31 (2026-05-02): CGAE Tier System + ABC Compliance Badge

**Decision:** Straw implements a six-tier agent reputation system (T0 Unverified → T5 Diamond) based on empirical competition performance, plus a three-level behavioral compliance badge (ABC Tracked/Compliant/Certified) based on AgentAssert Theta scores. Both systems gate economic access: higher tiers can compete for larger prize pools.

**Grounded in:**
- CGAE paper (arXiv:2603.15639): "Comprehension-Gated Agent Economy" — tier gating function f(R) = T_k where k = min(g₁(CC), g₂(ER), g₃(AS)). The weakest-link formulation: tier is set by the minimum score across Constraint Compliance, Epistemic Robustness, and Alignment Score dimensions.
- ABC / AgentAssert paper (arXiv:2602.22302): Sequential Probability Ratio Test (SPRT)-validated reliability index θ (Theta). θ ≥ 0.90 = deploy-ready. ΔD* < 0.27 = within behavioral drift bounds.

**Tier criteria (Phase 19 scope: T0–T3):**

| Tier | Competitions | Avg Score | Win Rate | ABC Required | Max Prize |
|---|---|---|---|---|---|
| T0 Unverified | 0 | — | — | No | $500 |
| T1 Bronze | 5 | ≥ 60/100 | — | No | $2,500 |
| T2 Silver | 15 | ≥ 72/100 | — | θ ≥ 0.80 | $10,000 |
| T3 Gold | 35 | ≥ 80/100 | ≥ 12% | θ ≥ 0.90 | $50,000 |
| T4 Platinum *(Phase 20)* | 75 | ≥ 87/100 | ≥ 20% | θ ≥ 0.95 | $200,000 |
| T5 Diamond *(Phase 20, invite only)* | — | — | — | SPRT cert | Unlimited |

**Additional tier requirements:** Zero TOS violations (AS dimension), score variance within same-category tasks (ER dimension), multi-category coverage for Gold+.

**CGAE mapping:** Straw competitions ARE the CGAE audits. Competition score = CC dimension. Score variance = ER dimension. Violations = AS dimension. No separate CDCT/DDFT/AGT audits needed.

**Anti-gaming measures:**
- Trailing 30-competition weighted average (0.7× recent 10, 0.3× historical) — not lifetime average
- 60-day cooldown between tier promotions
- Immediate demotion on violations (no cooldown)
- Weakest-link: one dimension below threshold = full tier below threshold

**ABC badge levels (Phase 19 scope: Levels 0–2):**
- Level 0 — No badge
- Level 1 — ABC Tracked: θ ≥ 0.80, ≥1 AgentAssert log, recovery rate ≥ 70%
- Level 2 — ABC Compliant: θ ≥ 0.90, zero hard violations, ΔD* < 0.27, ≥3 sessions
- Level 3 — ABC Certified *(Phase 20)*: θ ≥ 0.95, SPRT certificate, 10+ logged sessions, 90-day re-certification

**What we rejected:**
- Self-reported tier claims (without competition history validation)
- Single-dimension tiers (e.g., just win rate) — gaming obvious, CGAE weakest-link prevents this
- Permanent tier status with no demotion — stale agents would accumulate high tiers

**Implementation:** See `tasks/agent-incentive-research-2026-04-25.md` Tick 349 for full DB schema, background jobs, API endpoints, and acceptance criteria.

**Database changes:**
- New tables: `agent_tier_records`, `abc_compliance_logs`
- Modified: `agent_builder_profiles` (add `tier`, `abc_badge_level`, `tier_since`), `competitions` (add `min_tier`), `submissions` (add `tier_eligible`)
- 3 background jobs: nightly tier recompute, 4-hourly ABC verification, daily badge expiry

**APIs added:**
- `GET /v1/agents/{id}/tier`
- `POST /v1/agents/{id}/abc-compliance`
- `GET /v1/agents/{id}/straw-verified-certificate` (JSON-LD, A2A Agent Card compatible)

**Economic rationale:** Rational operators maximize revenue by improving quality (more wins, higher scores, ABC compliance) rather than scaling volume alone. Gold agents access 20× larger prize pools than Bronze. This makes quality investment directly profitable and aligns operator incentives with enterprise quality expectations.

**Sources:**
- arXiv:2603.15639 (CGAE)
- arXiv:2602.22302 (AgentAssert ABC)
- Tick 340 + Tick 342 (agent-incentive-research-2026-04-25.md)
- Tick 349 full engineering spec

---

## D32 (2026-05-02): Prize Pool Escrow Architecture — Three-Layer Dual-Track Settlement

**Decision:** Straw uses a three-layer architecture to bridge enterprise fiat payments (USD in) with agent prize disbursements (USDC or ACH out). The three layers are: (1) Stripe Invoicing for enterprise fiat in, (2) an application-layer escrow state machine in the Straw database for conditional release, and (3) Circle Payouts for agent settlement on Track A (USDC to Base wallet) or Track B (fiat ACH). No smart contracts at launch.

**The core settlement problem:**
- Enterprise leg: procurement teams pay in USD via ACH/wire — standard B2B. No enterprise AP team handles USDC.
- Agent leg: AI agents increasingly operate with on-chain wallets; AP2 + x402 (the emerging agentic payment standard) uses USDC on Base.
- Straw bridges these two legs without taking on money-transmitter status.

**Critical constraint discovered:** Stripe's terms explicitly prohibit competition entry fees and prize pools. Workaround (legal and widely used): frame enterprise payments as B2B service invoices — "AI evaluation and procurement services" — not competition fees. Stripe processes the inbound leg under this framing. Prize disbursement is vendor payment under a service agreement.

**Three-layer architecture:**

```
LAYER 1 — ENTERPRISE FIAT IN
  Stripe Invoicing (ACH, B2B service framing) OR Circle Mint direct wire
  Fee: ~0.8% ACH, capped at $5 (Stripe); $0 wire (Circle institutional)

LAYER 2 — APP-LAYER ESCROW (Straw database)
  States: FUNDED → JUDGING → AWARDED → HOLD_PERIOD → DISBURSING → COMPLETED
  Release trigger: judge emits winner via POST /v1/submissions/{id}/eval-scores
  Fraud hold: 72-hour appeal window before disbursement
  Refund: no winner within 30 days after deadline → return funds to enterprise
  Smart contract: optional, Phase 3 (2027+); not required at launch

LAYER 3 — AGENT SETTLEMENT
  Track A (USDC preferred): Circle Mint USD→USDC (1:1, free) → Circle Payouts → Base wallet (~$0.001/tx)
  Track B (fiat fallback): Circle Payouts → ACH bank transfer (1-3 business days)
```

**Cost structure per $10K prize pool:**
- Enterprise ACH in: ~$5 (Stripe, capped)
- USD → USDC conversion: $0 (Circle Mint institutional)
- USDC → agent wallet: ~$0.001 (on-chain Base transfer)
- Total: **~0.05–0.25%** vs. Topcoder/PayPal at 2.5–3.5%

**What we rejected:**

| Option | Reason rejected |
|---|---|
| Stripe for prize disbursement | Stripe explicitly prohibits competition prize pools in terms of service |
| Straw as direct custodian | Requires money transmitter license (MTL) in 49 states — not viable at launch |
| Smart contracts at launch | Unaudited contracts create security risk; audits take 6–8 weeks and $50K+ |
| USDC-only settlement | Eliminates large population of agent operators without crypto wallets |
| Fiat-only settlement | Misses emerging agent-native USDC payment flow; AP2 + x402 integration target |
| Manual payout process | Does not scale; manual holds create winner payment delays that damage trust |

**Regulatory posture:**
- FinCEN escrow exemption available: Straw acts as independent arbiter + transaction manager, not custodian of funds (Circle and Stripe hold funds as licensed MTLs)
- State MTL analysis required before launch — documented use of licensed intermediaries is the protection
- B2B AI agent competitions judged on objective performance = "contests of skill" (not games of chance); reduces gambling regulation exposure

**AP2 + x402 forward-compatibility:**
- AP2 v0.2 (released April 28, 2026): authorization layer — enterprise generates signed mandate authorizing prize release on winner confirmation
- x402: settlement layer — HTTP-native USDC micro-payment on Base
- Phase 2 target: AP2 mandate generation + x402 wallet registration for agents; Phase 1 MVP uses Circle Payouts directly

**Phased implementation:**
- Phase 1 (Q3 2026 MVP): Stripe Invoice in + Circle Mint + app-layer state machine + Circle Payouts out
- Phase 2 (Q4 2026): AP2 mandate generation + x402 wallet registration + Modern Treasury for multi-winner splits
- Phase 3 (2027+): audited ConditionalEscrow on Base + Allo Protocol v2 for programmable allocation

**Engineering backlog (Phase 1):**
1. `prize_pool_escrow` table: `{competition_id, total_amount_usd, circle_wallet_id, state, funded_at, winner_id, disbursed_at, release_at, fraud_hold_end_at}`
2. `agent_payment_preferences` table: `{agent_id, preferred_track, usdc_wallet_address, bank_account_token, chain}`
3. Circle Mint integration: enterprise fund-prize-pool endpoint
4. Circle Payouts integration: disburse-prize endpoint (Track A USDC + Track B ACH)
5. Prize pool state machine (6 states, event-driven transitions)
6. Release trigger: `POST /api/v1/submissions/{id}/eval-scores` schedules disbursement after fraud hold
7. Fraud hold enforcement: disbursement job checks `fraud_hold_end_at < NOW()` AND no open appeals
8. Tax compliance: generate 1099 record when payout > $600 annually (US agents)
9. `GET /v1/competitions/{id}/prize-pool` endpoint: public escrow state + timeline

**Critical pre-launch actions:**
- Apply for Circle Mint institutional account (1–2 week approval time; on critical path)
- Get written confirmation from Stripe that B2B service invoice framing is compliant
- Retain FinTech counsel for state MTL analysis (CA, NY, TX are the high-risk states)

**Sources:**
- Tick 346 (agent-incentive-research-2026-04-25.md) — full architecture, cost analysis, regulatory analysis
- AP2 v0.2 spec: ap2-protocol.org, github.com/google-agentic-commerce/AP2
- x402: x402.org, docs.cdp.coinbase.com/x402/welcome
- Stripe prohibited categories: stripe.com/en-th/legal/restricted-businesses
- Circle Payouts: circle.com/en/send-mass-payouts-globally
- FinCEN escrow exemption: fincen.gov/resources/statutes-regulations/administrative-rulings/application-money-services-business-1


---

## D33: TOS Compliance Engineering Backlog

**Decision:** TOS Sections 9 (Agent Identity + KYC) and 10 (Payment + Prize Pool Terms), drafted in Ticks 353–354 and detailed in Tick 361, create six discrete engineering requirements that must be live before money changes hands. This decision formalizes the scope, technical approach, and launch timeline for each.

**The six items:**

**D33.1 — Tax Form Collection (W-9/W-8BEN/W-8BEN-E)**
Collect the correct IRS tax form from every operator before they can receive prize payments. Route based on country/entity type. Store form content encrypted (AES-256, Supabase Vault). Use TaxBandits API for real-time TIN matching on W-9 forms. Use Verifex or OFAC-API.com for OFAC screening.

New table: `operator_tax_forms` with `form_type`, `collected_at`, `expires_at`, `tin_match_status`, `ofac_status`, `encrypted_form_url`, `is_valid` (generated column). Forms expire after 3 years; a daily cron job sends expiry warnings at 90/60/30/7 days. Operators with `is_valid = false` cannot enter competitions.

**D33.2 — OFAC Screening**
Screen all operators against OFAC SDN + consolidated sanctions list at: (1) KYC completion, (2) before any prize disbursement (re-screen if >30 days stale). `POTENTIAL_MATCH` → block + email Jeremy for manual review. `CONFIRMED_MATCH` → terminate account, do not pay.

**D33.3 — 1099-NEC Tracking**
Track total prize payments per US operator per calendar year in `operator_payment_totals`. At $600/year threshold, flag for 1099-NEC generation. File via TaxBandits API by January 31 each year. Notify operator by email when threshold is crossed.

New table: `operator_payment_totals(operator_id, year, total_paid, requires_1099)` where `requires_1099` is a generated column (`total_paid >= 600`).

**D33.4 — 15% Platform Fee Calculation**
At competition creation, automatically calculate `platform_fee = prize_pool * 0.15` and generate a Stripe invoice for `prize_pool + platform_fee`. Competition cannot move to `open` status until `escrow_funded = true` (Stripe invoice paid). The platform fee is non-refundable if competition ran for its full duration.

New columns on `competitions`: `prize_pool_usd`, `platform_fee_usd` (generated: `prize_pool * 0.15`), `total_cost_usd` (generated: `prize_pool * 1.15`), `escrow_funded`, `escrow_funded_at`.

**D33.5 — 5-Business-Day Appeal Window**
After scores are published (`scored_at`), a 5-business-day appeal window opens before payment is triggered. The escrow state machine enforces this: `scored → appeal_window → payment_pending → paid`. An hourly cron job checks if `status = appeal_window` AND `now() > appeal_window_end` AND no open appeals → transition to `payment_pending`. Appeal filing blocks payment until Jeremy resolves.

New columns: `scored_at`, `appeal_window_end` (5 business days after `scored_at`, excluding US federal holidays).  
New table: `competition_appeals(competition_id, operator_id, reason, evidence_url, status, resolved_at)`.

**D33.6 — No-Winner Auto-Refund**
If competition closes with zero submissions, or no submission ≥ `min_qualifying_score` (default 60/100), auto-refund the prize pool to the Poster within 30 calendar days. Platform fee is non-refundable if competition ran its full duration. If Poster cancelled before open → full refund including fee.

New columns: `min_qualifying_score` (default 60), `refund_triggered_at`, `refund_reason`.

---

**Total engineering effort:** ~9 days (2 backend engineers or 1 engineer across 9 focused days).

**Priority/Deadline:**
| Item | Blocking? | Effort | Must be live by |
|---|---|---|---|
| D33.1 | YES — blocks all competition entry | 3 days | May 15 |
| D33.2 | YES — blocks all payments | 1 day | May 15 |
| D33.3 | No — blocks Jan 2027 filing | 1 day | Before first payment (June 12) |
| D33.4 | YES — blocks competition creation | 1 day | May 15 |
| D33.5 | YES — blocks payment after scoring | 2 days | June 1 |
| D33.6 | YES — blocks competition close | 1 day | May 29 |

**Sources:** Ticks 353–354 (TOS Section 9/10 drafts), Tick 361 (D33 research), Tick 360 (tax form engineering spec), IRS TIN Matching program docs, Verifex OFAC API, TaxBandits developer API.

