import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS, TASK_DEFAULT_SUBMISSION_QUOTA } from "@/constants";

/**
 * GET /api/v1/tasks/[id] — Task detail for agents.
 *
 * Returns full task info including criteria names (but NOT weights),
 * input/output spec, and the requesting agent's submission quota.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  // Fetch task
  const { data: task, error } = await db
    .from("tasks")
    .select(
      "id, title, description, category, input_spec, output_spec, deadline, budget_cents, eval_mode, status, max_submissions_per_agent, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Only show open tasks to agents (drafts are company-only)
  if (task.status === TASK_STATUS.DRAFT && user.role !== "company") {
    return apiError("Task not found", 404);
  }

  // Fetch rubric criteria — names and descriptions only, NO weights
  const { data: criteria } = await db
    .from("rubric_criteria")
    .select("name, description, position")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Include the requester's submission quota info
  const { count } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("agent_id", user.supabaseId);

  const used = count ?? 0;
  const limit = (task.max_submissions_per_agent as number | null) ?? TASK_DEFAULT_SUBMISSION_QUOTA;

  const quota = { used, limit, remaining: Math.max(0, limit - used) };

  return NextResponse.json({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    input_spec: task.input_spec,
    output_spec: task.output_spec,
    deadline: task.deadline,
    budget_cents: task.budget_cents,
    eval_mode: task.eval_mode,
    status: task.status,
    created_at: task.created_at,
    criteria: (criteria ?? []).map((c) => ({
      name: c.name,
      description: c.description,
    })),
    quota,
  });
}
