# STRAW ARCHITECTURE COUNCIL — TRANSCRIPT

## Subject: Submission Mode Architecture Decision
## Date: 2026-04-12
## Quorum: Three members present (Architect, Strategist, Practitioner)

---

## ROUND 1 — OPENING ARGUMENTS

---

### ARCHITECT (Systems Thinker)

Three submission modes means three execution backends, three sets of failure modes, three monitoring pipelines, three security surfaces, and three codepaths through evaluation. For a pre-launch product with a single founder, this is an existential maintenance burden masquerading as a feature.

Let me be specific about the operational cost. **API mode** requires the platform to make outbound HTTP calls to arbitrary endpoints, which means you need retry logic, timeout handling, TLS verification, response size enforcement, and you're now dependent on the agent builder's uptime. If their endpoint is down during evaluation, who's at fault? You need a whole dispute resolution layer. **Docker mode** requires a container orchestration layer — pulling images from registries, sandboxing with resource limits, volume mounting for output capture, cleaning up containers, handling OOM kills and zombie processes. This is not trivial. At 1000 concurrent agents, you're running a mini Kubernetes. **Upload mode** is actually the simplest from a platform perspective — you hand out a presigned URL and wait — but it's the hardest to enforce time constraints on, and it's the most disconnected from the platform's evaluation pipeline.

The clean abstraction I want to see is this: **one execution model**. Every submission produces an artifact — a file, a structured response, a directory of outputs. The *how* of producing that artifact should be the agent's problem, not the platform's. The platform should care about exactly two things: (1) receiving the artifact, and (2) evaluating it. If we can collapse all three modes into "agent produces output, platform evaluates output," we eliminate two-thirds of the infrastructure. My opening position is that Upload mode, generalized and made first-class, is the right primitive. The platform should not be in the business of running agent code.

---

### STRATEGIST (Business/Market Thinker)

I hear the Architect's desire for simplicity, and I respect it, but I want to ground this in competitive reality before we collapse anything.

Straw's core value proposition is that it replaces vendor demos with objective, competitive evaluation. That only works if agents can actually *compete*. If we force Upload-only, we immediately lose the fastest-growing segment of the market: **autonomous agents**. Claude, GPT-4, and every agent framework being built right now (AutoGPT, CrewAI, LangGraph, OpenAI's Assistants API) are designed to run continuously and respond to API calls. They don't produce static artifacts — they process inputs dynamically. A consulting firm that wants to evaluate "which coding agent can fix our real bugs" needs to send each agent the same bug and compare the patches. That's API mode or Docker mode. Upload mode makes that task look like Kaggle, and Kaggle is exactly the wrong comp. Kaggle is for data scientists who spend weeks tuning models. Straw is for AI agents that respond in seconds. The whole pitch is "post a task, watch agents compete in real-time, hire the winner." If submission takes days via upload, you've killed the magic.

Look at what SWE-bench does: they run agents in sandboxes against real GitHub issues. That's Docker mode. Look at what companies actually want to evaluate: "can this agent handle our customer support tickets?" That's API mode. The TAM for "upload a CSV and we'll score it" is shrinking. The TAM for "plug in your agent and we'll benchmark it live" is exploding. My position is that we need at least API and Docker mode to be credible in the market. But I'm open to how we simplify the implementation. I don't want three sloppy backends — I want the right two, done well.

One more thing: a YC partner would ask "what's your wedge?" If the answer is "we're a better Kaggle," that's a losing pitch. If the answer is "we're the CI/CD pipeline for AI agent procurement," that's a winner. CI/CD pipelines run code. They don't accept uploads.

---

### PRACTITIONER (Builder/User Empathy)

I've built agents. Let me tell you what actually happens in practice, because both of you are reasoning from architecture diagrams, not from the terminal.

When I'm building an agent and I want to test it against a benchmark, the first thing I do is look at the docs. If the docs say "build a Docker image, push it to a registry, configure these 14 environment variables, and submit" — I close the tab. That's a 45-minute yak-shave before I even know if the platform is worth my time. This is the Docker-first trap. Docker mode is powerful and correct for sandboxed evaluation, but it's terrible as the *first* thing a user encounters. The "aha moment" needs to happen in under 5 minutes. The Architect is right that we need to simplify. The Strategist is right that we can't drop live execution. But both of you are missing the sequencing problem.

Here's what an agent builder actually wants. Day 1: "I have a FastAPI server running on localhost. I want to point Straw at it and see a score." That's API mode, and it should work with `straw submit --endpoint https://my-agent.fly.dev/solve`. Day 30: "My agent is production-grade. I want to submit a Docker image so Straw can run it in a controlled sandbox for a Fortune 500 evaluation." That's Docker mode, and it's the graduation path. Day never, for most users: "I want to manually download inputs, work offline for a week, and upload results." That's Upload mode, and it serves a niche I'm not convinced exists in our target market.

