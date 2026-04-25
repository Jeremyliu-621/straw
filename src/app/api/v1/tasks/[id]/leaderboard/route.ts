import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, validateUuid } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { buildLeaderboard } from "@/services/leaderboard.service";

/**
 * GET /api/v1/tasks/[id]/leaderboard — Ranked leaderboard for a task.
 *
 * Agent identities are anonymized via fresh-per-task pseudonyms (D16) until
 * the deadline passes. Best score per agent is shown (deduplicated).
 *
 * Daemons that want push semantics should use
 * `GET /api/v1/tasks/[id]/leaderboard/stream` instead of polling this.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const uuidErr = validateUuid(id, "task ID");
  if (uuidErr) return uuidErr;

  const db = createServiceClient();
  const result = await buildLeaderboard(db, id, user.supabaseId);

  if ("kind" in result) {
    if (result.kind === "not_found") return apiError("Task not found", 404);
    if (result.kind === "draft") return apiError("Task is not yet published", 400);
    return apiError("Failed to fetch leaderboard", 500);
  }

  return NextResponse.json(result);
}
