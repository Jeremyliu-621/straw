# Overnight Loop State

> **⚠️ Eval architecture has changed since this log was written:** Per D30 (decided + revised 2026-04-25, see `tasks/DECISIONS.md`), the single-Gemini "LLM judge" referenced in this log is moving from primary to fallback; the new architecture is one **ZeroClaw judge daemon per task, powered by Codex CLI in ChatGPT Pro subscription mode** (~$205/mo flat). References below to "the LLM judge" / "Gemini" describe the current implementation that this overnight loop ran against. Most "judge" references in this log are about a *task being competed on* (Competitive Programming Judge task), not about the eval architecture — those are unaffected.

## MORNING SUMMARY (read this first)

**14 iterations completed overnight. Here's what you wake up to:**

### What was built
- **9 tasks** on the platform spanning easy → very hard → creative
- **12 submissions** scored (10 successful, 2 failed on creative writing eval)
- **4 security fixes** committed (C2, C3, H1, H2 — all actionable findings resolved)
- **542 tests** passing, zero type errors
- **201 new API tests**, eval worker hardened, schema gaps fixed

### Scores tell the story
| Task | Type | Score |
|------|------|-------|
| Markdown converter (thorough) | Easy | 95.75 |
| Markdown converter (quick) | Easy | 45.00 |
| Markdown converter (lazy) | Easy | 36.25 |
| URL shortener | Medium | 100 |
| CSV parser | Medium | 100 |
| REST API load tester | Hard | 100 |
| Board game design | Weird/Creative | 94.85 |
| Database migration generator | Very Hard | 98.25 |
| Git diff code reviewer | Hard | 97.25 |
| Competitive programming judge | Very Hard | 94.75 |
| Sonnet generator (3 attempts) | Creative Writing | 0 (EVAL BUG) |

**The LLM judge works well for code tasks.** It differentiates quality (36→100), finds real issues in complex work, and scores creative+code tasks (board game 94.85) reasonably.

### 2 bugs found
1. **Sonnet eval fails consistently** — Gemini scores code tasks fine but returns malformed/empty responses for pure creative writing. The eval prompt may be too code-focused, or sonnet content triggers a safety filter. Needs investigation in `evaluation-worker.ts` prompt template.
2. **Running eval worker has old code** — The hardened eval worker (retry backoff, evaluation_failed status, cleanup) was committed but the terminal is running the pre-hardening version. Restart with `npm run eval-worker` to pick up changes.

### Action items for today
1. **Restart eval worker** — `Ctrl+C` the old one, `npm run eval-worker` again
2. **Investigate sonnet eval bug** — check eval prompt in evaluation-worker.ts, may need to generalize it for non-code submissions
3. **Merge overnight-sprint → feat/mcp-server** — 10 commits ready
4. **Resubmit sonnet** once eval bug is fixed (2/5 quota remaining)

### Branch state
- `overnight-sprint` — 10 commits ahead of `feat/mcp-server`
- All work on this branch, nothing touched main

## Config
- Branch: `overnight-sprint`
- API Key: `straw_sk_ec0e57328085023cbf21aed813e2ec464430e8120e7276d7c117b46d10f3615f`
- Base URL: `http://localhost:3000`
- Company User: `bb5b5819-f0e2-4f09-ae6f-53de6475f129`
- Agent User: `ed803901-a641-4b77-bb08-b20f83096160`

## Existing Tasks
1. "Build a Markdown-to-HTML converter" — `44ddb3a1-82ee-4189-aa94-97153af66f86` (3 submissions scored)
2. "Build a URL shortener API" — `1692c106-217c-484d-b240-bb2f1a3321bc` (1 submission, 100/100)
3. "Parse and normalize messy CSV data" — `18e2ee75-32ca-4a4f-91c3-fc3905a5b70b` (1 submission, 100/100)
4. "Build a REST API Load Tester" — `38dfe0fd-e071-457a-b0a4-ea10832a6207` (1 submission, 100/100) **HARD**
5. "Design a Complete Board Game" — `a03bfc9b-65b3-47cb-bf21-9077e5bcf4ad` (1 submission, 94.85/100) **WEIRD**
6. "Build a Database Migration Generator" — `3ac43008-7b6a-42d0-857e-860348830061` (1 submission, 98.25/100) **VERY HARD**
7. "Build a Shakespearean Sonnet Generator" — `a2e7a49a-de79-470e-b7de-18758e4cb18c` (2 submissions, both 0/100 — EVAL FAILURE) **WEIRD/QUALITATIVE**
8. "Build a Git Diff Code Reviewer" — `9a21270c-ff8a-4631-aed9-8d80fc96d2a3` (1 submission, 97.25/100) **HARD**
9. "Build a Competitive Programming Judge" — `42acfb00-1d6f-4f88-b94f-10e143b3f027` (1 submission, 94.75/100) **VERY HARD**

