// Variety eval of «Diseño con IA» (spec §4.4), run by hand before launch and on every prompt change:
//
//   DIALMADE_EVAL_LIVE=1 corepack pnpm --filter @dialmade/ai-render eval:variety   # calls Claude (Haiku 5.5), ≈ $0.02
//   corepack pnpm --filter @dialmade/ai-render eval:variety                        # re-renders the saved answers, $0
//
// Same 5-block landing, 3 fictional brands. Per brand: the direction call (structured output) and one streamed
// screen. Output in docs/design/assets/spike/ (never committed): the raw answers, screenshots at 1280 px of the AI
// screen and of the deterministic base, in color and in a neutral gray theme, side-by-side sheets and metrics.json:
// - axes: how many of the 6 direction axes differ between each pair of brands;
// - structural similarity: Jaccard of tag+class 3-shingles (color classes removed) per block, between brands;
// - visual similarity: SSIM of the GRAY screenshots (palette removed), AI between brands vs. the base between brands.
// The key is read from apps/web/.env.local by code and never printed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { compileThemeVars, type DesignDoc } from "@dialmade/doc";
import { readBundledCss } from "@dialmade/sections/node";
import { renderStaticPage } from "@dialmade/sections";
import { chromium, type Browser } from "playwright";
import { expect, it } from "vitest";
import { createDirection, directionParams, screenParams, streamBlocks } from "../src/anthropic";
import { apiKey } from "./key";
import { classTokensOf, compileAiCss } from "../src/css";
import { directionCandidates, hash32 } from "../src/direction";
import { inlineAssets } from "../src/export";
import { brandInput, screenInput } from "../src/input";
import { processBlock } from "../src/pipeline";
import { structureGate } from "../src/gates";
import { elements, parseSanitized, attr } from "../src/tree";
import { colorOfClass, splitClass } from "../src/vocabulary";
import { BRANDS, evalDoc, grayDoc, type EvalBrand } from "./fixtures";

const ROOT = join(import.meta.dirname, "../../..");
const OUT = join(ROOT, "docs/design/assets/spike");
const MODEL = "claude-haiku-5-5";
const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 };
const LIVE = process.env.DIALMADE_EVAL_LIVE === "1";

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
const cost = (u: Usage) =>
  (u.input_tokens * PRICE.input + u.output_tokens * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1e6;

type Saved = {
  brand: string;
  direction: { axes: Record<string, string>; moves: string[]; rationale: string; usage: Usage; ms: number; costUsd: number };
  screen: { raw: string; usage: Usage; ttftMs: number; ms: number; costUsd: number; stop: string | null };
};

async function generate(client: Anthropic, brand: EvalBrand): Promise<Saved> {
  const { doc, screenId, draftOf } = evalDoc(brand);
  const brandData = brandInput(doc);
  const screen = screenInput(doc, screenId, { draftOf });
  const candidates = directionCandidates(hash32(brand.id), doc.brief.recipeId, "auto");
  const options = { model: MODEL, effort: "low" as const };
  let t0 = performance.now();
  const direction = await createDirection(
    client,
    directionParams(options, brandData, candidates, doc.brief.locale, [{ name: screen.name, kind: screen.kind, blocks: screen.blocks.map((b) => b.type) }]),
    candidates,
  );
  const directionMs = performance.now() - t0;
  t0 = performance.now();
  let ttft = 0;
  const result = await streamBlocks(
    client,
    screenParams(options, brandData, direction.answer, screen),
    screen.blocks.map((b) => b.id),
    { onProgress: () => (ttft ||= performance.now() - t0) },
  );
  const ms = performance.now() - t0;
  const raw = result.message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  return {
    brand: brand.id,
    direction: { ...direction.answer, usage: direction.message.usage, ms: directionMs, costUsd: cost(direction.message.usage) },
    screen: { raw, usage: result.message.usage, ttftMs: ttft, ms, costUsd: cost(result.message.usage), stop: result.message.stop_reason },
  };
}

const COLOR_NAMES = /^--(?!dl-)/;
/** The doc's tokens with the gray document's colors. */
function grayVars(doc: DesignDoc, mode: "light" | "dark") {
  const vars = compileThemeVars(doc, { mode });
  const gray = compileThemeVars(grayDoc(doc), { mode });
  for (const [name, value] of Object.entries(gray)) if (COLOR_NAMES.test(name)) vars[name] = value;
  return vars;
}

type Rendered = { ai: { color: string; gray: string }; base: { color: string; gray: string }; shingles: Record<string, Set<string>>; failed: string[]; warnings: number };

async function renderBrand(brand: EvalBrand, saved: Saved, kitCss: string): Promise<Rendered> {
  const { doc, screenId, layoutCss, theme, draftOf } = evalDoc(brand);
  const screen = screenInput(doc, screenId, { draftOf });
  const roots = (await import("../src/stream")).splitBlocks(saved.screen.raw, screen.blocks.map((b) => b.id));
  const gate = structureGate(screen.blocks.map((b) => b.id), roots);
  const aiBlocks: Record<string, string> = {};
  const failed = [...gate.missing];
  const shingles: Record<string, Set<string>> = {};
  let warnings = 0;
  for (const block of screen.blocks) {
    const raw = gate.accepted.get(block.id);
    if (!raw) continue;
    const processed = processBlock(raw, { block, screenIds: [], theme });
    if (!processed.ok) {
      failed.push(`${block.id}:${processed.failure}`);
      continue;
    }
    warnings += processed.gates.warnings.length;
    aiBlocks[block.id] = inlineAssets(processed.html);
    // Structure without color: tag + non-color classes of every element, in order, as 3-shingles.
    const tokens = [...elements(parseSanitized(processed.html))].map((el) => {
      const classes = (attr(el, "class") ?? "").split(/\s+/).filter((t) => t && !colorOfClass(splitClass(t).utility)).sort();
      return `${el.tag}.${classes.join(".")}`;
    });
    const set = new Set<string>();
    for (let i = 0; i + 2 < tokens.length; i++) set.add(tokens.slice(i, i + 3).join("|"));
    shingles[block.id] = set;
  }
  const aiCss = await compileAiCss(Object.values(aiBlocks).flatMap(classTokensOf), { scoped: true });
  const page = doc.screens[screenId]!.page;
  const html = (vars: Record<string, string>, ai: boolean) =>
    renderStaticPage(doc, "landing", vars, { page, css: [kitCss, layoutCss, ...(ai ? [aiCss] : [])], ...(ai && { aiBlocks }) });
  return {
    ai: { color: html(compileThemeVars(doc, { mode: "light" }), true), gray: html(grayVars(doc, "light"), true) },
    base: { color: html(compileThemeVars(doc, { mode: "light" }), false), gray: html(grayVars(doc, "light"), false) },
    shingles,
    failed,
    warnings,
  };
}

async function shot(browser: Browser, html: string, file: string): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ fullPage: true, path: file });
  await page.close();
  return png;
}

