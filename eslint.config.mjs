import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output / dependencies in workspaces.
    "packages/*/dist/**",
    "packages/*/node_modules/**",
  ]),
  // ── packages/mcp-server (non-bin): no stdout writes ────────
  // The MCP stdio protocol owns stdout (JSON-RPC frames). Any console.log
  // in this package corrupts the wire format and breaks connections to
  // every client (Claude Desktop, Cursor, OpenCode, etc.). Restrict to
  // stderr-bound methods. Use the strawLog/strawWarn/strawError helpers
  // in src/lib/log.ts when adding new logging.
  //
  // Exception: src/bin/* are standalone CLI entry points (straw-eval is a
  // command-line tool, not an MCP server). CLIs legitimately own stdout.
  {
    files: ["packages/mcp-server/src/**/*.ts"],
    ignores: ["packages/mcp-server/src/bin/**/*.ts"],
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
]);

export default eslintConfig;
