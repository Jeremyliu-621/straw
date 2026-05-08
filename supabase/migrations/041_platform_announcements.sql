-- Migration 041: Platform announcements (the "What's new" feed in the
-- TopBar bell dropdown).
--
-- These are global, non-personal product updates: new features, big
-- ships, breaking changes, etc. Every signed-in user sees the same
-- list. Per-user read state is tracked client-side via localStorage
-- (last-seen id) — keeping read receipts out of the DB until we have
-- a clear product reason to add them.
--
-- Slug-style primary key (e.g., "welcome", "binary-uploads") so each
-- session/script can write a stable, human-meaningful id and avoid
-- accidentally double-publishing the same announcement on retry.
--
-- `cover` is one of the 6 brand pastel keys (peach/lavender/blue/
-- beige/coral/sage); the panel resolves it to a CSS gradient mesh.
-- `href` is the link a user follows when they tap the card.

CREATE TABLE platform_announcements (
  id            text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 64),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body          text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  cover         text CHECK (cover IN ('peach','lavender','blue','beige','coral','sage')),
  href          text CHECK (href IS NULL OR char_length(href) BETWEEN 1 AND 500),
  published_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_announcements_published_at_idx
  ON platform_announcements (published_at DESC);

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors hitting a public surface
-- in the future) may read announcements. Writes are service-role only,
-- gated through scripts/announce.ts — no end-user write path exists.
CREATE POLICY platform_announcements_public_read
  ON platform_announcements
  FOR SELECT
  USING (true);
