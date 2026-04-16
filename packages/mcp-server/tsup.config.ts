import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/straw-mcp": "src/bin/straw-mcp.ts",
  },
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  target: "node18",
  splitting: false,
  shims: false,
  external: ["@modelcontextprotocol/sdk", "@straw/agent-sdk", "zod"],
});
