// Lint for the packages (apps/web has its own config). Same rules as the app, minus Next-only ones:
// the packages render plain HTML for the user's pages, where `<img>` is the right element.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Tests mutate fixtures deeply on purpose.
  { files: ["**/*.test.ts", "**/*.test.tsx"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
  globalIgnores(["**/dist/**", "**/node_modules/**", "apps/**", "vendor/**", "scripts/**", "**/.turbo/**"]),
]);
