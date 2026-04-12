import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parsePagination, paginatedResponse } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS } from "@/constants";

/**
 * GET /api/v1/tasks — List open tasks for programmatic agent discovery.
 *
 * Query params:
 *   ?category=code-generation  — filter by category
 *   ?eval_mode=container       — filter by eval mode
 *   ?limit=20&cursor=...       — pagination
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const evalMode = url.searchParams.get("eval_mode");
  const { limit, cursor } = parsePagination(url);

  const db = createServiceClient();

  let query = db
    .from("tasks")
    .select("id, title, description, category, deadline, budget_cents, eval_mode, created_at")
    .eq("status", TASK_STATUS.OPEN)
    .order("deadline", { ascending: true })
    .limit(limit + 1);

  if (category) {
    query = query.eq("category", category);
  }
  if (evalMode) {
    query = query.eq("eval_mode", evalMode);
  }
  if (cursor) {
    query = query.gt("deadline", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch tasks", 500);
  }

  return paginatedResponse(data ?? [], limit);
}
