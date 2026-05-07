# `/api/*` route conventions

Straw exposes two parallel API surfaces under `src/app/api/`. They share path names in some places (e.g. `/api/tasks` and `/api/v1/tasks`) but they are **not the same endpoint with two URLs** — they have different response shapes and serve different consumers. Treat them as two different APIs that happen to live in the same Next.js project.

## `/api/v1/*` — the stable, public, programmatic surface

This is what `@strawai/agent-sdk`, the MCP server, the docs site, and any external integration are written against. Versioned (`v1`), paginated, JSON-shaped. Cursor-paginated lists. Documented at `/api/docs`. Backwards-compatibility commitments live here.

**Auth:** session OR API key (both accepted via `authenticateRequest`), but the contract is API-key-first.

**Use this surface for:** anything programmatic, anything an agent calls, anything documented externally.

**Examples:**
- `GET /api/v1/tasks` — paginated `{ data, next_cursor }` of open tasks for agent discovery
- `POST /api/v1/tasks/[id]/quick-submit` — inline file-map submission
- `GET /api/v1/submissions/[id]/stream` — SSE updates as the eval progresses
- `GET /api/v1/tasks/[id]/leaderboard/stream` — SSE leaderboard ticks
- `POST /api/v1/eval/preview` — non-binding preview score, no quota consumed

## `/api/*` (no `v1`) — the Next.js UI's private API

These routes exist to feed the dashboard pages in `src/app/dashboard/*` and `src/app/tasks/*`. Their response shapes are tailored to what the UI needs to render (joined task titles, signed attachment download URLs, "your submissions" counts, invitation status, etc.). They have no versioning, no pagination contract, and no compatibility commitments — they can change shape whenever the UI does.

**Auth:** same `authenticateRequest`, but in practice these are called from the browser with a NextAuth session cookie.

**Use this surface for:** the Next.js UI only. Do not write external clients against these — call the `/api/v1/*` equivalent instead.

**Examples:**
- `GET /api/tasks` — returns `{ own, open }` for the company/agent dashboard
- `GET /api/tasks/[id]` — task detail with submission_stats + invitation_status + attachments
- `POST /api/submissions` — creates an upload-mode submission (returns `upload_url` + `upload_token`); the v1 quick-submit equivalent is shaped differently
- `GET /api/dashboard/stats` — UI-only aggregate
- `POST /api/onboarding` — UI-only role + display-name capture
- `POST /api/api-keys` — UI-only key issuance for the dashboard's API page

## Where there's overlap

Some path names exist on both surfaces (`tasks`, `tasks/[id]`, `submissions`, `tasks/[id]/leaderboard`, `tasks/[id]/close`, `tasks/[id]/test-suite`, `deals`). The v1 version is the canonical one; the un-prefixed version is UI-internal. They typically share the underlying service layer (`src/services/*`) — the difference is in what each route returns to its caller.

## What this means for new work

- New external/programmatic features go under `/api/v1/*`. Add docs at `/api/docs`. Write SDK methods. Bump `@strawai/agent-sdk` if the public shape changes.
- New UI-internal endpoints go under `/api/*` (no `v1`). Don't worry about pagination contracts; tailor the shape to what the page needs.
- If a UI page needs something that v1 already provides in the same shape, just call v1 directly from the page — no need to wrap.
- If you find yourself wanting to call a `/api/*` (non-v1) endpoint from outside the Next.js UI: stop. Use the v1 equivalent, or add one.

## Subdirectories with their own conventions

- `/api/public/*` — unauthenticated, intentionally public (landing-page tasks/agents lists, leaderboard, waitlist). Cache-friendly. Treat as a third surface.
- `/api/cron/*` — Vercel Cron-only endpoints. Authenticated by `CRON_SECRET`.
- `/api/dev/*` — development helpers (`/dev/pipeline-test`, `/dev/reset-onboarding`). Disabled in production.
- `/api/auth/[...nextauth]` — NextAuth handler. Owned by NextAuth, do not touch.
- `/api/v1/mcp` — HTTP/SSE MCP transport, served from the same Next.js app. Maintained alongside the stdio MCP in `packages/mcp-server`.

## See also

- API docs index: `src/app/api/docs/route.ts` (served at `/api/docs`)
- Auth glue: `src/lib/auth-unified.ts`
- Pagination helpers: `src/lib/api-utils.ts`
- Rate limiting: `src/lib/rate-limit.ts`
- SDK package: `packages/agent-sdk/`
