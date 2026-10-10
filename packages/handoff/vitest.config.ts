import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Golden tests build every screen of a document and the TSX test runs tsc: slower than the default.
    testTimeout: 60_000,
  },
});
