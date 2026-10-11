// «Diseño con IA» in the packs (spec §9, track D): the AI blocks go into each screen's page as sanitized static HTML
// with their compiled, scoped CSS and a provenance comment; nothing in the ZIP runs a script; HTML stored in a
// document is sanitized again (a hostile document exports its base design); `ai-theme.css` and the README explain
// how to reuse the blocks; «Copiar HTML/TSX» produce standalone text.
import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { exportThemeCss } from "@dialmade/ai-render";
import { compileAiCss } from "@dialmade/ai-render/css";
import { parseDesignDoc, resolveThemeInputs, type AiBlock, type DesignDoc } from "@dialmade/doc";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportDialog } from "@/i18n/export";
import { hasAiBlocks } from "./AiBlocksCard";
import { aiClassTokens, aiExportBlocks, blockHtmlText, blockTsxText, screenRoutes } from "./aiBlocks";
import { AI_FILES, buildClaudeDesignPack, buildCodePack, type PackInput } from "./exportPack";
import { screensFixture } from "./testing";

const KIT = { ui: ".dl-button{color:red}", sections: ".dl-landing{display:block}" };

const provenance = { kind: "generate", path: "free", model: "claude-haiku-5-5", createdAt: "2026-10-10T09:30:00.000Z", promptVersion: "ai-render/1", directionId: "d-1", seed: 7 } as const;
const aiBlock = (html: string, extra: Partial<AiBlock> = {}): AiBlock => ({
  html,
  active: true,
  basis: "abc",
  gates: { contrast: "ok", responsive: "ok", dropped: 0, warnings: [] },
  provenance,
  ...extra,
});

/** The first block of `type` on a screen of the fixture. */
const blockOf = (doc: DesignDoc, screenId: string, type: string) => Object.entries(doc.screens[screenId]!.layout.blocks).find(([, block]) => block.type === type)![0];

/** The screens fixture with AI blocks on Inicio: a hero (links to Precios), a CTA switched back to base, and a hostile one. */
function aiDoc(): DesignDoc {
  const { doc } = screensFixture(["s-home", "s-pricing", "s-login"]);
  const hero = blockOf(doc, "s-home", "hero");
  const cta = blockOf(doc, "s-home", "cta");
  const features = blockOf(doc, "s-home", "features");
  const pricing = blockOf(doc, "s-pricing", "pricing");
  const withAi = (screenId: string, blocks: Record<string, AiBlock>) => ({ ...doc.screens[screenId]!, aiRender: { version: 1 as const, blocks } });
  return parseDesignDoc({
    ...doc,
    screens: {
      ...doc.screens,
      "s-home": withAi("s-home", {
        [hero]: aiBlock(
          `<section class="@container bg-primary py-section" data-block-id="${hero}"><h1 class="font-heading text-display text-primary-foreground" data-dl-t="0">Cobra sin fricción</h1><a class="rounded-button bg-cta px-5 py-3 text-cta-foreground" href="#screen:s-pricing" data-dl-t="1">Ver precios</a><i class="size-4" data-icon="check" aria-hidden="true"></i><img class="w-full rounded-card" alt="Panel" data-placeholder="screenshot"></section>`,
        ),
        [cta]: aiBlock(`<section data-block-id="${cta}"><h2 data-dl-t="0">Inactivo</h2></section>`, { active: false }),
        // A tampered document: stored HTML the sanitizer never produced.
        [features]: aiBlock(`<section data-block-id="${features}"><script>alert(1)</script><img src=x onerror=alert(1)><p>Hostil</p></section>`),
      }),
      "s-pricing": withAi("s-pricing", {
        [pricing]: aiBlock(`<section class="grid gap-4 @md:grid-cols-3" data-block-id="${pricing}"><p class="text-h3" data-dl-t="0">Plan Pro <a href="javascript:alert(1)" onclick="x()">x</a></p></section>`),
      }),
    },
  });
}

async function input(doc: DesignDoc, withAi = true): Promise<PackInput> {
  const css = await compileAiCss(aiClassTokens(aiExportBlocks(doc)), { scoped: true });
  return {
    doc,
    inputs: resolveThemeInputs(doc),
    mode: "light",
    locale: "es",
    kindLabel: (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)!.label.es,
    texts: exportDialog.es.files,
    css: KIT,
    ...(withAi && { ai: { css, texts: exportDialog.es.aiExport.files } }),
  };
}

function unzip(bytes: Uint8Array): Record<string, string> {
  return Object.fromEntries(Object.entries(unzipSync(bytes)).map(([path, content]) => [path.split("/").slice(1).join("/"), strFromU8(content)]));
}

/** Anything in an exported file that could run: scripts, handlers, javascript: URLs, srcdoc. */
const RUNNABLE = [/<script\b/i, /\son[a-z]+\s*=/i, /javascript:/i, /srcdoc/i];

