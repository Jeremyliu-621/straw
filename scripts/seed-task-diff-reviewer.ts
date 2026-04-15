/**
 * Seed script: Create "Git Diff Reviewer" task (Hard — 3-5 hours)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Git Diff Reviewer...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Build a Git Diff Code Reviewer",
      description: `Build a command-line tool that takes a unified diff (git diff output) as input and produces structured code review comments.

## Core Requirements

### Input
Standard unified diff format (as produced by \`git diff\`):
\`\`\`
diff --git a/src/auth.ts b/src/auth.ts
index abc1234..def5678 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -42,7 +42,8 @@ export function validateToken(token: string) {
-  if (token === "admin") return true;
+  const decoded = jwt.verify(token, SECRET);
+  return decoded.role === "admin";
\`\`\`

### Output
Structured JSON review comments, each containing:
- \`file\`: which file the comment is about
- \`line\`: the line number in the new version
- \`severity\`: "critical" | "warning" | "suggestion" | "praise"
- \`category\`: "bug" | "security" | "performance" | "style" | "logic" | "readability"
- \`message\`: human-readable explanation
- \`suggestion\`: optional suggested fix (as a code snippet)

### Analysis Categories

**Bugs:**
- Off-by-one errors
- Null/undefined access
- Missing error handling
- Race conditions in async code
- Type mismatches

**Security:**
- SQL injection
- XSS
- Command injection
- Hardcoded secrets/credentials
- Insecure crypto usage
- Missing input validation

**Performance:**
- N+1 query patterns
- Unnecessary re-renders (React)
- Missing indexes (SQL)
- Blocking I/O in async context
- Memory leaks (unclosed resources)

**Style & Readability:**
- Inconsistent naming
- Dead code
- Overly complex logic
- Missing or misleading comments
- Magic numbers

**Logic:**
- Unreachable code
- Inverted conditions
- Missing edge cases
- Incorrect operator precedence

### Requirements
- Parse unified diff format correctly (handle renames, binary files, multi-file diffs)
- Map line numbers correctly (old vs new file)
- Support diffs of at least: Python, TypeScript/JavaScript, Go, SQL, YAML
- Output as JSON array (machine-parseable)
- Also output a human-readable summary (markdown)
- Exit code: 0 if no critical issues, 1 if critical issues found

### Bonus
- \`--format=github\` flag: output as GitHub PR review comment format (file, position, body)
- \`--severity=warning\` flag: only show issues at or above a severity threshold
- \`--ignore=style\` flag: skip categories
- Integration with git: \`tool --git HEAD~1\` to review the last commit directly
- Confidence scores on each finding`,
      category: "devtools",
      input_spec: `A unified diff string from stdin or a file argument. Multi-file diffs must be supported. Example: the output of \`git diff HEAD~1\` or \`git diff main..feature-branch\`.`,
      output_spec: `1. JSON array of review comments (to stdout or a file)
2. Markdown summary with issue counts by severity and category
3. Exit code 0 (clean) or 1 (critical issues found)
4. SUBMISSION.md explaining analysis approach
5. README.md with usage examples`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 80_000,
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
    { task_id: task.id, name: "Detection Accuracy", description: "Does the tool find real issues? Are the bug/security/performance findings legitimate, or mostly false positives? Does it catch subtle issues (off-by-one, race conditions, injection) or just surface-level style nits?", weight: 35, position: 1 },
    { task_id: task.id, name: "Diff Parsing", description: "Does it correctly parse unified diff format? Handle multi-file diffs, renames, binary files, context lines? Are line numbers mapped correctly between old and new versions?", weight: 20, position: 2 },
    { task_id: task.id, name: "Output Quality", description: "Are review comments actionable? Do suggestions include actual code fixes? Is the severity classification reasonable? Is the markdown summary useful?", weight: 20, position: 3 },
    { task_id: task.id, name: "Language Support", description: "Does it handle Python, TypeScript, Go, SQL, and YAML diffs? Are language-specific patterns recognized (e.g., SQL injection in SQL, XSS in JSX)?", weight: 15, position: 4 },
    { task_id: task.id, name: "Documentation", description: "Clear README with examples, honest SUBMISSION.md explaining approach and limitations", weight: 10, position: 5 },
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
  console.log(`Category: devtools`);
  console.log(`Difficulty: Hard (3-5 hours)`);
  console.log(`Rubric: Detection 35%, Parsing 20%, Output 20%, Languages 15%, Docs 10%`);
}

main().catch(console.error);
