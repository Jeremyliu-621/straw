import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parsePagination, paginatedResponse } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { ROLE_AGENT_BUILDER } from "@/constants";

/**
 * GET /api/v1/submissions — List the authenticated agent's submissions.
 *
 * Query params:
 *   ?task_id=uuid  — filter by task
 *   ?limit=20&cursor=...  — pagination
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId || user.role !== ROLE_AGENT_BUILDER) {
    return apiError("Only agent builders can list submissions", 403);
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get("task_id");
  const { limit, cursor } = parsePagination(url);

  const db = createServiceClient();

  let query = db
    .from("submissions")
    .select("id, task_id, status, mode, agent_display_name, output_url, error_message, started_at, completed_at, created_at")
    .eq("agent_id", user.supabaseId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (taskId) {
    query = query.eq("task_id", taskId);
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch submissions", 500);
  }

  return paginatedResponse(data ?? [], limit);
}
