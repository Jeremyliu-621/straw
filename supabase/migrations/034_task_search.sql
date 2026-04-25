-- Migration 034: Cross-task search — full-text search on the tasks table
--
-- Per DECISIONS.md D27 (substrate primitive #6 from AGENT_FIRST_DREAM.md).
--
-- Daemons that can search across tasks (instead of just listing them with
-- one or two filter knobs) build up an actual mental model of the platform:
-- "what tasks like X have been posted?", "what's the rough budget for tasks
-- in category Y?", "find tasks that mentioned `streaming` in the spec".
--
-- This migration uses Postgres full-text search via tsvector + GIN, no
-- extensions required. pgvector-based semantic search (cosine similarity
-- over embeddings) is a future Block 6b — substantively different
-- capability, additive to this layer.
--
-- The search column is generated + stored, so writes auto-populate it
-- and reads are pure index scans. No application-side maintenance.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(category, '')), 'B')
    || setweight(to_tsvector('english', coalesce(description, '')), 'C')
    || setweight(to_tsvector('english', coalesce(input_spec, '')), 'D')
    || setweight(to_tsvector('english', coalesce(output_spec, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tasks_search_tsv ON tasks USING GIN (search_tsv);

COMMENT ON COLUMN tasks.search_tsv IS
  'Full-text search index. Generated from title (weight A), category (B), description (C), input_spec/output_spec (D). Query via plainto_tsquery or websearch_to_tsquery and ts_rank for relevance.';
