"use client";

// The design open in the flow, for «Guardar» in the AppHeader (which lives outside PaletteFlow's
// DesignDocProvider). PaletteFlow mirrors its doc here (`useSavedDesign`); the header reads and saves it.
// `savedId` is the row in «Mis diseños» this doc came from or was saved to; a different doc (start over,
// a new logo) is a new design.
import type { DesignDoc } from "@dialmade/doc";
import { createStore } from "zustand/vanilla";
import { designsApi, DesignsApiError, type DesignSummary } from "./client";

export type CurrentDesignState = {
  doc: DesignDoc | null;
  savedId: string | null;
  /** `provenance.createdAt` of the doc `savedId` belongs to. */
  savedKey: string | null;
  /** The doc as last saved (or opened): «Guardado» while it is still the current one. */
  savedDoc: DesignDoc | null;
  saving: boolean;
};

export const currentDesign = createStore<CurrentDesignState>(() => ({ doc: null, savedId: null, savedKey: null, savedDoc: null, saving: false }));

const keyOf = (doc: DesignDoc) => doc.provenance.createdAt;

export function setCurrentDoc(doc: DesignDoc | null) {
  if (currentDesign.getState().doc !== doc) currentDesign.setState({ doc });
}

/** The doc was saved to (or opened from) `id`. */
export function markSaved(id: string, doc: DesignDoc) {
  currentDesign.setState({ savedId: id, savedKey: keyOf(doc), savedDoc: doc });
}

/** The row this doc belongs to, if any. */
export function savedIdFor(doc: DesignDoc): string | null {
  const { savedId, savedKey } = currentDesign.getState();
  return savedId && savedKey === keyOf(doc) ? savedId : null;
}

export const isSaved = (state: CurrentDesignState) => !!state.doc && state.savedDoc === state.doc && savedIdFor(state.doc) !== null;

export type SaveOutcome = { ok: true; design: DesignSummary; created: boolean } | { ok: false; error: DesignsApiError };

/**
 * Saves `doc` (default: the current one): updates its row when it has one, else creates it under the brand
 * name. A row deleted meanwhile (404) is created again.
 */
export async function saveDesign(doc: DesignDoc | null = currentDesign.getState().doc, knownId: string | null = doc ? savedIdFor(doc) : null): Promise<SaveOutcome | null> {
  if (!doc || currentDesign.getState().saving) return null;
  currentDesign.setState({ saving: true });
  try {
    if (knownId) {
      try {
        const design = await designsApi.update(knownId, { doc });
        markSaved(design.id, doc);
        return { ok: true, design, created: false };
      } catch (error) {
        if (!(error instanceof DesignsApiError) || error.status !== 404) throw error;
      }
    }
    const design = await designsApi.create(doc.brand.name, doc);
    markSaved(design.id, doc);
    return { ok: true, design, created: true };
  } catch (error) {
    if (error instanceof DesignsApiError) return { ok: false, error };
    return { ok: false, error: new DesignsApiError(0, "network") };
  } finally {
    currentDesign.setState({ saving: false });
  }
}
