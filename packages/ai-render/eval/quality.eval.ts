// Quality eval of «Diseño con IA»: the same two screens (a 7-block landing and a dashboard) of two fictional brands,
// designed by each model with the app's real call (`screenParams`, effort `low`, streaming, the cached art direction).
//
//   DIALMADE_EVAL_LIVE=1 DIALMADE_EVAL_OUT=<dir> corepack pnpm --filter @dialmade/ai-render eval:quality   # calls Claude
//   DIALMADE_EVAL_OUT=<dir> corepack pnpm --filter @dialmade/ai-render eval:quality                        # re-renders, $0
//
// Env: DIALMADE_EVAL_MODELS (comma list, default haiku,sonnet,opus), DIALMADE_EVAL_MAX_USD (hard stop, default 2),
// DIALMADE_EVAL_LABEL (folder name under the out dir, default «before»), DIALMADE_EVAL_FORCE=1 (regenerate saved ones).
// The raw answers are saved BEFORE anything is rendered, so a rendering bug never costs a second call. The key is read
// from apps/web/.env.local by code and never printed. Output (never committed): per label, `<brand>-<screen>-<model>.json`
// (raw answer, usage, cost, timings), the static HTML and PNG of every screen, side-by-side sheets and metrics.json.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { compileThemeVars } from "@dialmade/doc";
import { readBundledCss } from "@dialmade/sections/node";
import { renderStaticPage } from "@dialmade/sections";
import { chromium, type Browser } from "playwright";
import { expect, it } from "vitest";
import { createDirection, directionParams, screenParams, streamBlocks } from "../src/anthropic";
import { classTokensOf, compileAiCss } from "../src/css";
import { directionCandidates, hash32 } from "../src/direction";
import { inlineAssets } from "../src/export";
import { structureGate } from "../src/gates";
import { brandInput, screenInput } from "../src/input";
import { processBlock } from "../src/pipeline";
import { splitBlocks } from "../src/stream";
import { attr, elements, parseSanitized, textOf } from "../src/tree";
import { apiKey } from "./key";
import { BRANDS } from "./fixtures";
import { DASH_ID, LANDING_ID, qualityDoc } from "./quality.fixtures";

const ROOT = join(import.meta.dirname, "../../..");
const OUT = process.env.DIALMADE_EVAL_OUT ?? join(ROOT, "docs/design/assets/quality");
const LABEL = process.env.DIALMADE_EVAL_LABEL ?? "before";
const DIR = join(OUT, LABEL);
const LIVE = process.env.DIALMADE_EVAL_LIVE === "1";
const FORCE = process.env.DIALMADE_EVAL_FORCE === "1";
const MAX_USD = Number(process.env.DIALMADE_EVAL_MAX_USD ?? "2");

