import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";
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
}
