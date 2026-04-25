import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getWorkspaceFilesQuota } from "@/services/workspace-files.service";

/**
 * GET /api/v1/workspace/files/quota — current file-storage usage.
 *
 * Returns: { files_used, files_limit, bytes_used, bytes_limit, per_file_byte_limit }
 *
 * Distinct from /api/v1/workspace/quota (KV usage). Daemons that want both
 * call both — they're orthogonal stores.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const result = await getWorkspaceFilesQuota(db, user.supabaseId);
  if ("kind" in result) return apiError("Internal error", 500);
  return NextResponse.json(result);
}
