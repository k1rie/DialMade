"use client";

import type { AiDirectionChip } from "@dialmade/doc";
import { useCallback, useMemo } from "react";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useI18n } from "@/i18n";
import { AI_SESSION_SCREENS } from "@/lib/ai/config";
import { useByokKey } from "@/lib/ai/byokKey";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { useByokRenderModel } from "@/lib/ai/render/byokModel";
import { renderPathFor } from "@/lib/ai/render/transport";
import {
  estimateGenerate,
  formatRenderCost,
  setNextRunTransport,
  useAiGeneration,
  useGenerationStore,
  type AiGenerateMode,
  type RenderEstimate,
  type RenderTransport,
} from "@/lib/ai/render/generation";
import { aiRenderAvailable } from "@/lib/ai/render/preview";
import { compileScreenLayout } from "@/lib/screen-layout";
import { useGenerateAi } from "../useGenerateFlow";
import { useLayoutEnv, useLayoutStore } from "../useLayoutStore";

export type RenderCostFacts = { cost: string; left: number; total: number; screens: number; seconds: number; byok?: boolean };

export type AiRenderScreenOption = { id: string; name: string; blocks: number; designed: boolean };

export type AiRenderPlan = {
  mode: AiGenerateMode;
  setMode: (mode: AiGenerateMode) => void;
  /** «Diseño con IA» can be offered: inside the app's DesignDoc and with a preview origin (spec §6.1). */
  designAvailable: boolean;
  chip: AiDirectionChip;
  setChip: (chip: AiDirectionChip) => void;
  /** Every screen of the draft, in order. */
  screens: AiRenderScreenOption[];
  /** The screens «Generar con IA» designs (the pick, or the first ones without AI). */
  selected: string[];
  toggleScreen: (id: string) => void;
  /** Why no paid path can answer now (`null`: the user's key or the free tier can). */
  blocked: AiFallbackReason | null;
  estimate: RenderEstimate | null;
  /** What the cost line says («≈ $0.013 · 1 uso de 5 · 3 pantallas · ≈ 30 s»); `null` while loading or blocked. */
  cost: RenderCostFacts | null;
  /** «Generar con IA» runs after the deterministic «Generar» (design mode, something to design, not blocked). */
  ready: boolean;
  /** Starts the generation for the current pick (call right after «Generar» wrote the screens). */
  start: () => void;
  /**
   * Starts it through `transport` for this run only, even when the paid paths are blocked («Copiar prompt para mi
   * Claude»: the pasted answer). Call right after «Generar» wrote the screens.
   */
  startWith: (transport: RenderTransport) => void;
};

/** Blocks of a draft screen that get their own element (absorbed blocks and hidden ones do not). */
function renderableCount(screen: Parameters<typeof compileScreenLayout>[0]): number {
  const { absorbed } = compileScreenLayout(screen);
  return Object.entries(screen.layout.blocks).filter(([id, block]) => !block.hidden && !Object.hasOwn(absorbed, id)).length;
}

/**
 * The «IA» control's state for the Layout's bar (GenerateBar and its popover): the mode (Sin IA · Textos · Diseño),
 * the art direction chip, the screens and the cost line of «Generar con IA», all shown BEFORE any call. The mode
 * lives in the generation store (it survives the step change); «Textos» drives the flow's AI copy switch.
 */