const MODELS = {
  haiku: { id: "claude-haiku-5-5", price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 } },
  sonnet: { id: "claude-sonnet-5-5", price: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 } },
  opus: { id: "claude-opus-5-5", price: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } },
} as const;
type ModelKey = keyof typeof MODELS;
const MODEL_KEYS = (process.env.DIALMADE_EVAL_MODELS ?? "haiku,sonnet,opus").split(",").map((m) => m.trim()) as ModelKey[];
// The two brands with the most different register: Brisa (es, warm soft-ui) and Vectora (en, tech-precision).
const EVAL_BRANDS = BRANDS.filter((brand) => brand.id === "brisa" || brand.id === "vectora");
const SCREEN_IDS = [LANDING_ID, DASH_ID] as const;

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
const costOf = (u: Usage, model: ModelKey) => {
  const p = MODELS[model].price;
  return (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6;
};

type SavedDirection = { axes: Record<string, string>; moves: string[]; rationale: string; usage: Usage; costUsd: number; ms: number };
type SavedScreen = { brand: string; screen: string; model: ModelKey; raw: string; usage: Usage; costUsd: number; ttftMs: number; ms: number; stop: string | null };

const exists = (file: string) => access(file).then(() => true, () => false);
let spent = 0;
const guard = () => {
  if (spent > MAX_USD) throw new Error(`Eval stopped: spent $${spent.toFixed(3)} > DIALMADE_EVAL_MAX_USD ($${MAX_USD})`);
};

async function directionFor(client: Anthropic, brandId: string): Promise<SavedDirection> {
  const file = join(DIR, `${brandId}-direction.json`);
  if (!FORCE && (await exists(file))) return JSON.parse(await readFile(file, "utf8")) as SavedDirection;
  if (!LIVE) throw new Error(`Missing ${file}: run with DIALMADE_EVAL_LIVE=1`);
  guard();
  const brand = EVAL_BRANDS.find((b) => b.id === brandId)!;
  const { doc } = qualityDoc(brand);
  const candidates = directionCandidates(hash32(brand.id), doc.brief.recipeId, "auto");
  const screens = SCREEN_IDS.map((id) => {
    const screen = screenInput(doc, id, { draftOf: () => [] });
    return { name: screen.name, kind: screen.kind, blocks: screen.blocks.map((b) => b.type) };
  });
  const t0 = performance.now();
  const direction = await createDirection(
    client,
    directionParams({ model: MODELS.haiku.id, effort: "low" }, brandInput(doc), candidates, doc.brief.locale, screens),
    candidates,
  );
  const saved: SavedDirection = { ...direction.answer, usage: direction.message.usage, ms: performance.now() - t0, costUsd: costOf(direction.message.usage, "haiku") };
  spent += saved.costUsd;
  await writeFile(file, JSON.stringify(saved, null, 2));
  return saved;
}

/** One model, one brand: the two screens as the app does it (the second starts once the first one's prompt was read). */
async function generate(client: Anthropic, brandId: string, model: ModelKey, direction: SavedDirection): Promise<SavedScreen[]> {
  const brand = EVAL_BRANDS.find((b) => b.id === brandId)!;
  const { doc, screens } = qualityDoc(brand);
  const files = SCREEN_IDS.map((id) => join(DIR, `${brandId}-${id}-${model}.json`));
  if (!FORCE && (await Promise.all(files.map(exists))).every(Boolean)) return Promise.all(files.map(async (f) => JSON.parse(await readFile(f, "utf8")) as SavedScreen));
  if (!LIVE) throw new Error(`Missing saved answers for ${brandId}/${model}: run with DIALMADE_EVAL_LIVE=1`);
  guard();
  const brandData = brandInput(doc);
  const options = { model: MODELS[model].id, effort: "low" as const };
  const run = async (id: (typeof SCREEN_IDS)[number], onStart?: () => void): Promise<SavedScreen> => {
    const screen = screenInput(doc, id, { draftOf: screens[id]!.draftOf });
    const t0 = performance.now();
    let ttft = 0;
    const result = await streamBlocks(
      client,
      screenParams(options, brandData, direction, screen),
      screen.blocks.map((b) => b.id),
      { onStart: () => { ttft = performance.now() - t0; onStart?.(); } },
    );
    const raw = result.message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const saved: SavedScreen = { brand: brandId, screen: id, model, raw, usage: result.message.usage, costUsd: costOf(result.message.usage, model), ttftMs: ttft, ms: performance.now() - t0, stop: result.message.stop_reason };
    spent += saved.costUsd;
    await writeFile(join(DIR, `${brandId}-${id}-${model}.json`), JSON.stringify(saved, null, 2));
    return saved;
  };
  let release!: () => void;
  const started = new Promise<void>((resolve) => (release = resolve));
  const first = run(SCREEN_IDS[0], release);
  // The second screen reads the cached prompt: start it after the first began streaming.
  const second = started.then(() => run(SCREEN_IDS[1]));
  return Promise.all([first, second]);
}

type Stats = {
  blocks: number;
  ok: number;
  failed: string[];
  warnings: string[];
  htmlBytes: number;
  elements: number;
  textSizes: string[];
  fontClasses: string[];
  icons: number;
  placeholders: number;
  roundedFullIconCircles: number;
  headings: Record<string, number>;
  containerVariants: number;
  words: number;
  nonLatin: string[];
};

async function render(brandId: string, screenId: (typeof SCREEN_IDS)[number], saved: SavedScreen | null, kitCss: string) {
  const brand = EVAL_BRANDS.find((b) => b.id === brandId)!;
  const { doc, theme, screens } = qualityDoc(brand);
  const screenDef = screens[screenId]!;
  const screen = screenInput(doc, screenId, { draftOf: screenDef.draftOf });
  const stats: Stats = { blocks: screen.blocks.length, ok: 0, failed: [], warnings: [], htmlBytes: 0, elements: 0, textSizes: [], fontClasses: [], icons: 0, placeholders: 0, roundedFullIconCircles: 0, headings: {}, containerVariants: 0, words: 0, nonLatin: [] };
  const aiBlocks: Record<string, string> = {};
  if (saved) {
    const roots = splitBlocks(saved.raw, screen.blocks.map((b) => b.id));
    const gate = structureGate(screen.blocks.map((b) => b.id), roots);
    stats.failed.push(...gate.missing.map((id) => `${id}:missing`));
    const sizes = new Set<string>();
    const fonts = new Set<string>();
    for (const block of screen.blocks) {
      const raw = gate.accepted.get(block.id);
      if (!raw) continue;
      const processed = processBlock(raw, { block, screenIds: doc.screenOrder, theme });
      if (!processed.ok) {
        stats.failed.push(`${block.id}:${processed.failure}`);
        continue;
      }
      stats.ok++;
      stats.warnings.push(...processed.gates.warnings.map((w) => `${block.id}: ${w.code}${w.detail ? ` ${w.detail}` : ""}`));
      aiBlocks[block.id] = inlineAssets(processed.html);
      stats.htmlBytes += processed.html.length;
      const tree = parseSanitized(processed.html);
      for (const el of elements(tree)) {
        stats.elements++;
        const classes = (attr(el, "class") ?? "").split(/\s+/).filter(Boolean);
        for (const cls of classes) {
          const utility = cls.replace(/^(?:[@a-z0-9-]+:)+/, "");
          if (/^text-(display|h1|h2|h3|body|small|caption)$/.test(utility)) sizes.add(utility);
          if (/^font-(heading|body|mono)$/.test(utility)) fonts.add(utility);
          if (/^@/.test(cls)) stats.containerVariants++;
        }
        if (el.tag === "i" && attr(el, "data-icon")) stats.icons++;
        if (el.tag === "img" && attr(el, "data-placeholder")) stats.placeholders++;
        if (/^h[1-6]$/.test(el.tag)) stats.headings[el.tag] = (stats.headings[el.tag] ?? 0) + 1;
        if (el.tag === "span" && /rounded-full/.test(attr(el, "class") ?? "") && el.children.some((c) => c.type === "element" && c.tag === "i")) stats.roundedFullIconCircles++;
      }
      const text = textOf(tree);
      stats.words += text.split(/\s+/).filter(Boolean).length;
      for (const ch of text.match(/[぀-ヿ㐀-鿿가-힯Ѐ-ӿ؀-ۿ]/g) ?? []) if (!stats.nonLatin.includes(ch)) stats.nonLatin.push(ch);
    }
    stats.textSizes = [...sizes].sort();
    stats.fontClasses = [...fonts].sort();
  }
  const aiCss = saved ? await compileAiCss(Object.values(aiBlocks).flatMap(classTokensOf), { scoped: true }) : "";
  const page = doc.screens[screenId]!.page;
  const html = renderStaticPage(doc, screenDef.kind, compileThemeVars(doc, { mode: "light" }), {
    page,
    css: [kitCss, screenDef.layoutCss, ...(saved ? [aiCss] : [])],
    ...(saved && { aiBlocks }),
  });
  return { html, stats };
}

async function shot(browser: Browser, html: string, file: string): Promise<{ png: Buffer; height: number; fontsOk: boolean }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => [...document.fonts].some((f) => f.status === "loaded"));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const png = await page.screenshot({ fullPage: true, path: file });
  await page.close();
  return { png, height, fontsOk };
}

