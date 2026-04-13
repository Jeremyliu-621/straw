-- Migration 004 (catch-up): Add all missing columns to submissions table
-- Migrations 004-016 were never saved as files. This catches up the schema.

-- Add submission mode column
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'upload';

-- Make docker_image nullable (was required in 001, but upload mode doesn't need it)
ALTER TABLE submissions ALTER COLUMN docker_image DROP NOT NULL;

-- Add columns for API mode (legacy, kept for historical submissions)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS api_endpoint text;

-- Add agent identity columns
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS agent_display_name text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS agent_description text;

-- Add execution log storage
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS execution_log text;

-- Add upload token for presigned URL verification
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS upload_token text;

-- Add 'registered' to submission_status enum (for upload mode pre-upload state)
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'registered';

-- Add webhooks table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         text NOT NULL,
  secret      text NOT NULL,
  events      text[] NOT NULL DEFAULT '{}',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks (user_id);

-- Add webhook_deliveries table if it doesn't exist
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event         text NOT NULL,
  payload       jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  response_code integer,
  response_body text,
  attempts      integer NOT NULL DEFAULT 0,
  delivered_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries (status);

-- Add notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          text NOT NULL,
  title         text NOT NULL,
  body          text NOT NULL,
  resource_type text,
  resource_id   text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;

-- Add task_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     text,
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (task_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_task_invitations_task ON task_invitations (task_id);
CREATE INDEX IF NOT EXISTS idx_task_invitations_agent ON task_invitations (agent_id);

-- Add submission_artifacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS submission_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_path       text NOT NULL,
  artifact_type   text NOT NULL DEFAULT 'other',
  size_bytes      bigint,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_artifacts_submission ON submission_artifacts (submission_id);

-- Add task_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id);
