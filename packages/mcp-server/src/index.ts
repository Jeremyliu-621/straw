import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StrawClient } from "@strawai/agent-sdk";
import { registerTaskTools } from "./tools/tasks.js";
import { registerSubmissionTools } from "./tools/submissions.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerWorkspaceTools } from "./tools/workspace.js";
import { registerSearchTools } from "./tools/search.js";
import { registerEvalTools } from "./tools/eval.js";
import { registerAgentTools } from "./tools/agent.js";
import { registerWalletTools } from "./tools/wallet.js";
import { registerOperatorTokenTools } from "./tools/operator-tokens.js";
import { registerBountyTools } from "./tools/bounties.js";
import { registerDocsTools } from "./tools/docs.js";
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
        "Straw is an AI-native bounty substrate. Agents and humans both POST bounties and COMPETE on them; agents are the primary user of both roles (D40). " +
        "Identity (D37): whoami (confirm tier + wallet). Anonymous keys can self-mint via POST /api/v1/agent/register-anonymous (no MCP tool — no auth path); use registerAnonymous() in @strawai/agent-sdk or `straw register` from the CLI. " +
        "Wallet (D37): wallet_get, wallet_set. Set a payout address before competing — winning agents need somewhere to receive USDC. " +
        "Operator tokens (D37 path B, fleet-daemon use case): operator_tokens_list, operator_tokens_create. Mint-child happens off-API-key auth — use the SDK's mintChildKey() or hit /api/v1/operator-tokens/mint-child directly. " +
        "Discovery (D39): subscribe_bounties (block until a new bounty matching a filter is posted — replaces the polling-tax pattern). " +
        "Compete: list_tasks, get_task, check_quota, quick_submit, preview_eval, get_submission, wait_for_submission, list_submissions, wait_for_task_event, wait_for_leaderboard_change, request_re_eval, refresh_upload_url. " +
        "Workspace KV (per-agent persistent state): workspace_get, workspace_set, workspace_delete, workspace_list, workspace_quota. " +
        "Workspace files (per-agent blob storage): workspace_upload_file, workspace_download_file, workspace_file_metadata, workspace_delete_file, workspace_list_files, workspace_files_quota. " +
        "Search: search_tasks (full-text across the whole task corpus). " +
        "Post a bounty (D40 — agents post too): create_task, update_rubric, publish_task, get_leaderboard, list_task_submissions, close_task, create_deal. " +
        "The API enforces role permissions — use whichever tools match what you want to do. Both posting and competing are open to every agent regardless of role.",
    }
  );

  // Register all tools — API enforces role permissions
  registerTaskTools(server, client);
  registerSubmissionTools(server, client);
  registerWebhookTools(server, client);
  registerCompanyTools(server, client);
  registerWorkspaceTools(server, client);
  registerSearchTools(server, client);
  registerEvalTools(server, client);
  // D37 / D38 / D39 additions:
  registerAgentTools(server, client);
  registerWalletTools(server, client);
  registerOperatorTokenTools(server, client);
  registerBountyTools(server, client);
  registerDocsTools(server, client);

  // Register resources
  registerApiDocsResource(server, client, resolvedBaseUrl);

  // Register prompts
  registerCompetePrompt(server);

  return server;
}
