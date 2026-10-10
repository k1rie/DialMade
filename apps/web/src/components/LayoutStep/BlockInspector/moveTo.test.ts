import { applyFix, inferStructure, type GridRect, type LayoutBlock, type LayoutDoc, type LayoutFix, type LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { alignRect, canMoveInto, diffToFixes, moveOptions, parentOf, planMoveTo, plannedLayout, type MoveTarget } from "./moveTo";

type Spec = [type: LibraryBlockType, col: number, row: number, w: number, h: number, parentId?: string];

function doc(specs: Record<string, Spec>): LayoutDoc {
  const blocks: Record<string, LayoutBlock> = {};
  let z = 0;
  for (const [id, [type, col, row, w, h, parentId]] of Object.entries(specs)) {
    blocks[id] = { type, label: id, rect: { col, row, w, h }, z: ++z, ...(parentId !== undefined && { parentId }) };
  }
  return { version: 1, columns: 12, rowUnit: 8, blocks };
}

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });
const rects = (layout: LayoutDoc) => Object.fromEntries(Object.entries(layout.blocks).map(([id, block]) => [id, block.rect]));
const parents = (layout: LayoutDoc) => Object.fromEntries(Object.keys(layout.blocks).map((id) => [id, parentOf(layout, id) ?? null]));
const apply = (layout: LayoutDoc, fixes: readonly LayoutFix[]) => fixes.reduce((next, fix) => applyFix(next, fix), layout);

/** The plan's result, checked against applying its fixes one by one (what the store does in a batch). */
function move(layout: LayoutDoc, id: string, target: MoveTarget): LayoutDoc {
  const planned = plannedLayout(layout, id, target);
  expect(planned, `${id} → ${JSON.stringify(target)}`).not.toBeNull();
  const applied = apply(layout, planMoveTo(layout, id, target));
  expect(rects(applied)).toEqual(rects(planned!));
  expect(parents(applied)).toEqual(parents(planned!));
  return applied;
}

const overlapCount = (layout: LayoutDoc) => inferStructure(layout).warnings.filter((w) => w.code === "overlap").length;

/** Navbar, hero, features and footer stacked. */
const STACK = doc({
  nav: ["navbar", 0, 0, 12, 8],
  hero: ["hero", 0, 8, 12, 40],
  feat: ["features", 0, 48, 12, 30],
  foot: ["footer", 0, 78, 12, 10],
});

/** A hero over two half-width blocks, then a footer. */
const SPLIT = doc({
  hero: ["hero", 0, 0, 12, 20],
  a: ["chart", 0, 20, 6, 20],
  b: ["table", 6, 20, 6, 20],
  foot: ["footer", 0, 40, 12, 10],
});

/** A navbar, a container with two stacked children, a footer. */
const NESTED = doc({
  nav: ["navbar", 0, 0, 12, 10],
  box: ["container", 0, 10, 12, 40],
  x: ["cards", 0, 10, 12, 10, "box"],
  y: ["list", 0, 20, 12, 10, "box"],
  foot: ["footer", 0, 50, 12, 10],
});

/** A container filled by its only child, a footer, and a free block at the end. */
const FULL = doc({
  box: ["container", 0, 10, 12, 20],
  x: ["table", 0, 10, 12, 20, "box"],
  foot: ["footer", 0, 30, 12, 10],
  z: ["free", 0, 40, 12, 10],
});

