-- Migration 032: Agent workspace KV — persistent state per agent
--
-- Per the agent-first dream (tasks/AGENT_FIRST_DREAM.md): daemons that can
-- remember things across submissions and tasks build up knowledge over
-- time. Today an agent's compute is amnesic — every submission starts with
-- nothing. This is the substrate fix.
--
-- Scope:
--   - Per-agent KV store. Keys are strings, values are arbitrary JSON.
--   - Quotas enforced in the service layer (constants in src/constants.ts):
--       max 10,000 keys per agent
--       max 1MB per value
--       max 10MB total per agent
--   - RLS so an agent can only ever see/modify their own keys, even if a
--     route bug leaks the agent_id query param.
--
-- File storage scoped to agent_id is a separate concern, tracked under
-- Block 3b in tasks/OVERNIGHT_LOG.md.

CREATE TABLE IF NOT EXISTS agent_workspace_kv (
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Stored generated column so quota queries are index-friendly. octet_length
  -- on a jsonb cast to text is a reasonable approximation of payload size.
  size_bytes integer GENERATED ALWAYS AS (octet_length(value::text)) STORED,
  PRIMARY KEY (agent_id, key)
);

CREATE INDEX IF NOT EXISTS idx_workspace_kv_agent ON agent_workspace_kv(agent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_kv_updated ON agent_workspace_kv(agent_id, updated_at DESC);

-- Update updated_at on row update. Reuses the existing trigger fn pattern
-- from migration 030.
CREATE OR REPLACE FUNCTION agent_workspace_kv_updated_at()
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

DROP TRIGGER IF EXISTS trg_workspace_kv_updated_at ON agent_workspace_kv;
CREATE TRIGGER trg_workspace_kv_updated_at
  BEFORE UPDATE ON agent_workspace_kv
  FOR EACH ROW
  EXECUTE FUNCTION agent_workspace_kv_updated_at();

-- RLS: only the agent themselves (auth.uid()) can see/modify their KV.
-- Service role bypasses RLS as usual; the application layer is expected
-- to scope queries by the authenticated user_id.
ALTER TABLE agent_workspace_kv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_workspace_kv_owner_select ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_select ON agent_workspace_kv
  FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_kv_owner_insert ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_insert ON agent_workspace_kv
  FOR INSERT WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_kv_owner_update ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_update ON agent_workspace_kv
  FOR UPDATE USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS agent_workspace_kv_owner_delete ON agent_workspace_kv;
CREATE POLICY agent_workspace_kv_owner_delete ON agent_workspace_kv
  FOR DELETE USING (agent_id = auth.uid());

COMMENT ON TABLE agent_workspace_kv IS
  'Per-agent persistent KV store. See tasks/AGENT_FIRST_DREAM.md (substrate primitive #3) and src/services/workspace.service.ts for the read/write rules.';
