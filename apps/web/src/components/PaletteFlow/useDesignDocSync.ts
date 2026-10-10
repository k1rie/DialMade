"use client";

import type { ExtractResult } from "@dialmade/palette";
import { useEffect, useRef } from "react";
import type { DesignDocStore } from "@/hooks/useDesignDoc";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { flowPhaseOf, type PaletteFlowActions, type PaletteFlowView } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";

/**
 * Keeps the DesignDoc store in step with the flow:
 * - from "crop" on, the doc engine (doc + sections) loads in the background;
 * - entering «Crear»/«Ajustar» creates the doc from the Palette Lab, or syncs seeds and palette style
 *   into the existing one (pages and edits are kept);
 * - back in the Palette Lab, the flow takes the doc's seeds and palette style (an undo in the Composer
 *   may have changed them), so the doc stays the source of truth once it exists. The exception is a
 *   new extraction («Recortar de nuevo»): its seeds go into the doc instead of being overwritten;
 * - back at "drop" (start over, new logo) the doc and its history are dropped;
 * - imports: references kept before there was a brand («Trae tu marca» from the Home) are applied once
 *   the doc exists, and in the Palette Lab the theme pins follow the doc's locked colors (`pinnedFor`),
 *   so an undo or an unlock elsewhere is reflected.
 */
export function useDesignDocSync(state: PaletteFlowView, flowActions: PaletteFlowActions, onError: (error: unknown) => void) {
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const { locale } = useI18n();
  const { doc: docText } = useDictionary(flow);
  const onErrorRef = useRef(onError);
  const latest = useRef(state);
  const docOptions = useRef({ locale, defaultName: docText.defaultName });
  // Extraction the doc already reflects; a different one in the lab means a new crop was extracted.
  const syncedExtract = useRef<ExtractResult | undefined>(undefined);
  useEffect(() => {
    onErrorRef.current = onError;
    latest.current = state;
    docOptions.current = { locale, defaultName: docText.defaultName };
  });

  const atDrop = state.step === "drop";
  useEffect(() => {
    if (atDrop) {
      actions.reset();
      syncedExtract.current = undefined;
    } else actions.loadEngine().catch(() => {});
  }, [atDrop, actions]);

  const inPalette = state.step === "palette";
  useEffect(() => {
    const doc = store.getState().doc;
    if (!inPalette || !doc) return;
    const flowState = latest.current;
    if (flowState.extract !== syncedExtract.current) {
      syncedExtract.current = flowState.extract;
      try {
        actions.initFromPalette(flowState, docOptions.current);
      } catch (error) {
        onErrorRef.current(error);
      }
      return;
    }
    const { primary, secondary } = doc.brand.seeds;
    if (primary !== flowState.primary || secondary !== flowState.secondary) flowActions.setSeeds({ primary, secondary: secondary ?? null });
    if (doc.brief.paletteStyleId !== flowState.styleId) flowActions.setStyle(doc.brief.paletteStyleId);
    let active = true;
    import("./designHalf")
      .then((m) => {
        const current = store.getState().doc;
        if (active && current) flowActions.setPinned(m.pinnedFor(current));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [inPalette, store, flowActions, actions]);

  const inDesign = flowPhaseOf(state.step) !== "brand";
  const { primary, secondary, styleId, theme, logo, previewKind, previewMode } = state;
  useEffect(() => {
    if (!inDesign || !primary) return;
    let active = true;
    actions
      .loadEngine()
      .then(() => {
        if (!active) return undefined;
        const isNew = store.getState().doc === null;
        syncedExtract.current = latest.current.extract;
        const doc = actions.initFromPalette(
          { primary, secondary, styleId, theme, logo },
          { locale, defaultName: docText.defaultName, focus: previewKind },
        );
        if (!doc) throw new Error("Could not create the DesignDoc");
        if (isNew) actions.setPreviewMode(previewMode);
        const pending = latest.current.pendingImport;
        if (!pending) return undefined;
        flowActions.clearPendingImport();
        return applyPendingImport(store, actions.applyPatch, pending);
      })
      .catch((error: unknown) => {
        if (active) onErrorRef.current(error);
      });
    return () => {
      active = false;
    };
  }, [inDesign, primary, secondary, styleId, theme, logo, previewKind, previewMode, locale, docText.defaultName, actions, store, flowActions]);
}

/** References accepted before there was a brand: one import patch (one undo step) on the new doc. */
async function applyPendingImport(
  store: DesignDocStore,
  applyPatch: (ops: unknown) => unknown,
  pending: NonNullable<PaletteFlowView["pendingImport"]>,
) {
  const { applyImport } = await import("@dialmade/import");
  const doc = store.getState().doc;
  if (!doc) return;
  const result = applyImport(doc, pending.brand, pending.selection, {
    ownership: pending.ownership,
    ...(pending.rightsConfirmedAt && { rightsConfirmedAt: pending.rightsConfirmedAt }),
  });
  if (result.ok && result.ops.length > 0) applyPatch(result.ops);
}
