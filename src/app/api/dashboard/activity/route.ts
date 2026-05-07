import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { AUDIT_ACTION } from "@/constants";
import type { ActivityEvent } from "@/lib/dashboard-events";

/**
 * GET /api/dashboard/activity
 *
 * Returns a unified, time-sorted activity feed for the current user.
 * The feed unions:
 *   - Submissions where the user is the agent (own submissions).
 *   - Submissions where the user is the task's company (your tasks getting submissions).
 *   - Evaluation results that landed on either of the above (separate "scored" events).
 *   - Failed evaluations on those submissions ("eval_failed" events).
 *   - Deals where the user is either the agent or the company.
 *   - Task-publish events from the audit log (user-as-publisher only).
 *
 * Output shape matches the `ActivityEvent` interface in
 * `src/components/dashboard/activity-feed.tsx`. Sorted desc by timestamp,
 * capped at `limit` events (default 50, max 100).
 *
 * Pagination is `?limit=N` only for v1 — full cursor-based paging is
 * deferred to a deeper /dashboard/activity page that doesn't exist yet.
 *
 * Indexes hit (verified against migrations 001 + 027):
 *   - submissions(agent_id), submissions(task_id), submissions(task_id, status, created_at desc),
 *     submissions(agent_id, created_at desc)
 *   - evaluation_results(submission_id), evaluation_results(final_score desc)
 *   - deals(task_id), deals(agent_id) — no deals(company_id), so the company side
 *     filters in JS after pulling deals where the user's task ids are involved.
 *   - audit_log(user_id), audit_log(action), audit_log(created_at desc)
 *
 * RLS posture: uses the service-role client (same as sibling
 * /api/dashboard/* routes) and enforces ownership at the application layer
 * via the agent_id / company_id filters. Do not pass user input directly
 * into queries; everything is parameterized via supabase-js.
 */
