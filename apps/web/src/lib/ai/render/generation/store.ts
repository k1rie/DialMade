"use client";

// The generation store (zustand, outside React): one per DesignDoc store, so a «Generar con IA» started in Layout
// keeps streaming while the flow moves to Ajustar, where the run bar and the islands read it. The orchestration
// (./engine, with the sanitizer's parse5 and the prompt inputs) loads on the first start.
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { loadAiStatus, updateAiCounters } from "@/hooks/useAiStatus";
import { useOptionalDesignDocStore, type DesignDocStore } from "@/hooks/useDesignDoc";
import { countersFrom } from "../../policy";
import { processBlockOffThread } from "../worker";
import type { GenerationDeps, GenerationEngine } from "./engine";
import { createFreeTierTransport } from "./freeTier";
import { aiBlockActiveOps } from "./patches";
import type { GenerateRequest, GenerationPrefs, GenerationState, RenderTransport } from "./types";

export type GenerationActions = {
  setPrefs: (prefs: Partial<GenerationPrefs>) => void;
  /** «Generar con IA»: the session, the direction and the screens. Ignored while a run is in flight. */
  start: (request: GenerateRequest) => Promise<void>;
  /** Keeps what is done; the rest stays on the base design. */
  cancel: () => void;
  /** A failed screen again (free: the server gave its slot back). */
  retryScreen: (screenId: string) => Promise<void>;
  /** A block that stayed on the base design, as one block action of the session. */
  retryBlock: (screenId: string, blockId: string) => Promise<void>;
  /** Closes the finished run's bar. */
  dismiss: () => void;
  /** «Volver al diseño base» (`false`) / «Usar IA otra vez» (`true`): one undo step. */
  setBlockActive: (screenId: string, blockId: string, active: boolean) => boolean;
};

export type GenerationStoreState = GenerationState & { prefs: GenerationPrefs; actions: GenerationActions };
export type GenerationStore = StoreApi<GenerationStoreState>;

export const DEFAULT_PREFS: GenerationPrefs = { design: false, chip: "auto", screens: null };

let transportOverride: RenderTransport | null = null;
const freeTier = createFreeTierTransport();

/**
 * The transport every new run uses (Track C plugs BYOK and «mi Claude» in here). `null` goes back to the free tier.
 */
export function setRenderTransport(transport: RenderTransport | null): void {
  transportOverride = transport;
}

export type GenerationStoreOptions = Partial<Omit<GenerationDeps, "getDoc" | "applyPatch">> & {
  /** Tests: the engine module itself instead of the lazy import. */
  engine?: (store: StoreApi<GenerationState>, deps: GenerationDeps) => GenerationEngine;
};

/** A generation store bound to one DesignDoc store. */
export function createGenerationStore(docStore: Pick<DesignDocStore, "getState">, options: GenerationStoreOptions = {}): GenerationStore {
  const deps: GenerationDeps = {
    transport: options.transport ?? (() => transportOverride ?? freeTier),
    process: options.process ?? processBlockOffThread,
    getDoc: () => docStore.getState().doc,
    applyPatch: (ops) => docStore.getState().actions.applyPatch(ops).ok,
    model: options.model ?? (async () => (await loadAiStatus()).freeModel),
    onCounters: options.onCounters ?? ((body) => updateAiCounters(countersFrom(body))),
    ...(options.now && { now: options.now }),
    ...(options.seed && { seed: options.seed }),
  };
  let engine: Promise<GenerationEngine> | null = null;
  const store = createStore<GenerationStoreState>()((set, get, api) => {
    const load = () =>
      (engine ??= options.engine
        ? Promise.resolve(options.engine(api as unknown as StoreApi<GenerationState>, deps))
        : import("./engine").then(({ createGenerationEngine }) => createGenerationEngine(api as unknown as StoreApi<GenerationState>, deps)));
    return {
      runId: 0,
      phase: "idle",
      screenOrder: [],
      screens: {},
      session: null,
      direction: null,
      error: null,
      announcement: null,
      costUsd: 0,
      prefs: DEFAULT_PREFS,
      actions: {
        setPrefs: (prefs) => set({ prefs: { ...get().prefs, ...prefs } }),
        start: async (request) => (await load()).start(request),
        cancel: () => void load().then((loaded) => loaded.cancel()),
        retryScreen: async (screenId) => (await load()).retryScreen(screenId),
        retryBlock: async (screenId, blockId) => (await load()).retryBlock(screenId, blockId),
        dismiss: () => void load().then((loaded) => loaded.dismiss()),
        setBlockActive: (screenId, blockId, active) => {
          const doc = docStore.getState().doc;
          const ops = doc ? aiBlockActiveOps(doc, screenId, blockId, active) : null;
          return ops !== null && deps.applyPatch(ops);
        },
      },
    };
  });
  return store;
}

const stores = new WeakMap<object, GenerationStore>();

/** The generation store of a DesignDoc store (created on first use). */
export function generationStoreFor(docStore: DesignDocStore): GenerationStore {
  let store = stores.get(docStore);
  if (!store) stores.set(docStore, (store = createGenerationStore(docStore)));
  return store;
}

/** A store for components rendered without a DesignDoc provider (the standalone Layout step): never runs. */
const detached = createGenerationStore({ getState: () => ({ doc: null }) as unknown as ReturnType<DesignDocStore["getState"]> });

/** The generation store of the surrounding DesignDoc (`null` outside a provider). */
export function useGenerationStore(): GenerationStore | null {
  const docStore = useOptionalDesignDocStore();
  return docStore ? generationStoreFor(docStore) : null;
}

/** Reads the generation of the surrounding DesignDoc (idle outside a provider). */
export function useAiGeneration<T>(selector: (state: GenerationStoreState) => T): T {
  const store = useGenerationStore();
  return useStore(store ?? detached, selector);
}
