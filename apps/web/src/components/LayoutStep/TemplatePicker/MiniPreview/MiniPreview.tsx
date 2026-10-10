"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { SketchApp, SketchBrand, SketchLanding, type ContentContext } from "@dialmade/sections";
import { useLayoutEffect, useRef, useState } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import { cn } from "@/lib/cn";
import { MINI_SIZE } from "../constants";

// Sketches, not the real minis: before the user picks a direction, the cards must not read as the final design.
const SKETCHES: Record<OutputKind, typeof SketchApp> = { brand: SketchBrand, landing: SketchLanding, app: SketchApp };

export type MiniPreviewProps = {
  kind: OutputKind;
  ctx: ContentContext;
  /** Doc whose theme paints the mini (default: the DesignDoc store's). */
  doc?: DesignDoc;
  /** Links the pairing's Google Fonts; one instance per screen is enough. */
  fonts?: boolean;
  className?: string;
};

/**
 * The kind's sketch (named boxes, «Esquema» tag) painted with the user's theme at its design size, scaled
 * to the width of its 8:5 box so every card shows the same composition. Decorative: the surrounding card
 * names it, and the picker says these are sketches.
 */
export function MiniPreview({ kind, ctx, doc, fonts = false, className }: MiniPreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = (width: number) => {
      if (width > 0) setScale(width / MINI_SIZE.width);
    };
    fit(box.offsetWidth);
    const observer = new ResizeObserver(([entry]) => entry && fit(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const Sketch = SKETCHES[kind];
  return (
    <div ref={boxRef} aria-hidden className={cn("relative aspect-[8/5] w-full overflow-hidden", className)}>
      <ThemeScope
        kind={null}
        {...(doc && { doc })}
        fonts={fonts}
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: MINI_SIZE.width, height: MINI_SIZE.height, transform: `scale(${scale})` }}
      >
        <Sketch ctx={ctx} />
      </ThemeScope>
    </div>
  );
}
