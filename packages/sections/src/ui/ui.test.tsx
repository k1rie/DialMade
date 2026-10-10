import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { productTypes, type Locale } from "@dialmade/catalog";
import { LIBRARY, getBlockDef, type LibraryBlockType, type ScreenKind } from "@dialmade/layout";
import type { Page } from "@dialmade/doc";
import { contentContextFromDoc, resolveProductType } from "../context";
import { PageRenderer } from "../PageRenderer";
import { resolveSectionProps, storedDefaultProps } from "../props";
import { sectionRegistry, validateSections } from "../registry";
import { renderStaticPage } from "../renderToHtml";
import { acmeDoc } from "../testing/fixtures";
import { renderSection } from "../testing/renderSection";
import type { AnySectionDefinition, ContentContext } from "../types";
import { a11yBasics, idsAreUnique } from "./testing/a11y";
import { SIZE_GRID, fitInputFor } from "./testing/fitInput";
import { regionFrame, uiSections } from ".";

const TYPES = ["ui.text", "ui.media", "ui.cards", "ui.calendar", "ui.list", "ui.form", "ui.placeholder", "ui.region"];
const LOCALES: Locale[] = ["es", "en"];
const KINDS: ScreenKind[] = ["landing", "app"];
const NOTES = [undefined, "calendario semanal", "login ×4", "formulario de contacto", "buscador mensual", "carrusel de 5", "agenda diaria"];
/** Fewer notes for the heaviest sweep (every size × both kinds × every block type). */
const GRID_NOTES = [undefined, "login ×4", "carrusel semanal"];
/** The sweeps run thousands of fits and schema parses: generous under a loaded parallel run. */
const SWEEP_TIMEOUT = 60_000;

/** Library block types of each ui section (`LIBRARY[].sectionType`). */
const BLOCKS_OF = new Map<string, LibraryBlockType[]>();
for (const def of LIBRARY) BLOCKS_OF.set(def.sectionType, [...(BLOCKS_OF.get(def.sectionType) ?? []), def.type]);

const ctxFor = (productType: string, locale: Locale, seed = 11): ContentContext => ({
  brand: { name: "Nimbo" },
  productType: resolveProductType(productType),
  locale,
  seed,
});

describe("secciones ui.*", () => {
  it("registra las 8, válidas, en el registro central y con su contrato de layout", () => {
    expect(uiSections.map((def) => def.type)).toEqual(TYPES);
    expect(validateSections(uiSections)).toEqual([]);
    for (const def of uiSections) {
      expect(sectionRegistry.get(def.type)).toBe(def);
      expect(def.kind).toBe("app");
      expect(def.layout, def.type).toBeTruthy();
      const keys = Object.keys(def.defaultProps(ctxFor("saas-general", "es")));
      for (const key of def.layout!.owns) expect(keys, `${def.type}: owns ${key}`).toContain(key);
    }
    expect(sectionRegistry.get("ui.region")?.container).toBe(true);
    expect(uiSections.filter((def) => def.container).map((def) => def.type)).toEqual(["ui.region"]);
  });

  it("cada bloque «ready» de la librería con sección ui.* apunta a una registrada", () => {
    for (const def of LIBRARY) {
      if (def.sectionType.startsWith("ui.")) expect(sectionRegistry.get(def.sectionType), def.type).toBeTruthy();
    }
  });

  it("defaultProps válidas y JSON para los 192 tipos de producto (y «generic») en es y en", () => {
    for (const id of [...productTypes.map((type) => type.id), "generic"]) {
      for (const locale of LOCALES) {
        const ctx = ctxFor(id, locale);
        for (const def of uiSections) {
          const props = def.defaultProps(ctx);
          const parsed = def.schema.safeParse(props);
          expect(parsed.success, `${def.type} · ${id} · ${locale}: ${parsed.error?.message}`).toBe(true);
          expect(JSON.parse(JSON.stringify(props))).toEqual(props);
          expect(JSON.stringify(props), `${def.type} · ${id}: sin «€»`).not.toContain("€");
        }
      }
    }
  }, SWEEP_TIMEOUT);

  it("el copy es determinista por semilla y cambia con la semilla del bloque", () => {
    for (const def of uiSections) expect(def.defaultProps(ctxFor("e-commerce", "es", 7))).toEqual(def.defaultProps(ctxFor("e-commerce", "es", 7)));
    const differs = (type: string) =>
      [1, 2, 3, 4, 5, 6].some(
        (seed) => JSON.stringify(sectionRegistry.get(type)!.defaultProps(ctxFor("saas-general", "en", seed))) !==
          JSON.stringify(sectionRegistry.get(type)!.defaultProps(ctxFor("saas-general", "en", 100))),
      );
    for (const type of ["ui.text", "ui.cards", "ui.list", "ui.calendar", "ui.form"]) expect(differs(type), type).toBe(true);
  });
});