describe("AI blocks in the exports", () => {
  const doc = aiDoc();

  it("exports active blocks only, sanitized again, in screen and reading order", () => {
    const blocks = aiExportBlocks(doc);
    expect(blocks.map((block) => `${block.screenId}/${block.type}`)).toEqual(["s-home/hero", "s-pricing/pricing"]);
    expect(blocks[1]!.html).not.toMatch(/javascript:|onclick/);
    expect(hasAiBlocks(doc)).toBe(true);
    expect(hasAiBlocks(screensFixture(["s-home"]).doc)).toBe(false);
  });

  it("«Código»: the pages carry the AI HTML with its CSS, provenance and real links, and nothing runs", async () => {
    const pack = await input(doc);
    const files = unzip(buildCodePack(pack).bytes);
    expect(files[AI_FILES.css]).toBe(pack.ai!.css);
    expect(files[AI_FILES.theme]).toBe(exportThemeCss());
    const home = files["index.html"]!;
    expect(home).toContain("<div data-dl-ai-block=\"\"><!-- Dialmade «Diseño con IA»: claude-haiku-5-5 · 2026-10-10 -->");
    expect(home).toContain("Cobra sin fricción");
    expect(home).toContain('href="precios/index.html"');
    expect(home).toContain('<link rel="stylesheet" href="assets/dialmade-ai.css">');
    expect(home).toMatch(/<svg class="w-full rounded-card" aria-label="Panel" data-placeholder="screenshot"/);
    expect(home).not.toMatch(/data-dl-t="/);
    expect(home).not.toContain("Inactivo");
    expect(home).not.toContain("Hostil"); // the tampered block exports its base design
    const pricing = files["precios/index.html"]!;
    expect(pricing).toContain('<link rel="stylesheet" href="../assets/dialmade-ai.css">');
    expect(pricing).toContain("Plan Pro");
    for (const [path, text] of Object.entries(files)) {
      if (!path.endsWith(".html")) continue;
      for (const pattern of RUNNABLE) expect(text, `${path} ${pattern}`).not.toMatch(pattern);
    }
    expect(files["README.md"]).toContain("## Diseño con IA");
    expect(files["README.md"]).toContain("2 bloques los diseñó Claude");
    expect(files["DESIGN.md"]).toContain("## Diseño con IA");
    expect(files["prompts/claude.md"]).toContain("## HTML de referencia de los bloques de IA");
  });

  it("the CSS is scoped to the AI blocks and only has the vocabulary's utilities", async () => {
    const { ai } = await input(doc);
    expect(ai!.css).toContain(":where([data-dl-ai-block],[data-dl-ai-surface])");
    expect(ai!.css).toContain(".bg-primary");
    expect(ai!.css).not.toMatch(/url\(/);
  });

  it("«Claude Design»: the previews inline the AI CSS and the pack has ai-theme.css", async () => {
    const pack = await input(doc);
    const files = unzip(buildClaudeDesignPack(pack).bytes);
    expect(files["preview.html"]).toContain("Cobra sin fricción");
    expect(files["preview.html"]).toContain('href="preview-precios.html"');
    expect(files["preview.html"]).toContain(".bg-primary");
    expect(files[AI_FILES.theme]).toBe(exportThemeCss());
    expect(files["README.md"]).toContain("## Diseño con IA");
    for (const pattern of RUNNABLE) expect(files["preview.html"]).not.toMatch(pattern);
  });

  it("without the compiled AI CSS the blocks export as their base design", async () => {
    const files = unzip(buildCodePack(await input(doc, false)).bytes);
    expect(files[AI_FILES.css]).toBeUndefined();
    expect(files["index.html"]).not.toContain("data-dl-ai-block");
  });

  it("«Copiar HTML» and «Copiar TSX» are standalone and link to the app's routes", () => {
    const [hero] = aiExportBlocks(doc);
    const routes = screenRoutes(doc);
    const html = blockHtmlText(hero!, routes);
    expect(html.startsWith("<!-- Dialmade «Diseño con IA»")).toBe(true);
    expect(html).toContain('href="/precios"');
    expect(html).toContain("<svg");
    for (const pattern of RUNNABLE) expect(html).not.toMatch(pattern);
    const tsx = blockTsxText(hero!, routes);
    expect(tsx).toContain('import { Icon, Placeholder } from "./dialmade-assets";');
    expect(tsx).toContain('href="/precios"');
    expect(tsx).toMatch(/export function Hero[A-Z0-9][a-z0-9]{2}\(\)/);
  });
});

describe("the app frame's AI navigation in the exports", () => {
  it("the dashboard's page paints the AI sidebar in the frame's slot and keeps the base top bar", async () => {
    const { doc: base } = screensFixture(["s-home", "s-dashboard", "s-settings"]);
    const doc = parseDesignDoc({
      ...base,
      screens: {
        ...base.screens,
        "s-dashboard": {
          ...base.screens["s-dashboard"]!,
          aiRender: {
            version: 1 as const,
            blocks: {
              "shell-nav": aiBlock(
                '<aside class="@container bg-card p-4" data-block-id="shell-nav"><a class="text-foreground" href="#screen:s-settings" data-dl-t="0">Ajustes</a></aside>',
              ),
            },
          },
        },
      },
    });
    const blocks = aiExportBlocks(doc);
    expect(blocks.map((block) => [block.blockId, block.type, block.label])).toEqual([["shell-nav", "app-sidebar", "Barra lateral"]]);
    const files = unzip(buildCodePack(await input(doc)).bytes);
    const dashboard = files["app-dashboard/index.html"]!;
    expect(dashboard).toMatch(/<div class="dl-app-shell__ai-side" data-dl-ai-chrome="shell-nav"><div data-dl-ai-block=""><!-- Dialmade[^>]*--><aside/);
    expect(dashboard).toContain('href="../app-2/index.html">Ajustes</a>');
    expect(dashboard).not.toContain("dl-app-shell__sidebar-inner");
    expect(dashboard).toContain("dl-app-shell__topbar");
    for (const pattern of RUNNABLE) expect(dashboard).not.toMatch(pattern);
  });
});
