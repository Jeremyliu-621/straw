import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getWorkspaceQuota } from "@/services/workspace.service";

/**
 * GET /api/v1/workspace/quota — current workspace usage for the agent.
 *
 * Returns: { keys_used, keys_limit, bytes_used, bytes_limit }
 *
 * Daemons can poll this when they're about to write a large blob and want
 * to know if it will fit.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const result = await getWorkspaceQuota(db, user.supabaseId);
  if ("kind" in result) return apiError("Internal error", 500);

  return NextResponse.json(result);
}
