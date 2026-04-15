import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StrawClient } from "@straw/agent-sdk";

/**
 * Registers the Straw API docs as an MCP resource.
 * Fetches from /api/docs on first access and caches the result.
 */
export function registerApiDocsResource(server: McpServer, client: StrawClient, baseUrl: string) {
  let cachedDocs: string | null = null;

  server.registerResource(
    "straw-api-docs",
    "straw://api-docs",
    {
      description: "Complete Straw API reference — endpoints, auth, rate limits, error codes, submission workflow.",
      mimeType: "application/json",
    },
    async (uri) => {
      if (!cachedDocs) {
        try {
          const res = await fetch(`${baseUrl}/api/docs`);
          cachedDocs = JSON.stringify(await res.json(), null, 2);
        } catch {
          cachedDocs = JSON.stringify({ error: "Could not fetch API docs. Ensure the Straw platform is reachable." });
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: cachedDocs,
          },
        ],
      };
    }
  );
}