describe("planMoveTo: top and bottom", () => {
  it("moves a block to the top and pushes the rest down, closing the band it left", () => {
    const after = move(STACK, "feat", { kind: "top" });
    expect(rects(after)).toEqual({ feat: rect(0, 0, 12, 30), nav: rect(0, 30, 12, 8), hero: rect(0, 38, 12, 40), foot: rect(0, 78, 12, 10) });
  });

  it("moves a block to the end and closes the band it left", () => {
    const after = move(STACK, "nav", { kind: "bottom" });
    expect(rects(after)).toEqual({ hero: rect(0, 0, 12, 40), feat: rect(0, 40, 12, 30), foot: rect(0, 70, 12, 10), nav: rect(0, 80, 12, 8) });
  });

  it("does nothing for the first block to the top or the last one to the end", () => {
    expect(planMoveTo(STACK, "nav", { kind: "top" })).toEqual([]);
    expect(planMoveTo(STACK, "foot", { kind: "bottom" })).toEqual([]);
  });

  it("keeps the column and leaves the spot free when the block shares its rows", () => {
    const top = move(SPLIT, "b", { kind: "top" });
    expect(rects(top)).toEqual({ b: rect(6, 0, 6, 20), hero: rect(0, 20, 12, 20), a: rect(0, 40, 6, 20), foot: rect(0, 60, 12, 10) });
    const bottom = move(SPLIT, "a", { kind: "bottom" });
    expect(rects(bottom)).toEqual({ hero: rect(0, 0, 12, 20), a: rect(0, 50, 6, 20), b: rect(6, 20, 6, 20), foot: rect(0, 40, 12, 10) });
  });

  it("works inside the block's container, from the container's top row", () => {
    const after = move(NESTED, "y", { kind: "top" });
    expect(after.blocks.y!.rect).toEqual(rect(0, 10, 12, 10));
    expect(after.blocks.x!.rect).toEqual(rect(0, 20, 12, 10));
    expect(after.blocks.box!.rect).toEqual(NESTED.blocks.box!.rect);
    expect(after.blocks.foot!.rect).toEqual(NESTED.blocks.foot!.rect);
  });

  it("carries the block's content along", () => {
    const layout = doc({
      hero: ["hero", 0, 0, 12, 20],
      box: ["container", 0, 20, 12, 20],
      k: ["kpis", 0, 20, 6, 20, "box"],
    });
    const after = move(layout, "box", { kind: "top" });
    expect(rects(after)).toEqual({ hero: rect(0, 20, 12, 20), box: rect(0, 0, 12, 20), k: rect(0, 0, 6, 20) });
  });

  it("grows the container when the block no longer fits, pushing what is below", () => {
    const layout = doc({
      box: ["container", 0, 0, 12, 20],
      a: ["chart", 0, 0, 6, 20, "box"],
      b: ["table", 6, 0, 6, 20, "box"],
      foot: ["footer", 0, 20, 12, 10],
    });
    const after = move(layout, "b", { kind: "bottom" });
    expect(after.blocks.b!.rect).toEqual(rect(6, 20, 6, 20));
    expect(after.blocks.box!.rect).toEqual(rect(0, 0, 12, 40));
    expect(after.blocks.foot!.rect).toEqual(rect(0, 40, 12, 10));
    expect(overlapCount(after)).toBe(0);
  });
});

describe("planMoveTo: into and out of containers", () => {
  it("takes a block out, right below its container, and closes the band it left inside", () => {
    const after = move(NESTED, "x", { kind: "out" });
    expect(parentOf(after, "x")).toBeUndefined();
    expect(rects(after)).toEqual({
      nav: rect(0, 0, 12, 10),
      box: rect(0, 10, 12, 40),
      x: rect(0, 50, 12, 10),
      y: rect(0, 10, 12, 10),
      foot: rect(0, 60, 12, 10),
    });
  });

  it("puts a block in the first free slot of a container", () => {
    const after = move(NESTED, "foot", { kind: "into", parentId: "box" });
    expect(parentOf(after, "foot")).toBe("box");
    expect(after.blocks.foot!.rect).toEqual(rect(0, 30, 12, 10));
    expect(after.blocks.box!.rect).toEqual(NESTED.blocks.box!.rect);
  });

  it("grows a full container and pushes the blocks below it", () => {
    const after = move(FULL, "z", { kind: "into", parentId: "box" });
    expect(parentOf(after, "z")).toBe("box");
    expect(rects(after)).toEqual({ box: rect(0, 10, 12, 30), x: rect(0, 10, 12, 20), foot: rect(0, 40, 12, 10), z: rect(0, 30, 12, 10) });
    expect(overlapCount(after)).toBe(0);
  });

  it("narrows a block to fit a narrower container", () => {
    const layout = doc({
      side: ["container", 0, 0, 4, 40],
      main: ["table", 4, 0, 8, 40],
      wide: ["text", 0, 40, 12, 10],
    });
    const after = move(layout, "wide", { kind: "into", parentId: "side" });
    expect(after.blocks.wide!.rect).toEqual(rect(0, 0, 4, 10));
    expect(parentOf(after, "wide")).toBe("side");
  });

  it("moves into a nested container and back out to the outer one", () => {
    const layout = doc({
      outer: ["container", 0, 0, 12, 40],
      inner: ["container", 0, 0, 12, 20, "outer"],
      c: ["cards", 0, 20, 12, 10, "outer"],
    });
    const inside = move(layout, "c", { kind: "into", parentId: "inner" });
    expect(parentOf(inside, "c")).toBe("inner");
    const back = move(inside, "c", { kind: "out" });
    expect(parentOf(back, "c")).toBe("outer");
    expect(back.blocks.c!.rect.row).toBeGreaterThanOrEqual(back.blocks.inner!.rect.row + back.blocks.inner!.rect.h);
  });

  it("only offers containers that can take the block", () => {
    const layout = doc({
      hero: ["hero", 0, 0, 12, 40],
      media: ["media", 0, 40, 6, 20],
      table: ["table", 6, 40, 6, 20],
      box: ["container", 0, 60, 12, 30],
      kid: ["text", 0, 60, 12, 10, "box"],
    });
    expect(canMoveInto(layout, "media", "hero")).toBe(true); // hero accepts media
    expect(canMoveInto(layout, "table", "hero")).toBe(false);
    expect(canMoveInto(layout, "table", "box")).toBe(true);
    expect(canMoveInto(layout, "kid", "box")).toBe(false); // already inside
    expect(canMoveInto(layout, "box", "box")).toBe(false);
    expect(canMoveInto(layout, "box", "kid")).toBe(false); // not a container, and its own child
    expect(moveOptions(layout, "table").into).toEqual(["box"]);
    expect(moveOptions(layout, "media").into).toEqual(["hero", "box"]);
  });
});