My position: API mode is the onboarding wedge. Docker mode is the enterprise-grade path. Upload mode is a distraction. But — and this is critical — the evaluation side must be identical regardless of submission mode. The agent produces output. The evaluator scores output. The submission mode is just the transport layer. If we nail that abstraction, supporting two modes is not twice the work — it's the same evaluation pipeline with two input adapters.

---

## ROUND 2 — DIRECT RESPONSES

---

### ARCHITECT, responding to STRATEGIST and PRACTITIONER

The Strategist's point about competitive positioning is well-taken. I was wrong to suggest Upload as the universal primitive — or rather, I was right about the abstraction but wrong about the interface. The Practitioner nailed why: the abstraction should be "agent produces output, platform evaluates it," but the *transport mechanism* matters enormously for developer experience.

However, I want to push back on something the Strategist said. You compared Straw to CI/CD and said "CI/CD pipelines run code." That's true, but GitHub Actions doesn't run your code on GitHub's infrastructure by default — it provisions a runner, and *the runner* executes your code. The platform orchestrates; it doesn't host. When the Strategist says we need API mode, what you're really saying is we need a way to send input to an agent and capture its output. When you say we need Docker mode, you're saying we need a way to run untrusted code in a sandbox. Those are two very different infrastructure commitments.

Here's where I land after hearing both of you. I agree: drop Upload mode. It's a different product for a different user. I agree: API mode is the right onboarding wedge — it's the lowest infrastructure cost for us and the lowest friction for the builder. But I want to flag the real cost of Docker mode. At scale, running arbitrary Docker containers is a security and ops nightmare. We need gVisor or Firecracker-level isolation, not just `--network none`. A Fortune 500 security team will ask "what prevents a malicious container from escaping the sandbox?" and `docker run` with flags is not a sufficient answer. So my revised position is: **API mode now, Docker mode later, and design the evaluation pipeline so both produce the same artifact format from day one.** The Docker investment should happen when we have enterprise customers asking for it, not before.

---

### STRATEGIST, responding to ARCHITECT and PRACTITIONER

The Practitioner's sequencing argument is the strongest thing said in this room so far. I was conflating "what we need to be credible" with "what we need at launch." Those are different questions. At launch, we need to be credible to agent *builders*. They'll evaluate us on "how fast can I get a score for my agent." API mode wins that race. We don't need Docker to attract our first 100 agent builders.

But I want to sharpen one point. The Architect says "Docker mode later." I accept that for the *execution* side. But I want to separate execution from evaluation. The *evaluation* side should support Docker from day one — meaning companies can upload a custom eval container. Why? Because the company side of the marketplace is where the money is. A company posts a task, defines evaluation criteria, agents compete. If the eval is limited to "LLM judge" at launch, enterprise buyers won't trust the results. A CTO will say "I want to run my own test suite against the submissions." That requires running the company's Docker-based evaluator, not the agent's Docker image.

So here's my revised position: I agree with dropping Upload mode. I agree API mode is the agent submission method at launch. But I want Docker supported on the *evaluation* side from day one. And I want the API to be designed so that adding Docker-based agent submission later is a configuration change, not a rewrite. The Architect's "same artifact format" point is exactly right — if both API and Docker submissions produce a standardized output artifact, then the evaluation pipeline doesn't care how the output was generated. We should codify that artifact contract now.

---

### PRACTITIONER, responding to ARCHITECT and STRATEGIST

I think we're converging fast. Let me validate what I'm hearing and sharpen the remaining disagreements.

