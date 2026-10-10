"use client";

import type { OutputKind } from "@dialmade/catalog";
import {
  generateTheme,
  parseColor,
  type ExtractResult,
  type PaletteStyleId,
  type Theme,
} from "@dialmade/palette";
import { createContext, createElement, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { normalizeCrop, type CropRect, type FlowLogo } from "@/lib/image";

export type { CropRect, FlowLogo } from "@/lib/image";

export type FlowStep = "drop" | "crop" | "extracting" | "palette" | "create" | "compose";
export type PreviewMode = "light" | "dark";
/** Steps of the visible stepper (1 Marca · 2 Crear · 3 Ajustar); «4 Exportar» is the export dialog. */
export type FlowPhase = "brand" | "create" | "compose";

/** drop/crop/extracting/palette are «Marca»; create is «Crear»; compose is «Ajustar». */
export const flowPhaseOf = (step: FlowStep): FlowPhase => (step === "create" || step === "compose" ? step : "brand");

/** Primary used by «No tengo logo» when no color is given. */
export const DEFAULT_PRIMARY = "#7c5cff";

export type PaletteFlowState = {
  step: FlowStep;
  logo?: FlowLogo;
  /** Normalized (0–1) crop over the logo; undefined = full image. */
  crop?: CropRect;
  extract?: ExtractResult;
  /** `#rrggbb` */
  primary?: string;
  /** `#rrggbb` */
  secondary?: string;
  styleId: PaletteStyleId;
  previewMode: PreviewMode;
  /** Output kind shown by the Palette Lab's LivePreview tabs; preselects the card in «Crear». */
  previewKind: OutputKind;
  /** Last extraction error (cleared on the next attempt). */
  error?: string;
};

/** State as exposed by `usePaletteFlow()`: reducer state + the derived theme. */
export type PaletteFlowView = PaletteFlowState & {
  /** `generateTheme({ primary, secondary, style })`, memoized on seeds/style. */
  theme?: Theme;
};

export type PaletteFlowAction =
  | { type: "setLogo"; logo: FlowLogo }
  | { type: "setCrop"; crop?: CropRect | null }
  | { type: "editCrop" }
  | { type: "startExtract"; crop?: CropRect | null }
  | { type: "setExtract"; extract: ExtractResult }
  | { type: "failExtract"; error: string }
  | { type: "showPalette" }
  | { type: "setSeeds"; primary?: string; secondary?: string | null }
  | { type: "swapSeeds" }
  | { type: "setStyle"; styleId: PaletteStyleId }
  | { type: "setPreviewMode"; mode: PreviewMode }
  | { type: "chooseColorWithoutLogo"; primary?: string }
  | { type: "goTo"; step: "create" | "compose" }
  | { type: "setPreviewKind"; kind: OutputKind }
  | { type: "reset" };

export const initialPaletteFlowState: PaletteFlowState = {
  step: "drop",
  styleId: "brand",
  previewMode: "light",
  previewKind: "brand",
};

const toHex = (value: string | undefined) => (value === undefined ? undefined : (parseColor(value) ?? undefined));

export function paletteFlowReducer(state: PaletteFlowState, action: PaletteFlowAction): PaletteFlowState {
  switch (action.type) {
    case "setLogo":
      return {
        ...initialPaletteFlowState,
        styleId: state.styleId,
        previewMode: state.previewMode,
        previewKind: state.previewKind,
        step: "crop",
        logo: action.logo,
      };
    case "setCrop":
      return { ...state, crop: action.crop ? normalizeCrop(action.crop) : undefined };
    case "editCrop":
      return state.logo ? { ...state, step: "crop", error: undefined } : state;
    case "startExtract": {
      if (!state.logo) return state;
      const crop = action.crop === undefined ? state.crop : action.crop ? normalizeCrop(action.crop) : undefined;
      return { ...state, step: "extracting", crop, extract: undefined, error: undefined };
    }
    case "setExtract": {
      const { primary, secondary } = action.extract.seeds;
      return { ...state, extract: action.extract, primary: primary.hex, secondary: secondary?.hex, error: undefined };
    }
    case "failExtract":
      return { ...state, step: state.logo ? "crop" : "drop", extract: undefined, error: action.error };
    case "showPalette":
      return state.primary ? { ...state, step: "palette" } : state;
    case "setSeeds": {
      const primary = action.primary === undefined ? state.primary : (toHex(action.primary) ?? state.primary);
      const secondary =
        action.secondary === undefined ? state.secondary : action.secondary === null ? undefined : (toHex(action.secondary) ?? state.secondary);
      return { ...state, primary, secondary };
    }
    case "swapSeeds":
      return state.primary && state.secondary ? { ...state, primary: state.secondary, secondary: state.primary } : state;
    case "setStyle":
      return { ...state, styleId: action.styleId };
    case "setPreviewMode":
      return { ...state, previewMode: action.mode };
    case "chooseColorWithoutLogo":
      return {
        ...initialPaletteFlowState,
        styleId: state.styleId,
        previewMode: state.previewMode,
        previewKind: state.previewKind,
        step: "palette",
        primary: toHex(action.primary) ?? DEFAULT_PRIMARY,
      };
    case "goTo":
      return state.primary ? { ...state, step: action.step } : state;
    case "setPreviewKind":
      return { ...state, previewKind: action.kind };
    case "reset":
      return initialPaletteFlowState;
  }
}

export type PaletteFlowActions = {
  /** Logo read with `readLogoFile` → step "crop" (clears crop/extract/seeds). */
  setLogo: (logo: FlowLogo) => void;
  /** Stores the crop without changing step. `null` clears it (full image). */
  setCrop: (crop?: CropRect | null) => void;
  /** Back to "crop" with the current logo (e.g. «Recortar de nuevo» from the lab). */
  editCrop: () => void;
  /** → step "extracting". Pass a crop to set it, `null` for the full image, omit to keep the current one. */
  startExtract: (crop?: CropRect | null) => void;
  /** Stores the worker result and its seeds as primary/secondary. Does not change step. */
  setExtract: (extract: ExtractResult) => void;
  /** Extraction failed → back to "crop" (or "drop" without logo) with `error`. */
  failExtract: (error: string) => void;
  /** → step "palette" (requires a primary). LogoBurst calls it when the signature moment ends; «Marca» in the stepper too. */
  showPalette: () => void;
  /** Any CSS color, normalized to `#rrggbb`; invalid values are ignored. `secondary: null` removes it. */
  setSeeds: (seeds: { primary?: string; secondary?: string | null }) => void;
  swapSeeds: () => void;
  setStyle: (styleId: PaletteStyleId) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  /** «No tengo logo»: straight to "palette" with `primary` (default DEFAULT_PRIMARY). */
  chooseColorWithoutLogo: (primary?: string) => void;
  /** → step "create" («¿Qué quieres crear?»). Requires a primary; PaletteFlow syncs the DesignDoc on entry. */
  goToCreate: () => void;
  /** → step "compose" (Composer). Requires a primary; PaletteFlow falls back to "create" while the doc has no page. */
  goToCompose: () => void;
  /** LivePreview tab of the Palette Lab; preselects that card in «Crear». */
  setPreviewKind: (kind: OutputKind) => void;
  reset: () => void;
};

export type PaletteFlowContextValue = {
  state: PaletteFlowView;
  actions: PaletteFlowActions;
  dispatch: (action: PaletteFlowAction) => void;
};

const PaletteFlowContext = createContext<PaletteFlowContextValue | null>(null);

function safeTheme(primary: string | undefined, secondary: string | undefined, style: PaletteStyleId): Theme | undefined {
  if (!primary) return undefined;
  try {
    return generateTheme({ primary, secondary, style });
  } catch {
    return undefined;
  }
}

export function PaletteFlowProvider({ children, initialState }: { children: ReactNode; initialState?: Partial<PaletteFlowState> }) {
  const [state, dispatch] = useReducer(paletteFlowReducer, { ...initialPaletteFlowState, ...initialState });

  const theme = useMemo(() => safeTheme(state.primary, state.secondary, state.styleId), [state.primary, state.secondary, state.styleId]);

  const actions = useMemo<PaletteFlowActions>(
    () => ({
      setLogo: (logo) => dispatch({ type: "setLogo", logo }),
      setCrop: (crop) => dispatch({ type: "setCrop", crop }),
      editCrop: () => dispatch({ type: "editCrop" }),
      startExtract: (crop) => dispatch({ type: "startExtract", crop }),
      setExtract: (extract) => dispatch({ type: "setExtract", extract }),
      failExtract: (error) => dispatch({ type: "failExtract", error }),
      showPalette: () => dispatch({ type: "showPalette" }),
      setSeeds: ({ primary, secondary }) => dispatch({ type: "setSeeds", primary, secondary }),
      swapSeeds: () => dispatch({ type: "swapSeeds" }),
      setStyle: (styleId) => dispatch({ type: "setStyle", styleId }),
      setPreviewMode: (mode) => dispatch({ type: "setPreviewMode", mode }),
      chooseColorWithoutLogo: (primary) => dispatch({ type: "chooseColorWithoutLogo", primary }),
      goToCreate: () => dispatch({ type: "goTo", step: "create" }),
      goToCompose: () => dispatch({ type: "goTo", step: "compose" }),
      setPreviewKind: (kind) => dispatch({ type: "setPreviewKind", kind }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [],
  );

  // The flow owns the logo's blob URL: revoke it once it is replaced or the flow unmounts.
  const logoUrl = state.logo?.objectUrl;
  const lastUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = lastUrl.current;
    lastUrl.current = logoUrl;
    if (previous && previous !== logoUrl) URL.revokeObjectURL(previous);
  }, [logoUrl]);
  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    [],
  );

  const value = useMemo<PaletteFlowContextValue>(() => ({ state: { ...state, theme }, actions, dispatch }), [state, theme, actions]);

  return createElement(PaletteFlowContext.Provider, { value }, children);
}

export function usePaletteFlow(): PaletteFlowContextValue {
  const value = useContext(PaletteFlowContext);
  if (!value) throw new Error("usePaletteFlow must be used inside <PaletteFlowProvider>");
  return value;
}