describe("fit()", () => {
  const sections = uiSections.map((def) => ({ def, blocks: BLOCKS_OF.get(def.type) ?? [] }));

  it("cada sección ui.* tiene al menos un bloque de la librería", () => {
    for (const { def, blocks } of sections) expect(blocks.length, def.type).toBeGreaterThan(0);
  });

  it("en toda la rejilla (w 1–12 × h 4–80) da variantes y props válidas, solo con claves propias", () => {
    for (const { def, blocks } of sections) {
      const defaults = def.defaultProps(ctxFor("saas-general", "es"));
      const variants = new Set(def.variants.map((variant) => variant.id));
      const owns = new Set<string>(def.layout!.owns);
      for (const type of blocks) {
        for (const kind of KINDS) {
          for (const note of GRID_NOTES) {
            for (const [w, h] of SIZE_GRID) {
              const result = def.layout!.fit(fitInputFor(type, w, h, { kind, ...(note !== undefined && { note }) }));
              const at = `${def.type} ← ${type} ${w}×${h} ${kind} «${note ?? ""}»`;
              if (result.variant !== undefined) expect(variants.has(result.variant), `${at}: ${result.variant}`).toBe(true);
              for (const key of Object.keys(result.props ?? {})) expect(owns.has(key), `${at}: ${key} fuera de owns`).toBe(true);
              const parsed = def.schema.safeParse({ ...defaults, ...result.props });
              if (!parsed.success) expect.fail(`${at}: ${parsed.error.message}`);
              expect(JSON.parse(JSON.stringify(result))).toEqual(result);
            }
          }
        }
      }
    }
  }, SWEEP_TIMEOUT);

  it("es determinista y no depende de que se pase la estimación (mismas fórmulas que estimateContent)", () => {
    // ui.placeholder is left out: without the block type, a «Pronto» block's default ×N cannot be known.
    for (const { def, blocks } of sections.filter(({ def }) => def.type !== "ui.placeholder")) {
      for (const type of blocks) {
        for (const note of NOTES) {
          for (const [w, h] of SIZE_GRID) {
            const options = { kind: "app" as const, ...(note !== undefined && { note }) };
            const a = def.layout!.fit(fitInputFor(type, w, h, options));
            expect(def.layout!.fit(fitInputFor(type, w, h, options))).toEqual(a);
            expect(def.layout!.fit(fitInputFor(type, w, h, { ...options, estimate: null })), `${type} ${w}×${h} «${note}»`).toEqual(a);
          }
        }
      }
    }
  }, SWEEP_TIMEOUT);

  it("cumple lo que promete el chip del lienzo (estimateContent) para cada bloque «ready»", () => {
    const fitOf = (type: LibraryBlockType, w: number, h: number, note?: string) => {
      const def = sectionRegistry.get(getBlockDef(type).sectionType)!;
      const input = fitInputFor(type, w, h, note === undefined ? {} : { note });
      return { input, result: def.layout!.fit(input) as { variant?: string; props?: Record<string, unknown> } };
    };
    for (const note of NOTES) {
      for (const [w, h] of SIZE_GRID) {
        const cards = fitOf("cards", w, h, note);
        expect(cards.result.props?.count).toBe(cards.input.estimate?.kind === "count" ? cards.input.estimate.value : NaN);
        const list = fitOf("list", w, h, note);
        expect(list.result.props?.count).toBe(list.input.estimate?.kind === "count" ? list.input.estimate.value : NaN);
        const calendar = fitOf("calendar", w, h, note);
        expect(calendar.result.variant).toBe(calendar.input.estimate?.kind === "variant" ? calendar.input.estimate.value : "");
        const media = fitOf("media", w, h, note);
        expect(media.result.props?.ratio).toBe(media.input.estimate?.kind === "ratio" ? media.input.estimate.value : "");
        const form = fitOf("form", w, h, note);
        expect(form.result.props?.count).toBe(form.input.estimate?.kind === "count" ? form.input.estimate.value : NaN);
        const keywords = form.input.note.keywords;
        const purpose = ["login", "signup", "contact", "search"].find((keyword) => keywords.includes(keyword as never)) ?? "generic";
        expect(form.result.props?.purpose).toBe(purpose);
        expect(fitOf("text", w, h, note).input.estimate).toBeNull();
      }
    }
    // The chip says «mini» at ≤3 columns: the calendar has that variant.
    expect(fitOf("calendar", 3, 40).result.variant).toBe("mini");
  }, SWEEP_TIMEOUT);
});

