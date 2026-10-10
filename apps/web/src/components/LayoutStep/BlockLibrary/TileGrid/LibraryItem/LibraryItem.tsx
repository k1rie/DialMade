"use client";

import type { LibraryBlockType } from "@dialmade/layout";
import { useDragDropManager } from "@dnd-kit/react";
import { memo, useLayoutEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { LIBRARY_DRAG_TYPE } from "../../../constants";
import { BlockIcon } from "../../../icons";
import type { LibraryDragData } from "../../../types";
import { CLEAR_STICKY_SEARCH } from "../../constants";
import { isSoon, type TileMode } from "../../libraryModel";
import { tileDescription, tileKeyAction, type LibraryHints } from "./tileKeyboard";
import { TileTooltip } from "./TileTooltip";

export type LibraryItemProps = {
  type: LibraryBlockType;
  /** What activating it does on the current screen (`tileModeFor`). */
  mode: TileMode;
  /** Unique among the draggables of the DndProvider (`libraryDragId`). */
  dragId: string;
  /** Click: insert (the parent announces and keeps focus here). */
  onInsert: (type: LibraryBlockType) => void;
  /** Ids of the shared hidden hints: keyboard use, «Pronto», navigation frame, app only. */
  hints: LibraryHints;
};

/** The cell carries `data-library-tile` (`TILE_ATTR`): TileGrid finds tiles by it for the arrow keys. */
const CELL = "group relative h-full min-w-0";
const TILE_FOCUS = cn(CLEAR_STICKY_SEARCH, "rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent");

/**
 * A library tile (ref. 11F Klaviyo): icon on top, name below and a «Pronto» badge for soon blocks.
 * Drag it onto the canvas or click it to insert it in the next free slot. From the keyboard, Space or
 * Enter picks it up and drops it (next free slot, or where the arrows took it). On a landing the sidebar is
 * a disabled tile (still focusable, so its tooltip «Solo en pantallas de app» can be read).
 */
export const LibraryItem = memo(function LibraryItem({ type, mode, dragId, onInsert, hints }: LibraryItemProps) {
  const t = useDictionary(layout);
  const manager = useDragDropManager();
  const faceRef = useRef<HTMLDivElement>(null);
  const text = t.blocks[type];
  const soon = isSoon(type);
  const data = useMemo<LibraryDragData>(() => ({ blockType: type }), [type]);
  const label = t.library.item(text.name, text.description, soon);
  const describedBy = tileDescription(hints, mode, soon);
  const draggable = mode !== "appOnly";

  // DraggableItem always points at the generic drag instructions («Espacio o Enter para coger»), which do
  // not say where a tile lands. The tile's own hint already says everything, so it replaces them.
  // Fase B: DraggableItem takes the instructions by prop and this goes away (modo-layout-fase-b.md).
  useLayoutEffect(() => {
    if (!draggable) return;
    faceRef.current?.closest<HTMLElement>('[role="button"]')?.setAttribute("aria-describedby", describedBy);
  }, [draggable, describedBy]);

  const tooltip = (
    <>
      <span className="block">{mode === "appOnly" ? t.library.appOnly : text.description}</span>
      {mode === "frame" && <span className="mt-0.5 block text-muted">{t.library.frameInApp}</span>}
      {mode !== "appOnly" && soon && <span className="mt-0.5 block text-muted">{t.library.soonHint}</span>}
    </>
  );

  const face = (
    <div
      ref={faceRef}
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

  if (!draggable) {
    // Not draggable and not insertable, but reachable: Enter, Space or a click explain why (announced).
    const explain = () => onInsert(type);
    return (
      <TileTooltip content={tooltip} className={CELL} data-library-tile="">
        <div
          role="button"
          tabIndex={0}
          aria-disabled
          aria-label={label}
          aria-describedby={describedBy}
          onClick={explain}
          onKeyDown={(event) => {
            if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
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

  // Root capture phase: runs before the drag sensor's listeners, so a held or modified Space/Enter never
  // starts a drag. Plain Space/Enter pass through: the sensor grabs and drops.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tileKeyAction(event, manager?.dragOperation.status.idle ?? true) === "pass") return;
    event.preventDefault();
    event.stopPropagation();
  };

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
