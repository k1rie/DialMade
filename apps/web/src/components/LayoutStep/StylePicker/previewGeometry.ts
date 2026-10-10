import {
  getBlockDef,
  getScreenTemplate,
  isLibraryBlockType,
  type AppNav,
  type AppShell,
  type BlockId,
  type LayoutBlock,
  type LayoutDoc,
  type LibraryBlockType,
  type ScreenKind,
  type ScreenTemplateId,
} from "@dialmade/layout";
// Relative imports only: vitest runs this module without the `@/` alias.
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import { PREVIEW_GAP_PX, PREVIEW_HEIGHT, PREVIEW_PAD_PX, PREVIEW_WIDTH } from "./constants";

/*
 * Geometry of a style preview: the top 1440 × 900 design px of a screen (8:5), with the app's navigation
 * frame and page header, and every visible block as a box in percentages of the preview. Percentages need
 * no measuring and no CSS scale(): the preview box can be any width. Pure and memoised per LayoutDoc
 * identity (the store never mutates a layout), so the 13 previews share one geometry per layout version.
 */

/** A rectangle in percentages of the preview (left/width of its width, top/height of its height). */
export type PreviewBox = { left: number; top: number; width: number; height: number };

export type FrameNav = Exclude<AppNav, "none">;

export type PreviewBlock = {
  id: BlockId;
  type: LibraryBlockType;
  /** ×N of repeatable blocks (`undefined` = the block's default). */
  count: number | undefined;
  /** Size in design px, so a glyph can decide how many rows or items fit. */
  widthPx: number;
  heightPx: number;
  /** Nesting depth (0 = root); painting order is depth, then z. */
  depth: number;
  box: PreviewBox;
};

export type PreviewGeometry = {
  nav: { kind: FrameNav; box: PreviewBox; widthPx: number; heightPx: number } | null;
  header: { box: PreviewBox; widthPx: number; heightPx: number } | null;
  /** Visible blocks in painting order (parents under children, then z). */
  blocks: readonly PreviewBlock[];
  /** `true` when the screen has no blocks and the preview paints the matching template instead. */
  sample: boolean;
};

/** Template painted when the screen has no blocks: Inicio for landing screens, Dashboard for app screens. */
export const SAMPLE_TEMPLATE: Readonly<Record<ScreenKind, ScreenTemplateId>> = { landing: "home", app: "dashboard" };

const round = (value: number) => Math.round(value * 1000) / 1000;
const pctX = (px: number) => round((px / PREVIEW_WIDTH) * 100);
const pctY = (px: number) => round((px / PREVIEW_HEIGHT) * 100);
const toBox = (left: number, top: number, width: number, height: number): PreviewBox => ({
  left: pctX(left),
  top: pctY(top),
  width: pctX(width),
  height: pctY(height),
});

/**
 * Depth of every block that is visible on desktop. Hiding is inherited (a block inside a hidden one is
 * hidden too); a missing parent or a cycle counts as the root, like `inferStructure`.
 */
function visibleDepths(layout: LayoutDoc): Map<BlockId, number> {
  const blocks = layout.blocks;
  const result = new Map<BlockId, number>();
  const limit = Object.keys(blocks).length;
  for (const [id, block] of Object.entries(blocks)) {
    let depth = 0;
    let hidden = block.hidden === true;
    const seen = new Set<BlockId>([id]);
    let parentId = block.parentId;
    while (parentId !== undefined && !hidden && depth < limit) {
      const parent = blocks[parentId];
      if (!parent || seen.has(parentId)) break;
      seen.add(parentId);
      hidden = parent.hidden === true;
      depth += 1;
      parentId = parent.parentId;
    }
    if (!hidden) result.set(id, depth);
  }
  return result;
}

const byPaintOrder =
  (layout: LayoutDoc, depths: Map<BlockId, number>) =>
  (a: BlockId, b: BlockId): number => {
    const blockA = layout.blocks[a] as LayoutBlock;
    const blockB = layout.blocks[b] as LayoutBlock;
    return (
      (depths.get(a) ?? 0) - (depths.get(b) ?? 0) ||
      blockA.z - blockB.z ||
      blockA.rect.row - blockB.rect.row ||
      blockA.rect.col - blockB.rect.col ||
      (a < b ? -1 : a > b ? 1 : 0)
    );
  };

/*
 * Every PreviewBlock is cached per block object, so a new layout version keeps the same PreviewBlock (and
 * `box`) for the blocks it did not touch, and the memoised glyphs of the 13 previews skip them. The key
 * holds everything else the result depends on: the id, the frame offsets, the grid and the nesting depth
 * (a parent change moves a child without touching the child's object).
 */
const previewBlocks = new WeakMap<LayoutBlock, Map<string, PreviewBlock>>();

function previewBlockOf(id: BlockId, block: LayoutBlock, key: string, build: () => PreviewBlock): PreviewBlock {
  let perBlock = previewBlocks.get(block);
  const cacheKey = `${id}|${key}`;
  const hit = perBlock?.get(cacheKey);
  if (hit) return hit;
  const result = build();
  if (!perBlock) previewBlocks.set(block, (perBlock = new Map()));
  perBlock.set(cacheKey, result);
  return result;
}

/**
 * Geometry of a layout on a screen of `kind` with `shell` (only app screens draw a frame). The geometry
 * object is new on every call; its PreviewBlocks are reused per block (see `previewBlockOf`).
 */
