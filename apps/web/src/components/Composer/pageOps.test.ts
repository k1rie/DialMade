import { MAX_PINNED, applyPatch, screenPointer, type DesignDoc } from "@dialmade/doc";
import { blockCount, estimateContent } from "@dialmade/layout";
import { SHELL_ELEMENT_ID, buildPageFromLayout, contentContextFromDoc, sectionRegistry } from "@dialmade/sections";
import { describe, expect, it } from "vitest";
import { sampleDoc, sampleScreensDoc } from "@/lib/ai/testing";
import { COUNT_PROP, canHide, hiddenOps, isPageKind, pageBase, pageTarget, sectionRows, setPropOps } from "./pageOps";

function patched(doc: DesignDoc, ops: Parameters<typeof applyPatch>[1]): DesignDoc {
  const result = applyPatch(doc, ops);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.doc;
}

describe("page keys", () => {
  it("tell page kinds from screen ids and point at the right page", () => {
    expect(isPageKind("brand")).toBe(true);
    expect(isPageKind("s-home")).toBe(false);
    expect(pageBase("landing")).toBe("/pages/landing");
    expect(pageBase("s-home")).toBe("/screens/s-home/page");
  });

  it("pageTarget is null for a page the doc does not have", () => {
    const doc = sampleScreensDoc();
    expect(pageTarget(doc, "s-home")?.screen?.id).toBe("s-home");
    expect(pageTarget(doc, "brand")?.kind).toBe("brand");
    expect(pageTarget(doc, "landing")).toBeNull();
    expect(pageTarget(doc, "s-missing")).toBeNull();
    expect(pageTarget(sampleDoc(["landing"]), "landing")?.screen).toBeUndefined();
  });
});

describe("setPropOps on a screen", () => {
  it("pins the edited prop once, and stops pinning at MAX_PINNED (the value is still written)", () => {
    const doc = sampleScreensDoc();
    const target = pageTarget(doc, "s-home")!;
    const [id] = sectionRows(target, sectionRegistry).ids;
    expect(id).toBeDefined();
    const first = patched(doc, setPropOps(doc, target, id!, "a/b~c", "x"));
    expect(first.screens["s-home"]!.layout.blocks[id!]!.pinned).toEqual(["/a~1b~0c"]);

    const full = Array.from({ length: MAX_PINNED }, (_, i) => `/p${i}`);
    const crowded = patched(doc, [{ op: "add", path: screenPointer("s-home", "layout", "blocks", id!, "pinned"), value: full }]);
    const ops = setPropOps(crowded, pageTarget(crowded, "s-home")!, id!, "title", "Hola");
    expect(ops).toHaveLength(1);
    expect(ops[0]!.path).toBe(`/screens/s-home/page/elements/${id}/props/title`);
  });

  it("writes nothing to the layout for an element that is not a block", () => {
    const doc = sampleScreensDoc();
    const target = pageTarget(doc, "s-home")!;
    expect(setPropOps(doc, target, target.page.root, "x", 1)).toHaveLength(1);
    expect(canHide(target, target.page.root)).toBe(false);
  });
});

describe("hiddenOps on a screen", () => {
  it("hides in the page and in the layout, and shows again without touching a block that was never hidden", () => {
    const doc = sampleScreensDoc();
    const target = pageTarget(doc, "s-home")!;
    const id = sectionRows(target, sectionRegistry).ids.at(-1)!;
    const hidden = patched(doc, hiddenOps(target, id, true));
    expect(hidden.screens["s-home"]!.page.hidden).toEqual([id]);
    expect(hidden.screens["s-home"]!.layout.blocks[id]!.hidden).toBe(true);
    expect(hiddenOps(pageTarget(hidden, "s-home")!, id, true)).toEqual([]);

    const shown = patched(hidden, hiddenOps(pageTarget(hidden, "s-home")!, id, false));
    expect(shown.screens["s-home"]!.page.hidden ?? []).toEqual([]);
    expect(shown.screens["s-home"]!.layout.blocks[id]!.hidden).toBeUndefined();
    expect(hiddenOps(pageTarget(shown, "s-home")!, id, false)).toEqual([]);
  });
});

describe("sectionRows", () => {
  it("lists a screen's blocks in page order, never the structural regions", () => {
    const doc = sampleScreensDoc();
    const target = pageTarget(doc, "s-home")!;
    const rows = sectionRows(target, sectionRegistry);
    expect(rows.reorderable).toBe(false);
    expect(rows.ids).not.toContain("layout");
    expect(rows.ids.some((id) => id.startsWith("r-"))).toBe(false);
    for (const id of rows.ids) expect(Object.hasOwn(target.screen!.layout.blocks, id)).toBe(true);
  });

  it("keeps the legacy rows (the section container's children, reorderable)", () => {
    const doc = sampleDoc(["landing"]);
    const target = pageTarget(doc, "landing")!;
    const rows = sectionRows(target, sectionRegistry);
    expect(rows.reorderable).toBe(true);
    expect(rows.ids).toEqual(target.page.elements[target.page.root]!.children);
  });
});

