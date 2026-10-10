"use client";

import { pinnedFor, type PatchOperation } from "@dialmade/doc";
import { applyImport, type ImportedBrand, type ImportSelection } from "@dialmade/import";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { DEFAULT_PRIMARY, usePaletteFlow, type ImportSession } from "@/hooks/usePaletteFlow";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { importText } from "@/i18n/import";
import { guidePrimary, type ReviewExit } from "./model";

/**
 * Applies «Esto detectamos» (the batch, with any AI fingerprints attached) to the DesignDoc as one patch
 * (one undo step), creating the doc first when there is none, then hands the seeds and pins to the
 * flow. References alone with no brand yet are kept in the flow and applied when the doc is created
 * (after «Subir logo»).
 */
export function useCommitImport(session: ImportSession) {
  const { state, actions } = usePaletteFlow();
  const designActions = useDesignDocActions();
  const store = useDesignDocStore();
  const { locale } = useI18n();
  const f = useDictionary(flow);
  const t = useDictionary(importText).review.applied;
  const [busy, setBusy] = useState(false);

  const commit = useCallback(
    async (exit: ReviewExit, brand: ImportedBrand, selection: ImportSelection, extraOps: PatchOperation[]) => {
      if (busy) return;
      setBusy(true);
      const { ownership, rightsConfirmedAt, logo } = session;
      const options = { ownership, ...(rightsConfirmedAt && { rightsConfirmedAt }) };
      try {
        await designActions.loadEngine();
        if (exit === "references" && !state.primary && !store.getState().doc) {
          actions.finishImport({ next: "drop", pending: { brand, selection, ...options } });
          toast(t.references);
          return;
        }
        const guide = guidePrimary(brand, selection, ownership);
        let doc = store.getState().doc;
        if (!doc) {
          const secondary = guide ? undefined : (logo?.extract.seeds.secondary?.hex ?? state.secondary);
          doc = designActions.initFromPalette(
            {
              primary: guide ?? logo?.extract.seeds.primary.hex ?? state.primary ?? DEFAULT_PRIMARY,
              ...(secondary && { secondary }),
              styleId: state.styleId,
              theme: undefined,
              logo: logo?.logo ?? state.logo,
            },
            { locale, defaultName: f.doc.defaultName, focus: state.previewKind },
          );
          if (!doc) throw new Error("Could not create the DesignDoc");
        }
        const result = applyImport(doc, brand, selection, options);
        if (!result.ok) throw new Error(result.error.message);
        if (result.ops.length + extraOps.length > 0) {
          let applied = designActions.applyPatch([...result.ops, ...extraOps]);
          if (!applied.ok && extraOps.length > 0) applied = designActions.applyPatch(result.ops);
          if (!applied.ok) throw new Error(applied.error.message);
        }
        const finalDoc = store.getState().doc ?? doc;
        const pinned = pinnedFor(finalDoc);
        actions.finishImport({
          next: exit === "create" ? "layout" : "palette",
          seeds: { ...finalDoc.brand.seeds },
          ...(pinned && { pinned }),
          ...(logo && { logo }),
        });
        const locked = result.skipped.filter((item) => item.reason === "locked").length;
        toast(exit === "references" ? t.referencesLab : t.done, locked > 0 ? { description: t.locked(locked) } : undefined);
      } catch {
        toast.error(t.failed);
      } finally {
        setBusy(false);
      }
    },
    [busy, session, designActions, store, state, actions, locale, f, t],
  );

  return { commit, busy };
}
