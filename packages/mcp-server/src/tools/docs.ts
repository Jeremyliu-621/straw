import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient, DocsSearchHit, DocsPage } from "@strawai/agent-sdk";
import { handleToolCall } from "../lib/errors.js";

/**
 * Docs tools — agent-readable documentation.
 *
 * Lets the agent search the Straw docs and read individual pages without
 * scraping HTML. The wire format is plain markdown — the model reads it
 * directly.
 */

export function registerDocsTools(server: McpServer, client: StrawClient) {
  server.registerTool(
    "search_docs",
    {
      description:
        "Search the Straw documentation. Substring-match across all docs pages with per-page scoring (title hits 5x, description 4x, headings 3x, body 1x). Returns up to N hits sorted by score with a snippet around the highest-scoring match. Use this when you need to find which docs page covers a topic before reading it.",
      inputSchema: z.object({
        q: z.string().min(1).describe("Search query. Lowercase, multiple tokens OK."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum hits to return. Default 10."),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.docs.search({ q: args.q, limit: args.limit }),
        (result) => {
          const hits = result as DocsSearchHit[];
          if (hits.length === 0) {
            return `No docs pages match "${args.q}". Try a broader query.`;
          }
          return [
            `Found ${hits.length} match${hits.length === 1 ? "" : "es"} for "${args.q}":`,
            "",
            ...hits.map(
              (h) =>
                `- ${h.slug} — ${h.title} (score ${h.score})\n  ${h.description ?? "(no description)"}\n  ${h.snippet}`,
            ),
            "",
            `Read any of them with: read_doc({ slug: "<slug>" })`,
          ].join("\n");
        },
      ),
  );

  server.registerTool(
    "read_doc",
    {
      description:
        "Fetch the full markdown content of a single Straw docs page by slug. Use after search_docs has identified the right page. Returns the raw MDX source (frontmatter stripped) — the same content rendered at https://straw.wiki/docs/<slug>.",
      inputSchema: z.object({
        slug: z
          .string()
          .min(1)
          .describe(
            "Page slug, e.g. 'concepts/wallet' or 'get-started/cli'. Get the list with search_docs.",
          ),
      }),
    },
    async (args) =>
      handleToolCall(
        () => client.docs.get(args.slug),
        (result) => {
          const page = result as DocsPage;
          return [
            `# ${page.title}`,
            page.description ? `\n> ${page.description}\n` : "",
            "",
            page.body_md,
            "",
            "---",
            `Source: ${page.file_path}`,
          ].join("\n");
        },
      ),
  );
}