export function computePreviewGeometry(layout: LayoutDoc, kind: ScreenKind, shell: AppShell | null, sample = false): PreviewGeometry {
  const appShell = kind === "app" ? shell : null;
  const navKind: FrameNav | null = appShell && appShell.nav !== "none" ? appShell.nav : null;
  const navW = navKind === "sidebar" || navKind === "rail" ? NAV_FRAME_PX[navKind] : 0;
  const navH = navKind === "topnav" ? NAV_FRAME_PX.topnav : 0;
  const headerH = appShell?.header ? HEADER_STRIP_PX : 0;

  const nav = navKind
    ? navKind === "topnav"
      ? { kind: navKind, box: toBox(0, 0, PREVIEW_WIDTH, navH), widthPx: PREVIEW_WIDTH, heightPx: navH }
      : { kind: navKind, box: toBox(0, 0, navW, PREVIEW_HEIGHT), widthPx: navW, heightPx: PREVIEW_HEIGHT }
    : null;
  const header = headerH
    ? { box: toBox(navW, navH, PREVIEW_WIDTH - navW, headerH), widthPx: PREVIEW_WIDTH - navW, heightPx: headerH }
    : null;

  const originX = navW + PREVIEW_PAD_PX;
  const originY = navH + headerH + PREVIEW_PAD_PX;
  const colPx = (PREVIEW_WIDTH - navW - 2 * PREVIEW_PAD_PX) / layout.columns;
  const depths = visibleDepths(layout);
  const ids = [...depths.keys()].sort(byPaintOrder(layout, depths));

  const frameKey = `${navW}|${navH}|${headerH}|${layout.columns}|${layout.rowUnit}`;

  const blocks: PreviewBlock[] = [];
  for (const id of ids) {
    const block = layout.blocks[id] as LayoutBlock;
    const depth = depths.get(id) ?? 0;
    // Nested blocks sit a little further in, so a child flush with its container still reads apart.
    const inset = (PREVIEW_GAP_PX / 2) * (1 + depth);
    const top = originY + block.rect.row * layout.rowUnit + inset;
    if (top >= PREVIEW_HEIGHT) continue; // below the fold
    blocks.push(
      previewBlockOf(id, block, `${frameKey}|${depth}`, () => {
        const left = originX + block.rect.col * colPx + inset;
        const widthPx = Math.max(1, block.rect.w * colPx - 2 * inset);
        const heightPx = Math.max(1, block.rect.h * layout.rowUnit - 2 * inset);
        return {
          id,
          type: isLibraryBlockType(block.type) ? block.type : "free",
          count: block.count,
          widthPx: round(widthPx),
          heightPx: round(heightPx),
          depth,
          box: toBox(left, top, widthPx, heightPx),
        };
      }),
    );
  }
  return { nav, header, blocks, sample };
}

/* ---- Templates for empty screens ---- */

const templateLayouts = new Map<ScreenTemplateId, LayoutDoc>();

/** LayoutDoc of a screen template with deterministic ids (`tpl-0`…): no randomness during render. */
export function templateLayout(templateId: ScreenTemplateId): LayoutDoc {
  let layout = templateLayouts.get(templateId);
  if (!layout) {
    const blocks: Record<BlockId, LayoutBlock> = {};
    getScreenTemplate(templateId).blocks.forEach((item, index) => {
      blocks[`tpl-${index}`] = {
        type: item.type,
        label: item.type,
        rect: { ...item.rect },
        z: 0,
        ...(item.count !== undefined && { count: item.count }),
        ...(item.parent !== undefined && { parentId: `tpl-${item.parent}` }),
      };
    });
    layout = { version: 1, columns: 12, rowUnit: 8, blocks };
    templateLayouts.set(templateId, layout);
  }
  return layout;
}

/** No screen or a screen without blocks: its preview paints the matching template (`sample`). */
export function isSampleLayout(layout: LayoutDoc | null): boolean {
  return !layout || Object.keys(layout.blocks).length === 0;
}

/* ---- Cache ---- */

const geometries = new WeakMap<LayoutDoc, Map<string, PreviewGeometry>>();

const shellKey = (kind: ScreenKind, shell: AppShell | null) =>
  kind === "app" && shell ? `${kind}|${shell.nav}|${shell.header ? 1 : 0}` : kind;

/**
 * Geometry of a screen's preview, memoised per layout object and frame. A screen without blocks (or no
 * screen) paints the matching template: Inicio for landing, Dashboard with the screen's frame for apps.
 */
export function getPreviewGeometry(layout: LayoutDoc | null, kind: ScreenKind, shell: AppShell | null): PreviewGeometry {
  const sample = isSampleLayout(layout);
  const templateId = SAMPLE_TEMPLATE[kind];
  const source = !layout || sample ? templateLayout(templateId) : layout;
  const frame = sample && kind === "app" ? (shell ?? getScreenTemplate(templateId).shell) : shell;
  const key = shellKey(kind, frame);
  let perLayout = geometries.get(source);
  const hit = perLayout?.get(key);
  if (hit) return hit;
  const geometry = computePreviewGeometry(source, kind, frame, sample);
  if (!perLayout) geometries.set(source, (perLayout = new Map()));
  perLayout.set(key, geometry);
  return geometry;
}

/** Items a repeatable block shows: its count, else the library default; `fallback` for other types. */
export function itemCount(type: LibraryBlockType, count: number | undefined, fallback: number): number {
  const repeatable = getBlockDef(type).repeatable;
  if (!repeatable) return count ?? fallback;
  return Math.min(repeatable.max, Math.max(repeatable.min, count ?? repeatable.default));
}
