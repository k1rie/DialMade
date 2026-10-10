"use client";

import type { BlockId } from "@dialmade/layout";
import { memo } from "react";
import type { Handle } from "@/lib/geometry";
import { cn } from "@/lib/cn";
import { Z_OVERLAY } from "../constants";
import { visibleHandles } from "./handles";

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

/** Attribute of the handles layer: the id of the block it resizes (read by the canvas' pointer handler). */
export const RESIZE_FOR_ATTR = "data-resize-for";

export type ResizeHandlesProps = {
  blockId: BlockId;
  /** The block's box in screen px, relative to the grid (the live one during a resize). */
  left: number;
  top: number;
  width: number;
  height: number;
  /** The block shows a warnings badge on its top-right corner: the «ne» handle is left out. */
  badge?: boolean;
};

/**
 * The resize handles of the selected block, in a layer above every block so neighbours never cover
 * them: 8 px squares with a 24×24 px hit area each (WCAG 2.5.8) and the resize cursor of their direction.
 * Pointer only (`data-resize-handle`); the keyboard path is Shift + arrows on the held block or the
 * inspector's fields.
 */
export const ResizeHandles = memo(function ResizeHandles({ blockId, left, top, width, height, badge = false }: ResizeHandlesProps) {
  return (
    <div
      aria-hidden
      {...{ [RESIZE_FOR_ATTR]: blockId }}
      className="pointer-events-none absolute"
      style={{ left, top, width, height, zIndex: Z_OVERLAY }}
    >
      {visibleHandles(width, height, badge).map((handle) => {
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
