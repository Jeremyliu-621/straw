-- Migration 033: Agent workspace files — persistent blob storage per agent
--
-- Pairs with migration 032's KV (D24). Files are for things too big or too
-- binary for jsonb: compiled binaries, datasets, partial build artifacts,
-- model weights, screenshots, anything daemons want to cache across
-- submissions and tasks.
--
-- Per DECISIONS.md D26 (2026-04-25, Block 3b).
--
-- Storage architecture:
--   - Bytes live in Supabase Storage, bucket `agent-workspace` (private),
--     under path prefix `${agent_id}/${user_path}`. The bucket must be
--     created out-of-band in the Supabase dashboard before this migration
--     is useful — see DECISIONS.md D26 for the manual step.
--   - This metadata table maps `(agent_id, path)` → storage object,
--     records size for quota math, and stores content-type for download
--     responses.
--
-- Quotas (enforced application-side in src/services/workspace.service.ts):
--   - 1,000 files per agent
--   - 25 MB per file
--   - 100 MB total per agent

CREATE TABLE IF NOT EXISTS agent_workspace_files (
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Caller-controlled path (e.g. 'compiled/agent-v3.bin'). Same charset
  -- as workspace KV keys: alphanumerics + . _ - : /. Application layer
  -- enforces the regex; we keep the column flexible for future
  -- extensions (signed paths, content-addressed paths).
  path text NOT NULL,
  -- The actual Storage object key. Always `${agent_id}/${path}` so a
  -- single bucket can host every agent without cross-agent visibility
  -- as long as the route layer always scopes by the authenticated
  -- agent_id when constructing it.
  storage_ref text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes >= 0),
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, path)
);

CREATE INDEX IF NOT EXISTS idx_workspace_files_agent ON agent_workspace_files(agent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_updated ON agent_workspace_files(agent_id, updated_at DESC);

CREATE OR REPLACE FUNCTION agent_workspace_files_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_files_updated_at ON agent_workspace_files;
CREATE TRIGGER trg_workspace_files_updated_at
  BEFORE UPDATE ON agent_workspace_files
  FOR EACH ROW
  EXECUTE FUNCTION agent_workspace_files_updated_at();

-- RLS owner-only — same model as KV (migration 032). The actual bytes
-- in Storage rely on path-prefix isolation enforced by the application
-- layer; if you ever swap storage backends, that's an additional bucket
-- policy to write.
ALTER TABLE agent_workspace_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_workspace_files_owner_select ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_select ON agent_workspace_files
  FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_files_owner_insert ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_insert ON agent_workspace_files
  FOR INSERT WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_files_owner_update ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_update ON agent_workspace_files
  FOR UPDATE USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_files_owner_delete ON agent_workspace_files;
CREATE POLICY agent_workspace_files_owner_delete ON agent_workspace_files
  FOR DELETE USING (agent_id = auth.uid());

COMMENT ON TABLE agent_workspace_files IS
  'Per-agent persistent file storage metadata. Bytes in Supabase Storage bucket `agent-workspace` at path `${agent_id}/${path}`. See src/services/workspace.service.ts for read/write rules and DECISIONS.md D26 for the philosophy + the manual bucket-creation step.';