/** Mean SSIM of two screenshots (grayscale, 256 px wide, padded to the same height), computed in the browser. */
async function ssim(browser: Browser, a: Buffer, b: Buffer): Promise<number> {
  const page = await browser.newPage();
  const value = await page.evaluate(
    async ([x, y]) => {
      const load = (src: string) => new Promise<HTMLImageElement>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = src; });
      const [ia, ib] = await Promise.all([load(x!), load(y!)]);
      const W = 256;
      const H = Math.ceil(Math.max(ia.height * (W / ia.width), ib.height * (W / ib.width)));
      const gray = (img: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, img.height * (W / img.width));
        const data = ctx.getImageData(0, 0, W, H).data;
        const out = new Float64Array(W * H);
        for (let i = 0; i < out.length; i++) out[i] = 0.299 * data[i * 4]! + 0.587 * data[i * 4 + 1]! + 0.114 * data[i * 4 + 2]!;
        return out;
      };
      const ga = gray(ia);
      const gb = gray(ib);
      const C1 = (0.01 * 255) ** 2;
      const C2 = (0.03 * 255) ** 2;
      let sum = 0;
      let n = 0;
      for (let y0 = 0; y0 + 8 <= H; y0 += 8) {
        for (let x0 = 0; x0 + 8 <= W; x0 += 8) {
          let ma = 0, mb = 0;
          for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const i = (y0 + yy) * W + x0 + xx; ma += ga[i]!; mb += gb[i]!; }
          ma /= 64; mb /= 64;
          let va = 0, vb = 0, cov = 0;
          for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const i = (y0 + yy) * W + x0 + xx; const da = ga[i]! - ma; const db = gb[i]! - mb; va += da * da; vb += db * db; cov += da * db; }
          va /= 63; vb /= 63; cov /= 63;
          sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
          n++;
        }
      }
      return sum / n;
    },
    [`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`],
  );
  await page.close();
  return value;
}

async function sideBySide(browser: Browser, images: { label: string; png: Buffer }[], file: string) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
  const cells = images
    .map(({ label, png }) => `<figure style="margin:0;flex:1"><figcaption style="font:600 18px system-ui;padding:8px 0">${label}</figcaption><img style="width:100%;display:block;border:1px solid #ddd" src="data:image/png;base64,${png.toString("base64")}"></figure>`)
    .join("");
  await page.setContent(`<body style="margin:16px;background:#fff"><div style="display:flex;gap:16px;align-items:flex-start">${cells}</div></body>`);
  await page.screenshot({ fullPage: true, path: file });
  await page.close();
}

const jaccard = (a: Set<string>, b: Set<string>) => {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let both = 0;
  for (const x of a) if (b.has(x)) both++;
  return both / union.size;
};
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

