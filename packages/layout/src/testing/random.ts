import { DESKTOP_COLUMNS } from "../constants";
import { newBlockId } from "../ids";
import { LIBRARY } from "../library";
import { emptyLayout } from "../edit";
import type { BlockId, GridRect, LayoutBlock, LayoutDoc, LibraryBlockType } from "../types";

/** Seeded PRNG (mulberry32): floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

/** Integer in [min, max]. */
export const randInt = (rand: Rand, min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
export const pickOne = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
export const chance = (rand: Rand, p: number): boolean => rand() < p;

export function shuffle<T>(rand: Rand, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Leaf types for generated layouts: ready, not containers, not overlays, not frames. */
export const LEAF_TYPES: readonly LibraryBlockType[] = LIBRARY.filter(
  (d) => d.status === "ready" && !d.container && !d.overlay && !d.frame,
).map((d) => d.type);

const NOTES = ["calendario semanal", "3 planes", "login", "×4", "buscador", "lado a lado", "monthly", "cinco items"];

class Builder {
  readonly layout: LayoutDoc = emptyLayout();
  private z = 0;
  constructor(readonly rand: Rand) {}

  get size(): number {
    return Object.keys(this.layout.blocks).length;
  }

  add(type: LibraryBlockType, rect: GridRect, parentId?: BlockId, extras = true): BlockId {
    const id = newBlockId(this.layout.blocks, this.rand);
    const block: LayoutBlock = { type, label: `${type} ${this.size + 1}`, rect, z: ++this.z };
    if (parentId) block.parentId = parentId;
    if (extras) decorate(this.rand, block);
    this.layout.blocks[id] = block;
    return id;
  }
}

/** Optional fields that do not change the structure: counts, notes, visibility and mobile overrides. */
function decorate(rand: Rand, block: LayoutBlock): void {
  const def = LIBRARY.find((d) => d.type === block.type)!;
  if (def.repeatable && chance(rand, 0.4)) block.count = randInt(rand, def.repeatable.min, def.repeatable.max);
  if (chance(rand, 0.2)) block.note = pickOne(rand, NOTES);
  if (chance(rand, 0.05)) block.hidden = true;
  if (chance(rand, 0.1)) block.responsive = { mobile: { behavior: pickOne(rand, def.mobileOptions) } };
  if (chance(rand, 0.05)) block.responsive = { ...block.responsive, tablet: { hidden: true } };
}

/**
 * A layout that cuts cleanly: a stack of bands (≥1 row apart), each one a single leaf, a row of 2–3 cells
 * (≥1 column apart) or a container with nested content (padding 2). Sizes keep jitter of ±1 inside the cut
 * tolerance: every block ≥3 units on both axes and row cells ≥6 rows tall, so a jitter of ±1 never changes
 * the topology.
 */
export function randomSeparableLayout(rand: Rand, options: { maxBlocks?: number; maxDepth?: number } = {}): LayoutDoc {
  const builder = new Builder(rand);
  const maxBlocks = options.maxBlocks ?? 40;
  const maxDepth = options.maxDepth ?? 2;

  /** Fills [col, col + w) from `top`; returns the bottom row. */
  const stack = (col: number, w: number, top: number, depth: number, parentId?: BlockId): number => {
    const bands = randInt(rand, 1, 4);
    let cursor = top;
    for (let band = 0; band < bands && builder.size < maxBlocks; band++) {
      if (band > 0) cursor += randInt(rand, 1, 4);
      const roll = rand();
      if (w >= 7 && roll < 0.45) {
        cursor = row(col, w, cursor, depth, parentId);
      } else if (w >= 7 && depth < maxDepth && roll < 0.6) {
        cursor = container(col, w, cursor, depth, parentId);
      } else {
        const bw = randInt(rand, 3, w);
        const bc = col + randInt(rand, 0, w - bw);
        const h = randInt(rand, 3, 30);
        builder.add(pickOne(rand, LEAF_TYPES), { col: bc, row: cursor, w: bw, h }, parentId);
        cursor += h;
      }
    }
    return cursor;
  };

  const container = (col: number, w: number, top: number, depth: number, parentId?: BlockId): number => {
    const id = builder.add("container", { col, row: top, w, h: 1 }, parentId);
    const contentBottom = stack(col + 2, w - 4, top + 2, depth + 1, id);
    const h = contentBottom + 2 - top;
    builder.layout.blocks[id] = { ...builder.layout.blocks[id]!, rect: { col, row: top, w, h } };
    return top + h;
  };

  const row = (col: number, w: number, top: number, depth: number, parentId?: BlockId): number => {
    const max = Math.min(3, Math.floor((w + 1) / 4));
    const n = randInt(rand, 2, Math.max(2, max));
    // Widths ≥3 and gaps ≥1, the spare columns spread at random.
    const widths = Array.from({ length: n }, () => 3);
    const gaps = Array.from({ length: n - 1 }, () => 1);
    let spare = w - 3 * n - (n - 1);
    let lead = 0;
    while (spare > 0) {
      const slot = randInt(rand, 0, 2 * n);
      if (slot < n) widths[slot]! += 1;
      else if (slot < 2 * n - 1) gaps[slot - n]! += 1;
      else lead += 1;
      spare--;
    }
    let x = col + Math.min(lead, w - widths.reduce((a, b) => a + b, 0) - gaps.reduce((a, b) => a + b, 0));
    let bottom = top;
    widths.forEach((cw, i) => {
      if (builder.size >= maxBlocks && i > 0) return;
      let cellBottom: number;
      if (cw >= 7 && depth < maxDepth && chance(rand, 0.3)) {
        cellBottom = container(x, cw, top, depth, parentId);
      } else {
        const h = randInt(rand, 6, 40);
        builder.add(pickOne(rand, LEAF_TYPES), { col: x, row: top, w: cw, h }, parentId);
        cellBottom = top + h;
      }
      bottom = Math.max(bottom, cellBottom);
      x += cw + (gaps[i] ?? 0);
    });
    return bottom;
  };

  stack(0, DESKTOP_COLUMNS, randInt(rand, 0, 4), 0);
  return builder.layout;
}

/**
 * Any valid layout: random rects (overlaps allowed), every type (soon blocks, modal, containers), random
 * explicit parents, counts and notes. Valid for `validateLayout`, messy for the engine.
 */
export function randomLayout(rand: Rand, options: { maxBlocks?: number; count?: number } = {}): LayoutDoc {
  const builder = new Builder(rand);
  const n = options.count ?? randInt(rand, 0, options.maxBlocks ?? 24);
  const types = LIBRARY.map((d) => d.type);
  const ids: BlockId[] = [];
  for (let i = 0; i < n; i++) {
    const type = chance(rand, 0.15) ? "container" : pickOne(rand, types);
    const w = randInt(rand, 1, DESKTOP_COLUMNS);
    let rect: GridRect = { col: randInt(rand, 0, DESKTOP_COLUMNS - w), row: randInt(rand, 0, 120), w, h: randInt(rand, 1, 40) };
    let parentId: BlockId | undefined;
    const containers = ids.filter((id) => {
      const block = builder.layout.blocks[id]!;
      return block.type === "container" || block.type === "modal";
    });
    if (containers.length > 0 && chance(rand, 0.35)) {
      parentId = pickOne(rand, containers);
      const p = builder.layout.blocks[parentId]!.rect;
      const cw = randInt(rand, 1, p.w);
      const ch = randInt(rand, 1, p.h);
      rect = { col: p.col + randInt(rand, 0, p.w - cw), row: p.row + randInt(rand, 0, p.h - ch), w: cw, h: ch };
    }
    ids.push(builder.add(type, rect, parentId));
  }
  return builder.layout;
}

/** Random rects without overlaps (rejection sampling): non-guillotine arrangements (bento, pinwheels) appear. */
export function randomPackedLayout(rand: Rand, options: { attempts?: number } = {}): LayoutDoc {
  const builder = new Builder(rand);
  const placed: GridRect[] = [];
  const attempts = options.attempts ?? 60;
  for (let i = 0; i < attempts; i++) {
    const w = randInt(rand, 2, 8);
    const h = randInt(rand, 2, 24);
    const rect = { col: randInt(rand, 0, DESKTOP_COLUMNS - w), row: randInt(rand, 0, 60), w, h };
    const clash = placed.some(
      (r) => r.col < rect.col + rect.w && rect.col < r.col + r.w && r.row < rect.row + rect.h && rect.row < r.row + r.h,
    );
    if (clash) continue;
    placed.push(rect);
    builder.add(pickOne(rand, LEAF_TYPES), rect);
  }
  return builder.layout;
}

/** Unit grids with no straight cut (pinwheels and bentos), one letter per block. */
const MOSAICS: readonly (readonly string[])[] = [
  ["aab", "deb", "dcc"],
  ["aabb", "aacd", "effd"],
  ["aaab", "deeb", "deeb", "dccc"],
];

/**
 * Mosaics where clean cuts fail without overlaps: a pinwheel or bento pattern (mirrored at random, with
 * random column and row sizes) or a random rectangular partition, sometimes between a header and a footer.
 */
export function randomMosaicLayout(rand: Rand): LayoutDoc {
  const builder = new Builder(rand);
  let cursor = 0;
  if (chance(rand, 0.4)) {
    const h = randInt(rand, 4, 10);
    builder.add(pickOne(rand, LEAF_TYPES), { col: 0, row: 0, w: 12, h });
    cursor = h + randInt(rand, 0, 3);
  }
  const cells: string[][] = chance(rand, 0.75) ? pickOne(rand, MOSAICS).map((line) => [...line]) : partition(rand);
  if (chance(rand, 0.5)) cells.forEach((line) => line.reverse());
  if (chance(rand, 0.5)) cells.reverse();
  const units = cells[0]!.length;
  // Column sizes: 12 split into `units` parts of ≥2; row sizes 8–24.
  const widths = Array.from({ length: units }, () => 2);
  for (let spare = DESKTOP_COLUMNS - 2 * units; spare > 0; spare--) widths[randInt(rand, 0, units - 1)]! += 1;
  const heights = cells.map(() => randInt(rand, 8, 24));
  const x = (c: number) => widths.slice(0, c).reduce((a, b) => a + b, 0);
  const y = (r: number) => cursor + heights.slice(0, r).reduce((a, b) => a + b, 0);
  const seen = new Set<string>();
  cells.forEach((line, r) =>
    line.forEach((name, c) => {
      if (name === "." || seen.has(name)) return;
      seen.add(name);
      let w = 1;
      while (line[c + w] === name) w++;
      let h = 1;
      while (cells[r + h]?.[c] === name) h++;
      builder.add(pickOne(rand, LEAF_TYPES), { col: x(c), row: y(r), w: x(c + w) - x(c), h: y(r + h) - y(r) });
    }),
  );
  if (chance(rand, 0.4)) {
    builder.add(pickOne(rand, LEAF_TYPES), { col: 0, row: y(cells.length) + randInt(rand, 0, 3), w: 12, h: randInt(rand, 6, 20) });
  }
  return builder.layout;
}

/** A random rectangular partition of a 3–4 × 2–4 unit grid, some cells left empty (`.`). */
function partition(rand: Rand): string[][] {
  const units = randInt(rand, 3, 4);
  const rows = randInt(rand, 2, 4);
  const cells = Array.from({ length: rows }, () => Array.from({ length: units }, () => ""));
  let next = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < units; c++) {
      if (cells[r]![c]) continue;
      let maxW = 0;
      while (c + maxW < units && !cells[r]![c + maxW]) maxW++;
      const w = randInt(rand, 1, maxW);
      let h = randInt(rand, 1, rows - r);
      while (h > 1 && cells.slice(r, r + h).some((line) => line.slice(c, c + w).some(Boolean))) h--;
      const name = chance(rand, 0.1) ? "." : String.fromCharCode(97 + next++);
      for (let rr = r; rr < r + h; rr++) for (let cc = c; cc < c + w; cc++) cells[rr]![cc] = name;
    }
  }
  return cells;
}

