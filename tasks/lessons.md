# Lessons

Running log of patterns and anti-patterns discovered while working on Straw. Read at session start for relevant project context; append after any correction or a notable success.

---

## Security hardening (2026-04-21, session transcript link: see todo.md)

### When you write a security fix, have the agent that ran the original audit re-audit the fix
My first-pass fixes passed type-check and tests, but the re-audit caught:
- an IPv4-mapped IPv6 bypass I missed because my regex only matched decimal form (Node's URL parser normalises to hex)
- a duplicated symlink-read path in `readLocalOutputAsText` that I didn't realise existed (I'd fixed the sibling function `downloadAgentOutputToDir` but not this one)
- a still-leaking `agentId` in `/api/public/arena` that paralleled the leaderboard routes I did fix
- a documentation-vs-code drift where the rubric-transparency product decision only updated `.md` files, not the code

Pattern: security fixes have more surface area than they look, and "compiles + tests pass" is a weak signal. Always re-run the audit agents with the changes in front of them and a brief of what was claimed to be fixed. This caught 4 real issues in 15 minutes of re-audit time.

### `:ro` on a Unix socket mount is security theatre
`docker-compose.prod.yml` mounting `/var/run/docker.sock:ro` LOOKS like it restricts what the container can do, but `ro` only governs filesystem metadata on the bind. API calls through the socket are still read-write. Worse, on some runtime combinations a `:ro`-tagged socket breaks dockerode's create/pull entirely, trading a theatrical mitigation for real breakage. Document the ceiling, don't decorate it.

### When a product decision flips, grep for the OPPOSITE of the new behaviour
The rubric went from "hidden" to "public" per D10. The `.md` files got the update on master. But when I re-audited I found three code paths still selecting `"name, description, position"` (old behaviour) and one invariant test asserting `not.toContain("weight")` (also old behaviour). The fix: after updating a policy, `grep` the codebase for the OPPOSITE of the new state (`"not.toContain"`, `rubricColumns`, weight-filtering branches) to find the drift.

### Don't use `git add -A` on a branch with scratch dirs
My first commit on this branch swept in `.claude/worktrees/`, `_tmp_csv/`, `tmp_loadtester/`, and `.mcp.json` because `.gitignore` didn't cover them. Had to reset and re-commit with targeted paths. Defaults matter — stage files explicitly unless you've verified `.gitignore`.

### Git config is per-repo — the memory file says so, trust it
I almost added `--author "Jeremy Liu <jeremyliu621@gmail.com>"` out of habit, but memory/`feedback_commit_author.md` explicitly says config is already set per-repo and passing `--author` can override with the wrong email. Plain `git commit -m "..."` attributes correctly on its own. Read memory before acting.

### Tests that mutate `process.env.NODE_ENV` need a widened-view cast
TypeScript marks `process.env.NODE_ENV` as a read-only literal union. Direct assignment (`process.env.NODE_ENV = "production"`) in a test file fails type-check. Cast through `(process.env as Record<string, string | undefined>)` and go through that view. Do the cast once at module top, use `env.NODE_ENV = "..."` throughout.

### ESM namespaces can't be spied on with `vi.spyOn`
`vi.spyOn(await import("node:dns/promises"), "lookup")` fails with "Cannot redefine property: lookup" because ESM namespace exports are non-configurable. Injection at the API boundary (accept the function as a parameter with a default) is cleaner than trying to monkey-patch. Made `validatePublicUrlDynamic` take an optional `lookup` fn for exactly this reason.

### Keep operator-facing and customer-facing error strings separate
Third-pass audit caught two info-leakage channels where the same error message was logged to stderr (fine) AND persisted to a column readable by end users (not fine):
- `safeReadFileSync` error messages containing `/tmp/map-eval-<uuid>` paths landed in `submissions.error_message`, which agents read via `GET /api/submissions/[id]/status`.
- `validatePublicUrlDynamic` reason strings containing resolved IPs (`Hostname X resolved to blocked address 10.1.2.3`) landed in `webhook_deliveries.response_body`, which webhook owners read via RLS.

Pattern: if an error message is going into a DB column that is later returned to a user, redact it OR replace it with a generic customer-facing string. Keep the detailed version in stderr for ops. `src/lib/redact.ts::redactInternalPaths` is the ours; it scrubs `/tmp/*`, our `map-{eval,build}-<uuid>` markers, and Windows temp paths.

### Security audits ≠ dependency audits — run both
Three rounds of code-level security review missed 8 `npm audit` findings including a critical RCE in a transitively-required package (`protobufjs` via `dockerode`) and a null-origin Server Actions CSRF bypass in Next.js. The code-focused agent prompts never hit "run npm audit" as a step. Pattern: budget one audit pass specifically for supply-chain / dependency CVEs, separate from code review. A one-minute `npm audit` can turn up findings that an hour of reading source won't.

### Three code passes + one dep pass is the right dial
Pass 1 (code) caught 13 big findings. Pass 2 (code, same agents) caught 4. Pass 3 (code, narrower scope) caught 2. Pass 4 (deps + fresh surfaces) caught 2 more. Marginal returns drop fast within a category, but category-shifting (code → deps, or code → infra config) can unlock a new batch. Stop when (a) the remaining code findings are theoretical / defense-in-depth, AND (b) there's no unchecked category left.

### Verify agent findings against product intent before fixing
Round 6 agent flagged "role manipulation during onboarding" as a blocker. On inspection it was a false positive against the committed-and-tested Universal Roles product decision (migration 025, `src/app/api/v1/universal-roles.test.ts` is the regression gate, zero role checks in any route handler). If I'd trusted the agent and added a role-enforcement gate, I'd have *introduced* a bug that contradicts shipped product behaviour.

Pattern: when an audit agent says "can Alice impersonate Bob via X", the question to ask first isn't "is X exploitable" — it's "is X actually a permission boundary in this product?" Grep for enforcement, read the adjacent tests, check DECISIONS.md / MEMORY.md. Auth-adjacent fixes are MORE dangerous than missing bugs because they break user flows that may have been deliberately open.

### Zero finds is a scope-miss signal, not an exhaustion signal — confirm with a second empty pass
Updated heuristic after round 7: 13 → 4 → 2 → 2 → 2 → 0 → 1. Pass 6 returned empty, but pass 7 (scoped to the `packages/*` SDK + MCP server that prior passes had never touched) found a real HTTPS-enforcement gap on the customer SDK's baseUrl. One zero-find pass means the CURRENT scope is exhausted, not that the whole codebase is. Rotate to a new unchecked surface and re-run. Call true exhaustion only after TWO consecutive empty passes on distinct scopes — or when you genuinely can't think of a surface you haven't touched.

### Every cross-boundary "enforce at construction" decision is load-bearing
The `packages/agent-sdk` `StrawClient` constructor previously accepted any baseUrl string. That's fine in isolation, but the SDK ships into customer environments (Claude Code, Cursor, OpenCode, custom agents) and runs with the customer's own API key. Any env-var or config-file injection in THOSE environments — which we don't control — could redirect traffic to an attacker. Constructor-time validation is the right layer because it's the first place the value becomes load-bearing; by the time it's used in `fetch()` the auth header is already being composed.

Lesson: when a class or function takes a config value that will carry a secret (auth token, API key, session cookie) to a downstream sink, assume the value is adversarial and validate at the boundary, not at the sink.
