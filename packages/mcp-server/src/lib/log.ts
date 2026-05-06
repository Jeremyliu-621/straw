// Logging in an MCP stdio server.
//
// The MCP protocol uses stdout for JSON-RPC frames between client and server.
// Anything written to stdout that isn't a valid frame breaks the connection
// — the client either drops the line, mis-parses, or disconnects entirely.
// In practice this is one of the most common reasons a "working" MCP server
// suddenly fails when an `npm publish` introduces a stray `console.log`
// from a dependency or a forgotten debug line.
//
// Hard rule for this package: NEVER write to stdout. Use these helpers,
// which all go to stderr. The eslint config in eslint.config.mjs enforces
// `no-console` on `packages/mcp-server/src/**` with `allow: ["error", "warn"]`
// (both of which go to stderr by default), so any future `console.log` will
// fail CI.

export function strawLog(message: string, ...args: unknown[]): void {
  if (args.length > 0) {
    console.error(`[straw] ${message}`, ...args);
  } else {
    console.error(`[straw] ${message}`);
  }
}

export function strawWarn(message: string, ...args: unknown[]): void {
  if (args.length > 0) {
    console.warn(`[straw:warn] ${message}`, ...args);
  } else {
    console.warn(`[straw:warn] ${message}`);
  }
}

export function strawError(message: string, ...args: unknown[]): void {
  if (args.length > 0) {
    console.error(`[straw:error] ${message}`, ...args);
  } else {
    console.error(`[straw:error] ${message}`);
  }
}
