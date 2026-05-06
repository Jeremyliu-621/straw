---
type: research
status: active
last_updated: 2026-05-06
test_subject: Dog v2 (OpenClaw)
test_date: 2026-05-06
---

# OpenClaw agent-first test — 2026-05-06

The first time an autonomous daemon competed on Straw via `/api/docs` cold, with no hardcoded driver. Dog v2 (replacing a prior Dog that was acting up) was given an API key + base URL `https://straw.wiki` + the brief from the previous session — nothing else. It chose the HTTP `/api/docs` path over MCP and made a real submission against task `c36a63d7-5373-4f24-8c59-63b60b8c7f73`.

This is the test of whether `tasks/AGENT_FIRST_DREAM.md`'s thesis ("the API IS the platform; the substrate is the test") holds in practice. **Verdict: thesis holds for discovery + submission, fails for evaluation reliability.** Dog discovered, built, submitted. The eval loop chocked.

---

## Three findings (Dog's words, lightly cleaned)

### 1. Expired tasks still appear as open — `severity: annoying`

> **Where:** `GET https://straw.wiki/api/public/tasks`
>
> **Expected:** docs say tasks close at deadline. Public listing should not show clearly expired tasks as still open.
>
> **Observed:** multiple tasks past deadline returned with `status: "open"`:
> - `ff2cdf00-8e45-4a70-afe7-7e3fb101eac4` — deadline 2026-05-02, still open
> - `8075f725-8857-4087-b9e0-cfe41ac6ec95` — deadline 2026-04-23, still open
> - `16e99706-b5f3-4535-88da-871d60d0a2e0` — deadline 2026-04-19, still open

**Root cause:** `src/app/api/public/tasks/route.ts:18` filtered by `status="open"` only — no defensive `deadline > now()` filter. The close-tasks cron (`vercel.json` schedule `0 0 * * *`) runs daily at midnight UTC, so a task expiring mid-day stays `status="open"` for up to 23 hours before transitioning. Plus the cron may not fire reliably (no monitoring on it).

**Fix shipped 2026-05-06:** added `.gt("deadline", new Date().toISOString())` to the public-tasks query. Deployed via `vercel deploy --prod`. Verified live.

**Open follow-up:** check whether the close-tasks cron is actually firing in prod. The 3 expired tasks above suggest it isn't — they should have transitioned to `closed` long ago.

---

### 2. Quick-submit produces "completed" submission with no eval result — `severity: blocking`

> **Where:** `POST /api/v1/tasks/:id/quick-submit` then `GET /api/v1/submissions/:id`
>
> **Expected:** docs say quick-submit auto-starts evaluation. Polling should return score/breakdown once eval completes.
>
> **Observed:** Dog submitted to `c36a63d7-5373-4f24-8c59-63b60b8c7f73`, got submission `69c47e9d-0e8e-434f-a116-529d2a86fd00`. Status flipped to `completed` immediately, but `evaluated: false`, `scores: null`, `dimensions: []`, `position: null` — and stayed there across multiple polls.

**Root cause:** **queue mismatch between web app and worker.** I had updated `REDIS_URL` on Vercel via `vercel env add` the previous session, but the running prod web app deployment was 2 days old (predating the env edit). Vercel env changes apply only to *new* deployments. So the running web app enqueued Dog's job to whatever Redis it was deployed with — different from the Upstash my eval-worker was draining. Dog's job sat in an unreached queue. Submission marked `status: completed` because that's the upload-done flag; eval never ran because no consumer.

**Fix shipped 2026-05-06:** `vercel deploy --prod` triggered a fresh deployment that picked up the corrected REDIS_URL. Confirmed — the new worker drained Dog's submission within seconds when re-eval was triggered.

**Lesson captured:** see `tasks/lessons.md` "Vercel env changes only apply to NEW deployments" entry.

**New blocker that surfaced from this fix:** when re-eval ran on Dog's submission against the now-correct queue, Gemini returned malformed JSON (line 7 col 6 — bad array syntax) on the first try, then 503 Service Unavailable on the next two retries. Worker marked `evaluation_failed`. Two distinct LLM-layer reliability issues — not a queue/infra issue, see Issue 4 below.

---

### 3. API semantics around submission status are unclear — `severity: blocking`

> **Where:** `GET /api/v1/submissions/:id`
>
> **Expected:** if submission is `completed`, it should either have eval output, OR there should be a distinct status meaning "upload complete, evaluation not run yet."
>
> **Observed:** `completed` currently means something weaker than docs imply. An agent can't tell whether to wait, retry, resubmit, or treat as failed.

**Root cause:** the status enum in `src/constants.ts` carries `registered | running | completed | failed | evaluation_failed`. `completed` flips when upload finishes. A separate `evaluated: boolean` field carries eval status. **The two are decoupled and the contract isn't documented in `/api/docs`.**

This isn't a code bug per se — the schema is intentional. But it's a UX bug for any agent reading the docs cold. Dog correctly identified the ambiguity.

**Three possible fixes:**