/** The id of the first block of `type` on a screen of `sampleScreensDoc`. */
function blockIdOf(doc: DesignDoc, screenId: string, type: string): string {
  const entry = Object.entries(doc.screens[screenId]!.layout.blocks).find(([, block]) => block.type === type);
  if (!entry) throw new Error(`No ${type} block on ${screenId}`);
  return entry[0];
}

/** «Generar» again for one screen, as the store does: the screen's page is the previous page. */
function regenerate(doc: DesignDoc, screenId: string) {
  const screen = doc.screens[screenId]!;
  return buildPageFromLayout(screen.layout, screen.kind, screen.shell, contentContextFromDoc(doc), { previous: screen.page, screenId, screenTitle: screen.name });
}

describe("count edits on a screen", () => {
  it("write the repeatable block's count in the same patch, unpinned, so the Layout chip shows the same ×N", () => {
    const doc = sampleScreensDoc();
    const id = blockIdOf(doc, "s-home", "features");
    const ops = setPropOps(doc, pageTarget(doc, "s-home")!, id, COUNT_PROP, 5);
    const next = patched(doc, ops);
    const block = next.screens["s-home"]!.layout.blocks[id]!;
    expect(next.screens["s-home"]!.page.elements[id]!.props[COUNT_PROP]).toBe(5);
    expect(block.count).toBe(5);
    expect(block.pinned ?? []).not.toContain("/count");
    expect(blockCount(block)).toBe(5);
    expect(estimateContent(block)).toEqual({ kind: "count", unit: "items", value: 5 });
    // The same value again writes only the prop.
    expect(setPropOps(next, pageTarget(next, "s-home")!, id, COUNT_PROP, 5)).toHaveLength(1);
  });

  it("drop a /count pin left by an older edit, and keep the other pins", () => {
    const doc = sampleScreensDoc();
    const id = blockIdOf(doc, "s-home", "features");
    const pinnedPath = screenPointer("s-home", "layout", "blocks", id, "pinned");
    const onlyCount = patched(doc, [{ op: "add", path: pinnedPath, value: ["/count"] }]);
    const a = patched(onlyCount, setPropOps(onlyCount, pageTarget(onlyCount, "s-home")!, id, COUNT_PROP, 2));
    expect(a.screens["s-home"]!.layout.blocks[id]!.pinned).toBeUndefined();
    expect(a.screens["s-home"]!.layout.blocks[id]!.count).toBe(2);

    const withOthers = patched(doc, [{ op: "add", path: pinnedPath, value: ["/title", "/count", "/subtitle"] }]);
    const b = patched(withOthers, setPropOps(withOthers, pageTarget(withOthers, "s-home")!, id, COUNT_PROP, 2));
    expect(b.screens["s-home"]!.layout.blocks[id]!.pinned).toEqual(["/title", "/subtitle"]);
  });

  it("pin as before when the value is outside the block's range or the block is not repeatable", () => {
    const doc = sampleScreensDoc();
    const features = blockIdOf(doc, "s-home", "features");
    const outside = setPropOps(doc, pageTarget(doc, "s-home")!, features, COUNT_PROP, 9);
    expect(outside.some((op) => op.path.endsWith("/count") && op.path.includes("/layout/"))).toBe(false);
    expect(outside.some((op) => op.path.endsWith("/pinned"))).toBe(true);

    // A list's rows come from its height, not from `block.count`.
    const list = blockIdOf(doc, "s-detail", "list");
    const next = patched(doc, setPropOps(doc, pageTarget(doc, "s-detail")!, list, COUNT_PROP, 4));
    expect(next.screens["s-detail"]!.layout.blocks[list]!.count).toBeUndefined();
    expect(next.screens["s-detail"]!.layout.blocks[list]!.pinned).toEqual(["/count"]);
  });

  it("survive «Generar», and a later ×N change in Layout wins over the Ajustar edit", () => {
    const doc = sampleScreensDoc();
    const id = blockIdOf(doc, "s-home", "features");
    const edited = patched(doc, setPropOps(doc, pageTarget(doc, "s-home")!, id, COUNT_PROP, 5));
    expect(regenerate(edited, "s-home").page.elements[id]!.props[COUNT_PROP]).toBe(5);

    const relaid = patched(edited, [{ op: "replace", path: screenPointer("s-home", "layout", "blocks", id, "count"), value: 2 }]);
    expect(regenerate(relaid, "s-home").page.elements[id]!.props[COUNT_PROP]).toBe(2);
  });
});

