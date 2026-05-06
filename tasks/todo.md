# Batch: Agent-DX hardening + hygiene (2026-05-06)

User asked for everything in the menu (A–G), carefully, with time. Order picked: smallest/safest first, breaking changes last.

(Prior content of this file — the security-hardening pass review — is in git history at the previous HEAD before this overwrite.)

## Plan

### Phase 1 — Cheap wins (build momentum, low blast radius)
- [x] **F**. Verify submission quota wiring (D15). **Real bug found**: DB default was 5 (migration 019), app contract said 15, NOT NULL column made the in-app `?? 15` fallback dead code → every task created without specifying got quota 5. Fix shipped as migration `038_quota_default_align.sql` (`SET DEFAULT 15`). Lesson captured. Pending: `supabase db push` from Jeremy to apply.
- [x] **E**. ESLint rule banning `console.log` in `packages/mcp-server`. Scoped override on `packages/mcp-server/src/**/*.ts`, allow `error`/`warn` only. Added `strawLog`/`strawWarn`/`strawError` helpers in `src/lib/log.ts`. Probe-verified the rule fires.
- [x] **G1**. **MUCH bigger than expected.** Migration 026 was marked applied via the 2026-05-06 backfill but the DDL never actually ran. Four things silently broken in prod: notification_preferences table missing, notifications.dismissed_at column missing, webhook_deliveries with OLD column names while code wrote NEW (every webhook write was failing), task_invitations.company_id missing. Applied all four sections via mcp__supabase__execute_sql (idempotent). Migration 038 (quota default) also applied and recorded. Verified all post-conditions. F's bug was actually cheaper — most of the bug was the dispatched migration drift here.
- [x] **G2**. Deleted `scripts/e2e-pipeline.ts`, removed `"test:pipeline"` from package.json, rewrote `tasks/TESTING.md` to document the current `/api/dev/pipeline-test` flow (post-Phase 17 — agents upload their own work; dev pipeline is a synthetic eval harness, not an execution one).
- [x] **G3**. Replaced 11 hardcoded `tasks/X.md` paths in code/docs/migrations with wikilink slugs. User-facing fix in `src/app/docs/page.tsx` (was rendering raw repo path to readers). All tests green.

### Phase 2 — Medium DX features
- [x] **B**. `get_task` already returned quota. Added quota field to `quick_submit` response (post-submit count). New SDK `client.tasks.checkQuota()` + new MCP tool `check_quota`. Bumped agent-sdk → **0.3.0** and mcp-server → **1.3.0**. Pending Jeremy npm publish for both.

### Phase 3 — Real features (the meat)
- [x] **A**. Binary-safe file uploads. New `src/lib/submission-files.ts` decodes either string (legacy utf8) or `{ content, encoding, contentType? }` (binary). Updated route, contract validator (Buffers), SDK type (`SubmissionFileEntry`), MCP input schema (Zod union). 15 new tests covering MIME sniff, base64 decode, byte-length accuracy. 920 total tests pass.
- [x] **C**. Self-contained preview eval: service + route (10/hour rate limit, 5MB cap, no persistence) + SDK `client.eval.preview()` + MCP `preview_eval` tool + `straw-eval` CLI binary (walks dir, base64-encodes binaries, prints breakdown). 7 new prompt-builder tests. Eslint exception added for `bin/**`. Stacked into agent-sdk 0.3.0 / mcp-server 1.3.0.

### Phase 4 — Breaking change (last, requires user re-confirmation before publish)
- [ ] **D**. **Deferred — designed only.** Full proposal at `tasks/proposals/mcp-tool-surface-collapse.md`. Recommendation: HOLD until agent feedback indicates catalog crowding is real, OR until the next major mcp-server breaking change is being planned. Doing D now would mean three rapid-fire publishes (1.2 → 1.3 → 2.0) in a week and bundles a refinement with no proven pain.

### Phase 5 — Punt to user
- [x] **G4**. Surfaced below in the Review section. Each comes with a recommendation. None decided unilaterally — all need product input from Jeremy.

## Working agreement

- One task at a time. Tests + verification on each before moving on.
- Commit per phase, not per task — reduces commit noise.
- After every commit: tick off here + line in `tasks/TASKS.md`.
- If anything goes sideways, STOP, surface it, re-plan.

## Out-of-scope

