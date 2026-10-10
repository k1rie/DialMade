"use client";

import { memo } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import type { FrameGeometry } from "../gestures";

export type AppFrameProps = {
  geometry: Pick<FrameGeometry, "nav" | "header">;
  /** Name of the screen's navigation setting («Lateral»…). */
  navName: string;
  /** Click on the chrome: nothing selected, the screen panel shows. */
  onActivate: () => void;
};

const BAR = "block h-1.5 rounded-full bg-white/[0.07]";
/** Skeleton menu items: widths in % so they follow the frame. */
const ITEMS = [72, 58, 64, 50, 60] as const;

/**
 * Non-editable chrome of an app screen: the navigation frame (sidebar / rail on the left, top bar) and
 * the page-header strip above the content, drawn as a wireframe. Not part of the grid. A click shows the
 * screen panel, where the navigation is chosen; it is out of the Tab order (the keyboard path is Esc to
 * deselect and F6 to the inspector).
 */
export const AppFrame = memo(function AppFrame({ geometry, navName, onActivate }: AppFrameProps) {
  const t = useDictionary(layout);
  const { nav, header } = geometry;
  const navLabel = t.canvas.navFrame(navName);

  return (
    <>
      {nav && (
        <button
          type="button"
          tabIndex={-1}
          data-canvas-ignore=""
          aria-label={navLabel}
          onClick={onActivate}
          className={cn(
            "absolute flex overflow-hidden border-app bg-white/[0.025] text-start transition-colors hover:bg-white/[0.04]",
            nav.side === "left" ? "inset-y-0 left-0 flex-col gap-3 border-r px-3 py-3" : "inset-x-0 top-0 items-center gap-4 border-b px-4",
          )}
          style={nav.side === "left" ? { width: nav.size } : { height: nav.size }}
        >
          {nav.nav === "rail" ? (
            <span aria-hidden className="flex w-full flex-col items-center gap-3 pt-1">
              {ITEMS.map((_, index) => (
                <span key={index} className="block size-4 max-w-full rounded-[4px] bg-white/[0.07]" />
              ))}
            </span>
          ) : (
            <>
              <span className="truncate text-caption text-muted">{navLabel}</span>
              <span aria-hidden className={cn("flex min-w-0", nav.side === "left" ? "flex-col gap-2.5" : "ms-auto items-center gap-3")}>
                {ITEMS.map((width, index) => (
                  <span key={index} className={BAR} style={nav.side === "left" ? { width: `${width}%` } : { width: 40 + (index % 3) * 8 }} />
                ))}
              </span>
            </>
          )}
        </button>
      )}
      {header && (
        <button
          type="button"
          tabIndex={-1}
          data-canvas-ignore=""
          aria-label={t.canvas.headerStrip}
          onClick={onActivate}
          className="absolute right-0 flex flex-col justify-center gap-1 overflow-hidden border-b border-app bg-white/[0.015] px-4 text-start transition-colors hover:bg-white/[0.03]"
          style={{ left: header.left, top: header.top, height: header.height }}
        >
          <span className="truncate text-caption text-muted">{t.canvas.headerStrip}</span>
          {header.height >= 48 && <span className="truncate text-caption text-muted">{t.canvas.headerStripHint}</span>}
        </button>
      )}
    </>
  );
});