The Architect says: API mode is low-cost for us and low-friction for builders. Agreed completely. The Strategist says: Docker eval containers from day one, because that's what makes enterprise buyers trust us. Also agreed — and this is a distinction I should have made in my opening. The Docker complexity I was warning about is *agent execution* in Docker, not *evaluation execution* in Docker. Running an eval container provided by the company is a much more constrained problem: the company is a trusted party (they're paying us), the eval container receives a well-defined input (the agent's output artifact), and it produces a well-defined result (a score). That's not "running arbitrary untrusted code" — that's running a customer's test harness.

Here's where I want to push on one remaining point. The Architect said to design the system so Docker agent submission is "a configuration change, not a rewrite." I'd go further. Let me propose the specific artifact contract. Every agent submission, regardless of mode, produces a **Submission Artifact** — a JSON manifest plus associated files. API mode: the platform POSTs to the agent's endpoint, receives a response, wraps it into the artifact format, and stores it. Docker mode (future): the platform runs the container, captures `/output/`, wraps it into the artifact format, stores it. The evaluator receives the artifact and produces a **Score Result** — a JSON document with numeric scores, pass/fail, and optional commentary. If we define these two contracts in the SDK now, adding Docker agent submission later is literally "write a new adapter that maps container output to the artifact contract." No evaluation changes. No scoring changes. No leaderboard changes.

My final position: **API-only agent submission at launch. Docker-based evaluation from day one. Upload mode dropped. Artifact contract codified in the SDK as the stable interface between submission and evaluation.**

---

## ROUND 3 — CONVERGENCE

---

### ARCHITECT

The Practitioner's artifact contract proposal is exactly the clean abstraction I was looking for. I want to formally agree with the full position as stated: API agent submission, Docker eval, drop Upload, artifact contract as the stable interface. Let me add one architectural constraint to the recommendation: the artifact contract should include a schema version field so we can evolve it without breaking existing evaluators. And the eval container interface should be specified as "receives artifact at `/input/`, writes score to `/output/score.json`" — simple, filesystem-based, no SDK dependency required for evaluators. This keeps the eval side language-agnostic.

I have no remaining disagreements. I'm ready to vote.

---

### STRATEGIST

Agreed on all points. Let me add the business framing for the recommendation. This architecture gives us a clear narrative: "Submit your agent via API in 5 minutes. Get scored by the company's own test suite. See where you rank." That's the pitch. That's the wedge. And when enterprise customers say "we need sandboxed execution," we say "Docker agent submission is on the roadmap, and the evaluation pipeline already supports it — it's the same artifact contract." That's a credible answer that doesn't require us to build a container orchestration platform before we have product-market fit.

The only thing I want to ensure is in the recommendation: we should explicitly plan for Docker agent submission as a Phase 2 milestone, not an indefinite "someday." I'd say: trigger the Docker work when we have 3+ enterprise customers requesting sandboxed execution, or when we hit 500 active agent builders, whichever comes first. That gives us a concrete gate.

I have no remaining disagreements. I'm ready to vote.

---

### PRACTITIONER

Both additions are strong. The schema version field prevents the kind of breaking change that makes developers rage-quit a platform. The filesystem-based eval interface means a company can test their evaluator locally with `docker run -v ./test-artifact:/input eval-image` before uploading it. That's excellent DX on the company side, which we've been under-discussing.

And the Strategist's Phase 2 gate is the right way to handle Docker agent submission — it's not "never," it's "when the market signal is clear." Until then, every hour spent on Docker sandbox orchestration is an hour not spent on the evaluation pipeline, the leaderboard, the scoring system, and the actual marketplace dynamics that determine whether Straw lives or dies.

I have no remaining disagreements. I'm ready to vote.

---

## UNANIMOUS RECOMMENDATION

**Vote: 3-0. Unanimous.**

---

### Phase 1 (Launch)

**Agent Submission: API mode only.**
- Agent builder provides an HTTPS endpoint.
- Platform POSTs task input (JSON), receives response.
- 5-minute timeout, 50MB response cap.
- Response is wrapped into the **Submission Artifact** format and stored.
- The `@straw/agent-sdk` provides helpers for building compliant endpoints.

**Evaluation: Docker eval containers + LLM judge.**
- Companies can provide a Docker image as a custom evaluator, OR use the built-in LLM judge (Gemini).
- Eval container interface: receives artifact at `/input/submission/`, writes results to `/output/score.json`.
- Score result schema: `{ schema_version: "1.0", scores: Record<string, number>, pass: boolean, commentary?: string }`.
- This is trusted-party execution (the company is paying us), so the security model is different from running arbitrary agent code.

**Artifact Contract (codified in SDK from day one):**
```
SubmissionArtifact {
  schema_version: "1.0"
  submission_id: string
  task_id: string
  agent_id: string
  mode: "api" | "docker"        // extensible enum
  timestamp: ISO8601
  response: {
    body: object | string
    latency_ms: number
    status_code?: number
  }
  files?: Array<{               // for future Docker mode
    path: string
    size_bytes: number
    checksum_sha256: string
  }>
}
```

**Drop Upload mode entirely.** Remove from the codebase, docs, and SDK.

### Phase 2 (Triggered by market signal)

**Gate:** 3+ enterprise customers requesting sandboxed execution, OR 500 active agent builders.

**Agent Submission: Add Docker mode.**
- Agent builder provides a Docker image.
- Platform runs in Firecracker/gVisor sandbox (not bare `docker run`).
- Container writes output to `/output/`, wrapped into same Submission Artifact format.
- Evaluation pipeline unchanged — it already consumes the artifact contract.
- This is an adapter addition, not a rewrite.

### What This Means for the Codebase

1. Remove Upload mode code, routes, UI, and SDK methods.
2. Codify `SubmissionArtifact` and `ScoreResult` as Zod schemas in the SDK.
3. Refactor evaluation pipeline to consume `SubmissionArtifact` as its sole input type.
4. Ensure API submission wraps responses into `SubmissionArtifact` before passing to evaluation.
5. Keep the `mode` field as an extensible union so Docker can be added without a schema version bump.
6. Document the eval container filesystem interface (`/input/`, `/output/score.json`) as a stable contract.

---

*Council adjourned.*
