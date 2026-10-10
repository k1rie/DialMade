import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/css.ts", "src/anthropic.ts"],
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
