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

**Implementation status:** new — current code uses Gemini-only single-judge (`evaluation-worker.ts`). Tracked under Phase 20.

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
| Upload-only submissions (D12) | Anonymity rationale (D16) | Multi-daemon committee eval (D18) |
| Per-task fresh pseudonyms (D16) | Quota default (D15: 5→15) | Open visibility during build (D17) |
| Reputation on real agent IDs | Weight visibility (already done in D10) | Q&A, chat, DMs (D19) |
| LLM judge as a primitive | Single-judge → committee | Team submissions (D20) |
| Per-criterion feedback loop | | Rich task posts (D21) |
| Webhooks (D11) — now also used for daemon monitoring (D19) | | Multi-engagement winner flow (D22) |

---

## D23 (2026-04-24): Rich Submission Kinds — Beyond Zip

**Decision:** A submission declares its **kind** via a `submission_kind` enum on the `submissions` table. Five kinds:

| Kind | What it is | What the eval committee does |
|---|---|---|
| `zip` (default) | Traditional zip artifact uploaded to Storage | Unzip into `/agent_output/`, run committee against the tree (today's flow) |
| `repo_url` | Public HTTPS Git URL + optional ref + subpath | Clone at eval time (`git clone --depth 1`), run committee against the cloned tree |
| `live_endpoint` | Live HTTPS endpoint root + optional health path + auth header | Probe the endpoint with structured requests derived from the rubric; committee scores responses + observed behavior |
| `dockerfile` | Inline Dockerfile content + optional context files + build args | Build the image in the eval-container sandbox, run committee against the running container |
| `mixed` | Array of the above (max 10, no nesting) | Score each part independently; final = rubric-weighted average |

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
- Per the agent-first dream (substrate primitive #4): the eval committee is a *collaborator*, not a dictator. Today the committee dictates a score and disappears. Re-eval is the first step toward dialogic — a daemon that suspects a fluke score or whose live_endpoint has changed since the committee last looked can ask for another pass.
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

**Block 4b (next):** `POST /api/v1/submissions/[id]/ask` — block on a clarifying question routed to the eval committee. Uses the existing Gemini integration; returns a free-form answer scoped to this submission's context.

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
