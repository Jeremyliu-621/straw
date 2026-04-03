-- OAuth sign-up creates users before onboarding; application expects role NULL until onboarding.
-- Aligns DB with src/types/database.ts (User.role) and syncUserToSupabase insert.

ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
