"use client";

import { MAX_SCREENS, ROUTE_MAX, type LayoutBrief } from "@dialmade/doc";
import {
  applyFix as applyLayoutFix,
  duplicateBlock as duplicateLayoutBlock,
  emptyLayout,
  estimateContent,
  getBlockDef,
  getScreenTemplate,
  getSetTemplate,
  hashString,
  insertBlock as insertLayoutBlock,
  instantiateTemplate,
  isLibraryBlockType,
  LABEL_MAX,
  MAX_BLOCKS,
  MAX_HEIGHT_ROWS,
  MAX_ROW,
  moveBlock,
  newBlockId,
  normalizeDrop,
  removeBlocks as removeLayoutBlocks,
  sanitizeLabel,
  sanitizeLine,
  sanitizeNote,
  toAsciiWireframe,
  type Adjustment,
  type AppNav,
  type AppShell,
  type BlockId,
  type BlockOverride,
  type Breakpoint,
  type GeneratedFingerprint,
  type GridRect,
  type LayoutBlock,
  type LayoutDoc,
  type LayoutFix,
  type LibraryBlockType,
  type RandomSource,
  type ResponsiveLayout,
  type ScreenId,
  type ScreenKind,
  type ScreenTemplateId,
  type SetTemplateId,
  type Structure,
} from "@dialmade/layout";
import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react";
import { temporal, type TemporalState } from "zundo";
import { createStore, useStore, type StoreApi } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ProposedScreen } from "@/lib/ai/layout/normalize";
import { compileScreenLayout } from "@/lib/screen-layout";
import { ADD_SPACE_ROWS, DEFAULT_APP_SHELL, HISTORY_LIMIT, SHORTCUTS_STORAGE_KEY } from "./constants";
import { getResponsive, getStructure } from "./structureCache";
import type {
  BlockPatch,
  GeneratedPrints,
  GeneratedScreen,
  GenerateResult,
  InsertOutcome,
  LayoutEnv,
  LeftTab,
  RouteResult,
  Screen,
  StyleChoice,
  Tool,
  UpdateOutcome,
} from "./types";

/* ------------------------------------------------------------------------------------------------ */
/* Types                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** Visible names of what the store creates. LayoutStep passes the i18n ones (`t.blocks[type].name`…). */
export type LayoutLabelers = {
  labelFor: (type: LibraryBlockType) => string;
  screenNameFor: (templateId: ScreenTemplateId) => string;
  /** Name of a duplicated screen («Ajustes (copia)»). */
  copyName: (name: string) => string;
  /**
   * Whether `label` is still the default name of `type` in any UI language (a type change renames those
   * blocks; a custom name stays). Default: it equals `labelFor(type)` or a name `labelFor` gave before a
   * language change.
   */
  isDefaultLabel: (type: LibraryBlockType, label: string) => boolean;
};

export type LayoutStoreInit = Partial<LayoutLabelers> & {
  screens?: readonly Screen[];
  style?: StyleChoice;
  /**
   * Id factory for blocks ("b") and screens ("s"); `taken` holds every id in use. Injectable for tests.
   * Default: `newBlockId` (crypto) for blocks and the same generator with an `s-` prefix for screens.
   */
  newId?: (prefix: "b" | "s", taken: ReadonlySet<string>) => string;
  /** Random source for the ids the package creates itself (descendants of a duplicated block). */
  random?: RandomSource;
  /** Overrides the stored single-key shortcuts preference (tests). */
  shortcutsEnabled?: boolean;
};

export type InsertBlockOptions = {
  /** Where it was dropped; the next free slot (inside `parentId` when given) otherwise. */
  rect?: GridRect;
  parentId?: BlockId;
  note?: string;
  count?: number;
  /** Defaults to the active screen. */
  screenId?: ScreenId;
};

export type LayoutActions = {
  /* Screens. Every change is one undo step. */
  /**
   * Appends the screens of a starting set («SaaS app», «Landing»); the first one becomes active. Nothing (and
   * `limitHit`) when the project would pass `MAX_SCREENS`.
   */
  applySet: (setId: SetTemplateId) => ScreenId[];
  /** Appends a screen from a template; «En blanco» needs `kind`. Returns `null` when it cannot (at `MAX_SCREENS`: `limitHit`). */
  addScreen: (templateId: ScreenTemplateId, kind?: ScreenKind) => ScreenId | null;
  /**
   * Copies a screen (new block ids) right after it and activates the copy (`null` at `MAX_SCREENS`: `limitHit`).
   * The next «Generar» builds the copy from the source's page (`GeneratedScreen.copyOf`), so Ajustar's edits come along.
   */
  duplicateScreen: (id: ScreenId) => ScreenId | null;
  /** Renames; an automatic route (`/<slug of the old name>`) follows the new name. */
  renameScreen: (id: ScreenId, name: string) => boolean;
  /** Validates (`/`, slug segments) and keeps routes unique. */
  setRoute: (id: ScreenId, route: string) => RouteResult;
  /** Refuses to remove the last screen. Links to the removed screen are cleared in the same step. */
  removeScreen: (id: ScreenId) => boolean;
  moveScreen: (id: ScreenId, toIndex: number) => boolean;
  /** Not undoable; clears the selection. */
  setActiveScreen: (id: ScreenId) => void;
  /** App screens only. A `nav` other than "none" is shared: it also goes to every app screen with navigation. */
  setShell: (id: ScreenId, shell: Partial<AppShell>) => boolean;
  /** «Convertir en pantalla de app / web pública». To app, navbar/sidebar blocks become the navigation frame. */
  convertScreen: (id: ScreenId, kind: ScreenKind) => boolean;
  /**
   * «Describe tu producto»: the screens of the chosen variant (already normalized by `normalizeProposals`) get fresh
   * ids, unique names and routes, the project's shared app navigation and their links, and replace every screen
   * (`replace`) or go after them (`append`), as ONE undo step; the first one becomes active. `brief` is remembered for
   * `provenance.layoutBrief` (the next «Generar» writes it while one of these screens remains). Nothing (and
   * `limitHit`) past `MAX_SCREENS`. Returns the new screen ids.
   */
  applyProposal: (screens: readonly ProposedScreen[], options: { mode: ProposalMode; brief?: LayoutBrief | null }) => ScreenId[];

  /* Blocks (active screen unless `screenId` is given). Every change is one undo step unless batched. */
  /**
   * Inserts with the i18n label and selects the block. Frame blocks on an app screen set `shell.nav` instead.
   * A screen with `MAX_BLOCKS` blocks takes no more (`limitHit`).
   */
  insertBlock: (type: LibraryBlockType, options?: InsertBlockOptions) => InsertOutcome;
  /** Sanitizes label and note, clamps count; a type change keeps the geometry and renames only default labels. */
  updateBlock: (id: BlockId, patch: BlockPatch, screenId?: ScreenId) => UpdateOutcome;
  /** Move or resize (descendants follow a pure move), then `normalizeDrop`. Returns what was adjusted. */
  setRect: (id: BlockId, rect: GridRect, screenId?: ScreenId) => Adjustment[];
  /** Removes the blocks and their descendants; returns every removed id. Clears a removed selection. */
  removeBlocks: (ids: readonly BlockId[], screenId?: ScreenId) => BlockId[];
  /** Duplicates the block (and its descendants) and selects the copy; `null` when the screen would pass `MAX_BLOCKS` (`limitHit`). */
  duplicateBlock: (id: BlockId, screenId?: ScreenId) => BlockId | null;
  /** Applies a warning's one-click fix. */
  applyFix: (fix: LayoutFix, screenId?: ScreenId) => boolean;
  /**
   * «Sugerir con IA» for free blocks: each block takes its type like a pick in the inspector (`updateBlock`: a
   * default label follows, navbar/sidebar on app screens become the frame), all as ONE undo step. Blocks that no
   * longer exist or already changed type are skipped. Returns how many changed.
   */
  retypeBlocks: (changes: readonly BlockRetype[]) => number;
  /** «+ Añadir espacio»: extra empty rows at the bottom of the frame (view state, not undoable). */
  addSpace: (screenId: ScreenId, rows?: number) => void;

  /*
   * Batch: continuous edits (a keyboard grab) become one undo step. Not nested: a `beginBatch` while one is
   * open keeps the first base, and a `commitBatch`/`cancelBatch` without an open batch does nothing. Undo
   * and redo (from any caller, `temporal.undo()` included) commit an open batch first, so history never
   * stays paused.
   */
  beginBatch: () => void;
  commitBatch: () => void;
  /** Restores the screens as they were at `beginBatch`. */
  cancelBatch: () => void;

  /* History. */
  /** Commits an open batch, then undoes one step. Returns whether the screens changed. */
  undo: () => boolean;
  /** Commits an open batch, then redoes one step. Returns whether the screens changed. */
  redo: () => boolean;
  /**
   * Identifies the current version of the screens: it changes on every tracked change (actions, undo,
   * redo, a committed batch). Read it right after an action to offer «Deshacer» for that action.
   */
  changeToken: () => number;
  /**
   * Undoes one step only while the screens are still the version `token` identified (nothing changed
   * since). Returns whether it undid; on `false` show `common.undoStale`.
   */
  undoIfLatest: (token: number) => boolean;

  /* View state (never undoable). */
  select: (id: BlockId | null) => void;
  setTool: (tool: Tool) => void;
  setDevice: (device: Breakpoint) => void;
  toggleStructure: (force?: boolean) => void;
  /** Persisted in localStorage (`dialmade.layout.shortcuts`). */
  setShortcutsEnabled: (enabled: boolean) => void;
  setStyle: (style: StyleChoice) => void;
  setLeftTab: (tab: LeftTab) => void;

  /* The document (Fase B: the flow keeps one store per DesignDoc, so the draft survives leaving the step). */
  /**
   * Brings the draft in line with the document's screens (`doc.screens`/`doc.screenOrder`; extra members such
   * as `page` are ignored). Nothing to do when those screens did not change since the last sync (compared by
   * content: any document edit re-parses it into new objects). When the draft holds nothing of its own (it is
   * what the last sync or «Generar» left and that equalled the document, or it is empty while the document has
   * screens), it becomes the document's screens (an edit or an undo in «Ajustar» is followed) and the layout
   * history starts again: what it held is already in the document's own history. Otherwise the draft has edits
   * the document does not have, and they are never dropped: it keeps its screens, geometry, types, labels, notes
   * and links; `pinned` and `generated` always come from the document, and `hidden` and `count` from whichever
   * side changed them since the last sync (the draft wins a tie). The history is rebased the same way and gets
   * no step. Not undoable. Returns what it did.
   */
  syncFromDoc: (doc: ScreensSource) => SyncOutcome;
  /**
   * The document now holds this draft (right after «Generar» wrote it): the next sync starts from here. The
   * first «Generar» of a document also starts the layout history again (like the document's, decision 92), so
   * undo never takes the draft back to an empty project the document no longer is.
   */
  markSynced: (doc: ScreensSource) => void;
  /**
   * Whether the draft has layout changes the document does not have (what «Generar» would still write: a moved,
   * added, removed, renamed or retyped block or screen…). Edits made in «Ajustar» are not pending changes.
   */
  hasPendingChanges: (doc: ScreensSource) => boolean;

  /* Generate. */
  /**
   * Structure, responsive, CSS and ASCII of every screen, in order; stores the result and the fingerprints.
   * With `accept`, it is asked first: when it returns `false` (the flow could not write the result, e.g. a
   * locked value) nothing is stored, so «Regenerar N bloques» still counts those blocks.
   */
  generate: (options?: GenerateOptions) => GenerateResult;
  /** Blocks new, changed (type, w, h, count, note) or removed since the last `generate` (all of them before it). */
  changedCount: () => number;

  /** Replaces the label factories (LayoutStep calls it when the UI language changes). */
  setLabelers: (labelers: Partial<LayoutLabelers>) => void;
};

