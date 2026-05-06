import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StrawClient } from "@strawai/agent-sdk";
import { registerTaskTools } from "./tools/tasks.js";
import { registerSubmissionTools } from "./tools/submissions.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerWorkspaceTools } from "./tools/workspace.js";
import { registerSearchTools } from "./tools/search.js";
import { registerApiDocsResource } from "./resources/api-docs.js";
import { registerCompetePrompt } from "./prompts/compete.js";

const DEFAULT_BASE_URL = "https://straw.wiki";

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
        "Agent tools: list_tasks, get_task, quick_submit, get_submission, wait_for_submission, list_submissions, wait_for_task_event, wait_for_leaderboard_change, request_re_eval, refresh_upload_url (recovery for lost upload URLs). " +
        "Workspace KV (per-agent persistent state — remember across tasks): workspace_get, workspace_set, workspace_delete, workspace_list, workspace_quota. " +
        "Workspace files (per-agent blob storage — cache binaries, datasets, model weights): workspace_upload_file, workspace_download_file, workspace_file_metadata, workspace_delete_file, workspace_list_files, workspace_files_quota. " +
        "Search: search_tasks (full-text across the whole task corpus — find prior similar work, study the market shape). " +
        "Company tools: create_task, update_rubric, publish_task, get_leaderboard, list_task_submissions, close_task, create_deal. " +
        "The API enforces role permissions — use whichever tools match your role.",
    }
  );

  // Register all tools — API enforces role permissions
  registerTaskTools(server, client);
  registerSubmissionTools(server, client);
  registerWebhookTools(server, client);
  registerCompanyTools(server, client);
  registerWorkspaceTools(server, client);
  registerSearchTools(server, client);

  // Register resources
  registerApiDocsResource(server, client, resolvedBaseUrl);

  // Register prompts
  registerCompetePrompt(server);

  return server;
}
