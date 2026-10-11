// Page-mode eval of «Diseño con IA»: the 7-block landing of each fictional brand designed as one page from the brief
// (./src/pagePrompt), through the real pipeline: `screenParams` with `mode: "page"`, the stream split, the page
// stylesheet and the page-mode sanitizer, painted in the layout's cells by `renderStaticPage`. Arms compare models and
// extra guidance (a skill's text, a reference brief). Saves the raw answers BEFORE rendering.
//
//   DIALMADE_EVAL_LIVE=1 DIALMADE_EVAL_OUT=<dir> DIALMADE_EVAL_DIRECTIONS=<dir with <brand>-direction.json> \
//     DIALMADE_EVAL_ARMS=page,page-sonnet DIALMADE_EVAL_MAX_USD=2 \
//     corepack pnpm --filter @dialmade/ai-render exec vitest run --config eval/vitest.config.ts eval/page.eval.ts
//
// Without DIALMADE_EVAL_LIVE it re-renders the saved answers ($0). The key is read from apps/web/.env.local by code
// and never printed. Extra env: DIALMADE_EVAL_BRANDS (default brisa,vectora,ollaria), DIALMADE_EVAL_GUIDANCE (dir
// with <arm>.md files appended to the system prompt of the arms that name one), DIALMADE_EVAL_FORCE=1.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { compileThemeVars } from "@dialmade/doc";
import { renderStaticPage, visibleProps } from "@dialmade/sections";
import { readBundledCss } from "@dialmade/sections/node";
import { chromium } from "playwright";
import { expect, it } from "vitest";
import { screenParams, streamBlocks } from "../src/anthropic";
import { brandInput, screenInput } from "../src/input";
import { PAGE_BASE_CSS, fontRolesOf, sanitizeCss } from "../src/pageCss";
import { pageStyleText } from "../src/pagePrompt";
import { processBlock } from "../src/pipeline";
import type { DirectionForPrompt } from "../src/prompt";
import { splitBlocks } from "../src/stream";
import { BRANDS, evalDoc } from "./fixtures";
import { apiKey } from "./key";

const LIVE = process.env.DIALMADE_EVAL_LIVE === "1";
const FORCE = process.env.DIALMADE_EVAL_FORCE === "1";
const OUT = process.env.DIALMADE_EVAL_OUT ?? "/tmp/dialmade-page-eval";
const DIRECTIONS = process.env.DIALMADE_EVAL_DIRECTIONS ?? OUT;
const GUIDANCE = process.env.DIALMADE_EVAL_GUIDANCE ?? OUT;
const MAX_USD = Number(process.env.DIALMADE_EVAL_MAX_USD ?? "2");
const BRAND_IDS = (process.env.DIALMADE_EVAL_BRANDS ?? "brisa,vectora,ollaria").split(",").map((b) => b.trim());

const MODELS = {
  haiku: { id: "claude-haiku-5-5", in: 0.1, out: 0.5 },
  sonnet: { id: "claude-sonnet-5-5", in: 2, out: 10 },
  opus: { id: "claude-opus-5-5", in: 4, out: 20 },
} as const;
type ModelKey = keyof typeof MODELS;

/** An arm: the model, and optionally a guidance file (`<GUIDANCE>/<file>`) appended to the system prompt. */
export const PAGE_ARMS: Record<string, { model: ModelKey; guidance?: string; label: string }> = {
  page: { model: "haiku", label: "Haiku · página" },
  "page-sonnet": { model: "sonnet", label: "Sonnet · página" },
  "page-opus": { model: "opus", label: "Opus · página" },
  "page-uiskills": { model: "haiku", guidance: "baseline-ui.md", label: "Haiku · página + baseline-ui" },
  "page-refs": { model: "haiku", guidance: "refs-<brand>.md", label: "Haiku · página + referencias web" },
  "page-color": { model: "haiku", guidance: "color.md", label: "Haiku · página + estrategia de color" },
  "page-uiskills-all": { model: "haiku", guidance: "ui-skills-all.md", label: "Haiku · página + paquete ui-skills" },
  "page-frontend": { model: "haiku", guidance: "frontend-design.md", label: "Haiku · página + frontend-design" },
  "page-designmd": { model: "haiku", guidance: "designmd-<brand>.md", label: "Haiku · página + biblioteca DESIGN.md" },
};
const ARM_IDS = (process.env.DIALMADE_EVAL_ARMS ?? "page").split(",").map((a) => a.trim());

const exists = (file: string) => access(file).then(() => true, () => false);
const costOf = (usage: Anthropic.Beta.Messages.BetaUsage, model: ModelKey) => {
  const p = MODELS[model];
  return ((usage.input_tokens ?? 0) * p.in + (usage.cache_creation_input_tokens ?? 0) * p.in * 1.25 + (usage.cache_read_input_tokens ?? 0) * p.in * 0.1 + (usage.output_tokens ?? 0) * p.out) / 1e6;
};

/** The brand's Google Fonts URL with the real italics (page mode leans on them; Google serves the roman alone when there is none). */
const withItalics = (html: string) =>
  html.replace(/family=([\w+]+):wght@([\d;]+)/g, (_, family: string, weights: string) => {
    const list = weights.split(";");
    return `family=${family}:ital,wght@${[...list.map((w) => `0,${w}`), ...list.map((w) => `1,${w}`)].join(";")}`;
  });

type Saved = { brand: string; arm: string; model: string; raw: string; usage: Anthropic.Beta.Messages.BetaUsage; costUsd: number; seconds: number; stop: string | null };

