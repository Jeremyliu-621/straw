/**
 * Seed two additional tasks for Phase 18b testing.
 *
 * Creates:
 * - "Build a URL shortener API" — code-generation, LLM eval
 * - "Parse and normalize messy CSV data" — data-analysis, LLM eval
 *
 * Uses the existing company user (bb5b5819-f0e2-4f09-ae6f-53de6475f129)
 * from the seed-competition script.
 *
 * Usage: npx tsx scripts/seed-more-tasks.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const COMPANY_ID = "bb5b5819-f0e2-4f09-ae6f-53de6475f129";

interface TaskDef {
  title: string;
  description: string;
  category: string;
  input_spec: string;
  output_spec: string;
  rubric: Array<{ name: string; description: string; weight: number; position: number }>;
}

const TASKS: TaskDef[] = [
  {
    title: "Build a URL shortener API",
    description: `Build a URL shortener REST API with the following requirements:

Core endpoints:
- POST /shorten — accepts { "url": "https://example.com/very/long/path" }, returns { "short_url": "http://localhost:8080/abc123", "id": "abc123" }
- GET /:id — redirects (HTTP 302) to the original URL
- GET /stats/:id — returns { "id": "abc123", "original_url": "...", "created_at": "...", "click_count": 42 }

Requirements:
- Short IDs must be URL-safe (alphanumeric, 6-8 characters)
- Duplicate URLs should return the same short ID (idempotent)
- Invalid URLs rejected with 400 and a clear error message
- Click tracking: every redirect increments a counter
- In-memory storage is fine (no database required)
- Include proper error handling for missing IDs (404)
- Return JSON for all API responses (not HTML)

Bonus (not required):
- Custom short ID support (POST /shorten with optional "custom_id" field)
- Expiration (TTL) support
- Rate limiting
- Health check endpoint (GET /health)

You may use any language/framework. Include a README explaining how to build and run it.`,
    category: "code-generation",
    input_spec: `An OpenAPI-style specification of the expected endpoints:

POST /shorten
  Request: { "url": "https://example.com/long/path" }
  Response 201: { "short_url": "http://localhost:8080/abc123", "id": "abc123" }
  Response 400: { "error": "Invalid URL" }

GET /:id
  Response 302: Redirect to original URL
  Response 404: { "error": "Not found" }

GET /stats/:id
  Response 200: { "id": "abc123", "original_url": "...", "created_at": "...", "click_count": 42 }
  Response 404: { "error": "Not found" }`,
    output_spec: "A working URL shortener API implementation with all required endpoints. Include source code, a README with run instructions, and a SUBMISSION.md.",
    rubric: [
      { name: "API Correctness", description: "Do all three endpoints work as specified? Does POST /shorten return the right shape? Does GET /:id actually redirect? Does GET /stats/:id track clicks?", weight: 35, position: 0 },
      { name: "Code Quality", description: "Is the code clean, well-organized, and idiomatic? Proper error handling? No hardcoded values? Good separation of routing/storage/logic?", weight: 25, position: 1 },
      { name: "Edge Cases", description: "Does it handle invalid URLs, missing IDs, duplicate submissions, empty bodies, malformed JSON? Are error messages helpful?", weight: 25, position: 2 },
      { name: "Documentation", description: "Is there a clear README with setup/run instructions? Does SUBMISSION.md accurately describe the solution and tradeoffs?", weight: 15, position: 3 },
    ],
  },
  {
    title: "Parse and normalize messy CSV data",
    description: `Build a tool that reads a messy CSV file and outputs clean, normalized JSON.

The input CSV has these problems (you must handle all of them):
- Inconsistent column names (e.g., "First Name", "first_name", "firstName", "FIRST NAME" all mean the same thing)
- Mixed date formats ("2024-01-15", "01/15/2024", "Jan 15, 2024", "15-Jan-2024")
- Phone numbers in various formats ("(555) 123-4567", "555.123.4567", "+1-555-123-4567", "5551234567")
- Currency values with/without symbols ("$1,234.56", "1234.56", "USD 1234.56")
- Empty rows and rows with only whitespace
- Quoted fields with embedded commas and newlines
- Leading/trailing whitespace in values
- Inconsistent boolean representations ("true", "yes", "1", "Y", "TRUE")

Expected output format (JSON array):
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "date_of_birth": "2024-01-15",
    "salary": 123456,
    "is_active": true
  }
]

Requirements:
- Normalize all column names to snake_case
- Normalize dates to ISO 8601 (YYYY-MM-DD)
- Normalize phone numbers to E.164 format (+1XXXXXXXXXX)
- Normalize currency to integer cents (no floating point)
- Normalize booleans to true/false
- Skip empty/whitespace-only rows
- Trim all string values
- Read from stdin or file argument, write to stdout

You may use any language. Include a README explaining how to build and run it.`,
    category: "data-analysis",
    input_spec: `Sample CSV with edge cases:

"First Name","Last Name",email,"Phone Number","Date of Birth",Salary,Active
John,Doe,john@example.com,(555) 123-4567,2024-01-15,"$85,000.00",yes
  Jane  , Smith ,jane@example.com,555.987.6543,01/15/1990,"USD 92000",true
"Bob ""Bobby""",Johnson,bob@example.com,+1-555-456-7890,"Jan 15, 2024",75000.00,1
,,,,,,
   ,   ,   ,   ,   ,   ,
Alice,Williams,alice@example.com,5559876543,15-Jan-1985,"$120,500.50",Y
"Charlie, Jr.",Brown,charlie@example.com,(555) 111-2222,2023-12-25,$0.00,FALSE
Dave,Wilson,dave@example.com,555-333-4444,03/20/1995,"1,234.56",no`,
    output_spec: `Clean JSON array written to stdout. Each object has normalized fields: first_name (string), last_name (string), email (string), phone (E.164 string), date_of_birth (ISO 8601 string), salary (integer cents), is_active (boolean). Empty rows are excluded.`,
    rubric: [
      { name: "Parsing Correctness", description: "Does it handle all the edge cases in the sample CSV? Quoted fields with commas? Embedded quotes? Mixed formats?", weight: 35, position: 0 },
      { name: "Normalization Quality", description: "Are dates, phones, currency, and booleans all normalized to the specified formats? Snake_case column names?", weight: 30, position: 1 },
      { name: "Code Quality", description: "Clean, readable code. No giant regex walls. Proper separation of parsing, normalization, and output. Error handling for malformed rows.", weight: 20, position: 2 },
      { name: "Documentation", description: "Clear README with how to run. SUBMISSION.md explaining approach, what works, and known limitations.", weight: 15, position: 3 },
    ],
  },
];

async function seedTask(taskDef: TaskDef): Promise<string> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .insert({
      company_id: COMPANY_ID,
      title: taskDef.title,
      description: taskDef.description,
      category: taskDef.category,
      input_spec: taskDef.input_spec,
      output_spec: taskDef.output_spec,
      test_weight: 0,
      llm_weight: 100,
      budget_cents: 50000,
      deadline: deadline.toISOString(),
      status: "open",
      eval_mode: "llm",
    })
    .select()
    .single();

  if (taskErr) throw new Error(`Failed to create task "${taskDef.title}": ${taskErr.message}`);

  await db.from("rubric_criteria").insert(
    taskDef.rubric.map((r) => ({ task_id: task.id, ...r }))
  );

  return task.id as string;
}

async function seed() {
  console.log("\n  Seeding additional tasks...\n");

  // Verify company exists
  const { data: company } = await db.from("users").select("id, name").eq("id", COMPANY_ID).single();
  if (!company) {
    console.error(`  Company user ${COMPANY_ID} not found. Run seed:competition first.`);
    process.exit(1);
  }
  console.log(`  Company: ${company.name} (${company.id})`);

  for (const taskDef of TASKS) {
    // Check if task already exists (by title + company)
    const { data: existing } = await db
      .from("tasks")
      .select("id")
      .eq("company_id", COMPANY_ID)
      .eq("title", taskDef.title)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  Task already exists: "${taskDef.title}" (${existing.id})`);
      continue;
    }

    const taskId = await seedTask(taskDef);
    console.log(`  Created: "${taskDef.title}" (${taskId})`);
  }

  console.log("\n  Done.\n");
}

seed().catch((err) => {
  console.error("\n  Seed failed:", err.message);
  process.exit(1);
});
