/**
 * Seed script: Create "Database Migration Generator" task (Very Hard — 5+ hours)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Database Migration Generator...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Build a Database Migration Generator",
      description: `Build a tool that takes two SQL schema snapshots (before and after) and generates the migration SQL to transform one into the other.

## Core Requirements

### Input
Two SQL files representing PostgreSQL schemas:
- \`before.sql\` — CREATE TABLE statements for the "old" schema
- \`after.sql\` — CREATE TABLE statements for the "new" schema

### Output
A migration file (\`migration.sql\`) containing:
- \`ALTER TABLE\` statements for column changes (add, drop, rename, type change)
- \`CREATE TABLE\` for new tables
- \`DROP TABLE\` for removed tables
- \`CREATE INDEX\` / \`DROP INDEX\` for index changes
- \`ALTER TABLE ... ADD CONSTRAINT\` / \`DROP CONSTRAINT\` for foreign keys, uniques, checks
- A corresponding \`rollback.sql\` that reverses the migration

### Diff Detection
The tool must correctly detect:
- **New tables** — present in after, absent in before
- **Dropped tables** — present in before, absent in after
- **New columns** — column in after table that doesn't exist in before
- **Dropped columns** — column in before that doesn't exist in after
- **Renamed columns** — this is the hard part. If a column disappears and a new one appears with the same type, it MIGHT be a rename. Use heuristics (same type + position, similar name via edit distance) and flag ambiguous cases with a comment
- **Type changes** — column exists in both but type differs (e.g., VARCHAR(100) → TEXT)
- **Default changes** — column default value changed
- **Nullable changes** — NOT NULL added or removed
- **New/dropped indexes** — including partial indexes and expression indexes
- **New/dropped constraints** — foreign keys, unique, check constraints
- **Enum type changes** — new values added to enums

### Ordering
Migrations must be ordered correctly:
- Create tables before foreign keys that reference them
- Drop foreign keys before dropping referenced tables
- Add columns before indexes that use them

### Edge Cases
- Table with no changes (skip it)
- Column rename vs drop+add ambiguity (flag it, prefer rename if types match)
- Circular foreign key dependencies (flag, suggest deferred constraints)
- Schema-qualified names (public.users vs users)
- Multi-column indexes and constraints

## Bonus
- Interactive mode: when a rename is ambiguous, prompt the user
- \`--dry-run\` flag that shows what would be generated without writing files
- Support for MySQL in addition to PostgreSQL
- Generate Alembic/Knex/Prisma migration format instead of raw SQL`,
      category: "devtools",
      input_spec: `Two SQL files. Example before.sql:

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  published BOOLEAN DEFAULT false
);
\`\`\`

Example after.sql:
\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name VARCHAR(150),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id),
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMPTZ
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
\`\`\``,
      output_spec: `1. migration.sql — forward migration with all ALTER/CREATE/DROP statements, correctly ordered
2. rollback.sql — reverse migration
3. A summary showing what was detected (new tables, dropped columns, renames, type changes, etc.)
4. README.md with usage instructions
5. SUBMISSION.md with approach and design decisions`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 150_000,
      eval_mode: "llm",
      status: "draft",
      test_weight: 0,
      llm_weight: 100,
    })
    .select()
    .single();

  if (taskError) {
    console.error("Failed to create task:", taskError);
    process.exit(1);
  }

  const criteria = [
    { task_id: task.id, name: "Diff Detection Accuracy", description: "Does the tool correctly identify all schema differences? New tables, dropped tables, new/dropped/renamed columns, type changes, default changes, nullable changes, index changes, constraint changes? Does it handle the rename-vs-drop ambiguity intelligently?", weight: 35, position: 1 },
    { task_id: task.id, name: "Migration Correctness", description: "Is the generated SQL valid PostgreSQL? Are statements ordered correctly (create before reference, drop FK before drop table)? Does the migration actually transform the before schema into the after schema? Does the rollback reverse it?", weight: 30, position: 2 },
    { task_id: task.id, name: "Edge Case Handling", description: "Circular FKs, schema-qualified names, multi-column indexes, expression indexes, partial indexes, enum changes, tables with no changes. Are ambiguous renames flagged with comments?", weight: 15, position: 3 },
    { task_id: task.id, name: "Code Quality", description: "Clean SQL parser, good separation between parsing/diffing/generating phases, no regex soup, handles malformed input gracefully", weight: 10, position: 4 },
    { task_id: task.id, name: "Documentation", description: "Clear README, thorough SUBMISSION.md explaining the rename heuristic and ordering algorithm", weight: 10, position: 5 },
  ];

  const { error: criteriaError } = await db.from("rubric_criteria").insert(criteria);
  if (criteriaError) {
    console.error("Failed to insert criteria:", criteriaError);
    process.exit(1);
  }

  const { error: publishError } = await db
    .from("tasks")
    .update({ status: "open" })
    .eq("id", task.id);

  if (publishError) {
    console.error("Failed to publish:", publishError);
    process.exit(1);
  }

  console.log(`Published! Task ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Difficulty: Very Hard (5+ hours)`);
  console.log(`Rubric: 5 criteria (Diff 35%, Migration 30%, Edge Cases 15%, Code 10%, Docs 10%)`);
}

main().catch(console.error);
