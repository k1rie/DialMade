"use client";

import { getBlockDef, isLibraryBlockType, type BlockId, type GridRect, type LayoutBlock, type LayoutFix } from "@dialmade/layout";
import { AnimatePresence, motion, type Transition } from "motion/react";
import { memo } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { REGION_AUTOFOCUS_ATTR } from "../../constants";
import { BlockIcon, EyeOffIcon } from "../../icons";
import type { Tool } from "../../types";
import { NOTE_MIN_HEIGHT_PX, TINY_BLOCK_PX } from "../constants";
import { BlockWarnings, type BlockWarningView } from "./BlockWarnings";

export type BlockFrameProps = {
  id: BlockId;
  block: LayoutBlock;
  /** Rect shown (live preview, keyboard grab or derived view), in the device's grid units. */
  rect: GridRect;
  /** Box in screen px, already inset. */
  left: number;
  top: number;
  width: number;
  height: number;
  zIndex: number;
  selected: boolean;
  /** Moved or resized right now (pointer or keyboard). */
  active: boolean;
  /** Held with Space/Enter. */
  grabbed: boolean;
  /** The container a moving or dropped block would land in. */
  dropTarget: boolean;
  /** Desktop: movable and resizable. Derived views are read-only. */
  editable: boolean;
  tool: Tool;
  /** Where F6 lands in the canvas. */
  autoFocus: boolean;
  /** «Tabla · 8 filas», or null when it does not fit or says nothing. */
  chip: string | null;
  warnings: readonly BlockWarningView[] | undefined;
  /** Changes to replay the white flash (an adjustment or a landing). 0 = none. */
  flashKey: number;
  /** Motion layout dependency: the FLIP runs when it changes (grid rect, device), not on window resizes. */
  layoutKey: string;
  layoutTransition: Transition;
  describedBy: string | undefined;
  onApplyFix: (fix: LayoutFix, label: string, id: BlockId) => void;
};

/**
 * One block on the canvas: icon + name, note, ×N, «Pronto», hidden state, the content chip, the warnings
 * badge. The element is a `role="button"` with the
 * block's position in its accessible name; its DOM order is the reading order (Tab follows it) and the
 * stacking comes from `zIndex`. Gestures and keys are handled by the canvas (event delegation on
 * `data-block-id`), so this stays a cheap memoized view.
 */
export const BlockFrame = memo(function BlockFrame({
  id,
  block,
  rect,
  left,
  top,
  width,
  height,
  zIndex,
  selected,
  active,
  grabbed,
  dropTarget,
  editable,
  tool,
  autoFocus,
  chip,
  warnings,
  flashKey,
  layoutKey,
  layoutTransition,
  describedBy,
  onApplyFix,
}: BlockFrameProps) {
  const t = useDictionary(layout);
  const type = isLibraryBlockType(block.type) ? block.type : "free";
  const def = getBlockDef(type);
  const typeName = t.blocks[type].name;
  const soon = def.status === "soon";
  const hidden = block.hidden === true;
  const free = type === "free";
  const tiny = width < TINY_BLOCK_PX.width || height < TINY_BLOCK_PX.height;
  const showNote = !tiny && Boolean(block.note) && height >= NOTE_MIN_HEIGHT_PX;
  const ariaLabel = t.canvas.block({ name: block.label, type: typeName, rect, note: block.note, count: block.count, hidden, soon });

  // Mano: the scroller's grab cursor shows through; Dibujar: crosshair; Editar: grab / grabbing.
  const cursor = tool === "hand" ? "cursor-[inherit]" : !editable ? undefined : tool === "draw" ? "cursor-crosshair" : active ? "cursor-grabbing" : "cursor-grab";

  return (
    <motion.div
      layout
      layoutDependency={layoutKey}
      transition={{ layout: layoutTransition }}
      className="absolute [&>span:first-child]:absolute [&>span:first-child]:inset-0"
      style={{ left, top, width, height, zIndex }}
    >
      <Tooltip content={block.label} disabled={!tiny}>
        <div
          role="button"
          tabIndex={0}
          data-block-id={id}
          {...(autoFocus && { [REGION_AUTOFOCUS_ATTR]: "" })}
          aria-roledescription={t.canvas.roleDescription}
          aria-label={ariaLabel}
          aria-pressed={selected}
          aria-describedby={describedBy}
          className={cn(
            "relative size-full min-w-0 overflow-hidden rounded-chip border text-start transition-[background-color,border-color,box-shadow,opacity] duration-150 select-none",
            def.container || free ? "border-dashed" : "",
            def.container ? "bg-transparent" : free ? "bg-white/[0.02]" : "bg-surface",
            selected || dropTarget ? "glow-purple border-transparent" : def.container || free ? "border-app-strong" : "border-app-strong hover:bg-surface-hover",
            dropTarget && "bg-accent-soft",
            active && "shadow-lift",
            hidden && "opacity-40",
            editable && tool === "edit" && "touch-none",
            cursor,
          )}
        >
          {tiny ? (
            <span className="flex size-full items-center justify-center text-muted [&_svg]:size-3.5">
              <BlockIcon type={type} />
            </span>
          ) : (
            <motion.span layout="position" className="flex size-full min-w-0 flex-col gap-0.5 px-2 py-1.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <BlockIcon type={type} className="size-3.5 shrink-0 text-muted" />
                <span className="truncate text-small font-medium text-fg">{block.label}</span>
                {free && (
                  <span aria-hidden className="shrink-0 text-caption font-semibold text-subtle">
                    ?
                  </span>
                )}
                {block.count !== undefined && (
                  <span className="shrink-0 rounded-chip border border-app bg-white/[0.04] px-1 text-caption tabular-nums text-muted">
                    {t.canvas.count(block.count)}
                  </span>
                )}
                {soon && (
                  <span className="shrink-0 rounded-chip border border-app bg-white/[0.04] px-1 text-caption text-subtle">{t.canvas.soon}</span>
                )}
                {grabbed && (
                  <span className="shrink-0 rounded-chip bg-accent-soft px-1 text-caption text-fg">{t.canvas.grabbedBadge}</span>
                )}
                {hidden && <EyeOffIcon className="size-3.5 shrink-0 text-muted" />}
              </span>
              {showNote && <span className="truncate text-caption text-muted">{block.note}</span>}
              {chip && (
                <span className="mt-auto max-w-full self-start truncate rounded-chip border border-app bg-white/[0.03] px-1.5 py-px text-caption text-muted">
                  {chip}
                </span>
              )}
            </motion.span>
          )}
        </div>
      </Tooltip>
      {warnings && warnings.length > 0 && (
        <BlockWarnings name={block.label} warnings={warnings} onApplyFix={(fix, label) => onApplyFix(fix, label, id)} />
      )}
      <AnimatePresence>
        {flashKey > 0 && (
          <motion.span
            key={flashKey}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-chip bg-white"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});
