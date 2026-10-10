"use client";

import type { BlockId, GridRect, ScreenId } from "@dialmade/layout";
import { useId, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, MoveIcon, ResizeIcon } from "../../icons";
import { Segmented } from "../../Segmented";
import { useLayoutStoreApi } from "../../useLayoutStore";
import { nudgeRect, type NudgeDirection, type NudgeMode } from "../fields";
import { FIELD_LABEL } from "../../fieldStyles";
import { useCommitRect } from "../useCommitRect";

export type FineAdjustProps = {
  blockId: BlockId;
  rect: GridRect;
  screenId: ScreenId;
};

const ICONS: Readonly<Record<NudgeDirection, ReactNode>> = {
  up: <ArrowUpIcon />,
  left: <ArrowLeftIcon />,
  right: <ArrowRightIcon />,
  down: <ArrowDownIcon />,
};

/** Cells of the 3×3 pad: arrows on the edges, the mode icon in the middle. */
const PAD: readonly (NudgeDirection | "mode" | null)[] = [null, "up", null, "left", "mode", "right", null, "down", null];

/**
 * «Ajuste fino»: the single-pointer alternative to dragging and resizing (WCAG 2.5.7). «Posición» moves
 * the block 1 column / 8 px per press; «Tamaño» grows or shrinks its right and bottom edges. Each press is
 * one `setRect` (one undo step) and is announced.
 */
export function FineAdjust({ blockId, rect, screenId }: FineAdjustProps) {
  const t = useDictionary(layout);
  const id = useId();
  const store = useLayoutStoreApi();
  const commitRect = useCommitRect();
  const [mode, setMode] = useState<NudgeMode>("move");

  const labels: Record<NudgeDirection, string> =
    mode === "move"
      ? t.inspector.nudge
      : { left: t.inspector.grow.narrower, right: t.inspector.grow.wider, up: t.inspector.grow.shorter, down: t.inspector.grow.taller };

  const press = (direction: NudgeDirection) => {
    const current = store.getState().screens[screenId]?.layout.blocks[blockId]?.rect;
    if (!current) return;
    const next = nudgeRect(current, direction, mode);
    if (next !== current) commitRect(blockId, next, screenId, mode === "move" ? "moved" : "resized");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${id}-title`} className={FIELD_LABEL}>
          {t.inspector.fineAdjust}
        </span>
        <Segmented
          label={t.inspector.fineMode}
          layoutId={`${id}-mode`}
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "move", label: t.inspector.fineMove },
            { value: "resize", label: t.inspector.fineResize },
          ]}
        />
      </div>
      <div role="group" aria-labelledby={`${id}-title`} className="grid w-fit grid-cols-3 gap-1 self-center">
        {PAD.map((cell, index) => {
          if (cell === null) return <span key={index} aria-hidden className="size-8" />;
          if (cell === "mode") {
            return (
              <span key={index} aria-hidden className="flex size-8 items-center justify-center text-subtle [&_svg]:size-4">
                {mode === "move" ? <MoveIcon /> : <ResizeIcon />}
              </span>
            );
          }
          // At an edge or the minimum size the press does nothing: aria-disabled keeps focus on the button.
          const inert = nudgeRect(rect, cell, mode) === rect;
          return (
            <IconButton
              key={index}
              size="sm"
              variant="secondary"
              label={labels[cell]}
              icon={ICONS[cell]}
              aria-disabled={inert || undefined}
              onClick={() => press(cell)}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
            />
          );
        })}
      </div>
    </div>
  );
}
