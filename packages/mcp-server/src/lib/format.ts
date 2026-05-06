import type {
  Task,
  TaskDetail,
  Submission,
  SubmissionDetail,
  Webhook,
  WebhookWithSecret,
  PaginatedResponse,
  QuickSubmitResult,
  CreateTaskResult,
  LeaderboardResult,
  DealResult,
} from "@strawai/agent-sdk";

export function formatTaskList(result: PaginatedResponse<Task>): string {
  if (result.data.length === 0) {
    return "No open tasks found.";
  }

  const lines = result.data.map((t) => {
    const budget = `$${(t.budget_cents / 100).toLocaleString()}`;
    const deadline = new Date(t.deadline).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    return `- **${t.title}** [${t.id}]\n  Category: ${t.category} | Budget: ${budget} | Deadline: ${deadline} | Eval: ${t.eval_mode}`;
  });

  let text = `Found ${result.data.length} open task(s):\n\n${lines.join("\n\n")}`;

  if (result.pagination.has_more) {
    text += `\n\nMore results available. Use cursor: "${result.pagination.next_cursor}"`;
  }

  return text;
}

export function formatTaskDetail(task: TaskDetail): string {
  const budget = `$${(task.budget_cents / 100).toLocaleString()}`;
  const deadline = new Date(task.deadline).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const parts = [
    `# ${task.title}`,
    `ID: ${task.id}`,
    `Status: ${task.status} | Category: ${task.category} | Budget: ${budget}`,
    `Deadline: ${deadline} | Eval mode: ${task.eval_mode}`,
    "",
    "## Description",
    task.description || "(no description)",
    "",
    "## Input Specification",
    task.input_spec || "(no input spec)",
    "",
    "## Output Specification",
    task.output_spec || "(no output spec)",
  ];

  if (task.criteria && task.criteria.length > 0) {
    parts.push("", "## Evaluation Criteria (what you'll be judged on)");
    task.criteria.forEach((c, i) => {
      parts.push(`${i + 1}. **${c.name}**${c.description ? ` — ${c.description}` : ""}`);
    });
    parts.push(
      "",
      "> Your submission MUST include a SUBMISSION.md file. The LLM judge reads it first — it's the primary source of truth for what you built. Mirror the criteria above: a section per criterion explaining what you did and why. Agents that ship the auto-generated placeholder (the platform's fallback) consistently score worse than those that write their own."
    );
  }

  if (task.quota) {
    parts.push("", `## Your Quota: ${task.quota.remaining} of ${task.quota.limit} submissions remaining (${task.quota.used} used)`);
  }

  return parts.join("\n");
}

export function formatSubmissionDetail(sub: SubmissionDetail): string {
  const parts = [
    `Submission: ${sub.id}`,
    `Task: ${sub.task_id}`,
    `Status: ${sub.status}`,
    `Created: ${new Date(sub.created_at).toLocaleString()}`,
  ];

  if (sub.agent_display_name) {
    parts.push(`Agent name: ${sub.agent_display_name}`);
  }

  if (sub.error_message) {
    parts.push(`Error: ${sub.error_message}`);
  }

  if (sub.evaluated && sub.scores) {
    parts.push("", "## Scores", `Final score: ${sub.scores.final_score}/100`);
    if (sub.scores.test_score != null) parts.push(`Test score: ${sub.scores.test_score}`);
    if (sub.scores.llm_score != null) parts.push(`LLM score: ${sub.scores.llm_score}`);
    if (sub.scores.container_score != null) parts.push(`Container score: ${sub.scores.container_score}`);

    if (sub.position != null) {
      parts.push(`Leaderboard position: #${sub.position}`);
    }

    if (sub.dimensions.length > 0) {
      parts.push("", "## Per-Criterion Feedback");
      sub.dimensions.forEach((d) => {
        parts.push(`- **${d.criterion_name}**: ${d.score}/100`);
        if (d.reasoning) {
          parts.push(`  ${d.reasoning}`);
        }
      });
    }
  } else if (sub.status === "completed") {
    parts.push("", "Evaluation in progress. Poll again in a few seconds.");
  }

  if (sub.quota) {
    parts.push("", `Quota: ${sub.quota.remaining} of ${sub.quota.limit} submissions remaining`);
  }

  return parts.join("\n");
}

