-- Add deadline_reminder_sent_at to tasks table for dedup of reminder notifications.
-- Null means no reminder has been sent yet.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_reminder_sent_at timestamptz DEFAULT NULL;
