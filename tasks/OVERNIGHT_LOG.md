# Overnight Log — feat/collab-philosophy

Branch: `feat/collab-philosophy`
Worktree: `.claude/worktrees/overnight-collab`
Started: 2026-04-24, evening
Loop: user is asleep, 2h dynamic loop firing to continue substrate work
North star: `tasks/AGENT_FIRST_DREAM.md`

---

## How to read this file

Each loop wake appends a new section. Each section lists:
- What block was worked on
- What landed (commits)
- What was tested
- What was deliberately skipped
- What's next

If a future Claude is resuming, read this from the bottom up. The most recent section tells you where to pick up.

---

## Block 0 — Setup (initial session, 2026-04-24)

**Goal:** Get the worktree, the philosophy, and Pass 1 (D15-D22 + quota bump + weight visibility) committed clean so substrate work can start on a fresh slate.

**What landed:**
- `tasks/AGENT_FIRST_DREAM.md` — the north star.
- `tasks/OVERNIGHT_LOG.md` — this file.
- Commit A: `fix(layout): use NEXT_PUBLIC_APP_URL for metadataBase` — pre-existing diff, unrelated to philosophy.
- Commit B: `feat(philosophy): collaborative-excellence model — D15-D22, quota 15/25, weights-public docs` — Pass 1.

**Tests run:** Vitest invariants + service tests (41 green during Pass 1 review session). `tsc --noEmit` clean.

**Skipped:** None at this stage.

**Next (Block 1):** SSE everywhere + polling-tax killer.

---

## Block 1a — Submission SSE stream + waitUntilDone (2026-04-24)

**Goal:** Kill the polling tax for `get_submission`. Daemons that just want the final score should burn no compute while waiting.

