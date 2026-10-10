"use client";

import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc, Dials, PatchResult } from "@dialmade/doc";
import type { PaletteStyleId } from "@dialmade/palette";
import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react";
import { temporal, type TemporalState } from "zundo";
import { createStore, useStore, type StoreApi } from "zustand";
import type { DesignDerived } from "@/lib/design-derived";
import type { DesignEngine } from "@/lib/design-engine";
import type { Device } from "@/lib/devices";
import type { PaletteFlowView, PreviewMode } from "./usePaletteFlow";

export type { DesignDerived, ThemeVars } from "@/lib/design-derived";

/** Width of the preview frame in the Composer: the one device union of the app (`Device` in @/lib/devices). */
export type PreviewDevice = Device;
export type DialScope = "global" | OutputKind;

/** What `initFromPalette` reads from the flow (pass `usePaletteFlow().state`). */
export type PaletteFlowSnapshot = Pick<PaletteFlowView, "primary" | "secondary" | "styleId" | "logo" | "theme">;

export type InitFromPaletteOptions = {
  /** Brand name; defaults to the logo's file name (`brisa.svg` → «Brisa») or `defaultName`. */
  name?: string;
  /** Localized fallback name («Mi marca»). */
  defaultName: string;
  /** Locale of the copy of the pages (`brief.locale`). */
  locale: Locale;
  focus?: OutputKind;
  productType?: string;
};

export type DesignDocActions = {
  /** Loads the doc engine (@dialmade/doc + @dialmade/sections) once. Every other doc action needs it. */
  loadEngine: () => Promise<void>;
  /**
   * First call creates the DesignDoc from the Palette Lab (seeds, palette style, name from the logo
   * file) and clears the undo history. Later calls only sync seeds/palette style (undoable) and keep
   * pages and edits. Returns `null` when the flow has no primary yet.
   */
  initFromPalette: (flow: PaletteFlowSnapshot, options: InitFromPaletteOptions) => DesignDoc | null;
  /** `brief.focus = kind`, creating its default page when missing; it becomes the active page. Creating the doc's first page clears the undo history. */
  setFocus: (kind: OutputKind) => PatchResult;
  /** «+ Añadir»: default page of `kind` with its stored copy (no-op if it exists unless `replace`). Activates it by default. */
  addPage: (kind: OutputKind, options?: { layoutId?: string; replace?: boolean; activate?: boolean }) => PatchResult;
  /** Refuses to remove the last page. The focus/active page move to the first remaining one. */
  removePage: (kind: OutputKind) => PatchResult;
  /** Page shown in the Composer (ignored when the doc has no such page). Not part of the undo history. */
  setActivePage: (kind: OutputKind) => void;
  /**
   * RFC 6902 patch validated against the current DesignDoc (v2), as one undo step; an invalid patch leaves the doc
   * untouched. `allowLocked` only for explicit user actions («Desbloquear», editing a locked value).
   */
  applyPatch: (ops: unknown, options?: { allowLocked?: boolean }) => PatchResult;
  /** `cascade` also applies the recipe's pairing and motion tier (unless locked). */
  setRecipe: (recipeId: string, options?: { cascade?: boolean }) => PatchResult;
  setPairing: (pairingId: string) => PatchResult;
  setPaletteStyle: (styleId: PaletteStyleId) => PatchResult;
  /** Integers 1–10 (rounded/clamped). `scope` "global" (default) or a page kind (that page's own dials). */
  setDials: (dials: Partial<Dials>, scope?: DialScope) => PatchResult;
  /** `applyDefaults`: catalog recipe/pairing/motion for the product (unless locked). `rebuildPages`: regenerate copy and landing layout. Both default false. */
  setProductType: (productTypeId: string, options?: { applyDefaults?: boolean; rebuildPages?: boolean }) => PatchResult;
  /** Locale of the pages' copy; `rebuildPages` regenerates the stored copy (edits are lost). */
  setContentLocale: (locale: Locale, options?: { rebuildPages?: boolean }) => PatchResult;
  /** `tagline: null` or blank removes it. Every `{ bind: "brand.*" }` follows. */
  setBrandText: (text: { name?: string; tagline?: string | null }) => PatchResult;
  setPreviewMode: (mode: PreviewMode) => void;
  setDevice: (device: PreviewDevice) => void;
  /** Runtime logo (blob URL of the cropped logo). Never stored in the doc. */
  setLogoUrl: (url: string | undefined) => void;
  /** Groups continuous edits (a slider drag) into one undo step: begin → live actions → commit/cancel. */
  beginBatch: () => void;
  commitBatch: () => void;
  /** Restores the doc from `beginBatch`. */
  cancelBatch: () => void;
  /** Drops the doc and the history (keeps preview mode, device and logo). */
  reset: () => void;
};

