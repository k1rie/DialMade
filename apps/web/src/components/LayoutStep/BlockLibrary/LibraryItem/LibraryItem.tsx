"use client";

import type { LibraryBlockType } from "@dialmade/layout";
import { memo, useMemo, type KeyboardEvent } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { BlockIcon } from "../../icons";
import { LIBRARY_DRAG_TYPE } from "../../constants";
import type { LibraryDragData } from "../../types";
import { isSoon, type TileMode } from "../libraryModel";
import { TileTooltip } from "./TileTooltip";

export type LibraryItemProps = {
  type: LibraryBlockType;
  /** What activating it does on the current screen (`tileModeFor`). */
  mode: TileMode;
  /** Unique among the draggables of the DndProvider (`libraryDragId`). */
  dragId: string;
  /** Click/Enter: insert (the parent announces and keeps focus here). */
  onInsert: (type: LibraryBlockType) => void;
  /** Ids of the shared hidden hints: how to insert or drag, «Pronto», navigation frame, app only. */
  hints: { insert: string; soon: string; frame: string; appOnly: string };
};

/** The cell carries `data-library-tile` (`TILE_ATTR`): TileGrid finds tiles by it for the arrow keys. */
const CELL = "group relative h-full min-w-0";
const TILE_FOCUS = "scroll-mt-20 scroll-mb-2 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * A library tile (ref. 11F Klaviyo): icon on top, name below and a «Pronto» badge for soon blocks.
 * Drag it onto the canvas, click it or press Enter to insert it in the next free slot, or pick it up
 * with Space and place it with the arrow keys. On a landing the sidebar is a disabled tile (still
 * focusable, so its tooltip «Solo en pantallas de app» can be read).
 */
export const LibraryItem = memo(function LibraryItem({ type, mode, dragId, onInsert, hints }: LibraryItemProps) {
  const t = useDictionary(layout);
  const text = t.blocks[type];
  const soon = isSoon(type);
  const data = useMemo<LibraryDragData>(() => ({ blockType: type }), [type]);
  const label = t.library.item(text.name, text.description, soon);

  const tooltip = (
    <>
      <span className="block">{mode === "appOnly" ? t.library.appOnly : text.description}</span>
      {mode === "frame" && <span className="mt-0.5 block text-muted">{t.library.frameInApp}</span>}
      {mode !== "appOnly" && soon && <span className="mt-0.5 block text-muted">{t.library.soonHint}</span>}
    </>
  );

  const face = (
    <div
      className={cn(
        "relative flex h-full min-h-[5.25rem] flex-col items-center gap-1.5 rounded-[inherit] border px-1.5 pt-5 pb-2 text-center",
        "border-app bg-surface shadow-surface transition-[background-color,border-color,color] duration-150",
        mode !== "appOnly" && "group-hover:border-app-strong group-hover:bg-surface-hover",
      )}
    >
      <BlockIcon type={type} className={cn("size-5 shrink-0 text-muted", mode !== "appOnly" && "group-hover:text-fg")} />
      <span className="line-clamp-2 text-caption leading-tight font-medium text-pretty text-fg">{text.name}</span>
      {soon && (
        <span className="absolute end-1 top-1 rounded-[6px] border border-app-strong bg-app-elevated px-1 text-[0.625rem] leading-4 text-muted">
          {t.library.soon}
        </span>
      )}
    </div>
  );

  if (mode === "appOnly") {
    // Not draggable and not insertable, but reachable: Enter or a click explain why (announced).
    const explain = () => onInsert(type);
    return (
      <TileTooltip content={tooltip} className={CELL} data-library-tile="">
        <div
          role="button"
          tabIndex={0}
          aria-disabled
          aria-label={label}
          aria-describedby={hints.appOnly}
          onClick={explain}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.repeat) return;
            event.preventDefault();
            explain();
          }}
          className={cn(TILE_FOCUS, "relative h-full cursor-not-allowed opacity-50 select-none")}
        >
          {face}
        </div>
      </TileTooltip>
    );
  }

  // Enter inserts (spec §3.2) before dnd-kit sees it; Space stays the keyboard grab of the drag sensor.
  // During a keyboard drag the sensor handles Enter first (drop) and marks the event as handled.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    onInsert(type);
  };

  const describedBy = cn(hints.insert, mode === "frame" && hints.frame, soon && hints.soon);

  return (
    <TileTooltip content={tooltip} className={CELL} onKeyDownCapture={onKeyDownCapture} data-library-tile="">
      <DraggableItem<LibraryDragData>
        id={dragId}
        type={LIBRARY_DRAG_TYPE}
        label={text.name}
        data={data}
        onActivate={() => onInsert(type)}
        aria-label={label}
        aria-describedby={describedBy}
        className={cn(TILE_FOCUS, "h-full")}
      >
        {face}
      </DraggableItem>
    </TileTooltip>
  );
});
