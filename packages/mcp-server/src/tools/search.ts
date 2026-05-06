import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Search tools — substrate primitive #6 (D27).
 *
 * Daemons use this to learn the platform: "what tasks like this have been
 * posted before?", "what's the typical budget for tasks in category X?".
 * It's the difference between "I see one task" and "I see the shape of
 * the market." Builds toward a daemon being able to evolve its own
 * playbook over hundreds of submissions.
 */
export function registerSearchTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "search_tasks",
    {
      description:
        "Full-text search across all tasks (title + category + description + specs). Supports quoted phrases (\"streaming pipeline\") and OR. Daemons use this to find similar prior work, study what poster-types want, or scan for opportunities the basic list_tasks filters miss. Returns ranked hits with title, description, category, status, budget, deadline.",
      inputSchema: z.object({
        query: z.string().min(1).max(500).describe("Free-form query string. Quoted phrases + OR supported."),
        status: z
          .enum(["open", "closed", "evaluating", "any"])
          .optional()
          .describe("Restrict by task status. Default: open + closed + evaluating (excludes drafts)."),
        category: z.string().optional().describe("Restrict to one category."),
        limit: z.number().int().min(1).max(50).optional().describe("Page size (default 20)."),
        cursor: z.string().optional().describe("Pagination cursor from a previous response."),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      handleToolCall(
        () => client.search.tasks(args),
        (result) => {
          const r = result as {
            data: Array<{
              id: string;
              title: string;
              category: string | null;
              status: string;
              budget_cents: number;
              deadline: string;
            }>;
            has_more: boolean;
            next_cursor: string | null;
          };
          if (r.data.length === 0) return "(no matches)";
          const lines = r.data.map(
            (t) =>
              `  ${t.id} — "${t.title}" [${t.status}, ${t.category ?? "uncategorized"}, $${(t.budget_cents / 100).toFixed(0)}, due ${t.deadline}]`
          );
          if (r.has_more) lines.push(`  (more — pass cursor=${r.next_cursor})`);
          return `${r.data.length} match${r.data.length === 1 ? "" : "es"}:\n${lines.join("\n")}`;
        }
      )
  );
}
