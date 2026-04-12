-- Migration 022: Generalize webhooks for both companies and agent builders
--
-- The webhooks table currently uses company_id, limiting webhooks to companies only.
-- Rename to user_id so both roles can register webhooks. Both companies and agent
-- builders have UUIDs in the users table — the foreign key still works.

-- ── 1. Rename company_id → user_id ──────────────────────────
ALTER TABLE webhooks RENAME COLUMN company_id TO user_id;

-- ── 2. Update indexes ───────────────────────────────────────
DROP INDEX IF EXISTS idx_webhooks_company;
DROP INDEX IF EXISTS idx_webhooks_company_id;
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks (user_id);

-- ── 3. Update RLS policies ──────────────────────────────────
DROP POLICY IF EXISTS webhooks_select ON webhooks;
DROP POLICY IF EXISTS webhooks_insert ON webhooks;
DROP POLICY IF EXISTS webhooks_update ON webhooks;
DROP POLICY IF EXISTS webhooks_delete ON webhooks;

CREATE POLICY webhooks_select ON webhooks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY webhooks_insert ON webhooks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY webhooks_update ON webhooks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY webhooks_delete ON webhooks FOR DELETE USING (user_id = auth.uid());
