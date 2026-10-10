import { describe, expect, test } from "vitest";
import { toAsciiWireframe } from "./ascii";
import { toCss } from "./css";
import { inferStructure } from "./infer";
import { deriveResponsive } from "./responsive";
import { FIXTURES } from "./testing/fixtures";

/**
 * Golden outputs of the reference layouts. Each one was reviewed by eye; a diff here is a behavior
 * change, not noise: check the new output before updating it (`vitest -u`).
 */
describe.each(FIXTURES)("golden: $name", ({ name, kind, layout }) => {
  const structure = inferStructure(layout);
  const responsive = deriveResponsive(layout, structure);

  test("structure and responsive plans", async () => {
    await expect(`${JSON.stringify({ structure, responsive }, null, 2)}\n`).toMatchFileSnapshot(
      `./__golden__/${name}.structure.json`,
    );
  });

  test("css", async () => {
    await expect(toCss(layout, { kind, structure, responsive })).toMatchFileSnapshot(`./__golden__/${name}.css`);
  });

  test("ascii wireframes", async () => {
    const options = { structure, responsive, numbered: true };
    const text = [
      "desktop",
      toAsciiWireframe(layout, options),
      "",
      "tablet",
      toAsciiWireframe(layout, { ...options, breakpoint: "tablet", width: 48 }),
      "",
      "mobile",
      toAsciiWireframe(layout, { ...options, breakpoint: "mobile", width: 28 }),
      "",
    ].join("\n");
    await expect(text).toMatchFileSnapshot(`./__golden__/${name}.txt`);
  });
});

describe("golden expectations that must hold whatever the snapshot says", () => {
  const get = (name: string) => FIXTURES.find((f) => f.name === name)!.layout;

  test("holy grail: stack of header, a row of three columns and footer", () => {
    const { root } = inferStructure(get("holy-grail"));
    expect(root?.kind).toBe("stack");
    if (root?.kind !== "stack") return;
    expect(root.children.map((c) => c.node.kind)).toEqual(["block", "row", "block"]);
    const row = root.children[1]!.node;
    expect(row.kind === "row" && row.children.map((c) => [c.start, c.span])).toEqual([
      [0, 2],
      [2, 8],
      [10, 2],
    ]);
    expect(root.gaps).toEqual([2, 2]);
  });

  test("bento and pinwheel have no clean cut: grid with rectangular areas", () => {
    const bento = inferStructure(get("bento")).root;
    expect(bento?.kind === "grid" && bento.areas).toEqual(["a a b b", "a a c d", "e f f d"]);
    const pinwheel = inferStructure(get("pinwheel")).root;
    expect(pinwheel?.kind === "grid" && pinwheel.areas).toEqual([
      "north north east",
      "west center east",
      "west south south",
    ]);
  });

  test("misaligned ±1 blocks keep the intended stack/row topology", () => {
    const { root, warnings } = inferStructure(get("misaligned"));
    expect(root?.kind).toBe("stack");
    if (root?.kind !== "stack") return;
    expect(root.children.map((c) => c.node.kind)).toEqual(["block", "block", "row", "row"]);
    expect(root.gaps).toEqual([0, 1, 2]);
    // The 1-column overlap between cards and list: the left band ends where the next starts.
    const last = root.children[3]!.node;
    expect(last.kind === "row" && last.children.map((c) => [c.start, c.span])).toEqual([
      [0, 3],
      [3, 5],
      [8, 4],
    ]);
    expect(warnings.map((w) => w.code)).toEqual(["overlap", "overlap"]);
  });

  test("partial overlap warns and falls back to line placement", () => {
    const { root, warnings } = inferStructure(get("partial-overlap"));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: "overlap", ids: ["copy", "photo"], ratio: 0.333 });
    expect(warnings[0]!.fixes).toEqual([{ kind: "move-below", id: "photo", below: "copy" }]);
    expect(root?.kind === "stack" && root.children[0]!.node.kind).toBe("grid");
    const grid = root?.kind === "stack" ? root.children[0]!.node : null;
    expect(grid?.kind === "grid" && grid.areas).toBeNull();
  });

  test("modal leaves the flow; its child lays out inside it", () => {
    const structure = inferStructure(get("modal-overlay"));
    expect(structure.root).toMatchObject({ kind: "block", id: "table" });
    expect(structure.overlays.map((o) => o.id)).toEqual(["dialog"]);
    expect(structure.overlays[0]!.content).toMatchObject({ kind: "block", id: "invite-form" });
    expect(structure.order).toEqual(["table", "dialog", "invite-form"]);
  });

  test("nested cards: the container carries a row of its three children", () => {
    const { root } = inferStructure(get("nested-cards"));
    const plans = root?.kind === "stack" ? root.children[1]!.node : null;
    expect(plans?.kind === "block" && plans.content?.kind).toBe("row");
  });

  test("empty and single", () => {
    expect(inferStructure(get("empty"))).toEqual({ root: null, overlays: [], order: [], warnings: [] });
    expect(toAsciiWireframe(get("empty"))).toBe("");
    expect(inferStructure(get("single")).root).toMatchObject({ kind: "block", id: "intro", content: null });
  });
});
