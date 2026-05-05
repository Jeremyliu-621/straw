# Schema Audit Results

Triggered by: eval worker crash during first E2E pipeline test.

```
[dispatch] Failed to dispatch notification: {
  code: 'PGRST205',
  hint: "Perhaps you meant the table 'public.notifications'",
  message: "Could not find the table 'public.notification_preferences' in the schema cache"
}
```

## Methodology

1. Extracted every table name referenced via `.from("...")` in all TypeScript files.
2. Cross-referenced with every `CREATE TABLE` across all migrations (001-024).
3. Compared column names in TypeScript types/insert calls against migration DDL.

## Tables Referenced in Code vs Migrations

| Table | In Migrations | In Code | Status |
|---|---|---|---|
| users | 001 | Yes | OK |
| company_profiles | 001 | Yes | OK |
| agent_builder_profiles | 001 | Yes | OK |
| tasks | 001 | Yes | OK |
| rubric_criteria | 001 | Yes | OK |
| submissions | 001 | Yes | OK |
| evaluation_results | 001 | Yes | OK |
| evaluation_dimensions | 001 | Yes | OK |
| messages | 001 | Yes | OK |
| deals | 001 | Yes | OK |
| webhooks | 004 | Yes | OK |
| webhook_deliveries | 004 | Yes | Column mismatch (fixed) |
| notifications | 004 | Yes | Missing column (fixed) |
| **notification_preferences** | **MISSING** | Yes | **Table missing (fixed)** |
| task_invitations | 004 | Yes | Missing column (fixed) |
| submission_artifacts | 004 | Yes | OK |
| task_comments | 004 | No | OK (unused but harmless) |
| api_keys | 020 | Yes | OK |
| audit_log | 020 | Yes | OK |
| task_attachments | 024 | Yes | OK |

## Issues Found and Fixed

### 1. CRITICAL: `notification_preferences` table never created

**Root cause**: The table was designed in types (`NotificationPreference` in `src/types/database.ts`), the repository methods were written (`getPreferences`, `upsertPreference` in `src/db/notifications.ts`), and the service logic was built (`shouldNotify` in `src/services/notifications.service.ts`) -- but the migration to create the table was never written.

**Fix**: Migration 025 creates the table with columns matching the TypeScript type (`id`, `user_id`, `notification_type`, `in_app_enabled`, `created_at`, `updated_at`), a UNIQUE constraint on `(user_id, notification_type)` for upsert support, RLS policies, and an `updated_at` trigger.

### 2. CRITICAL: `notifications.dismissed_at` column missing

**Root cause**: Migration 004 created the `notifications` table with `read_at` but no `dismissed_at`. The notification repository and at least one API route (`/api/agents/me`) query `.is("dismissed_at", null)`, which silently returns no results on Supabase (no error, just wrong data).

**Fix**: Migration 025 adds `dismissed_at timestamptz` and a partial index for undismissed queries.

### 3. MODERATE: `webhook_deliveries` column name mismatches (3 columns)

**Root cause**: Migration 004 created: `event`, `response_code`, `delivered_at`. All application code (dispatch.ts, webhook-worker.ts, webhook-dispatch.ts, test route) uses: `event_type`, `response_status`, `completed_at`. The TypeScript type in `database.ts` also uses the code-side names.

**Fix**: Migration 025 renames all three columns using safe `DO` blocks that check column existence.

### 4. MINOR: `task_invitations` missing `company_id` column

**Root cause**: Migration 004 created `task_invitations` without `company_id`. The TypeScript `TaskInvitation` interface and `TaskInvitationInsert` type include `company_id`. While the repository code doesn't explicitly set it in queries, inserts pass the full `TaskInvitationInsert` object which includes `company_id`.

**Fix**: Migration 025 adds the column as nullable with a foreign key to `users(id)`.

## Migration File

`supabase/migrations/025_schema_audit_fixes.sql`

## No Other Missing Tables

All 19 tables referenced in application code have corresponding `CREATE TABLE` statements in the migrations. The only table in migrations not referenced in code is `task_comments` (created in 004), which is harmless.
