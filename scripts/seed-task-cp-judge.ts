/**
 * Seed script: Create "Competitive Programming Judge" task (Very Hard — 5+ hours)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Competitive Programming Judge...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Build a Competitive Programming Judge",
      description: `Build a system that evaluates competitive programming submissions — like a mini Codeforces or LeetCode judge.

## Core Requirements

### Input Format
A JSON problem definition:
\`\`\`json
{
  "id": "two-sum",
  "title": "Two Sum",
  "time_limit_ms": 2000,
  "memory_limit_mb": 256,
  "test_cases": [
    { "input": "4\\n2 7 11 15\\n9", "expected_output": "0 1" },
    { "input": "3\\n3 2 4\\n6", "expected_output": "1 2" },
    { "input": "2\\n3 3\\n6", "expected_output": "0 1" }
  ],
  "checker": "exact_match"
}
\`\`\`

Plus a submission: source code file + language identifier.

### Execution
- Run the submitted code in an isolated subprocess
- Feed each test case input via stdin
- Capture stdout
- Enforce time limit (TLE if exceeded)
- Enforce memory limit (MLE if exceeded — best effort, OS-dependent)
- Catch runtime errors (RE): segfaults, exceptions, non-zero exit codes
- Catch compilation errors (CE) for compiled languages

### Supported Languages
At minimum: Python 3, JavaScript (Node.js), and one compiled language (C, C++, Go, or Rust — whichever is available on the system).

### Verdicts
For each test case:
- **AC** (Accepted): output matches expected
- **WA** (Wrong Answer): output doesn't match
- **TLE** (Time Limit Exceeded): execution exceeded time limit
- **MLE** (Memory Limit Exceeded): execution exceeded memory limit
- **RE** (Runtime Error): crash, exception, non-zero exit
- **CE** (Compilation Error): code doesn't compile

### Output
A structured result:
\`\`\`json
{
  "verdict": "WA",
  "test_cases": [
    { "id": 1, "verdict": "AC", "time_ms": 45, "memory_kb": 12400 },
    { "id": 2, "verdict": "WA", "time_ms": 38, "memory_kb": 12200, "expected": "1 2", "actual": "2 1" },
    { "id": 3, "verdict": "AC", "time_ms": 42, "memory_kb": 12300 }
  ],
  "overall_time_ms": 125,
  "tests_passed": "2/3"
}
\`\`\`

### Checkers
Support multiple comparison modes:
- **exact_match**: output must match byte-for-byte (ignoring trailing whitespace/newlines)
- **token_match**: split both into tokens, compare token-by-token (ignoring extra whitespace)
- **float_match**: compare floating point numbers with configurable epsilon (e.g., 1e-6)
- **custom**: run a checker script that gets (input, expected, actual) and returns AC/WA

### Safety
- **DO NOT** run untrusted code without isolation. At minimum:
  - Subprocess with timeout
  - No network access (if possible)
  - No filesystem write access outside a temp directory
  - Resource limits (ulimit or equivalent)
- Document what isolation you provide and what you'd add in production (containers, seccomp, etc.)

### Deliverables
1. The judge system (CLI tool or library)
2. At least 3 sample problems with test cases
3. At least 3 sample submissions (1 AC, 1 WA, 1 TLE) per problem
4. SUBMISSION.md explaining isolation approach and limitations
5. README.md with setup and usage

## Bonus
- Web API mode: POST problem + code, get verdict back as JSON
- Leaderboard: track best submission per user per problem
- Special judge support (problems with multiple valid answers)
- Stress testing: auto-generate random test cases and compare against a brute-force solution`,
      category: "systems",
      input_spec: `A problem definition JSON file + a source code file + a language identifier. See the problem JSON schema in the description.`,
      output_spec: `A structured JSON verdict with per-test-case results including verdict, time, memory, and (for WA) expected vs actual output. Plus a human-readable summary.`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 200_000,
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
    { task_id: task.id, name: "Judging Correctness", description: "Does the judge correctly determine AC/WA/TLE/MLE/RE/CE for all test cases? Are time and memory measurements accurate? Do all checker modes work?", weight: 30, position: 1 },
    { task_id: task.id, name: "Safety & Isolation", description: "Is untrusted code sandboxed? What isolation is provided (subprocess timeout, no network, resource limits)? Is the approach documented honestly? Would it survive a malicious submission (fork bomb, /dev/urandom read, etc.)?", weight: 25, position: 2 },
    { task_id: task.id, name: "Language Support", description: "Does it support Python, JavaScript, and at least one compiled language? Are compilation errors caught cleanly? Does it handle language-specific edge cases (Python recursion limit, Node.js async)?", weight: 20, position: 3 },
    { task_id: task.id, name: "Sample Problems & Testing", description: "Are the 3+ sample problems well-designed? Do the sample submissions cover all verdict types? Is there a test suite that verifies the judge itself?", weight: 15, position: 4 },
    { task_id: task.id, name: "Documentation", description: "Clear README, thorough SUBMISSION.md with honest security assessment, good usage examples", weight: 10, position: 5 },
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
  console.log(`Category: systems`);
  console.log(`Difficulty: Very Hard (5+ hours)`);
  console.log(`Rubric: Judging 30%, Safety 25%, Languages 20%, Samples 15%, Docs 10%`);
}

main().catch(console.error);
