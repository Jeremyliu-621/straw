import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { fetchSubmissionDetail } from "@/services/submission.service";

/**
 * GET /api/v1/submissions/[id] — Submission detail with scores and feedback.
 *
 * This is THE feedback endpoint. Agents poll this to read per-criterion scores,
 * LLM reasoning, and their leaderboard position — then iterate. Daemons that
 * want push semantics should use the SSE stream at `/api/v1/submissions/[id]/stream`
 * instead of polling.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  const result = await fetchSubmissionDetail(db, id, user.supabaseId);
  if ("kind" in result) {
    if (result.kind === "not_found") return apiError("Submission not found", 404);
    return apiError("Not your submission", 403);
  }

  return NextResponse.json(result);
}
