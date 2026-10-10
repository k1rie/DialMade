"use client";

import {
  applyFix as applyLayoutFix,
  duplicateBlock as duplicateLayoutBlock,
  estimateContent,
  getBlockDef,
  getScreenTemplate,
  getSetTemplate,
  hashString,
  insertBlock as insertLayoutBlock,
  instantiateTemplate,
  isLibraryBlockType,
  moveBlock,
  newBlockId,
  normalizeDrop,
  removeBlocks as removeLayoutBlocks,
  sanitizeLabel,
  sanitizeNote,
  toAsciiWireframe,
  toCss,
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
// Relative imports only: vitest runs this module without the `@/` alias.
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
  /** Appends the screens of a starting set («SaaS app», «Landing»); the first one becomes active. */
  applySet: (setId: SetTemplateId) => ScreenId[];
  /** Appends a screen from a template; «En blanco» needs `kind`. Returns `null` when it cannot. */
  addScreen: (templateId: ScreenTemplateId, kind?: ScreenKind) => ScreenId | null;
  /** Copies a screen (new block ids) right after it and activates the copy. */
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

  /* Blocks (active screen unless `screenId` is given). Every change is one undo step unless batched. */
  /** Inserts with the i18n label and selects the block. Frame blocks on an app screen set `shell.nav` instead. */
  insertBlock: (type: LibraryBlockType, options?: InsertBlockOptions) => InsertOutcome;
  /** Sanitizes label and note, clamps count; a type change keeps the geometry and renames only default labels. */
  updateBlock: (id: BlockId, patch: BlockPatch, screenId?: ScreenId) => UpdateOutcome;
  /** Move or resize (descendants follow a pure move), then `normalizeDrop`. Returns what was adjusted. */
  setRect: (id: BlockId, rect: GridRect, screenId?: ScreenId) => Adjustment[];
  /** Removes the blocks and their descendants; returns every removed id. Clears a removed selection. */
  removeBlocks: (ids: readonly BlockId[], screenId?: ScreenId) => BlockId[];
  /** Duplicates the block (and its descendants) and selects the copy. */
  duplicateBlock: (id: BlockId, screenId?: ScreenId) => BlockId | null;
  /** Applies a warning's one-click fix. */
  applyFix: (fix: LayoutFix, screenId?: ScreenId) => boolean;
  /** «+ Añadir espacio»: extra empty rows at the bottom of the frame (view state, not undoable). */
  addSpace: (screenId: ScreenId, rows?: number) => void;

  /* Batch: continuous edits (a keyboard grab) become one undo step. */
  beginBatch: () => void;
  commitBatch: () => void;
  /** Restores the screens as they were at `beginBatch`. */
  cancelBatch: () => void;

  /* View state (never undoable). */
  select: (id: BlockId | null) => void;
  setTool: (tool: Tool) => void;
  setDevice: (device: Breakpoint) => void;
  toggleStructure: (force?: boolean) => void;
  /** Persisted in localStorage (`dialmade.layout.shortcuts`). */
  setShortcutsEnabled: (enabled: boolean) => void;
  setStyle: (style: StyleChoice) => void;
  setLeftTab: (tab: LeftTab) => void;

  /* Generate. */
  /** Structure, responsive, CSS and ASCII of every screen, in order; stores the fingerprints. */
  generate: () => GenerateResult;
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

  actions: LayoutActions;
};

type HistorySlice = Pick<LayoutState, "screens" | "screenOrder">;
export type LayoutStore = StoreApi<LayoutState> & { temporal: StoreApi<TemporalState<HistorySlice>> };

