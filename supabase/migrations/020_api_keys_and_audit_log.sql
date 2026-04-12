-- Migration 020: API keys + audit log tables
--
-- These tables were referenced in code but never had a migration.

-- ── API Keys ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash    text NOT NULL,
  prefix      text NOT NULL,
  name        text,
  last_used_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (prefix);

-- RLS: users can only see/manage their own keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY api_keys_update ON api_keys
  FOR UPDATE USING (user_id = auth.uid());

-- ── Audit Log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}',
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);

-- RLS: users can see their own audit entries
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (user_id = auth.uid());

-- Only service role can insert (workers + API routes use service key)
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);
