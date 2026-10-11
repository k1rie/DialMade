// Gallery of the reference library: every entry rendered with two fictional brands (light) and one in dark mode,
// through the SAME pipeline as a model answer (sanitize, gates, CSS compile). Output (never committed):
//   <OUT>/library/<type>-<brand>-<mode>.png, <OUT>/library/entries/<id>-<brand>-<mode>.png  and  <OUT>/library/report.json
//
//   DIALMADE_EVAL_OUT=<dir> DIALMADE_LIB_TYPES=hero,features DIALMADE_LIB_BRANDS=brisa,vectora,ollaria \
//     corepack pnpm --filter @dialmade/ai-render eval:library
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compileThemeVars } from "@dialmade/doc";
import { emptyLayout, type LayoutDoc, type LibraryBlockType as LayoutBlockType } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc } from "@dialmade/sections";
import { readBundledCss } from "@dialmade/sections/node";
import { renderStaticPage } from "@dialmade/sections";
import { chromium } from "playwright";
import { expect, it } from "vitest";
import { classTokensOf, compileAiCss } from "../src/css";
import { themeColorsFromVars } from "../src/contrast";
import { inlineAssets } from "../src/export";
import { LIBRARY } from "../src/library";
import { processBlock } from "../src/pipeline";
import { sanitizeBlock } from "../src/sanitize";
import { contrastIssues } from "../src/contrast";
import { snippet } from "../src/gates";
import { BRANDS } from "./fixtures";
import { qualityDoc } from "./quality.fixtures";

const ROOT = join(import.meta.dirname, "../../..");
const OUT = join(process.env.DIALMADE_EVAL_OUT ?? join(ROOT, "docs/design/assets/quality"), "library");
const TYPES = process.env.DIALMADE_LIB_TYPES?.split(",").map((t) => t.trim());
const GALLERY_BRANDS = (process.env.DIALMADE_LIB_BRANDS ?? "brisa,vectora").split(",").map((b) => b.trim());
const ROWS: Record<string, number> = { navbar: 8, hero: 64, features: 48, logos: 12, testimonials: 40, pricing: 60, cta: 24, footer: 28, stats: 16, kpis: 14, chart: 40, table: 44, activity: 40, list: 40, cards: 44, empty: 36, form: 40, faq: 44, text: 24 };
const SHELL = { nav: "sidebar", header: true } as const;

const classSet = (html: string) => new Set((html.match(/class="([^"]*)"/g) ?? []).flatMap((m) => m.slice(7, -1).split(/\s+/)).filter(Boolean));
function classDiff(before: string, after: string) {
  const a = classSet(before);
  const b = classSet(after);
  return { removed: [...a].filter((c) => !b.has(c)), added: [...b].filter((c) => !a.has(c)) };
}

it("library gallery", async () => {
  await mkdir(join(OUT, "entries"), { recursive: true });
  const kitCss = await readBundledCss();
  const browser = await chromium.launch();
  const report: Record<string, unknown>[] = [];
  const types = [...new Set(LIBRARY.map((entry) => entry.type))].filter((type) => !TYPES || TYPES.includes(type));
  for (const brand of BRANDS.filter((b) => GALLERY_BRANDS.includes(b.id))) {
    const { doc } = qualityDoc(brand);
    const ctx = contentContextFromDoc(doc);
    for (const type of types) {
      const entries = LIBRARY.filter((entry) => entry.type === type);
      const kind = entries[0]!.surface === "app" ? "app" : "landing";
      const layout: LayoutDoc = emptyLayout();
      let row = 0;
      const blocks: Record<string, unknown> = {};
      entries.forEach((entry, i) => {
        const h = ROWS[type] ?? 40;
        blocks[`b-${i}`] = { type: type as LayoutBlockType, label: entry.id, rect: { col: 0, row, w: 12, h }, z: i + 1 };
        row += h;
      });
      layout.blocks = blocks as LayoutDoc["blocks"];
      const built = buildPageFromLayout(layout, kind, kind === "app" ? SHELL : null, ctx, { screenId: "s-gallery", screenTitle: "Gallery" });
      const aiBlocks: Record<string, string> = {};
      for (const [i, entry] of entries.entries()) {
        const id = `b-${i}`;
        const raw = entry.html.replace(/data-block-id="[^"]*"/, `data-block-id="${id}"`);
        const themeLight = themeColorsFromVars(compileThemeVars(doc, { mode: "light" }));
        const themeDark = themeColorsFromVars(compileThemeVars(doc, { mode: "dark" }));
        const block = { id, type, label: entry.id, cols: 12, heightPx: (ROWS[type] ?? 40) * 8, draft: [], ...(entry.type === "hero" && { h1: true as const }) };
        const processed = processBlock(raw, { block, screenIds: [], theme: { light: themeLight, dark: themeDark } });
        report.push({
          brand: brand.id,
          id: entry.id,
          ok: processed.ok,
          ...(processed.ok
            ? {
                dropped: processed.gates.dropped,
                bytes: processed.html.length,
                contrast: processed.gates.contrast,
                warnings: processed.gates.warnings.map((w) => `${w.code}${w.detail ? ` ${w.detail}` : ""}`),
                // What the sanitizer or the contrast fixer changed in the authored classes (a clean entry changes nothing).
                changed: classDiff(raw, processed.html),
                // Contrast problems of the AUTHORED block (before the fixer): a reference should have none.
                authoredIssues: (() => {
                  const clean = sanitizeBlock(raw, { blockId: id, screenIds: [] });
                  return clean.ok
                    ? contrastIssues(clean.tree, { light: themeLight, dark: themeDark }).map((i) => `${i.ratio.toFixed(1)}:1 ${i.kind} ${i.mode} · ${snippet(i.element.children) || i.element.tag}`)
                    : ["sanitize failed"];
                })(),
              }
            : { failure: processed.failure }),
        });
        if (processed.ok) aiBlocks[id] = inlineAssets(processed.html);
      }
      const aiCss = await compileAiCss(Object.values(aiBlocks).flatMap(classTokensOf), { scoped: true });
      for (const mode of brand.id === "brisa" ? (["light", "dark"] as const) : (["light"] as const)) {
        const html = renderStaticPage(doc, kind, compileThemeVars(doc, { mode }), { page: built.page, mode, css: [kitCss, built.css, aiCss], aiBlocks });
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.setContent(html, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(OUT, `${type}-${brand.id}-${mode}.png`), fullPage: true });
        // One image per entry too, so a family with many entries can be reviewed one by one.
        for (const [i, entry] of entries.entries()) {
          const root = page.locator(`[data-block-id="b-${i}"]`).first();
          if (await root.count()) await root.screenshot({ path: join(OUT, "entries", `${entry.id}-${brand.id}-${mode}.png`) });
        }
        await page.close();
      }
    }
  }
  await browser.close();
  await writeFile(join(OUT, "report.json"), JSON.stringify(report, null, 1));
  expect(report.length).toBeGreaterThan(0);
});
