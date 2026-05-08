import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  uploadWorkspaceFile,
  listWorkspaceFiles,
} from "@/services/workspace-files.service";

/**
 * POST /api/v1/workspace/files — upload a workspace file.
 *
 * Body shape (JSON):
 *   {
 *     path: "compiled/agent-v3.bin",        // required
 *     content_base64: "<base64 bytes>",      // required (one of)
 *     content_type: "application/octet-stream" // optional
 *   }
 *
 * Bytes are decoded server-side and uploaded to Supabase Storage. JSON +
 * base64 keeps the surface uniform across the SDK and the MCP layer (MCP
 * tools take JSON-only inputs); for very large files (>~10MB) prefer the
 * SDK's `uploadFile` which can accept a raw Uint8Array directly via this
 * same endpoint with `Content-Type: application/octet-stream` and the
 * path/content_type in headers.
 *
 * Caps: 25MB per file, 100MB total per agent, 1k files per agent.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  // Two body shapes: JSON {path, content_base64} or raw bytes with path
  // in `X-Workspace-Path` header. The latter avoids the base64 33% bloat
  // for large blobs.
  const contentType = req.headers.get("content-type") ?? "";
  let path: string;
  let bytes: Uint8Array;
  let storedContentType: string;

  if (contentType.startsWith("application/octet-stream")) {
    const headerPath = req.headers.get("x-workspace-path");
    if (!headerPath) {
      return apiError("X-Workspace-Path header required for octet-stream uploads", 400);
    }
    path = headerPath;
    storedContentType = req.headers.get("x-workspace-content-type") ?? "application/octet-stream";
    bytes = new Uint8Array(await req.arrayBuffer());
  } else {
    const parsed = await parseBody(req);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data as { path?: unknown; content_base64?: unknown; content_type?: unknown };
    if (typeof body?.path !== "string") return apiError("Body must include `path` (string)", 400);
    if (typeof body?.content_base64 !== "string") {
      return apiError("Body must include `content_base64` (base64-encoded string)", 400);
    }
    path = body.path;
    storedContentType =
      typeof body.content_type === "string" ? body.content_type : "application/octet-stream";
    try {
      bytes = new Uint8Array(Buffer.from(body.content_base64, "base64"));
    } catch {
      return apiError("`content_base64` is not valid base64", 400);
    }
  }

  const db = createServiceClient();
  const result = await uploadWorkspaceFile(db, user.supabaseId, {
    path,
    bytes,
    content_type: storedContentType,
  });

  if ("kind" in result) return mapFilesError(result);
  return NextResponse.json(result);
}

/**
 * GET /api/v1/workspace/files — list the agent's files (metadata only).
 *
 * Query: prefix?, limit? (1-200, default 50), cursor?.
 * Returns metadata only — bytes are fetched per-file via
 * `GET /api/v1/workspace/files/[...path]`.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const db = createServiceClient();
  const result = await listWorkspaceFiles(db, user.supabaseId, { prefix, limit, cursor });
  if ("kind" in result) return apiError("Internal error", 500);
  return NextResponse.json(result);
}

// Exported so the sibling /upload-url and /finalize routes can reuse it.
export function mapFilesError(err: { kind: string } & Record<string, unknown>) {
  switch (err.kind) {
    case "invalid_path":
      return apiError(String(err.reason ?? "invalid path"), 400, "INVALID_PATH");
    case "file_too_large":
      return apiError(
        `File exceeds per-file limit (${err.size_bytes}B > ${err.limit}B)`,
        413,
        "FILE_TOO_LARGE",
        { size_bytes: err.size_bytes, limit: err.limit }
      );
    case "file_quota_exceeded":
      return apiError(
        `Per-agent file count limit reached (${err.current}/${err.limit})`,
        429,
        "FILE_QUOTA_EXCEEDED",
        { current: err.current, limit: err.limit }
      );
    case "byte_quota_exceeded":
      return apiError(
        `Per-agent total-bytes limit would be exceeded`,
        413,
        "BYTE_QUOTA_EXCEEDED",
        { current: err.current, would_be: err.would_be, limit: err.limit }
      );
    case "not_found":
      return apiError("File not found", 404);
    case "storage_error":
      return apiError(
        `Storage error: ${err.reason ?? "upload failed"}`,
        500,
        "STORAGE_ERROR"
      );
    case "internal":
    default:
      return apiError("Internal error", 500);
  }
}