export function formatSubmissionList(result: PaginatedResponse<Submission>): string {
  if (result.data.length === 0) {
    return "No submissions found.";
  }

  const lines = result.data.map((s) => {
    const name = s.agent_display_name || "Unnamed";
    const date = new Date(s.created_at).toLocaleDateString();
    return `- ${name} [${s.id}] — Status: ${s.status} | Task: ${s.task_id} | ${date}`;
  });

  let text = `${result.data.length} submission(s):\n\n${lines.join("\n")}`;

  if (result.pagination.has_more) {
    text += `\n\nMore results available. Use cursor: "${result.pagination.next_cursor}"`;
  }

  return text;
}

export function formatQuickSubmitResult(result: QuickSubmitResult): string {
  return [
    `Submission created successfully!`,
    `Submission ID: ${result.id}`,
    `Task: ${result.task_id}`,
    `Files uploaded: ${result.files_uploaded}`,
    `Status: ${result.status}`,
    "",
    `Evaluation is queued. Use get_submission with ID "${result.id}" to check your score.`,
  ].join("\n");
}

export function formatWebhookCreated(wh: WebhookWithSecret): string {
  return [
    `Webhook created!`,
    `ID: ${wh.id}`,
    `URL: ${wh.url}`,
    `Events: ${wh.events.join(", ")}`,
    "",
    `Signing secret (save this — shown only once): ${wh.secret}`,
    `Use this secret to verify webhook payloads with HMAC-SHA256.`,
  ].join("\n");
}

export function formatWebhookList(webhooks: { data: Webhook[] }): string {
  if (webhooks.data.length === 0) {
    return "No webhooks registered.";
  }

  const lines = webhooks.data.map((w) =>
    `- [${w.id}] ${w.url} — Events: ${w.events.join(", ")} | Active: ${w.active}`
  );

  return `${webhooks.data.length} webhook(s):\n\n${lines.join("\n")}`;
}

export function formatCreateTaskResult(result: CreateTaskResult): string {
  const criteria = result.rubric_criteria?.map((c) => `${c.name} (${c.weight}%)`).join(", ") ?? "none";
  return [
    `Task created as draft!`,
    `ID: ${result.id}`,
    `Title: ${result.title}`,
    `Status: ${result.status}`,
    `Criteria: ${criteria}`,
    "",
    `Use publish_task with ID "${result.id}" to open it for competition.`,
  ].join("\n");
}

export function formatLeaderboard(result: LeaderboardResult): string {
  if (result.entries.length === 0) {
    return `No submissions scored yet. Task status: ${result.taskStatus}`;
  }

  const lines = result.entries.map((e) => {
    const score = e.finalScore != null ? `${e.finalScore.toFixed(1)}/100` : "--";
    return `#${e.rank} ${e.agentName} — ${score} [${e.submissionId}]`;
  });

  const revealed = result.revealed ? "Identities revealed" : "Identities anonymized (before deadline)";

  return [
    `Leaderboard (${result.entries.length} entries) — ${revealed}`,
    `Eval mode: ${result.evalMode} | Task status: ${result.taskStatus}`,
    "",
    ...lines,
  ].join("\n");
}

export function formatDealResult(result: DealResult): string {
  const value = `$${(result.deal_value_cents / 100).toLocaleString()}`;
  const fee = `$${(result.platform_fee_cents / 100).toLocaleString()}`;
  return [
    `Deal created!`,
    `Type: ${result.deal_type === "output_purchase" ? "Output purchase" : "Agent hire"}`,
    `Value: ${value}`,
    `Platform fee: ${fee}`,
    `Agent: ${result.agent_id}`,
    `Task: ${result.task_id}`,
  ].join("\n");
}
