import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  getWorkspaceFile,
  deleteWorkspaceFile,
  getWorkspaceFileMetadata,
} from "@/services/workspace-files.service";

/**
 * /api/v1/workspace/files/[...path] — per-file operations.
 *
 * GET    — download the file. Returns raw bytes with the stored
 *          content_type. Path can include slashes (catch-all route).
 * DELETE — remove the file.
 *
 * Path segments are URL-decoded and joined with `/` to reconstruct the
 * original key. The service-layer `validatePath` enforces the charset +
 * absence of `..` traversal.
 */
function joinPath(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { path: segments } = await params;
  const path = joinPath(segments);
  const db = createServiceClient();

  // If the caller asked for metadata only (X-Workspace-Metadata-Only or
  // ?metadata=1), short-circuit the bytes download — useful for daemons
  // checking size before downloading large files.
  const url = new URL(req.url);
  if (url.searchParams.get("metadata") === "1" || req.headers.get("x-workspace-metadata-only")) {
    const meta = await getWorkspaceFileMetadata(db, user.supabaseId, path);
    if ("kind" in meta) return mapFilesError(meta);
    return NextResponse.json(meta);
  }

  const result = await getWorkspaceFile(db, user.supabaseId, path);
  if ("kind" in result) return mapFilesError(result);

  // NextResponse wants BodyInit; pin the Uint8Array to a typed ArrayBuffer
  // view that satisfies the runtime fetch types regardless of TS's
  // ArrayBufferLike narrowing.
  const body: BodyInit = new Blob([result.bytes as unknown as ArrayBuffer], {
    type: result.content_type,
  });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": result.content_type,
      "Content-Length": String(result.size_bytes),
      "X-Workspace-Path": result.path,
      "X-Workspace-Updated-At": result.updated_at,
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { path: segments } = await params;
  const path = joinPath(segments);
  const db = createServiceClient();

  const result = await deleteWorkspaceFile(db, user.supabaseId, path);
  if ("kind" in result) return mapFilesError(result);
  return NextResponse.json(result);
}

function mapFilesError(err: { kind: string } & Record<string, unknown>) {
  switch (err.kind) {
    case "invalid_path":
      return apiError(String(err.reason ?? "invalid path"), 400, "INVALID_PATH");
    case "not_found":
      return apiError("File not found", 404);
    case "storage_error":
      return apiError(
        `Storage error: ${err.reason ?? "operation failed"}`,
        500,
        "STORAGE_ERROR"
      );
    case "internal":
    default:
      return apiError("Internal error", 500);
  }
}
