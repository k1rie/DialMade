import { createDesignDoc, safeParseDesignDoc, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type LayoutDoc, type ScreenTemplateId } from "@dialmade/layout";
import { mulberry32, realisticLayout } from "@dialmade/layout/testing";
import { describe, expect, it } from "vitest";
import { MAX_COPY_BODY_BYTES } from "@/lib/ai/api";
import { collectCopyFields, collectScreenCopyFields, type ScreenCopyTarget } from "@/lib/ai/fields";
import { buildCopyUserMessage } from "@/lib/ai/prompt";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import { aiRequestDoc } from "./useAiCopy";

/*
 * Review B #21: the hosted request carried the whole document, so a 4×200 project hit the route's 1 MB limit
 * (413) even for one section. `aiRequestDoc` sends what the route reads, and the route must see exactly the
 * same fields, ids and prompt as with the whole document.
 */

function freshDoc(): DesignDoc {
  return createDesignDoc({
    brand: { name: "Lumen", tagline: "Claridad para equipos", seeds: { primary: "#7c5cff" } },
    brief: { productType: "saas-general", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
}

function ok(result: ReturnType<typeof withGeneratedScreens>): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

function templateDoc(): DesignDoc {
  let n = 0;
  const newId = () => `b-${(++n).toString(36).padStart(6, "0")}`;
  const screen = (id: string, name: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput => {
    const template = getScreenTemplate(templateId);
    const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId });
    return { screenId: id, name, kind: template.kind ?? "landing", route, shell, layout };
  };
  const draft = [
    screen("s-home", "Inicio", "/", "home"),
    screen("s-pricing", "Precios", "/precios", "pricing"),
    screen("s-dash", "Dashboard", "/dashboard", "dashboard"),
    screen("s-settings", "Ajustes", "/ajustes", "settings"),
  ];
  // A link from the dashboard to the settings: the prompt names the linked screen.
  const dash = draft[2]!;
  const first = Object.keys(dash.layout.blocks)[0]!;
  dash.layout = { ...dash.layout, blocks: { ...dash.layout.blocks, [first]: { ...dash.layout.blocks[first]!, linkTo: "s-settings" } } };
  return ok(withGeneratedScreens(freshDoc(), draft));
}

/** `count` screens of 200 blocks (ids made unique across screens). */
function bigDoc(count: number): DesignDoc {
  const draft: GeneratedScreenInput[] = Array.from({ length: count }, (_, s) => {
    const raw = realisticLayout(mulberry32(1000 + s), 200);
    const rename = (id: string) => `${id}-${s}`;
    const blocks: LayoutDoc["blocks"] = {};
    for (const [id, block] of Object.entries(raw.blocks)) {
      blocks[rename(id)] = { ...block, ...(block.parentId !== undefined && { parentId: rename(block.parentId) }) };
    }
    return { screenId: `s-${s}`, name: `Pantalla ${s}`, kind: "app", route: `/p-${s}`, shell: { nav: "sidebar", header: true }, layout: { ...raw, blocks } };
  });
  return ok(withGeneratedScreens(freshDoc(), draft));
}

const bodyBytes = (doc: DesignDoc, screens: ScreenCopyTarget[]) =>
  new TextEncoder().encode(JSON.stringify({ doc, screens, locale: doc.brief.locale })).length;

describe("aiRequestDoc", () => {
  it("keeps the requested screens, stubs the others and stays a valid document", () => {
    const doc = templateDoc();
    const target = { screens: [{ id: "s-dash" }] };
    const reduced = aiRequestDoc(doc, target);
    expect(reduced).not.toBe(doc);
    expect(safeParseDesignDoc(reduced).success).toBe(true);
    expect(reduced.screenOrder).toEqual(doc.screenOrder);
    expect(reduced.screens["s-dash"]).toEqual(doc.screens["s-dash"]);
    for (const id of ["s-home", "s-pricing", "s-settings"]) {
      const stub = reduced.screens[id]!;
      const full = doc.screens[id]!;
      expect(stub).toMatchObject({ id, name: full.name, kind: full.kind, route: full.route, shell: full.shell });
      expect(stub.layout.blocks).toEqual({});
      expect(Object.keys(stub.page.elements)).toEqual([full.page.root]);
    }
    expect(reduced.pages).toEqual({});
    expect(reduced.brand).toBe(doc.brand);
    expect(reduced.brief).toBe(doc.brief);
    expect(JSON.stringify(reduced).length).toBeLessThan(JSON.stringify(doc).length);
  });

  it("the route sees the same fields, field ids and prompt as with the whole document", () => {
    const doc = templateDoc();
    for (const screens of [[{ id: "s-dash" }], [{ id: "s-home" }, { id: "s-settings" }], [{ id: "s-pricing", sectionIds: [Object.keys(doc.screens["s-pricing"]!.layout.blocks)[1]!] }]]) {
      const reduced = aiRequestDoc(doc, { screens });
      const fields = collectScreenCopyFields(doc, screens);
      expect(fields.length).toBeGreaterThan(0);
      expect(collectScreenCopyFields(reduced, screens)).toEqual(fields);
      const prompt = (d: DesignDoc) => buildCopyUserMessage({ doc: d, screens, fields: collectScreenCopyFields(d, screens), instructions: "más directo" });
      expect(prompt(reduced)).toBe(prompt(doc));
    }
    // The dashboard links to the settings screen: its name still reaches the prompt.
    expect(buildCopyUserMessage({ doc: aiRequestDoc(doc, { screens: [{ id: "s-dash" }] }), screens: [{ id: "s-dash" }], fields: collectScreenCopyFields(doc, [{ id: "s-dash" }]) })).toContain("Ajustes");
  });

  it("a page request (the style guide) keeps the pages and stubs every screen", () => {
    const doc = templateDoc();
    const reduced = aiRequestDoc(doc, { kind: "brand" });
    expect(safeParseDesignDoc(reduced).success).toBe(true);
    expect(reduced.pages.brand).toBe(doc.pages.brand);
    expect(collectCopyFields(reduced, "brand")).toEqual(collectCopyFields(doc, "brand"));
    for (const screen of Object.values(reduced.screens)) expect(screen.layout.blocks).toEqual({});
  });

  it("a document without screens goes as it is", () => {
    const doc = freshDoc();
    expect(aiRequestDoc(doc, { kind: "landing" })).toBe(doc);
  });

  it("an invalid reduction falls back to the whole document", () => {
    const doc = templateDoc();
    const broken = { ...doc, screens: { ...doc.screens, "s-home": { ...doc.screens["s-home"]!, page: { ...doc.screens["s-home"]!.page, root: "missing" } } } };
    expect(aiRequestDoc(broken, { screens: [{ id: "s-dash" }] })).toBe(broken);
  });

  it("4 screens × 200 blocks: one section now fits the route's body limit", () => {
    const doc = bigDoc(4);
    const blockId = Object.keys(doc.screens["s-0"]!.layout.blocks)[0]!;
    const screens = [{ id: "s-0", sectionIds: [blockId] }];
    const whole = bodyBytes(doc, screens);
    const reduced = bodyBytes(aiRequestDoc(doc, { screens }), screens);
    console.info(`[ai body] 4×200, one section: whole ${whole} B, reduced ${reduced} B (limit ${MAX_COPY_BODY_BYTES})`);
    expect(reduced).toBeLessThan(MAX_COPY_BODY_BYTES);
    expect(reduced).toBeLessThan(whole / 2);
  });
});
