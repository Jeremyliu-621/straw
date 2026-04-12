import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { AUDIT_ACTION } from "@/constants";
import { AuditLogRepository } from "@/db/audit-log";

/**
 * DELETE /api/v1/webhooks/[id] — Deactivate a webhook.
 * Soft delete: sets active=false rather than deleting the row.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Verify ownership
  const { data: webhook, error: fetchError } = await db
    .from("webhooks")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !webhook) {
    return apiError("Webhook not found", 404);
  }

  if (webhook.user_id !== user.supabaseId) {
    return apiError("Not your webhook", 403);
  }

  const { error: updateError } = await db
    .from("webhooks")
    .update({ active: false })
    .eq("id", id);

  if (updateError) {
    return apiError("Failed to deactivate webhook", 500);
  }

  // Audit (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.WEBHOOK_DELETED,
      resource_type: "webhook",
      resource_id: id,
    })
    .catch(() => {});

  return new NextResponse(null, { status: 204 });
}
