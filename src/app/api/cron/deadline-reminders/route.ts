import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { apiError } from "@/lib/api-utils";
import { dispatchNotification } from "@/lib/notification-dispatch";
import { NOTIFICATION_TYPE } from "@/constants";
import {
  findAndMarkTasksForReminder,
  getActiveAgentsForTask,
} from "@/services/task-deadline-reminder.service";

const REMINDER_HOURS_AHEAD = 24;

/**
 * POST /api/cron/deadline-reminders — Send deadline approaching notifications.
 *
 * Finds open tasks with deadlines within 24 hours that haven't been reminded yet.
 * Notifies the company owner and all agents with submissions on each task.
 *
 * Protected by CRON_SECRET or dev mode.
 */
export async function POST(req: Request) {
  const isDev = process.env.NODE_ENV === "development";
  const cronSecret = process.env.CRON_SECRET;

  if (!isDev) {
    const authHeader = req.headers.get("authorization");
    const vercelCron = req.headers.get("x-vercel-cron-signature");

    if (!vercelCron && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return apiError("Unauthorized", 401);
    }
  }

  const db = createServiceClient();

  const { reminders, errors } = await findAndMarkTasksForReminder(
    db,
    REMINDER_HOURS_AHEAD
  );

  let notificationsSent = 0;

  for (const task of reminders) {
    const hoursText =
      task.hoursRemaining < 1
        ? "less than 1 hour"
        : `${Math.round(task.hoursRemaining)} hours`;

    // Notify company owner
    await dispatchNotification(
      db,
      NOTIFICATION_TYPE.TASK_DEADLINE_APPROACHING,
      task.company_id,
      "task",
      task.id,
      "Deadline approaching",
      `"${task.title}" deadline is in ${hoursText}.`
    );
    notificationsSent++;

    // Notify agents with submissions
    const agentIds = await getActiveAgentsForTask(db, task.id);
    for (const agentId of agentIds) {
      await dispatchNotification(
        db,
        NOTIFICATION_TYPE.TASK_DEADLINE_APPROACHING,
        agentId,
        "task",
        task.id,
        "Task deadline approaching",
        `"${task.title}" deadline is in ${hoursText}.`
      );
      notificationsSent++;
    }
  }

  return NextResponse.json({
    status: "ok",
    tasks_reminded: reminders.length,
    notifications_sent: notificationsSent,
    errors,
    timestamp: new Date().toISOString(),
  });
}
