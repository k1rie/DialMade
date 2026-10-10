// From a validated answer (hosted, BYOK, «mi Claude» or the deterministic fallback) to layouts the canvas can show.
// Nothing of the model reaches the canvas as it came: block types must be library types (an unknown one is mapped,
// or becomes a «Bloque libre»), rects are rounded and clamped, small overlaps are clipped and large ones moved
// below by @dialmade/layout (`normalizeDrop`, `applyFix`), and every change is reported as a warning the variant
// card shows before the user applies it. Pure and client-safe.
import { getStyleRecipe } from "@dialmade/catalog";
import {
  applyFix,
  DESKTOP_COLUMNS,
  emptyLayout,
  findFreeSlot,
  getBlockDef,
  inferStructure,
  isLibraryBlockType,
  isLinkableBlockType,
  normalizeDrop,
  sanitizeLabel,
  sanitizeLine,
  sanitizeNote,
  validateLayout,
  type AppNav,
  type AppShell,
  type BlockId,
  type GridRect,
  type LayoutBlock,
  type LayoutDoc,
  type LibraryBlockType,
  type ScreenKind,
} from "@dialmade/layout";
import { KEEP_FREE, MAP_BLOCK_TYPES, PROPOSAL_BLOCK_TYPES, PROPOSAL_MAX_HEIGHT, PROPOSAL_MAX_ROW } from "./constants";
import type { MapAnswer, ProposalAnswer, ProposalScreenAnswer } from "./schema";

/** What normalization changed or could not keep, per variant. Shown on its card («3 ajustes»). */
export type ProposalWarning =
  /** A type outside the library: mapped to the closest library block (`to`), or to «Bloque libre». */
  | { code: "mapped-type"; screen: string; label: string; from: string; to: LibraryBlockType }
  /** A navbar or sidebar box on an app screen: it became the screen's navigation frame. */
  | { code: "nav-frame"; screen: string; label: string; nav: AppNav }
  /** The rect was off the grid (outside the 12 columns, too tall, not whole numbers): clamped. */
  | { code: "clamped"; screen: string; label: string }
  /** No usable rect: placed in the next free slot. */
  | { code: "placed"; screen: string; label: string }
  /** A small overlap with a neighbor: trimmed. */
  | { code: "clipped"; screen: string; label: string }
  /** A large overlap: moved below `below`. */
  | { code: "moved"; screen: string; label: string; below: string }
  /** An overlap no fix could solve: it stays, and the canvas shows its warning. */
  | { code: "overlap"; screen: string; labels: [string, string] }
  /** A link to a screen that does not exist, or from a block that has nothing to click: dropped. */
  | { code: "link-dropped"; screen: string; label: string }
  /** Screens or blocks past the limits, or screens left without blocks: dropped. */
  | { code: "trimmed"; count: number }
  /** A style that is not in the catalog: the current style stays. */
  | { code: "recipe-unknown" };

export type ProposalWarningCode = ProposalWarning["code"];

/** One proposed screen, ready for the store (`applyProposal` gives it real ids). */
export type ProposedScreen = {
  /** Stable inside the proposal (`linkTo` of its blocks points at these keys). */
  key: string;
  name: string;
  kind: ScreenKind;
  route: string;
  shell: AppShell | null;
  layout: LayoutDoc;
};

export type LayoutProposal = {
  id: string;
  name: string;
  rationale: string;
  /** A catalog recipe; `null` keeps the current style. */
  recipeId: string | null;
  recipeReason: string;
  screens: ProposedScreen[];
  warnings: ProposalWarning[];
};

export type NormalizeOptions = {
  /** Unknown type → a library type (the client passes the library search with its es/en synonyms). */
  mapType?: (raw: string) => LibraryBlockType | null;
  /** Default block label when the answer has none (the client passes the i18n block name). */
  labelFor?: (type: LibraryBlockType) => string;
  /** Default screen name («Pantalla 2»). */
  screenName?: (index: number) => string;
  /** Prefix of the ids (several calls never share one). */
  idPrefix?: string;
};

