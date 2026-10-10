"use client";

import type { DesignDoc, Screen } from "@dialmade/doc";
import { PageRenderer } from "@dialmade/sections";
import { memo, useMemo } from "react";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { SCREEN_ATTRIBUTE, scopedScreenCss } from "@/lib/screen-layout";
import { SCREEN_MINI, SCREEN_MINI_SCALE } from "./constants";

export type ScreenMiniProps = {
  doc: DesignDoc;
  screen: Screen;
  mode: PreviewMode;
  logoUrl?: string;
};

/**
 * A screen at a glance: its own page (the sections and the rules of the layout CSS the export writes, scoped to
 * this mini like the Composer's preview, so they never reach the page behind the dialog) laid out at desktop
 * width and scaled down to the card's mini slot, showing the top of the screen. Reuses the real sections, so it
 * adds no look of its own. Decorative and inert: nothing in it can take focus or a click (the card is a single
 * image with its own name). Themed by the card's ThemeScope.
 */
export const ScreenMini = memo(function ScreenMini({ doc, screen, mode, logoUrl }: ScreenMiniProps) {
  const layoutCss = useMemo(() => scopedScreenCss(screen), [screen]);
  return (
    <div
      aria-hidden
      data-screen-mini={screen.id}
      {...{ [SCREEN_ATTRIBUTE]: screen.id }}
      className="relative overflow-hidden"
      style={{ width: `${SCREEN_MINI.widthRem}rem`, aspectRatio: SCREEN_MINI.aspectRatio }}
    >
      <div
        inert
        className="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
        style={{ width: `${SCREEN_MINI.pageWidthRem}rem`, transform: `scale(${SCREEN_MINI_SCALE})` }}
      >
        <PageRenderer doc={doc} kind={screen.kind} page={screen.page} mode={mode} layoutCss={layoutCss} {...(logoUrl && { logoUrl })} />
      </div>
    </div>
  );
});
