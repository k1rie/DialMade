"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { PageRenderer } from "@dialmade/sections";
import { memo } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { PreviewMode } from "@/hooks/usePaletteFlow";

export type PagePreviewProps = {
  doc: DesignDoc;
  kind: OutputKind;
  mode: PreviewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  logoUrl: string | undefined;
};

/**
 * The user's page in edit mode, themed by ThemeScope. Memoized: drags, panel state and toolbar
 * moves never re-render it; only the doc, the mode or the selection do.
 */
export const PagePreview = memo(function PagePreview({ doc, kind, mode, selectedId, onSelect, logoUrl }: PagePreviewProps) {
  return (
    // No color interpolation here: on a full page it re-styles thousands of nodes per frame. The minis keep it.
    <ThemeScope doc={doc} kind={kind} mode={mode} transition={false} className="min-h-full">
      <PageRenderer
        doc={doc}
        kind={kind}
        mode={mode}
        interactive
        onSelect={onSelect}
        {...(selectedId && { selectedId })}
        {...(logoUrl && { logoUrl })}
      />
    </ThemeScope>
  );
});
