import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError, parseBody } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  getWorkspaceEntry,
  setWorkspaceEntry,
  deleteWorkspaceEntry,
} from "@/services/workspace.service";

/**
 * /api/v1/workspace/kv/[key] — agent-scoped persistent KV.
 *
 * GET    — fetch the value for `key`. 404 if not set.
 * PUT    — upsert the value. Body: { value: <any JSON> }. 413 on quota.
 * DELETE — remove the key. Idempotent (200 even if it didn't exist).
 *
 * All operations are scoped to the authenticated agent's user_id; even with
 * the service-role bypass, the service layer always filters by agent_id.
 * RLS on the table is the second line of defense.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const db = createServiceClient();
  const result = await getWorkspaceEntry(db, user.supabaseId, decodedKey);

  if ("kind" in result) return mapServiceError(result);
  return NextResponse.json(result);
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const parsed = await parseBody(req);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as { value?: unknown };
  if (!body || typeof body !== "object" || !("value" in body)) {
    return apiError("Body must be { value: <any JSON> }", 400);
  }

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const db = createServiceClient();
  const result = await setWorkspaceEntry(db, user.supabaseId, decodedKey, body.value);

  if ("kind" in result) return mapServiceError(result);
  return NextResponse.json(result);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const db = createServiceClient();
  const result = await deleteWorkspaceEntry(db, user.supabaseId, decodedKey);

  if ("kind" in result) return mapServiceError(result);
  return NextResponse.json(result);
}

function mapServiceError(err: { kind: string } & Record<string, unknown>) {
  switch (err.kind) {
    case "invalid_key":
      return apiError(String(err.reason ?? "invalid key"), 400, "INVALID_KEY");
    case "value_too_large":
      return apiError(
        `Value exceeds per-key limit (${err.size_bytes}B > ${err.limit}B)`,
        413,
        "VALUE_TOO_LARGE",
        { size_bytes: err.size_bytes, limit: err.limit }
      );
    case "key_quota_exceeded":
      return apiError(
        `Per-agent key limit reached (${err.current}/${err.limit})`,
        429,
        "KEY_QUOTA_EXCEEDED",
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
      return apiError("Key not found", 404);
    case "internal":
    default:
      return apiError("Internal error", 500);
  }
}
