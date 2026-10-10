"use client";

import type { AppShell, LayoutDoc } from "@dialmade/layout";
import { memo, useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { thumbnailModel, type ThumbBlockKind } from "./thumbnailGeometry";

export type LayoutThumbnailProps = {
  layout: LayoutDoc;
  /** Navigation frame of an app screen (`null` for landing screens). */
  shell?: AppShell | null;
  /** Size it here (e.g. `h-8 w-12`): the drawing fills the box and shows the top of the screen. */
  className?: string;
};

/* App tokens, subtle: the thumbnail is a schematic, not a preview of the style. */
const PAGE: CSSProperties = { fill: "var(--app-bg)" };
const NAV: CSSProperties = { fill: "var(--app-surface)" };
const HEADER: CSSProperties = { fill: "var(--app-border)" };
const BLOCK: Record<ThumbBlockKind, CSSProperties> = {
  block: { fill: "var(--app-surface-hover)", stroke: "var(--app-border-strong)" },
  container: { fill: "transparent", stroke: "var(--app-border-strong)" },
  overlay: { fill: "var(--app-surface)", stroke: "var(--app-text-subtle)" },
};
const HIDDEN_OPACITY = 0.35;
/** Corner radius in design px (the viewBox unit). */
const RADIUS = 16;

/**
 * Pure SVG mini of a screen's layout: blocks as rounded rects at their real proportions, plus the
 * navigation frame and page header of app screens. Decorative (`aria-hidden`): the control that holds it
 * names the screen. Memoised: layouts are immutable, so it redraws only when the layout or shell changes.
 */
export const LayoutThumbnail = memo(function LayoutThumbnail({ layout, shell = null, className }: LayoutThumbnailProps) {
  const model = useMemo(() => thumbnailModel(layout, shell), [layout, shell]);
  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
      className={cn("block", className)}
    >
      <rect width={model.width} height={model.height} style={PAGE} />
      {model.nav && <rect x={model.nav.x} y={model.nav.y} width={model.nav.width} height={model.nav.height} style={NAV} />}
      {model.header && <rect x={model.header.x} y={model.header.y} width={model.header.width} height={model.header.height} style={HEADER} />}
      {model.blocks.map((block) => (
        <rect
          key={block.id}
          x={block.x}
          y={block.y}
          width={block.width}
          height={block.height}
          rx={RADIUS}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          opacity={block.hidden ? HIDDEN_OPACITY : undefined}
          style={BLOCK[block.kind]}
        />
      ))}
    </svg>
  );
});
