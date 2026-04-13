import { createServiceClient } from "@/lib/supabase";
import { TASK_STATUS } from "@/constants";

/**
 * Close a task that has passed its deadline.
 * This is called either by a cron job or when a user visits
 * a task page after the deadline has passed.
 *
 * Steps:
 * 1. Verify task deadline has passed
 * 2. Transition status: open → evaluating (if submissions exist) or open → closed
 * 3. If no pending evaluations, transition evaluating → closed
 * 4. Update agent reputation stats
 */
export async function closeExpiredTask(taskId: string): Promise<{ closed: boolean; error?: string }> {
  const db = createServiceClient();

  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id, status, deadline")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { closed: false, error: "Task not found" };
  }

  // Only close open or evaluating tasks
  if (task.status !== TASK_STATUS.OPEN && task.status !== TASK_STATUS.EVALUATING) {
    return { closed: task.status === TASK_STATUS.CLOSED };
  }

  // Check if deadline has passed
  if (new Date(task.deadline) > new Date()) {
    return { closed: false, error: "Deadline has not passed" };
  }

  // Check for pending/running submissions
  const { count: pendingCount } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .in("status", ["pending", "running"]);

  if (pendingCount && pendingCount > 0) {
    // Still running — move to evaluating if not already
    if (task.status === TASK_STATUS.OPEN) {
      await db.from("tasks").update({ status: TASK_STATUS.EVALUATING }).eq("id", taskId);
    }
    return { closed: false };
  }

  // All submissions are done — close the task
  await db.from("tasks").update({ status: TASK_STATUS.CLOSED }).eq("id", taskId);

  // Update reputation for winning agent
  await updateWinnerReputation(taskId);

  return { closed: true };
}

/**
 * Update the winner's reputation after task close.
 * The winner is the agent with rank 1 on the leaderboard
 * (highest final_score, ties broken by earliest submission).
 */
async function updateWinnerReputation(taskId: string): Promise<void> {
  const db = createServiceClient();

  // Find the winning submission (highest score, earliest submission for ties)
  const { data: submissions } = await db
    .from("submissions")
    .select(
      `
      id,
      agent_id,
      created_at,
      evaluation_results (
        final_score
      )
    `
    )
    .eq("task_id", taskId)
    .eq("status", "completed");

  if (!submissions || submissions.length === 0) return;

  // Find highest scoring submission
  type SubWithEval = {
    agent_id: string;
    created_at: string;
    evaluation_results: { final_score: number }[] | null;
  };

  let winner: SubWithEval | null = null;
  let highestScore = -1;

  for (const sub of submissions as SubWithEval[]) {
    const evalResults = sub.evaluation_results;
    if (!evalResults || evalResults.length === 0) continue;

    const score = evalResults[0].final_score;
    if (
      score > highestScore ||
      (score === highestScore &&
        winner &&
        new Date(sub.created_at) < new Date(winner.created_at))
    ) {
      highestScore = score;
      winner = sub;
    }
  }

  if (!winner) return;

  // Reputation stats (win rate, avg score, history) are computed on-read
  // from evaluation_results by GET /api/agents/[id]. No denormalized
  // counters to update here — just log for audit trail.
  console.log(
    `[task-close] Task ${taskId} winner: agent ${winner.agent_id} with score ${highestScore}`
  );
}