export type LayoutState = {
  /* Tracked by undo/redo. */
  screens: Record<ScreenId, Screen>;
  screenOrder: ScreenId[];

  /* View state. */
  /** Raw choice: read it with `selectActiveScreenId`, which falls back when the screen is gone (undo). */
  activeScreenId: ScreenId | null;
  /** Raw choice: read it with `selectSelectedId`, which reads `null` when the block is gone. */
  selectedId: BlockId | null;
  tool: Tool;
  device: Breakpoint;
  showStructure: boolean;
  shortcutsEnabled: boolean;
  style: StyleChoice;
  leftTab: LeftTab;
  extraRows: Record<ScreenId, number>;
  generated: GenerateResult | null;
  /** Fingerprints of the last «Generar». Fase A keeps them here (not in `block.generated`) so «Generar» is not an undo step. */
  generatedPrints: GeneratedPrints | null;
  /** What the last drop or insert adjusted, for the canvas animation and the «Ajustado · Deshacer» toast. */
  lastAdjustments: Adjustment[];
  /** Grows on every new set of adjustments (retriggers the animation for an identical set). */
  adjustmentsTick: number;
  /** The screens at `beginBatch` while a batch is open, `null` otherwise. Read-only: the batch actions own it. */
  batchBase: HistorySlice | null;
  /** The document's screens at the last `syncFromDoc`/`markSynced` and the draft right after it. Read-only. */
  docSync: DocSync | null;
  /** The last action refused by a document limit (`MAX_SCREENS`, `MAX_BLOCKS`); a new object on every refusal. */
  limitHit: LimitHit | null;
  /** Screens made with «Duplicar» since the last «Generar», and what they copy (see `GeneratedScreen.copyOf`). Not undoable. */
  copies: Record<ScreenId, ScreenCopy>;
  /** The last «Describe tu producto» applied and the screens it created. Not undoable: `generate` checks the screens. */
  brief: { value: LayoutBrief; screenIds: ScreenId[] } | null;

  actions: LayoutActions;
};

export type HistorySlice = { screens: Record<ScreenId, Screen>; screenOrder: ScreenId[] };

/** Options of `generate`. */
export type GenerateOptions = {
  /** Called with the result before it is stored; `false` = refused (the store stays as it was). */
  accept?: (result: GenerateResult) => boolean;
};

/** The screens of a DesignDoc as the draft reads them (a doc `Screen` also carries its `page`). */
export type ScreensSource = { readonly screens: Readonly<Record<ScreenId, Screen>>; readonly screenOrder: readonly ScreenId[] };

/**
 * What the last sync saw: the document's own objects, a key of their content (every document edit re-parses
 * it, so identity alone would see a change on each keystroke of the brand name) and the draft it left. `clean`:
 * that draft held nothing the document did not (a reseed, «Generar», or a merge that came out equal); a merged
 * draft with edits of its own is not clean, so a later sync merges again instead of replacing it.
 */
export type DocSync = { doc: ScreensSource; key: string; draft: HistorySlice; clean: boolean };

/** A refusal at a document limit: `screens` (`MAX_SCREENS`) or `blocks` (`MAX_BLOCKS` in one screen). `tick` grows on each one. */
export type LimitHit = { limit: "screens" | "blocks"; tick: number };

/** A screen made with «Duplicar»: the screen it copies and, for each copied block id, its source block id. */
export type ScreenCopy = { from: ScreenId; blocks: Record<BlockId, BlockId> };

/** How a proposal lands: instead of every screen, or after them. */
export type ProposalMode = "replace" | "append";

/** One block of `retypeBlocks`: still a free block when it is applied. */
export type BlockRetype = { screenId: ScreenId; blockId: BlockId; type: LibraryBlockType };

/** What `syncFromDoc` did. */
export type SyncOutcome = "unchanged" | "reseeded" | "merged";
export type LayoutStore = StoreApi<LayoutState> & { temporal: StoreApi<TemporalState<HistorySlice>> };

/** One screen of `selectChangedBlocks`. */
export type ChangedBlocks = { screenId: ScreenId; changed: BlockId[]; all: boolean };

/* ------------------------------------------------------------------------------------------------ */
/* Pure helpers                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

const ROUTE_RE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
const SLUG_MAX = 48;
const LOOSE_COUNT_MAX = 99;
const ID_ATTEMPTS = 64;
/**
 * A rect with its top row and height inside the engine's bounds (a typed «999999 px» never reaches it).
 * Columns are the engine's job (`normalizeDrop` clamps and reports them).
 */
function boundRect(rect: GridRect): GridRect {
  // Not finite: the engine's `roundRect` already turns it into a default.
  const bound = (value: number, max: number) => (Number.isFinite(value) ? Math.min(value, max) : value);
  const row = bound(rect.row, MAX_ROW);
  const h = bound(rect.h, MAX_HEIGHT_ROWS);
  return row === rect.row && h === rect.h ? rect : { ...rect, row, h };
}

/** `"Ajustes (copia)"` → `"ajustes-copia"`; `"screen"` when nothing is left. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
  return slug || "screen";
}

function uniqueRoute(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const route = `${base}-${n}`;
    if (!taken.has(route)) return route;
  }
}

/** The first `max` UTF-16 code units of `text`, without splitting a surrogate pair, trimmed at the end. */
function cutLabel(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = Math.max(0, max);
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return text.slice(0, end).trimEnd();
}

/**
 * `compose(base)` as a label that is never cut at the end: `base` is shortened instead, so what `compose`
 * adds («(copia)», « 2») always stays whole.
 */
function fitLabel(base: string, compose: (base: string) => string): string {
  for (let cut = base; cut.length > 0; cut = cutLabel(cut, cut.length - 1)) {
    const full = sanitizeLine(compose(cut), Number.MAX_SAFE_INTEGER);
    if (full.length <= LABEL_MAX) return full;
  }
  return sanitizeLabel(compose(""));
}

/**
 * A screen name not in `taken`: `compose(name)`, else `compose(name) 2`, `compose(name) 3`… `name` is
 * shortened to make room, so the number always fits and every candidate is different: one of the first
 * `taken.size + 1` numbers is free (no endless loop with long names).
 */
export function uniqueName(name: string, taken: ReadonlySet<string>, compose: (base: string) => string = (base) => base): string {
  let candidate = fitLabel(name, compose) || name;
  if (!taken.has(candidate)) return candidate;
  for (let n = 2; n <= taken.size + 2; n++) {
    candidate = fitLabel(name, (base) => `${compose(base)} ${n}`);
    if (!taken.has(candidate)) return candidate;
  }
  return candidate;
}

/** `/ajustes` or `/ajustes-2` for «Ajustes»: a route the store made from the name (it follows renames). */
function isAutoRoute(route: string, name: string): boolean {
  const base = `/${slugify(name)}`;
  return route === base || new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+$`).test(route);
}

function newScreenId(taken: ReadonlySet<string>, random?: RandomSource): ScreenId {
  for (let attempt = 0; attempt < ID_ATTEMPTS; attempt++) {
    const id = `s-${newBlockId(undefined, random).slice(2)}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("newScreenId: could not find a free id (is the random source constant?)");
}

/** ×N bounds of the type, or 1–99 for types that are not repeatable (the rule of `validateLayout`). */
function clampCount(type: LibraryBlockType, count: number): number {
  const repeatable = isLibraryBlockType(type) ? getBlockDef(type).repeatable : null;
  const value = Number.isFinite(count) ? Math.round(count) : 1;
  const [min, max] = repeatable ? [repeatable.min, repeatable.max] : [1, LOOSE_COUNT_MAX];
  return Math.min(max, Math.max(min, value));
}

