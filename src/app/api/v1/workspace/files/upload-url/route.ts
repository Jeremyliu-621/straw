import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { mintWorkspaceFileUploadUrl } from "@/services/workspace-files.service";
import { mapFilesError } from "../route";

/**
 * POST /api/v1/workspace/files/upload-url — phase 1 of the presigned
 * upload flow. Bypasses Vercel's ~4.5MB function-body cap by handing the
 * client a one-shot signed PUT URL pointing directly at Supabase Storage.
 *
 * Body (JSON):
 *   {
 *     "path": "models/agent-v3.bin",            // required
 *     "expected_size_bytes": 78643200,          // optional, advisory quota check
 *     "content_type": "application/octet-stream" // optional
 *   }
 *
 * Response:
 *   {
 *     "upload_url": "https://<project>.supabase.co/storage/v1/...",
 *     "upload_method": "PUT",
 *     "path": "models/agent-v3.bin",
 *     "storage_ref": "<agent_id>/models/agent-v3.bin",
 *     "expires_at": "<iso8601 — ~2h from now>",
 *     "finalize_url": "/api/v1/workspace/files/finalize",
 *     "finalize_method": "POST"
 *   }
 *
 * Flow:
 *   1. Client POSTs here with the path.
 *   2. Client sends bytes via PUT to upload_url (no Authorization header,
 *      the URL is self-authenticating; just `Content-Type` and the body).
 *   3. Client POSTs to finalize_url with `{ path }` to write the metadata
 *      row. Returns the same shape as POST /api/v1/workspace/files.
 *
 * For files <4MB the legacy `POST /api/v1/workspace/files` (JSON-base64
 * or octet-stream) still works and is simpler — one round-trip instead
 * of three. Use this presigned flow for anything bigger.
 *
 * Rate-limited via the general 60/min/IP gate.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as {
    path?: unknown;
    expected_size_bytes?: unknown;
    content_type?: unknown;
  };

  if (typeof body?.path !== "string") {
    return apiError("Body must include `path` (string)", 400);
  }

  let expectedSize: number | undefined;
  if (body.expected_size_bytes !== undefined) {
    if (
      typeof body.expected_size_bytes !== "number" ||
      !Number.isFinite(body.expected_size_bytes) ||
      body.expected_size_bytes < 0
    ) {
      return apiError("`expected_size_bytes` must be a non-negative number if provided", 400);
    }
    expectedSize = body.expected_size_bytes;
  }

  const contentType =
    typeof body.content_type === "string" ? body.content_type : undefined;

  const db = createServiceClient();
  const result = await mintWorkspaceFileUploadUrl(db, user.supabaseId, {
    path: body.path,
    expected_size_bytes: expectedSize,
    content_type: contentType,
  });

  if ("kind" in result) return mapFilesError(result);
  return NextResponse.json(result);
}