it("variety between brands", async () => {
  await mkdir(OUT, { recursive: true });
  const savedPath = (id: string) => join(OUT, `${id}.json`);
  const saved: Saved[] = [];
  if (LIVE) {
    const client = new Anthropic({ apiKey: await apiKey(), maxRetries: 0, timeout: 90_000 });
    // Sequential: the second brand would not share the per-document cache anyway; the system prompt is shared.
    for (const brand of BRANDS) {
      const result = await generate(client, brand);
      await writeFile(savedPath(brand.id), JSON.stringify(result, null, 2));
      saved.push(result);
    }
  } else {
    for (const brand of BRANDS) saved.push(JSON.parse(await readFile(savedPath(brand.id), "utf8")) as Saved);
  }

  const kitCss = await readBundledCss();
  const browser = await chromium.launch();
  const rendered: Rendered[] = [];
  const shots: Record<string, { ai: Buffer; aiGray: Buffer; base: Buffer; baseGray: Buffer }> = {};
  for (const [i, brand] of BRANDS.entries()) {
    const r = await renderBrand(brand, saved[i]!, kitCss);
    rendered.push(r);
    for (const [name, html] of [["ai", r.ai.color], ["ai-gray", r.ai.gray], ["base", r.base.color], ["base-gray", r.base.gray]] as const) {
      await writeFile(join(OUT, `${brand.id}-${name}.html`), html);
    }
    shots[brand.id] = {
      ai: await shot(browser, r.ai.color, join(OUT, `${brand.id}-ai.png`)),
      aiGray: await shot(browser, r.ai.gray, join(OUT, `${brand.id}-ai-gray.png`)),
      base: await shot(browser, r.base.color, join(OUT, `${brand.id}-base.png`)),
      baseGray: await shot(browser, r.base.gray, join(OUT, `${brand.id}-base-gray.png`)),
    };
  }

  const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  const metrics = {
    axesDiffering: pairs.map(([a, b]) => Object.keys(saved[a]!.direction.axes).filter((k) => saved[a]!.direction.axes[k] !== saved[b]!.direction.axes[k]).length),
    structural: pairs.map(([a, b]) => {
      const ids = Object.keys(rendered[a]!.shingles).filter((id) => rendered[b]!.shingles[id]);
      return ids.length === 0 ? null : ids.reduce((sum, id) => sum + jaccard(rendered[a]!.shingles[id]!, rendered[b]!.shingles[id]!), 0) / ids.length;
    }),
    ssimAiGray: [] as number[],
    ssimBaseGray: [] as number[],
  };
  for (const [a, b] of pairs) {
    metrics.ssimAiGray.push(await ssim(browser, shots[BRANDS[a]!.id]!.aiGray, shots[BRANDS[b]!.id]!.aiGray));
    metrics.ssimBaseGray.push(await ssim(browser, shots[BRANDS[a]!.id]!.baseGray, shots[BRANDS[b]!.id]!.baseGray));
  }
  await sideBySide(browser, BRANDS.map((b) => ({ label: `${b.name} · IA`, png: shots[b.id]!.ai })), join(ROOT, "docs/design/assets/diseno-con-ia-spike-variedad.png"));
  await sideBySide(browser, BRANDS.map((b) => ({ label: `${b.name} · IA (gris)`, png: shots[b.id]!.aiGray })), join(ROOT, "docs/design/assets/diseno-con-ia-spike-variedad-gris.png"));
  await sideBySide(browser, BRANDS.map((b) => ({ label: `${b.name} · base`, png: shots[b.id]!.base })), join(ROOT, "docs/design/assets/diseno-con-ia-spike-base.png"));
  await browser.close();

  const summary = {
    model: MODEL,
    calls: saved.length * 2,
    costUsd: saved.reduce((sum, s) => sum + s.direction.costUsd + s.screen.costUsd, 0),
    screenSeconds: saved.map((s) => +(s.screen.ms / 1000).toFixed(1)),
    ttftSeconds: saved.map((s) => +(s.screen.ttftMs / 1000).toFixed(1)),
    directionSeconds: saved.map((s) => +(s.direction.ms / 1000).toFixed(1)),
    directions: saved.map((s) => ({ brand: s.brand, ...s.direction.axes, moves: s.direction.moves, rationale: s.direction.rationale })),
    failedBlocks: rendered.map((r) => r.failed),
    gateWarnings: rendered.map((r) => r.warnings),
    pairs: pairs.map(([a, b]) => `${BRANDS[a]!.id}-${BRANDS[b]!.id}`),
    ...metrics,
    medianSsimAiGray: median(metrics.ssimAiGray),
    medianSsimBaseGray: median(metrics.ssimBaseGray),
  };
  await writeFile(join(OUT, "metrics.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  expect(saved).toHaveLength(BRANDS.length);
});
