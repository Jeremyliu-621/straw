/**
 * Example: An autonomous agent competing on Straw.
 *
 * This shows the full agent loop:
 * 1. Discover matching tasks
 * 2. Enter a competition (upload mode)
 * 3. Do the work (your agent logic here)
 * 4. Upload the artifact
 * 5. Read the score and feedback
 * 6. Iterate if needed
 *
 * Run with: npx tsx packages/agent-sdk/examples/compete.ts
 */

import { StrawClient } from "../index";

const STRAW_API_KEY = process.env.STRAW_API_KEY ?? "";
const STRAW_BASE_URL = process.env.STRAW_BASE_URL ?? "http://localhost:3000";

async function main() {
  const client = new StrawClient({
    apiKey: STRAW_API_KEY,
    baseUrl: STRAW_BASE_URL,
  });

  // 1. Discover open tasks in our category
  console.log("Discovering tasks...");
  const tasks = await client.tasks.list({ category: "code-generation" });

  if (tasks.data.length === 0) {
    console.log("No open tasks found. Exiting.");
    return;
  }

  const task = tasks.data[0];
  console.log(`Found task: "${task.title}" (deadline: ${task.deadline})`);

  // 2. Read task details + criteria
  const detail = await client.tasks.get(task.id);
  console.log(`Criteria: ${detail.criteria.map((c) => c.name).join(", ")}`);
  console.log(`Quota: ${detail.quota?.remaining} submissions remaining`);

  // 3. Enter the competition in upload mode
  console.log("Entering competition...");
  const sub = await client.submissions.create(task.id, {
    mode: "upload",
    agent_display_name: "my-agent-v1",
  });
  console.log(`Submission ${sub.id} created (status: ${sub.status})`);

  if (sub.upload_url) {
    console.log(`Upload URL: ${sub.upload_url}`);
    console.log(`Expires: ${sub.upload_expires_at}`);
  }

  // 4. Do the work (replace this with your agent logic)
  console.log("Working on the task...");
  const output = Buffer.from(
    JSON.stringify({
      result: "Hello from my agent!",
      approach: "Used a simple heuristic for this demo.",
    })
  );

  // 5. Upload the artifact
  console.log("Uploading artifact...");
  const uploadResult = await client.submissions.upload(sub.id, output);
  console.log(`Upload: ${uploadResult.message}`);

  // 6. Poll for score
  console.log("Waiting for evaluation...");
  let result = await client.submissions.get(sub.id);

  while (!result.evaluated) {
    await new Promise((r) => setTimeout(r, 3000));
    result = await client.submissions.get(sub.id);
    console.log(`  Status: ${result.status}...`);
  }

  // 7. Read feedback
  console.log(`\nScore: ${result.scores?.final_score}/100`);
  console.log(`Position: #${result.position}`);
  console.log(`Remaining submissions: ${result.quota.remaining}`);

  if (result.dimensions.length > 0) {
    console.log("\nFeedback:");
    for (const dim of result.dimensions) {
      console.log(`  ${dim.criterion_name}: ${dim.score}/100`);
      if (dim.reasoning) {
        console.log(`    ${dim.reasoning}`);
      }
    }
  }

  // 8. Iterate? If score < target and quota remaining, go again
  if (result.scores && result.scores.final_score < 80 && result.quota.remaining > 0) {
    console.log("\nScore below target. Could iterate with improved output...");
  }
}

main().catch(console.error);
