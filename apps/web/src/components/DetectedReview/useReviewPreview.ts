"use client";

import { applyPatch, themeInputFor, type DesignDoc, type PatchOperation } from "@dialmade/doc";
import { applyImport, type ImportedBrand, type ImportSelection, type Ownership, type SkippedDetection } from "@dialmade/import";
import { generateTheme, type ContrastCheck, type Theme } from "@dialmade/palette";
import { useDeferredValue, useMemo } from "react";

export type ReviewPreviewInput = {
  baseDoc: DesignDoc;
  brand: ImportedBrand;
  selection: ImportSelection;
  extraOps: PatchOperation[];
  ownership: Ownership;
  rightsConfirmedAt?: string;
};

export type ReviewPreviewState = {
  /** The DesignDoc as it would be after the import (the base one when the choices cannot be applied). */
  doc: DesignDoc;
  theme: Theme | null;
  /** Imported pairs that fail AA. */
  failures: ContrastCheck[];
  skipped: SkippedDetection[];
  /** The choices cannot be applied as they are (e.g. an invalid value). */
  failed: boolean;
};

/**
 * Runs `applyImport` on the current choices (deferred, so typing in an editor stays fluid) to paint the
 * preview and find the AA warnings exactly as the real import would.
 */
export function useReviewPreview({ baseDoc, brand, selection, extraOps, ownership, rightsConfirmedAt }: ReviewPreviewInput): ReviewPreviewState {
  const deferredSelection = useDeferredValue(selection);
  const deferredOps = useDeferredValue(extraOps);

  const result = useMemo(() => {
    try {
      return applyImport(baseDoc, brand, deferredSelection, { ownership, ...(rightsConfirmedAt && { rightsConfirmedAt }) });
    } catch {
      return null;
    }
  }, [baseDoc, brand, deferredSelection, ownership, rightsConfirmedAt]);

  const doc = useMemo(() => {
    if (!result?.ok) return baseDoc;
    if (deferredOps.length === 0) return result.doc;
    const extra = applyPatch(result.doc, deferredOps, { allowLocked: true });
    return extra.ok ? extra.doc : result.doc;
  }, [result, baseDoc, deferredOps]);

  const theme = useMemo(() => {
    try {
      return generateTheme(themeInputFor(doc));
    } catch {
      return null;
    }
  }, [doc]);

  return useMemo(
    () => ({
      doc,
      theme,
      failures: theme?.contrast.filter((check) => check.source === "imported" && !check.pass) ?? [],
      skipped: result?.skipped ?? [],
      failed: !result?.ok,
    }),
    [doc, theme, result],
  );
}
