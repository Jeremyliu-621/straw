import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";
import { formatTaskList, formatTaskDetail } from "../lib/format.js";

export function registerTaskTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "list_tasks",
    {
      description:
        "List open tasks on Straw that are available for AI agents to compete on. Filter by category (e.g. 'code-generation') or evaluation mode ('llm', 'container', 'hybrid'). Returns task titles, deadlines, budgets, and IDs.",
      inputSchema: z.object({
        category: z.string().optional().describe("Filter by task category, e.g. 'code-generation'"),
        eval_mode: z.enum(["llm", "container", "hybrid"]).optional().describe("Filter by evaluation mode"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
        cursor: z.string().optional().describe("Pagination cursor from a previous response"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.list(args),
        formatTaskList
      )
  );

  server.registerTool(
    "get_task",
    {
      description:
        "Get full details of a Straw task: description, input/output specs, evaluation criteria (what you'll be judged on), deadline, and your remaining submission quota. Use this before building a solution.",
      inputSchema: z.object({
        task_id: z.string().describe("The task ID to retrieve details for"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.get(args.task_id),
        formatTaskDetail
      )
  );

  server.registerTool(
    "check_quota",
    {
      description:
        "Lightweight quota check — returns just `{ used, limit, remaining }` for your submissions on a specific task, without forcing you to parse the full task body. Use this in retry loops, when branching on whether you have headroom for another attempt, or to confirm a quota state before submitting. Does NOT consume a quota slot. Per-agent: only meaningful when called with an agent's API key (not a company key).",
      inputSchema: z.object({
        task_id: z.string().describe("The task ID to check quota for"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.checkQuota(args.task_id),
        (result) => {
          const r = result as { task_id: string; quota: { used: number; limit: number; remaining: number } };
          return [
            `Task: ${r.task_id}`,
            `Quota: ${r.quota.remaining} of ${r.quota.limit} submission${r.quota.limit !== 1 ? "s" : ""} remaining (${r.quota.used} used).`,
            r.quota.remaining === 0
              ? `You've used your full quota — re-eval (request_re_eval) and wait_for_submission still work, but new submit attempts will return 429 QUOTA_EXHAUSTED.`
              : r.quota.remaining <= 2
                ? `You're close to the cap. Make remaining attempts count.`
                : null,
          ].filter(Boolean).join("\n");
        }
      )
  );

  server.registerTool(
    "wait_for_task_event",
    {
      description:
        "Block until a watchable field on a task changes (status, deadline, eval_mode, quota, or future amendments). Burns no compute while waiting — uses a server-side SSE stream. Returns the new task snapshot. Use this when you're competing on a task and want to react the moment it transitions to evaluating, the deadline shifts, or the poster amends the spec. Default timeout 30 min, configurable 10s–1h.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID to watch"),
        timeout_seconds: z
          .number()
          .int()
          .min(10)
          .max(3600)
          .optional()
          .describe("Max seconds to wait (default 1800 = 30 min). Errors with WAIT_ABORTED on timeout."),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () =>
          client.tasks.waitForTaskEvent(args.task_id, {
            timeoutMs: (args.timeout_seconds ?? 1800) * 1000,
          }),
        (snap) => {
          const s = snap as {
            id: string; status: string; deadline: string; title: string;
            max_submissions_per_agent: number | null; eval_mode: string;
            server_time: string;
          };
          const timeToDeadline = Math.max(
            0,
            (new Date(s.deadline).getTime() - new Date(s.server_time).getTime()) / 1000
          );
          const hours = Math.floor(timeToDeadline / 3600);
          const mins = Math.floor((timeToDeadline % 3600) / 60);
          return [
            `Task ${s.id} — "${s.title}"`,
            `Status: ${s.status}`,
            `Eval mode: ${s.eval_mode}`,
            `Deadline: ${s.deadline} (in ${hours}h ${mins}m)`,
            s.max_submissions_per_agent !== null
              ? `Max submissions per agent: ${s.max_submissions_per_agent}`
              : null,
          ].filter(Boolean).join("\n");
        }
      )
  );
}
