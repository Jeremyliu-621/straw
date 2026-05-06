# Proposal: Collapse MCP tool surface 8 → 4

**Status:** awaiting user signoff before implementation
**Authored:** 2026-05-06 (during the agent-DX hardening batch)
**Target version:** `@strawai/mcp-server@2.0.0` (BREAKING)

## Why

Today the MCP server registers ~32 tools. Every MCP-aware harness (Claude Code, Cursor, OpenCode, custom dispatchers) loads them ALL into the agent's tool catalog. When the agent already has filesystem + shell + browser MCPs registered, the catalog gets crowded and the model spends more attention figuring out which tool to call.

There are 4 obvious "thin variants of the same operation" pairs that can collapse:

| Today (separate) | Proposed (one tool) | Driver |
|---|---|---|
| `list_tasks` + `get_task` | `tasks` (with optional `id`) | Same intent, different specificity |
| `list_submissions` + `get_submission` | `submissions` (with optional `id`) | Same intent, different specificity |
| `quick_submit` + `complete_submission` + `refresh_upload_url` | `submit` (with optional `submission_id` for resume) | All "make this submission go" |
| `wait_for_submission` + `wait_for_task_event` + `wait_for_leaderboard_change` | `wait` (with required `target` enum + ID) | All blocking SSE-backed waits |

Net: 11 → 4 (~63% reduction in this corner of the catalog). Total mcp-server tools 32 → 25.

## Why NOT

- It's BREAKING. Anything pinned to `@strawai/mcp-server@1.x` stops working unless they update tool names. Migration noise for every agent already deployed.
- Some signatures get awkward — `wait` taking a discriminated union for `target` means the input schema is bigger and less obvious than the focused per-action tools.
- Tool descriptions get longer — "this can do X or Y depending on whether `id` is set" is harder to skim than two short tools.
- The "tools/list crowding" problem is real but it might be cheaper to fix at the harness layer (tool grouping, lazy-loading) than at the MCP server layer.

## Recommended scope IF we ship

Phase D-1 (mostly mechanical):
- Rename in source: `list_tasks` + `get_task` → `tasks`. `id` optional. Sentinel "I want a list" vs "I want this one." Reuse `formatTaskList` / `formatTaskDetail` formatters based on which path runs.
- Same for `submissions`.
- Add deprecation notice in tool descriptions of the OLD names (kept as no-op wrappers in 2.0 → removed in 3.0).

Phase D-2 (real work):
- Collapse `quick_submit` / `complete_submission` / `refresh_upload_url` into `submit`. Hardest because the SDK methods are different shapes; need a clean discriminated input.
- Wire `submission_id?` — if present + the submission is registered-but-empty, treat as resume; if absent, treat as fresh quick-submit.

Phase D-3 (cleanest):
- Collapse the three `wait_for_*` tools into `wait` with `target: "submission" | "task_event" | "leaderboard_change"`. The SSE machinery is already shared in the SDK — only the tool-surface layer needs to merge.

## Migration notes

For each renamed tool, ship in 2.0.0:
- Old name registered with a clear "deprecated — use `<new>` instead" description that returns a structured error if invoked: `{ error: { code: "DEPRECATED_TOOL", new_name: "tasks" } }`.
- Or fall through to the new tool with a stderr warning. Either is fine; "fall through" is friendlier, "deprecated error" is louder.

Bump:
- `@strawai/mcp-server` 1.3.0 → 2.0.0 (major)
- Republish, update root `package.json`, redeploy `/api/v1/mcp` HTTP transport.
- Tag README + CHANGELOG with migration table.

## Recommendation

**Hold for now.** Reasons:

1. We just shipped 1.3.0's B + C additions. Three rapid-fire MCP server publishes in one week (1.1.0 → 1.2.0 → 1.3.0 → 2.0.0) would feel like churn to early adopters.
2. The "tool catalog crowding" pain is hypothetical until we have agents complaining about it. We don't have that signal yet.
3. D's value is real but smaller than A/B/C (which were all gaps in agent-DX); D is a refinement.
4. The collapse can ship cleanly as a focused 2.0.0 branch later — it doesn't need to bundle with this hardening batch.

**Recommended action:** mark D-status as "designed, deferred" in `TASKS.md`. Revisit when:
- Agent feedback indicates catalog crowding is real, OR
- The next major mcp-server breaking change is being planned (bundle the collapses then)

## If user wants to proceed anyway

Estimated effort: 4-6 hours. Updates: tools/tasks.ts, tools/submissions.ts, format.ts (multi-mode), SDK has no change (resource methods stay), tests for each merged tool, README migration table. Republish `@strawai/mcp-server@2.0.0`. Bump root.
