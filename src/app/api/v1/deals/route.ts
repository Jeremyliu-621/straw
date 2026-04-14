import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS, WEBHOOK_EVENT, AUDIT_ACTION } from "@/constants";
import { createDealSchema } from "@/lib/validation";
import { calculateSuccessFee } from "@/services/results.service";
import { apiError, parseBody, parsePagination, paginatedResponse } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatch";
import { buildDealCreatedPayload } from "@/services/webhook.service";
import { AuditLogRepository } from "@/db/audit-log";
import { z } from "zod/v4";

/**
 * GET /api/v1/deals — List deals for the current user.
 *
 * Companies see deals they created. Agents see deals they're part of.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { limit, cursor } = parsePagination(url);

  const db = createServiceClient();
  const userId = user.supabaseId;

  let query = db
    .from("deals")
    .select("*")
    .or(`company_id.eq.${userId},agent_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch deals", 500);
  }

  return paginatedResponse(data ?? [], limit);
}

/**
 * POST /api/v1/deals — Create a deal (company only, for closed tasks).
 *
 * Requires: task is closed, agent has a completed submission, no existing deal on task.
 */
export async function POST(req: Request) {
  const rateLimited = rateLimitResponse(req, { prefix: "v1-deal-create", maxRequests: 10 });
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const result = await parseBody(req);
  if ("error" in result) return result.error;
  const parsed = createDealSchema.safeParse(result.data);

  if (!parsed.success) {
    return apiError("Validation failed", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const { taskId, agentId, dealType, dealValueCents } = parsed.data;
  const companyId = user.supabaseId;
  const db = createServiceClient();

  // Verify the task belongs to this company and is closed
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return apiError("Task not found", 404);
  }

  if (task.company_id !== companyId) {
    return apiError("Not your task", 403);
  }

  if (task.status !== TASK_STATUS.CLOSED) {
    return apiError("Task must be closed to create a deal", 400, "TASK_NOT_CLOSED");
  }

  // Verify the agent has a completed submission for this task
  const { data: submission } = await db
    .from("submissions")
    .select("id")
    .eq("task_id", taskId)
    .eq("agent_id", agentId)
    .eq("status", "completed")
    .single();

  if (!submission) {
    return apiError("Agent does not have a completed submission for this task", 400, "NO_SUBMISSION");
  }

  // Check for existing deal on this task
  const { data: existingDeal } = await db
    .from("deals")
    .select("id")
    .eq("task_id", taskId)
    .single();

  if (existingDeal) {
    return apiError("A deal already exists for this task", 409, "DEAL_EXISTS");
  }

  // Calculate platform fee
  const platformFeeCents = calculateSuccessFee(dealValueCents);

  const { data: deal, error: dealError } = await db
    .from("deals")
    .insert({
      task_id: taskId,
      company_id: companyId,
      agent_id: agentId,
      deal_type: dealType,
      deal_value_cents: dealValueCents,
      platform_fee_cents: platformFeeCents,
    })
    .select()
    .single();

  if (dealError) {
    console.error("[v1/deals] Failed to create deal:", dealError);
    return apiError("Failed to create deal", 500);
  }

  // Dispatch webhook (fire-and-forget)
  dispatchWebhookEvent(
    companyId,
    WEBHOOK_EVENT.DEAL_CREATED,
    buildDealCreatedPayload(deal.id, taskId, agentId, dealType, dealValueCents)
  ).catch(() => {});

  // Audit log (fire-and-forget)
  const auditRepo = new AuditLogRepository(db);
  auditRepo
    .log({
      user_id: companyId,
      action: AUDIT_ACTION.DEAL_CREATED,
      resource_type: "deal",
      resource_id: deal.id,
      metadata: { task_id: taskId, agent_id: agentId, deal_type: dealType, deal_value_cents: dealValueCents },
    })
    .catch((err) => console.error("[audit] Failed to log deal creation:", err));

  return NextResponse.json(deal, { status: 201 });
}
