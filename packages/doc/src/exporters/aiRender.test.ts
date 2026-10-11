// «Diseño con IA» in DESIGN.md and the prompt packs (spec §9): the direction and the AI blocks per screen, the
// reference HTML for coding agents (≤ 60 KB), and nothing at all for documents without AI (the other goldens).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AiBlock, AiDirection } from "../aiRender";
import { parseDesignDoc } from "../doc";
import type { DesignDoc } from "../schema";
import { screensDoc } from "../testing/fixtures";
import { MAX_AI_HTML_PER_PACK, aiBlockSummary, aiDesignLines, aiReferenceLines, hasAiDesign } from "./aiRender";
import { toDesignMd } from "./designMd";
import { toPromptPack } from "./promptPack";

const golden = (name: string, actual: string) => {
  const url = new URL(`./__golden__/${name}`, import.meta.url);
  if (process.env.UPDATE_GOLDEN || !existsSync(url)) writeFileSync(url, actual);
  expect(actual).toBe(readFileSync(url, "utf8"));
};

const provenance = { kind: "generate", path: "free", model: "claude-haiku-5-5", createdAt: "2026-10-10T09:30:00.000Z", promptVersion: "ai-render/1", directionId: "d-1", seed: 7 } as const;

const direction: AiDirection = {
  id: "d-1",
  version: 1,
  seed: 1234,
  chip: "editorial",
  axes: { composition: "editorial", typeVoice: "humanist", decoration: "rules-and-grids", imagery: "framed-screens", colorStrategy: "neutral-with-pops", rhythm: "airy" },
  moves: ["Títulos alineados a la izquierda con regla fina", "Cards con borde y sin sombra"],
  rationale: "Una voz editorial y sobria:\nel producto se lee como una revista técnica.",
  provenance: { ...provenance, kind: "direction" },
};

const block = (html: string, extra: Partial<AiBlock> = {}): AiBlock => ({
  html,
  active: true,
  basis: "abc",
  gates: { contrast: "ok", responsive: "ok", dropped: 0, warnings: [] },
  provenance,
  ...extra,
});

/** Acme's screens with a direction and AI blocks on Inicio (one switched back to base). */
export function aiScreensDoc(): DesignDoc {
  const doc = screensDoc();
  const home = doc.screens["s-home"]!;
  return parseDesignDoc({
    ...doc,
    aiRender: { version: 1, direction },
    screens: {
      ...doc.screens,
      "s-home": {
        ...home,
        aiRender: {
          version: 1,
          blocks: {
            "b-hero": block('<section class="@container bg-background py-section" data-block-id="b-hero"><h1 class="text-display" data-dl-t="0">Lanza más <em>rápido</em> &amp; mejor</h1><p data-dl-t="1">Despliega en segundos</p><a class="rounded-button bg-cta" href="#screen:s-dash" data-dl-t="2">Empieza</a></section>'),
            "b-feat": block('<section class="@container grid gap-6" data-block-id="b-feat"><p class="text-body" data-dl-t="0">Sin título, con ```backticks``` dentro</p></section>'),
            "b-cta": block('<section data-block-id="b-cta"><h2 data-dl-t="0">Ya no se usa</h2></section>', { active: false }),
          },
        },
      },
    },
  });
}

