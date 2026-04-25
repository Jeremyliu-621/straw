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

## Block 3a — Persistent agent workspace KV (2026-04-25, early am)

**Goal:** Substrate primitive #3 from the dream doc. Daemons that can remember things across submissions and tasks build up knowledge over time. KV first; file storage deferred to 3b.

**What landed:**
- `supabase/migrations/032_agent_workspace_kv.sql` — `agent_workspace_kv (agent_id, key, value jsonb, size_bytes generated, timestamps)`. RLS enabled with per-policy owner scopes. updated_at trigger. Composite primary key on (agent_id, key). NOT applied to prod.
- `src/constants.ts` — `WORKSPACE_KV_*` constants: 10k keys / 1MB per value / 10MB total / 200-char key length / regex of allowed key chars.
- `src/services/workspace.service.ts` — `validateKey`, `valueSizeBytes`, `getWorkspaceEntry`, `setWorkspaceEntry` (with 3-tier quota enforcement), `listWorkspaceEntries` (prefix + cursor pagination, sorted by updated_at desc, metadata-only), `deleteWorkspaceEntry` (idempotent), `getWorkspaceQuota`. 15 unit tests covering validation, quota cases, list pagination shape, and quota snapshot computation.
- `src/app/api/v1/workspace/kv/[key]/route.ts` — GET/PUT/DELETE with shared service-error mapper.
- `src/app/api/v1/workspace/kv/route.ts` — GET list endpoint (prefix + limit + cursor).
- `src/app/api/v1/workspace/quota/route.ts` — GET quota endpoint.
- `packages/agent-sdk/types.ts` — `WorkspaceEntry`, `WorkspaceKeyMetadata`, `WorkspaceListResult`, `WorkspaceQuotaSnapshot`.
- `packages/agent-sdk/index.ts` — re-exports.
- `packages/agent-sdk/client.ts` — `WorkspaceResource` with `get/set/delete/list/quota`.
- `packages/mcp-server/src/tools/workspace.ts` — five MCP tools mirroring the SDK + a `workspace_quota` tool with a percentage-used display.
- `packages/mcp-server/src/index.ts` — registers the new tools and updates the server instructions block.
- `tasks/DECISIONS.md` — D24 added: full philosophy, security model, quota math, what's deferred to 3b.

**Tests:** 824 green across the entire repo (was 809 before this block). tsc --noEmit clean.

**Why ship just the KV tonight:** File storage requires presigned-upload integration with Supabase Storage (a different surface than the DB-backed KV). The KV alone is the most useful primitive — daemons can persist drafts, learnings, draft submissions, scratch state — without needing to build their own data layer. File storage is a clean follow-on once the KV pattern is validated in the wild.

**What's deferred to Block 3b:**
- `agent_workspace_files (agent_id, path, storage_ref, size_bytes, created_at)` table.
- `POST /api/v1/workspace/files` for presigned-upload + `GET /api/v1/workspace/files/[path]` for download + `DELETE` for removal.
- Storage bucket `agent-workspace` with RLS (or path-prefixed convention) for per-agent isolation.
- 100MB-per-agent files quota.
- SDK + MCP file tools.

**Next (Block 4):** Dialogic eval — `POST /api/v1/submissions/[id]/ask` (block on a question to the eval committee), `POST /api/v1/submissions/[id]/patch` (deltas instead of full re-zip), `POST /api/v1/submissions/[id]/request_re_eval`. Substrate primitive #4. Worth running BEFORE Block 2b (worker integration for rich submission types) because both touch the same eval-worker code paths and dialogic eval is more contained.

---

## Final session wrap (2026-04-25, early am)

**What this last commit ships:**
- `/api/docs` JSON spec extended with the three new SSE endpoints + the five workspace endpoints. Daemons reading the machine-readable docs will now discover them.
- `tasks/HANDOFF.md` — comprehensive handoff for waking up: commit-by-commit summary, what's verified vs not, recommended merge order, migration application notes, smoke-test recipe, what was deliberately skipped.

**Final state:** 7 commits on `feat/collab-philosophy` (4 substrate features + 1 philosophy reframe + 1 layout fix orphan + this docs/handoff commit). 824 tests green. tsc --noEmit clean. Nothing pushed, nothing migrated to prod. Two new `.sql` migration files (031, 032) waiting for the next deploy.

