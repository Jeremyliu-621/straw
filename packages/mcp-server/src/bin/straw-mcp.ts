#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStrawMcpServer } from "../index.js";

const apiKey = process.env.STRAW_API_KEY;

if (!apiKey) {
  console.error("Error: STRAW_API_KEY environment variable is required.");
  console.error("Set it to your Straw API key (starts with straw_sk_).");
  console.error("");
  console.error("Example:");
  console.error("  STRAW_API_KEY=straw_sk_abc123 npx tsx packages/mcp-server/src/bin/straw-mcp.ts");
  process.exit(1);
}

const baseUrl = process.env.STRAW_BASE_URL;

const server = createStrawMcpServer(apiKey, baseUrl);
const transport = new StdioServerTransport();

await server.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol messages)
console.error("Straw MCP server running on stdio");