- **(a) Doc-only.** Update `/api/docs` (`guide.for_agents` and the response_fields for `/api/v1/submissions/:id`) to make explicit: "`status: completed` means upload+enqueue done; check `evaluated: true` for eval-done; check `scores.final_score` for the score." Cheapest path.
- **(b) Rename status enum.** `completed` → `uploaded` or `submitted`; introduce `scored` as the terminal success state. Cleanest, but breaks API consumers (SDK + MCP).
- **(c) Collapse into one status.** Merge `completed/evaluated/scored` into a single status enum where each value means exactly one thing. Best long-term, biggest blast radius.

**Recommendation:** (a) for now. (b) tracked as a forward-compatible API revision (`/api/v2/submissions`?) when other API breaks happen.

---

## Issue 4 (new this session) — Gemini LLM layer is fragile under load

When the queue mismatch was fixed and Dog's job actually ran, the LLM call failed three times in a row:

```
Attempt 1: JSON parse failed even after sanitization:
   Expected ',' or ']' after array element at position 582 (line 7 column 6)
Attempt 2: 503 Service Unavailable: This model is currently experiencing high demand.
Attempt 3: 503 Service Unavailable: This model is currently experiencing high demand.
→ MANUAL REVIEW NEEDED — LLM judge failed completely
→ Submission marked as evaluation_failed
```

Two distinct issues:

- **Gemini 2.5 Flash returns malformed JSON sometimes.** The worker's Zod-validated retry path didn't recover. Fix shape: use Gemini's structured output via `responseSchema` (forces valid JSON server-side), OR a more aggressive sanitizer that handles common JSON gotchas (trailing commas, unterminated strings, arrays missing commas).
- **Gemini 2.5 Flash returns 503 under load.** Three retries in <1 minute all hit the same overload window. Fix shape: longer backoff (current `QUEUE_BACKOFF_DELAY_MS` is too aggressive for transient 503), OR fallback to a different model on 503, OR fallback to a different provider entirely.

**Why this matters:** Issue 2 was about queue infrastructure. Once that was fixed, Issue 4 became the next domino. The eval loop is only as reliable as its weakest link, and right now that's the LLM. **For "live bounty board people can use" we need eval-pipeline reliability of >99%, not the ~70% we're at now.**

This should also be considered against `D30` — the eval architecture is in flux. The deep research file (`tasks/research/eval-research-deep-2026-04-25.md`) recommends a tiered funnel: deterministic execution → cheap-LLM gatekeeper → tool-using agent on the 15% flagged. With deterministic execution as the primary signal, LLM unreliability matters less.

---

## Issue 5 (probable, needs investigation) — status desync after eval failure

After the worker logged `Submission marked as evaluation_failed` and `Job 3 completed`, polling Dog's submission still returned `status: running`. Either:

- The worker logs the failure but doesn't actually flip the DB status, OR
- There's a write race where a subsequent retry triggers status back to `running` before the failure-write lands, OR
- The status enum doesn't have `evaluation_failed` as a public-facing value (it's internal-only) and the API returns whatever's there.

**Action:** trace `markEvaluationFailed` in `src/workers/evaluation-worker.ts`. If it doesn't write to the DB, fix it. If it does, find the race.

This blocks any further re-eval attempts: the API returns `409 WRONG_STATUS` saying "current: running" when re-eval is requested, even though the worker is done.

---

## What was learned about agent-first

**The HTTP `/api/docs` path works.** Dog read the docs cold, found tasks, built a real solution, made a real submission. No tutorial, no hand-holding. That's the substrate test passing for the discovery + submit half.

**The MCP path was bypassed.** Dog chose HTTP. Worth knowing: when offered both, the HTTP/JSON path is the cleaner one for daemons that already have HTTP tooling. The MCP server's value is for agents whose primary interface is MCP (Claude Code, Cursor, harnesses where MCP is native).

**Failure modes Dog actually experienced:**
- Stale queue (no worker draining where it submitted) — Issue 2
- Ambiguous status semantics — Issue 3
- The previous Dog instance was "stuck/unhelpful" enough to need replacement (per Jeremy's prompt to v2) — relevant operational signal

**The audit-while-competing pattern works.** Dog produced three structured findings in one run, formatted exactly per the brief. This is the model going forward: agents compete AND audit, post structured findings to `#straw-feedback`.

---

## Outstanding state

- **Dog's submission `69c47e9d`** is in limbo: worker thinks done, API says `running`, can't re-trigger. Will need to either wait for the desync to resolve OR manual DB intervention. Dog's score not yet captured.
- **Worker is up and draining** (PIDs 17568, 6688 on jasuslaptop) against real Upstash.
- **Prod deployed** with deadline filter fix + correct REDIS_URL. New prod URL: `straw-gvwq1oa7n-jeremyliu-621s-projects.vercel.app`.
- **Three real bugs filed in TASKS.md Code Hygiene Backlog** (deadline filter — fixed; status semantics — doc fix; close-tasks cron reliability — separate).
- **Two new bugs to file:** Gemini JSON parse + 503 reliability; status desync after eval failure.

## Next session

1. Resolve Dog's `69c47e9d` limbo (manual DB or wait + re-eval)
2. Get a real score from a Dog v2 submission against prod (the actual Q2 win condition)
3. Decide on Issue 4 fix shape (responseSchema vs sanitizer vs fallback model)
4. Decide on Issue 3 fix shape (doc-only vs rename vs collapse)
5. Audit close-tasks cron firing in prod (Vercel cron logs)
