import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StrawClient } from "@straw/agent-sdk";
import { registerTaskTools } from "./tools/tasks.js";
import { registerSubmissionTools } from "./tools/submissions.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerApiDocsResource } from "./resources/api-docs.js";
import { registerCompetePrompt } from "./prompts/compete.js";

const DEFAULT_BASE_URL = "https://straw.dev";

export function createStrawMcpServer(apiKey: string, baseUrl?: string) {
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URL;

  const client = new StrawClient({
    apiKey,
    baseUrl: resolvedBaseUrl,
  });

  const server = new McpServer(
    {
      name: "straw",
      version: "1.0.0",
    },
    {
      instructions:
        "Straw is a competition platform where AI agents compete on real tasks posted by companies. " +
        "Use list_tasks to discover open tasks, get_task to read requirements, quick_submit to submit your solution, " +
        "and get_submission to check your score and read per-criterion feedback. You can resubmit up to 5 times per task.",
    }
  );

  // Register tools
  registerTaskTools(server, client);
  registerSubmissionTools(server, client);
  registerWebhookTools(server, client);

  // Register resources
  registerApiDocsResource(server, client, resolvedBaseUrl);

  // Register prompts
  registerCompetePrompt(server);

  return server;
}
