// App-screen eval of «Diseño con IA»: a dashboard with its frame (sidebar and top bar, ./src/chrome) designed block by
// block through the real pipeline (`screenParams` in blocks mode, the stream split, `processBlock`, the kit retarget
// of the frame's pieces), painted by `renderStaticPage` with the pieces in the frame's slots. Saves the raw answer
// BEFORE rendering; without DIALMADE_EVAL_LIVE it re-renders the saved one ($0).
//
//   DIALMADE_EVAL_LIVE=1 DIALMADE_EVAL_OUT=<dir> DIALMADE_EVAL_BRANDS=vectora \
//     corepack pnpm --filter @dialmade/ai-render exec vitest run --config eval/vitest.config.ts eval/app.eval.ts
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { compileThemeVars, createDesignDoc, formatIssues, safeParseDesignDoc, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc, renderStaticPage, visibleProps } from "@dialmade/sections";
import { readBundledCss } from "@dialmade/sections/node";
import { chromium } from "playwright";
import { expect, it } from "vitest";
import { screenParams, streamBlocks } from "../src/anthropic";
import { isChromeId } from "../src/chrome";
import { themeColorsFromVars } from "../src/contrast";
import { classTokensOf, compileAiCss } from "../src/css";
import { exportBlockHtml } from "../src/export";
import { KIT_TYPES, brandInput, draftTexts, screenInput } from "../src/input";
import { processBlock, retargetBlock } from "../src/pipeline";
import type { DirectionForPrompt } from "../src/prompt";
import { splitBlocks } from "../src/stream";
import { BRANDS } from "./fixtures";
import { apiKey } from "./key";

const LIVE = process.env.DIALMADE_EVAL_LIVE === "1";
const OUT = process.env.DIALMADE_EVAL_OUT ?? "/tmp/dialmade-app-eval";
const BRAND_IDS = (process.env.DIALMADE_EVAL_BRANDS ?? "vectora").split(",").map((b) => b.trim());
const MODEL = process.env.DIALMADE_EVAL_MODEL ?? "claude-haiku-5-5";

const DIRECTION: DirectionForPrompt = {
  axes: { composition: "data-dense", typeVoice: "technical-mono", decoration: "rules-and-grids", imagery: "data-viz-led", colorStrategy: "neutral-with-pops", rhythm: "compact" },
  moves: ["Hairline rules instead of card shadows", "One brand-colored number per view"],
  rationale: "A calm, precise workspace where the numbers lead.",
};

function appDoc(brandId: string): { doc: DesignDoc; layoutCss: Record<string, string> } {
  const brand = BRANDS.find((b) => b.id === brandId)!;
  const base = createDesignDoc({
    brand: { name: brand.name, tagline: brand.tagline, seeds: { primary: brand.primary, ...(brand.secondary && { secondary: brand.secondary }) } },
    brief: { productType: brand.productType, locale: brand.locale, recipeId: brand.recipeId },
    provenance: { createdAt: "2026-10-11T12:00:00.000Z", layoutBrief: { description: brand.description, source: "fallback" } },
  });
  const ctx = contentContextFromDoc(base);
  const specs = [
    { id: "s-dash", name: brand.locale === "es" ? "Panel" : "Dashboard", route: "/app", template: "dashboard" as const },
    { id: "s-settings", name: brand.locale === "es" ? "Ajustes" : "Settings", route: "/app/settings", template: "settings" as const },
  ];
  const navScreens = specs.map((spec) => ({ id: spec.id, name: spec.name }));
  const layoutCss: Record<string, string> = {};
  const screens = Object.fromEntries(
    specs.map((spec) => {
      let n = 0;
      const { layout, shell } = instantiateTemplate(getScreenTemplate(spec.template), { label: (type) => type, newId: () => `${spec.id}-${n++}` });
      const built = buildPageFromLayout(layout, "app", shell, ctx, { screenId: spec.id, screenTitle: spec.name, navScreens });
      layoutCss[spec.id] = built.css;
      const blocks = Object.fromEntries(Object.entries(layout.blocks).map(([id, block]) => [id, built.fingerprints[id] ? { ...block, generated: built.fingerprints[id] } : block]));
      return [spec.id, { id: spec.id, name: spec.name, kind: "app", route: spec.route, shell, layout: { ...layout, blocks }, page: built.page }];
    }),
  );
  const parsed = safeParseDesignDoc({ ...base, screens, screenOrder: specs.map((spec) => spec.id) });
  if (!parsed.success) throw new Error(formatIssues(parsed.issues));
  return { doc: parsed.data, layoutCss };
}