## Task Bank (draw from these when creating tasks — vary difficulty and type)

### Easy (30 min)
- Build a CLI calculator that parses mathematical expressions with operator precedence
- Build a JSON schema validator

### Medium (1-2 hours)
- Build a URL shortener API (already exists)
- Build a static site generator that converts markdown folders to HTML sites with navigation
- Build a log parser that ingests mixed-format logs (JSON, syslog, Apache) and outputs unified structured data

### Hard (3-5 hours)
- Build a REST API load tester that runs concurrent requests, measures p50/p95/p99 latency, and generates an HTML report
- Build a dependency graph analyzer — takes a package.json or requirements.txt, fetches transitive deps from the public registry API, detects circular dependencies and version conflicts, outputs a DOT graph
- Build a git diff reviewer — takes a unified diff as input, analyzes it for bugs, security issues, style problems, and outputs structured review comments with line numbers

### Very Hard (5+ hours, requires API calls / external data)
- Build a multi-source news aggregator API — fetch from at least 3 public RSS/Atom feeds, deduplicate stories by similarity, categorize by topic, expose a search endpoint with pagination
- Build a website accessibility auditor — takes a URL, fetches the page, parses the DOM, checks WCAG 2.1 AA compliance (missing alt text, color contrast, heading hierarchy, ARIA roles), outputs a scored report
- Build a competitive programming judge — takes a problem description + test cases + submitted code, runs the code in a sandbox, checks correctness, measures runtime, detects TLE/MLE/RE, outputs a verdict with details
- Build a database migration generator — takes two SQL schema snapshots (before/after), diffs them, generates the ALTER TABLE/CREATE TABLE/DROP migration SQL with rollback, handles column renames vs drop+add ambiguity

### Weird / Edge Case (tests platform flexibility)
- Write a poem generator that produces sonnets in iambic pentameter on any given topic — eval is purely qualitative LLM judgment
- Build a recipe API that takes a list of ingredients and dietary restrictions, returns possible recipes with nutritional info — requires creative problem solving, not just code
- Design a board game — output the complete rules document, printable board layout as SVG, and a CLI simulator that lets two players play

## Rotation
- Next iteration type: B (compete)
- After that: C (security fix)
- After that: A (create a HARD task from the bank)
- Keep rotating A→B→C, picking harder tasks each cycle

## Loop Iteration Log

### Iteration 15 — Idle (loop complete)
- All 9 tasks have submissions. All actionable security fixes done. Summary written.
- Remaining work requires user action: restart eval worker, investigate sonnet eval bug, merge branch.
- **Loop is complete.** No more iterations needed until user wakes up.

### Iteration 14 — Compete on CP judge (B)
- CP Judge (`42acfb00`): **94.75/100** (Judging 90, Safety 95, Languages 95, Samples 100, Docs 100). 500-line judge, 70 tests, 27 sample submissions across 3 problems and 3 languages.
- Judge docked on memory measurement (best-effort) and missing Python recursion limit handling — both legitimate.
- Status: **done**
- Next: wrap up — write overnight summary for user

### Iteration 13 — Create CP judge + resubmit sonnet (A)
- CP Judge (`42acfb00`): "Build a Competitive Programming Judge" — systems, **very hard**. Published.
- Sonnet resubmit (`99323cc4`): **0/100 AGAIN**. Gemini works for code tasks (diff reviewer scored 97.25) but consistently fails on creative writing eval. 
- **BUG CONFIRMED: The eval prompt/format doesn't handle non-code submissions. The LLM eval prompt likely asks Gemini to evaluate "code" and the sonnet files confuse it, or the poetry content triggers a Gemini safety filter. This needs investigation — check the eval prompt template in evaluation-worker.ts.**
- Committed `e002f2d`
- Next: B (compete on CP judge as background — very hard)

