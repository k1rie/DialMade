"use client";

import type { BlockId } from "@dialmade/layout";
import { memo } from "react";
import type { Handle } from "@/lib/geometry";
import { cn } from "@/lib/cn";
import { Z_OVERLAY } from "../constants";

/** Edges first, corners last: on a small block the corner hit areas win where they overlap. */
const ORDER: readonly Handle[] = ["n", "e", "s", "w", "nw", "ne", "se", "sw"];

const PLACE: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: "0%", top: "0%", cursor: "cursor-nwse-resize" },
  n: { left: "50%", top: "0%", cursor: "cursor-ns-resize" },
  ne: { left: "100%", top: "0%", cursor: "cursor-nesw-resize" },
  e: { left: "100%", top: "50%", cursor: "cursor-ew-resize" },
  se: { left: "100%", top: "100%", cursor: "cursor-nwse-resize" },
  s: { left: "50%", top: "100%", cursor: "cursor-ns-resize" },
  sw: { left: "0%", top: "100%", cursor: "cursor-nesw-resize" },
  w: { left: "0%", top: "50%", cursor: "cursor-ew-resize" },
};

/** Edge handles need room for themselves plus both corners (3 hit areas of 24 px). */
const EDGE_MIN_PX = 72;

/** Attribute of the handles layer: the id of the block it resizes (read by the canvas' pointer handler). */
export const RESIZE_FOR_ATTR = "data-resize-for";

export type ResizeHandlesProps = {
  blockId: BlockId;
  /** The block's box in screen px, relative to the grid (the live one during a resize). */
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * The 8 resize handles of the selected block, in a layer above every block so neighbours never cover
 * them: 8 px squares with a 24×24 px hit area each (WCAG 2.5.8) and the resize cursor of their direction.
 * Pointer only (`data-resize-handle`); the keyboard path is Shift + arrows on the held block or the
 * inspector's fields.
 */
export const ResizeHandles = memo(function ResizeHandles({ blockId, left, top, width, height }: ResizeHandlesProps) {
  return (
    <div
      aria-hidden
      {...{ [RESIZE_FOR_ATTR]: blockId }}
      className="pointer-events-none absolute"
      style={{ left, top, width, height, zIndex: Z_OVERLAY }}
    >
      {ORDER.map((handle) => {
        if ((handle === "n" || handle === "s") && width < EDGE_MIN_PX) return null;
        if ((handle === "e" || handle === "w") && height < EDGE_MIN_PX) return null;
        const place = PLACE[handle];
        return (
          <span
            key={handle}
            data-resize-handle={handle}
            className={cn("pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center", place.cursor)}
            style={{ left: place.left, top: place.top }}
          >
            <span className="size-2 rounded-[2px] border border-accent bg-app shadow-surface" />
          </span>
        );
      })}
    </div>
  );
});
