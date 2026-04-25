import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { generateApiKey } from "@/services/api-key.service";
import { API_KEY_MAX_PER_USER, AUDIT_ACTION } from "@/constants";
import { z } from "zod/v4";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { AuditLogRepository } from "@/db/audit-log";

/**
 * GET /api/api-keys — list the authenticated user's active API keys.
 * Never returns the plaintext key — only prefix, name, timestamps.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req, { maxRequests: 30, prefix: "api-keys-list" });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const db = createServiceClient();
  const { data, error } = await db
    .from("api_keys")
    .select("id, prefix, name, created_at, last_used_at")
    .eq("user_id", user.supabaseId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) return apiError("Failed to fetch API keys", 500);
  return NextResponse.json(data ?? []);
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

/**
 * POST /api/api-keys — create a new API key.
 * Returns the plaintext key exactly once. It is never stored and cannot be retrieved again.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, { maxRequests: 10, prefix: "api-keys" });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid input", 400);

  const db = createServiceClient();

  // Enforce per-user key limit
  const { count } = await db
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.supabaseId)
    .is("revoked_at", null);

  if ((count ?? 0) >= API_KEY_MAX_PER_USER) {
    return apiError(
      `You can have at most ${API_KEY_MAX_PER_USER} active API keys. Revoke one before creating another.`,
      429,
      "KEY_LIMIT_REACHED"
    );
  }

  const { plaintext, hash, prefix } = generateApiKey();

  const { data: key, error } = await db
    .from("api_keys")
    .insert({
      user_id: user.supabaseId,
      key_hash: hash,
      prefix,
      name: parsed.data.name ?? null,
    })
    .select("id, prefix, name, created_at")
    .single();

  if (error) return apiError("Failed to create API key", 500);

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.API_KEY_CREATED,
      resource_type: "api_key",
      resource_id: key.id,
      metadata: { name: parsed.data.name ?? null, prefix },
    })
    .catch(() => {});

  // Return the plaintext key in the response — this is the only time it's available
  return NextResponse.json({ ...key, key: plaintext }, { status: 201 });
}

/**
 * DELETE /api/api-keys?id=<uuid> — revoke an API key by ID.
 * Users can only revoke their own keys.
 */
export async function DELETE(req: Request) {
  const rateLimited = rateLimitResponse(req, { maxRequests: 10, prefix: "api-keys-delete" });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) return apiError("Unauthorized", 401);

  const url = new URL(req.url);
  const keyId = url.searchParams.get("id");
  if (!keyId) return apiError("id query parameter is required", 400);

  const db = createServiceClient();

  // Verify ownership before revoking
  const { data: key } = await db
    .from("api_keys")
    .select("id")
    .eq("id", keyId)
    .eq("user_id", user.supabaseId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!key) return apiError("API key not found", 404);

  const { error } = await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) return apiError("Failed to revoke API key", 500);

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.API_KEY_REVOKED,
      resource_type: "api_key",
      resource_id: keyId,
      metadata: {},
    })
    .catch(() => {});

  return NextResponse.json({ success: true });
}