export function useAiRenderPlan(options: { estimate?: boolean } = {}): AiRenderPlan {
  const { locale } = useI18n();
  const { supported, setEnabled } = useGenerateAi();
  const { doc } = useLayoutEnv();
  const store = useGenerationStore();
  const prefs = useAiGeneration((state) => state.prefs);
  const busy = useAiGeneration((state) => state.phase === "session" || state.phase === "direction" || state.phase === "screens");
  const { status } = useAiStatus();
  const draft = useLayoutStore((state) => state.screens);
  const order = useLayoutStore((state) => state.screenOrder);

  const designAvailable = supported && store !== null && aiRenderAvailable();
  const mode: AiGenerateMode = prefs.mode === "design" && !designAvailable ? "off" : prefs.mode;
  const wantsList = options.estimate !== false && mode === "design";

  const setMode = useCallback(
    (next: AiGenerateMode) => {
      store?.getState().actions.setPrefs({ mode: next });
      setEnabled(next === "copy");
    },
    [store, setEnabled],
  );
  const setChip = useCallback((chip: AiDirectionChip) => store?.getState().actions.setPrefs({ chip }), [store]);

  const screens = useMemo<AiRenderScreenOption[]>(() => {
    if (!wantsList) return [];
    return order.flatMap((id) => {
      const screen = draft[id];
      if (!screen) return [];
      const designed = Object.values(doc.screens[id]?.aiRender?.blocks ?? {}).some((block) => block.active);
      return [{ id, name: screen.name, blocks: renderableCount(screen), designed }];
    });
  }, [wantsList, order, draft, doc]);

  const selected = useMemo(() => {
    const live = screens.filter((screen) => screen.blocks > 0);
    if (prefs.screens) {
      const wanted = new Set(prefs.screens);
      return live.filter((screen) => wanted.has(screen.id)).slice(0, AI_SESSION_SCREENS).map((screen) => screen.id);
    }
    const fresh = live.filter((screen) => !screen.designed);
    return (fresh.length > 0 ? fresh : live).slice(0, AI_SESSION_SCREENS).map((screen) => screen.id);
  }, [screens, prefs.screens]);

  const toggleScreen = useCallback(
    (id: string) => {
      const next = selected.includes(id) ? selected.filter((other) => other !== id) : selected.length < AI_SESSION_SCREENS ? [...selected, id] : selected;
      store?.getState().actions.setPrefs({ screens: next });
    },
    [selected, store],
  );

  // The paid path of «Generar con IA» (Track C): the tab's key wins, else the free tier while it can open a session.
  const byok = useByokKey();
  const byokModel = useByokRenderModel();
  const path = renderPathFor(status, byok.active);
  const blocked = path.reason;
  const existing = doc.aiRender?.direction;
  const needsDirection = !(existing && (prefs.chip === "auto" || prefs.chip === existing.chip));
  const estimate = useMemo(() => {
    if (!wantsList || selected.length === 0 || !status) return null;
    const counts = selected.map((id) => screens.find((screen) => screen.id === id)?.blocks ?? 0);
    return estimateGenerate({ blocksPerScreen: counts, direction: needsDirection, model: path.path === "byok" ? byokModel : status.freeModel });
  }, [wantsList, selected, screens, status, needsDirection, path.path, byokModel]);

  const cost = useMemo(
    () =>
      estimate && status && !blocked
        ? {
            cost: formatRenderCost(estimate.costUsd, locale),
            left: status.freeUsesRemaining,
            total: status.freeUsesTotal,
            screens: estimate.screens,
            seconds: estimate.seconds,
            ...(path.path === "byok" && { byok: true }),
          }
        : null,
    [estimate, status, blocked, locale, path.path],
  );

  const ready = mode === "design" && selected.length > 0 && blocked === null && !busy;
  const start = useCallback(() => {
    if (!store || !ready) return;
    void store.getState().actions.start({ screenIds: selected, chip: prefs.chip });
  }, [store, ready, selected, prefs.chip]);

  const startWith = useCallback(
    (transport: RenderTransport) => {
      if (!store || mode !== "design" || selected.length === 0 || busy) return;
      setNextRunTransport(transport);
      void store.getState().actions.start({ screenIds: selected, chip: prefs.chip });
    },
    [store, mode, selected, busy, prefs.chip],
  );

  return { mode, setMode, designAvailable, chip: prefs.chip, setChip, screens, selected, toggleScreen, blocked, estimate, cost, ready, start, startWith };
}
