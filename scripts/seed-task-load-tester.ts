/**
 * Seed script: Create "Build a REST API Load Tester" task (Hard — 3-5 hours)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

async function main() {
  console.log("Creating task: Build a REST API Load Tester...\n");

  const { data: task, error: taskError } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: "Build a REST API Load Tester",
      description: `Build a command-line load testing tool for REST APIs.

## Core Requirements

1. **Configuration**: Accept a YAML or JSON config file specifying:
   - Target URL(s) with HTTP method, headers, and body templates
   - Concurrency level (number of parallel workers)
   - Total request count OR duration (e.g., "send 10000 requests" or "run for 60 seconds")
   - Ramp-up pattern: instant, linear, or step-based
   - Variable substitution in URLs/bodies (e.g., \`/users/{{random_id}}\`)

2. **Execution Engine**:
   - True concurrent requests (not sequential with delays)
   - Respect the configured concurrency limit
   - Support GET, POST, PUT, PATCH, DELETE
   - Track per-request: status code, latency, response size, errors
   - Graceful shutdown on SIGINT (finish in-flight, report partial results)

3. **Statistics & Reporting**:
   - Real-time progress bar or status line during execution
   - Final report with: total requests, success/failure counts, requests/sec
   - Latency percentiles: min, p50, p75, p90, p95, p99, max
   - Status code distribution (e.g., "200: 9500, 429: 400, 500: 100")
   - Error breakdown by type (timeout, connection refused, DNS failure, etc.)
   - Generate an HTML report with charts (latency distribution histogram, throughput over time)

4. **Advanced Features** (bonus, not required):
   - Request chaining: use response data from one request in the next (e.g., login → use token)
   - Comparison mode: run the same test against two URLs, output a diff report
   - Custom assertions: fail a request if response doesn't match a condition (status 200, body contains "ok")
   - CSV output for raw results

## Constraints
- You may use any language
- External HTTP libraries are allowed (requests, aiohttp, axios, etc.)
- Charting libraries allowed for HTML report (Chart.js, matplotlib, etc.)
- Must handle targets that rate-limit (429 responses) without crashing
- Must work on a single machine (no distributed mode required)`,
      category: "devtools",
      input_spec: `A YAML configuration file. Example:

\`\`\`yaml
target:
  base_url: "https://httpbin.org"
  endpoints:
    - path: "/get"
      method: GET
      weight: 70
    - path: "/post"
      method: POST
      headers:
        Content-Type: "application/json"
      body: '{"user": "{{random_string(8)}}", "ts": "{{timestamp}}"}'
      weight: 30

load:
  concurrency: 50
  requests: 5000
  ramp_up: "linear:30s"

reporting:
  html: true
  csv: false
\`\`\``,
      output_spec: `1. A working CLI tool that reads the config and executes the load test
2. Console output showing real-time progress and final statistics
3. An HTML report file with latency histogram and throughput-over-time chart
4. A SUBMISSION.md explaining architecture, concurrency model, and design decisions`,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      budget_cents: 100_000,
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

  console.log(`Task created: ${task.id}`);

  // Insert rubric criteria
  const criteria = [
    { task_id: task.id, name: "Execution Correctness", description: "Does the tool actually send concurrent requests as configured? Are latency measurements accurate? Does it handle errors gracefully? Does ramp-up work?", weight: 30, position: 1 },
    { task_id: task.id, name: "Statistics & Reporting", description: "Are percentile calculations correct? Is the HTML report generated with actual charts? Does the status code distribution match reality? Is the real-time progress informative?", weight: 25, position: 2 },
    { task_id: task.id, name: "Configuration Flexibility", description: "Does the YAML/JSON config support all specified options? Variable substitution? Multiple endpoints with weights? Ramp-up patterns?", weight: 20, position: 3 },
    { task_id: task.id, name: "Code Quality & Architecture", description: "Is the concurrency model well-designed? Clean separation between config parsing, execution, statistics, and reporting? Good error handling? No race conditions?", weight: 15, position: 4 },
    { task_id: task.id, name: "Documentation", description: "Clear README with install/run instructions? Good SUBMISSION.md with architecture explanation and design tradeoffs?", weight: 10, position: 5 },
  ];

  const { error: criteriaError } = await db.from("rubric_criteria").insert(criteria);
  if (criteriaError) {
    console.error("Failed to insert criteria:", criteriaError);
    process.exit(1);
  }

  // Publish the task
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
  console.log(`Rubric: 5 criteria (Execution 30%, Reporting 25%, Config 20%, Code 15%, Docs 10%)`);
}

main().catch(console.error);
