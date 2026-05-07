import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-unified";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { rateLimitResponse } from "@/lib/rate-limit";
import { TASK_STATUS } from "@/constants";
import { z } from "zod/v4";
import {
  bucketCount,
  bucketSum,
  bucketAverage,
  type TrendResult,
} from "@/lib/bucket-trend";

/**
 * GET /api/dashboard/kpi-trends?metric=<>&days=<>
 *
 * Returns a per-day series for one of the dashboard KPIs, plus a delta
 * comparing the current `days`-long window to the prior `days`-long window.
 *
 * Replaces the dashboards' synthetic `mockTrend()` helpers.
 *
 * Metrics (each owned-by-role):
 *   - `submissions` (agent perspective): count of own submissions per day
 *   - `score` (agent): avg final_score across own submissions completed each day
 *   - `tasks` (company): count of own tasks created per day
 *   - `budget` (company): total budget cents committed per day
 *   - `drafts` (company): cumulative draft count snapshotted per day
 *   - `active` (company): cumulative active (open + evaluating) count per day
 *
 * Strategy: fetch raw rows in the [now - 2*days, now] window, bucket per
 * day in JS. Two windows in one query so the prior period for the delta
 * comes free. JS bucketing keeps this provider-portable (no raw SQL via
 * supabase-js's rpc surface needed).
 */

const querySchema = z.object({
  metric: z.enum([
    "submissions",
    "submissions_completed",
    "tasks_entered",
    "score",
    "tasks",
    "budget",
    "drafts",
    "active",
    "submissions_received",
  ]),
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export async function GET(req: Request) {
  const rateLimited = rateLimitResponse(req);
  if (rateLimited) return rateLimited;

  const user = await authenticateRequest(req);
  if (!user?.supabaseId) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    metric: url.searchParams.get("metric"),
    days: url.searchParams.get("days") ?? "14",
  });

  if (!parsed.success) {
    return apiError("Invalid query parameters", 400, "VALIDATION_ERROR", z.prettifyError(parsed.error));
  }

  const { metric, days } = parsed.data;
  const db = createServiceClient();
  const userId = user.supabaseId;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
  const startIso = windowStart.toISOString();

  let result: TrendResult;
  switch (metric) {
    case "submissions": {
      const { data, error } = await db
        .from("submissions")
        .select("created_at")
        .eq("agent_id", userId)
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch submissions", 500);
      result = bucketCount(
        (data ?? []).map((r) => r.created_at as string),
        days
      );
      break;
    }
    case "submissions_completed": {
      // Agent perspective: how many of my submissions finished evaluation
      // each day. Counts on `completed_at` (terminal-state timestamp) so
      // this measures "scored today", not "submitted today".
      const { data, error } = await db
        .from("submissions")
        .select("completed_at")
        .eq("agent_id", userId)
        .eq("status", "completed")
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch completed submissions", 500);
      result = bucketCount(
        (data ?? [])
          .map((r) => r.completed_at as string | null)
          .filter((ts): ts is string => Boolean(ts)),
        days
      );
      break;
    }
    case "tasks_entered": {
      // Distinct tasks the agent has touched (per-day first-touch). A
      // submission on day 1 to task X counts on day 1, but a second
      // submission on day 2 to the same task X does NOT — only first-time
      // entries are bucketed. Matches the value semantic of the
      // "Tasks Entered" KPI tile (cardinality of tasks, not submissions).
      const { data, error } = await db
        .from("submissions")
        .select("task_id, created_at")
        .eq("agent_id", userId)
        .order("created_at", { ascending: true });
      if (error) return apiError("Failed to fetch task entries", 500);
      const seenTask = new Set<string>();
      const firstTouches: string[] = [];
      for (const row of data ?? []) {
        const taskId = row.task_id as string;
        if (seenTask.has(taskId)) continue;
        seenTask.add(taskId);
        const ts = row.created_at as string;
        if (new Date(ts).getTime() >= new Date(startIso).getTime()) {
          firstTouches.push(ts);
        }
      }
      result = bucketCount(firstTouches, days);
      break;
    }
    case "score": {
      const { data, error } = await db
        .from("submissions")
        .select("status, completed_at, evaluation_results(final_score, created_at)")
        .eq("agent_id", userId)
        .eq("status", "completed")
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch scores", 500);
      const rows = (data ?? [])
        .map((r) => {
          const er = pickJoined(r.evaluation_results) as { final_score: number; created_at: string } | null;
          if (!er) return null;
          return { ts: er.created_at, value: er.final_score };
        })
        .filter((r): r is { ts: string; value: number } => r !== null);
      result = bucketAverage(rows, days);
      break;
    }
    case "tasks": {
      const { data, error } = await db
        .from("tasks")
        .select("created_at")
        .eq("company_id", userId)
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch tasks", 500);
      result = bucketCount(
        (data ?? []).map((r) => r.created_at as string),
        days
      );
      break;
    }
    case "budget": {
      const { data, error } = await db
        .from("tasks")
        .select("created_at, budget_cents")
        .eq("company_id", userId)
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch budget", 500);
      const rows = (data ?? []).map((r) => ({
        ts: r.created_at as string,
        value: (r.budget_cents as number) / 100,
      }));
      result = bucketSum(rows, days);
      break;
    }
    case "submissions_received": {
      // Company perspective: submissions that landed on tasks the user posted.
      const { data: ownedTasks, error: tasksError } = await db
        .from("tasks")
        .select("id")
        .eq("company_id", userId);
      if (tasksError) return apiError("Failed to fetch tasks", 500);
      const ownedTaskIds = (ownedTasks ?? []).map((t) => t.id);
      if (ownedTaskIds.length === 0) {
        result = {
          series: Array.from({ length: days }, () => 0),
          delta: { value: 0, direction: "flat" as const, period: `vs prior ${days}d` },
        };
        break;
      }
      const { data, error } = await db
        .from("submissions")
        .select("created_at")
        .in("task_id", ownedTaskIds)
        .gte("created_at", startIso);
      if (error) return apiError("Failed to fetch submissions", 500);
      result = bucketCount(
        (data ?? []).map((r) => r.created_at as string),
        days
      );
      break;
    }
    case "drafts":
    case "active": {
      // Cumulative-count snapshot — bucket by status as of today's view, then
      // we don't have historical-status data so series is flat at the current
      // count. This is correct for a v1: the user sees today's value with no
      // false trend. When status-history lands, we replace the flatline.
      const { data, error } = await db
        .from("tasks")
        .select("status")
        .eq("company_id", userId);
      if (error) return apiError("Failed to fetch tasks", 500);
      const targetStatus: string[] =
        metric === "drafts"
          ? [TASK_STATUS.DRAFT]
          : [TASK_STATUS.OPEN, TASK_STATUS.EVALUATING];
      const count = (data ?? []).filter((r) =>
        targetStatus.includes(String(r.status))
      ).length;
      result = {
        series: Array.from({ length: days }, () => count),
        delta: { value: 0, direction: "flat" as const, period: `vs prior ${days}d` },
      };
      break;
    }
  }

  return NextResponse.json({
    metric,
    days,
    ...result,
  });
}

function pickJoined<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
