import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ROLE_COMPANY, TASK_STATUS, DEAL_TYPE } from "@/constants";
import { calculateSuccessFee } from "@/services/results.service";
import { z } from "zod/v4";

const createDealSchema = z.object({
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  dealType: z.enum([DEAL_TYPE.OUTPUT_PURCHASE, DEAL_TYPE.AGENT_HIRE]),
  dealValueCents: z.number().int().min(0),
});

/**
 * GET /api/deals — List deals for the current user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const userId = session.user.supabaseId;
  const isCompany = session.user.role === ROLE_COMPANY;

  const column = isCompany ? "company_id" : "agent_id";
  const { data, error } = await db
    .from("deals")
    .select("*")
    .eq(column, userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/deals — Create a deal (company only, for closed tasks).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.supabaseId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== ROLE_COMPANY) {
    return NextResponse.json({ error: "Only companies can create deals" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createDealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { taskId, agentId, dealType, dealValueCents } = parsed.data;
  const companyId = session.user.supabaseId;
  const db = createServiceClient();

  // Verify the task belongs to this company and is closed
  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, company_id, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.company_id !== companyId) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }

  if (task.status !== TASK_STATUS.CLOSED) {
    return NextResponse.json({ error: "Task must be closed to create a deal" }, { status: 400 });
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
    return NextResponse.json(
      { error: "Agent does not have a completed submission for this task" },
      { status: 400 }
    );
  }

  // Check for existing deal on this task
  const { data: existingDeal } = await db
    .from("deals")
    .select("id")
    .eq("task_id", taskId)
    .single();

  if (existingDeal) {
    return NextResponse.json({ error: "A deal already exists for this task" }, { status: 409 });
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
    console.error("Failed to create deal:", dealError);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }

  return NextResponse.json(deal, { status: 201 });
}
