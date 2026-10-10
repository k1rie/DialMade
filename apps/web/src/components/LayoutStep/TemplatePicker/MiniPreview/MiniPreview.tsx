"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { MiniApp, MiniBrand, MiniLanding, type ContentContext } from "@dialmade/sections";
import { useLayoutEffect, useRef, useState } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import { cn } from "@/lib/cn";
import { MINI_SIZE } from "../constants";

const MINIS = { brand: MiniBrand, landing: MiniLanding, app: MiniApp } as const;
// MiniBrand has a natural height: it fills the 8:5 frame and centers its content.
const MINI_CLASS: Record<OutputKind, string> = { brand: "h-full content-center", landing: "h-full", app: "h-full" };

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
 * The kind's mini painted with the user's theme (global dials) at its design size, scaled to the
 * width of its 8:5 box so every card shows the same composition. Decorative: the surrounding card
 * names it.
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

  const Mini = MINIS[kind];
  return (
    <div ref={boxRef} aria-hidden className={cn("relative aspect-[8/5] w-full overflow-hidden", className)}>
      <ThemeScope
        kind={null}
        {...(doc && { doc })}
        fonts={fonts}
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: MINI_SIZE.width, height: MINI_SIZE.height, transform: `scale(${scale})` }}
      >
        <Mini ctx={ctx} className={MINI_CLASS[kind]} />
      </ThemeScope>
    </div>
  );
}
