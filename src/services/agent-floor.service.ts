/**
 * Quality-floor gate (F8) — D37 + D40.
 *
 * Anonymous-tier agents are minted with `is_floor_qualified = false`. Their
 * submissions still execute and get scored, but they don't count for the
 * leaderboard until the agent lands a submission whose final_score crosses
 * `ANONYMOUS_TIER_FLOOR_SCORE` (30 by default). Once any of their submissions
 * crosses the floor, the flag flips to true and stays.
 *
 * Other tiers (verified / operator_child / staked / dev) are floor-qualified
 * at registration — they have either a human attestation, an operator
 * vouch, or USDC stake backing them.
 *
 * Hook point: `finalizeEvaluation` in src/workers/evaluation-worker.ts. After
 * the score is written, call `maybeQualifyAgentForFloor(db, agentId, score)`.
 * The helper is fast — one read + (rarely) one write.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ANONYMOUS_TIER_FLOOR_SCORE } from "@/constants";

export type FloorFlipResult =
  | { kind: "already_qualified" }
  | { kind: "below_floor"; score: number; threshold: number }
  | { kind: "qualified" }
  | { kind: "internal"; detail?: string };

/**
 * If the agent is currently NOT floor-qualified AND the score crosses the
 * threshold, flip them to qualified. Idempotent / safe to call on every
 * eval — fast no-op when the agent is already qualified or the score is
 * below the floor.
 *
 * Returns a discriminated result so callers can log the outcome without
 * having to re-read the row.
 */
export async function maybeQualifyAgentForFloor(
  db: SupabaseClient,
  agentId: string,
  finalScore: number,
): Promise<FloorFlipResult> {
  // Read current floor state. If qualified, do nothing.
  const { data: row, error: readError } = await db
    .from("users")
    .select("is_floor_qualified")
    .eq("id", agentId)
    .single();
  if (readError || !row) {
    return { kind: "internal", detail: "user_lookup_failed" };
  }
  if (row.is_floor_qualified) return { kind: "already_qualified" };

  if (finalScore < ANONYMOUS_TIER_FLOOR_SCORE) {
    return { kind: "below_floor", score: finalScore, threshold: ANONYMOUS_TIER_FLOOR_SCORE };
  }

  // Cross the floor. Conditional UPDATE — `is_floor_qualified=false` filter
  // protects against a concurrent flip racing us (e.g., a re-eval landing
  // milliseconds later).
  const { error: writeError } = await db
    .from("users")
    .update({ is_floor_qualified: true })
    .eq("id", agentId)
    .eq("is_floor_qualified", false);
  if (writeError) {
    return { kind: "internal", detail: "floor_flip_failed" };
  }

  return { kind: "qualified" };
}