The substrate primitive scoreboard from `tasks/AGENT_FIRST_DREAM.md`:

| # | Primitive | Status |
|---|---|---|
| 1 | Rich submission types | Schema + validation shipped (D23, 2a). Worker branches deferred (2b). |
| 2 | SSE everywhere | **Done.** Three streams: submissions, leaderboard, task events. SDK helpers + MCP tools. |
| 3 | Persistent agent workspace | KV shipped (D24, 3a). Files deferred (3b). |
| 4 | Dialogic eval | Not started. Recommended next. |
| 5 | Massive MCP surface | Grew from ~10 to ~17 tools tonight. More follow as primitives 1/3/4 finish. |
| 6 | Cross-task semantic search | Not started. |
| 7 | Long-running checkpoints | Not started. |

Three of seven primitives substantively progressed in one overnight session. Subsequent loop wakes can pick up from `HANDOFF.md` cleanly.

---

## Loop wake 2 — Block 4a — Dialogic eval: request_re_eval (2026-04-25)

**Goal:** Start substrate primitive #4 (dialogic eval). The eval committee should be a collaborator, not a dictator. First step: let a daemon ask for a fresh score on the same artifact when they suspect a fluke or when their live_endpoint state changed.

**What landed:**
- `src/services/submission.service.ts` gains: `RE_EVAL_COOLDOWN_MS` (1 hour), `RE_EVAL_ALLOWED_STATUSES` (completed/failed/evaluation_failed only), `checkReEvalEligibility(db, submissionId, agentId)` (pure-ish validator: ownership + task-open + status + cooldown + artifact present), `clearSubmissionForReEval(db, submissionId)` (delete eval result + reset submission status).
- `src/app/api/v1/submissions/[id]/request_re_eval/route.ts` — POST endpoint that wires eligibility + clear + enqueue + audit log + 202 response. Each rejection path returns its own structured error code (TASK_CLOSED, WRONG_STATUS, RE_EVAL_COOLDOWN, NO_ARTIFACT, FORBIDDEN, NOT_FOUND).
- `src/app/api/v1/submissions/[id]/request_re_eval/re-eval-route.test.ts` — 8 cases: 401, 404, 403, 409 (task_closed), 409 (wrong_status), 429 (cooldown), 409 (no_artifact), 202 happy path.
- `packages/agent-sdk/client.ts` — `client.submissions.requestReEval(id)` returning the typed response shape.
- `packages/mcp-server/src/tools/submissions.ts` — new `request_re_eval` MCP tool with formatter explaining the iteration + next-step (use wait_for_submission to block on the new score).
- `tasks/DECISIONS.md` D25 — full record: why, mechanics, cooldown rationale, what's in 4b/4c, what was rejected.

**Tests:** 54 green across the affected surfaces (`packages/agent-sdk`, `src/services/submission.service`, `src/app/api/v1/submissions`). tsc --noEmit clean.

**Migration footprint:** zero. Re-eval delete-and-replaces the existing eval row, so no schema change is needed today. Future Block 4a-stage-2 can add an `iteration` column for history preservation; the API already exposes `iteration` so consumers won't break.

**Why I scoped 4a tight:** preserving eval history would have required dropping the UNIQUE on `evaluation_results.submission_id` plus updating every read site (fetchSubmissionDetail, buildLeaderboard, the worker insert) to handle multiple rows per submission. That's another 90+ minutes and the user's "don't finish at 99.9%" message is more valuable spent on the next primitive.

**Next (Block 4b):** `POST /api/v1/submissions/[id]/ask` — block on a clarifying question routed through the eval pipeline. The agent gets a free-form answer scoped to their submission + the rubric + the latest judge reasoning. Uses existing Gemini integration; rate-limited per submission so it can't be abused into a free chat session.

---

## Block 4b — KILLED. Pivoted to Block 3b (workspace files) (2026-04-25)

**Why I dropped 4b:** The user pushed back on `ask` and was right. The daemon already has access to the rubric, weights, the full judge reasoning, dimensions, and its own submission contents. Routing its question through a stateless Gemini call returns at best a re-interpretation of context the daemon already has — no new information enters the system. It's middleware dressed up as a feature, not a substrate primitive. Killed before any of it was committed.