**What landed:**
- `src/lib/sse.ts` — generic SSE response helper. Heartbeats every 25s, 270s duration cap (under Vercel's 300s function timeout), abort-aware sleep, runner-error → SSE error event.
- `src/lib/sse.test.ts` — 11 tests covering wire-format, runner lifecycle, abort propagation, post-cancel emit safety.
- `src/services/submission.service.ts` — extracted `fetchSubmissionDetail`, `submissionStateFingerprint`, `TERMINAL_SUBMISSION_STATUSES`. Existing GET handler refactored onto the shared function (no behavior change; 13 existing detail-route tests still green).
- `src/app/api/v1/submissions/[id]/stream/route.ts` — SSE endpoint that polls the shared detail fetcher every 1.5s and emits `event: submission` only when the fingerprint changes; `event: terminal` on done. First call is synchronous so 401/403/404 surface as real HTTP errors, not silent stream-opens.
- `src/app/api/v1/submissions/[id]/stream/stream-route.test.ts` — 5 tests: auth gates + initial event + terminal-on-first-poll.
- `packages/agent-sdk/client.ts` — `submissions.stream()` (low-level, hand events to a callback) + `submissions.waitUntilDone()` (high-level, resolves with final detail, auto-reconnects past server-side duration caps, honors timeoutMs + AbortSignal). Plus `parseSSEStream` (signal-aware reader with explicit cancel-on-abort so synthetic streams in tests behave like real fetch).
- `packages/agent-sdk/sse.test.ts` — 6 tests: parsing, heartbeat ignore, multi-chunk reassembly, terminal resolution, timeout abort, error propagation.
- `packages/agent-sdk/index.ts` — exports `ParsedSSEEvent` type.
- `packages/mcp-server/src/tools/submissions.ts` — new `wait_for_submission` MCP tool that wraps `waitUntilDone`. Default 30-min timeout, configurable 10s–1h.

**Tests:** 195 green across `__tests__/`, services, `lib/sse`, `submissions/`, and `agent-sdk/`. `tsc --noEmit` clean.

**Skipped:** rate-limiting on the SSE endpoint (SSE replaces polling, so per-request rate-limit isn't the right control; per-agent open-stream count is the future shape — defer). Reconnect with `Last-Event-ID` (would need server-side event-id ordering; today reconnect just re-emits the latest snapshot which is functionally equivalent for this stream).

**Why the abstraction shape:** `fetchSubmissionDetail` lives in the service so future endpoints (cron sweeps, internal admin views, the eventual GraphQL layer) don't re-derive it. `parseSSEStream` lives in the SDK so any consumer — daemons, custom transports, future test harnesses — can use it without re-implementing the wire format.

**Next (Block 1b):** Leaderboard SSE stream (`/api/v1/tasks/[id]/leaderboard/stream`) + `subscribe_leaderboard` MCP tool.

---

## Block 1b — Leaderboard SSE stream + wait_for_leaderboard_change (2026-04-24)

**Goal:** Push semantics for the leaderboard. Daemons can react to opponent moves without polling. Sets up the second SSE surface and refactors the SDK's stream plumbing into reusable primitives.

**What landed:**
- `src/services/leaderboard.service.ts` — extracted `buildLeaderboard(db, taskId, callerUserId)` + `leaderboardFingerprint(payload)`. The existing GET `/api/v1/tasks/[id]/leaderboard` is refactored onto these (24 leaderboard tests still green).
- `src/app/api/v1/tasks/[id]/leaderboard/stream/route.ts` — SSE endpoint. Polls every 2s, emits `event: leaderboard` only on fingerprint change, `event: terminal` when the task closes.
- `src/app/api/v1/tasks/[id]/leaderboard/stream/stream-route.test.ts` — 6 tests: 401/400/404/400-draft auth+validation, initial-snapshot emit, terminal-on-close.
- `packages/agent-sdk/client.ts` — refactored. Inline submission stream + waitUntilDone replaced with three reusable primitives: `openSSE` (single-connection wrapper), `waitForStreamTerminal` (used by `waitUntilDone`), `waitForNextStreamChange` (used by `waitForLeaderboardChange`). New methods: `tasks.streamLeaderboard()`, `tasks.waitForLeaderboardChange()`. Net less code than before despite adding the leaderboard surface — the abstraction earns its keep.
- `packages/agent-sdk/sse.test.ts` — +2 tests: skip-initial-snapshot semantics, terminal-on-close mid-wait.
- `packages/mcp-server/src/tools/company.ts` — new MCP tool `wait_for_leaderboard_change`. Note: lives under company.ts because get_leaderboard does too, but it's universal — agents call it just as much as posters.
- `src/app/api/v1/submissions/[id]/stream/stream-route.test.ts` — `readStreamFully` test helper rewritten to force-cancel the reader after the cap (previous version blocked indefinitely on a read() that was waiting for the next poll cycle).

**Tests:** 333 green across `__tests__/`, services, sse, all `api/v1/`, and the SDK. `tsc --noEmit` clean.

**Why the SDK refactor was load-bearing:** without `openSSE` + `waitFor*` primitives, every new stream type would re-implement fetch + parse + abort wiring. Now adding `streamTaskEvents` (Block 1c) is a single function call.

**Next (Block 1c):** Task events stream (`/api/v1/tasks/[id]/events/stream`) — task lifecycle events (status changes, amendments, deadline shifts) for daemons that watch tasks they care about.

---

## Block 1c — Task events stream + wait_for_task_event (2026-04-24)

**Goal:** Third SSE surface — push lifecycle events to daemons watching a task. Status transitions (draft → open → evaluating → closed), deadline shifts, eval_mode flips, quota tweaks. Future Phase-20 amendments slot in for free because the fingerprint is field-list driven.

**What landed:**
- `src/services/task.service.ts` — added `fetchTaskEventSnapshot()` + `taskEventFingerprint()` + `TERMINAL_TASK_STATUSES`. Snapshot includes a `server_time` field so daemons can compute time-to-deadline without trusting client clock.
- `src/app/api/v1/tasks/[id]/events/stream/route.ts` — SSE endpoint, polls every 3s, emits `event: task` on fingerprint change, `event: terminal` on close.
- `src/app/api/v1/tasks/[id]/events/stream/stream-route.test.ts` — 5 tests: 401/400/404/initial-emit/terminal-on-close.
- `packages/agent-sdk/types.ts` — new `TaskEventSnapshot` interface.
- `packages/agent-sdk/index.ts` — re-exports `TaskEventSnapshot`.
- `packages/agent-sdk/client.ts` — `tasks.streamTaskEvents()` + `tasks.waitForTaskEvent()`. Both lean on the existing `openSSE` + `waitForNextStreamChange` primitives — net additions are 30 lines.
- `packages/agent-sdk/sse.test.ts` — +1 test for `waitForTaskEvent` skip-initial semantics.
- `packages/mcp-server/src/tools/tasks.ts` — new `wait_for_task_event` tool. Uses a custom formatter that includes a human-readable "in 19h 42m" countdown derived from `server_time` vs `deadline`.

**Tests:** 339 green across the affected surfaces. tsc --noEmit clean.

**Block 1 totals:** Three SSE endpoints + three matching MCP tools + one shared SDK plumbing layer (`openSSE`, `waitForStreamTerminal`, `waitForNextStreamChange`). Daemons can now react to submission scoring, leaderboard shifts, and task lifecycle events without any polling. The polling tax is dead.

**Next (Block 2):** Rich submission types — beyond `zip`. New `submission_kind` enum + `submission_payload` jsonb. Five kinds: `zip` (existing), `repo_url`, `live_endpoint`, `dockerfile`, `mixed`. This is the biggest single substrate unlock — daemons stop shipping code samples and start shipping products.

---

## Block 2a — Rich submission kinds: schema + validation foundation (2026-04-24)

**Goal:** Land the schema + validation layer for rich submission types so future loop wakes can add the worker branches without re-litigating the data shape or security model. Per-kind SSRF/scheme guards live in code now, with 35 unit tests covering the obvious attacks.

**What landed:**
- `supabase/migrations/031_rich_submission_kinds.sql` — `submission_kind text NOT NULL DEFAULT 'zip'` + `submission_payload jsonb` on `submissions`. CHECK constraint on the kind enum. Backwards-compatible (existing rows default to 'zip' / NULL). **NOT applied to prod** — file written, deferred to your next prod deploy.
- `src/constants.ts` — new `SUBMISSION_KIND` constant + `SUBMISSION_KINDS_SUPPORTED_BY_WORKER` set (currently `{ZIP}`; flips when 2b ships).
- `src/lib/submission-payload.ts` — Zod schemas for all 5 kinds + `isSafePublicUrl` SSRF guard + `validateSubmissionPayload(kind, payload)` dispatcher. Recursive validation for `mixed` with bounded recursion (nested mixed rejected by schema).
- `src/lib/submission-payload.test.ts` — 35 tests covering: SSRF guard (loopback, RFC1918, IPv6 ULA, link-local, cloud metadata, non-{http,https} schemes, malformed URLs), each kind's payload shape (positive + negative cases), mixed weight validation + nested-mixed rejection.
- `src/types/database.ts` — `Submission` + `SubmissionInsert` gain the new fields.
- `tasks/DECISIONS.md` — D23 added: full philosophy, security model, what ships now vs Block 2b deferred.

**Tests:** 809 green across the entire repo. tsc --noEmit clean.

**Why ship just the foundation tonight:** Worker integration per kind is deep work (cloning repos, probing live endpoints, building Dockerfiles inside the eval-container sandbox, fan-out for mixed). It's another 3-4 hours that would push past the 8-hour budget at quality. The schema + validation layer is solid groundwork that the next loop wake can build on without revisiting the data shape or SSRF policy.

**What's deferred to Block 2b (next loop wake):**
- Quick-submit + create-submission route changes to accept `kind` + `payload`.
- Eval worker branches per kind:
  - `repo_url`: `git clone --depth 1 <url> --branch <ref>` to tmpdir, then existing build-check + LLM judge flow as if the cloned tree were the unzipped artifact.
  - `live_endpoint`: prober that hits the URL with rubric-derived probes, captures responses, scores via committee.
  - `dockerfile`: `docker build` in the eval-container sandbox, then `docker run` with company-configured constraints.
  - `mixed`: parallel fan-out to per-part workers, weighted aggregation.
- Second-line DNS-time SSRF check in the worker (defends against rebinding; the validation library only catches obvious string-based attacks).
- SDK + MCP exposure (typed `submitRepoUrl`, `submitLiveEndpoint`, etc., plus tool descriptions).
- Tests: route-level acceptance tests + worker-side integration tests for each kind.

**Next (Block 3):** Persistent agent workspace — KV + file storage scoped to `agent_id`, persists across submissions and tasks. The third major substrate primitive.

---
