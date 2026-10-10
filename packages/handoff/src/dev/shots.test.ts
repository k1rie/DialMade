// Visual comparison of the real pages (renderStaticPage) and the figma-plan (planPreviewHtml), for builders.
// Skipped unless HANDOFF_SHOTS names an output folder:
//   HANDOFF_SHOTS=/tmp/shots HANDOFF_ONLY=landing. corepack pnpm --filter @dialmade/handoff exec vitest run src/dev
// Writes `<page>.real.png` / `<page>.plan.png` (full pages) and `<page>/<element>.real.png` / `.plan.png` crops of
// every section whose type starts with HANDOFF_ONLY (all when unset). Needs the kit CSS (`build:css` of ui and
// sections, run here when missing) and Playwright's Chromium (from apps/web).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { compileThemeVars, orderedScreens, type DesignDoc } from "@dialmade/doc";
import { absorbChildren, deriveResponsive, inferStructure, toCss } from "@dialmade/layout";
import { renderStaticPage } from "@dialmade/sections";
import { readBundledCss } from "@dialmade/sections/node";
import { planPreviewHtml } from "../figma/preview";
import { toFigmaPlan } from "../figma/toFigmaPlan";
import { everyBlockDoc, legacyDoc, screensDoc } from "../testing/fixtures";

const out = process.env.HANDOFF_SHOTS;
const only = process.env.HANDOFF_ONLY ?? "";
const docs = (process.env.HANDOFF_DOCS ?? "every,screens,legacy").split(",");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function ensureCss() {
  for (const pkg of ["ui", "sections"]) {
    const dist = path.join(root, "packages", pkg, "dist");
    if (!existsSync(dist)) execFileSync("node", [path.join(root, "packages", pkg, "scripts", "build-css.mjs")], { stdio: "inherit" });
  }
}

type Shot = { name: string; real: string; plan: string; crops: { key: string; type: string }[] };

async function pagesOf(doc: DesignDoc, label: string): Promise<Shot[]> {
  const css = await readBundledCss();
  const plan = toFigmaPlan(doc);
  const mode = plan.defaultMode === "Dark" ? "dark" : "light";
  const shots: Shot[] = [];
  const typeOf = (elements: Record<string, { type: string }>, key: string) => elements[key]?.type ?? "";
  for (const page of plan.pages) {
    const screen = orderedScreens(doc).find((entry) => entry.id === page.id);
    let html: string;
    let elements: Record<string, { type: string }>;
    if (screen) {
      const absorb = absorbChildren(screen.layout);
      const structure = inferStructure(absorb.layout);
      const layoutCss = toCss(absorb.layout, { kind: screen.kind, structure, responsive: deriveResponsive(absorb.layout, structure) });
      const links: Record<string, string> = {};
      for (const [id, block] of Object.entries(screen.layout.blocks)) if (block.linkTo && screen.page.elements[id]) links[id] = block.linkTo;
      html = renderStaticPage(doc, screen.kind, compileThemeVars(doc, { mode, ...(screen.page.dials && { pageDials: screen.page.dials }) }), {
        mode,
        page: screen.page,
        css: [css, layoutCss],
        links,
        linkHref: (id) => `#${id}`,
      });
      elements = screen.page.elements;
    } else {
      const kind = page.id as "brand" | "landing" | "app";
      html = renderStaticPage(doc, kind, compileThemeVars(doc, { mode }), { mode, css: [css] });
      elements = doc.pages[kind]!.elements;
    }
    const crops: Shot["crops"] = [];
    const visit = (node: { key?: string; children?: unknown[] }) => {
      const type = node.key ? typeOf(elements, node.key) : "";
      if (node.key && type && type !== "ui.region" && type.startsWith(only)) crops.push({ key: node.key, type });
      for (const child of (node.children ?? []) as { key?: string; children?: unknown[] }[]) visit(child);
    };
    visit(page.frame as never);
    shots.push({ name: `${label}-${page.id}`, real: html, plan: planPreviewHtml(plan, page.id), crops });
  }
  return shots;
}

describe.skipIf(!out)("visual shots", () => {
  it("writes real and plan screenshots", async () => {
    ensureCss();
    mkdirSync(out!, { recursive: true });
    const require = createRequire(path.join(root, "apps/web/package.json"));
    type Browser = { newContext(o: object): Promise<{ newPage(): Promise<Page> }>; close(): Promise<void> };
    type Locator = { first(): Locator; count(): Promise<number>; screenshot(o: object): Promise<unknown> };
    type Page = { goto(url: string, o: object): Promise<unknown>; screenshot(o: object): Promise<unknown>; locator(s: string): Locator; close(): Promise<void> };
    const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const all: Shot[] = [];
    if (docs.includes("every")) all.push(...(await pagesOf(everyBlockDoc(), "every")));
    if (docs.includes("screens")) all.push(...(await pagesOf(screensDoc(), "screens")));
    if (docs.includes("legacy")) all.push(...(await pagesOf(legacyDoc(), "legacy")));
    for (const shot of all) {
      if (only && shot.crops.length === 0) continue;
      for (const variant of ["real", "plan"] as const) {
        const file = path.join(out!, `${shot.name}.${variant}.html`);
        writeFileSync(file, shot[variant]);
        const page = await context.newPage();
        await page.goto(`file://${file}`, { waitUntil: "networkidle" }).catch(() => {});
        if (!only) await page.screenshot({ path: path.join(out!, `${shot.name}.${variant}.png`), fullPage: true });
        mkdirSync(path.join(out!, shot.name), { recursive: true });
        for (const crop of shot.crops) {
          const selector = variant === "real" ? `[data-dl-id="${crop.key}"]` : `[data-key="${crop.key}"]`;
          const element = page.locator(selector).first();
          if ((await element.count()) === 0) continue;
          await element.screenshot({ path: path.join(out!, shot.name, `${crop.type}--${crop.key}.${variant}.png`) }).catch(() => {});
        }
        await page.close();
      }
    }
    await browser.close();
  }, 600_000);
});
