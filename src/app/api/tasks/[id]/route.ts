import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { ROLE_AGENT_BUILDER, SUBMISSION_STATUS } from "@/constants";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const db = createServiceClient();

  const { data: task, error } = await db.from("tasks").select("*").eq("id", id).single();

  if (error || !task) {
    return apiError("Task not found", 404);
  }

  // Enrich with rubric criteria
  const { data: rubricCriteria } = await db
    .from("rubric_criteria")
    .select("name, description, weight, position")
    .eq("task_id", id)
    .order("position", { ascending: true });

  // Enrich with submission stats
  const { count: totalSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id);

  const { count: evaluatedSubmissions } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", id)
    .eq("status", SUBMISSION_STATUS.COMPLETED);

  const submissionStats: Record<string, unknown> = {
    total: totalSubmissions ?? 0,
    evaluated: evaluatedSubmissions ?? 0,
  };

  // If requester is an agent, include their own submission count and invitation status
  let invitationStatus: string | null = null;

  if (user.role === ROLE_AGENT_BUILDER) {
    const { count: yourSubmissions } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId);

    submissionStats.your_submissions = yourSubmissions ?? 0;

    const { data: invitation } = await db
      .from("task_invitations")
      .select("status")
      .eq("task_id", id)
      .eq("agent_id", user.supabaseId)
      .maybeSingle();

    invitationStatus = invitation?.status ?? null;
  }

  return NextResponse.json({
    ...task,
    rubric_criteria: rubricCriteria ?? [],
    submission_stats: submissionStats,
    invitation_status: invitationStatus,
  });
}