export type DesignDocState = {
  doc: DesignDoc | null;
  /** Raw choice; read it through `selectActivePageKind`, which falls back when the page is gone (undo). */
  activePage: OutputKind | null;
  previewMode: PreviewMode;
  device: PreviewDevice;
  logoUrl: string | undefined;
  /** True once `loadEngine()` resolved. */
  engineReady: boolean;
  actions: DesignDocActions;
};

type HistorySlice = Pick<DesignDocState, "doc">;
export type DesignDocStore = StoreApi<DesignDocState> & { temporal: StoreApi<TemporalState<HistorySlice>> };

const HISTORY_LIMIT = 100;
const KIND_ORDER: readonly OutputKind[] = ["brand", "landing", "app"];

export type DesignEngineLoader = () => Promise<DesignEngine>;

let engine: DesignEngine | null = null;
let enginePromise: Promise<DesignEngine> | null = null;

const defaultEngineLoader: DesignEngineLoader = () => import("@/lib/design-engine").then((module) => module.designEngine);

/**
 * Loads the doc engine (doc + catalog + sections) once; safe to call many times. `loader` picks the
 * chunk that brings it (PaletteFlow loads it together with the views so their CSS ships once, in order).
 */
export function loadDesignEngine(loader: DesignEngineLoader = defaultEngineLoader): Promise<DesignEngine> {
  if (!enginePromise) {
    enginePromise = loader().then((loaded) => (engine = loaded));
    enginePromise.catch(() => {
      enginePromise = null;
    });
  }
  return enginePromise;
}

function requireEngine(): DesignEngine {
  if (!engine) throw new Error("Design engine not loaded: await actions.loadEngine() before editing the DesignDoc.");
  return engine;
}

const hasPages = (doc: DesignDoc) => Object.values(doc.pages).some(Boolean);

const noDoc: PatchResult = { ok: false, error: { reason: "invalid-document", message: "There is no DesignDoc yet" } };

/** Page the Composer shows: the chosen one if it still exists, else the focus, else the first page. */
export function selectActivePageKind(state: Pick<DesignDocState, "doc" | "activePage">): OutputKind | null {
  const { doc, activePage } = state;
  if (!doc) return null;
  if (activePage && doc.pages[activePage]) return activePage;
  if (doc.pages[doc.brief.focus]) return doc.brief.focus;
  return KIND_ORDER.find((kind) => doc.pages[kind]) ?? null;
}

export type DesignDocStoreOptions = {
  /** How the engine chunk is loaded (default: `import("@/lib/design-engine")`). */
  loadEngine?: DesignEngineLoader;
};

