"use client";

import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";

/** Placeholder with the mini's 8:5 box while the preview chunk loads. */
export function StageSkeleton() {
  const t = useDictionary(palette).preview;
  return (
    <div className="relative aspect-[8/5] w-full overflow-hidden bg-white/[0.03]">
      <span aria-hidden className="absolute inset-0 animate-pulse bg-white/[0.03] motion-reduce:animate-none" />
      <span role="status" className="sr-only">
        {t.loading}
      </span>
    </div>
  );
}
