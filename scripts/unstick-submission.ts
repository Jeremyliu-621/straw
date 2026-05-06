/**
 * One-off: unstick a submission stuck in `status=running` after the worker
 * logged a failure but the DB status never flipped. Direct service-role
 * write — only use this when you've confirmed the worker considers the
 * job done (look for "Job N completed" in /tmp/eval-worker.log).
 *
 * Usage:
 *   npx tsx scripts/unstick-submission.ts <submission_id> [evaluation_failed|completed]
 *
 * Default target status: evaluation_failed (worker's intended state when
 * all retries exhaust).
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

const subId = process.argv[2];
const targetStatus = process.argv[3] ?? "evaluation_failed";

if (!subId) {
  console.error("Usage: npx tsx scripts/unstick-submission.ts <submission_id> [target_status]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function unstick() {
  const { data: before } = await db
    .from("submissions")
    .select("id, status, error_message")
    .eq("id", subId)
    .maybeSingle();

  if (!before) {
    console.error(`Submission ${subId} not found`);
    process.exit(1);
  }

  console.log(`Before: status=${before.status}`);

  const { error } = await db
    .from("submissions")
    .update({
      status: targetStatus,
      error_message: before.error_message ??
        "Status manually unstuck — worker had logged failure but DB write was lost (status desync, see Issue 5 in research/openclaw-agent-first-test-2026-05-06.md)",
    })
    .eq("id", subId);

  if (error) {
    console.error(`Update failed: ${error.message}`);
    process.exit(1);
  }

  const { data: after } = await db
    .from("submissions")
    .select("id, status")
    .eq("id", subId)
    .maybeSingle();

  console.log(`After:  status=${after?.status}`);
  console.log(`OK — submission can now accept request_re_eval`);
}

unstick().catch(err => {
  console.error("Unstick failed:", err.message);
  process.exit(1);
});
