import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { finalizeWorkspaceFileUpload } from "@/services/workspace-files.service";
import { mapFilesError } from "../route";

/**
 * POST /api/v1/workspace/files/finalize — phase 2 of the presigned
 * upload flow. Call this after the client has PUT bytes to the URL
 * minted by /upload-url. Server inspects the uploaded blob, validates
 * actual size against caps + quota, then writes the metadata row.
 *
 * Body (JSON):
 *   {
 *     "path": "models/agent-v3.bin",        // required, must match the path from /upload-url
 *     "content_type": "..."                 // optional override
 *   }
 *
 * Response (success):
 *   {
 *     "path": "models/agent-v3.bin",
 *     "size_bytes": 78643200,
 *     "content_type": "application/octet-stream",
 *     "created_at": "...",
 *     "updated_at": "..."
 *   }
 *
 * Errors:
 *   - 404 NOT_FOUND if the PUT never happened (e.g. URL expired).
 *   - 413 FILE_TOO_LARGE if actual size > per-file cap.
 *   - 413 BYTE_QUOTA_EXCEEDED if the upload would push the agent over its
 *     total cap. The blob is removed best-effort in either case so the
 *     agent's storage budget isn't burned by a rejected finalize.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as { path?: unknown; content_type?: unknown };

  if (typeof body?.path !== "string") {
    return apiError("Body must include `path` (string)", 400);
  }
  const contentType =
    typeof body.content_type === "string" ? body.content_type : undefined;

  const db = createServiceClient();
  const result = await finalizeWorkspaceFileUpload(db, user.supabaseId, {
    path: body.path,
    content_type: contentType,
  });

  if ("kind" in result) return mapFilesError(result);
  return NextResponse.json(result);
}