export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isFinite(limitParam) ? limitParam : 50), 100);

  const db = createServiceClient();
  const userId = user.supabaseId;

  // 1. Get the user's posted-task IDs once. Used by every query branch.
  const { data: ownedTasks, error: tasksError } = await db
    .from("tasks")
    .select("id, title")
    .eq("company_id", userId);

  if (tasksError) {
    return apiError("Failed to fetch tasks", 500);
  }

  const ownedTaskIds = (ownedTasks ?? []).map((t) => t.id);
  const ownedTaskTitles = new Map<string, string>(
    (ownedTasks ?? []).map((t) => [t.id, t.title])
  );

  // 2. Run the three union legs in parallel.
  //    Pull more than `limit` per leg so the merge has room to sort.
  const perLegLimit = Math.min(limit * 2, 200);

  const [agentSubs, companySubs, deals, auditPublishes] = await Promise.all([
    // a. Submissions where the user is the agent.
    db
      .from("submissions")
      .select(
        "id, task_id, status, created_at, completed_at, agent_id, agent_display_name, tasks(title), evaluation_results(final_score, created_at)"
      )
      .eq("agent_id", userId)
      .order("created_at", { ascending: false })
      .limit(perLegLimit),

    // b. Submissions on tasks the user owns (company perspective).
    ownedTaskIds.length > 0
      ? db
          .from("submissions")
          .select(
            "id, task_id, status, created_at, completed_at, agent_id, agent_display_name, tasks(title), evaluation_results(final_score, created_at)"
          )
          .in("task_id", ownedTaskIds)
          .order("created_at", { ascending: false })
          .limit(perLegLimit)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          task_id: string;
          status: string;
          created_at: string;
          completed_at: string | null;
          agent_id: string;
          agent_display_name: string | null;
          tasks: { title: string } | { title: string }[] | null;
          evaluation_results:
            | { final_score: number; created_at: string }
            | { final_score: number; created_at: string }[]
            | null;
        }>, error: null }),

    // c. Deals where the user is either side. Two `or` clauses against
    //    indexed columns; deals(company_id) has no dedicated index but the
    //    table is small so a sequential scan over the company-side filter
    //    is fine here. If this becomes hot, add idx_deals_company.
    db
      .from("deals")
      .select(
        "id, task_id, agent_id, company_id, deal_type, deal_value_cents, created_at, tasks(title)"
      )
      .or(`agent_id.eq.${userId},company_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(perLegLimit),

    // d. Task-publish audit-log events for tasks the user posted.
    db
      .from("audit_log")
      .select("id, action, resource_id, metadata, created_at")
      .eq("user_id", userId)
      .eq("action", AUDIT_ACTION.TASK_PUBLISHED)
      .order("created_at", { ascending: false })
      .limit(perLegLimit),
  ]);

  // 3. Map every leg to ActivityEvent shape.
  const events: ActivityEvent[] = [];
  const seenSubmissionScored = new Set<string>(); // dedupe across (a) and (b) legs

  for (const sub of agentSubs.data ?? []) {
    pushSubmissionEvents(events, sub, "agent", userId, seenSubmissionScored);
  }

  for (const sub of companySubs.data ?? []) {
    // The agent is the actor, not the viewer — pass the agent_display_name
    // through so the feed reads "{agent} submitted to {your task}".
    pushSubmissionEvents(events, sub, "company", userId, seenSubmissionScored);
  }

  for (const deal of deals.data ?? []) {
    const taskTitle = pickJoined(deal.tasks)?.title ?? "Untitled task";
    const isOwnerSide = deal.company_id === userId;
    events.push({
      id: `deal-${deal.id}`,
      type: "deal_created",
      timestamp: deal.created_at,
      actor: {
        type: "company",
        // The company is always the deal-creator; the agent side just receives.
        // Render the *creator* as the actor regardless of viewer perspective.
        name: isOwnerSide ? "You" : "A company",
      },
      target: { type: "task", id: deal.task_id, title: taskTitle },
      delta: `$${(deal.deal_value_cents / 100).toLocaleString()}`,
      href: `/tasks/${deal.task_id}`,
    });
  }

  for (const log of auditPublishes.data ?? []) {
    const taskId = log.resource_id;
    const taskTitle =
      ownedTaskTitles.get(taskId) ??
      (typeof log.metadata === "object" &&
      log.metadata !== null &&
      "title" in log.metadata &&
      typeof (log.metadata as { title: unknown }).title === "string"
        ? ((log.metadata as { title: string }).title as string)
        : "Untitled task");

    events.push({
      id: `audit-${log.id}`,
      type: "task_published",
      timestamp: log.created_at,
      actor: { type: "company", name: "You" },
      target: { type: "task", id: taskId, title: taskTitle },
      href: `/tasks/${taskId}`,
    });
  }

  // 4. Sort desc by timestamp + cap.
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const limited = events.slice(0, limit);

  return NextResponse.json({ events: limited, count: limited.length });
}

/**
 * Push the appropriate submission-related events into the accumulator.
 *
 * Submissions can yield:
 *   - "submission_created" — at submission.created_at, always.
 *   - "submission_scored"  — at evaluation_results.created_at, only if a score landed.
 *   - "eval_failed"        — at submission.completed_at, only on terminal-failure status.
 *
 * The dedupe set tracks scored-event submission IDs across the agent and
 * company legs so the same scored submission doesn't appear twice.
 */
function pushSubmissionEvents(
  events: ActivityEvent[],
  sub: {
    id: string;
    task_id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    agent_id: string;
    agent_display_name: string | null;
    tasks: { title: string } | { title: string }[] | null;
    evaluation_results:
      | { final_score: number; created_at: string }
      | { final_score: number; created_at: string }[]
      | null;
  },
  perspective: "agent" | "company",
  userId: string,
  seenScored: Set<string>
): void {
  const taskTitle = pickJoined(sub.tasks)?.title ?? "Untitled task";
  const evalRow = pickJoined(sub.evaluation_results);

  const actorName =
    perspective === "agent" || sub.agent_id === userId
      ? "You"
      : sub.agent_display_name ?? "An agent";

  // Created event — always (this is the upload landing).
  events.push({
    id: `created-${sub.id}`,
    type: "submission_created",
    timestamp: sub.created_at,
    actor: { type: "agent", name: actorName },
    target: { type: "submission", id: sub.id, title: taskTitle },
    href: `/tasks/${sub.task_id}`,
  });

  // Scored event — if eval landed, dedupe across legs.
  if (evalRow && !seenScored.has(sub.id)) {
    seenScored.add(sub.id);
    events.push({
      id: `scored-${sub.id}`,
      type: "submission_scored",
      timestamp: evalRow.created_at,
      actor: { type: "agent", name: actorName },
      target: { type: "submission", id: sub.id, title: taskTitle },
      delta: `scored ${evalRow.final_score.toFixed(0)}`,
      href: `/tasks/${sub.task_id}`,
    });
  }

  // Eval-failed event — terminal failures.
  if (sub.status === "evaluation_failed" || sub.status === "failed") {
    if (sub.completed_at) {
      events.push({
        id: `failed-${sub.id}`,
        type: "eval_failed",
        timestamp: sub.completed_at,
        actor: { type: "agent", name: actorName },
        target: { type: "submission", id: sub.id, title: taskTitle },
        href: `/tasks/${sub.task_id}`,
      });
    }
  }
}

/**
 * Supabase-js sometimes returns a foreign-table relation as a single object,
 * sometimes as a 1-element array, depending on the inferred relation type.
 * This normalizer takes the first row in either case.
 */
function pickJoined<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

