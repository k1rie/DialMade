"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AiCellBadge, type AiCellBadgeProps } from "./AiCellBadge";

/** A mark of the live generation on one base cell of the page. */
export type AiCellMark = { id: string; kind: AiCellBadgeProps["kind"]; label: string; busy?: boolean; byok?: boolean; onAction?: () => void };

export type AiBlocksProps = {
  /** The element that holds the rendered page (its cells carry `data-dl-id`). */
  rootRef: RefObject<HTMLElement | null>;
  marks: readonly AiCellMark[];
};

type Cells = ReadonlyMap<string, HTMLElement>;

function sameCells(a: Cells, b: Cells): boolean {
  if (a.size !== b.size) return false;
  for (const [id, cell] of a) if (b.get(id) !== cell) return false;
  return true;
}

/**
 * The generation's marks painted INTO their cells (portals into each `data-dl-id` frame, which is
 * `position: relative`): they follow the cell through every layout and scale, and stay outside the frame's inert
 * content, so their buttons are real, focusable app buttons. React events bubble to this component, never to the
 * frame, so a click on a badge does not select the block.
 */
export function AiBlocks({ rootRef, marks }: AiBlocksProps) {
  const [cells, setCells] = useState<Cells>(new Map());

  // Whenever the marks change (a new block state, another screen, an undo), once the page has painted its frames.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      const next = new Map<string, HTMLElement>();
      if (root) {
        for (const mark of marks) {
          const cell = root.querySelector<HTMLElement>(`[data-dl-id="${CSS.escape(mark.id)}"]`);
          if (cell) next.set(mark.id, cell);
        }
      }
      setCells((current) => (sameCells(current, next) ? current : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [rootRef, marks]);

  return (
    <>
      {marks.map((mark) => {
        const cell = cells.get(mark.id);
        if (!cell || !cell.isConnected) return null;
        return createPortal(
          <AiCellBadge kind={mark.kind} label={mark.label} blockId={mark.id} byok={mark.byok === true} {...(mark.busy !== undefined && { busy: mark.busy })} {...(mark.onAction && { onAction: mark.onAction })} />,
          cell,
          `${mark.kind}:${mark.id}`,
        );
      })}
    </>
  );
}