/* ------------------------------------------------------------------------------------------------ */
/* Pure helpers                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

const ROUTE_RE = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
const SLUG_MAX = 48;
const LOOSE_COUNT_MAX = 99;
const ID_ATTEMPTS = 64;

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

function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; ; n++) {
    const candidate = sanitizeLabel(`${name} ${n}`);
    if (!taken.has(candidate)) return candidate;
  }
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

const changedMemo = new WeakMap<object, { order: ScreenId[]; prints: GeneratedPrints | null; value: number }>();

/** Blocks «Regenerar N bloques» would touch: new, changed or removed since the last «Generar». */
export function selectChangedCount(state: ScreensView & Pick<LayoutState, "generatedPrints">): number {
  const { screens, screenOrder, generatedPrints: prints } = state;
  const memo = changedMemo.get(screens);
  if (memo && memo.order === screenOrder && memo.prints === prints) return memo.value;
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
  changedMemo.set(screens, { order: screenOrder, prints, value: count });
  return count;
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

  return createStore<LayoutState>()(
    temporal(
      (set, get, api) => {
        let batchBase: HistorySlice | undefined;
        // Inside the initializer zundo types `api.temporal` as unknown.
        const history = () => (api as unknown as LayoutStore).temporal.getState();
        const labelers: LayoutLabelers = {
          labelFor: init.labelFor ?? ((type) => type),
          screenNameFor: init.screenNameFor ?? ((templateId) => templateId),
          copyName: init.copyName ?? ((name) => `${name} (copy)`),
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
            set({
              screens: { ...screens, [screen.id]: screen },
              screenOrder: [...screenOrder, screen.id],
              activeScreenId: screen.id,
              selectedId: null,
            });
            return screen.id;
          },
          duplicateScreen: (id) => {
            const { screens, screenOrder } = get();
            const source = screens[id];
            if (!source) return null;
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
            const name = uniqueName(sanitizeLabel(labelers.copyName(source.name)) || source.name, namesOf(screens));
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
            set({ screens: { ...screens, [copyId]: copy }, screenOrder: order, activeScreenId: copyId, selectedId: null });
            return copyId;
          },
          renameScreen: (id, rawName) => {
            const screens = get().screens;
            const screen = screens[id];
            const name = sanitizeLabel(rawName);
            if (!screen || !name || name === screen.name) return false;
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
            if (!ROUTE_RE.test(route)) return { ok: false, reason: "invalid" };
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
            const layout = frameBlocks.length > 0 ? removeLayoutBlocks(screen.layout, frameBlocks.map(([blockId]) => blockId)) : screen.layout;
            const nav = fromBlocks ?? sharedNav(screens, screenOrder, id) ?? DEFAULT_APP_SHELL.nav;
            const converted = { ...screens, [id]: { ...screen, kind, layout, shell: { ...DEFAULT_APP_SHELL, nav } } };
            set({ screens: withShell(converted, screenOrder, id, { nav }) });
            return true;
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
            const id = nextId("b", takenIds());
            const parentId = options.parentId !== undefined && screen.layout.blocks[options.parentId] ? options.parentId : undefined;
            const result = insertLayoutBlock(screen.layout, {
              type,
              label: labelers.labelFor(type),
              id,
              ...(options.rect && { rect: options.rect }),
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
                const withoutBlock = { ...screens, [screen.id]: { ...screen, layout: removeLayoutBlocks(screen.layout, [id]) } };
                set({ screens: withShell(withoutBlock, screenOrder, screen.id, { nav: frame }) });
                return { changed: true, nav: frame };
              }
            }

            const next: LayoutBlock = { ...block };
            if (nextType !== block.type) {
              // A label that was the default name of the old type follows the new type; a custom one stays.
              if (block.label === sanitizeLabel(labelers.labelFor(block.type))) next.label = sanitizeLabel(labelers.labelFor(nextType));
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
            if ("responsive" in patch) {
              const responsive = cleanResponsive(patch.responsive);
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
          setRect: (id, rect, screenId) => {
            const screen = screenOf(screenId);
            const block = screen?.layout.blocks[id];
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
            const result = duplicateLayoutBlock(screen.layout, id, {
              newId: nextId("b", takenIds()),
              ...(init.random && { random: init.random }),
            });
            set({ screens: withLayout(screen, result.layout), selectedId: result.id });
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
          addSpace: (screenId, rows = ADD_SPACE_ROWS) => {
            if (!get().screens[screenId] || !(rows > 0)) return;
            const extraRows = get().extraRows;
            set({ extraRows: { ...extraRows, [screenId]: (extraRows[screenId] ?? 0) + Math.round(rows) } });
          },

          /* ---------------------------------------------------------------------------------------- */
          /* Batch (same trick as hooks/useDesignDoc.ts)                                              */
          /* ---------------------------------------------------------------------------------------- */
          beginBatch: () => {
            if (batchBase !== undefined) return;
            const { screens, screenOrder } = get();
            batchBase = { screens, screenOrder };
            history().pause();
          },
          commitBatch: () => {
            if (batchBase === undefined) return;
            const base = batchBase;
            const { screens, screenOrder } = get();
            const live = { screens, screenOrder };
            batchBase = undefined;
            const changed = live.screens !== base.screens || live.screenOrder !== base.screenOrder;
            // Rewind to the base while paused, then replay the live state tracked: one undo step.
            if (changed) set(base);
            history().resume();
            if (changed) set(live);
          },
          cancelBatch: () => {
            if (batchBase === undefined) return;
            const base = batchBase;
            batchBase = undefined;
            const { screens, screenOrder } = get();
            if (screens !== base.screens || screenOrder !== base.screenOrder) set(base);
            history().resume();
          },

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
          /* Generate                                                                                 */
          /* ---------------------------------------------------------------------------------------- */
          generate: () => {
            const state = get();
            const changed = selectChangedCount(state);
            const screens: GeneratedScreen[] = [];
            const prints: GeneratedPrints = {};
            for (const screenId of state.screenOrder) {
              const screen = state.screens[screenId];
              if (!screen) continue;
              const { layout } = screen;
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
                css: toCss(layout, { kind: screen.kind, structure, responsive }),
                ascii: toAsciiWireframe(layout, { structure, responsive }),
                warnings: structure.warnings,
              });
              const screenPrints: Record<BlockId, GeneratedFingerprint> = {};
              for (const [blockId, block] of Object.entries(layout.blocks)) screenPrints[blockId] = fingerprintOf(block, layout, blockId);
              prints[screenId] = screenPrints;
            }
            const result: GenerateResult = { screens, changed };
            set({ generated: result, generatedPrints: prints });
            return result;
          },
          changedCount: () => selectChangedCount(get()),

          setLabelers: (next) => {
            if (next.labelFor) labelers.labelFor = next.labelFor;
            if (next.screenNameFor) labelers.screenNameFor = next.screenNameFor;
            if (next.copyName) labelers.copyName = next.copyName;
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

export type LayoutHistory = { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void };

/** Undo/redo of the screens (zundo). Selection, tool, device and view state are not part of it. */
export function useLayoutHistory(): LayoutHistory {
  const store = useLayoutStoreApi();
  const canUndo = useStore(store.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (state) => state.futureStates.length > 0);
  return useMemo(() => {
    const temporalState = () => store.temporal.getState();
    return { canUndo, canRedo, undo: () => temporalState().undo(), redo: () => temporalState().redo() };
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
