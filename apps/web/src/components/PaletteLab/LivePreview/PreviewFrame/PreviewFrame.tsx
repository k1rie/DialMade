"use client";

import type { ReactNode } from "react";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";

export type PreviewFrameProps = {
  children: ReactNode;
};

/**
 * App-chrome window around the user's mini: three dots and, where a browser would show the address, a line
 * that says the mini is a sketch and where the final design is chosen. No fake domain: the frame must not
 * read as the finished site.
 */
export function PreviewFrame({ children }: PreviewFrameProps) {
  const t = useDictionary(palette).preview;
  return (
    <div className="relative mx-auto w-full max-w-[44rem] overflow-hidden rounded-[12px] border border-white/10 bg-app-elevated shadow-lift">
      <div className="relative flex h-7 items-center gap-1.5 border-b border-white/[0.06] px-3">
        <span aria-hidden className="size-2 rounded-full bg-white/15" />
        <span aria-hidden className="size-2 rounded-full bg-white/15" />
        <span aria-hidden className="size-2 rounded-full bg-white/15" />
        <p className="absolute left-1/2 -translate-x-1/2 rounded-[6px] bg-white/[0.05] px-2.5 py-0.5 text-[11px] leading-4 whitespace-nowrap text-muted">
          <span className="sm:hidden">{t.sketchShort}</span>
          <span className="hidden sm:inline">{t.sketch}</span>
        </p>
      </div>
      {children}
    </div>
  );
}
