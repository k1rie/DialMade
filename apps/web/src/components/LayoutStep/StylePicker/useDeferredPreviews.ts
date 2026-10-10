import type { DesignDoc } from "@dialmade/doc";
import type { AppShell, LayoutDoc, ScreenKind } from "@dialmade/layout";
import { createElement, useDeferredValue, useMemo, type ReactNode } from "react";
// Relative imports only: the hook test renders it in vitest without the `@/` alias.
import { getPreviewGeometry } from "./previewGeometry";
import { StylePreview } from "./StylePreview";

/** What the previews are painted from: the active screen and the doc whose theme each option compiles. */
export type PreviewSource = { layout: LayoutDoc | null; kind: ScreenKind; shell: AppShell | null; doc: DesignDoc };

export type DeferredPreviews = {
  /** The doc the options compile their theme variables from (the deferred one, in step with the previews). */
  doc: DesignDoc;
  /** The painted screen, one element shared by every option (only the theme variables differ). */
  preview: ReactNode;
  /** The same screen with frosted surfaces, for recipes whose surface is "glass". */
  glassPreview: ReactNode;
};

/** The two painted screens of a source (geometry memoised per layout object and frame). */
export function buildPreviews(source: PreviewSource): DeferredPreviews {
  const geometry = getPreviewGeometry(source.layout, source.kind, source.shell);
  return {
    doc: source.doc,
    preview: createElement(StylePreview, { geometry }),
    glassPreview: createElement(StylePreview, { geometry, glass: true }),
  };
}

/**
 * The 13 previews, rendered in a deferred pass: the first render of the picker (every time the screen
 * panel replaces the block inspector) returns `null`, so the radio group mounts and is usable at once and
 * React paints the previews in an interruptible background render right after. When the panel goes away
 * before that (Supr on the canvas: the panel shows for one commit, then the next block is selected),
 * nothing is computed. Later changes keep the old previews until the new ones are ready.
 */
export function useDeferredPreviews(layout: LayoutDoc | null, kind: ScreenKind, shell: AppShell | null, doc: DesignDoc): DeferredPreviews | null {
  const source = useMemo<PreviewSource>(() => ({ layout, kind, shell, doc }), [layout, kind, shell, doc]);
  const deferred = useDeferredValue<PreviewSource | null>(source, null);
  return useMemo(() => (deferred ? buildPreviews(deferred) : null), [deferred]);
}
