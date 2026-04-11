/**
 * Task Deadline Reminder Service
 *
 * Finds open tasks approaching their deadline and returns them
 * so the caller can send reminder notifications.
 *
 * Uses `deadline_reminder_sent_at` column for dedup —
 * once a reminder is sent, it won't be sent again.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_STATUS } from "@/constants";

export interface TaskApproachingDeadline {
  id: string;
  title: string;
  company_id: string;
  deadline: string;
  hoursRemaining: number;
}

export interface DeadlineReminderResult {
  reminders: TaskApproachingDeadline[];
  errors: string[];
}

/**
 * Find open tasks with deadlines within the given hours ahead,
 * that haven't already been reminded.
 * Marks them as reminded so they won't be returned again.
 */
export async function findAndMarkTasksForReminder(
  db: SupabaseClient,
  hoursAhead: number
): Promise<DeadlineReminderResult> {
  const result: DeadlineReminderResult = {
    reminders: [],
    errors: [],
  };

  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, company_id, deadline")
    .eq("status", TASK_STATUS.OPEN)
    .is("deadline_reminder_sent_at", null)
    .lt("deadline", cutoff.toISOString())
    .gt("deadline", now.toISOString()); // Only tasks that haven't passed yet

  if (error) {
    result.errors.push(`Failed to fetch tasks: ${error.message}`);
    return result;
  }

  for (const task of tasks ?? []) {
    const deadline = new Date(task.deadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Mark as reminded so we don't send again
    const { error: updateError } = await db
      .from("tasks")
      .update({ deadline_reminder_sent_at: now.toISOString() })
      .eq("id", task.id)
      .is("deadline_reminder_sent_at", null); // Optimistic concurrency

    if (updateError) {
      result.errors.push(`Failed to mark task ${task.id} as reminded: ${updateError.message}`);
      continue;
    }

    result.reminders.push({
      id: task.id,
      title: task.title as string,
      company_id: task.company_id as string,
      deadline: task.deadline as string,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    });
  }

  return result;
}

/**
 * Get the IDs of agents with active submissions for a task.
 * "Active" means pending or running.
 */
export async function getActiveAgentsForTask(
  db: SupabaseClient,
  taskId: string
): Promise<string[]> {
  const { data, error } = await db
    .from("submissions")
    .select("agent_id")
    .eq("task_id", taskId)
    .in("status", ["pending", "running", "completed"]);

  if (error || !data) return [];

  // Deduplicate agent IDs
  return [...new Set(data.map((s) => s.agent_id as string))];
}