The two ways to actually add information would be (a) cross-submission context (Phase 20a, open visibility) or (b) per-daemon committee breakdown (Phase 20d, multi-daemon eval). Neither is `ask`-shaped.

Lesson worth noting: every new endpoint should be checked against "what new information does this give the daemon that they couldn't compute themselves?" If the answer is "nothing," it's gimmicky.

---

## Block 3b — Persistent agent workspace files (2026-04-25)

**Goal:** Pair with D24 (workspace KV) to complete substrate primitive #3. Daemons cache binaries, datasets, model weights, scrape outputs across submissions and tasks. Real cost-and-latency reduction for agents whose work involves heavy computation.

**What landed:**
- `supabase/migrations/033_agent_workspace_files.sql` — `agent_workspace_files (agent_id, path, storage_ref, size_bytes, content_type, timestamps)` table. Composite PK on (agent_id, path), idx on (agent_id, updated_at desc), updated_at trigger, RLS owner-only policies. **NOT applied to prod.** Bucket `agent-workspace` must be created manually in the Supabase dashboard.
- `src/constants.ts` — `WORKSPACE_FILES_*` constants: 1k files / 25MB per file / 100MB total / 512-char path / regex.
- `src/services/workspace-files.service.ts` — full CRUD with quota enforcement. Two-phase upload (Storage first, metadata second) with best-effort cleanup on failure. Idempotent delete. Path validation with explicit `..` and absolute-path rejection. 16 service unit tests.
- `src/app/api/v1/workspace/files/route.ts` — POST upload (accepts both JSON+base64 and raw octet-stream-with-headers shapes) + GET list.
- `src/app/api/v1/workspace/files/[...path]/route.ts` — catch-all for per-file ops: GET (download or `?metadata=1`) + DELETE.
- `src/app/api/v1/workspace/files/quota/route.ts` — per-agent files-quota snapshot.
- `packages/agent-sdk/types.ts` — `WorkspaceFileMetadata`, `WorkspaceFilesListResult`, `WorkspaceFilesQuotaSnapshot`.
- `packages/agent-sdk/index.ts` — re-exports.
- `packages/agent-sdk/client.ts` — `client.workspace.uploadFile/downloadFile/fileMetadata/deleteFile/listFiles/filesQuota`.
- `packages/mcp-server/src/tools/workspace.ts` — 6 new MCP tools (`workspace_upload_file`, `workspace_download_file`, `workspace_file_metadata`, `workspace_delete_file`, `workspace_list_files`, `workspace_files_quota`). All accept/return base64 for binary safety in the JSON-only MCP transport.
- `packages/mcp-server/src/index.ts` — server instructions block updated to mention the new file tools + `request_re_eval`.
- `tasks/DECISIONS.md` D26 — full record: storage architecture, why-pair-with-KV, manual deploy step, what was rejected (presigned URLs, versioning, range requests).

**Tests:** 848 green across the entire repo (was 832 before this block). tsc --noEmit clean.

**Substrate primitive scoreboard (updated):**

| # | Primitive | Status |
|---|---|---|
| 1 | Rich submission types | Schema + validation shipped (D23, 2a). Worker branches deferred (2b). |
| 2 | SSE everywhere | **Done.** Three streams + SDK + MCP. |
| 3 | Persistent agent workspace | **Done.** KV (D24) + files (D26). |
| 4 | Dialogic eval | request_re_eval shipped (D25). `ask` killed as gimmicky; `patch` deferred (4c). |
| 5 | Massive MCP surface | **~24 tools** now (started session at ~10). |
| 6 | Cross-task semantic search | Not started. |
| 7 | Long-running checkpoints | Not started. |

**Next (Block 4c or pivot):** `patch` submissions are real engineering — server stores deltas, applies them to the last submission's tree at re-eval time. Or pivot to substrate primitive #6 (cross-task semantic search via pgvector) which is a self-contained piece. The next loop wake should pick based on what feels most under-served.

---

## Block 6a — Cross-task FTS search (2026-04-25)

**Goal:** Substrate primitive #6 from the dream doc. Daemons should be able to search across the full task corpus, not just list with one or two filter knobs. FTS first; pgvector embeddings come in 6b (substantively different capability).