describe("«Diseño con IA» in the exports", () => {
  const doc = aiScreensDoc();

  it("DESIGN.md carries the direction and the AI blocks per screen (golden, es and en)", () => {
    for (const locale of ["es", "en"] as const) golden(`ai-screens.design.${locale}.md`, toDesignMd(doc, { locale }));
    const md = toDesignMd(doc, { locale: "es" });
    expect(md).toContain("## Diseño con IA");
    expect(md).toContain("| composition | editorial |");
    expect(md).toContain("- Títulos alineados a la izquierda con regla fina");
    expect(md).toContain("Por qué: Una voz editorial y sobria: el producto se lee como una revista técnica.");
    expect(md).toContain("- Hero (`hero`): «Lanza más rápido & mejor» · claude-haiku-5-5 · 2026-10-10");
    expect(md).toContain("- Llamada (`cta`): diseño base");
    expect(md.indexOf("## Diseño con IA")).toBeLessThan(md.indexOf("## Do's and Don'ts"));
  });

  it("coding agents get the reference HTML without edit handles, in a fence that holds", () => {
    golden("ai-screens.prompt-claude.en.md", toPromptPack(doc, "claude", "en"));
    const claude = toPromptPack(doc, "claude", "en");
    expect(claude).toContain("## Reference HTML of the AI blocks");
    expect(claude).toContain('<a class="rounded-button bg-cta" href="#screen:s-dash">Empieza</a>');
    expect(claude).not.toContain("data-dl-t");
    expect(claude).toContain("````html");
    expect(claude).not.toContain("Ya no se usa");
    for (const target of ["claude-design", "v0", "cursor"] as const) expect(toPromptPack(doc, target, "es")).toContain("## HTML de referencia de los bloques de IA");
    // Figma and Framer build in their own tools: the direction, not the HTML.
    for (const target of ["figma", "framer"] as const) {
      const text = toPromptPack(doc, target, "es");
      expect(text).toContain("## Diseño con IA");
      expect(text).not.toContain("## HTML de referencia");
    }
  });

  it("caps the reference HTML at 60 KB per pack, counting what is left", () => {
    expect(MAX_AI_HTML_PER_PACK).toBe(61_440);
    const lines = aiReferenceLines(doc, "es", 300);
    expect(lines.filter((l) => l.startsWith("### "))).toHaveLength(1);
    expect(lines.at(-2)).toBe("1 bloque(s) más no caben en el tope de 60 KB de este pack: están en el ZIP de código.");
  });

  it("one line per block: the first heading, else the first text", () => {
    expect(aiBlockSummary('<section><p>Intro</p><h2 class="x">Precios <strong>claros</strong></h2></section>')).toBe("Precios claros");
    expect(aiBlockSummary("<section><p>Solo &lt;texto&gt;</p></section>")).toBe("Solo <texto>");
    expect(aiBlockSummary(`<section><p>${"a".repeat(200)}</p></section>`)).toHaveLength(90);
  });

  it("documents without AI export nothing new", () => {
    const plain = screensDoc();
    expect(hasAiDesign(plain)).toBe(false);
    expect(aiDesignLines(plain, "es")).toEqual([]);
    expect(aiReferenceLines(plain, "es")).toEqual([]);
    expect(toDesignMd(plain, { locale: "es" })).not.toContain("Diseño con IA");
  });
});

describe("context and concept in DESIGN.md", () => {
  const withDirection = (extra: Partial<AiDirection>): DesignDoc => {
    const base = aiScreensDoc();
    return parseDesignDoc({ ...base, aiRender: { ...base.aiRender!, direction: { ...direction, ...extra } } });
  };

  it("lists what the developer said, field by field, and the model's concept", () => {
    const doc = withDirection({
      context: { audience: "Dueños de barberías", goal: "Reservar una demo", facts: "Desde 19 USD al mes" },
      concept: "Una agenda que se siente como una libreta de barbero.",
    });
    const out = aiDesignLines(doc, "es").join("\n");
    expect(out).toContain("Contexto del producto:");
    expect(out).toContain("- Para quién: Dueños de barberías");
    expect(out).toContain("- Qué debe provocar: Reservar una demo");
    expect(out).toContain("- Datos reales: Desde 19 USD al mes");
    expect(out).not.toContain("Tono:");
    expect(out).toContain("Concepto: Una agenda que se siente como una libreta de barbero.");
  });

  it("says nothing when there is no context", () => {
    const out = aiDesignLines(aiScreensDoc(), "en").join("\n");
    expect(out).not.toContain("Product context");
    expect(out).not.toContain("Concept:");
  });
});
