import { MAX_PINNED, applyPatch, screenPointer, type DesignDoc } from "@dialmade/doc";
import { sectionRegistry } from "@dialmade/sections";
import { describe, expect, it } from "vitest";
import { sampleDoc, sampleScreensDoc } from "@/lib/ai/testing";
import { canHide, hiddenOps, isPageKind, pageBase, pageTarget, sectionRows, setPropOps } from "./pageOps";

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
