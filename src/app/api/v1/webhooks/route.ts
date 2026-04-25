import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { WEBHOOK_EVENT, WEBHOOK_MAX_PER_USER, AUDIT_ACTION } from "@/constants";
import { generateWebhookSecret } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { z } from "zod/v4";
import { validatePublicUrlSync } from "@/lib/public-url";

// ── Validation ────────────────────────────────────────────────

const webhookEventValues = Object.values(WEBHOOK_EVENT) as [string, ...string[]];

const createWebhookSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .superRefine((u, ctx) => {
      const r = validatePublicUrlSync(u);
      if (!r.ok) {
        ctx.addIssue({ code: "custom", message: r.reason });
      }
    }),
  events: z
    .array(z.enum(webhookEventValues))
    .min(1, "At least one event required"),
});

/**
 * GET /api/v1/webhooks — List the authenticated user's webhooks.
 * Never includes secrets in the response.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();

  const { data, error } = await db
    .from("webhooks")
    .select("id, url, events, active, created_at")
    .eq("user_id", user.supabaseId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("Failed to fetch webhooks", 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/v1/webhooks — Register a new webhook.
 * Returns the secret once — it's never shown again.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const db = createServiceClient();

  // Enforce per-user limit
  const { count, error: countError } = await db
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.supabaseId)
    .eq("active", true);

  if (countError) {
    return apiError("Failed to check webhook count", 500);
  }

  if ((count ?? 0) >= WEBHOOK_MAX_PER_USER) {
    return apiError(
      `Maximum ${WEBHOOK_MAX_PER_USER} active webhooks allowed`,
      429,
      "WEBHOOK_LIMIT_REACHED"
    );
  }

  const secret = generateWebhookSecret();

  const { data: webhook, error: insertError } = await db
    .from("webhooks")
    .insert({
      user_id: user.supabaseId,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      active: true,
    })
    .select("id, url, events, active, created_at")
    .single();

  if (insertError || !webhook) {
    return apiError("Failed to create webhook", 500);
  }

  // Audit (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: user.supabaseId,
      action: AUDIT_ACTION.WEBHOOK_CREATED,
      resource_type: "webhook",
      resource_id: webhook.id as string,
      metadata: { events: parsed.data.events },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      ...webhook,
      secret, // Shown only once
    },
    { status: 201 }
  );
}
