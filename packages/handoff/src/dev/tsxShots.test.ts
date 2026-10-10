// Renders the TSX export for real: esbuild bundles each screen, react-dom/server renders it, Tailwind v4 compiles
// `dialmade.css` with the classes in use, and Playwright screenshots the page next to the real one.
// Skipped unless HANDOFF_TSX_SHOTS names an output folder:
//   HANDOFF_TSX_SHOTS=/tmp/tsx corepack pnpm --filter @dialmade/handoff exec vitest run src/dev/tsxShots
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { classesOf } from "../tsx/check";
import { toTsx } from "../tsx/toTsx";
import { screensDoc } from "../testing/fixtures";

const out = process.env.HANDOFF_TSX_SHOTS;
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const root = path.resolve(pkgRoot, "../..");

describe.skipIf(!out)("TSX shots", () => {
  it("renders every screen of the TSX export", async () => {
    mkdirSync(out!, { recursive: true });
    const files = toTsx(screensDoc());
    const cache = path.join(pkgRoot, "node_modules", ".cache");
    mkdirSync(cache, { recursive: true });
    const dir = mkdtempSync(path.join(cache, "tsx-shots-"));
    try {
      for (const [file, content] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
        writeFileSync(path.join(dir, file), content);
      }
      type Esbuild = { build(options: Record<string, unknown>): Promise<unknown> };
      const esbuild = createRequire(path.join(root, "packages/figma-plugin/package.json"))("esbuild") as Esbuild;
      const { compile } = (await import("tailwindcss")) as typeof import("tailwindcss");
      const twDir = path.dirname(createRequire(path.join(pkgRoot, "package.json")).resolve("tailwindcss/package.json"));
      const compiler = await compile(files["src/dialmade.css"]!, {
        base: dir,
        loadStylesheet: async (id: string, base: string) => {
          const file = id === "tailwindcss" ? path.join(twDir, "index.css") : id.startsWith("tailwindcss/") ? path.join(twDir, `${id.slice(12)}.css`) : path.resolve(base, id);
          return { content: readFileSync(file, "utf8"), base: path.dirname(file), path: file };
        },
      });
      const css = compiler.build(classesOf(files));
      const require = createRequire(path.join(root, "apps/web/package.json"));
      const { chromium } = require("playwright") as { chromium: { launch(): Promise<{ newPage(o: object): Promise<{ goto(u: string, o: object): Promise<unknown>; screenshot(o: object): Promise<unknown>; close(): Promise<void> }>; close(): Promise<void> }> } };
      const browser = await chromium.launch();
      for (const screen of Object.keys(files).filter((file) => file.startsWith("src/screens/"))) {
        const name = path.basename(screen, ".tsx");
        const bundle = path.join(dir, `${name}.mjs`);
        await esbuild.build({ entryPoints: [path.join(dir, screen)], bundle: true, format: "esm", platform: "node", jsx: "automatic", outfile: bundle, external: ["react", "react/jsx-runtime"], logLevel: "error", nodePaths: [path.join(pkgRoot, "node_modules")] });
        const mod = (await import(pathToFileURL(bundle).href)) as { default: ComponentType };
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${renderToStaticMarkup(createElement(mod.default))}</body></html>`;
        const file = path.join(out!, `${name}.html`);
        writeFileSync(file, html);
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
        await page.screenshot({ path: path.join(out!, `${name}.png`), fullPage: true });
        await page.close();
      }
      await browser.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 300_000);
});