describe("planMoveTo: overlays and edge cases", () => {
  const layout = doc({
    hero: ["hero", 0, 0, 12, 40],
    modal: ["modal", 3, 8, 6, 30],
    box: ["container", 0, 40, 12, 20],
  });

  it("does not move overlays in the reading order", () => {
    expect(plannedLayout(layout, "modal", { kind: "top" })).toBeNull();
    expect(planMoveTo(layout, "modal", { kind: "into", parentId: "box" })).toEqual([]);
    const options = moveOptions(layout, "modal");
    expect(options).toMatchObject({ top: false, bottom: false, out: false, into: [] });
    expect(options.align.left).toBe(true);
  });

  it("never shifts overlays with the flow", () => {
    const after = move(layout, "box", { kind: "top" });
    expect(after.blocks.modal!.rect).toEqual(layout.blocks.modal!.rect);
  });

  it("ignores unknown blocks and «out» at the root", () => {
    expect(planMoveTo(layout, "nope", { kind: "top" })).toEqual([]);
    expect(plannedLayout(layout, "hero", { kind: "out" })).toBeNull();
  });
});

describe("planMoveTo: invariants", () => {
  const FIXTURES = { STACK, SPLIT, NESTED, FULL };
  const targets = (layout: LayoutDoc): MoveTarget[] => [
    { kind: "top" },
    { kind: "bottom" },
    { kind: "out" },
    ...Object.keys(layout.blocks).map((parentId): MoveTarget => ({ kind: "into", parentId })),
  ];

  it("reproduces the plan with applyFix, adds no overlaps and keeps every rect valid", () => {
    for (const [name, layout] of Object.entries(FIXTURES)) {
      for (const id of Object.keys(layout.blocks)) {
        for (const target of targets(layout)) {
          const planned = plannedLayout(layout, id, target);
          if (!planned) continue;
          const label = `${name}: ${id} → ${JSON.stringify(target)}`;
          const applied = apply(layout, planMoveTo(layout, id, target));
          expect(rects(applied), label).toEqual(rects(planned));
          expect(parents(applied), label).toEqual(parents(planned));
          expect(overlapCount(applied), label).toBeLessThanOrEqual(overlapCount(layout));
          for (const block of Object.values(applied.blocks)) {
            const r = block.rect;
            expect(r.col >= 0 && r.row >= 0 && r.w >= 1 && r.h >= 1 && r.col + r.w <= 12, label).toBe(true);
          }
        }
      }
    }
  });

  it("diffs to nothing when nothing changed", () => {
    expect(diffToFixes(STACK, STACK)).toEqual([]);
  });
});

describe("alignRect", () => {
  const layout = doc({
    a: ["cards", 2, 0, 5, 10],
    box: ["container", 2, 10, 8, 20],
    kid: ["text", 4, 10, 3, 10, "box"],
  });

  it("places the block in the 12 columns at the root", () => {
    expect(alignRect(layout, "a", "left")).toEqual(rect(0, 0, 5, 10));
    expect(alignRect(layout, "a", "right")).toEqual(rect(7, 0, 5, 10));
    expect(alignRect(layout, "a", "center")).toEqual(rect(3, 0, 5, 10));
    expect(alignRect(layout, "a", "full")).toEqual(rect(0, 0, 12, 10));
  });

  it("places a nested block inside its container's columns", () => {
    expect(alignRect(layout, "kid", "left")).toEqual(rect(2, 10, 3, 10));
    expect(alignRect(layout, "kid", "right")).toEqual(rect(7, 10, 3, 10));
    expect(alignRect(layout, "kid", "center")).toBeNull(); // 2 + floor((8 − 3) / 2) = 4: already there
    expect(alignRect(layout, "kid", "full")).toEqual(rect(2, 10, 8, 10));
  });
});