export function createDesignDocStore(
  initial: Partial<Omit<DesignDocState, "actions">> = {},
  storeOptions: DesignDocStoreOptions = {},
): DesignDocStore {
  return createStore<DesignDocState>()(
    temporal(
      (set, get, api) => {
        let batchBase: DesignDoc | null | undefined;
        // Inside the initializer zundo types `api.temporal` as unknown.
        const history = () => (api as unknown as DesignDocStore).temporal.getState();

        const commit = (result: PatchResult, extra?: Partial<DesignDocState>): PatchResult => {
          if (!result.ok) return result;
          const next: Partial<DesignDocState> = { ...extra };
          if (result.doc !== get().doc) next.doc = result.doc;
          if (Object.keys(next).length > 0) set(next);
          return result;
        };
        const edit = (run: (e: DesignEngine, doc: DesignDoc) => PatchResult, extra?: (doc: DesignDoc) => Partial<DesignDocState>): PatchResult => {
          const doc = get().doc;
          if (!doc) return noDoc;
          const result = run(requireEngine(), doc);
          return commit(result, result.ok && extra ? extra(result.doc) : undefined);
        };
        // The first page is where the Composer starts: like the doc's creation, it is not undoable
        // (an undo past it would drop the user back into «Crear», where redo no longer works).
        const editPages = (run: (e: DesignEngine, doc: DesignDoc) => PatchResult, extra?: (doc: DesignDoc) => Partial<DesignDocState>): PatchResult => {
          const doc = get().doc;
          if (!doc) return noDoc;
          if (hasPages(doc)) return edit(run, extra);
          const result = run(requireEngine(), doc);
          if (!result.ok || !hasPages(result.doc)) return commit(result, result.ok && extra ? extra(result.doc) : undefined);
          history().pause();
          set({ doc: result.doc, ...extra?.(result.doc) });
          history().resume();
          history().clear();
          return result;
        };

        const actions: DesignDocActions = {
          loadEngine: async () => {
            await loadDesignEngine(storeOptions.loadEngine);
            if (!get().engineReady) set({ engineReady: true });
          },
          initFromPalette: (flow, options) => {
            if (!flow.primary) return null;
            const e = requireEngine();
            const palette = {
              primary: flow.primary,
              ...(flow.secondary && { secondary: flow.secondary }),
              styleId: flow.styleId,
              ...(flow.theme && { achromatic: flow.theme.achromatic }),
              ...(flow.logo && { logoName: flow.logo.name }),
            };
            const current = get().doc;
            if (current) {
              const synced = commit(e.syncPalette(current, palette));
              return synced.ok ? synced.doc : current;
            }
            const created = e.createFromPalette(palette, options);
            if (!created.ok) return null;
            history().pause();
            set({ doc: created.doc, activePage: created.doc.brief.focus });
            history().resume();
            history().clear();
            return created.doc;
          },
          setFocus: (kind) => editPages((e, doc) => e.withFocus(doc, kind), () => ({ activePage: kind })),
          addPage: (kind, options = {}) => {
            const { activate = true, ...pageOptions } = options;
            return editPages((e, doc) => e.withPage(doc, kind, pageOptions), activate ? () => ({ activePage: kind }) : undefined);
          },
          removePage: (kind) =>
            edit(
              (e, doc) => e.withoutPage(doc, kind),
              (doc) => (get().activePage === kind ? { activePage: doc.brief.focus } : {}),
            ),
          setActivePage: (kind) => {
            if (get().doc?.pages[kind] && get().activePage !== kind) set({ activePage: kind });
          },
          applyPatch: (ops, options) => edit((e, doc) => e.applyPatch(doc, ops, options)),
          setRecipe: (recipeId, options) => edit((e, doc) => e.withRecipe(doc, recipeId, options)),
          setPairing: (pairingId) => edit((e, doc) => e.withPairing(doc, pairingId)),
          setPaletteStyle: (styleId) => edit((e, doc) => e.withPaletteStyle(doc, styleId)),
          setDials: (dials, scope = "global") => edit((e, doc) => e.withDials(doc, dials, scope)),
          setProductType: (productTypeId, options) => edit((e, doc) => e.withProductType(doc, productTypeId, options)),
          setContentLocale: (locale, options) => edit((e, doc) => e.withContentLocale(doc, locale, options)),
          setBrandText: (text) => edit((e, doc) => e.withBrandText(doc, text)),
          setPreviewMode: (previewMode) => {
            if (get().previewMode !== previewMode) set({ previewMode });
          },
          setDevice: (device) => {
            if (get().device !== device) set({ device });
          },
          setLogoUrl: (logoUrl) => {
            if (get().logoUrl !== logoUrl) set({ logoUrl });
          },
          beginBatch: () => {
            if (batchBase !== undefined) return;
            batchBase = get().doc;
            history().pause();
          },
          commitBatch: () => {
            if (batchBase === undefined) return;
            const base = batchBase;
            const live = get().doc;
            batchBase = undefined;
            if (live !== base) set({ doc: base });
            history().resume();
            if (live !== base) set({ doc: live });
          },
          cancelBatch: () => {
            if (batchBase === undefined) return;
            const base = batchBase;
            batchBase = undefined;
            if (get().doc !== base) set({ doc: base });
            history().resume();
          },
          reset: () => {
            batchBase = undefined;
            history().pause();
            set({ doc: null, activePage: null });
            history().resume();
            history().clear();
          },
        };

        return {
          doc: null,
          activePage: null,
          previewMode: "light",
          device: "desktop",
          logoUrl: undefined,
          engineReady: engine !== null,
          ...initial,
          actions,
        };
      },
      {
        partialize: (state): HistorySlice => ({ doc: state.doc }),
        equality: (past, current) => past.doc === current.doc,
        limit: HISTORY_LIMIT,
      },
    ),
  );
}

