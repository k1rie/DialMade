"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { FileRole, ImportedBrand, ImportSelection, Ownership } from "@dialmade/import";
import {
  generateTheme,
  parseColor,
  type ExtractResult,
  type PaletteStyleId,
  type Theme,
  type ThemePins,
} from "@dialmade/palette";
import { createContext, createElement, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { normalizeCrop, type CropRect, type FlowLogo } from "@/lib/image";

export type { CropRect, FlowLogo } from "@/lib/image";

export type FlowStep = "drop" | "crop" | "extracting" | "palette" | "import" | "review" | "layout" | "compose";
export type PreviewMode = "light" | "dark";
/** Steps of the visible stepper (1 Marca · 2 Layout · 3 Ajustar); «4 Exportar» is the export dialog. */
export type FlowPhase = "brand" | "layout" | "compose";

/** drop/crop/extracting/palette and the import (import, review) are «Marca»; layout is «Layout»; compose is «Ajustar». */
export const flowPhaseOf = (step: FlowStep): FlowPhase => (step === "layout" || step === "compose" ? step : "brand");

/** Primary used by «No tengo logo» when no color is given. */
export const DEFAULT_PRIMARY = "#7c5cff";

/** A file of «Trae tu marca» with the type the user gave it. */
export type ImportDraftFile = { file: File; role: FileRole; pasted: boolean };

/** What the import panel holds, so «Volver» from «Esto detectamos» finds it as it was. */
export type ImportDraft = { files: ImportDraftFile[]; rights: boolean; pasteText: string; analyzeStyle?: boolean };

/** The user's logo when it came in the batch («Mi logo»): read and extracted like a dropped one. */
export type ImportLogo = { logo: FlowLogo; extract: ExtractResult };

/** A detected batch waiting in «Esto detectamos». Nothing of it is applied yet. */
export type ImportSession = {
  brand: ImportedBrand;
  ownership: Ownership;
  rightsConfirmedAt?: string;
  logo?: ImportLogo;
  draft: ImportDraft;
  /** The files of the parsed sources by `sourceId` (screenshots for the vision AI). Never stored in the doc. */
  sourceFiles?: Record<string, File>;
  /** «Analizar estilo con IA» was switched on in the panel (the consent): «Esto detectamos» runs it. */
  analyzeStyle?: boolean;
};

/** References accepted before there is a brand (from the Home): applied when the DesignDoc is created. */
export type PendingImport = {
  brand: ImportedBrand;
  selection: ImportSelection;
  ownership: Ownership;
  rightsConfirmedAt?: string;
};

/** How «Esto detectamos» leaves: the seeds and pins of the applied guide, and the next step. */
export type ImportOutcome =
  | { next: "layout" | "palette"; seeds: { primary: string; secondary?: string }; pinned?: ThemePins; logo?: ImportLogo }
  | { next: "drop"; pending?: PendingImport };

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
  /** Output kind shown by the Palette Lab's LivePreview tabs; marks the recommended starting set in «Layout». */
  previewKind: OutputKind;
  /** Last extraction error (cleared on the next attempt). */
  error?: string;
  /** Where «Trae tu marca» goes back to. */
  importReturn?: "drop" | "palette";
  /** Files dropped on the Home that opened the panel (the panel takes them once). */
  importFiles?: readonly File[];
  importSession?: ImportSession;
  /** Locked colors of an imported guide: the theme keeps them and palette styles only move the rest. */
  pinned?: ThemePins;
  pendingImport?: PendingImport;
};

