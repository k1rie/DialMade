"use client";

// «Generar» end to end inside the Layout step (handoff §Fase B step 5, critique #7 and #8):
// 1. the deterministic pass, written by the flow in one patch (`onGenerate`); a refusal (a locked value) stores
//    nothing in the draft, so «Regenerar N bloques» still counts;
// 2. the signature moment in the canvas (`reveal.phase === "playing"`, LayoutCanvas → GenerateReveal), skippable;
// 3. optionally ONE AI request for every screen right after the write (or «Copiar prompt para mi Claude»): the
//    revealed page stays (`"holding"`) with a chip per block and the run's bar, until «Ir a Ajustar» or «Seguir
//    editando el layout»;
// 4. `onRevealEnd`: the flow moves to «Ajustar» with its normal transition. The layer stays painted while the
//    step leaves.
import type { ScreenId } from "@dialmade/layout";
import { createContext, createElement, useCallback, useContext, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { AiKeyDialogView } from "@/components/AiKeyDialog";
import { AiCopyError, type AiCopyResult } from "@/hooks/useAiCopy";
import { useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useLayoutAiCopy, type ScreenCopyTarget, type UseLayoutAiCopy } from "@/hooks/useLayoutAiCopy";
import type { ManualJob } from "@/lib/ai/manual";
import { compileScreenLayout } from "@/lib/screen-layout";
import { AI_RUN_IDLE, aiRunReducer, aiTargetsFor, type AiMode, type AiRunState } from "./generateFlow";
import type { GenerateResult } from "./types";
import { selectActiveScreenId, selectChangedBlocks, type LayoutStore } from "./useLayoutStore";

export type RevealPhase = "playing" | "holding";

/** The «Generar» moment in progress. */
export type RevealState = {
  /** Grows on every «Generar»: keys the layer, so a new one starts from scratch. */
  id: number;
  /** Screen painted under the boxes: the canvas's active screen when «Generar» ran. */
  screenId: ScreenId | null;
  /** `playing`: the signature animation. `holding`: the page stays (AI copy in progress or done). */
  phase: RevealPhase;
  /** A page layer plays in the canvas (not under 640 px, where there is no canvas). */
  layer: boolean;
  /** The AI step of this «Generar». */
  ai: AiMode | null;
};

/**
 * What `generate` did: `busy` (a moment is already playing), `refused` (the flow could not write it: its own
 * message says why), `revealing` (the moment runs, then the flow moves on), `done` (written, no moment: the
 * standalone step opens its report).
 */
export type GenerateOutcome = "busy" | "refused" | "revealing" | "done";

export type GenerateOptions = {
  /** The AI step: default «Escribir textos con IA» on → `"ai"`, off → none. `"claude"`: the prompt for the user's Claude. */
  ai?: AiMode | null;
};

type FlowOptions = {
  store: LayoutStore;
  /** Under 640 px: no canvas, so no layer. */
  narrow: boolean;
  onGenerate?: ((result: GenerateResult) => boolean | void) | undefined;
  onRevealEnd?: (() => void) | undefined;
  /** «Diseño generado: …» (polite). */
  announceGenerated: (result: GenerateResult) => void;
};

/** What the AI controls of the step read (GenerateBar's AI control, the reveal's chips). */
export type GenerateAi = {
  ai: UseLayoutAiCopy;
  /** Inside the app's DesignDoc provider (the copy is written into its document); the standalone step has none. */
  supported: boolean;
  /**
   * «Escribir textos con IA» for the next «Generar» (reads off while AI is known to be blocked: no key and no free
   * use). Switching it on is the consent to one request.
   */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  run: AiRunState;
  /** «Reintentar» can start a request now (none runs, some block is in «Error»). */
  canRetry: boolean;
  retry: () => void;
  /** Opens the key dialog («Usar mi propia key»). */
  openKeyDialog: () => void;
  /** «Copiar prompt para mi Claude»: during a moment, the dialog for its request; before one, a «Generar» that ends with it. */
  copyPrompt: () => void;
};

const GenerateAiContext = createContext<GenerateAi | null>(null);

export function GenerateAiProvider({ value, children }: { value: GenerateAi; children: ReactNode }) {
  return createElement(GenerateAiContext.Provider, { value }, children);
}

export function useGenerateAi(): GenerateAi {
  const value = useContext(GenerateAiContext);
  if (!value) throw new Error("useGenerateAi must be used inside <LayoutStep>");
  return value;
}

export type GenerateFlow = {
  reveal: RevealState | null;
  /** The step is leaving for «Ajustar»: the bar goes with it. */
  leaving: boolean;
  generate: (options?: GenerateOptions) => GenerateOutcome;
  /** The signature animation ended (played or skipped). */
  endPlaying: () => void;
  /** «Ir a Ajustar» (and the end of a moment without AI). */
  finish: () => void;
  /** «Seguir editando el layout»: the page fades out, the boxes come back. */
  keepEditing: () => void;
  /** «Cancelar»: aborts the request; nothing is applied. */
  cancel: () => void;
  aiValue: GenerateAi;
  dialog: AiKeyDialogView | null;
  closeDialog: () => void;
  /** The «mi Claude» job of the current request (null outside a moment). */
  manual: ManualJob<AiCopyResult> | null;
  onManualResult: (result: AiCopyResult) => void;
  onKeySaved: () => void;
};

/** Message of a failed request (localized by useAiCopy) and its way out. */
function failure(error: unknown): { message: string; fallback: AiCopyError["fallback"] } {
  return { message: error instanceof Error ? error.message : String(error), fallback: error instanceof AiCopyError ? error.fallback : null };
}

export function useGenerateFlow({ store, narrow, onGenerate, onRevealEnd, announceGenerated }: FlowOptions): GenerateFlow {
  const ai = useLayoutAiCopy();
  const supported = useOptionalDesignDocStore() !== null;
  const [wanted, setEnabled] = useState(false);
  // Known to be blocked (no key, the free tier cannot answer): off until a key or a free use is back. While the
  // status loads it is not.
  const blocked = ai.source === null && ai.fallbackReason !== null;
  const enabled = wanted && supported && !blocked;
  const [run, dispatch] = useReducer(aiRunReducer, AI_RUN_IDLE);
  const [reveal, setRevealState] = useState<RevealState | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [dialog, setDialog] = useState<AiKeyDialogView | null>(null);
  const [targets, setTargets] = useState<ScreenCopyTarget[] | null>(null);

  // Read at event time: the parent may pass new functions on every render.
  const latest = useRef({ ai, supported, enabled, narrow, onGenerate, onRevealEnd, announceGenerated, targets });
  useLayoutEffect(() => {
    latest.current = { ai, supported, enabled, narrow, onGenerate, onRevealEnd, announceGenerated, targets };
  });
  // The moment as events see it right away (a second click before React renders is «busy»).
  const revealRef = useRef<RevealState | null>(null);
  const setReveal = useCallback((next: RevealState | null) => {
    revealRef.current = next;
    setRevealState(next);
  }, []);
  const seq = useRef(0);

  const startRun = useCallback((next: readonly ScreenCopyTarget[]) => {
    const current = latest.current.ai;
    // BYOK is billed to the user's key; anything else is the hosted free tier, where a sent request is one use.
    dispatch({ type: "start", spends: current.source !== "byok" });
    current.run(next).then(
      (summary) => {
        if (summary) dispatch({ type: "applied", done: summary.done, stale: summary.stale });
      },
      (error: unknown) => dispatch({ type: "failed", ...failure(error) }),
    );
  }, []);

  const finish = useCallback(() => {
    const end = latest.current.onRevealEnd;
    setDialog(null);
    if (!end) {
      setReveal(null);
      return;
    }
    setLeaving(true);
    end();
  }, [setReveal]);

  const generate = useCallback(
    (options: GenerateOptions = {}): GenerateOutcome => {
      if (revealRef.current) return "busy";
      const { onGenerate: write, onRevealEnd: end, narrow: noCanvas, enabled: aiOn, supported: canWrite } = latest.current;
      const asked: AiMode | null = options.ai !== undefined ? options.ai : aiOn ? "ai" : null;
      const mode = canWrite ? asked : null;
      const state = store.getState();
      // Read before generating: afterwards every block matches its new fingerprint.
      const nextTargets = mode
        ? aiTargetsFor(selectChangedBlocks(state), (id) => {
            const screen = state.screens[id];
            return screen ? compileScreenLayout(screen).absorbed : {};
          })
        : null;
      const screenId = selectActiveScreenId(state);
      let accepted = true;
      const result = state.actions.generate({
        accept: (next) => {
          accepted = write?.(next) !== false;
          return accepted;
        },
      });
      if (!accepted) return "refused";
      if (!end && !mode) return "done";
      latest.current.announceGenerated(result);
      const layer = Boolean(end) && !noCanvas && screenId !== null;
      if (!layer && !mode) {
        finish();
        return "revealing";
      }
      setReveal({ id: ++seq.current, screenId, phase: layer ? "playing" : "holding", layer, ai: mode });
      setTargets(nextTargets);
      dispatch({ type: "reset" });
      // The request starts right after the write, while the moment plays: the copy is on its way sooner.
      if (mode === "ai" && nextTargets) startRun(nextTargets);
      if (mode === "claude") {
        dispatch({ type: "manual" });
        // The dialog waits for the end of the animation (it would cover it).
        if (!layer) setDialog("manual");
      }
      return "revealing";
    },
    [store, startRun, finish, setReveal],
  );

  const endPlaying = useCallback(() => {
    const current = revealRef.current;
    if (!current || current.phase !== "playing") return;
    if (!current.ai) {
      finish();
      return;
    }
    setReveal({ ...current, phase: "holding" });
    if (current.ai === "claude") setDialog("manual");
  }, [finish, setReveal]);

  const keepEditing = useCallback(() => {
    latest.current.ai.reset();
    dispatch({ type: "reset" });
    setDialog(null);
    setTargets(null);
    setReveal(null);
  }, [setReveal]);

  const cancel = useCallback(() => {
    latest.current.ai.cancel();
    dispatch({ type: "cancel" });
  }, []);

  const retry = useCallback(() => {
    const next = latest.current.ai.retryTargets();
    if (next.length > 0) startRun(next);
  }, [startRun]);

  const copyPrompt = useCallback(() => {
    if (!revealRef.current) {
      generate({ ai: "claude" });
      return;
    }
    dispatch({ type: "manual" });
    setDialog("manual");
  }, [generate]);

  const onManualResult = useCallback((result: AiCopyResult) => {
    const summary = latest.current.ai.applyResult(result);
    dispatch({ type: "applied", done: summary.done, stale: summary.stale, manual: true });
  }, []);

  // A key saved while the request had failed for lack of free uses: the same request again, now with the key.
  const onKeySaved = useCallback(() => {
    const { targets: last } = latest.current;
    if (revealRef.current && last && run.kind === "failed") startRun(last);
  }, [run.kind, startRun]);

  const manual = useMemo(() => (dialog && targets ? ai.manualJob(targets) : null), [dialog, targets, ai]);
  const closeDialog = useCallback(() => setDialog(null), []);

  const writing = run.kind === "writing";
  const hasErrors = Object.values(ai.blocks).includes("error");
  const aiValue = useMemo<GenerateAi>(
    () => ({
      ai,
      supported,
      enabled,
      setEnabled,
      run,
      canRetry: !writing && hasErrors,
      retry,
      openKeyDialog: () => setDialog("key"),
      copyPrompt,
    }),
    [ai, supported, enabled, run, writing, hasErrors, retry, copyPrompt],
  );

  return {
    reveal,
    leaving,
    generate,
    endPlaying,
    finish,
    keepEditing,
    cancel,
    aiValue,
    dialog,
    closeDialog,
    manual,
    onManualResult,
    onKeySaved,
  };
}