describe("app frame edits on a screen (review B #1–#3)", () => {
  /** Dashboard, Ajustes (both framed, shared sidebar) and Login (no navigation). */
  const APP_SCREENS = [
    { id: "s-dash", name: "Dashboard", route: "/dashboard", template: "dashboard" },
    { id: "s-sett", name: "Ajustes", route: "/ajustes", template: "settings" },
    { id: "s-login", name: "Login", route: "/login", template: "login" },
  ] as const;
  const appDoc = () => sampleScreensDoc(APP_SCREENS);
  const frame = (doc: DesignDoc, id: string) => doc.screens[id]!.page.elements[SHELL_ELEMENT_ID]!.props;
  const edit = (doc: DesignDoc, prop: string, value: unknown, screen = "s-dash") =>
    patched(doc, setPropOps(doc, pageTarget(doc, screen)!, SHELL_ELEMENT_ID, prop, value));

  it("«Navegación» writes shell.nav on every app screen with navigation (an inset panel is a sidebar), never a pin", () => {
    const doc = appDoc();
    const top = edit(doc, "variant", "topnav");
    for (const id of ["s-dash", "s-sett"]) {
      expect(top.screens[id]!.shell?.nav, id).toBe("topnav");
      expect(frame(top, id).variant, id).toBe("topnav");
      expect(top.screens[id]!.shell?.pinned, id).toBeUndefined();
    }
    expect(top.screens["s-login"]!.shell?.nav).toBe("none");
    const inset = edit(top, "variant", "inset");
    expect(inset.screens["s-sett"]!.shell?.nav).toBe("sidebar");
    expect(frame(inset, "s-sett").variant).toBe("inset");
  });

  it("«Cabecera de página» writes this screen's shell.header only", () => {
    const off = edit(appDoc(), "showPageHeader", false);
    expect(off.screens["s-dash"]!.shell?.header).toBe(false);
    expect(frame(off, "s-dash").showPageHeader).toBe(false);
    expect(off.screens["s-sett"]!.shell?.header).toBe(true);
  });

  it("«Título de la página» renames the screen: unique name, its automatic route and the frames' nav labels follow", () => {
    const doc = appDoc();
    const renamed = edit(doc, "title", "Mi panel");
    expect(renamed.screens["s-dash"]).toMatchObject({ name: "Mi panel", route: "/mi-panel" });
    expect(frame(renamed, "s-dash").title).toBe("Mi panel");
    for (const id of ["s-dash", "s-sett"]) {
      const nav = frame(renamed, id).nav as { id: string; label: string }[];
      expect(nav.find((item) => item.id === "s-dash")?.label, id).toBe("Mi panel");
    }
    expect(edit(doc, "title", "Ajustes").screens["s-dash"]!.name).toBe("Ajustes 2");
    // Typing a trailing space or clearing the field changes nothing (no empty write, no invalid name).
    expect(setPropOps(renamed, pageTarget(renamed, "s-dash")!, SHELL_ELEMENT_ID, "title", "Mi panel ")).toEqual([]);
    expect(setPropOps(renamed, pageTarget(renamed, "s-dash")!, SHELL_ELEMENT_ID, "title", "   ")).toEqual([]);
  });

  it("frame copy is pinned on its screen; a shared key is written and pinned on every frame", () => {
    const action = edit(appDoc(), "primaryAction", "Nuevo informe");
    expect(action.screens["s-dash"]!.shell?.pinned).toEqual(["/primaryAction"]);
    expect(action.screens["s-sett"]!.shell?.pinned).toBeUndefined();
    expect(frame(action, "s-sett").primaryAction).not.toBe("Nuevo informe");
    // Once only.
    expect(edit(action, "primaryAction", "Nuevo informe 2").screens["s-dash"]!.shell?.pinned).toEqual(["/primaryAction"]);

    const workspace = edit(appDoc(), "workspace", "Equipo Norte", "s-sett");
    for (const id of ["s-dash", "s-sett"]) {
      expect(frame(workspace, id).workspace, id).toBe("Equipo Norte");
      expect(workspace.screens[id]!.shell?.pinned, id).toEqual(["/workspace"]);
    }
    // Settings are shared and survive every rebuild: not pinned.
    expect(edit(appDoc(), "tone", "inverted").screens["s-sett"]!.shell?.pinned).toBeUndefined();
  });
});