it("page mode: arms × brands, 7-block landing", async () => {
  await mkdir(OUT, { recursive: true });
  const client = LIVE ? new Anthropic({ apiKey: await apiKey(), maxRetries: 2, timeout: 600_000 }) : null;
  const kitCss = await readBundledCss();
  const browser = await chromium.launch();
  let spent = 0;
  const rows: Record<string, unknown>[] = [];
  for (const arm of ARM_IDS) {
    const config = PAGE_ARMS[arm];
    if (!config) throw new Error(`Unknown arm ${arm}`);
    for (const brandId of BRAND_IDS) {
      const brand = BRANDS.find((b) => b.id === brandId)!;
      const { doc, screenId, layoutCss, theme } = evalDoc(brand, "seven");
      const page = doc.screens[screenId]!.page;
      const screen = screenInput(doc, screenId, { draftOf: () => [], mode: "page", propsOf: (id) => (page.elements[id] ? visibleProps(page.elements[id]!) : undefined) });
      const direction = JSON.parse(await readFile(join(DIRECTIONS, `${brandId}-direction.json`), "utf8")) as DirectionForPrompt;
      const file = join(OUT, `${brandId}-${arm}.json`);
      let saved: Saved;
      if (!FORCE && (await exists(file))) saved = JSON.parse(await readFile(file, "utf8")) as Saved;
      else {
        if (!client) throw new Error(`Missing ${file}: run with DIALMADE_EVAL_LIVE=1`);
        if (spent > MAX_USD) throw new Error(`Eval stopped: spent $${spent.toFixed(3)} > $${MAX_USD}`);
        const params = screenParams({ model: MODELS[config.model].id, effort: "low" }, brandInput(doc), { axes: direction.axes, moves: direction.moves, rationale: direction.rationale, ...(direction.context && { context: direction.context }), ...(direction.concept && { concept: direction.concept }) }, screen);
        if (config.guidance) {
          const guidance = await readFile(join(GUIDANCE, config.guidance.replace("<brand>", brandId)), "utf8");
          const system = params.system as Anthropic.Beta.Messages.BetaTextBlockParam[];
          params.system = [{ ...system[0]!, text: `${system[0]!.text}\n\n# Extra guidance\n${guidance}` }];
        }
        const t0 = performance.now();
        const result = await streamBlocks(client, params, screen.blocks.map((b) => b.id), {}, { timeout: 600_000 });
        const raw = result.message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
        saved = { brand: brandId, arm, model: result.message.model, raw, usage: result.message.usage, costUsd: costOf(result.message.usage, config.model), seconds: (performance.now() - t0) / 1000, stop: result.message.stop_reason };
        spent += saved.costUsd;
        await writeFile(file, JSON.stringify(saved, null, 1));
      }

      // The real pipeline: page stylesheet + one sanitized section per block.
      const ids = screen.blocks.map((b) => b.id);
      const roots = splitBlocks(saved.raw, ids);
      const styleRoot = roots.find((root) => root.blockId === null && pageStyleText(root.html) !== null);
      // As production: the brand's family names may be named (they become the theme's font variables).
      const fonts = fontRolesOf(compileThemeVars(doc, { mode: "light" }));
      const pageCss = styleRoot ? sanitizeCss(pageStyleText(styleRoot.html)!, { kind: "page" }, { fonts }) : { css: "", report: { droppedDeclarations: 0, droppedRules: 0 } };
      const aiBlocks: Record<string, string> = {};
      const failed: string[] = [];
      let warnings = 0;
      for (const block of screen.blocks) {
        const root = roots.find((r) => r.blockId === block.id);
        if (!root) {
          failed.push(`${block.id}:missing`);
          continue;
        }
        const processed = processBlock(root.html, { block, screenIds: doc.screenOrder, theme, mode: "page", fonts });
        if (!processed.ok) {
          failed.push(`${block.id}:${processed.failure}`);
          continue;
        }
        warnings += processed.gates.warnings.length;
        aiBlocks[block.id] = processed.html;
      }
      const html = withItalics(
        renderStaticPage(doc, "landing", compileThemeVars(doc, { mode: "light" }), { page, css: [kitCss, layoutCss, PAGE_BASE_CSS, pageCss.css], aiBlocks }),
      );
      const stem = join(OUT, `${brandId}-${arm}`);
      await writeFile(`${stem}.html`, html);
      for (const [name, width] of [["desktop", 1280], ["mobile", 390]] as const) {
        const tab = await browser.newPage({ viewport: { width, height: 900 } });
        await tab.setContent(html, { waitUntil: "networkidle" });
        await tab.evaluate(() => document.fonts.ready);
        const overflow = await tab.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        await tab.screenshot({ path: `${stem}-${name}.png`, fullPage: true });
        await tab.close();
        if (overflow) failed.push(`${name}:overflow`);
      }
      rows.push({ brand: brandId, arm, costUsd: +saved.costUsd.toFixed(4), seconds: +saved.seconds.toFixed(1), outputTokens: saved.usage.output_tokens, stop: saved.stop, pageCssBytes: pageCss.css.length, cssDropped: pageCss.report, sections: Object.keys(aiBlocks).length, failed, warnings });
    }
  }
  await browser.close();
  await writeFile(join(OUT, "metrics.json"), JSON.stringify({ spent, rows }, null, 1));
  expect(rows.length).toBe(ARM_IDS.length * BRAND_IDS.length);
}, 3_600_000);
