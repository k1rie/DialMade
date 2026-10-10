import { emptyLayout } from "./edit";
import { newBlockId } from "./ids";
import { sanitizeLabel } from "./sanitize";
import type {
  AppShell,
  BlockId,
  LayoutBlock,
  LayoutDoc,
  LibraryBlockType,
  ScreenKind,
  ScreenTemplate,
  ScreenTemplateId,
  SetTemplate,
  SetTemplateId,
  TemplateBlock,
} from "./types";

const b = (type: LibraryBlockType, col: number, row: number, w: number, h: number, count?: number): TemplateBlock =>
  count === undefined ? { type, rect: { col, row, w, h } } : { type, rect: { col, row, w, h }, count };

const SIDEBAR_HEADER: AppShell = { nav: "sidebar", header: true };
const NO_NAV: AppShell = { nav: "none", header: false };

/** Screen templates in the order «+ Pantalla» shows them. */
export const SCREEN_TEMPLATES: readonly ScreenTemplate[] = [
  {
    id: "home",
    kind: "landing",
    shell: null,
    blocks: [
      b("navbar", 0, 0, 12, 8),
      b("hero", 0, 8, 12, 60),
      b("logos", 0, 68, 12, 12),
      b("features", 0, 80, 12, 40),
      b("testimonials", 0, 120, 12, 40),
      b("pricing", 0, 160, 12, 60),
      b("cta", 0, 220, 12, 25),
      b("footer", 0, 245, 12, 25),
    ],
  },
  {
    id: "pricing",
    kind: "landing",
    shell: null,
    blocks: [
      b("navbar", 0, 0, 12, 8),
      b("text", 0, 8, 12, 16),
      b("pricing", 0, 24, 12, 60, 3),
      b("cta", 0, 84, 12, 25),
      b("footer", 0, 109, 12, 25),
    ],
  },
  { id: "login", kind: "app", shell: NO_NAV, blocks: [b("form", 0, 0, 6, 60), b("media", 6, 0, 6, 60)] },
  {
    id: "dashboard",
    kind: "app",
    shell: SIDEBAR_HEADER,
    blocks: [b("kpis", 0, 0, 12, 14, 4), b("chart", 0, 16, 8, 40), b("activity", 8, 16, 4, 40), b("table", 0, 58, 12, 50)],
  },
  { id: "settings", kind: "app", shell: SIDEBAR_HEADER, blocks: [b("settings", 0, 0, 8, 60), b("list", 8, 0, 4, 40)] },
  {
    id: "detail",
    kind: "app",
    shell: SIDEBAR_HEADER,
    blocks: [b("text", 0, 0, 12, 12), b("media", 0, 14, 8, 40), b("list", 8, 14, 4, 40), b("table", 0, 56, 12, 40)],
  },
  { id: "list", kind: "app", shell: SIDEBAR_HEADER, blocks: [b("table", 0, 0, 12, 70)] },
  { id: "checkout", kind: "app", shell: NO_NAV, blocks: [b("form", 0, 0, 8, 70), b("list", 8, 0, 4, 40)] },
  {
    id: "profile",
    kind: "app",
    shell: SIDEBAR_HEADER,
    blocks: [b("media", 0, 0, 4, 30), b("text", 4, 0, 8, 30), b("cards", 0, 32, 12, 30, 3)],
  },
  { id: "blank", kind: null, shell: null, blocks: [] },
];

/** Starting sets: several connected screens at once. */
export const SET_TEMPLATES: readonly SetTemplate[] = [
  { id: "saas-app", screens: ["dashboard", "settings", "login"] },
  { id: "landing", screens: ["home", "pricing"] },
];

export function getScreenTemplate(id: ScreenTemplateId): ScreenTemplate {
  const found = SCREEN_TEMPLATES.find((t) => t.id === id);
  if (!found) throw new TypeError(`Unknown screen template: ${JSON.stringify(id)}`);
  return found;
}

export function getSetTemplate(id: SetTemplateId): SetTemplate {
  const found = SET_TEMPLATES.find((t) => t.id === id);
  if (!found) throw new TypeError(`Unknown set template: ${JSON.stringify(id)}`);
  return found;
}

export type InstantiateOptions = {
  /** Visible name of each block (the app passes the i18n name of the type). */
  label: (type: LibraryBlockType) => string;
  /** Id factory (tests, seeded tools); `newBlockId` otherwise. */
  newId?: () => BlockId;
};

/** A new `LayoutDoc` from a template, with fresh ids and z in template order. */
export function instantiateTemplate(
  template: ScreenTemplate,
  options: InstantiateOptions,
): { layout: LayoutDoc; shell: AppShell | null; kind: ScreenKind | null } {
  const layout = emptyLayout();
  const ids: BlockId[] = [];
  const taken = new Set<BlockId>();
  for (let i = 0; i < template.blocks.length; i++) {
    const id = options.newId ? options.newId() : newBlockId(taken);
    if (taken.has(id)) throw new Error(`instantiateTemplate: duplicate id ${JSON.stringify(id)}`);
    taken.add(id);
    ids.push(id);
  }
  template.blocks.forEach((tb, i) => {
    const block: LayoutBlock = { type: tb.type, label: sanitizeLabel(options.label(tb.type)), rect: { ...tb.rect }, z: i + 1 };
    if (tb.count !== undefined) block.count = tb.count;
    if (tb.parent !== undefined && ids[tb.parent] !== undefined && tb.parent !== i) block.parentId = ids[tb.parent];
    layout.blocks[ids[i]!] = block;
  });
  return { layout, shell: template.shell ? { ...template.shell } : null, kind: template.kind };
}
