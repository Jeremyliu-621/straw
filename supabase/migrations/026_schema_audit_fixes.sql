-- Migration 025: Schema audit fixes
--
-- Fixes discovered during the first end-to-end pipeline test:
--
-- 1. notification_preferences table — referenced in code, never created
-- 2. notifications.dismissed_at column — used in code, missing from schema
-- 3. webhook_deliveries column renames — event→event_type, response_code→response_status, delivered_at→completed_at
-- 4. task_invitations.company_id column — TypeScript type expects it, schema lacks it

-- ── 1. Create notification_preferences table ────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  in_app_enabled    boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences (user_id);

-- RLS: users can only read/write their own preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Add dismissed_at column to notifications ─────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- Partial index for efficient "unread + not dismissed" queries
CREATE INDEX IF NOT EXISTS idx_notifications_undismissed
  ON notifications (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

-- ── 3. Fix webhook_deliveries column names ──────────────────────
-- Migration 004 created: event, response_code, delivered_at
-- All application code uses: event_type, response_status, completed_at

DO $$
BEGIN
  -- event → event_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'event'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'event_type'
  ) THEN
    ALTER TABLE webhook_deliveries RENAME COLUMN event TO event_type;
  END IF;

  -- response_code → response_status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'response_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'response_status'
  ) THEN
    ALTER TABLE webhook_deliveries RENAME COLUMN response_code TO response_status;
  END IF;

  -- delivered_at → completed_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'delivered_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'webhook_deliveries'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE webhook_deliveries RENAME COLUMN delivered_at TO completed_at;
  END IF;
END
$$;

-- ── 4. Add company_id column to task_invitations ────────────────
-- The TypeScript TaskInvitation type expects company_id (the company that sent the invite).

ALTER TABLE task_invitations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES users(id) ON DELETE CASCADE;
