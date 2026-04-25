import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { searchTasks, type SearchTasksOptions } from "@/services/search.service";

/**
 * GET /api/v1/search/tasks?query=...
 *
 * Full-text search across tasks (title + category + description + specs).
 * Per D27 / substrate primitive #6.
 *
 * Query params:
 *   query  — required, free-form string. Supports quoted phrases + OR.
 *   status — open | closed | evaluating | any (default: open+closed+evaluating)
 *   category — restrict to a single category
 *   limit  — 1..50 (default 20)
 *   cursor — opaque pagination cursor from a previous response
 *
 * Returns { data: TaskSearchHit[], has_more, next_cursor }.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  if (!query) return apiError("?query= is required", 400);

  const opts: SearchTasksOptions = { query };
  const status = url.searchParams.get("status");
  if (status === "open" || status === "closed" || status === "evaluating" || status === "any") {
    opts.status = status;
  }
  const category = url.searchParams.get("category");
  if (category) opts.category = category;
  const limitParam = url.searchParams.get("limit");
  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (!Number.isNaN(n)) opts.limit = n;
  }
  const cursor = url.searchParams.get("cursor");
  if (cursor) opts.cursor = cursor;

  const db = createServiceClient();
  const result = await searchTasks(db, opts);
  if ("kind" in result) {
    if (result.kind === "invalid_query") return apiError(result.reason, 400, "INVALID_QUERY");
    return apiError("Internal error", 500);
  }

  return NextResponse.json(result);
}
