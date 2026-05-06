// Ambient declaration for @strawai/mcp-server@1.1.0.
// The published tarball ships only ESM JS (no .d.ts); the package's
// tsup config has `dts: false` for size. Adding this here avoids a
// noisy TS7016 in the route handler at /api/v1/mcp without bumping
// the workspace package. Drop this file once mcp-server publishes
// its own types.
declare module "@strawai/mcp-server" {
  import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  export function createStrawMcpServer(apiKey: string, baseUrl?: string): McpServer;
}
