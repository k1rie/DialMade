"use client";

import type { DesignDoc } from "@dialmade/doc";
import { PageRenderer } from "@dialmade/sections";
import { memo, useCallback, useMemo, useRef, type FormEvent, type MouseEvent } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { compileScreenLayout, linkedScreen, scopedScreenCss, screenLinks } from "@/lib/screen-layout";
import type { PageTarget } from "../../pageOps";
import { AiBlocks, useAiBlocks } from "./AiBlocks";

export type PagePreviewProps = {
  doc: DesignDoc;
  target: PageTarget;
  mode: PreviewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  logoUrl: string | undefined;
  /**
   * «Probar»: the page renders as the visitor sees it (not selectable) and a click, Enter on a link or a form's
   * submit on an element with `data-dl-screen-link` calls `onNavigate` with that link id (a screen id or an app
   * frame nav item: resolve it with `linkedScreen`). Nothing ever leaves the app: other links and forms do nothing.
   */
  onNavigate?: ((linkId: string) => void) | undefined;
};

/** In «Probar» no anchor follows its href (screen links go through `onNavigate`, the rest go nowhere). */
const keepInApp = (event: MouseEvent<HTMLElement>) => {
  if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
};
const noSubmit = (event: FormEvent<HTMLElement>) => event.preventDefault();
const noSelect = () => {};

/**
 * The user's page, themed by ThemeScope (with that page's dials). A screen renders with its layout CSS, scoped to
 * this screen (`data-dl-screen`), and its links, compiled exactly as the export does (`@/lib/screen-layout`).
 * Edit mode (default) selects sections and never navigates; with `onNavigate` it is the «Probar» mode.
 * Memoized: drags, panel state and toolbar moves never re-render it; only the doc, the page, the mode, the
 * selection or the play mode do.
 */
export const PagePreview = memo(function PagePreview({ doc, target, mode, selectedId, onSelect, logoUrl, onNavigate }: PagePreviewProps) {
  const { screen } = target;
  const playing = onNavigate !== undefined;
  const compiled = useMemo(() => (screen ? compileScreenLayout(screen) : null), [screen]);
  const layoutCss = useMemo(() => (screen ? scopedScreenCss(screen) : undefined), [screen]);
  const links = useMemo(() => (screen && compiled ? screenLinks(doc, screen, compiled.absorbed) : undefined), [doc, screen, compiled]);
  // Edit mode: the href only marks which elements lead to a screen (`data-dl-screen-link`). «Probar»: real
  // anchors (Tab, Enter) whose href names the route; the click is handled by `onNavigate`, never followed.
  const linkHref = useCallback(
    (id: string) => {
      const to = linkedScreen(doc, id);
      if (!to) return null;
      return playing ? `#${doc.screens[to]!.route}` : "#";
    },
    [doc, playing],
  );
  // «Diseño con IA»: active AI blocks paint in their own islands, the live generation marks the base cells.
  const pageRef = useRef<HTMLDivElement | null>(null);
  const ai = useAiBlocks({ doc, screen: screen ?? null, mode, editable: !playing, selectedId, onSelect: playing ? noSelect : onSelect, onNavigate });

  return (
    // No color interpolation here: on a full page it re-styles thousands of nodes per frame. The minis keep it.
    <ThemeScope
      doc={doc}
      kind={target.key}
      screen={screen?.id ?? null}
      mode={mode}
      transition={false}
      className="min-h-full"
      {...(playing && { onClickCapture: keepInApp, onSubmitCapture: noSubmit })}
    >
      <div ref={pageRef} className="contents">
        <PageRenderer
          doc={doc}
          kind={target.kind}
          page={target.page}
          mode={mode}
          interactive={!playing}
          {...(playing ? { onNavigate } : { onSelect, ...(selectedId && { selectedId }) })}
          {...(logoUrl && { logoUrl })}
          {...(screen && layoutCss !== undefined && { layoutCss, linkHref, ...(links && { links }) })}
          {...(ai.replace && { replace: ai.replace })}
          {...(ai.underlay && { underlay: ai.underlay })}
        />
      </div>
      <AiBlocks rootRef={pageRef} marks={ai.marks} />
    </ThemeScope>
  );
});
