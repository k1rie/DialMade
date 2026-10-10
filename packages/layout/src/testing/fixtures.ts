import { emptyLayout } from "../edit";
import type { BlockId, LayoutBlock, LayoutDoc, LibraryBlockType, ScreenKind } from "../types";

export type FixtureBlock = {
  id: BlockId;
  type: LibraryBlockType;
  rect: [col: number, row: number, w: number, h: number];
  label?: string;
  parent?: BlockId;
  z?: number;
  count?: number;
  note?: string;
};

/** Builds a `LayoutDoc` from compact rows; z follows the list order unless given. */
export function makeLayout(rows: readonly FixtureBlock[]): LayoutDoc {
  const layout = emptyLayout();
  rows.forEach((row, i) => {
    const [col, r, w, h] = row.rect;
    const block: LayoutBlock = { type: row.type, label: row.label ?? row.id, rect: { col, row: r, w, h }, z: row.z ?? i + 1 };
    if (row.parent) block.parentId = row.parent;
    if (row.count !== undefined) block.count = row.count;
    if (row.note !== undefined) block.note = row.note;
    layout.blocks[row.id] = block;
  });
  return layout;
}

export type Fixture = { name: string; kind: ScreenKind; layout: LayoutDoc };

/** Golden fixtures: each one fixes the structure, the CSS and the wireframe. */
export const FIXTURES: readonly Fixture[] = [
  {
    name: "holy-grail",
    kind: "landing",
    layout: makeLayout([
      { id: "header", type: "navbar", rect: [0, 0, 12, 8], label: "Header" },
      { id: "nav", type: "sidebar", rect: [0, 10, 2, 60], label: "Nav" },
      { id: "main", type: "text", rect: [2, 10, 8, 60], label: "Main" },
      { id: "aside", type: "list", rect: [10, 10, 2, 60], label: "Aside" },
      { id: "footer", type: "footer", rect: [0, 72, 12, 20], label: "Footer" },
    ]),
  },
  {
    name: "dashboard",
    kind: "app",
    layout: makeLayout([
      { id: "kpis", type: "kpis", rect: [0, 0, 12, 14], label: "KPIs", count: 4 },
      { id: "chart", type: "chart", rect: [0, 16, 8, 40], label: "Revenue" },
      { id: "activity", type: "activity", rect: [8, 16, 4, 40], label: "Activity" },
      { id: "table", type: "table", rect: [0, 58, 12, 50], label: "Orders" },
    ]),
  },
  {
    name: "stacked-landing",
    kind: "landing",
    layout: makeLayout([
      { id: "navbar", type: "navbar", rect: [0, 0, 12, 8], label: "Navbar" },
      { id: "hero", type: "hero", rect: [0, 8, 12, 60], label: "Hero" },
      { id: "logos", type: "logos", rect: [0, 68, 12, 12], label: "Logos" },
      { id: "features", type: "features", rect: [0, 80, 12, 40], label: "Features", count: 3 },
      { id: "testimonials", type: "testimonials", rect: [0, 120, 12, 40], label: "Testimonials" },
      { id: "pricing", type: "pricing", rect: [0, 160, 12, 60], label: "Pricing", count: 3 },
      { id: "cta", type: "cta", rect: [0, 220, 12, 25], label: "CTA" },
      { id: "footer", type: "footer", rect: [0, 245, 12, 25], label: "Footer" },
    ]),
  },
  {
    // A A B B / A A C D / E F F D: no straight cut crosses it.
    name: "bento",
    kind: "landing",
    layout: makeLayout([
      { id: "a", type: "media", rect: [0, 0, 6, 40], label: "Showcase" },
      { id: "b", type: "text", rect: [6, 0, 6, 20], label: "Intro" },
      { id: "c", type: "chart", rect: [6, 20, 3, 20], label: "Growth" },
      { id: "d", type: "list", rect: [9, 20, 3, 40], label: "Changelog" },
      { id: "e", type: "text", rect: [0, 40, 3, 20], label: "Quote" },
      { id: "f", type: "cards", rect: [3, 40, 6, 20], label: "Cards", count: 2 },
    ]),
  },
  {
    // A A B / D E B / D C C
    name: "pinwheel",
    kind: "landing",
    layout: makeLayout([
      { id: "north", type: "text", rect: [0, 0, 9, 20], label: "North" },
      { id: "east", type: "media", rect: [9, 0, 3, 40], label: "East" },
      { id: "west", type: "media", rect: [0, 20, 3, 40], label: "West" },
      { id: "center", type: "cards", rect: [3, 20, 6, 20], label: "Center", count: 2 },
      { id: "south", type: "text", rect: [3, 40, 9, 20], label: "South" },
    ]),
  },
  {
    name: "nested-cards",
    kind: "landing",
    layout: makeLayout([
      { id: "navbar", type: "navbar", rect: [0, 0, 12, 8], label: "Navbar" },
      { id: "plans", type: "container", rect: [0, 10, 12, 40], label: "Plans" },
      { id: "card-a", type: "text", rect: [1, 12, 3, 36], label: "Card A", parent: "plans" },
      { id: "card-b", type: "text", rect: [5, 12, 3, 36], label: "Card B", parent: "plans" },
      { id: "card-c", type: "text", rect: [9, 12, 2, 36], label: "Card C", parent: "plans" },
      { id: "footer", type: "footer", rect: [0, 52, 12, 20], label: "Footer" },
    ]),
  },
  {
    name: "modal-overlay",
    kind: "app",
    layout: makeLayout([
      { id: "table", type: "table", rect: [0, 0, 12, 60], label: "Customers" },
      { id: "dialog", type: "modal", rect: [3, 10, 6, 30], label: "Invite" },
      { id: "invite-form", type: "form", rect: [4, 14, 4, 20], label: "Invite form", parent: "dialog" },
    ]),
  },
  {
    // ±1 misalignments the tolerance absorbs: a 1-row overlap, a 1-row offset and a 1-column overlap.
    name: "misaligned",
    kind: "landing",
    layout: makeLayout([
      { id: "navbar", type: "navbar", rect: [0, 0, 12, 8], label: "Navbar" },
      { id: "hero", type: "hero", rect: [0, 7, 12, 40], label: "Hero" },
      { id: "copy", type: "text", rect: [0, 48, 6, 30], label: "Copy" },
      { id: "shot", type: "media", rect: [6, 49, 6, 29], label: "Screenshot" },
      { id: "cards", type: "cards", rect: [0, 80, 4, 20], label: "Cards", count: 2 },
      { id: "list", type: "list", rect: [3, 80, 5, 20], label: "List" },
      { id: "form", type: "form", rect: [8, 81, 4, 20], label: "Form" },
    ]),
  },
  {
    name: "partial-overlap",
    kind: "landing",
    layout: makeLayout([
      { id: "copy", type: "text", rect: [0, 0, 8, 30], label: "Copy" },
      { id: "photo", type: "media", rect: [4, 10, 8, 30], label: "Photo" },
      { id: "footer", type: "footer", rect: [0, 45, 12, 10], label: "Footer" },
    ]),
  },
  { name: "empty", kind: "landing", layout: makeLayout([]) },
  {
    name: "single",
    kind: "landing",
    layout: makeLayout([{ id: "intro", type: "text", rect: [3, 4, 6, 20], label: "Intro", note: "two columns of copy" }]),
  },
];

export function fixture(name: string): Fixture {
  const found = FIXTURES.find((f) => f.name === name);
  if (!found) throw new Error(`Unknown fixture ${name}`);
  return found;
}
