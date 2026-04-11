/**
 * Task Deadline Service — auto-closes tasks past their deadline.
 *
 * This service is designed to be called on a schedule (cron job, scheduled function).
 * It finds all tasks with status 'open' whose deadline has passed, transitions them
 * to 'evaluating', and ensures evaluation is triggered for all completed submissions.
 *
 * Flow:
 * 1. Find all open tasks past deadline
 * 2. For each task:
 *    a. Transition status to 'evaluating'
 *    b. Find all completed submissions that haven't been evaluated yet
 *    c. Enqueue evaluation jobs for those submissions
 * 3. Find all evaluating tasks where all submissions are evaluated
 * 4. Transition those to 'closed'
 *
 * Returns a structured result with lifecycle events so the caller can dispatch
 * webhooks, notifications, and audit log entries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_STATUS, SUBMISSION_STATUS } from "@/constants";

export interface DeadlineEvent {
  type: "task_moved_to_evaluating" | "task_closed";
  taskId: string;
  companyId: string;
  taskTitle: string;
}

export interface DeadlineCheckResult {
  tasksTransitionedToEvaluating: string[];
  tasksTransitionedToClosed: string[];
  evaluationsEnqueued: number;
  events: DeadlineEvent[];
  errors: string[];
}

/**
 * Check all open tasks and close any that are past deadline.
 *
 * Returns a summary of what was done, including lifecycle events
 * for the caller to dispatch webhooks/notifications/audit.
 */
export async function checkDeadlines(
  db: SupabaseClient,
  enqueueEvaluation?: (submissionId: string, taskId: string, outputUrl: string) => Promise<void>
): Promise<DeadlineCheckResult> {
  const result: DeadlineCheckResult = {
    tasksTransitionedToEvaluating: [],
    tasksTransitionedToClosed: [],
    evaluationsEnqueued: 0,
    events: [],
    errors: [],
  };

  const now = new Date().toISOString();

  // 1. Find open tasks past deadline
  const { data: expiredTasks, error: fetchError } = await db
    .from("tasks")
    .select("id, title, deadline, company_id")
    .eq("status", TASK_STATUS.OPEN)
    .lt("deadline", now);

  if (fetchError) {
    result.errors.push(`Failed to fetch expired tasks: ${fetchError.message}`);
    return result;
  }

  // 2. Transition each to evaluating
  for (const task of expiredTasks ?? []) {
    const { error: updateError } = await db
      .from("tasks")
      .update({ status: TASK_STATUS.EVALUATING })
      .eq("id", task.id)
      .eq("status", TASK_STATUS.OPEN); // Optimistic concurrency — only update if still open

    if (updateError) {
      result.errors.push(`Failed to transition task ${task.id}: ${updateError.message}`);
      continue;
    }

    result.tasksTransitionedToEvaluating.push(task.id);
    result.events.push({
      type: "task_moved_to_evaluating",
      taskId: task.id,
      companyId: task.company_id as string,
      taskTitle: task.title as string,
    });

    // 3. Enqueue evaluations for completed submissions without evaluation results
    if (enqueueEvaluation) {
      const { data: completedSubs } = await db
        .from("submissions")
        .select("id, output_url")
        .eq("task_id", task.id)
        .eq("status", SUBMISSION_STATUS.COMPLETED);

      for (const sub of completedSubs ?? []) {
        // Check if evaluation already exists
        const { data: existing } = await db
          .from("evaluation_results")
          .select("id")
          .eq("submission_id", sub.id)
          .single();

        if (!existing && sub.output_url) {
          try {
            await enqueueEvaluation(sub.id, task.id, sub.output_url);
            result.evaluationsEnqueued++;
          } catch (err) {
            result.errors.push(`Failed to enqueue eval for submission ${sub.id}: ${err}`);
          }
        }
      }
    }
  }

  // 4. Check evaluating tasks — close if all submissions are evaluated
  const { data: evaluatingTasks } = await db
    .from("tasks")
    .select("id, title, company_id")
    .eq("status", TASK_STATUS.EVALUATING);

  for (const task of evaluatingTasks ?? []) {
    const { data: allSubs } = await db
      .from("submissions")
      .select("id, status")
      .eq("task_id", task.id);

    if (!allSubs || allSubs.length === 0) {
      // No submissions — close immediately
      await db
        .from("tasks")
        .update({ status: TASK_STATUS.CLOSED })
        .eq("id", task.id);
      result.tasksTransitionedToClosed.push(task.id);
      result.events.push({
        type: "task_closed",
        taskId: task.id,
        companyId: task.company_id as string,
        taskTitle: task.title as string,
      });
      continue;
    }

    // Check if all non-failed submissions have evaluation results
    const completedIds = allSubs
      .filter((s) => s.status === SUBMISSION_STATUS.COMPLETED)
      .map((s) => s.id);

    const failedOrDone =
      allSubs.every((s) => s.status === SUBMISSION_STATUS.COMPLETED || s.status === SUBMISSION_STATUS.FAILED);

    if (!failedOrDone) continue; // Some still running/pending

    if (completedIds.length === 0) {
      // All submissions failed — close
      await db
        .from("tasks")
        .update({ status: TASK_STATUS.CLOSED })
        .eq("id", task.id);
      result.tasksTransitionedToClosed.push(task.id);
      result.events.push({
        type: "task_closed",
        taskId: task.id,
        companyId: task.company_id as string,
        taskTitle: task.title as string,
      });
      continue;
    }

    // Check that all completed submissions have evaluation results
    const { count: evalCount } = await db
      .from("evaluation_results")
      .select("id", { count: "exact", head: true })
      .in("submission_id", completedIds);

    if ((evalCount ?? 0) >= completedIds.length) {
      await db
        .from("tasks")
        .update({ status: TASK_STATUS.CLOSED })
        .eq("id", task.id);
      result.tasksTransitionedToClosed.push(task.id);
      result.events.push({
        type: "task_closed",
        taskId: task.id,
        companyId: task.company_id as string,
        taskTitle: task.title as string,
      });
    }
  }

  return result;
}
