"use client";

import type { DesignDoc } from "@dialmade/doc";
import { PageRenderer } from "@dialmade/sections";
import { memo, useCallback, useMemo } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { compileScreenLayout, linkedScreen, screenLinks } from "@/lib/screen-layout";
import type { PageTarget } from "../../pageOps";

export type PagePreviewProps = {
  doc: DesignDoc;
  target: PageTarget;
  mode: PreviewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  logoUrl: string | undefined;
};

/**
 * The user's page in edit mode, themed by ThemeScope (with that page's dials). A screen renders with its
 * layout CSS and its links, compiled exactly as the export does (`@/lib/screen-layout`). Memoized: drags,
 * panel state and toolbar moves never re-render it; only the doc, the page, the mode or the selection do.
 */
export const PagePreview = memo(function PagePreview({ doc, target, mode, selectedId, onSelect, logoUrl }: PagePreviewProps) {
  const { screen } = target;
  const compiled = useMemo(() => (screen ? compileScreenLayout(screen) : null), [screen]);
  const links = useMemo(() => (screen && compiled ? screenLinks(doc, screen, compiled.absorbed) : undefined), [doc, screen, compiled]);
  // Edit mode never follows links; the href only marks which elements lead to a screen (`data-dl-screen-link`).
  const linkHref = useCallback((id: string) => (linkedScreen(doc, id) ? "#" : null), [doc]);

  return (
    // No color interpolation here: on a full page it re-styles thousands of nodes per frame. The minis keep it.
    <ThemeScope doc={doc} kind={target.key} mode={mode} transition={false} className="min-h-full">
      <PageRenderer
        doc={doc}
        kind={target.kind}
        page={target.page}
        mode={mode}
        interactive
        onSelect={onSelect}
        {...(selectedId && { selectedId })}
        {...(logoUrl && { logoUrl })}
        {...(screen && compiled && { layoutCss: compiled.css, linkHref, ...(links && { links }) })}
      />
    </ThemeScope>
  );
});