const exists = (file: string) => access(file).then(() => true, () => false);

it("app screen: the frame's sidebar and top bar are designed with the blocks", async () => {
  await mkdir(OUT, { recursive: true });
  const kitCss = await readBundledCss();
  const browser = await chromium.launch();
  for (const brandId of BRAND_IDS) {
    const { doc, layoutCss } = appDoc(brandId);
    const screenId = "s-dash";
    const screen = doc.screens[screenId]!;
    const elementOf = (id: string) => screen.page.elements[id];
    const input = screenInput(doc, screenId, {
      draftOf: (id) => (elementOf(id) ? draftTexts(visibleProps(elementOf(id)!)) : []),
      shellProps: elementOf("shell") ? visibleProps(elementOf("shell")!) : undefined,
    });
    expect(input.blocks.slice(0, 2).map((block) => block.id)).toEqual(["shell-nav", "shell-bar"]);
    const file = join(OUT, `${brandId}-app.json`);
    let raw: string;
    if (await exists(file)) raw = (JSON.parse(await readFile(file, "utf8")) as { raw: string }).raw;
    else {
      if (!LIVE) throw new Error(`Missing ${file}: run with DIALMADE_EVAL_LIVE=1`);
      const client = new Anthropic({ apiKey: await apiKey(), maxRetries: 2, timeout: 600_000 });
      const params = screenParams({ model: MODEL, effort: "low" }, brandInput(doc), DIRECTION, input);
      const result = await streamBlocks(client, params, input.blocks.map((b) => b.id), {}, { timeout: 600_000 });
      raw = result.message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      await writeFile(file, JSON.stringify({ model: result.message.model, usage: result.message.usage, stop: result.message.stop_reason, raw }, null, 1));
    }
    const theme = { light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
    const aiBlocks: Record<string, string> = {};
    const aiChrome: Record<string, string> = {};
    const failed: string[] = [];
    for (const root of splitBlocks(raw, input.blocks.map((b) => b.id))) {
      const block = input.blocks.find((b) => b.id === root.blockId);
      if (!block) continue;
      const context = { block, screenIds: doc.screenOrder, theme };
      let processed = processBlock(root.html, context);
      // Like the engine: a kit piece is retargeted to its screen (the current nav item) and processed again.
      if (processed.ok && KIT_TYPES.has(block.type)) processed = processBlock(retargetBlock(processed.html, block.id, block.id, screenId), context);
      if (!processed.ok) {
        failed.push(`${block.id}:${processed.failure}`);
        continue;
      }
      // As the packs export it: icons, charts and placeholders drawn as inline SVG.
      (isChromeId(block.id) ? aiChrome : aiBlocks)[block.id] = exportBlockHtml(processed.html, { hrefOf: (id) => `#${id}`, locale: doc.brief.locale });
    }
    const aiCss = await compileAiCss([...Object.values(aiBlocks), ...Object.values(aiChrome)].flatMap(classTokensOf), { scoped: true });
    const html = renderStaticPage(doc, "app", compileThemeVars(doc, { mode: "light" }), { page: screen.page, css: [kitCss, layoutCss[screenId]!, aiCss], aiBlocks, aiChrome });
    const stem = join(OUT, `${brandId}-app`);
    await writeFile(`${stem}.html`, html);
    for (const [name, width] of [["desktop", 1280], ["tablet", 900], ["mobile", 390]] as const) {
      const tab = await browser.newPage({ viewport: { width, height: 900 } });
      await tab.setContent(html, { waitUntil: "networkidle" });
      await tab.screenshot({ path: `${stem}-${name}.png`, fullPage: false });
      await tab.close();
    }
    await writeFile(`${stem}-report.json`, JSON.stringify({ failed, chrome: Object.keys(aiChrome), blocks: Object.keys(aiBlocks).length }, null, 1));
    expect(Object.keys(aiChrome).sort()).toEqual(["shell-bar", "shell-nav"]);
  }
  await browser.close();
}, 1_200_000);
