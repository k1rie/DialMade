import { describe, expect, it } from "vitest";
import { resolveExport, type DesignDoc } from "@dialmade/doc";
import { contentContextFromDoc, resolveSectionProps, sectionRegistry, type RenderContext } from "@dialmade/sections";
import { FigmaPlanSchema } from "../../../figma/schema";
import { toFigmaPlan } from "../../../figma/toFigmaPlan";
import { everyBlockDoc, screensDoc } from "../../../testing/fixtures";
import { toTsx } from "../../../tsx/toTsx";
import { buildDesignTree } from "../../build";
import type { BuildContext, SectionInput } from "../../context";
import type { DesignNode, FrameNode } from "../../types";
import { UI_BUILDERS } from "./index";

/** Root box name of each builder (the generic fallback is named after the section's label instead). */
const ROOT_NAMES: Record<string, string> = {
  "ui.text": "Text",
  "ui.media": "Media",
  "ui.cards": "Cards",
  "ui.calendar": "Calendar",
  "ui.list": "List",
  "ui.form": "Form",
  "ui.placeholder": "Placeholder",
  "ui.region": "Group",
};

function frames(node: DesignNode, out: FrameNode[] = []): FrameNode[] {
  if (node.type !== "frame") return out;
  out.push(node);
  for (const child of node.children) frames(child, out);
  return out;
}

function elementTypes(doc: DesignDoc): Map<string, { type: string; role?: unknown }> {
  const out = new Map<string, { type: string; role?: unknown }>();
  for (const screen of Object.values(doc.screens)) {
    for (const [id, element] of Object.entries(screen.page.elements)) out.set(id, { type: element.type, role: element.props.role });
  }
  return out;
}

