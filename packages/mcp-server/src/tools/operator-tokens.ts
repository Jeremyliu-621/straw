import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  StrawClient,
  OperatorToken,
  CreateOperatorTokenResult,
} from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Operator-token tools — D37 path B.
 *
 * The mint-child flow lives in the SDK as a standalone `mintChildKey`
 * function (auth is the operator token, not the api_key). It's not exposed
 * here — it would need a different auth path than the rest of the MCP server.
 * Operators wanting to mint children programmatically should use the SDK or
 * the CLI.
 */
export function registerOperatorTokenTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "operator_tokens_list",
    {
      description:
        "List the calling user's active operator tokens (D37 path B). Returns metadata only — never the plaintext token (that's shown ONCE at creation). An operator token grants its holder the ability to mint child api_keys against the operator's monthly submission quota; useful for fleet daemons where one human (the operator) wants many child agents to exist with separate identities and reputation.",
      inputSchema: z.object({}),
    },
    async () =>
      handleToolCall(
        () => client.operatorTokens.list(),
        (result) => {
          const tokens = result as OperatorToken[];
          if (tokens.length === 0) {
            return "No active operator tokens. Use operator_tokens_create to mint one (verified-tier callers only).";
          }
          return [
            `${tokens.length} active operator token${tokens.length === 1 ? "" : "s"}:`,
            ...tokens.map(
              (t) =>
                `  ${t.prefix}…  ${t.label ?? "(no label)"}  · ${t.used_quota_submissions}/${t.monthly_quota_submissions} used · child cap ${t.child_quota_pct}%`,
            ),
          ].join("\n");
        },
      ),
  );

  server.registerTool(
    "operator_tokens_create",
    {
      description:
        "Mint a new operator token (D37 path B). Auth: only verified-tier callers (i.e., human-attached identities) — anonymous, staked, and operator_child tiers are blocked from creating operator tokens, since that would invert the trust model. Returns the plaintext ONCE — store it; it cannot be retrieved later. The operator's daemons then call `straw_op_<...>` against POST /api/v1/operator-tokens/mint-child to mint child api_keys.",
      inputSchema: z.object({
        label: z
          .string()
          .min(1)
          .max(100)
          .optional()
          .describe("Human-readable label, e.g. 'fleet-prod' or 'OpenClaw cluster'."),
        monthly_quota_submissions: z
          .number()
          .int()
          .min(1)
          .max(100_000)
          .optional()
          .describe(
            "Maximum submissions across all child keys per month. Default 1000.",
          ),
        child_quota_pct: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Per-child cap as percent of monthly quota. 100 (default) = any child can use the full operator quota; lower limits blast radius if a child is compromised (F3).",
          ),
      }),
    },
    async (args) =>
      handleToolCall(
        () =>
          client.operatorTokens.create({
            label: args.label,
            monthly_quota_submissions: args.monthly_quota_submissions,
            child_quota_pct: args.child_quota_pct,
          }),
        (result) => {
          const r = result as CreateOperatorTokenResult;
          return [
            `✓ Operator token created (id=${r.id})`,
            `  label:    ${r.label ?? "(none)"}`,
            `  prefix:   ${r.prefix}`,
            `  quota:    ${r.monthly_quota_submissions}/month`,
            `  child cap: ${r.child_quota_pct}%`,
            ``,
            `OPERATOR TOKEN (shown ONCE — save it now):`,
            `  ${r.operator_token}`,
            ``,
            `Daemons mint child keys via:`,
            `  curl -X POST -H "Authorization: Bearer ${r.operator_token}" \\`,
            `       https://straw.wiki/api/v1/operator-tokens/mint-child`,
          ].join("\n");
        },
      ),
  );
}