function cleanOverride(override: BlockOverride | undefined): BlockOverride | undefined {
  if (!override) return undefined;
  const out: BlockOverride = {};
  if (override.hidden) out.hidden = true;
  if (override.behavior !== undefined) out.behavior = override.behavior;
  if (override.order !== undefined && Number.isFinite(override.order)) out.order = Math.round(override.order);
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanResponsive(responsive: LayoutBlock["responsive"]): LayoutBlock["responsive"] {
  const tablet = cleanOverride(responsive?.tablet);
  const mobile = cleanOverride(responsive?.mobile);
  if (!tablet && !mobile) return undefined;
  return { ...(tablet && { tablet }), ...(mobile && { mobile }) };
}

/**
 * Removes `ids` but keeps what they contain: each child moves up to the nearest ancestor that stays (or to
 * the top level). Used where a navbar/sidebar becomes the app's navigation frame (its content is not the
 * frame, so it must not go with it).
 */
function removeKeepingChildren(layout: LayoutDoc, ids: readonly BlockId[]): LayoutDoc {
  const removed = new Set(ids.filter((id) => layout.blocks[id]));
  if (removed.size === 0) return layout;
  const keptAncestor = (start: BlockId | undefined): BlockId | undefined => {
    const seen = new Set<BlockId>();
    let parent = start;
    while (parent !== undefined && removed.has(parent) && !seen.has(parent)) {
      seen.add(parent);
      parent = layout.blocks[parent]?.parentId;
    }
    return parent !== undefined && !removed.has(parent) && layout.blocks[parent] ? parent : undefined;
  };
  const blocks: Record<BlockId, LayoutBlock> = {};
  for (const [blockId, block] of Object.entries(layout.blocks)) {
    if (block.parentId === undefined || !removed.has(block.parentId)) {
      blocks[blockId] = block;
      continue;
    }
    const lifted = { ...block };
    const parentId = keptAncestor(block.parentId);
    if (parentId !== undefined) lifted.parentId = parentId;
    else delete lifted.parentId;
    blocks[blockId] = lifted;
  }
  return removeLayoutBlocks({ ...layout, blocks }, [...removed]);
}

/** Drops a per-device `behavior` that `type` does not offer (`mobileOptions`); the default applies instead. */
function offeredBehaviors(type: LayoutBlock["type"], responsive: LayoutBlock["responsive"]): LayoutBlock["responsive"] {
  if (!responsive || !isLibraryBlockType(type)) return responsive;
  const offered = getBlockDef(type).mobileOptions;
  const keep = (override: BlockOverride | undefined): BlockOverride | undefined => {
    if (override?.behavior === undefined || offered.includes(override.behavior)) return override;
    const rest = { ...override };
    delete rest.behavior;
    return rest;
  };
  return { ...(responsive.tablet && { tablet: keep(responsive.tablet) }), ...(responsive.mobile && { mobile: keep(responsive.mobile) }) };
}

function sameBlockProps(a: LayoutBlock, b: LayoutBlock): boolean {
  return (
    a.type === b.type &&
    a.label === b.label &&
    a.note === b.note &&
    a.count === b.count &&
    a.linkTo === b.linkTo &&
    (a.hidden ?? false) === (b.hidden ?? false) &&
    JSON.stringify(a.responsive ?? null) === JSON.stringify(b.responsive ?? null)
  );
}

const sameRect = (a: GridRect, b: GridRect) => a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h;

function sameShell(a: AppShell, b: AppShell): boolean {
  return a.nav === b.nav && a.header === b.header && a.activeItem === b.activeItem;
}

/** Navigation shared by the app screens: the first one (in order) that has navigation. */
function sharedNav(screens: Record<ScreenId, Screen>, order: readonly ScreenId[], exceptId?: ScreenId): AppNav | null {
  for (const id of order) {
    if (id === exceptId) continue;
    const nav = screens[id]?.shell?.nav;
    if (nav && nav !== "none") return nav;
  }
  return null;
}

/**
 * Sets an app screen's shell. A `nav` other than "none" is the app's navigation: it also goes to every
 * other app screen that has navigation (screens without it, like Login, keep "none"). Returns the same
 * record when nothing changes.
 */
function withShell(
  screens: Record<ScreenId, Screen>,
  order: readonly ScreenId[],
  id: ScreenId,
  partial: Partial<AppShell>,
): Record<ScreenId, Screen> {
  const screen = screens[id];
  if (!screen || screen.kind !== "app" || !screen.shell) return screens;
  const shell: AppShell = { ...screen.shell };
  if (partial.nav !== undefined) shell.nav = partial.nav;
  if (partial.header !== undefined) shell.header = partial.header;
  if ("activeItem" in partial) {
    if (partial.activeItem) shell.activeItem = sanitizeLabel(partial.activeItem);
    else delete shell.activeItem;
  }
  let next = screens;
  if (!sameShell(shell, screen.shell)) next = { ...screens, [id]: { ...screen, shell } };
  const nav = partial.nav;
  if (nav !== undefined && nav !== "none") {
    for (const otherId of order) {
      const other = next[otherId];
      if (otherId === id || !other || other.kind !== "app" || !other.shell) continue;
      if (other.shell.nav === "none" || other.shell.nav === nav) continue;
      if (next === screens) next = { ...screens };
      next[otherId] = { ...other, shell: { ...other.shell, nav } };
    }
  }
  return next;
}

function variantOf(block: LayoutBlock, layout: LayoutDoc, id: BlockId): string {
  if (!isLibraryBlockType(block.type)) return "default";
  const estimate = estimateContent(block, layout, id);
  return estimate?.kind === "variant" ? estimate.value : "default";
}

/** Fingerprint of a block as «Generar» saw it (critique #3). */
export function fingerprintOf(block: LayoutBlock, layout: LayoutDoc, id: BlockId): GeneratedFingerprint {
  return {
    type: block.type,
    w: block.rect.w,
    h: block.rect.h,
    ...(block.count !== undefined && { count: block.count }),
    variant: variantOf(block, layout, id),
    ...(block.note && { noteHash: hashString(block.note) }),
  };
}

/** Whether a block still matches its fingerprint (type, size, count and note; position does not count). */
function matchesPrint(print: GeneratedFingerprint, block: LayoutBlock): boolean {
  return (
    print.type === block.type &&
    print.w === block.rect.w &&
    print.h === block.rect.h &&
    (print.count ?? null) === (block.count ?? null) &&
    (print.noteHash ?? null) === (block.note ? hashString(block.note) : null)
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* Document sync (Fase B)                                                                           */
/* ------------------------------------------------------------------------------------------------ */

/** The document's screens in its order, as draft screens (without `page`). New objects; layouts are shared. */
export function screensFromDoc(doc: ScreensSource): HistorySlice {
  const screens: Record<ScreenId, Screen> = {};
  const screenOrder: ScreenId[] = [];
  for (const id of doc.screenOrder) {
    const screen = Object.hasOwn(doc.screens, id) ? doc.screens[id] : undefined;
    if (!screen || Object.hasOwn(screens, id)) continue;
    screens[id] = { id: screen.id, name: screen.name, kind: screen.kind, route: screen.route, layout: screen.layout, shell: screen.shell };
    screenOrder.push(id);
  }
  return { screens, screenOrder };
}

/** Same pinned pointers (element-wise: a sync rebases the whole history, so no JSON per block). */
function samePins(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === b) return true;
  if ((a?.length ?? 0) !== (b?.length ?? 0)) return false;
  return (a ?? []).every((pointer, index) => pointer === b![index]);
}

/** Same «Generar» fingerprint, field by field. */
function samePrint(a: GeneratedFingerprint | undefined, b: GeneratedFingerprint | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.w === b.w && a.h === b.h && a.count === b.count && a.variant === b.variant && a.noteHash === b.noteHash;
}

const contentKeys = new WeakMap<object, { order: readonly ScreenId[]; key: string }>();

/** What the draft reads of the document's screens, as a string: equal strings, nothing to sync. Memoized per object. */
export function screensKey(doc: ScreensSource): string {
  const hit = contentKeys.get(doc.screens);
  if (hit && hit.order === doc.screenOrder) return hit.key;
  const key = JSON.stringify(screensFromDoc(doc));
  contentKeys.set(doc.screens, { order: doc.screenOrder, key });
  return key;
}

/** One block of the draft with what only the document knows (see `mergeDocScreens`). Same object when nothing changes. */
function mergeBlock(block: LayoutBlock, base: LayoutBlock | undefined, doc: LayoutBlock | undefined): LayoutBlock {
  const pinned = doc?.pinned && doc.pinned.length > 0 ? doc.pinned : undefined;
  const generated = doc?.generated;
  const draftHidden = block.hidden === true;
  // Hidden: the side that changed it since the last sync wins; with no change in the draft, the document's.
  const hidden = doc && base && draftHidden === (base.hidden === true) ? doc.hidden === true : draftHidden;
  // Count, the same way: Ajustar's count knob writes `block.count` (the layout owns it), so a ×N changed there
  // while the draft also changed elsewhere is kept, unless the draft changed that count itself. Ajustar checked
  // it against the document's type: when the draft changed the type meanwhile, that ×N is not one for this block.
  let count = doc && base && block.count === base.count && doc.type === block.type ? doc.count : block.count;
  if (count !== undefined && count !== block.count) count = clampCount(block.type, count);
  if (samePins(block.pinned, pinned) && samePrint(block.generated, generated) && draftHidden === hidden && block.count === count) return block;
  const next: LayoutBlock = { ...block };
  if (count !== undefined) next.count = count;
  else delete next.count;
  if (pinned) next.pinned = [...pinned];
  else delete next.pinned;
  if (generated) next.generated = generated;
  else delete next.generated;
  if (hidden) next.hidden = true;
  else delete next.hidden;
  return next;
}

/**
 * A draft screen's app frame merged with the document's: navigation and page header three-way against `base`
 * (Ajustar's «Navegación» and «Cabecera de página» write them), `pinned` from the document (frame copy edited in
 * Ajustar; the engine reads it from the document anyway). Same object when nothing changes.
 */
function mergeShell(shell: AppShell | null, base: AppShell | null | undefined, doc: AppShell | null | undefined): AppShell | null {
  if (!shell || !doc) return shell;
  const nav = base && shell.nav === base.nav ? doc.nav : shell.nav;
  const header = base && shell.header === base.header ? doc.header : shell.header;
  const pinned = doc.pinned && doc.pinned.length > 0 ? doc.pinned : undefined;
  if (nav === shell.nav && header === shell.header && samePins(shell.pinned, pinned)) return shell;
  const next: AppShell = { ...shell, nav, header };
  if (pinned) next.pinned = [...pinned];
  else delete next.pinned;
  return next;
}

/** One screen of the draft merged with the document (see `mergeDocScreens`). Same object when nothing changes. */
function mergeScreen(screen: Screen, base: HistorySlice | null, doc: HistorySlice): Screen {
  const id = screen.id;
  const docScreen = Object.hasOwn(doc.screens, id) ? doc.screens[id] : undefined;
  const baseScreen = base && Object.hasOwn(base.screens, id) ? base.screens[id] : undefined;
  let blocks: Record<BlockId, LayoutBlock> | undefined;
  for (const [blockId, block] of Object.entries(screen.layout.blocks)) {
    const docBlock = docScreen && Object.hasOwn(docScreen.layout.blocks, blockId) ? docScreen.layout.blocks[blockId] : undefined;
    const baseBlock = baseScreen && Object.hasOwn(baseScreen.layout.blocks, blockId) ? baseScreen.layout.blocks[blockId] : undefined;
    const merged = mergeBlock(block, baseBlock, docBlock);
    if (merged !== block) (blocks ??= { ...screen.layout.blocks })[blockId] = merged;
  }
  // Name and route, three-way (Ajustar's «Título de la página» renames the screen; an automatic route follows).
  const name = docScreen && baseScreen && screen.name === baseScreen.name ? docScreen.name : screen.name;
  const route = docScreen && baseScreen && screen.route === baseScreen.route ? docScreen.route : screen.route;
  const shell = docScreen && screen.kind === docScreen.kind ? mergeShell(screen.shell, baseScreen?.shell, docScreen.shell) : screen.shell;
  if (!blocks && name === screen.name && route === screen.route && shell === screen.shell) return screen;
  return { ...screen, name, route, shell, ...(blocks && { layout: { ...screen.layout, blocks } }) };
}

/** `screen` with the shared navigation `nav` when it has navigation (pure, so cached per object and value). */
const withNavCache = new WeakMap<Screen, Map<AppNav, Screen>>();
function withSharedNav(screen: Screen, nav: AppNav): Screen {
  if (screen.kind !== "app" || !screen.shell || screen.shell.nav === "none" || screen.shell.nav === nav) return screen;
  let byNav = withNavCache.get(screen);
  if (!byNav) withNavCache.set(screen, (byNav = new Map()));
  let next = byNav.get(nav);
  if (!next) byNav.set(nav, (next = { ...screen, shell: { ...screen.shell, nav } }));
  return next;
}

/**
 * The merged screens with the document's rules the draft also keeps: app screens with navigation share it (the
 * draft's when the draft changed it since `base`, else the document's, so a screen only the draft has follows
 * Ajustar's «Navegación» too), and names and routes stay unique (a name or route taken from the document that
 * another draft screen already uses gets a number: the draft's own never changes). Same record when nothing does.
 */
function keepScreenRules(
  merged: Record<ScreenId, Screen>,
  draft: HistorySlice,
  base: HistorySlice | null,
  doc: HistorySlice,
): Record<ScreenId, Screen> {
  const order = [...new Set([...draft.screenOrder.filter((id) => Object.hasOwn(merged, id)), ...Object.keys(merged)])];
  const draftNav = sharedNav(draft.screens, draft.screenOrder);
  const nav = base && draftNav === sharedNav(base.screens, base.screenOrder) ? (sharedNav(doc.screens, doc.screenOrder) ?? draftNav) : draftNav;
  let out = merged;
  const put = (id: ScreenId, screen: Screen) => {
    if (out[id] === screen) return;
    if (out === merged) out = { ...merged };
    out[id] = screen;
  };
  if (nav) for (const id of order) put(id, withSharedNav(out[id]!, nav));
  // The draft's own names and routes first: those never move.
  const names = new Set<string>();
  const routes = new Set<string>();
  for (const id of order) {
    const own = draft.screens[id];
    if (own && out[id]!.name === own.name) names.add(own.name);
    if (own && out[id]!.route === own.route) routes.add(own.route);
  }
  for (const id of order) {
    const screen = out[id]!;
    const own = draft.screens[id];
    let { name, route } = screen;
    if (own && name !== own.name) names.add((name = names.has(name) ? uniqueName(name, names) : name));
    if (own && route !== own.route) {
      if (routes.has(route)) {
        const numbered = uniqueRoute(route, routes);
        // Too long for the document (`ROUTE_MAX`): the draft's own route, when it is free.
        route = numbered.length <= ROUTE_MAX || routes.has(own.route) ? numbered : own.route;
      }
      routes.add(route);
    }
    if (name !== screen.name || route !== screen.route) put(id, { ...screen, name, route });
  }
  return out;
}

/**
 * Merges what changed in the document into a draft that also changed (rules of `syncFromDoc`): screens, order,
 * geometry, type, label, note, links and the active nav item stay as in `draft`; for every block `pinned` and
 * `generated` come from `doc` (dropped when the document does not have the block), and `hidden` and `count` are
 * three-way against `base` (the document at the last sync): the side that changed them wins, the draft when both
 * did. A screen's name, route, navigation and page header are three-way the same way (Ajustar's frame knobs write
 * them), its frame's `pinned` comes from `doc`, and the result keeps the shared navigation and unique names and
 * routes (`keepScreenRules`). Keeps the identity of everything that does not change (the draft itself when
 * nothing does).
 *
 * `memo` (one per `base`/`doc` pair) remembers merged screens: the slices of the history share most screen
 * objects, so rebasing it merges each distinct screen once.
 */
export function mergeDocScreens(draft: HistorySlice, base: HistorySlice | null, doc: HistorySlice, memo?: WeakMap<Screen, Screen>): HistorySlice {
  let screens: Record<ScreenId, Screen> | undefined;
  for (const [id, screen] of Object.entries(draft.screens)) {
    let merged = memo?.get(screen);
    if (!merged) {
      merged = mergeScreen(screen, base, doc);
      memo?.set(screen, merged);
    }
    if (merged !== screen) (screens ??= { ...draft.screens })[id] = merged;
  }
  const ruled = keepScreenRules(screens ?? draft.screens, draft, base, doc);
  return ruled !== draft.screens ? { screens: ruled, screenOrder: draft.screenOrder } : draft;
}

/**
 * Whether two sets of screens hold the same layout: order, names, kinds, routes, shells and every block's
 * geometry, nesting, type, label, note, count, links, hiding and responsive overrides. `pinned` and `generated`
 * are not compared: they always come from the document.
 */
export function sameScreensContent(a: HistorySlice, b: HistorySlice): boolean {
  if (a.screenOrder.length !== b.screenOrder.length) return false;
  for (let index = 0; index < a.screenOrder.length; index++) {
    const id = a.screenOrder[index]!;
    if (b.screenOrder[index] !== id) return false;
    const left = Object.hasOwn(a.screens, id) ? a.screens[id] : undefined;
    const right = Object.hasOwn(b.screens, id) ? b.screens[id] : undefined;
    if (!left || !right) {
      if (left !== right) return false;
      continue;
    }
    if (left === right) continue;
    if (left.name !== right.name || left.kind !== right.kind || left.route !== right.route) return false;
    if (left.shell !== right.shell && (!left.shell || !right.shell || !sameShell(left.shell, right.shell))) return false;
    if (left.layout === right.layout) continue;
    const leftBlocks = left.layout.blocks;
    const rightBlocks = right.layout.blocks;
    const ids = Object.keys(leftBlocks);
    if (ids.length !== Object.keys(rightBlocks).length) return false;
    for (const blockId of ids) {
      const x = leftBlocks[blockId]!;
      const y = Object.hasOwn(rightBlocks, blockId) ? rightBlocks[blockId] : undefined;
      if (!y) return false;
      if (x === y) continue;
      if (!sameBlockProps(x, y) || !sameRect(x.rect, y.rect) || x.parentId !== y.parentId || x.z !== y.z) return false;
    }
  }
  return true;
}

/** What a «Duplicar» copy tells «Generar»: its source and the copied blocks that are still on it. `null` when none is. */
function copyOfFor(copy: ScreenCopy, layout: LayoutDoc): GeneratedScreen["copyOf"] | null {
  const blocks: Record<BlockId, BlockId> = {};
  let any = false;
  for (const [blockId, sourceId] of Object.entries(copy.blocks)) {
    if (!Object.hasOwn(layout.blocks, blockId)) continue;
    blocks[blockId] = sourceId;
    any = true;
  }
  return any ? { screenId: copy.from, blocks } : null;
}

/* ------------------------------------------------------------------------------------------------ */
/* Selectors                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

type ScreensView = Pick<LayoutState, "screens" | "screenOrder">;

/** The active screen id: the chosen one while it exists, else the first screen (undo can remove it). */
export function selectActiveScreenId(state: ScreensView & Pick<LayoutState, "activeScreenId">): ScreenId | null {
  const { activeScreenId, screens, screenOrder } = state;
  if (activeScreenId && screens[activeScreenId]) return activeScreenId;
  return screenOrder.find((id) => screens[id]) ?? null;
}

export function selectActiveScreen(state: ScreensView & Pick<LayoutState, "activeScreenId">): Screen | null {
  const id = selectActiveScreenId(state);
  return id ? (state.screens[id] ?? null) : null;
}

/** The selected block id while it exists in the active screen; `null` otherwise (after undo, remove…). */
export function selectSelectedId(state: ScreensView & Pick<LayoutState, "activeScreenId" | "selectedId">): BlockId | null {
  const id = state.selectedId;
  if (!id) return null;
  return selectActiveScreen(state)?.layout.blocks[id] ? id : null;
}

const changedMemo = new WeakMap<object, { order: ScreenId[]; prints: GeneratedPrints | null; docBase: ScreensSource | null; value: number }>();

/**
 * Blocks «Regenerar N bloques» would touch: new, changed or removed since the last «Generar». Removed blocks are
 * counted against the fingerprints of this session's last «Generar» or, after a sync with the document (which
 * drops them), against the document's own generated blocks (`docSync.doc`).
 */
export function selectChangedCount(state: ScreensView & Pick<LayoutState, "generatedPrints"> & Partial<Pick<LayoutState, "docSync">>): number {
  const { screens, screenOrder, generatedPrints: prints } = state;
  const docBase = prints ? null : (state.docSync?.doc ?? null);
  const memo = changedMemo.get(screens);
  if (memo && memo.order === screenOrder && memo.prints === prints && memo.docBase === docBase) return memo.value;
  let count = 0;
  for (const id of screenOrder) {
    const screen = screens[id];
    if (!screen) continue;
    const base = prints?.[id];
    for (const [blockId, block] of Object.entries(screen.layout.blocks)) {
      const print = base?.[blockId] ?? block.generated;
      if (!print || !matchesPrint(print, block)) count++;
    }
    if (base) for (const blockId of Object.keys(base)) if (!screen.layout.blocks[blockId]) count++;
  }
  if (prints) for (const [id, base] of Object.entries(prints)) if (!screens[id]) count += Object.keys(base).length;
  if (docBase) {
    for (const id of docBase.screenOrder) {
      const docScreen = Object.hasOwn(docBase.screens, id) ? docBase.screens[id] : undefined;
      if (!docScreen) continue;
      const draftBlocks = Object.hasOwn(screens, id) ? screens[id]!.layout.blocks : undefined;
      for (const [blockId, block] of Object.entries(docScreen.layout.blocks)) {
        if (block.generated && !(draftBlocks && Object.hasOwn(draftBlocks, blockId))) count++;
      }
    }
  }
  changedMemo.set(screens, { order: screenOrder, prints, docBase, value: count });
  return count;
}

const pendingMemo = new WeakMap<object, { order: ScreenId[]; sync: DocSync | null; docScreens: object; docOrder: readonly ScreenId[]; value: boolean }>();

/**
 * Whether the draft has layout changes `doc` does not have (see `LayoutActions.hasPendingChanges`): what the next
 * sync would leave, compared with the document. An empty draft has none (the next sync restores the document's).
 * Memoized per version of the draft, the last sync and the document.
 */
export function selectPendingChanges(state: ScreensView & Pick<LayoutState, "docSync">, doc: ScreensSource): boolean {
  const { screens, screenOrder, docSync: sync } = state;
  if (screenOrder.length === 0) return false;
  if (sync && sync.clean && sync.draft.screens === screens && sync.draft.screenOrder === screenOrder) return false;
  const hit = pendingMemo.get(screens);
  if (hit && hit.order === screenOrder && hit.sync === sync && hit.docScreens === doc.screens && hit.docOrder === doc.screenOrder) return hit.value;
  const fromDoc = screensFromDoc(doc);
  const base = sync ? screensFromDoc(sync.doc) : null;
  const value = !sameScreensContent(mergeDocScreens({ screens, screenOrder }, base, fromDoc), fromDoc);
  pendingMemo.set(screens, { order: screenOrder, sync, docScreens: doc.screens, docOrder: doc.screenOrder, value });
  return value;
}

/**
 * The blocks «Regenerar N bloques» would rebuild, per screen in order: new or changed since the last «Generar»
 * (removed blocks have no section left). `all` is true when no block of that screen has a fingerprint yet (a new
 * or never generated screen).
 */
export function selectChangedBlocks(state: ScreensView & Pick<LayoutState, "generatedPrints">): ChangedBlocks[] {
  const { screens, screenOrder, generatedPrints: prints } = state;
  const out: ChangedBlocks[] = [];
  for (const id of screenOrder) {
    const screen = screens[id];
    if (!screen) continue;
    const base = prints?.[id];
    const changed: BlockId[] = [];
    let printed = 0;
    for (const [blockId, block] of Object.entries(screen.layout.blocks)) {
      const print = base?.[blockId] ?? block.generated;
      if (print) printed++;
      if (!print || !matchesPrint(print, block)) changed.push(blockId);
    }
    out.push({ screenId: id, changed, all: printed === 0 });
  }
  return out;
}

/** Whether «Generar» ran: in this session, or before (the document's blocks carry their fingerprints). */
export function selectHasGenerated(state: ScreensView & Pick<LayoutState, "generated">): boolean {
  if (state.generated !== null) return true;
  return state.screenOrder.some((id) => {
    const screen = state.screens[id];
    return screen !== undefined && Object.values(screen.layout.blocks).some((block) => block.generated !== undefined);
  });
}

/* ------------------------------------------------------------------------------------------------ */
/* Store                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

function readShortcutsPreference(): boolean {
  try {
    return window.localStorage.getItem(SHORTCUTS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeShortcutsPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {}
}

/** One layout store (with undo/redo of the screens) per LayoutStep. Ids are only created in actions. */
export function createLayoutStore(init: LayoutStoreInit = {}): LayoutStore {
  const initialScreens: Record<ScreenId, Screen> = {};
  const initialOrder: ScreenId[] = [];
  for (const screen of init.screens ?? []) {
    if (initialScreens[screen.id]) continue;
    initialScreens[screen.id] = screen;
    initialOrder.push(screen.id);
  }

  const store: LayoutStore = createStore<LayoutState>()(
    temporal(
      (set, get, api) => {
        // Inside the initializer zundo types `api.temporal` as unknown.
        const history = () => (api as unknown as LayoutStore).temporal.getState();

        /*
         * Version of the screens (`changeToken`): every change of `screens`/`screenOrder` gets a fresh number,
         * whatever caused it (an action, undo, redo, `setState`). A committed batch keeps the number of its
         * live state and a cancelled one gets back the number of its base: the screens are those same objects.
         */
        let lastRevision = 0;
        let revision = 0;
        let batchRevision = 0;
        api.subscribe((state, prev) => {
          if (state.screens !== prev.screens || state.screenOrder !== prev.screenOrder) revision = ++lastRevision;
        });
        const batchChanged = (base: HistorySlice) => get().screens !== base.screens || get().screenOrder !== base.screenOrder;
        // Every `labelFor` used so far: after a language change, a block keeps reading as default-named.
        const pastLabelFor = new Set<(type: LibraryBlockType) => string>();
        const labelers: LayoutLabelers = {
          labelFor: init.labelFor ?? ((type) => type),
          screenNameFor: init.screenNameFor ?? ((templateId) => templateId),
          copyName: init.copyName ?? ((name) => `${name} (copy)`),
          isDefaultLabel:
            init.isDefaultLabel ??
            ((type, label) => [labelers.labelFor, ...pastLabelFor].some((labelFor) => sanitizeLabel(labelFor(type)) === label)),
        };

        /** Every id in use: screens and the blocks of every screen (block ids stay unique project-wide). */
        const takenIds = (screens: Record<ScreenId, Screen> = get().screens): Set<string> => {
          const taken = new Set<string>();
          for (const screen of Object.values(screens)) {
            taken.add(screen.id);
            for (const blockId of Object.keys(screen.layout.blocks)) taken.add(blockId);
          }
          return taken;
        };
        const nextId = (prefix: "b" | "s", taken: Set<string>): string => {
          const id = init.newId
            ? init.newId(prefix, taken)
            : prefix === "b"
              ? newBlockId(taken, init.random)
              : newScreenId(taken, init.random);
          taken.add(id);
          return id;
        };

        const screenOf = (screenId?: ScreenId): Screen | null => {
          const state = get();
          const id = screenId ?? selectActiveScreenId(state);
          return id ? (state.screens[id] ?? null) : null;
        };
        const withLayout = (screen: Screen, layout: LayoutDoc): Record<ScreenId, Screen> => ({
          ...get().screens,
          [screen.id]: { ...screen, layout },
        });
        const adjusted = (adjustments: Adjustment[]): Partial<LayoutState> =>
          adjustments.length > 0 ? { lastAdjustments: adjustments, adjustmentsTick: get().adjustmentsTick + 1 } : {};
        /** Records a refusal at a document limit (LayoutStep says why). */
        const limitHit = (limit: LimitHit["limit"]) => set({ limitHit: { limit, tick: (get().limitHit?.tick ?? 0) + 1 } });

        const routeFor = (name: string, kind: ScreenKind, screens: Record<ScreenId, Screen>, exceptId?: ScreenId): string => {
          const routes = new Set(Object.values(screens).filter((s) => s.id !== exceptId).map((s) => s.route));
          if (kind === "landing" && !routes.has("/")) return "/";
          return uniqueRoute(`/${slugify(name)}`, routes);
        };
        const namesOf = (screens: Record<ScreenId, Screen>, exceptId?: ScreenId) =>
          new Set(Object.values(screens).filter((s) => s.id !== exceptId).map((s) => s.name));

        /** A new screen from a template (not stored yet). `null` for «En blanco» without a kind. */
        const buildScreen = (
          templateId: ScreenTemplateId,
          kind: ScreenKind | undefined,
          screens: Record<ScreenId, Screen>,
          order: readonly ScreenId[],
          taken: Set<string>,
        ): Screen | null => {
          const template = getScreenTemplate(templateId);
          const screenKind = template.kind ?? kind;
          if (!screenKind) return null;
          const { layout, shell } = instantiateTemplate(template, {
            label: labelers.labelFor,
            newId: () => nextId("b", taken),
          });
          const id = nextId("s", taken);
          const name = uniqueName(sanitizeLabel(labelers.screenNameFor(templateId)) || templateId, namesOf(screens));
          let appShell: AppShell | null = null;
          if (screenKind === "app") {
            const base: AppShell = shell ? { ...shell } : { ...DEFAULT_APP_SHELL };
            const shared = sharedNav(screens, order);
            appShell = base.nav !== "none" && shared ? { ...base, nav: shared } : base;
          }
          return { id, name, kind: screenKind, route: routeFor(name, screenKind, screens), layout, shell: appShell };
        };

        const actions: LayoutActions = {
          /* ---------------------------------------------------------------------------------------- */
          /* Screens                                                                                  */
          /* ---------------------------------------------------------------------------------------- */
          applySet: (setId) => {
            const template = getSetTemplate(setId);
            if (get().screenOrder.length + template.screens.length > MAX_SCREENS) {
              limitHit("screens");
              return [];
            }
            const taken = takenIds();
            const screens = { ...get().screens };
            const order = [...get().screenOrder];
            const created: ScreenId[] = [];
            for (const templateId of template.screens) {
              const screen = buildScreen(templateId, undefined, screens, order, taken);
              if (!screen) continue;
              screens[screen.id] = screen;
              order.push(screen.id);
              created.push(screen.id);
            }
            if (created.length === 0) return created;
            set({ screens, screenOrder: order, activeScreenId: created[0]!, selectedId: null });
            return created;
          },
          addScreen: (templateId, kind) => {
            const { screens, screenOrder } = get();
            const screen = buildScreen(templateId, kind, screens, screenOrder, takenIds());
            if (!screen) return null;
            if (screenOrder.length >= MAX_SCREENS) {
              limitHit("screens");
              return null;
            }
            set({
              screens: { ...screens, [screen.id]: screen },
              screenOrder: [...screenOrder, screen.id],
              activeScreenId: screen.id,
              selectedId: null,
            });
            return screen.id;
          },
          duplicateScreen: (id) => {
            const { screens, screenOrder, copies } = get();
            const source = screens[id];
            if (!source) return null;
            if (screenOrder.length >= MAX_SCREENS) {
              limitHit("screens");
              return null;
            }
            const taken = takenIds();
            const blockIds = Object.keys(source.layout.blocks).sort();
            const idMap = new Map(blockIds.map((blockId) => [blockId, nextId("b", taken)] as const));
            const blocks: Record<BlockId, LayoutBlock> = {};
            for (const blockId of blockIds) {
              const copy = JSON.parse(JSON.stringify(source.layout.blocks[blockId])) as LayoutBlock;
              delete copy.generated;
              if (copy.parentId !== undefined) copy.parentId = idMap.get(copy.parentId) ?? copy.parentId;
              blocks[idMap.get(blockId)!] = copy;
            }
            const copyId = nextId("s", taken);
            const name = uniqueName(source.name, namesOf(screens), labelers.copyName);
            const routes = new Set(Object.values(screens).map((s) => s.route));
            const copy: Screen = {
              id: copyId,
              name,
              kind: source.kind,
              route: uniqueRoute(`/${slugify(name)}`, routes),
              layout: { ...source.layout, blocks },
              shell: source.shell ? { ...source.shell } : null,
            };
            const order = [...screenOrder];
            order.splice(order.indexOf(id) + 1, 0, copyId);
            // What it copies, for the next «Generar»: a copy of a copy that was never generated copies its source.
            const via = Object.hasOwn(copies, id) ? copies[id] : undefined;
            const copied: Record<BlockId, BlockId> = {};
            for (const [sourceId, newId] of idMap) {
              const original = via ? (Object.hasOwn(via.blocks, sourceId) ? via.blocks[sourceId] : undefined) : sourceId;
              if (original !== undefined) copied[newId] = original;
            }
            set({
              screens: { ...screens, [copyId]: copy },
              screenOrder: order,
              activeScreenId: copyId,
              selectedId: null,
              copies: { ...copies, [copyId]: { from: via?.from ?? id, blocks: copied } },
            });
            return copyId;
          },
          renameScreen: (id, rawName) => {
            const screens = get().screens;
            const screen = screens[id];
            const sanitized = sanitizeLabel(rawName);
            if (!screen || !sanitized) return false;
            // Names stay unique (decision 43): «Dashboard» next to another «Dashboard» becomes «Dashboard 2».
            const name = uniqueName(sanitized, namesOf(screens, id));
            if (name === screen.name) return false;
            const route =
              screen.route !== "/" && isAutoRoute(screen.route, screen.name)
                ? uniqueRoute(`/${slugify(name)}`, new Set(Object.values(screens).filter((s) => s.id !== id).map((s) => s.route)))
                : screen.route;
            set({ screens: { ...screens, [id]: { ...screen, name, route } } });
            return true;
          },
          setRoute: (id, raw) => {
            const screens = get().screens;
            const screen = screens[id];
            if (!screen) return { ok: false, reason: "missing" };
            let route = raw.trim().toLowerCase();
            if (route.length > 1) route = route.replace(/\/+$/, "");
            // The document's rule (`RouteSchema`): a longer route would make «Generar» fail.
            if (route.length > ROUTE_MAX || !ROUTE_RE.test(route)) return { ok: false, reason: "invalid" };
            if (route === screen.route) return { ok: true, route };
            if (Object.values(screens).some((s) => s.id !== id && s.route === route)) return { ok: false, reason: "taken" };
            set({ screens: { ...screens, [id]: { ...screen, route } } });
            return { ok: true, route };
          },
          removeScreen: (id) => {
            const state = get();
            if (!state.screens[id] || state.screenOrder.length <= 1) return false;
            const index = state.screenOrder.indexOf(id);
            const order = state.screenOrder.filter((screenId) => screenId !== id);
            const screens: Record<ScreenId, Screen> = {};
            for (const screenId of order) {
              const screen = state.screens[screenId]!;
              // Links to the removed screen go in the same step (undo brings both back).
              const linked = Object.entries(screen.layout.blocks).filter(([, block]) => block.linkTo === id);
              if (linked.length === 0) {
                screens[screenId] = screen;
                continue;
              }
              const blocks = { ...screen.layout.blocks };
              for (const [blockId, block] of linked) {
                const unlinked = { ...block };
                delete unlinked.linkTo;
                blocks[blockId] = unlinked;
              }
              screens[screenId] = { ...screen, layout: { ...screen.layout, blocks } };
            }
            const wasActive = selectActiveScreenId(state) === id;
            const neighbor = order[Math.min(index, order.length - 1)] ?? null;
            set({ screens, screenOrder: order, ...(wasActive && { activeScreenId: neighbor, selectedId: null }) });
            return true;
          },
          moveScreen: (id, toIndex) => {
            const order = [...get().screenOrder];
            const from = order.indexOf(id);
            if (from < 0) return false;
            const to = Math.max(0, Math.min(order.length - 1, Math.round(toIndex)));
            if (to === from) return false;
            order.splice(from, 1);
            order.splice(to, 0, id);
            set({ screenOrder: order });
            return true;
          },
          setActiveScreen: (id) => {
            const state = get();
            if (!state.screens[id] || state.activeScreenId === id) return;
            set({ activeScreenId: id, selectedId: null });
          },
          setShell: (id, partial) => {
            const { screens, screenOrder } = get();
            const next = withShell(screens, screenOrder, id, partial);
            if (next === screens) return false;
            set({ screens: next });
            return true;
          },
          convertScreen: (id, kind) => {
            const { screens, screenOrder } = get();
            const screen = screens[id];
            if (!screen || screen.kind === kind) return false;
            if (kind === "landing") {
              set({ screens: { ...screens, [id]: { ...screen, kind, shell: null } } });
              return true;
            }
            // To app: navbar/sidebar blocks are the navigation frame there, not blocks (critique #4).
            const frameBlocks = Object.entries(screen.layout.blocks).filter(
              ([, block]) => isLibraryBlockType(block.type) && getBlockDef(block.type).frame !== null,
            );
            const frames = new Set(frameBlocks.map(([, block]) => getBlockDef(block.type).frame));
            const fromBlocks: AppNav | null = frames.has("sidebar") ? "sidebar" : frames.has("topnav") ? "topnav" : null;
            // Their content stays on the screen (a navbar can hold children: a container whose type changed).
            const layout = removeKeepingChildren(screen.layout, frameBlocks.map(([blockId]) => blockId));
            const nav = fromBlocks ?? sharedNav(screens, screenOrder, id) ?? DEFAULT_APP_SHELL.nav;
            const converted = { ...screens, [id]: { ...screen, kind, layout, shell: { ...DEFAULT_APP_SHELL, nav } } };
            set({ screens: withShell(converted, screenOrder, id, { nav }) });
            return true;
          },
          applyProposal: (proposed, { mode, brief }) => {
            const state = get();
            if (proposed.length === 0) return [];
            const kept = mode === "append" ? state.screenOrder.length : 0;
            if (kept + proposed.length > MAX_SCREENS) {
              limitHit("screens");
              return [];
            }
            // Every id in use stays taken, the replaced screens' too: an undo brings them back next to these.
            const taken = takenIds();
            const screens: Record<ScreenId, Screen> = mode === "append" ? { ...state.screens } : {};
            const order: ScreenId[] = mode === "append" ? [...state.screenOrder] : [];
            const screenIds = new Map(proposed.map((screen) => [screen.key, nextId("s", taken)] as const));
            const created: ScreenId[] = [];
            for (const source of proposed) {
              const id = screenIds.get(source.key)!;
              const name = uniqueName(sanitizeLabel(source.name) || labelers.screenNameFor("blank"), namesOf(screens));
              const routes = new Set(Object.values(screens).map((screen) => screen.route));
              const wanted = source.route.trim().toLowerCase();
              const route =
                wanted.length <= ROUTE_MAX && ROUTE_RE.test(wanted) && !routes.has(wanted) && (wanted !== "/" || source.kind === "landing")
                  ? wanted
                  : routeFor(name, source.kind, screens);
              const blockIds = new Map(Object.keys(source.layout.blocks).map((blockId) => [blockId, nextId("b", taken)] as const));
              const blocks: Record<BlockId, LayoutBlock> = {};
              for (const [blockId, block] of Object.entries(source.layout.blocks)) {
                if (!isLibraryBlockType(block.type)) continue;
                const copy: LayoutBlock = { ...block, rect: boundRect(block.rect) };
                delete copy.generated;
                delete copy.pinned;
                if (copy.parentId !== undefined) {
                  const parentId = blockIds.get(copy.parentId);
                  if (parentId) copy.parentId = parentId;
                  else delete copy.parentId;
                }
                if (copy.linkTo !== undefined) {
                  const target = screenIds.get(copy.linkTo);
                  if (target) copy.linkTo = target;
                  else delete copy.linkTo;
                }
                blocks[blockIds.get(blockId)!] = copy;
              }
              let shell: AppShell | null = null;
              if (source.kind === "app") {
                const base: AppShell = source.shell ? { nav: source.shell.nav, header: source.shell.header } : { ...DEFAULT_APP_SHELL };
                // The project's app screens share one navigation (decision 40): a new screen with navigation takes it.
                const shared = sharedNav(screens, order);
                shell = base.nav !== "none" && shared ? { ...base, nav: shared } : base;
              }
              screens[id] = { id, name, kind: source.kind, route, layout: { ...emptyLayout(), blocks }, shell };
              order.push(id);
              created.push(id);
            }
            set({
              screens,
              screenOrder: order,
              activeScreenId: created[0]!,
              selectedId: null,
              ...(mode === "replace" && { copies: {} }),
              brief: brief ? { value: brief, screenIds: created } : null,
            });
            return created;
          },

          /* ---------------------------------------------------------------------------------------- */
          /* Blocks                                                                                   */
          /* ---------------------------------------------------------------------------------------- */
          insertBlock: (type, options = {}) => {
            const none: InsertOutcome = { id: null, nav: null, adjustments: [] };
            const screen = screenOf(options.screenId);
            if (!screen || !isLibraryBlockType(type)) return none;
            const def = getBlockDef(type);
            if (screen.kind === "app" && def.frame) {
              const { screens, screenOrder } = get();
              const next = withShell(screens, screenOrder, screen.id, { nav: def.frame });
              if (next !== screens) set({ screens: next });
              return { id: null, nav: def.frame, adjustments: [] };
            }
            if (Object.keys(screen.layout.blocks).length >= MAX_BLOCKS) {
              limitHit("blocks");
              return none;
            }
            const id = nextId("b", takenIds());
            const parentId = options.parentId !== undefined && screen.layout.blocks[options.parentId] ? options.parentId : undefined;
            const result = insertLayoutBlock(screen.layout, {
              type,
              label: labelers.labelFor(type),
              id,
              ...(options.rect && { rect: boundRect(options.rect) }),
              ...(parentId !== undefined && { parentId }),
              ...(options.count !== undefined && { count: options.count }),
              ...(options.note !== undefined && { note: options.note }),
            });
            set({ screens: withLayout(screen, result.layout), selectedId: result.id, ...adjusted(result.adjustments) });
            return { id: result.id, nav: null, adjustments: result.adjustments, ...(result.grown && { grown: result.grown }) };
          },
          updateBlock: (id, patch, screenId) => {
            const unchanged: UpdateOutcome = { changed: false, nav: null };
            const screen = screenOf(screenId);
            const block = screen?.layout.blocks[id];
            if (!screen || !block) return unchanged;
            const nextType = patch.type !== undefined && isLibraryBlockType(patch.type) ? patch.type : block.type;

            // On an app screen a navbar/sidebar is the navigation frame: it replaces the block.
            if (nextType !== block.type && screen.kind === "app") {
              const frame = getBlockDef(nextType).frame;
              if (frame) {
                const { screens, screenOrder } = get();
                const withoutBlock = { ...screens, [screen.id]: { ...screen, layout: removeKeepingChildren(screen.layout, [id]) } };
                set({ screens: withShell(withoutBlock, screenOrder, screen.id, { nav: frame }) });
                return { changed: true, nav: frame };
              }
            }

            const next: LayoutBlock = { ...block };
            if (nextType !== block.type) {
              // A label that was the default name of the old type (in any UI language) follows the new type;
              // a custom one stays.
              if (labelers.isDefaultLabel(block.type, block.label)) next.label = sanitizeLabel(labelers.labelFor(nextType));
              next.type = nextType;
              if (next.count !== undefined) {
                if (getBlockDef(nextType).repeatable) next.count = clampCount(nextType, next.count);
                else delete next.count;
              }
            }
            if (patch.label !== undefined) {
              const label = sanitizeLabel(patch.label);
              if (label) next.label = label;
            }
            if ("note" in patch) {
              const note = sanitizeNote(patch.note);
              if (note) next.note = note;
              else delete next.note;
            }
            if ("count" in patch) {
              if (typeof patch.count !== "number") delete next.count;
              else next.count = clampCount(next.type, patch.count);
            }
            if ("linkTo" in patch) {
              if (patch.linkTo && get().screens[patch.linkTo]) next.linkTo = patch.linkTo;
              else delete next.linkTo;
            }
            if ("responsive" in patch || nextType !== block.type) {
              // Only behaviors the type offers: one kept from the old type would be used by the preview and
              // «Generar» while the inspector shows the default.
              const responsive = cleanResponsive(offeredBehaviors(next.type, "responsive" in patch ? patch.responsive : next.responsive));
              if (responsive) next.responsive = responsive;
              else delete next.responsive;
            }
            if ("hidden" in patch) {
              if (patch.hidden) next.hidden = true;
              else delete next.hidden;
            }
            if (sameBlockProps(block, next)) return unchanged;
            const layout: LayoutDoc = { ...screen.layout, blocks: { ...screen.layout.blocks, [id]: next } };
            set({ screens: withLayout(screen, layout) });
            return { changed: true, nav: null };
          },
          setRect: (id, raw, screenId) => {
            const screen = screenOf(screenId);
            const block = screen?.layout.blocks[id];
            const rect = boundRect(raw);
            if (!screen || !block || sameRect(block.rect, rect)) return [];
            const { layout, adjustments } = normalizeDrop(moveBlock(screen.layout, id, rect), id);
            set({ screens: withLayout(screen, layout), ...adjusted(adjustments) });
            return adjustments;
          },
          removeBlocks: (ids, screenId) => {
            const screen = screenOf(screenId);
            if (!screen) return [];
            const layout = removeLayoutBlocks(screen.layout, ids);
            if (layout === screen.layout) return [];
            const removed = Object.keys(screen.layout.blocks).filter((blockId) => !layout.blocks[blockId]);
            const selected = get().selectedId;
            set({ screens: withLayout(screen, layout), ...(selected && removed.includes(selected) && { selectedId: null }) });
            return removed;
          },
          duplicateBlock: (id, screenId) => {
            const screen = screenOf(screenId);
            if (!screen?.layout.blocks[id]) return null;
            const taken = takenIds();
            const result = duplicateLayoutBlock(screen.layout, id, {
              newId: nextId("b", taken),
              ...(init.random && { random: init.random }),
            });
            // The package checks the copied descendants' ids against this screen only: give them ids that are
            // free in the whole project (block ids stay unique project-wide).
            for (const blockId of Object.keys(result.layout.blocks)) taken.add(blockId);
            const rename = new Map<BlockId, BlockId>();
            for (const [sourceId, copyId] of Object.entries(result.idMap)) if (sourceId !== id) rename.set(copyId, nextId("b", taken));
            const blocks: Record<BlockId, LayoutBlock> = {};
            for (const [blockId, block] of Object.entries(result.layout.blocks)) {
              const parentId = block.parentId !== undefined ? rename.get(block.parentId) : undefined;
              blocks[rename.get(blockId) ?? blockId] = parentId !== undefined ? { ...block, parentId } : block;
            }
            if (Object.keys(blocks).length > MAX_BLOCKS) {
              limitHit("blocks");
              return null;
            }
            set({ screens: withLayout(screen, { ...result.layout, blocks }), selectedId: result.id });
            return result.id;
          },
          applyFix: (fix, screenId) => {
            const screen = screenOf(screenId);
            if (!screen) return false;
            const layout = applyLayoutFix(screen.layout, fix);
            if (layout === screen.layout) return false;
            set({ screens: withLayout(screen, layout) });
            return true;
          },
          retypeBlocks: (changes) => {
            const pending = changes.filter(({ screenId, blockId, type }) => {
              const block = get().screens[screenId]?.layout.blocks[blockId];
              return block !== undefined && block.type === "free" && type !== "free" && isLibraryBlockType(type);
            });
            if (pending.length === 0) return 0;
            // One undo step; inside a batch someone else opened, the changes join it.
            const own = get().batchBase === null;
            if (own) actions.beginBatch();
            let changed = 0;
            for (const { screenId, blockId, type } of pending) {
              if (actions.updateBlock(blockId, { type }, screenId).changed) changed++;
            }
            if (own) actions.commitBatch();
            return changed;
          },
          addSpace: (screenId, rows = ADD_SPACE_ROWS) => {
            if (!get().screens[screenId] || !(rows > 0)) return;
            const extraRows = get().extraRows;
            set({ extraRows: { ...extraRows, [screenId]: (extraRows[screenId] ?? 0) + Math.round(rows) } });
          },

          /* ---------------------------------------------------------------------------------------- */
          /* Batch (same trick as hooks/useDesignDoc.ts)                                              */
          /* ---------------------------------------------------------------------------------------- */
          beginBatch: () => {
            if (get().batchBase) return;
            const { screens, screenOrder } = get();
            batchRevision = revision;
            history().pause();
            set({ batchBase: { screens, screenOrder } });
          },
          commitBatch: () => {
            const base = get().batchBase;
            if (!base) return;
            const { screens, screenOrder } = get();
            const live: HistorySlice = { screens, screenOrder };
            const liveRevision = revision;
            const changed = batchChanged(base);
            // Rewind to the base while paused, then replay the live state tracked: one undo step.
            set({ ...(changed && base), batchBase: null });
            history().resume();
            if (!changed) return;
            set(live);
            revision = liveRevision;
          },
          cancelBatch: () => {
            const base = get().batchBase;
            if (!base) return;
            const changed = batchChanged(base);
            set({ ...(changed && base), batchBase: null });
            history().resume();
            if (changed) revision = batchRevision;
          },

          /* ---------------------------------------------------------------------------------------- */
          /* History                                                                                  */
          /* ---------------------------------------------------------------------------------------- */
          // `temporal.undo`/`redo` are wrapped below to commit an open batch first.
          undo: () => {
            const before = revision;
            history().undo();
            return revision !== before;
          },
          redo: () => {
            const before = revision;
            history().redo();
            return revision !== before;
          },
          changeToken: () => revision,
          undoIfLatest: (token) => token === revision && actions.undo(),

          /* ---------------------------------------------------------------------------------------- */
          /* View state                                                                               */
          /* ---------------------------------------------------------------------------------------- */
          select: (id) => {
            if (get().selectedId !== id) set({ selectedId: id });
          },
          setTool: (tool) => {
            if (get().tool !== tool) set({ tool });
          },
          setDevice: (device) => {
            if (get().device !== device) set({ device });
          },
          toggleStructure: (force) => {
            const showStructure = force ?? !get().showStructure;
            if (get().showStructure !== showStructure) set({ showStructure });
          },
          setShortcutsEnabled: (enabled) => {
            writeShortcutsPreference(enabled);
            if (get().shortcutsEnabled !== enabled) set({ shortcutsEnabled: enabled });
          },
          setStyle: (style) => {
            if (get().style !== style) set({ style });
          },
          setLeftTab: (leftTab) => {
            if (get().leftTab !== leftTab) set({ leftTab });
          },

          /* ---------------------------------------------------------------------------------------- */
          /* Document sync                                                                            */
          /* ---------------------------------------------------------------------------------------- */
          syncFromDoc: (doc) => {
            const sync = get().docSync;
            // An empty draft while the document has screens (undo past the first template): the document's come back.
            const restore = get().screenOrder.length === 0 && doc.screenOrder.length > 0;
            if (!restore && sync && sync.doc.screens === doc.screens && sync.doc.screenOrder === doc.screenOrder) return "unchanged";
            const docRef: ScreensSource = { screens: doc.screens, screenOrder: doc.screenOrder };
            const key = screensKey(doc);
            if (!restore && sync && sync.key === key) {
              // Same screens in a re-parsed document (a brand or style edit): remember the new objects only.
              set({ docSync: { ...sync, doc: docRef } });
              return "unchanged";
            }
            // A draft gesture in progress ends here: the merge below must not land inside its undo step.
            actions.commitBatch();
            const { screens, screenOrder } = get();
            const draft: HistorySlice = { screens, screenOrder };
            const fromDoc = screensFromDoc(doc);
            // Replacing the draft is only safe when it holds nothing the document lacks: the very draft a clean sync
            // or «Generar» left. A merged draft with edits of its own merges again (its edits are never dropped).
            const untouched =
              restore ||
              (sync ? sync.clean && sync.draft.screens === screens && sync.draft.screenOrder === screenOrder : screenOrder.length === 0);
            if (untouched) {
              history().pause();
              set({
                screens: fromDoc.screens,
                screenOrder: fromDoc.screenOrder,
                generatedPrints: null,
                docSync: { doc: docRef, key, draft: fromDoc, clean: true },
                copies: {},
              });
              history().resume();
              history().clear();
              return "reseeded";
            }
            const base = sync ? screensFromDoc(sync.doc) : null;
            const memo = new WeakMap<Screen, Screen>();
            const merged = mergeDocScreens(draft, base, fromDoc, memo);
            history().pause();
            set({
              ...(merged !== draft && { screens: merged.screens }),
              generatedPrints: null,
              docSync: { doc: docRef, key, draft: merged, clean: sameScreensContent(merged, fromDoc) },
            });
            history().resume();
            const rebase = (slices: Partial<HistorySlice>[]) =>
              slices.map((slice) => (slice.screens && slice.screenOrder ? mergeDocScreens(slice as HistorySlice, base, fromDoc, memo) : slice));
            const { pastStates, futureStates } = history();
            (api as unknown as LayoutStore).temporal.setState({ pastStates: rebase(pastStates), futureStates: rebase(futureStates) });
            return "merged";
          },
          markSynced: (doc) => {
            const { screens, screenOrder, docSync: sync } = get();
            const first = !sync || sync.doc.screenOrder.length === 0;
            set({
              docSync: { doc: { screens: doc.screens, screenOrder: doc.screenOrder }, key: screensKey(doc), draft: { screens, screenOrder }, clean: true },
            });
            if (first) history().clear();
          },
          hasPendingChanges: (doc) => selectPendingChanges(get(), doc),

          /* ---------------------------------------------------------------------------------------- */
          /* Generate                                                                                 */
          /* ---------------------------------------------------------------------------------------- */
          generate: (options) => {
            const state = get();
            const changed = selectChangedCount(state);
            const screens: GeneratedScreen[] = [];
            const prints: GeneratedPrints = {};
            let overLimit: LimitHit["limit"] | null = state.screenOrder.length > MAX_SCREENS ? "screens" : null;
            for (const screenId of state.screenOrder) {
              const screen = state.screens[screenId];
              if (!screen) continue;
              const { layout } = screen;
              if (Object.keys(layout.blocks).length > MAX_BLOCKS) overLimit ??= "blocks";
              const copy = Object.hasOwn(state.copies, screenId) ? state.copies[screenId] : undefined;
              const copyOf = copy ? copyOfFor(copy, layout) : null;
              const structure = getStructure(layout);
              const responsive = getResponsive(layout);
              screens.push({
                screenId,
                name: screen.name,
                kind: screen.kind,
                route: screen.route,
                shell: screen.shell,
                layout,
                structure,
                responsive,
                // As the page is built and exported (absorbed blocks out), so the report shows the CSS the user gets.
                css: compileScreenLayout({ layout, kind: screen.kind }).css,
                ascii: toAsciiWireframe(layout, { structure, responsive }),
                warnings: structure.warnings,
                ...(copyOf && { copyOf }),
              });
              const screenPrints: Record<BlockId, GeneratedFingerprint> = {};
              for (const [blockId, block] of Object.entries(layout.blocks)) screenPrints[blockId] = fingerprintOf(block, layout, blockId);
              prints[screenId] = screenPrints;
            }
            const brief = state.brief && state.brief.screenIds.some((id) => Object.hasOwn(state.screens, id)) ? state.brief.value : null;
            const result: GenerateResult = { screens, changed, ...(brief && { brief }) };
            // The document would refuse it: say why instead of a write that can only fail (`accept` is not asked).
            if (overLimit) {
              limitHit(overLimit);
              return result;
            }
            if (options?.accept && !options.accept(result)) return result;
            set({ generated: result, generatedPrints: prints, copies: {} });
            return result;
          },
          changedCount: () => selectChangedCount(get()),

          setLabelers: (next) => {
            if (next.labelFor && next.labelFor !== labelers.labelFor) {
              pastLabelFor.add(labelers.labelFor);
              labelers.labelFor = next.labelFor;
            }
            if (next.screenNameFor) labelers.screenNameFor = next.screenNameFor;
            if (next.copyName) labelers.copyName = next.copyName;
            if (next.isDefaultLabel) labelers.isDefaultLabel = next.isDefaultLabel;
          },
        };

        return {
          screens: initialScreens,
          screenOrder: initialOrder,
          activeScreenId: initialOrder[0] ?? null,
          selectedId: null,
          tool: "edit",
          device: "desktop",
          showStructure: false,
          shortcutsEnabled: init.shortcutsEnabled ?? readShortcutsPreference(),
          style: init.style ?? "",
          leftTab: "blocks",
          extraRows: {},
          generated: null,
          generatedPrints: null,
          lastAdjustments: [],
          adjustmentsTick: 0,
          batchBase: null,
          docSync: null,
          limitHit: null,
          copies: {},
          brief: null,
          actions,
        };
      },
      {
        partialize: (state): HistorySlice => ({ screens: state.screens, screenOrder: state.screenOrder }),
        equality: (past, current) => past.screens === current.screens && past.screenOrder === current.screenOrder,
        limit: HISTORY_LIMIT,
      },
    ),
  );

  // zundo's undo/redo ignore `isTracking`: undoing inside an open batch would leave history paused. Every
  // caller (toasts, layers, shortcuts) goes through these, so an open batch is committed first.
  const { undo, redo } = store.temporal.getState();
  store.temporal.setState({
    undo: (steps) => {
      store.getState().actions.commitBatch();
      undo(steps);
    },
    redo: (steps) => {
      store.getState().actions.commitBatch();
      redo(steps);
    },
  });
  return store;
}

/* ------------------------------------------------------------------------------------------------ */
/* React                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

const LayoutStoreContext = createContext<LayoutStore | null>(null);
const LayoutEnvContext = createContext<LayoutEnv | null>(null);

export type LayoutStoreProviderProps = {
  children: ReactNode;
  /** Read once, when the store is created. */
  init?: LayoutStoreInit;
  /** An existing store instead of a new one (tests, Fase B lifting the state up). */
  store?: LayoutStore;
  /** Props of LayoutStep the children read (doc, guide, narrow…). */
  env?: LayoutEnv;
};

/** One layout store per LayoutStep instance, plus the LayoutStep environment. */
export function LayoutStoreProvider({ children, init, store: external, env }: LayoutStoreProviderProps) {
  const [store] = useState(() => external ?? createLayoutStore(init));
  return createElement(
    LayoutStoreContext.Provider,
    { value: store },
    createElement(LayoutEnvContext.Provider, { value: env ?? null }, children),
  );
}

/** The store itself (getState/subscribe/temporal) for imperative use. */
export function useLayoutStoreApi(): LayoutStore {
  const store = useContext(LayoutStoreContext);
  if (!store) throw new Error("useLayoutStore must be used inside <LayoutStoreProvider>");
  return store;
}

/**
 * Reads the layout store: `useLayoutStore((s) => s.tool)`. Selectors that build new objects need
 * `useShallow` (zustand/react/shallow) to avoid render loops.
 */
export function useLayoutStore<T>(selector: (state: LayoutState) => T): T {
  return useStore(useLayoutStoreApi(), selector);
}

/** Stable action object (never re-renders). */
export const useLayoutActions = (): LayoutActions => useLayoutStore((state) => state.actions);

/** LayoutStep props and layout facts (doc, imported guide, narrow viewport, focusRegion). */
export function useLayoutEnv(): LayoutEnv {
  const env = useContext(LayoutEnvContext);
  if (!env) throw new Error("useLayoutEnv must be used inside <LayoutStep>");
  return env;
}

export type LayoutHistory = { canUndo: boolean; canRedo: boolean; undo: () => boolean; redo: () => boolean };

/** Whether an open batch has changed the screens (undo would commit it as a step, redo has nothing left). */
export function selectBatchChanged(state: ScreensView & Pick<LayoutState, "batchBase">): boolean {
  const base = state.batchBase;
  return base !== null && (base.screens !== state.screens || base.screenOrder !== state.screenOrder);
}

/** Undo/redo of the screens (zundo). Selection, tool, device and view state are not part of it. */
export function useLayoutHistory(): LayoutHistory {
  const store = useLayoutStoreApi();
  const batchChanged = useStore(store, selectBatchChanged);
  const past = useStore(store.temporal, (state) => state.pastStates.length > 0);
  const future = useStore(store.temporal, (state) => state.futureStates.length > 0);
  const canUndo = past || batchChanged;
  const canRedo = future && !batchChanged;
  return useMemo(() => {
    const { actions } = store.getState();
    return { canUndo, canRedo, undo: actions.undo, redo: actions.redo };
  }, [store, canUndo, canRedo]);
}

export const useActiveScreenId = (): ScreenId | null => useLayoutStore(selectActiveScreenId);
export const useActiveScreen = (): Screen | null => useLayoutStore(selectActiveScreen);
export const useScreen = (screenId: ScreenId): Screen | null => useLayoutStore((state) => state.screens[screenId] ?? null);
/** Screens in order. */
export const useScreens = (): Screen[] =>
  useLayoutStore(useShallow((state) => state.screenOrder.flatMap((id) => (state.screens[id] ? [state.screens[id]] : []))));
/** The selected block id, `null` when it no longer exists in the active screen. */
export const useSelectedId = (): BlockId | null => useLayoutStore(selectSelectedId);

/** The selected block of the active screen with its id, or `null`. */
export function useSelectedBlock(): { id: BlockId; block: LayoutBlock } | null {
  return useLayoutStore(
    useShallow((state) => {
      const id = selectSelectedId(state);
      const block = id ? selectActiveScreen(state)?.layout.blocks[id] : undefined;
      return id && block ? { id, block } : null;
    }),
  );
}

const layoutOf = (state: LayoutState, screenId?: ScreenId): LayoutDoc | null =>
  (screenId ? state.screens[screenId] : selectActiveScreen(state))?.layout ?? null;

/** `inferStructure` of a screen (active by default), memoised per layout version. */
export function useScreenStructure(screenId?: ScreenId): Structure | null {
  const layout = useLayoutStore((state) => layoutOf(state, screenId));
  return layout ? getStructure(layout) : null;
}

/** `deriveResponsive` of a screen (active by default), memoised per layout version. */
export function useScreenResponsive(screenId?: ScreenId): ResponsiveLayout | null {
  const layout = useLayoutStore((state) => layoutOf(state, screenId));
  return layout ? getResponsive(layout) : null;
}

/** N of «Regenerar N bloques». */
export const useChangedCount = (): number => useLayoutStore(selectChangedCount);
/**
 * Whether the draft has layout changes `doc` (LayoutStep's, `useLayoutEnv().doc`) does not have: also the ones
 * «Regenerar N» does not count (moves, renames, routes, links, hiding), so «No hay cambios» is not shown over them.
 */
export const usePendingChanges = (doc: ScreensSource): boolean => useLayoutStore((state) => selectPendingChanges(state, doc));
export const useHasGenerated = (): boolean => useLayoutStore(selectHasGenerated);