describe.each([
  ["everyBlockDoc", everyBlockDoc],
  ["screensDoc", screensDoc],
])("ui builders on %s", (_, make) => {
  const doc = make();

  it("builds every ui.* element with its own builder, without errors", () => {
    const errors: string[] = [];
    const tree = buildDesignTree(doc, { onSectionError: (id, type, error) => errors.push(`${id} ${type} ${String(error)}`) });
    expect(errors).toEqual([]);
    const types = elementTypes(doc);
    const seen = new Set<string>();
    for (const page of tree.pages) {
      for (const node of frames(page.root)) {
        const element = node.key ? types.get(node.key) : undefined;
        if (!element || !element.type.startsWith("ui.")) continue;
        if (element.type === "ui.region" && element.role !== "group") continue;
        expect(node.name, `${node.key} (${element.type})`).toBe(ROOT_NAMES[element.type]);
        seen.add(element.type);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("emits a valid figma plan and TSX", () => {
    expect(() => FigmaPlanSchema.parse(toFigmaPlan(doc))).not.toThrow();
    expect(() => toTsx(doc)).not.toThrow();
  });
});

describe("ui builders: variants", () => {
  const doc = everyBlockDoc();
  const { inputs, light, dark } = resolveExport(doc);
  const build: BuildContext = { doc, inputs, light, dark, pageKind: "app" };
  const ctx: RenderContext = {
    ...contentContextFromDoc(doc),
    mode: "light",
    interactive: false,
    doc,
    linkTarget: (id) => (id === "linked" ? "s-app" : null),
  };

  function buildSection(type: string, variant: string, props: Record<string, unknown> = {}, id = "linked", children: DesignNode[] = []): FrameNode {
    const def = sectionRegistry.get(type)!;
    const resolved = resolveSectionProps(def, {}, ctx);
    const input: SectionInput = { id, type, props: { ...resolved.props, ...props }, variant, children, ctx, build };
    return UI_BUILDERS[type]!(input);
  }

  const all = (node: DesignNode): DesignNode[] => (node.type === "frame" ? [node, ...node.children.flatMap(all)] : [node]);
  const texts = (node: DesignNode) => all(node).flatMap((n) => (n.type === "text" ? [n.text] : []));
  const named = (node: DesignNode, name: string) => all(node).filter((n): n is FrameNode => n.type === "frame" && n.name === name);
  const links = (node: DesignNode) => all(node).filter((n) => n.type === "frame" && n.linkTo === "s-app");

  it("text: heading, prose, callout, alignment and layout flags", () => {
    const heading = buildSection("ui.text", "heading", { title: "Hola", body: "Uno\n\nDos", action: "Ir", eyebrow: "Ojo" });
    expect(texts(heading)).toEqual(expect.arrayContaining(["Ojo", "Hola", "Uno", "Dos", "Ir"]));
    expect(links(heading)).toHaveLength(1);
    const callout = buildSection("ui.text", "callout", { eyebrow: "Ojo", action: "Ir" });
    expect(texts(callout)).not.toContain("Ojo");
    expect(named(callout, "Callout")).toHaveLength(1);
    const hidden = buildSection("ui.text", "prose", { body: "Cuerpo", action: "Ir", showBody: false, showAction: false, align: "center", level: "h1" });
    expect(texts(hidden)).not.toContain("Cuerpo");
    expect(texts(hidden)).not.toContain("Ir");
    expect(all(hidden).find((n) => n.type === "text" && n.tag === "h1")).toMatchObject({ style: "h2", align: "center" });
  });

  it("media: gradient, browser and device, framed", () => {
    for (const variant of ["gradient", "browser", "device"]) {
      const node = buildSection("ui.media", variant, { ratio: "16:9", caption: "Pie", frame: "card" });
      const art = named(node, "Artwork")[0]!;
      expect(art.aspect).toBeCloseTo(16 / 9);
      expect(texts(node)).toContain("Pie");
      expect(node.fill).toEqual({ color: "card" });
    }
    expect(named(buildSection("ui.media", "browser"), "Window")).toHaveLength(1);
    expect(named(buildSection("ui.media", "device"), "Phone")).toHaveLength(1);
  });

  it("cards: feature, compact and stat, columns, count and links", () => {
    const feature = buildSection("ui.cards", "feature", { count: 4, columns: "2", action: "Ver", title: "Cosas" });
    const gridNode = named(feature, "Grid")[0]!;
    expect(gridNode.layout).toMatchObject({ kind: "grid", columns: 2 });
    expect(gridNode.children).toHaveLength(4);
    expect(links(feature)).toHaveLength(4);
    expect(texts(feature)).toContain("Cosas");
    const compact = buildSection("ui.cards", "compact", { count: 3, action: "Ver" });
    expect(links(compact)).toHaveLength(3);
    expect(texts(compact)).not.toContain("Ver");
    const stat = buildSection("ui.cards", "stat", { count: 2 }, "plain");
    expect(all(stat).filter((n) => n.type === "text" && n.style === "h2")).toHaveLength(2);
    expect(links(stat)).toHaveLength(0);
  });

  it("calendar: month, mini, week and agenda", () => {
    const monthNode = buildSection("ui.calendar", "month");
    expect(named(monthNode, "Month")).toHaveLength(1);
    expect(named(monthNode, "Today").length).toBeGreaterThan(0);
    const mini = buildSection("ui.calendar", "mini");
    expect(named(mini, "Mini month")).toHaveLength(1);
    expect(named(mini, "Next")).toHaveLength(1);
    const weekNode = buildSection("ui.calendar", "week", { startWeekday: "sunday" });
    expect(named(weekNode, "Week body")[0]!.children).toHaveLength(8);
    expect(named(weekNode, "Event").every((event) => event.absolute !== undefined)).toBe(true);
    const agendaNode = buildSection("ui.calendar", "agenda", { title: "" });
    expect(named(agendaNode, "Agenda")).toHaveLength(1);
    expect(texts(agendaNode)).toContain("Hoy");
    expect(texts(buildSection("ui.calendar", "agenda", { events: [] }))).toContain("Sin eventos próximos");
  });

  it("list: simple, avatars and divided", () => {
    const simple = buildSection("ui.list", "simple", { count: 3, showAvatars: false });
    expect(named(simple, "Items")[0]!.children).toHaveLength(3);
    expect(named(simple, "Avatar")).toHaveLength(0);
    expect(links(simple)).toHaveLength(1);
    expect(named(buildSection("ui.list", "avatars", { count: 2 }), "Avatar")).toHaveLength(2);
    const divided = buildSection("ui.list", "divided", { count: 3, action: "" });
    expect(named(divided, "Item 2")[0]!.stroke).toMatchObject({ sides: ["top"] });
    expect(named(divided, "Link")).toHaveLength(0);
  });

  it("form: purposes, card and plain, submit link", () => {
    const login = buildSection("ui.form", "card", { purpose: "login", count: 3 });
    expect(texts(login)).toEqual(expect.arrayContaining(["Inicia sesión en Brisa", "Iniciar sesión", "¿Olvidaste tu contraseña?", "Recordarme"]));
    expect(named(login, "Panel")[0]!.maxWidth).toBe(416);
    expect(links(login)).toHaveLength(1);
    const contact = buildSection("ui.form", "plain", { purpose: "contact", count: 3, title: "Escríbenos", submit: "Mandar" });
    expect(texts(contact)).toEqual(expect.arrayContaining(["Escríbenos", "Mandar", "Mensaje"]));
    expect(named(contact, "Textarea")).toHaveLength(1);
    const search = buildSection("ui.form", "plain", { purpose: "search", count: 2, description: "" });
    expect(named(search, "Select")).toHaveLength(1);
    expect(texts(search)).toContain("Limpiar filtros");
  });

  it("placeholder: dashed, skeleton and soon", () => {
    const dashed = buildSection("ui.placeholder", "dashed", { blockLabel: "Kanban", blockNote: "Columnas", count: 3 });
    expect(texts(dashed)).toEqual(expect.arrayContaining(["Kanban", "Columnas", "×3"]));
    expect(named(dashed, "Box")[0]!.stroke).toMatchObject({ dashed: true });
    const soon = buildSection("ui.placeholder", "skeleton", { soon: true, count: 4 });
    expect(texts(soon)).toEqual(expect.arrayContaining(["Bloque en camino", "Pronto"]));
    expect(named(soon, "Skeleton")[0]!.children).toHaveLength(4);
  });

  it("region: surfaces and paddings around the children", () => {
    const child = { type: "text", text: "Hijo", style: "body" } as const;
    const cardRegion = buildSection("ui.region", "card", { role: "group", padding: "md" }, "r", [child]);
    expect(cardRegion).toMatchObject({ name: "Group", padding: 5, fill: { color: "card" } });
    expect(cardRegion.children).toEqual([child]);
    expect(buildSection("ui.region", "muted", { role: "group", padding: "lg" }, "r", [child])).toMatchObject({ padding: 7, fill: { color: "muted", opacity: 0.55 } });
    const scope = buildSection("ui.region", "plain", { role: "scope" }, "r", [child]);
    expect(scope.fill).toBeUndefined();
    expect(scope.children).toEqual([child]);
  });
});
