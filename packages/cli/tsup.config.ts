import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // Shebang is preserved from source so the bundled file is directly
  // executable as the `straw` binary.
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
  target: "node18",
  splitting: false,
  // Bundle everything; no external deps. The CLI is meant to be a single
  // immediately-usable binary after `npm i -g @strawai/cli`.
});
