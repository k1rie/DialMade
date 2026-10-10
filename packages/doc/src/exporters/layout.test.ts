import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cloneJson } from "../json";
import { applyPatch } from "../patch";
import type { DesignDoc } from "../schema";
import { removeScreenOps } from "../screens";
import { acmeDoc, importedDoc, monoDoc, screensDoc } from "../testing/fixtures";
import { toDesignMd } from "./designMd";
import { toDTCGFull } from "./dtcg";
import { PROMPT_TARGETS, toPromptPack } from "./promptPack";
import { toThemeCss } from "./themeCss";

const golden = (name: string) => readFileSync(new URL(`./__golden__/${name}`, import.meta.url), "utf8");

function patched(doc: DesignDoc, ops: unknown[], allowLocked = false): DesignDoc {
  const result = applyPatch(doc, ops, { allowLocked });
  if (!result.ok) throw new Error(`${result.error.message} ${JSON.stringify(result.error.issues ?? [])}`);
  return result.doc;
}

/** The lines of a Markdown section: from its heading to the next heading of the same or a higher level. */
function section(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const level = heading.match(/^#+/)![0].length;
  let end = lines.length;
  let fenced = false;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith("```")) fenced = !fenced;
    const match = !fenced && /^(#+) /.exec(lines[i]!);
    if (match && match[1]!.length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function frontmatterKeys(md: string): string[] {
  const end = md.indexOf("\n---\n", 4);
  return md
    .slice(4, end)
    .split("\n")
    .filter((line) => /^[A-Za-z"]/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")));
}

/**
 * Legacy documents (no screens) export byte for byte what they exported before DesignDoc v2: the goldens
 * were captured from the v1 exporters, with `DesignDoc v1` → `v2` (and `docVersion` 1 → 2) as the only edit.
 * They are read as plain files on purpose, so `vitest -u` cannot rewrite them.
 */
describe("legacy documents export what they exported before v2", () => {
  it.each(["es", "en"] as const)("DESIGN.md (%s)", (locale) => {
    expect(toDesignMd(acmeDoc(), { locale })).toBe(golden(`legacy-acme.design.${locale}.md`));
  });

  it.each(PROMPT_TARGETS.flatMap((target) => (["es", "en"] as const).map((locale) => [target, locale] as const)))(
    "prompt pack %s (%s)",
    (target, locale) => {
      expect(toPromptPack(acmeDoc(), target, locale)).toBe(golden(`legacy-acme.prompt-${target}.${locale}.md`));
    },
  );

  it("the made-up focus page, imports, theme CSS and DTCG", () => {
    expect(toDesignMd(monoDoc())).toBe(golden("legacy-mono.design.md"));
    expect(toPromptPack(monoDoc(), "claude")).toBe(golden("legacy-mono.prompt-claude.md"));
    expect(toDesignMd(importedDoc())).toBe(golden("legacy-imported.design.md"));
    expect(toThemeCss(acmeDoc())).toBe(golden("legacy-acme.theme.css"));
    expect(`${JSON.stringify(toDTCGFull(acmeDoc()), null, 2)}\n`).toBe(golden("legacy-acme.tokens.json"));
    expect(`${JSON.stringify(toDTCGFull(importedDoc()), null, 2)}\n`).toBe(golden("legacy-imported.tokens.json"));
  });
});

describe("DESIGN.md with screens", () => {
  const doc = screensDoc();

  it.each(["es", "en"] as const)("matches the reviewed snapshot (%s)", async (locale) => {
    await expect(toDesignMd(doc, { locale })).toMatchFileSnapshot(`./__golden__/screens.design.${locale}.md`);
  });

  it("puts «Pantallas y flujo» inside «## Layout»: no new ## headings, same frontmatter keys", () => {
    for (const locale of ["es", "en"] as const) {
      const md = toDesignMd(doc, { locale });
      const legacy = toDesignMd(acmeDoc(), { locale });
      const h2 = (text: string) => text.split("\n").filter((line) => line.startsWith("## "));
      expect(h2(md)).toEqual(h2(legacy));
      expect(frontmatterKeys(md)).toEqual(frontmatterKeys(legacy));
      const layout = section(md, "## Layout");
      expect(layout).toContain(locale === "es" ? "### Pantallas y flujo" : "### Screens and flow");
      for (const heading of ["### Inicio (`/`)", "### Dashboard (`/dashboard`)", "### Ajustes (`/ajustes`)"]) expect(layout).toContain(heading);
    }
  });

  it("lists the screens, their routes and the flow", () => {
    const flow = section(toDesignMd(doc, { locale: "es" }), "### Pantallas y flujo");
    expect(flow).toContain("1. Inicio (`/`) · Web pública");
    expect(flow).toContain("2. Dashboard (`/dashboard`) · Pantalla de app · navegación: Lateral · con cabecera de página");
    expect(flow).toContain("3. Ajustes (`/ajustes`) · Pantalla de app · navegación: Lateral · sin cabecera de página");
    expect(flow).toContain("- Inicio → «Dashboard» (desde «Barra de navegación») · «Ajustes» (desde «Llamada»)");
    expect(flow).toContain("- Dashboard → «Ajustes» (desde «Tarjetas»)");
    expect(flow).toContain("- La navegación Lateral enlaza las pantallas de app: Dashboard, Ajustes.");
  });

  it("numbers the wireframe and the reading order alike", () => {
    const home = section(toDesignMd(doc, { locale: "es" }), "### Inicio (`/`)");
    const wireframe = home.slice(home.indexOf("```text"), home.indexOf("```", home.indexOf("```text") + 3));
    const boxes = [...wireframe.matchAll(/\| (\d+)\. ([^|\n]+?) *(?:×\d+)? *(?=\|)/g)].map((m) => `${m[1]}. ${m[2]!.trim()}`);
    const list = home
      .split("\n")
      .filter((line) => /^\d+\. /.test(line))
      .map((line) => line.slice(0, line.indexOf(" → ")));
    expect(boxes.sort()).toEqual(list.sort());
    expect(list).toEqual(["1. Barra de navegación", "2. Hero", "3. Captura", "4. Características", "5. Calendario", "6. Próximos", "7. Llamada"]);
  });

  it("writes type@variant, ×N, the quoted note, the link, absorbed blocks and hidden ones", () => {
    const home = section(toDesignMd(doc, { locale: "es" }), "### Inicio (`/`)");
    expect(home).toContain("1. Barra de navegación → `landing.navbar@simple` → enlaza a «Dashboard»");
    expect(home).toContain('2. Hero → `landing.hero@split` — nota: "con captura del producto"');
    expect(home).toContain("3. Captura → integrado en «Hero»");
    expect(home).toContain("4. Características → `landing.features` ×3");
    expect(home).toContain("5. Calendario → `ui.calendar@week` — nota: \"calendario 'semanal'\"");
    expect(home).toContain("7. Llamada → `landing.cta@banner` → enlaza a «Ajustes»");
    expect(home).toContain("Ocultos: «Pie».");
    expect(home).not.toMatch(/\d+\. Pie/);
  });

  it("writes the tablet and phone rules and the grid areas", () => {
    const md = toDesignMd(doc, { locale: "es" });
    const home = section(md, "### Inicio (`/`)");
    expect(home).toContain("- Tablet (8 columnas, menos de 64rem): «Calendario» y «Próximos» pasan a varias líneas.");
    expect(home).toMatch(/- Móvil \(4 columnas, menos de 40rem\): todo en una columna.*«Barra de navegación» → menú hamburguesa.*«Calendario» → agenda; ocultos: «Próximos»\./);
    const dash = section(md, "### Dashboard (`/dashboard`)");
    expect(dash).toContain("la navegación lateral pasa a rail");
    expect(dash).toContain("la navegación pasa a una barra superior");
    expect(dash).toContain('- Rejilla sin corte limpio: `grid-template-areas: "b-a b-a b-b b-b" "b-a b-a b-c b-d" "b-e b-f b-f b-d"`');
    expect(dash).toContain("b-a = 2. Gráfica");
    expect(section(md, "### Ajustes (`/ajustes`)")).not.toContain("grid-template-areas");
  });

  it("prints «Layout propio» for screens in «## Páginas» and skips structural regions", () => {
    const es = toDesignMd(doc, { locale: "es" });
    const pages = section(es, "## Páginas");
    expect(pages).toContain("### Inicio (Layout propio)");
    expect(pages).toContain("### Guía de estilo (`brand-board`)");
    expect(pages).not.toContain("ui.region");
    expect(pages).toContain("- Calendario (`ui.calendar`) — variant: \"week\" · title: \"Agenda\"");
    expect(pages).toContain("- Pie de página (`landing.footer`) — oculta");
    // Links inside list items are not copy (NON_COPY_KEY: linkTo, route, screen).
    expect(pages).toContain('links: "Producto"; "Panel"');
    expect(pages).toContain('items: "Plan"; "Equipo"');
    expect(pages).not.toContain("s-settings");
    expect(toDesignMd(doc, { locale: "en" })).toContain("### Inicio (Custom layout)");
    expect(es).toContain("- Páginas: Inicio, Dashboard, Ajustes, Guía de estilo");
    expect(es).toContain("Generado por Dialmade desde un DesignDoc v2.");
  });

  it("projects screen-page props through `visibleProps`, never legacy pages", () => {
    const seen: string[] = [];
    const visibleProps = (element: { type: string; props: Record<string, unknown> }) => {
      seen.push(element.type);
      const { items, ...rest } = element.props;
      return Array.isArray(items) ? { ...rest, items: items.slice(0, 1) } : rest;
    };
    const es = toDesignMd(doc, { locale: "es", visibleProps });
    const pages = section(es, "## Páginas");
    expect(pages).toContain('items: "Plan"');
    expect(pages).not.toContain('items: "Plan"; "Equipo"');
    // The style guide is not a screen page: it never goes through the hook.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some((type) => type.startsWith("brand."))).toBe(false);
    for (const target of PROMPT_TARGETS) {
      expect(toPromptPack(doc, target, "es", { visibleProps })).not.toContain('items: "Plan"; "Equipo"');
    }
    // Legacy documents export byte for byte the same with or without the hook.
    expect(toDesignMd(acmeDoc(), { locale: "es", visibleProps: () => ({}) })).toBe(golden("legacy-acme.design.es.md"));
  });

  it("keeps user text from breaking the Markdown (backticks are stripped)", () => {
    const evil = patched(doc, [
      { op: "replace", path: "/screens/s-home/name", value: "In`icio" },
      { op: "replace", path: "/screens/s-home/layout/blocks/b-hero/label", value: "```Hero" },
      { op: "replace", path: "/screens/s-home/layout/blocks/b-hero/note", value: "nota `con` código" },
    ]);
    const md = toDesignMd(evil, { locale: "es" });
    const home = section(md, "### Inicio (`/`)");
    expect(home).toContain("2. Hero → `landing.hero@split` — nota: \"nota con código\"");
    const fence = home.slice(home.indexOf("```text") + 7, home.indexOf("\n```\n"));
    expect(fence).not.toContain("`");
    expect(fence).toContain("2. Hero");
    expect(md).toContain("1. Inicio (`/`) · Web pública");
  });

  it("says when a screen has no blocks yet", () => {
    const empty = patched(doc, [
      ...removeScreenOps(doc, "s-settings"),
      { op: "replace", path: "/screens/s-dash/layout/blocks", value: {} },
      { op: "replace", path: "/screens/s-dash/page/elements", value: { root: { type: "app.page", props: {}, children: [] } } },
      { op: "remove", path: "/screens/s-home/layout/blocks/b-nav/linkTo" },
    ]);
    const md = toDesignMd(empty, { locale: "es" });
    expect(section(md, "### Dashboard (`/dashboard`)")).toContain("Sin bloques todavía.");
    expect(section(md, "### Pantallas y flujo")).toContain("- La navegación Lateral enlaza las pantallas de app: Dashboard.");
    const noLinks = patched(empty, [{ op: "replace", path: "/screens/s-dash/shell/nav", value: "none" }]);
    expect(section(toDesignMd(noLinks, { locale: "es" }), "### Pantallas y flujo")).toContain("Todavía no hay enlaces entre pantallas.");
  });

  it("is deterministic", () => {
    expect(toDesignMd(screensDoc())).toBe(toDesignMd(cloneJson(screensDoc())));
  });
});

describe("prompt packs with screens", () => {
  const doc = screensDoc();

  it.each([
    ["claude", "es"],
    ["claude", "en"],
    ["figma", "en"],
  ] as const)("matches the reviewed snapshot (%s, %s)", async (target, locale) => {
    await expect(toPromptPack(doc, target, locale)).toMatchFileSnapshot(`./__golden__/screens.prompt-${target}.${locale}.md`);
  });

  it.each(PROMPT_TARGETS.flatMap((target) => (["es", "en"] as const).map((locale) => [target, locale] as const)))(
    "%s (%s) carries the layout block, one route per screen and no made-up page",
    (target, locale) => {
      const text = toPromptPack(doc, target, locale);
      expect(text).toContain(locale === "es" ? "### Pantallas y flujo" : "### Screens and flow");
      expect(text).toContain("### Dashboard (`/dashboard`)");
      expect(text).toContain("```text");
      expect(text).toContain(locale === "es" ? "Una ruta por pantalla" : "One route per screen");
      expect(text).toContain(locale === "es" ? "**Inicio** (Layout propio)" : "**Inicio** (Custom layout)");
      // The brief's focus is "landing": a legacy doc would get a made-up landing page here.
      expect(text).not.toContain("(`minimal`)");
      expect(text).not.toContain("app.componentGallery");
      const steps = section(text, locale === "es" ? "## Pasos" : "## Steps").split("\n").filter((line) => /^\d+\. /.test(line));
      expect(steps.at(-2)).toMatch(/^\d+\. (Una|One) ruta|route per screen/);
    },
  );

  it("names the screens as the thing to build", () => {
    expect(toPromptPack(doc, "claude", "es")).toContain("Construye «Inicio, Dashboard y Ajustes» para Acme Cloud");
    expect(toPromptPack(doc, "claude", "en")).toContain("Build the Inicio, Dashboard and Ajustes screens for Acme Cloud");
  });

  it("puts the layout block before the pages outline", () => {
    const text = toPromptPack(doc, "cursor", "es");
    expect(text.indexOf("### Pantallas y flujo")).toBeLessThan(text.indexOf("### Páginas"));
    expect(text.indexOf("### Motion")).toBeGreaterThan(0);
    expect(text.indexOf("### Motion")).toBeLessThan(text.indexOf("### Pantallas y flujo"));
  });
});
