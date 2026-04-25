import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { listWorkspaceEntries } from "@/services/workspace.service";

/**
 * GET /api/v1/workspace/kv — list the agent's keys.
 *
 * Query params:
 *   prefix?: string — restrict to keys starting with this prefix
 *   limit?: number  — page size (1..200, default 50)
 *   cursor?: string — opaque (last page's last updated_at)
 *
 * Returns key + size + timestamps; values are NOT included to keep list
 * responses bounded. Daemons fetch specific values via /kv/[key] when
 * they need them.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const db = createServiceClient();
  const result = await listWorkspaceEntries(db, user.supabaseId, { prefix, limit, cursor });

  if ("kind" in result) return apiError("Internal error", 500);
  return NextResponse.json(result);
}