describe("render", () => {
  it("cada variante de cada sección en es y en: ids únicos, etiquetas y nombres accesibles", () => {
    for (const def of uiSections) {
      for (const variant of def.variants) {
        for (const locale of LOCALES) {
          const { container, unmount } = renderSection(def, { variant: variant.id, locale, productType: "e-commerce", elementId: "b-abc123" });
          const root = container.firstElementChild as HTMLElement | null;
          if (def.type !== "ui.region") expect(root?.getAttribute("data-variant"), `${def.type}@${variant.id}`).toBe(variant.id);
          idsAreUnique(container);
          a11yBasics(container);
          expect(container.textContent ?? "").not.toContain("€");
          unmount();
        }
      }
    }
  }, SWEEP_TIMEOUT);

  it("las props guardadas sobreviven a JSON y renderizan igual", () => {
    for (const def of uiSections) {
      const content = contentContextFromDoc(acmeDoc());
      const stored = JSON.parse(JSON.stringify(storedDefaultProps(def, content))) as Record<string, unknown>;
      const resolved = resolveSectionProps(def, stored, content);
      expect(resolved.invalidKeys, def.type).toEqual([]);
      const a = renderSection(def, { props: stored, locale: "en" }).container.innerHTML;
      const b = renderSection(def, { props: storedDefaultProps(def, content), locale: "en" }).container.innerHTML;
      expect(a).toBe(b);
    }
  });
});

describe("ui.region: marco del elemento", () => {
  it("scope e inferred son estructurales; el «Contenedor» se selecciona", () => {
    const frame = regionFrame;
    expect(frame.structural?.({ role: "scope" })).toBe(true);
    expect(frame.structural?.({ role: "inferred" })).toBe(true);
    expect(frame.structural?.({ role: "group" })).toBe(false);
    expect(frame.structural?.({})).toBe(false);
    expect(frame.attributes?.({ role: "inferred", layout: "row" })).toEqual({ "data-dl-region": "inferred", "data-dl-layout": "row" });
    expect(frame.attributes?.({ role: "group", variant: "card", padding: "md" })).toEqual({
      "data-dl-region": "group",
      "data-dl-surface": "card",
      "data-dl-padding": "md",
    });
    expect(frame.attributes?.({ role: "group", variant: "nope", padding: 3 })).toEqual({
      "data-dl-region": "group",
      "data-dl-surface": "plain",
      "data-dl-padding": "none",
    });
    expect(sectionRegistry.get("ui.region")?.frame).toBe(regionFrame);
  });
});

/** A screen-like page: root → scope (`.dl-layout`) → an inferred row → every leaf ui block, plus a group. */
function layoutPage(kind: ScreenKind): Page {
  const content = contentContextFromDoc(acmeDoc());
  const leaves = uiSections.filter((def) => !def.container);
  const elements: Page["elements"] = {
    root: { type: `${kind}.page`, props: {}, children: ["layout"] },
    layout: { type: "ui.region", props: { ...storedDefaultProps(sectionRegistry.get("ui.region")!, content), role: "scope", screenKind: kind }, children: ["r-row001", "b-group1"] },
    "r-row001": {
      type: "ui.region",
      props: { ...storedDefaultProps(sectionRegistry.get("ui.region")!, content), role: "inferred", layout: "row" },
      children: leaves.map((_, i) => `b-leaf0${i}`),
    },
    "b-group1": {
      type: "ui.region",
      props: { ...storedDefaultProps(sectionRegistry.get("ui.region")!, content), variant: "card", padding: "md" },
      children: ["b-inner1"],
    },
    "b-inner1": { type: "ui.text", props: storedDefaultProps(sectionRegistry.get("ui.text")!, content), children: [] },
  };
  leaves.forEach((def, i) => {
    elements[`b-leaf0${i}`] = { type: def.type, props: storedDefaultProps(def, content), children: [] };
  });
  return { kind, layoutId: "custom", root: "root", elements };
}

