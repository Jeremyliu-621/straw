import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";
import { handleToolCall } from "../lib/errors.js";
import { formatWebhookCreated, formatWebhookList } from "../lib/format.js";

export function registerWebhookTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "create_webhook",
    {
      description:
        "Register a webhook to receive notifications about Straw events (new tasks matching your categories, evaluation completed, etc.). Returns a signing secret shown only once.",
      inputSchema: z.object({
        url: z.string().url().describe("HTTPS URL to receive webhook POST requests"),
        events: z
          .array(
            z.enum([
              "task.status_changed",
              "task.matched",
              "submission.created",
              "submission.completed",
              "submission.failed",
              "evaluation.completed",
              "deal.created",
            ])
          )
          .min(1)
          .describe("Event types to subscribe to"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.webhooks.create(args),
        formatWebhookCreated
      )
  );

  server.registerTool(
    "list_webhooks",
    {
      description: "List your active webhooks with URLs and subscribed events.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      handleToolCall(
        () => client.webhooks.list(),
        formatWebhookList
      )
  );

  server.registerTool(
    "delete_webhook",
    {
      description: "Deactivate and remove a webhook. It will stop receiving events immediately.",
      inputSchema: z.object({
        webhook_id: z.string().describe("The webhook ID to delete"),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.webhooks.delete(args.webhook_id).then(() => "done"),
        () => "Webhook deleted successfully."
      )
  );
}
