"use client";

import type { LibraryBlockType, ScreenKind } from "@dialmade/layout";
import { memo, useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { libraryDragId, TILE_ATTR, type LibrarySection } from "../constants";
import { LibraryItem, type LibraryItemProps } from "../LibraryItem";
import { columnsFromTops, gridNeighbor, isGridKey, tileModeFor } from "../libraryModel";

export type TileGridProps = {
  types: readonly LibraryBlockType[];
  section: LibrarySection;
  /** Prefix of the drag ids (one per BlockLibrary instance). */
  instance: string;
  kind: ScreenKind;
  onInsert: (type: LibraryBlockType) => void;
  hints: LibraryItemProps["hints"];
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

const cellsOf = (grid: HTMLElement | null): HTMLElement[] =>
  grid ? Array.from(grid.querySelectorAll<HTMLElement>(`[${TILE_ATTR}]`)) : [];

/** The focusable tile of a cell (DraggableItem or the disabled tile). */
const tileOf = (cell: HTMLElement | undefined): HTMLElement | null =>
  cell?.firstElementChild instanceof HTMLElement ? cell.firstElementChild : null;

/**
 * A grid of library tiles (2–3 per row in the 18rem panel, more when the panel is wider). Arrow keys
 * move between tiles (Up/Down keep the column), Home/End go to the ends. When an insert removes the
 * focused tile from the list («Sugeridos» drops what the screen now has), focus moves to the tile
 * that takes its place instead of falling back to the page.
 */
export const TileGrid = memo(function TileGrid({
  types,
  section,
  instance,
  kind,
  onInsert,
  hints,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  className,
}: TileGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<{ cell: HTMLElement; index: number } | null>(null);

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const cells = cellsOf(ref.current);
    const index = cells.findIndex((cell) => cell.contains(event.target));
    if (index >= 0) lastFocus.current = { cell: cells[index]!, index };
  };

  const onBlur = () => {
    // Decided a frame later: a tile removed by an insert is restored in the layout effect below first.
    requestAnimationFrame(() => {
      const last = lastFocus.current;
      if (last?.cell.isConnected && !ref.current?.contains(document.activeElement)) lastFocus.current = null;
    });
  };

  useLayoutEffect(() => {
    const last = lastFocus.current;
    const grid = ref.current;
    if (!last || !grid || last.cell.isConnected) return;
    lastFocus.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && !grid.contains(active)) return;
    const cells = cellsOf(grid);
    tileOf(cells[Math.min(last.index, cells.length - 1)])?.focus();
  }, [types]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isGridKey(event.key)) return;
    const cells = cellsOf(event.currentTarget);
    const index = cells.findIndex((cell) => cell.contains(event.target as Node));
    if (index < 0) return;
    const columns = columnsFromTops(cells.map((cell) => cell.offsetTop));
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = gridNeighbor(index, cells.length, columns, event.key, rtl);
    if (next === null) return;
    event.preventDefault();
    tileOf(cells[next])?.focus();
  };

  return (
    <div
      ref={ref}
      id={id}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={cn("grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2", className)}
    >
      {types.map((type) => (
        <LibraryItem
          key={type}
          type={type}
          mode={tileModeFor(type, kind)}
          dragId={libraryDragId(instance, section, type)}
          onInsert={onInsert}
          hints={hints}
        />
      ))}
    </div>
  );
});
