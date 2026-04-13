import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { apiError } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase";
import { SUBMISSION_STATUS } from "@/constants";

/**
 * GET /api/agents/me — Agent dashboard data in a single call.
 *
 * Returns:
 * - profile: user + agent_builder_profiles data
 * - active_submissions: pending/running submissions with task titles
 * - pending_invitations: count of pending invitations
 * - unread_notifications: count of unread notifications
 * - recent_evaluations: last 5 evaluated submissions with scores
 *
 * Agent builders only.
 */
export async function GET(req: Request) {
  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const db = createServiceClient();
  const agentId = user.supabaseId;

  // Fetch all data in parallel
  const [
    profileResult,
    activeSubsResult,
    pendingInvitationsResult,
    unreadNotificationsResult,
    recentEvalsResult,
  ] = await Promise.all([
    // Profile
    db
      .from("agent_builder_profiles")
      .select("display_name, bio, docker_image, github_url, categories")
      .eq("user_id", agentId)
      .single(),

    // Active submissions (pending or running) with task titles
    db
      .from("submissions")
      .select("id, task_id, status, docker_image, created_at, tasks(title)")
      .eq("agent_id", agentId)
      .in("status", [SUBMISSION_STATUS.PENDING, SUBMISSION_STATUS.RUNNING])
      .order("created_at", { ascending: false }),

    // Pending invitation count
    db
      .from("task_invitations")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("status", "pending"),

    // Unread notification count
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", agentId)
      .is("read_at", null)
      .is("dismissed_at", null),

    // Recent evaluations (last 5 completed submissions with eval results)
    db
      .from("evaluation_results")
      .select("submission_id, test_score, llm_score, final_score, created_at, submissions(task_id, tasks(title))")
      .in(
        "submission_id",
        (await db
          .from("submissions")
          .select("id")
          .eq("agent_id", agentId)
          .eq("status", SUBMISSION_STATUS.COMPLETED)
          .order("created_at", { ascending: false })
          .limit(10)
        ).data?.map((s) => s.id) ?? []
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Format active submissions
  type ActiveSub = {
    id: string;
    task_id: string;
    status: string;
    docker_image: string;
    created_at: string;
    tasks: { title: string } | null;
  };
  const activeSubmissions = (activeSubsResult.data as unknown as ActiveSub[] ?? []).map((s) => ({
    id: s.id,
    task_id: s.task_id,
    status: s.status,
    docker_image: s.docker_image,
    created_at: s.created_at,
    task_title: s.tasks?.title ?? null,
  }));

  // Format recent evaluations
  type EvalRow = {
    submission_id: string;
    test_score: number | null;
    llm_score: number | null;
    final_score: number;
    created_at: string;
    submissions: { task_id: string; tasks: { title: string } | null } | null;
  };
  const recentEvaluations = (recentEvalsResult.data as unknown as EvalRow[] ?? []).map((e) => ({
    submission_id: e.submission_id,
    test_score: e.test_score,
    llm_score: e.llm_score,
    final_score: e.final_score,
    evaluated_at: e.created_at,
    task_title: e.submissions?.tasks?.title ?? null,
  }));

  return NextResponse.json({
    profile: profileResult.data ?? null,
    active_submissions: activeSubmissions,
    pending_invitations: pendingInvitationsResult.count ?? 0,
    unread_notifications: unreadNotificationsResult.count ?? 0,
    recent_evaluations: recentEvaluations,
  });
}
