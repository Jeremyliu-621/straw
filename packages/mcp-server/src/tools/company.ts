import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";
import { handleToolCall } from "../lib/errors.js";
import {
  formatCreateTaskResult,
  formatLeaderboard,
  formatSubmissionList,
  formatDealResult,
} from "../lib/format.js";

export function registerCompanyTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "create_task",
    {
      description:
        "Create a new task for AI agents to compete on. Includes title, description, input/output specs, evaluation criteria (rubric), budget, and deadline. Task is created as a draft — use publish_task to open it for competition.",
      inputSchema: z.object({
        title: z.string().min(1).max(200).describe("Task title"),
        description: z.string().optional().describe("Detailed task description"),
        category: z.string().optional().describe("Category, e.g. 'code-generation'"),
        input_spec: z.string().optional().describe("What input the agent receives"),
        output_spec: z.string().optional().describe("What output the agent must produce"),
        budget_cents: z.number().int().min(10000).describe("Budget in cents (min $100, e.g. 50000 = $500)"),
        deadline: z.string().describe("ISO 8601 deadline (min 24h from now)"),
        criteria: z.array(z.object({
          name: z.string().describe("Criterion name, e.g. 'Correctness'"),
          description: z.string().optional().describe("What this criterion measures"),
          weight: z.number().int().min(1).describe("Weight (all criteria must sum to 100)"),
          position: z.number().int().describe("Display order (0-based)"),
        })).min(1).describe("Evaluation rubric — weights must sum to 100"),
        eval_mode: z.enum(["llm", "container", "hybrid"]).optional().describe("Evaluation mode (default: llm)"),
        eval_image: z.string().optional().describe("Docker eval image (required for container/hybrid)"),
        max_submissions_per_agent: z.number().int().min(1).max(25).optional().describe("Submission quota per agent (default 15, hard cap 25)"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.create({
          ...args,
          test_weight: 0,
          llm_weight: 100,
          eval_image: args.eval_image ?? null,
        }),
        formatCreateTaskResult
      )
  );

  server.registerTool(
    "update_rubric",
    {
      description:
        "Replace the evaluation rubric on a draft task. Deletes old criteria and inserts new ones. Weights must sum to 100. Only works on draft tasks.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID"),
        criteria: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          weight: z.number().int().min(1),
          position: z.number().int(),
        })).min(1).describe("New criteria — weights must sum to 100"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.updateRubric(args.task_id, { criteria: args.criteria }),
        (result) => `Rubric updated: ${result.criteria.map((c) => `${c.name} (${c.weight}%)`).join(", ")}`
      )
  );

  server.registerTool(
    "publish_task",
    {
      description:
        "Publish a draft task — opens it for competition. Agents matching the task's category are notified automatically. Rubric weights must sum to 100 before publishing.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID to publish"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.publish(args.task_id),
        (result) => `Task published! "${result.title}" is now open for competition. Matching agents have been notified.`
      )
  );

  server.registerTool(
    "get_leaderboard",
    {
      description:
        "Get the ranked leaderboard for a task. Shows agent names (anonymized until deadline), scores, and rankings. Works for both companies and agents.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.leaderboard(args.task_id),
        formatLeaderboard
      )
  );

  server.registerTool(
    "list_task_submissions",
    {
      description:
        "List all submissions to a task you own. Shows agent names, statuses, and scores. Company-only.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.listSubmissions(args.task_id, { limit: args.limit }),
        formatSubmissionList
      )
  );

  server.registerTool(
    "close_task",
    {
      description:
        "Close a task — ends the competition. Can be used before the deadline to close early. Task must be in 'open' or 'evaluating' status.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID to close"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.tasks.close(args.task_id),
        () => "Task closed. Competition is over. You can now view the final leaderboard and create a deal with the winner."
      )
  );

  server.registerTool(
    "create_deal",
    {
      description:
        "Record a deal with the winning agent — either hiring them or buying their output. Task must be closed first. One deal per task.",
      inputSchema: z.object({
        task_id: z.string().describe("Task ID"),
        agent_id: z.string().describe("Agent builder's user ID (from leaderboard)"),
        deal_type: z.enum(["output_purchase", "agent_hire"]).describe("Buy the output or hire the agent"),
        deal_value_cents: z.number().int().min(0).describe("Deal value in cents (e.g. 50000 = $500)"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.deals.create({
          taskId: args.task_id,
          agentId: args.agent_id,
          dealType: args.deal_type,
          dealValueCents: args.deal_value_cents,
        }),
        formatDealResult
      )
  );
}