describe("en una página de layout (landing y app)", () => {
  for (const kind of KINDS) {
    it(`${kind}: .dl-layout con data-dl-kind y los hijos de cada región como hijos directos de su wrapper`, () => {
      const doc = acmeDoc();
      const { container } = render(<PageRenderer doc={doc} kind={kind} page={layoutPage(kind)} />);
      const scope = container.querySelector(".dl-layout");
      expect(scope?.getAttribute("data-dl-kind")).toBe(kind);
      expect(scope?.parentElement?.getAttribute("data-dl-id")).toBe("layout");
      expect([...(scope?.children ?? [])].map((el) => el.getAttribute("data-dl-id"))).toEqual(["r-row001", "b-group1"]);
      const row = container.querySelector('[data-dl-id="r-row001"]')!;
      expect([...row.children].map((el) => el.getAttribute("data-dl-type"))).toEqual(uiSections.filter((def) => !def.container).map((def) => def.type));
      const group = container.querySelector('[data-dl-id="b-group1"]')!;
      expect([...group.children].map((el) => el.getAttribute("data-dl-id"))).toEqual(["b-inner1"]);
      expect(container.querySelector(".dl-section-notice")).toBeNull();
      idsAreUnique(container);
      a11yBasics(container);
    });

    it(`${kind}: HTML estático sin secciones fallidas`, () => {
      const errors: string[] = [];
      const html = renderStaticPage(acmeDoc(), kind, {}, { page: layoutPage(kind), onSectionError: (id) => errors.push(id) });
      expect(errors).toEqual([]);
      expect(html).toContain('class="dl-layout"');
      expect(html).not.toContain("€");
    });
  }

  it("modo edición: el «Votar en GitHub» solo sale en el editor", () => {
    const content = contentContextFromDoc(acmeDoc());
    const props = { ...storedDefaultProps(sectionRegistry.get("ui.placeholder")!, content), blockType: "kanban", soon: true, blockLabel: "Kanban" };
    const page: Page = {
      kind: "app",
      layoutId: "custom",
      root: "root",
      elements: { root: { type: "app.page", props: {}, children: ["b-soon01"] }, "b-soon01": { type: "ui.placeholder", props, children: [] } },
    };
    const vote = (interactive: boolean) => {
      const { container, unmount } = render(<PageRenderer doc={acmeDoc()} kind="app" page={page} interactive={interactive} />);
      const link = container.querySelector('a[href="https://github.com/k1rie/DialMade/issues"]');
      const out = link ? { rel: link.getAttribute("rel"), target: link.getAttribute("target") } : null;
      unmount();
      return out;
    };
    expect(vote(true)).toEqual({ rel: "noopener noreferrer", target: "_blank" });
    expect(vote(false)).toBeNull();
  });
});

describe("enlaces entre pantallas", () => {
  it("las acciones usan ctx.blockLink y marcan data-dl-screen-link; sin enlace, #", () => {
    const doc = acmeDoc();
    const content = contentContextFromDoc(doc);
    const def = sectionRegistry.get("ui.list")! as AnySectionDefinition;
    const resolved = resolveSectionProps(def, storedDefaultProps(def, content), content);
    const Section = def.Component;
    const linked = render(
      <Section
        {...resolved.props}
        variant={resolved.variant}
        elementId="b-list01"
        ctx={{ ...content, mode: "light", interactive: false, blockLink: () => "pricing.html", linkTarget: () => "s-pricing" }}
      />,
    );
    const link = linked.container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("pricing.html");
    expect(link.getAttribute("data-dl-screen-link")).toBe("s-pricing");
    linked.unmount();
    const plain = render(<Section {...resolved.props} variant={resolved.variant} elementId="b-list01" ctx={{ ...content, mode: "light", interactive: false }} />);
    expect(plain.container.querySelector("a")?.getAttribute("href")).toBe("#");
    expect(plain.container.querySelector("a")?.hasAttribute("data-dl-screen-link")).toBe(false);
  });
});

describe("heading level of ui.* titles (review B #39)", () => {
  it("form, list, cards and calendar render their title at the given level: h2 by default, h1 when the build promotes it", () => {
    for (const type of ["ui.form", "ui.list", "ui.cards", "ui.calendar"]) {
      const def = sectionRegistry.get(type)!;
      for (const [level, tag] of [[undefined, "H2"], ["h2", "H2"], ["h1", "H1"]] as const) {
        const view = renderSection(def, { props: { title: "Título", ...(level && { level }) }, elementId: "blk" });
        expect(view.invalidKeys, type).toEqual([]);
        expect(view.container.querySelector("#blk-title")?.tagName, `${type} ${level}`).toBe(tag);
        view.unmount();
      }
    }
  });
});
