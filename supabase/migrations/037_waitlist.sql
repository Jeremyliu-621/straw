-- Migration 037: Waitlist signups for the pre-launch landing page.
--
-- Public marketing surface collects name/email (+ optional company/position)
-- and shows the user their queue position. Storage is service-role only;
-- there is no end-user read path, so RLS is enabled with no policies.
--
-- `position` is a bigserial that increments on insert, giving each row a
-- stable, monotonically increasing display number without a runtime count.

CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL UNIQUE CHECK (char_length(email) BETWEEN 3 AND 320),
  company text CHECK (company IS NULL OR char_length(company) BETWEEN 1 AND 200),
  position_title text CHECK (position_title IS NULL OR char_length(position_title) BETWEEN 1 AND 200),
  position bigserial NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_created_at_idx ON waitlist (created_at DESC);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) reads/writes.