const PROPOSAL_TYPES: ReadonlySet<string> = new Set(PROPOSAL_BLOCK_TYPES);
const MAP_TYPES: ReadonlySet<string> = new Set(MAP_BLOCK_TYPES);
const ROUTE_RE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
const ROUTE_MAX = 96;
const NAME_MAX = 40;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Lowercase ASCII slug of a name («Lista de clientes» → «lista-de-clientes»). */
export function slugOf(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

function routeOf(raw: string, name: string, kind: ScreenKind, index: number): string {
  const route = raw.trim().toLowerCase().replace(/\/+$/, "") || (raw.trim() === "/" ? "/" : "");
  if (route && route.length <= ROUTE_MAX && ROUTE_RE.test(route)) return route;
  if (kind === "landing" && index === 0) return "/";
  return `/${slugOf(name) || `screen-${index + 1}`}`;
}

/** The answer's numbers as a grid rect: rounded, inside the 12 columns and the proposal's bounds. `null` without numbers. */
function rectOf(block: { col: number; row: number; w: number; h: number }): { rect: GridRect; changed: boolean } | null {
  const values = [block.col, block.row, block.w, block.h];
  if (!values.every(Number.isFinite)) return null;
  const w = clamp(Math.round(block.w), 1, DESKTOP_COLUMNS);
  const rect = {
    col: clamp(Math.round(block.col), 0, DESKTOP_COLUMNS - w),
    row: clamp(Math.round(block.row), 0, PROPOSAL_MAX_ROW),
    w,
    h: clamp(Math.round(block.h), 1, PROPOSAL_MAX_HEIGHT),
  };
  const changed = rect.col !== block.col || rect.row !== block.row || rect.w !== block.w || rect.h !== block.h;
  return { rect, changed };
}

const overlaps = (a: GridRect, b: GridRect) => a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;

/** Type of a proposed block: a proposal type as is; anything else through `mapType`, else «Bloque libre». */
function resolveType(raw: string, mapType: NormalizeOptions["mapType"]): { type: LibraryBlockType; mapped: boolean } {
  const type = raw.trim().toLowerCase();
  // «Bloque libre» is a library block too: the fallback uses it for a need nothing matched.
  if (PROPOSAL_TYPES.has(type) || type === "sidebar" || type === KEEP_FREE) return { type: type as LibraryBlockType, mapped: false };
  const mapped = mapType?.(raw.slice(0, 60)) ?? null;
  return { type: mapped && PROPOSAL_TYPES.has(mapped) ? mapped : KEEP_FREE, mapped: true };
}

type BuiltScreen = { screen: ProposedScreen; links: Map<BlockId, number> };

/** One screen: blocks placed and normalized through @dialmade/layout. `null` when no block is left. */
function buildScreen(
  answer: ProposalScreenAnswer,
  index: number,
  ids: { screen: string; block: (n: number) => string },
  options: NormalizeOptions,
  warnings: ProposalWarning[],
): (BuiltScreen & { nav: AppNav | null }) | null {
  const kind = answer.kind;
  const name = sanitizeLine(answer.name, NAME_MAX) || options.screenName?.(index) || `Screen ${index + 1}`;
  let nav: AppNav | null = kind === "app" ? answer.nav : null;
  let layout = emptyLayout();
  const labels = new Map<BlockId, string>();
  const links = new Map<BlockId, number>();
  const order: BlockId[] = [];

  answer.blocks.forEach((raw, n) => {
    const { type: resolved, mapped } = resolveType(raw.type, options.mapType);
    const fallbackLabel = options.labelFor?.(resolved) ?? resolved;
    const label = sanitizeLabel(raw.label) || sanitizeLabel(fallbackLabel) || resolved;
    // On an app screen the navigation is the frame, never a box (critique #4).
    if (kind === "app" && (resolved === "navbar" || resolved === "sidebar")) {
      nav = resolved === "navbar" ? "topnav" : "sidebar";
      warnings.push({ code: "nav-frame", screen: name, label, nav });
      return;
    }
    // A sidebar only exists as an app's navigation frame.
    const type: LibraryBlockType = resolved === "sidebar" ? KEEP_FREE : resolved;
    if (mapped || type !== resolved) warnings.push({ code: "mapped-type", screen: name, label, from: sanitizeLine(raw.type, 40), to: type });
    const def = getBlockDef(type);
    const placed = rectOf(raw);
    let rect: GridRect;
    if (placed) {
      rect = placed.rect;
      if (placed.changed) warnings.push({ code: "clamped", screen: name, label });
    } else {
      rect = findFreeSlot(layout, def.defaultSize).rect;
      warnings.push({ code: "placed", screen: name, label });
    }
    const id = ids.block(n);
    const block: LayoutBlock = { type, label, rect, z: order.length + 1 };
    const note = sanitizeNote(raw.note);
    if (note) block.note = note;
    if (def.repeatable && Number.isFinite(raw.count) && raw.count >= 1) {
      block.count = clamp(Math.round(raw.count), def.repeatable.min, def.repeatable.max);
    }
    if (Number.isInteger(raw.linkTo) && raw.linkTo >= 0) links.set(id, raw.linkTo);
    layout = { ...layout, blocks: { ...layout.blocks, [id]: block } };
    labels.set(id, label);
    order.push(id);
  });
  if (order.length === 0) return null;

  // Small overlaps: clipped like a drop on the canvas.
  for (const id of order) {
    const result = normalizeDrop(layout, id);
    layout = result.layout;
    for (const adjustment of result.adjustments) {
      const label = labels.get(adjustment.id) ?? adjustment.id;
      if (adjustment.kind === "clip") warnings.push({ code: "clipped", screen: name, label });
      else if (adjustment.kind === "clamp") warnings.push({ code: "clamped", screen: name, label });
    }
  }

  // Large overlaps: top to bottom, a block that still covers an earlier one moves below it («Poner debajo»).
  const byPosition = [...order].sort((a, b) => {
    const ra = layout.blocks[a]!.rect;
    const rb = layout.blocks[b]!.rect;
    return ra.row - rb.row || ra.col - rb.col || order.indexOf(a) - order.indexOf(b);
  });
  const settled: BlockId[] = [];
  for (const id of byPosition) {
    for (let attempt = 0; attempt <= settled.length; attempt++) {
      const rect = layout.blocks[id]!.rect;
      const hit = settled.find((other) => overlaps(rect, layout.blocks[other]!.rect));
      if (!hit) break;
      layout = applyFix(layout, { kind: "move-below", id, below: hit });
      warnings.push({ code: "moved", screen: name, label: labels.get(id)!, below: labels.get(hit)! });
    }
    settled.push(id);
  }
  for (const warning of inferStructure(layout).warnings) {
    if (warning.code !== "overlap" || warning.ids.length < 2) continue;
    warnings.push({ code: "overlap", screen: name, labels: [labels.get(warning.ids[0]!) ?? "", labels.get(warning.ids[1]!) ?? ""] });
  }
  // Defensive: a layout the document would refuse never reaches the store.
  if (validateLayout(layout).length > 0) return null;

  return {
    screen: { key: ids.screen, name, kind, route: routeOf(answer.route, name, kind, index), shell: null, layout },
    links,
    nav,
  };
}

/**
 * Every variant of an answer as screens the store can apply (`applyProposal`). Variants without a usable screen are
 * dropped; within a variant the app screens share one navigation (the first app screen with navigation decides,
 * like the canvas), and links point at the variant's own screens (only from blocks whose section draws a link).
 */
export function normalizeProposals(answer: ProposalAnswer, options: NormalizeOptions = {}): LayoutProposal[] {
  const prefix = options.idPrefix ?? "p";
  const proposals: LayoutProposal[] = [];
  answer.variants.forEach((variant, v) => {
    const warnings: ProposalWarning[] = [];
    let trimmed = 0;
    const built: (BuiltScreen & { nav: AppNav | null; source: number })[] = [];
    variant.screens.forEach((screen, s) => {
      const result = buildScreen(screen, built.length, { screen: `${prefix}${v}s${s}`, block: (n) => `${prefix}${v}s${s}b${n}` }, options, warnings);
      if (result) built.push({ ...result, source: s });
      else trimmed++;
    });
    if (built.length === 0) return;

    // Links: answer indexes → keys of the screens that survived.
    const keyOfSource = new Map(built.map((entry) => [entry.source, entry.screen.key] as const));
    const shared = built.find((entry) => entry.screen.kind === "app" && entry.nav && entry.nav !== "none")?.nav ?? null;
    const screens = built.map(({ screen, links, nav }) => {
      const blocks = { ...screen.layout.blocks };
      for (const [blockId, target] of links) {
        const key = keyOfSource.get(target);
        const block = blocks[blockId]!;
        if (key && isLinkableBlockType(block.type)) blocks[blockId] = { ...block, linkTo: key };
        else warnings.push({ code: "link-dropped", screen: screen.name, label: block.label });
      }
      const shell: AppShell | null =
        screen.kind === "app" ? { nav: nav && nav !== "none" ? (shared ?? nav) : "none", header: nav !== "none" } : null;
      return { ...screen, shell, layout: { ...screen.layout, blocks } };
    });
    if (trimmed > 0) warnings.push({ code: "trimmed", count: trimmed });

    const recipeId = getStyleRecipe(variant.recipeId.trim()) ? variant.recipeId.trim() : null;
    if (!recipeId && variant.recipeId.trim()) warnings.push({ code: "recipe-unknown" });
    proposals.push({
      id: `${prefix}${v}`,
      name: sanitizeLine(variant.name, 60) || options.screenName?.(v) || `Variant ${v + 1}`,
      rationale: sanitizeLine(variant.rationale, 240),
      recipeId,
      recipeReason: recipeId ? sanitizeLine(variant.recipeReason, 160) : "",
      screens,
      warnings,
    });
  });
  return proposals;
}

/** One pick of «Sugerir con IA»: the free block at `index` of the request becomes `type`. */
export type MapSuggestion = { index: number; type: LibraryBlockType };

export type NormalizedMap = {
  suggestions: MapSuggestion[];
  /** Blocks the AI left free on purpose. */
  unchanged: number;
  /** Entries that did not fit the request (unknown index or type, repeated, a sidebar on a web page). */
  dropped: number;
};

/** Validates a map answer against the request: `kinds[i]` is the screen kind of free block `i`. */
export function normalizeMapAnswer(answer: MapAnswer, kinds: readonly ScreenKind[]): NormalizedMap {
  const seen = new Set<number>();
  const suggestions: MapSuggestion[] = [];
  let unchanged = 0;
  let dropped = 0;
  for (const entry of answer.blocks) {
    const index = entry.index;
    const type = entry.type.trim().toLowerCase();
    if (!Number.isInteger(index) || index < 0 || index >= kinds.length || seen.has(index) || !MAP_TYPES.has(type) || !isLibraryBlockType(type)) {
      dropped++;
      continue;
    }
    seen.add(index);
    if (type === KEEP_FREE) {
      unchanged++;
      continue;
    }
    if (type === "sidebar" && kinds[index] === "landing") {
      dropped++;
      continue;
    }
    suggestions.push({ index, type });
  }
  return { suggestions, unchanged, dropped };
}