/** State as exposed by `usePaletteFlow()`: reducer state + the derived theme. */
export type PaletteFlowView = PaletteFlowState & {
  /** `generateTheme({ primary, secondary, style, pinned })`, memoized on seeds/style/pins. */
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
  | { type: "goTo"; step: "layout" | "compose" }
  | { type: "setPreviewKind"; kind: OutputKind }
  | { type: "openImport"; files?: readonly File[] }
  | { type: "closeImport" }
  | { type: "reviewImport"; session: ImportSession }
  | { type: "backToImport" }
  | { type: "finishImport"; outcome: ImportOutcome }
  | { type: "setPinned"; pinned?: ThemePins }
  | { type: "clearPendingImport" }
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
        pendingImport: state.pendingImport,
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
        pendingImport: state.pendingImport,
        step: "palette",
        primary: toHex(action.primary) ?? DEFAULT_PRIMARY,
      };
    case "goTo":
      return state.primary ? { ...state, step: action.step } : state;
    case "setPreviewKind":
      return { ...state, previewKind: action.kind };
    case "openImport":
      return {
        ...state,
        step: "import",
        importReturn: state.step === "palette" || (state.primary && state.step !== "drop") ? "palette" : "drop",
        importFiles: action.files && action.files.length > 0 ? action.files : undefined,
        importSession: undefined,
      };
    case "closeImport":
      return {
        ...state,
        step: state.importReturn === "palette" && state.primary ? "palette" : "drop",
        importReturn: undefined,
        importFiles: undefined,
        importSession: undefined,
      };
    case "reviewImport":
      return { ...state, step: "review", importSession: action.session, importFiles: undefined };
    case "backToImport":
      return state.step === "review" ? { ...state, step: "import" } : state;
    case "finishImport": {
      const { outcome } = action;
      if (outcome.next === "drop") {
        return {
          ...initialPaletteFlowState,
          styleId: state.styleId,
          previewMode: state.previewMode,
          previewKind: state.previewKind,
          pendingImport: outcome.pending ?? state.pendingImport,
        };
      }
      const primary = toHex(outcome.seeds.primary) ?? state.primary ?? DEFAULT_PRIMARY;
      const logo = outcome.logo;
      return {
        ...state,
        step: outcome.next,
        primary,
        secondary: outcome.seeds.secondary ? (toHex(outcome.seeds.secondary) ?? undefined) : undefined,
        pinned: outcome.pinned,
        ...(logo && { logo: logo.logo, extract: logo.extract, crop: undefined }),
        error: undefined,
        importReturn: undefined,
        importFiles: undefined,
        importSession: undefined,
      };
    }
    case "setPinned":
      return JSON.stringify(state.pinned ?? null) === JSON.stringify(action.pinned ?? null) ? state : { ...state, pinned: action.pinned };
    case "clearPendingImport":
      return state.pendingImport ? { ...state, pendingImport: undefined } : state;
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
  /** → step "layout" (the Layout step). Requires a primary; PaletteFlow syncs the DesignDoc on entry. */
  goToLayout: () => void;
  /** → step "compose" (Composer). Requires a primary; PaletteFlow falls back to "layout" while the doc has nothing to show. */
  goToCompose: () => void;
  /** LivePreview tab of the Palette Lab; marks the matching starting set in «Layout» as recommended. */
  setPreviewKind: (kind: OutputKind) => void;
  /** «Trae tu marca» (step "import"), optionally with files dropped on the Home. «Volver» returns to where it opened. */
  openImport: (files?: readonly File[]) => void;
  closeImport: () => void;
  /** The batch was read → «Esto detectamos» (step "review"). */
  reviewImport: (session: ImportSession) => void;
  /** From «Esto detectamos» back to the panel, with its files. */
  backToImport: () => void;
  /** The guide was applied to the DesignDoc (or its references kept for later): seeds, pins and next step. */
  finishImport: (outcome: ImportOutcome) => void;
  /** Locked colors of the DesignDoc (`pinnedFor`); `undefined` after «Desbloquear»: palette styles move every color again. */
  setPinned: (pinned?: ThemePins) => void;
  clearPendingImport: () => void;
  reset: () => void;
};

export type PaletteFlowContextValue = {
  state: PaletteFlowView;
  actions: PaletteFlowActions;
  dispatch: (action: PaletteFlowAction) => void;
};

const PaletteFlowContext = createContext<PaletteFlowContextValue | null>(null);

function safeTheme(primary: string | undefined, secondary: string | undefined, style: PaletteStyleId, pinned?: ThemePins): Theme | undefined {
  if (!primary) return undefined;
  try {
    return generateTheme({ primary, secondary, style, ...(pinned && { pinned }) });
  } catch {
    if (!pinned) return undefined;
    return safeTheme(primary, secondary, style);
  }
}

export function PaletteFlowProvider({ children, initialState }: { children: ReactNode; initialState?: Partial<PaletteFlowState> }) {
  const [state, dispatch] = useReducer(paletteFlowReducer, { ...initialPaletteFlowState, ...initialState });

  const theme = useMemo(
    () => safeTheme(state.primary, state.secondary, state.styleId, state.pinned),
    [state.primary, state.secondary, state.styleId, state.pinned],
  );

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
      goToLayout: () => dispatch({ type: "goTo", step: "layout" }),
      goToCompose: () => dispatch({ type: "goTo", step: "compose" }),
      setPreviewKind: (kind) => dispatch({ type: "setPreviewKind", kind }),
      openImport: (files) => dispatch({ type: "openImport", files }),
      closeImport: () => dispatch({ type: "closeImport" }),
      reviewImport: (session) => dispatch({ type: "reviewImport", session }),
      backToImport: () => dispatch({ type: "backToImport" }),
      finishImport: (outcome) => dispatch({ type: "finishImport", outcome }),
      setPinned: (pinned) => dispatch({ type: "setPinned", pinned }),
      clearPendingImport: () => dispatch({ type: "clearPendingImport" }),
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

  // A logo read in «Trae tu marca» belongs to its session until the flow adopts it (finishImport).
  const sessionLogoUrl = state.importSession?.logo?.logo.objectUrl;
  const lastSessionUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = lastSessionUrl.current;
    lastSessionUrl.current = sessionLogoUrl;
    if (previous && previous !== sessionLogoUrl && previous !== logoUrl) URL.revokeObjectURL(previous);
  }, [sessionLogoUrl, logoUrl]);

  const value = useMemo<PaletteFlowContextValue>(() => ({ state: { ...state, theme }, actions, dispatch }), [state, theme, actions]);

  return createElement(PaletteFlowContext.Provider, { value }, children);
}

export function usePaletteFlow(): PaletteFlowContextValue {
  const value = useContext(PaletteFlowContext);
  if (!value) throw new Error("usePaletteFlow must be used inside <PaletteFlowProvider>");
  return value;
}
