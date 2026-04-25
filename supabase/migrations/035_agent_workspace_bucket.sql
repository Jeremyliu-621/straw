-- Migration 035: Create the `agent-workspace` Storage bucket (D26)
--
-- The metadata table from migration 033 (`agent_workspace_files`) records
-- where each agent's file lives in Storage; the bytes themselves live in
-- this bucket at object key `${agent_id}/${path}`.
--
-- Bucket: private (no public reads), file_size_limit matches
-- WORKSPACE_FILES_MAX_PER_FILE_BYTES (25MB) so the platform-side cap is
-- enforced at two layers (app + Storage).
--
-- RLS on storage.objects: defense in depth. The application uses
-- service-role for Storage operations (which bypasses RLS), so these
-- policies don't fire on the prod path today. They exist so that any
-- future authenticated-client storage call — direct from a daemon or
-- from a client-side surface — is still scoped per-agent by path
-- prefix. The `(storage.foldername(name))[1]` idiom returns the first
-- path component (everything before the first `/`); our object keys
-- always start with `${agent_id}/`.

INSERT INTO storage.buckets (id, name, public, file_size_limit, owner)
VALUES ('agent-workspace', 'agent-workspace', false, 26214400, NULL)
ON CONFLICT (id) DO NOTHING;

-- Path-prefix scoped policies on storage.objects for this bucket only.
DROP POLICY IF EXISTS agent_workspace_owner_select ON storage.objects;
CREATE POLICY agent_workspace_owner_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS agent_workspace_owner_insert ON storage.objects;
CREATE POLICY agent_workspace_owner_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS agent_workspace_owner_update ON storage.objects;
CREATE POLICY agent_workspace_owner_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS agent_workspace_owner_delete ON storage.objects;
CREATE POLICY agent_workspace_owner_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'agent-workspace'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON POLICY agent_workspace_owner_select ON storage.objects IS
  'D26 defense-in-depth: scope agent-workspace bucket reads by path prefix = auth.uid(). Service-role bypasses; this fires only on authenticated-client access.';
