// Pure parts of «Generar» with the optional AI (critique #7): what the one request asks for, the state of
// that request in the bar, and what each block's chip shows. Type-only imports: vitest runs this module
// without React.
import type { BlockId, ScreenId } from "@dialmade/layout";
import type { ScreenCopyTarget } from "@/lib/ai/fields";
import type { CopyBlockState } from "@/lib/ai/layoutCopy";
import type { AiFallbackReason } from "@/lib/ai/policy";

/** The changed blocks of one screen (`selectChangedBlocks`): `all` when none of its blocks was generated yet. */
export type ScreenChanges = { screenId: ScreenId; changed: readonly BlockId[]; all: boolean };

/**
 * What «Escribir textos con IA» rewrites in this «Generar» (one request for every screen):
 * - a screen never generated is sent whole;
 * - a screen with changed blocks sends only those sections (a block absorbed into another one, a media inside
 *   a hero, has no section of its own: its host is sent instead);
 * - screens without changes are left out;
 * - nothing changed («Generar de nuevo») → every screen whole: the user asked for new copy.
 * Over the request caps every listed screen goes whole (`normalizeScreenTargets`, in the hook).
 */
export function aiTargetsFor(
  screens: readonly ScreenChanges[],
  absorbedOf: (screenId: ScreenId) => Readonly<Record<BlockId, BlockId>> = () => ({}),
): ScreenCopyTarget[] {
  const touched = screens.filter((screen) => screen.changed.length > 0);
  if (touched.length === 0) return screens.map((screen) => ({ id: screen.screenId }));
  return touched.map((screen) => {
    if (screen.all) return { id: screen.screenId };
    const absorbed = absorbedOf(screen.screenId);
    const ids: BlockId[] = [];
    for (const id of screen.changed) {
      const section = absorbed[id] ?? id;
      if (!ids.includes(section)) ids.push(section);
    }
    return { id: screen.screenId, sectionIds: ids };
  });
}

/* ------------------------------------------------------------------------------------------------ */
/* The request in the bar                                                                           */
/* ------------------------------------------------------------------------------------------------ */

/** Where «Generar» writes copy after the deterministic pass: the hosted free tier / BYOK, or «mi Claude». */
export type AiMode = "ai" | "claude";

/**
 * - `idle`: no AI in this «Generar»;
 * - `writing`: the request runs (`spends`: hosted free tier, so a cancel still counts as a use);
 * - `manual`: «Copiar prompt para mi Claude», waiting for the pasted answer;
 * - `done`: applied (`done` blocks with new copy, `stale` texts kept because the user edited them meanwhile);
 * - `failed`: nothing applied (`message` is localized; `fallback` = offer BYOK or «mi Claude»);
 * - `cancelled`: aborted, nothing applied (`spent`: the hosted use was already counted).
 */
export type AiRunState =
  | { kind: "idle" }
  | { kind: "writing"; spends: boolean }
  | { kind: "manual" }
  | { kind: "done"; done: number; stale: number }
  | { kind: "failed"; message: string; fallback: AiFallbackReason | null }
  | { kind: "cancelled"; spent: boolean };

export type AiRunEvent =
  | { type: "start"; spends: boolean }
  | { type: "manual" }
  /** `manual`: a pasted «mi Claude» answer, which may land after a failure or a cancel (the user chose that way out). */
  | { type: "applied"; done: number; stale: number; manual?: boolean }
  | { type: "failed"; message: string; fallback: AiFallbackReason | null }
  | { type: "cancel" }
  | { type: "reset" };

export const AI_RUN_IDLE: AiRunState = { kind: "idle" };

/**
 * State of the AI step of a «Generar». A request's answer only lands while it is writing: once cancelled (or
 * reset) a late «applied» or «failed» is ignored, and a cancel only means something while writing. A pasted
 * «mi Claude» answer lands in any state but idle.
 */
export function aiRunReducer(state: AiRunState, event: AiRunEvent): AiRunState {
  switch (event.type) {
    case "start":
      return { kind: "writing", spends: event.spends };
    case "manual":
      return state.kind === "writing" ? state : { kind: "manual" };
    case "applied": {
      const lands = event.manual ? state.kind !== "idle" && state.kind !== "writing" : state.kind === "writing";
      return lands ? { kind: "done", done: event.done, stale: event.stale } : state;
    }
    case "failed":
      return state.kind === "writing" ? { kind: "failed", message: event.message, fallback: event.fallback } : state;
    case "cancel":
      return state.kind === "writing" ? { kind: "cancelled", spent: state.spends } : state;
    case "reset":
      return AI_RUN_IDLE;
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* The moment and the rest of the flow                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** What these rules read of the moment in progress (`RevealState` of useGenerateFlow). */
export type MomentView = { phase: "playing" | "holding"; layer: boolean };

/**
 * Whether the «Generar» moment holds the flow (the stepper waits): the signature animation plays, or the AI
 * request is in flight. Leaving would unmount the step, and `useAiCopy` would cancel the request (on the free
 * tier the use is already spent). Once the step is leaving, or the request ended, nothing is held.
 */
export function momentHoldsFlow(reveal: MomentView | null, leaving: boolean, run: AiRunState): boolean {
  if (!reveal || leaving) return false;
  return reveal.phase === "playing" || run.kind === "writing";
}

/**
 * The signature animation lost its canvas (the step went under 640 px while it played): nothing else ends it,
 * so it ends as if it had played.
 */
export function revealLostCanvas(reveal: MomentView | null, narrow: boolean): boolean {
  return narrow && reveal !== null && reveal.phase === "playing" && reveal.layer;
}

/* ------------------------------------------------------------------------------------------------ */
/* Chips                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** What a block's chip shows: «Escribiendo» (busy) · «Listo» · «Sin cambios» · «Error» (+ «Reintentar»). */
export type ChipView = { state: CopyBlockState; tone: "muted" | "success" | "danger"; busy: boolean; retry: boolean };

/** `canRetry`: no request runs and AI can answer, so «Reintentar» may start one. */
export function chipView(state: CopyBlockState, canRetry: boolean): ChipView {
  switch (state) {
    case "writing":
      return { state, tone: "muted", busy: true, retry: false };
    case "done":
      return { state, tone: "success", busy: false, retry: false };
    case "unchanged":
      return { state, tone: "muted", busy: false, retry: false };
    case "error":
      return { state, tone: "danger", busy: false, retry: canRetry };
  }
}

/** How many blocks are in each state (the bar's summary). */
export function countBlockStates(blocks: Readonly<Record<string, CopyBlockState>>): Record<CopyBlockState, number> {
  const counts: Record<CopyBlockState, number> = { writing: 0, done: 0, unchanged: 0, error: 0 };
  for (const state of Object.values(blocks)) counts[state]++;
  return counts;
}