### Iteration 12 — Compete on git diff reviewer (B)
- Diff reviewer (`9a21270c`): **97.25/100** (Detection 95, Parsing 100, Output 95, Languages 100, Docs 100). 1100-line tool, 40+ detection patterns, 41 tests.
- **Pipeline is back!** Gemini scoring normally again. The sonnet eval failure was transient.
- Status: **done**
- Next: A (create task — "competitive programming judge" from Very Hard bank)

### Iteration 11 — Create task: Git Diff Code Reviewer (A)
- Task: `9a21270c-ff8a-4631-aed9-8d80fc96d2a3`
- Title: "Build a Git Diff Code Reviewer"
- Difficulty: **Hard (3-5 hours)**
- Category: devtools
- Rubric: Detection Accuracy 35%, Diff Parsing 20%, Output Quality 20%, Language Support 15%, Docs 10%
- Committed `a347e4c`
- **NOTE: Eval pipeline degraded — Gemini API failing. Skipping competition this round. User needs to restart eval worker with hardened code.**
- Next: B (compete on diff reviewer — but only if eval pipeline is back. If not, create another task.)

### Iteration 10 — Compete on sonnet generator (B)
- Sonnet generator (`a2e7a49a`): **0/100 — INFRASTRUCTURE FAILURE**. Gemini API calls failed after 3 retries. Both submissions (2 attempts) got 0 with "Flagged for manual review."
- The poetry itself is strong (agent hand-scanned meter, all 5 sonnets follow ABAB CDCD EFEF GG, 14 lines, iambic pentameter).
- **Root cause**: The eval worker running in the user's terminal is likely the OLD version without the hardening changes (retry backoff, evaluation_failed status). The hardened version was committed to `overnight-sprint` but never restarted.
- **BUG FOUND**: When LLM eval fails completely, a 0-score result is still written to the DB instead of using the new `evaluation_failed` status. The running worker doesn't have the code changes.
- 3/5 quota remaining — can resubmit after eval worker restart
- Next: A (create "git diff reviewer" from Hard bank) — also need user to restart eval worker with new code

### Iteration 9 — Create task: Shakespearean Sonnet Generator (A)
- Task: `a2e7a49a-de79-470e-b7de-18758e4cb18c`
- Title: "Build a Shakespearean Sonnet Generator"
- Difficulty: **Weird (purely qualitative)**
- Category: creative-writing
- Rubric: Meter & Form 30%, Imagery & Language 25%, Coherence & Structure 25%, Range 10%, Docs 10%
- Committed `c88f426`
- This is the ultimate judge test: can Gemini evaluate iambic pentameter, rhyme schemes, and literary quality?
- Next: B (compete on sonnet generator — medium difficulty build, interesting eval)

### Iteration 8 — Security fix H1: agent profile data exposure (C)
- **H1 fixed**: `/api/agents/[id]` now returns aggregate stats only for unauthenticated requests. Full competition history (scores, ranks, task IDs, deals) requires auth. Profile info stays public.
- 542 tests pass, committed `20cfc02`
- Security audit status: C2 done, C3 done, H1 done, H2 done. Remaining: C1 (service client bypasses RLS — architectural, not overnight), H3/H4 (false positives)
- **All actionable security findings are now fixed.**
- Next: A (create task — poem generator from Weird bank, test pure qualitative eval)

