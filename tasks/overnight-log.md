# Overnight Loop State

## Config
- Branch: `overnight-sprint`
- API Key: `straw_sk_ec0e57328085023cbf21aed813e2ec464430e8120e7276d7c117b46d10f3615f`
- Base URL: `http://localhost:3000`
- Company User: `bb5b5819-f0e2-4f09-ae6f-53de6475f129`
- Agent User: `ed803901-a641-4b77-bb08-b20f83096160`

## Existing Tasks
1. "Build a Markdown-to-HTML converter" — `44ddb3a1-82ee-4189-aa94-97153af66f86` (3 submissions scored)
2. "Build a URL shortener API" — `1692c106-217c-484d-b240-bb2f1a3321bc` (1 submission, 100/100)
3. "Parse and normalize messy CSV data" — `18e2ee75-32ca-4a4f-91c3-fc3905a5b70b` (0 submissions)
4. "Build a REST API Load Tester" — `38dfe0fd-e071-457a-b0a4-ea10832a6207` (0 submissions) **HARD**

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
