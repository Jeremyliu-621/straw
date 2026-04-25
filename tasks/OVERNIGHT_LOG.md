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
