// @vitest-environment node
// «El ZIP exportado abre sin scripts y se ve igual que Ajustar» (track D): one AI block rendered twice in Chromium,
// (1) in the island, as Ajustar shows it (the preview runtime, the unscoped CSS of the app's worker, the theme
// variables), and (2) in a page exported by `renderStaticPage` with the kit CSS and the SCOPED AI CSS, opened with
// JavaScript off. Every element of the block must compute the same box and the same visual styles in both.
// `SAVE_SCREENSHOTS=1` also writes both captures to docs/design/assets/ (never committed).
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { exportBlockHtml, pinViewportUnits, sanitizeBlock } from "@dialmade/ai-render";
import { compileAiCss } from "@dialmade/ai-render/css";
import { addPage, compileThemeVars, createDesignDoc } from "@dialmade/doc";
import { renderStaticPage } from "@dialmade/sections";
import type { Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasChromium, islandMessages, postToIsland, startHarness, type Harness } from "./browserHarness";

/** A stylesheet with its relative `@import`s inlined (what the app's export does with the kit CSS). */
function inlineCss(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return "";
  seen.add(file);
  return readFileSync(file, "utf8").replace(/^@import\s+["']([^"']+)["'];\s*$/gm, (statement, target: string) =>
    target.startsWith(".") ? inlineCss(resolve(dirname(file), target), seen) : statement,
  );
}

const ROOT = join(import.meta.dirname, "../../..");
const RAW = `<section data-block-id="b-hero" class="@container bg-linear-to-r from-primary to-primary-hover py-section">
<div class="mx-auto grid max-w-container gap-8 px-6 @3xl:grid-cols-12">
<div class="flex flex-col gap-5 @3xl:col-span-7">
<span class="inline-flex w-fit items-center gap-2 rounded-badge bg-primary-foreground/15 px-3 py-1 text-caption text-primary-foreground"><i data-icon="sparkle" aria-hidden="true" class="size-4"></i>Nuevo</span>
<h1 class="font-heading text-display font-bold leading-tight tracking-tight text-primary-foreground">Reserva tu corte en dos toques</h1>
<p class="text-body text-primary-foreground/90">Agenda, clientes y cobros de tu barbería en un solo sitio.</p>
<div class="flex flex-wrap gap-3"><a href="#" class="rounded-button bg-cta px-5 py-3 font-semibold text-cta-foreground shadow-button hover:bg-cta-hover">Empieza gratis</a><a href="#" class="rounded-button border border-primary-foreground/40 px-5 py-3 text-primary-foreground">Ver demo</a></div>
<ul class="grid gap-2 @md:grid-cols-3"><li class="rounded-card bg-card p-4 text-card-foreground shadow-card"><strong class="text-h3">24/7</strong><p class="text-small text-muted-foreground">Reservas</p></li><li class="rounded-card bg-card p-4 text-card-foreground shadow-card"><strong class="text-h3">0 €</strong><p class="text-small text-muted-foreground">Comisión</p></li><li class="rounded-card bg-card p-4 text-card-foreground shadow-card"><strong class="text-h3">2 min</strong><p class="text-small text-muted-foreground">Alta</p></li></ul>
</div>
<div class="@3xl:col-span-5"><img data-placeholder="screenshot" alt="Agenda semanal" class="w-full rounded-card border border-border shadow-lg"></div>
</div></section>`;

/** Computed styles that make up how an element looks, for every element of the block (document order). */
const STYLE_PROPS = [
  "display", "width", "height", "color", "backgroundColor", "backgroundImage", "fontFamily", "fontSize", "fontWeight",
  "lineHeight", "letterSpacing", "textAlign", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop",
  "marginBottom", "borderTopWidth", "borderTopColor", "borderTopLeftRadius", "boxShadow", "gridTemplateColumns", "gap",
] as const;

async function styles(page: Page | import("playwright").Frame, selector: string) {
  return page.evaluate(
    ({ selector, props }) => {
      const root = document.querySelector(selector)!;
      return [root, ...Array.from(root.querySelectorAll("*"))].map((element) => {
        const style = getComputedStyle(element);
        return `${element.localName} ${props.map((prop) => `${prop}=${style[prop as keyof CSSStyleDeclaration] as string}`).join(" ")}`;
      });
    },
    { selector, props: [...STYLE_PROPS] },
  );
}

describe.skipIf(!hasChromium)("export ↔ Ajustar parity (a real browser)", () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.close();
  });

  it("the exported page needs no script and paints the block exactly as the island", async () => {
    const doc = addPage(createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e", secondary: "#f59e0b" } }, brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" } }), "landing");
    const page = doc.pages.landing!;
    const heroId = page.elements[page.root]!.children.find((id) => page.elements[id]!.type === "landing.hero")!;
    const sanitized = sanitizeBlock(RAW, { blockId: "b-hero", screenIds: [] });
    if (!sanitized.ok) throw new Error(sanitized.failure);
    const classes = [...sanitized.html.matchAll(/class="([^"]*)"/g)].flatMap((match) => match[1]!.split(" "));
    const vars = compileThemeVars(doc, { mode: "light" });

    // (1) Exported: kit CSS + scoped AI CSS, JavaScript off.
    const html = renderStaticPage(doc, "landing", vars, {
      fonts: false,
      css: [inlineCss(join(ROOT, "packages/ui/src/styles.css")), inlineCss(join(ROOT, "packages/sections/src/styles.css")), await compileAiCss(classes, { scoped: true })],
      aiBlocks: { [heroId]: exportBlockHtml(sanitized.html) },
    });
    expect(html).not.toMatch(/<script\b|\son[a-z]+=/i);
    const context = await harness.browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const exported = await context.newPage();
    await exported.setContent(html);
    const box = (await exported.locator("[data-dl-ai-block] > section").boundingBox())!;
    expect(box.width).toBeGreaterThan(600);

    // (2) The island at the same width, with the CSS the app's worker compiles (unscoped) and the same variables, their
    // `vw` pinned to the page's viewport as AiIsland does.
    const { page: app, island } = harness;
    await app.evaluate((width) => (document.getElementById("island")!.style.width = `${width + 48}px`), box.width);
    await postToIsland(app, { type: "render", v: 1, blockId: "b-hero", html: sanitized.html, css: await compileAiCss(classes), vars: pinViewportUnits(vars, 1280), mode: "light", fontsHref: null, editable: false, lang: "es" });
    await app.waitForFunction(() => (window as unknown as { messages: { type: string; blockId?: string }[] }).messages.some((m) => m.type === "size" && m.blockId === "b-hero"));
    expect((await islandMessages(app)).some((m) => m.type === "error")).toBe(false);

    const inExport = await styles(exported, "[data-dl-ai-block] > section");
    const inIsland = await styles(island, "#dl-island > section");
    expect(inExport.length).toBeGreaterThan(20);
    expect(inExport).toEqual(inIsland);

    if (process.env.SAVE_SCREENSHOTS) {
      const assets = join(ROOT, "docs/design/assets");
      mkdirSync(assets, { recursive: true });
      await exported.locator("[data-dl-ai-block] > section").screenshot({ path: join(assets, "diseno-con-ia-paridad-export.png") });
      await island.locator("#dl-island > section").screenshot({ path: join(assets, "diseno-con-ia-paridad-isla.png") });
    }
    await context.close();
  }, 60_000);
});