/** Moves every block by -1, 0 or +1 on each axis, kept inside the grid. */
export function jitterLayout(rand: Rand, layout: LayoutDoc, amount = 1): LayoutDoc {
  const blocks: Record<BlockId, LayoutBlock> = {};
  for (const [id, block] of Object.entries(layout.blocks)) {
    const { col, row, w, h } = block.rect;
    const nc = Math.min(DESKTOP_COLUMNS - w, Math.max(0, col + randInt(rand, -amount, amount)));
    const nr = Math.max(0, row + randInt(rand, -amount, amount));
    blocks[id] = { ...block, rect: { col: nc, row: nr, w, h } };
  }
  return { ...layout, blocks };
}

/** Same blocks, keys inserted in a random order. */
export function permuteBlocks(rand: Rand, layout: LayoutDoc): LayoutDoc {
  const blocks: Record<BlockId, LayoutBlock> = {};
  for (const id of shuffle(rand, Object.keys(layout.blocks))) blocks[id] = layout.blocks[id]!;
  return { ...layout, blocks };
}

/**
 * A realistic big screen for performance: sections stacked like a long landing or app page — full-width
 * blocks, rows of 2–4 cells, containers with card rows and containers with nested rows.
 */
export function realisticLayout(rand: Rand, count = 200): LayoutDoc {
  const builder = new Builder(rand);
  let cursor = 0;
  const left = () => count - builder.size;
  while (left() > 0) {
    const roll = rand();
    if (roll < 0.25 || left() < 4) {
      const h = randInt(rand, 8, 40);
      builder.add(pickOne(rand, LEAF_TYPES), { col: 0, row: cursor, w: 12, h });
      cursor += h + randInt(rand, 0, 4);
    } else if (roll < 0.55) {
      const n = Math.min(left(), pickOne(rand, [2, 3, 4]));
      const w = Math.floor(12 / n);
      const h = randInt(rand, 20, 40);
      for (let i = 0; i < n; i++) builder.add(pickOne(rand, LEAF_TYPES), { col: i * w, row: cursor, w, h });
      cursor += h + 2;
    } else if (roll < 0.8) {
      const n = Math.min(left() - 1, pickOne(rand, [3, 4, 6]));
      const h = randInt(rand, 24, 40);
      const id = builder.add("container", { col: 0, row: cursor, w: 12, h: h + 4 });
      const w = Math.floor(12 / n);
      for (let i = 0; i < n; i++) builder.add("cards", { col: i * w, row: cursor + 2, w, h }, id);
      cursor += h + 6;
    } else {
      const id = builder.add("container", { col: 0, row: cursor, w: 12, h: 64 });
      const side = builder.add("list", { col: 0, row: cursor + 2, w: 3, h: 60 }, id);
      void side;
      const inner = builder.add("container", { col: 4, row: cursor + 2, w: 8, h: 60 }, id);
      const k = Math.min(Math.max(0, left()), 4);
      for (let i = 0; i < k; i++) {
        builder.add(pickOne(rand, LEAF_TYPES), { col: 4 + (i % 2) * 4, row: cursor + 4 + Math.floor(i / 2) * 28, w: 4, h: 26 }, inner);
      }
      cursor += 66;
    }
  }
  return builder.layout;
}