- Buying Hetzner CX22 (D35) — gated on Q2 agent-first test (gated on Dog's gateway).
- OAuth callbacks → straw.wiki — separate item.
- v0.3.0/0.4.0 of `@strawai/agent-sdk` — bumped only if a phase requires it; each bump = fresh `npm publish` from Jeremy (2FA).

## Review

### What shipped

| Phase | Task | Outcome |
|---|---|---|
| 1 | F (D15 quota verify) | **Real bug**: DB default 5, not 15. Migration 038 staged + applied to live. |
| 1 | E (eslint no-stdout in mcp-server) | Rule added, `bin/` exempted (CLIs own stdout), strawLog/strawWarn/strawError helpers added. Probe-verified. |
| 1 | G1 (notification_preferences PGRST205) | **Much bigger than the audit said.** Migration 026 had been backfilled into `schema_migrations` but never actually run. Four things silently broken in prod: notification_preferences missing, notifications.dismissed_at missing, webhook_deliveries with old column names while code wrote new (every webhook delivery write was failing), task_invitations.company_id missing. Applied all four sections idempotently via `mcp__supabase__execute_sql`. Live DB now matches the migration files. |
| 1 | G2 (e2e-pipeline cleanup) | Deleted `scripts/e2e-pipeline.ts`, removed `test:pipeline` from package.json, rewrote `tasks/TESTING.md` to document the current `/api/dev/pipeline-test` flow. |
| 1 | G3 (sweep hardcoded paths) | 11 hardcoded `tasks/X.md` paths in code/migrations/docs replaced with wikilink slugs. User-facing fix in `src/app/docs/page.tsx`. |
| 2 | B (quota everywhere + check_quota) | `quick_submit` response now includes quota; new SDK `client.tasks.checkQuota()`; new MCP tool `check_quota`. |
| 3 | A (binary-safe uploads — P1) | New helper `src/lib/submission-files.ts` decodes string-or-object file entries, sniffs MIME from extension, rejects malformed base64. Contract validator + route migrated to operate on Buffers. SDK type widened (`SubmissionFileEntry`). MCP tool description warns about silent corruption when sending binaries as strings. 15 new tests. |
| 3 | C (eval --local) | Self-contained preview eval (service + route + SDK + MCP tool + `straw-eval` CLI bin). 10/hour rate limit, no quota consumed, no persistence. Drift-tolerant — preview is a tier-1 approximation, not full feature parity with the worker. 7 new prompt tests. |
| 4 | D (collapse MCP surface) | **Deferred.** Full proposal at `tasks/proposals/mcp-tool-surface-collapse.md`. Recommendation: HOLD. |
| 5 | G4 | Surfaced below. |

### Tests
- 905 → 927 (+22). Zero regressions.

### Pending publish (Jeremy, requires 2FA)

```powershell
cd packages/agent-sdk
npm publish --access public            # publishes 0.3.0
cd ../mcp-server
npm install                            # picks up @strawai/agent-sdk@^0.3.0 from registry
npm publish --access public            # publishes 1.3.0 (with B + C + new straw-eval bin)
cd ../..
npm install                            # refreshes root with both
git add package.json package-lock.json
git commit -m "chore: bump agent-sdk → 0.3.0 + mcp-server → 1.3.0"
git push
vercel deploy --prod --yes              # picks up the new HTTP MCP transport prose + /api/v1/eval/preview route
```

### G4 — Architectural items needing your call

#### 1. 3D arena vs `tasks/AGENT_FIRST_DREAM.md` doctrine
The arena (`src/components/arena-3d/`, ~12k LOC) is shipped on `src/app/page.tsx` and live at `straw.wiki`. But `AGENT_FIRST_DREAM.md:41-43` explicitly rejects "3D arena visualization as the front page hero." Right now the canon and the code disagree.

**Options:**
- Amend the doctrine — say the arena is acceptable as marketing/charm, not a contradiction.
- Remove the import from `page.tsx`, repurpose the LOC for a different landing page.
- Keep both (status quo) — but then update `AGENT_FIRST_DREAM.md` to say "we know this exists, here's why."

**Recommendation:** amend the doctrine. The arena is an aesthetic asset and you've put real work into it. The doctrine line was written before the arena landed; it deserves a refresh, not a 12k-LOC delete.

#### 2. Two API surfaces (29 v1 + 36 non-v1, 7 paths exist as both)
`/api/tasks` AND `/api/v1/tasks`. `/api/submissions` AND `/api/v1/submissions`. Phase 19 was supposed to migrate, shipped v1 but never deleted/redirected legacy. Every API-key user has to guess which is canonical.

**Options:**
- (a) Delete legacy — clean but breaks any agent already using the un-versioned path.
- (b) 308 Permanent Redirect from legacy → v1. Backwards-compatible, narrows surface gradually.
- (c) Document why both stay and which is canonical. Cheap, but the asymmetry never gets resolved.

**Recommendation:** (b). Ship 308 redirects, monitor traffic for 30 days, then delete the legacy handlers. Lowest blast radius + actually closes the issue eventually.

#### 3. `optiboarding-repo/` in the working tree
A separate Next.js app ("optimal-ai") gitignored at the repo root. Pollutes every grep, every Glob, every file picker.

**Options:**
- Move it to its own clone outside this repo.
- Add it to a different ignore (it's already in .gitignore but tools that ignore .gitignore — like some IDE indexers — still see it).
- Convert to a git submodule if you actually want it tracked alongside.

**Recommendation:** move it out. Single line in onboarding docs to explain where it now lives.

#### 4. `tasks/TASKS.md` phase numbering
Two "Phase 14"s (lines 422 + 466). Phase 18 appears AFTER Phase 19. The file has become accretive without a sense of order.

**Options:**
- Renumber chronologically.
- Split into `tasks/done.md` / `tasks/now.md` / `tasks/later.md`.
- Leave it (status quo) — `<!-- RESUME HERE -->` works fine as the cursor.

**Recommendation:** split into `done.md` / `now.md` / `later.md`. The single-file approach is creaking — every session starts with "find the resume marker," and you'd benefit from a clean "now" file that has only the active milestone. Done items can rot harmlessly in `done.md`. ~2 hours of mechanical work.
