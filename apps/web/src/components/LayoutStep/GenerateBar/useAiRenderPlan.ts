"use client";

import { normalizeAiContext, type AiContext, type AiDirectionChip, type AiRenderTier, type Screen } from "@dialmade/doc";
import { TIER_MODEL, chromePiecesFor } from "@dialmade/ai-render";
import { useCallback, useMemo } from "react";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useI18n } from "@/i18n";
import { AI_SESSION_SCREENS } from "@/lib/ai/config";
import { useByokKey } from "@/lib/ai/byokKey";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { useByokRenderModel } from "@/lib/ai/render/byokModel";
import { isFullAccessRenderModel, type FullAccessRenderModel } from "@/lib/ai/render/fullAccessModel";
import { setFullAccessRenderModel, useFullAccessRenderModel } from "@/lib/ai/render/fullAccessModelStore";
import { FREE_RENDER_TIERS, setRenderTier, useRenderTier } from "@/lib/ai/render/renderTier";
import { renderPathFor } from "@/lib/ai/render/transport";
import {
  directionReusable,
  estimateGenerate,
  formatRenderCost,
  setNextRunTransport,
  useAiGeneration,
  useGenerationStore,
  type AiGenerateMode,
  type RenderEstimate,
  type RenderTransport,
  type StyleReference,
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
  /** «Estilo»: the developer's words for the look and the reference screenshots of the next direction. */
  style: string;
  setStyle: (style: string) => void;
  references: StyleReference[];
  setReferences: (references: StyleReference[]) => void;
  /** «Contexto»: what the developer says about the product (the document's own until they touch it). */
  context: AiContext;
  setContext: (context: AiContext) => void;
  /** What the model made of the context in the document's current direction (read-only). */
  concept: string | undefined;
  /** «Maqueta · Presentable · Producto final» (the tab's choice). */
  tier: AiRenderTier;
  setTier: (tier: AiRenderTier) => void;
  /**
   * The tier asks for more than the free tier runs (Presentable or Producto final without a key in the tab): the
   * key or «Copiar prompt para mi Claude» is the way to generate it.
   */
  tierNeedsKey: boolean;
  /**
   * «Acceso completo» (the signed-in account, ../../../lib/ai/fullAccess): the hosted path runs every tier and lets
   * the account pick the model. `null` without it, or when the tab's key takes the call.
   */
  fullAccess: { model: FullAccessRenderModel; setModel: (model: FullAccessRenderModel) => void } | null;
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

/**
 * What «Diseño con IA» designs on a draft screen: the blocks that get their own element (absorbed blocks and hidden
 * ones do not), and the app frame's pieces (its sidebar and top bar).
 */
function renderableCount(screen: Parameters<typeof compileScreenLayout>[0] & Pick<Screen, "shell">): number {
  const { absorbed } = compileScreenLayout(screen);
  const blocks = Object.entries(screen.layout.blocks).filter(([id, block]) => !block.hidden && !Object.hasOwn(absorbed, id)).length;
  return blocks + chromePiecesFor(screen).length;
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
  const setStyle = useCallback((style: string) => store?.getState().actions.setPrefs({ style }), [store]);
  const setReferences = useCallback((references: StyleReference[]) => store?.getState().actions.setPrefs({ references }), [store]);
  const setContext = useCallback((context: AiContext) => store?.getState().actions.setPrefs({ context }), [store]);

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
  const tier = useRenderTier();
  const path = renderPathFor(status, byok.active);
  const hostedFull = path.path === "free" && status?.fullAccess === true;
  const fullAccessPicked = useFullAccessRenderModel();
  // Until the account picks, the finish's default model (Maqueta Haiku, Presentable and Producto final Sonnet).
  const tierModel = TIER_MODEL[tier];
  const fullAccessModel: FullAccessRenderModel = fullAccessPicked ?? (isFullAccessRenderModel(tierModel) ? tierModel : "claude-haiku-5-5");
  const fullAccess = useMemo(() => (hostedFull ? { model: fullAccessModel, setModel: setFullAccessRenderModel } : null), [hostedFull, fullAccessModel]);
  const tierNeedsKey = path.path !== "byok" && !hostedFull && !FREE_RENDER_TIERS.includes(tier);
  const blocked = path.reason;
  const existing = doc.aiRender?.direction;
  // Untouched = what the document's direction already carries, so reopening the popover shows what was used.
  const context = useMemo<AiContext>(() => prefs.context ?? existing?.context ?? {}, [prefs.context, existing?.context]);
  const needsDirection = !directionReusable(existing, prefs.chip, prefs.style, prefs.references.length, context);
  const estimate = useMemo(() => {
    if (!wantsList || selected.length === 0 || !status) return null;
    const counts = selected.map((id) => screens.find((screen) => screen.id === id)?.blocks ?? 0);
    return path.path === "byok"
      ? estimateGenerate({ blocksPerScreen: counts, direction: needsDirection, model: byokModel, tier, references: prefs.references.length })
      : hostedFull
        ? estimateGenerate({ blocksPerScreen: counts, direction: needsDirection, model: fullAccessModel, tier, references: prefs.references.length })
        : estimateGenerate({ blocksPerScreen: counts, direction: needsDirection, model: status.freeModel, references: prefs.references.length });
  }, [wantsList, selected, screens, status, needsDirection, path.path, byokModel, tier, hostedFull, fullAccessModel, prefs.references.length]);

  const cost = useMemo(
    () =>
      estimate && status && !blocked && !tierNeedsKey
        ? {
            cost: formatRenderCost(estimate.costUsd, locale),
            left: status.freeUsesRemaining,
            total: status.freeUsesTotal,
            screens: estimate.screens,
            seconds: estimate.seconds,
            ...(path.path === "byok" && { byok: true }),
          }
        : null,
    [estimate, status, blocked, tierNeedsKey, locale, path.path],
  );

  const ready = mode === "design" && selected.length > 0 && blocked === null && !tierNeedsKey && !busy;
  const start = useCallback(() => {
    if (!store || !ready) return;
    // The screenshots are used once, by this direction, and dropped: only the model's note about them is kept. The
    // engine drops them when the direction call answers, so a run that fails before that leaves them attached.
    const sent = normalizeAiContext(context);
    void store.getState().actions.start({
      screenIds: selected,
      chip: prefs.chip,
      style: prefs.style,
      references: prefs.references,
      ...(sent && { context: sent }),
    });
  }, [store, ready, selected, prefs.chip, prefs.style, prefs.references, context]);

  const startWith = useCallback(
    (transport: RenderTransport) => {
      if (!store || mode !== "design" || selected.length === 0 || busy) return;
      setNextRunTransport(transport);
      const { actions } = store.getState();
      // «mi Claude»: a copied prompt carries the words only; the user attached the screenshots in Claude (the dialog
      // listed them), so they are spent here and the answer is local: nothing can fail before the direction.
      const sent = normalizeAiContext(context);
      void actions.start({ screenIds: selected, chip: prefs.chip, style: prefs.style, ...(sent && { context: sent }) });
      if (prefs.references.length > 0) actions.setPrefs({ references: [] });
    },
    [store, mode, selected, busy, prefs.chip, prefs.style, prefs.references.length, context],
  );

  return { mode, setMode, designAvailable, chip: prefs.chip, setChip, style: prefs.style, setStyle, references: prefs.references, setReferences, context, setContext, concept: existing?.concept, tier, setTier: setRenderTier, tierNeedsKey, fullAccess, screens, selected, toggleScreen, blocked, estimate, cost, ready, start, startWith };
}
