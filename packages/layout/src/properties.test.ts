import { describe, expect, test } from "vitest";
import { toAsciiWireframe } from "./ascii";
import { COLUMNS } from "./constants";
import { toCss } from "./css";
import { moveBlock, normalizeDrop } from "./edit";
import { isInBounds } from "./geometry";
import { areaName, inferStructure } from "./infer";
import { deriveResponsive } from "./responsive";
import {
  jitterLayout,
  mulberry32,
  permuteBlocks,
  randInt,
  randomLayout,
  randomMosaicLayout,
  randomPackedLayout,
  randomSeparableLayout,
  realisticLayout,
  type Rand,
} from "./testing/random";
import type { LayoutDoc, Structure, StructureNode } from "./types";
import { validateLayout } from "./validate";

/** Layouts per property and generator. */
const RUNS = 200;

type Generator = { name: string; make: (rand: Rand) => LayoutDoc };
const GENERATORS: Generator[] = [
  { name: "random", make: (rand) => randomLayout(rand) },
  { name: "separable", make: (rand) => randomSeparableLayout(rand) },
  { name: "packed", make: (rand) => randomPackedLayout(rand) },
  { name: "mosaic", make: (rand) => randomMosaicLayout(rand) },
];

function forEach(generator: Generator, seedBase: number, check: (layout: LayoutDoc, rand: Rand, seed: number) => void) {
  for (let i = 0; i < RUNS; i++) {
    const seed = seedBase * 100_003 + i;
    const rand = mulberry32(seed);
    const layout = generator.make(rand);
    try {
      check(layout, rand, seed);
    } catch (error) {
      (error as Error).message = `[${generator.name} seed ${seed}] ${(error as Error).message}`;
      throw error;
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function walk(node: StructureNode | null, visit: (node: StructureNode) => void): void {
  if (!node) return;
  visit(node);
  if (node.kind === "block") walk(node.content, visit);
  else if (node.kind === "grid") node.items.forEach((item) => walk(item.node, visit));
  else node.children.forEach((child) => walk(child.node, visit));
}

function shape(node: StructureNode | null): string {
  if (!node) return "_";
  switch (node.kind) {
    case "block":
      return node.content ? `${node.id}{${shape(node.content)}}` : node.id;
    case "grid":
      return `grid(${node.items.map((i) => shape(i.node)).join(",")})`;
    default:
      return `${node.kind}(${node.children.map((c) => shape(c.node)).join(",")})`;
  }
}

function allNodes(structure: Structure): StructureNode[] {
  const out: StructureNode[] = [];
  walk(structure.root, (node) => out.push(node));
  for (const overlay of structure.overlays) walk(overlay, (node) => out.push(node));
  return out;
}

describe.each(GENERATORS)("properties ($name layouts)", (generator) => {
  const base = GENERATORS.indexOf(generator) + 1;

  test("generated layouts are valid", () => {
    forEach(generator, base, (layout) => expect(validateLayout(layout)).toEqual([]));
  });

  test("every block appears exactly once in the reading order and in the tree", () => {
    forEach(generator, base * 10 + 1, (layout) => {
      const structure = inferStructure(layout);
      const ids = Object.keys(layout.blocks).sort();
      expect([...structure.order].sort()).toEqual(ids);
      const inTree = allNodes(structure).flatMap((node) => (node.kind === "block" ? [node.id] : []));
      expect(inTree.sort()).toEqual(ids);
    });
  });

  test("pure and idempotent: frozen input, deep-equal output every time", () => {
    forEach(generator, base * 10 + 2, (layout) => {
      deepFreeze(layout);
      const first = inferStructure(layout);
      expect(inferStructure(layout)).toEqual(first);
      const responsive = deriveResponsive(layout, first);
      expect(deriveResponsive(layout)).toEqual(responsive);
      expect(toCss(layout, { kind: "app" })).toBe(toCss(layout, { kind: "app", structure: first, responsive }));
      expect(toAsciiWireframe(layout, { breakpoint: "mobile" })).toBe(toAsciiWireframe(layout, { breakpoint: "mobile" }));
    });
  });

  test("the insertion order of the blocks record does not matter", () => {
    forEach(generator, base * 10 + 3, (layout, rand) => {
      const permuted = permuteBlocks(rand, layout);
      expect(inferStructure(permuted)).toEqual(inferStructure(layout));
      expect(deriveResponsive(permuted)).toEqual(deriveResponsive(layout));
      expect(toCss(permuted)).toBe(toCss(layout));
      expect(toAsciiWireframe(permuted, { numbered: true })).toBe(toAsciiWireframe(layout, { numbered: true }));
      expect(validateLayout(permuted)).toEqual(validateLayout(layout));
    });
  });

  test("grid areas are rectangles of the item's cells", () => {
    let checked = 0;
    forEach(generator, base * 10 + 4, (layout) => {
      for (const node of allNodes(inferStructure(layout))) {
        if (node.kind !== "grid") continue;
        expect(node.columns.reduce((a, b) => a + b, 0)).toBe(node.frame.w);
        if (!node.areas) continue;
        checked++;
        const cells = node.areas.map((line) => line.split(" "));
        expect(cells.every((line) => line.length === node.columns.length)).toBe(true);
        expect(cells.length).toBe(node.rows.length);
        for (const item of node.items) {
          const name = item.node.kind === "block" ? areaName(item.node.id) : "";
          let count = 0;
          cells.forEach((line, r) =>
            line.forEach((cell, c) => {
              const inside = r >= item.rowStart - 1 && r < item.rowEnd - 1 && c >= item.colStart - 1 && c < item.colEnd - 1;
              if (cell === name) count++;
              expect(cell === name).toBe(inside);
            }),
          );
          expect(count).toBe((item.rowEnd - item.rowStart) * (item.colEnd - item.colStart));
        }
      }
    });
    // Mosaics are where clean cuts fail without overlaps: make sure many real areas were checked.
    if (generator.name === "mosaic") expect(checked).toBeGreaterThan(RUNS / 4);
  });

  test("responsive covers every block once per breakpoint and never exceeds the columns", () => {
    forEach(generator, base * 10 + 5, (layout) => {
      const structure = inferStructure(layout);
      const responsive = deriveResponsive(layout, structure);
      for (const bp of ["tablet", "mobile"] as const) {
        const derived = responsive[bp];
        const columns = COLUMNS[bp];
        expect(Object.keys(derived.blocks).sort()).toEqual(Object.keys(layout.blocks).sort());
        const visible = structure.order.filter((id) => !derived.blocks[id]!.hidden);
        // A block inside a hidden block is hidden too.
        for (const [id, block] of Object.entries(layout.blocks)) {
          if (block.parentId && derived.blocks[block.parentId]?.hidden) expect(derived.blocks[id]!.hidden).toBe(true);
        }
        expect([...derived.order].sort()).toEqual([...visible].sort());
        expect(new Set(derived.order).size).toBe(derived.order.length);
        for (const [id, block] of Object.entries(derived.blocks)) {
          if (block.hidden) {
            expect(block.rect).toBeNull();
            continue;
          }
          expect(block.rect, id).not.toBeNull();
          const rect = block.rect!;
          expect(rect.col).toBeGreaterThanOrEqual(0);
          expect(rect.w).toBeGreaterThanOrEqual(1);
          expect(rect.col + rect.w).toBeLessThanOrEqual(columns);
          expect(rect.h).toBeGreaterThanOrEqual(1);
          if (bp === "mobile") expect(rect).toMatchObject({ col: 0, w: 4 });
        }
        for (const plan of Object.values(derived.nodes)) {
          if (plan.mode === "stack") continue;
          for (const span of plan.spans) expect(span).toBeLessThanOrEqual(columns);
          if (plan.mode === "keep") plan.starts.forEach((start, i) => expect(start + plan.spans[i]!).toBeLessThanOrEqual(columns));
        }
      }
    });
  });

  test("normalizeDrop never leaves a block out of bounds", () => {
    forEach(generator, base * 10 + 6, (layout, rand) => {
      const ids = Object.keys(layout.blocks);
      if (ids.length === 0) return;
      const id = ids[randInt(rand, 0, ids.length - 1)]!;
      const w = randInt(rand, 1, 16);
      const dropped = moveBlock(layout, id, { col: randInt(rand, -6, 14), row: randInt(rand, -10, 150), w, h: randInt(rand, 1, 50) });
      const { layout: next } = normalizeDrop(dropped, id);
      for (const block of Object.values(next.blocks)) expect(isInBounds(block.rect)).toBe(true);
      expect(validateLayout(next)).toEqual([]);
    });
  });
});

describe("jitter", () => {
  test("±1 jitter on separable layouts keeps the topology", () => {
    let nontrivial = 0;
    forEach(GENERATORS[1]!, 77, (layout, rand) => {
      const structure = inferStructure(layout);
      // The generator only makes clean cuts.
      expect(allNodes(structure).some((node) => node.kind === "grid")).toBe(false);
      if (structure.order.length > 3) nontrivial++;
      for (let k = 0; k < 3; k++) {
        const jittered = inferStructure(jitterLayout(rand, layout));
        expect(shape(jittered.root)).toBe(shape(structure.root));
        expect(jittered.order).toEqual(structure.order);
      }
    });
    expect(nontrivial).toBeGreaterThan(RUNS / 2);
  });
});

describe("realistic big layouts", () => {
  test("are valid and fully covered", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const layout = realisticLayout(mulberry32(seed), 200);
      expect(Object.keys(layout.blocks)).toHaveLength(200);
      expect(validateLayout(layout)).toEqual([]);
      const structure = inferStructure(layout);
      expect(structure.warnings).toEqual([]);
      expect(structure.order).toHaveLength(200);
    }
  });
});
