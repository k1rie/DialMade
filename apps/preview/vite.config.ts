import { defineConfig } from "vitest/config";

// One HTML page and one script, both same-origin (CSP `script-src 'self'`). No inline scripts or styles in the
// page itself; the runtime injects the block's CSS into a <style> (CSP `style-src 'unsafe-inline'`).
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    modulePreload: false,
    rollupOptions: {
      input: { island: "island.html" },
      output: { entryFileNames: "runtime.js", assetFileNames: "[name][extname]" },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