const DesignDocContext = createContext<DesignDocStore | null>(null);

/** One DesignDoc store (with undo/redo) per flow. PaletteFlow mounts it; views only read it. */
export type DesignDocProviderProps = DesignDocStoreOptions & {
  children: ReactNode;
  initialState?: Partial<Omit<DesignDocState, "actions">>;
};

export function DesignDocProvider({ children, initialState, loadEngine }: DesignDocProviderProps) {
  const [store] = useState(() => createDesignDocStore(initialState, { ...(loadEngine && { loadEngine }) }));
  return createElement(DesignDocContext.Provider, { value: store }, children);
}

/** The store itself (getState/subscribe/temporal) for imperative use. */
export function useDesignDocStore(): DesignDocStore {
  const store = useContext(DesignDocContext);
  if (!store) throw new Error("useDesignDoc must be used inside <DesignDocProvider>");
  return store;
}

/** `null` outside a DesignDocProvider (for components that also work with explicit props). */
export const useOptionalDesignDocStore = (): DesignDocStore | null => useContext(DesignDocContext);

/**
 * Reads the DesignDoc store: `useDesignDoc((s) => s.doc)`. Selectors that build new objects need
 * `useShallow` (zustand/react/shallow) to avoid render loops.
 */
export function useDesignDoc(): DesignDocState;
export function useDesignDoc<T>(selector: (state: DesignDocState) => T): T;
export function useDesignDoc<T>(selector?: (state: DesignDocState) => T): T | DesignDocState {
  const store = useDesignDocStore();
  return useStore(store, (selector ?? identity) as (state: DesignDocState) => T | DesignDocState);
}

const identity = (state: DesignDocState) => state;

/** Stable action object (never re-renders). */
export const useDesignDocActions = (): DesignDocActions => useStore(useDesignDocStore(), (state) => state.actions);

export const useActivePageKind = (): OutputKind | null => useDesignDoc(selectActivePageKind);

export type DesignHistory = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
};

/** Undo/redo of the doc (zundo). Preview mode, device, active page and logo are not part of it. */
export function useDesignHistory(): DesignHistory {
  const store = useDesignDocStore();
  const canUndo = useStore(store.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (state) => state.futureStates.length > 0);
  return useMemo(() => {
    const temporalState = () => store.temporal.getState();
    return {
      canUndo,
      canRedo,
      undo: () => temporalState().undo(),
      redo: () => temporalState().redo(),
      clear: () => temporalState().clear(),
    };
  }, [store, canUndo, canRedo]);
}

/**
 * Theme, recipe/pairing/motion tier and the CSS variables of both modes for `kind` (default: the
 * active page). Memoized per doc; `null` until the doc and the engine exist.
 */
export function useDesignDerived(kind?: OutputKind | null): DesignDerived | null {
  const doc = useDesignDoc((state) => state.doc);
  const ready = useDesignDoc((state) => state.engineReady);
  const active = useActivePageKind();
  const pageKind = kind === undefined ? active : kind;
  return useMemo(() => (doc && ready && engine ? engine.deriveDesign(doc, pageKind) : null), [doc, ready, pageKind]);
}
