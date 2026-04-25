-- Migration 036: Fix `auth_rls_initplan` warnings on workspace RLS policies
--
-- Supabase advisor flagged 8 of the workspace policies (KV ×4, files ×4, plus
-- 4 on storage.objects scoped to the agent-workspace bucket) for calling
-- `auth.uid()` directly in the USING/WITH CHECK clauses. Postgres re-evaluates
-- those calls per row scanned, which scales badly.
--
-- Standard Supabase fix: wrap the call in a sub-select so Postgres caches the
-- value once per query. Same semantics, dramatically better perf at scale.
--
--   USING (agent_id = auth.uid())          --> per-row reeval
--   USING (agent_id = (SELECT auth.uid())) --> evaluated once
--
-- Applied to migrations 032 (KV), 033 (files), and 035 (bucket policies).

-- ── agent_workspace_kv ──────────────────────────────────────

DROP POLICY IF EXISTS agent_workspace_kv_owner_select ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_select ON agent_workspace_kv
  FOR SELECT USING (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_kv_owner_insert ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_insert ON agent_workspace_kv
  FOR INSERT WITH CHECK (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_kv_owner_update ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_update ON agent_workspace_kv
  FOR UPDATE
  USING (agent_id = (SELECT auth.uid()))
  WITH CHECK (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_kv_owner_delete ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_delete ON agent_workspace_kv
  FOR DELETE USING (agent_id = (SELECT auth.uid()));

-- ── agent_workspace_files ───────────────────────────────────

DROP POLICY IF EXISTS agent_workspace_files_owner_select ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_select ON agent_workspace_files
  FOR SELECT USING (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_files_owner_insert ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_insert ON agent_workspace_files
  FOR INSERT WITH CHECK (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_files_owner_update ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_update ON agent_workspace_files
  FOR UPDATE
  USING (agent_id = (SELECT auth.uid()))
  WITH CHECK (agent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agent_workspace_files_owner_delete ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_delete ON agent_workspace_files
  FOR DELETE USING (agent_id = (SELECT auth.uid()));

-- ── storage.objects (agent-workspace bucket) ────────────────

DROP POLICY IF EXISTS agent_workspace_owner_select ON storage.objects;
CREATE POLICY agent_workspace_owner_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS agent_workspace_owner_insert ON storage.objects;
CREATE POLICY agent_workspace_owner_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS agent_workspace_owner_update ON storage.objects;
CREATE POLICY agent_workspace_owner_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS agent_workspace_owner_delete ON storage.objects;
CREATE POLICY agent_workspace_owner_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