### Iteration 7 — Compete on board game + migration generator (B)
- Board game (`a03bfc9b`): **94.85/100** (Design 95, Rules 90, Simulator 98, Visual 95, Coherence 100). First non-perfect score on a thorough submission! Judge found a rules ambiguity. Game: tide mechanic with elevation zones and evolution cards, 44KB simulator.
- Migration generator (`3ac43008`): **98.25/100** (Diff 100, Migration 100, Edge Cases 95, Code 90, Docs 100). 2100-line tool with rename heuristics, 56 tests. Judge docked on edge cases and code quality.
- Status: both **done**
- **SCORING CALIBRATION UPDATE:** Board game 94.85, migration gen 98.25. Judge IS differentiating — not everything is 100 anymore. Harder/weirder tasks produce more nuanced scores. The 100/100 streak was on straightforward coding tasks where Claude genuinely nailed the spec. Scoring seems reasonable.
- Next: C (security fix — H1: agent profile leaks competition history)

### Iteration 6 — Create tasks: Board Game + Migration Generator (A)
- **Board Game** (`a03bfc9b`): "Design a Complete Board Game" — creative-design, qualitative eval. Tests LLM judge on non-code output. Rubric: Design 30%, Rules 25%, Simulator 20%, Visual 15%, Coherence 10%.
- **Migration Generator** (`3ac43008`): "Build a Database Migration Generator" — devtools, **very hard**. SQL schema diffing, rename detection, ordered migration + rollback. Rubric: Diff 35%, Migration 30%, Edge Cases 15%, Code 10%, Docs 10%.
- Both published, 0 submissions each
- Committed `80611ff`
- Next: B (compete — board game as background agent, migration gen as background agent)

### Iteration 5 — Security fixes C3 + H2 (C)
- **C3 fixed**: Cron endpoints now validate `x-vercel-cron-signature` value matches `CRON_SECRET`, not just header presence
- **H2 fixed**: `/api/submissions/[id]/details` now checks ownership (agent or task owner), returns 403 otherwise
- 542 tests pass, committed `a66149b`
- Security audit status: C2 done, C3 done, H2 done. Remaining: C1 (service client bypasses RLS — big refactor), H1 (agent profile leaks history), H3/H4 (false positives — universal roles)
- Next: A (create a VERY HARD or WEIRD task from the bank)

### Iteration 4 — Compete on CSV parser + load tester (B)
- CSV parser (`18e2ee75`): **100/100** (Parsing 100, Normalization 100, Code Quality 100, Docs 100). 46 unit tests.
- Load tester (`38dfe0fd`): **100/100** (Execution 100, Reporting 100, Config 100, Code 100, Docs 100). ~52KB solution with all bonus features.
- Status: both **done**
- **CONCERN: 4 consecutive 100/100 scores. LLM judge may be too lenient. Need to test with deliberately flawed submissions or adversarial tasks to see if it actually differentiates.**
- Next: C (security fix — C3: cron signature validation, or H2: submission details ownership)

### Iteration 3 — Create task: REST API Load Tester (A)
- Task: `38dfe0fd-e071-457a-b0a4-ea10832a6207`
- Title: "Build a REST API Load Tester"
- Difficulty: **Hard (3-5 hours)**
- Category: devtools
- Rubric: Execution Correctness 30%, Statistics & Reporting 25%, Config Flexibility 20%, Code Quality 15%, Documentation 10%
- Seed script: `scripts/seed-task-load-tester.ts`
- Status: **published**, 0 submissions
- Next: B (compete on CSV parser — easy/medium — then load tester as background agent)

### Iteration 2 — Security fix C2: unauthenticated submission status (C)
- Finding: `GET /api/submissions/[id]/status` has no auth — anyone with a UUID sees scores
- Fix: background agent adding auth + ownership check (agent or task owner)
- Status: **done** — auth + ownership check added, 341 tests pass, committed `94ad44e`
- Next: A (create a HARD task — "REST API load tester" from bank)

### Iteration 1 — Compete on URL shortener (B)
- Task: `1692c106-217c-484d-b240-bb2f1a3321bc`
- Score: **100/100** (API Correctness 100, Code Quality 100, Edge Cases 100, Documentation 100)
- Position: #1
- Built: Python stdlib URL shortener with all bonus features + 44 tests
- No bugs found
- Next: C (security fix)

### Iteration 0 (pre-loop)
- Sprint complete: 542 tests pass, 6 agent outputs merged
- Security audit identified: unauthenticated submission status endpoint, unvalidated cron signature, missing ownership check on submission details
- TODO next iteration: compete on URL shortener and CSV tasks, fix security findings
