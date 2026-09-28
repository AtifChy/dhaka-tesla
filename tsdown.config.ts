import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { server: "src/main.ts" },
  platform: "node",
  target: "node22.18",
  format: "esm",
  minify: false,
  clean: true,
  hash: false,
  sourcemap: false,
  outputOptions: { codeSplitting: false },
  deps: { neverBundle: true },
});