**What landed:**
- `supabase/migrations/034_task_search.sql` — `tasks.search_tsv` generated tsvector column with `setweight` per field (title=A, category=B, description=C, specs=D). GIN index. **NOT applied to prod.** Generated columns auto-populate on writes and re-index on reads, so zero application maintenance.
- `src/services/search.service.ts` — `searchTasks(db, opts)` using `websearch_to_tsquery` via supabase-js `textSearch`. Cursor pagination via `${created_at}|${id}`. Default status filter excludes drafts.
- `src/services/search.service.test.ts` — 5 cases: empty query rejection, oversize query rejection, pagination has_more, single-page no-cursor, rank attached.
- `src/app/api/v1/search/tasks/route.ts` — `GET /api/v1/search/tasks` with full query/status/category/limit/cursor parsing.
- `packages/agent-sdk/types.ts` + `index.ts` + `client.ts` — `SearchResource` + `client.search.tasks(opts)` + types.
- `packages/mcp-server/src/tools/search.ts` — `search_tasks` MCP tool with budget+deadline-aware formatter.
- `packages/mcp-server/src/index.ts` — registered + instructions block updated.
- `tasks/DECISIONS.md` D27 — full record: weighting, default filter rationale, rank caveat (synthetic today, real ts_rank via RPC in 6a-stage-2), Block 6b roadmap (pgvector + embeddings), what was rejected.

**Tests:** 853 green across the entire repo (was 848 before this block). tsc --noEmit clean.

**Rank caveat documented:** the API returns `rank: number` but it's currently a position-based stub (1, 0.95, 0.9...) because supabase-js's typed builder doesn't expose `ts_rank`. Block 6a-stage-2 wires the real value via a Postgres RPC. The contract field is stable so consumers won't need to change when that lands.

**Substrate primitive scoreboard (updated):**

| # | Primitive | Status |
|---|---|---|
| 1 | Rich submission types | Schema + validation shipped (D23, 2a). Worker branches deferred (2b). |
| 2 | SSE everywhere | **Done.** |
| 3 | Persistent agent workspace | **Done.** KV (D24) + files (D26). |
| 4 | Dialogic eval | request_re_eval shipped (D25). `ask` killed. `patch` deferred. |
| 5 | Massive MCP surface | **~25 tools** now. |
| 6 | Cross-task search | FTS shipped (D27, 6a). pgvector embeddings deferred (6b). |
| 7 | Long-running checkpoints | Not started. |

5 of 7 primitives substantively shipped (with sub-blocks remaining). The schema-only primitives (1) and the missing one (7) are the next horizons.

**Next:** Either Block 7 (long-running checkpoints — let an agent save partial progress, get a non-binding sanity score, keep going), Block 6b (pgvector embeddings — semantic similarity), or Block 2b (worker integration for the rich submission kinds we already validated). Loop wake operator picks based on bandwidth vs depth.

---

## Polish pass — human /docs page + HANDOFF refresh (2026-04-25, end of loop window 2)

**Why polish here:** with ~40 min left in this loop window, shipping another partial substrate block would leave more loose ends than completing existing surface. The human-readable `/docs` page (the rendered HTML at `straw.dev/docs`) was missing every substrate API added this session — daemons reading the page for integration would think SSE / workspace / search / re-eval don't exist. That's a real bug for a platform whose value depends on agent discoverability.

**What landed:**
- `src/app/docs/page.tsx` — added section 11 "Substrate APIs (D24-D27)" with subsections for SSE streams, dialogic eval (request_re_eval), workspace KV, workspace files, cross-task search, and rich submission types (schema-only). Each subsection lists endpoints with method badges and a short usage paragraph. TOC updated; rate-limits section renumbered to 12.
- `tasks/HANDOFF.md` — commits 8-12 added to the table, substrate-primitive scoreboard, recommended merge order extended (with the manual Storage bucket creation step for D26), what's-not-done list refreshed (Block 7, 6b, 4c, etc.).
- `tasks/OVERNIGHT_LOG.md` — this entry.

**Tests:** unchanged (853 green; no code paths touched). tsc --noEmit clean.

**Discipline note for future loop wakes:** when a polish move is honestly higher-leverage than another partial block, take the polish. The user's "don't finish at 99.9%" guidance is about not declaring done while substantive primitives are missing — not about always shipping more. Documentation drift is a real bug; if `/docs` says A and the API does B, daemon-builders waste hours.

---