async function sheet(browser: Browser, columns: { label: string; png: Buffer }[], file: string) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
  const cells = columns
    .map(({ label, png }) => `<figure style="margin:0;flex:1;min-width:0"><figcaption style="font:600 20px system-ui;padding:6px 0">${label}</figcaption><img style="width:100%;display:block;border:1px solid #ccc" src="data:image/png;base64,${png.toString("base64")}"></figure>`)
    .join("");
  await page.setContent(`<body style="margin:12px;background:#fff"><div style="display:flex;gap:12px;align-items:flex-start">${cells}</div></body>`);
  await page.screenshot({ fullPage: true, path: file });
  await page.close();
}

it("quality: 3 models × 2 brands × landing + dashboard", async () => {
  await mkdir(DIR, { recursive: true });
  const client = LIVE ? new Anthropic({ apiKey: await apiKey(), maxRetries: 1, timeout: 280_000 }) : (null as unknown as Anthropic);

  // 1. Generation. One art direction per brand (Haiku, shared by every model: only the screen model varies).
  const directions: Record<string, SavedDirection> = {};
  for (const brand of EVAL_BRANDS) directions[brand.id] = await directionFor(client, brand.id);
  const jobs = EVAL_BRANDS.flatMap((brand) => MODEL_KEYS.map((model) => ({ brand: brand.id, model })));
  const results = await Promise.all(jobs.map((job) => generate(client, job.brand, job.model, directions[job.brand]!)));
  const answers = new Map<string, SavedScreen>();
  for (const list of results) for (const saved of list) answers.set(`${saved.brand}/${saved.screen}/${saved.model}`, saved);

  // 2. Rendering, screenshots and metrics ($0).
  const kitCss = await readBundledCss();
  const browser = await chromium.launch();
  const rows: Record<string, unknown>[] = [];
  let fontsOk = true;
  for (const brand of EVAL_BRANDS) {
    for (const screenId of SCREEN_IDS) {
      const columns: { label: string; png: Buffer }[] = [];
      const base = await render(brand.id, screenId, null, kitCss);
      await writeFile(join(DIR, `${brand.id}-${screenId}-base.html`), base.html);
      const baseShot = await shot(browser, base.html, join(DIR, `${brand.id}-${screenId}-base.png`));
      for (const model of MODEL_KEYS) {
        const saved = answers.get(`${brand.id}/${screenId}/${model}`)!;
        const rendered = await render(brand.id, screenId, saved, kitCss);
        await writeFile(join(DIR, `${brand.id}-${screenId}-${model}.html`), rendered.html);
        const captured = await shot(browser, rendered.html, join(DIR, `${brand.id}-${screenId}-${model}.png`));
        fontsOk &&= captured.fontsOk;
        columns.push({ label: `${brand.name} · ${screenId === LANDING_ID ? "landing" : "dashboard"} · ${model}`, png: captured.png });
        rows.push({
          brand: brand.id,
          screen: screenId,
          model,
          costUsd: +saved.costUsd.toFixed(4),
          seconds: +(saved.ms / 1000).toFixed(1),
          ttftSeconds: +(saved.ttftMs / 1000).toFixed(1),
          inputTokens: saved.usage.input_tokens,
          cacheRead: saved.usage.cache_read_input_tokens ?? 0,
          cacheWrite: saved.usage.cache_creation_input_tokens ?? 0,
          outputTokens: saved.usage.output_tokens,
          stop: saved.stop,
          pageHeightPx: captured.height,
          basePageHeightPx: baseShot.height,
          ...rendered.stats,
        });
      }
      await sheet(browser, columns, join(DIR, `${brand.id}-${screenId}-sheet.png`));
    }
  }
  await browser.close();

  const byModel = Object.fromEntries(
    MODEL_KEYS.map((model) => {
      const own = rows.filter((r) => r.model === model);
      const cost = own.reduce((sum, r) => sum + (r.costUsd as number), 0);
      return [model, { screens: own.length, totalUsd: +cost.toFixed(4), perScreenUsd: +(cost / own.length).toFixed(4), avgSeconds: +(own.reduce((s, r) => s + (r.seconds as number), 0) / own.length).toFixed(1) }];
    }),
  );
  const summary = { label: LABEL, fontsLoaded: fontsOk, directions, directionCostUsd: +Object.values(directions).reduce((s, d) => s + d.costUsd, 0).toFixed(4), byModel, rows };
  await writeFile(join(DIR, "metrics.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ label: LABEL, fontsLoaded: fontsOk, spentThisRun: +spent.toFixed(4), byModel }, null, 2));
  expect(rows).toHaveLength(EVAL_BRANDS.length * SCREEN_IDS.length * MODEL_KEYS.length);
});
