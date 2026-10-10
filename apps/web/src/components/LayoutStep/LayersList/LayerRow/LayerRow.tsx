"use client";

import type { LibraryBlockType } from "@dialmade/layout";
import { motion } from "motion/react";
import { memo, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { durations, snappy, tween } from "@/lib/motion";
import { REGION_AUTOFOCUS_ATTR } from "../../constants";
import { BlockIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, LayersIcon } from "../../icons";
import { LAYER_ACTION_ATTR, LAYER_INDENT_PX, LAYER_KEY_ATTR, type LayerAction } from "../constants";
import type { LayerKind } from "../layersTree";

export type LayerRowProps = {
  rowKey: string;
  kind: LayerKind;
  level: number;
  posinset: number;
  setsize: number;
  /** Block glyph, or the layers glyph for the overlays group. */
  icon: LibraryBlockType | "layers";
  /** Visible name. */
  label: string;
  /** Accessible name of the treeitem (the row's text plus count, note and state). */
  ariaLabel: string;
  /** Second line: the note, or why the block is hidden. */
  detail?: string;
  /** «×3». */
  countText?: string;
  /** «Pronto» for blocks that are not ready yet. */
  badge?: string;
  /** The block itself is hidden (the eye is on). */
  hidden: boolean;
  /** Hidden, itself or with its container: muted text. */
  dimmed: boolean;
  /** `aria-expanded`; `undefined` for leaves. */
  expanded: boolean | undefined;
  selected: boolean;
  /** The one row in the tab order (roving tabindex). */
  tabbable: boolean;
  /** Fades in when it appears (children of a node the user just opened). */
  animateIn: boolean;
  describedBy?: string;
  /** Label of the show/hide button; blocks only. */
  visibilityLabel?: string;
  /** Registers the row element; returns the cleanup. Stable. */
  register: (key: string, element: HTMLLIElement) => () => void;
};

const action = (value: LayerAction) => ({ [LAYER_ACTION_ATTR]: value });

/**
 * One treeitem of the layers tree. Presentational: clicks, focus and keys are handled once by the tree
 * (event delegation through `data-layer-key` / `data-layer-action`), so the row only re-renders when
 * its own data changes.
 */
export const LayerRow = memo(function LayerRow({
  rowKey,
  kind,
  level,
  posinset,
  setsize,
  icon,
  label,
  ariaLabel,
  detail,
  countText,
  badge,
  hidden,
  dimmed,
  expanded,
  selected,
  tabbable,
  animateIn,
  describedBy,
  visibilityLabel,
  register,
}: LayerRowProps) {
  const ref = useCallback((element: HTMLLIElement | null) => (element ? register(rowKey, element) : undefined), [register, rowKey]);

  return (
    <motion.li
      ref={ref}
      role="treeitem"
      {...{ [LAYER_KEY_ATTR]: rowKey }}
      {...(tabbable && { [REGION_AUTOFOCUS_ATTR]: "" })}
      aria-level={level}
      aria-posinset={posinset}
      aria-setsize={setsize}
      aria-selected={selected || undefined}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      tabIndex={tabbable ? 0 : -1}
      initial={animateIn ? { opacity: 0, y: -4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={tween(durations.feedback)}
      style={{ paddingInlineStart: 2 + (level - 1) * LAYER_INDENT_PX }}
      className={cn(
        "group flex min-h-9 cursor-default select-none items-center gap-1 rounded-control py-0.5 pe-0.5 text-small transition-colors duration-150",
        // Selection is an accent fill, never the glow (that is the canvas selection); focus keeps the global ring.
        selected ? "bg-accent-soft" : "hover:bg-white/[0.04]",
      )}
    >
      {expanded === undefined ? (
        <span aria-hidden className="size-6 shrink-0" />
      ) : (
        <span
          aria-hidden
          {...action("toggle")}
          className="grid size-6 shrink-0 place-items-center rounded-chip text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <motion.span className="inline-flex" initial={false} animate={{ rotate: expanded ? 90 : 0 }} transition={snappy}>
            <ChevronRightIcon className="size-3.5" />
          </motion.span>
        </span>
      )}
      <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center [&_svg]:size-4", selected ? "text-accent" : "text-muted")}>
        {icon === "layers" ? <LayersIcon /> : <BlockIcon type={icon} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col ps-1">
        {/* Hidden: muted, struck-through text and the eye-off icon; never opacity (it would drop below AA). */}
        <span className={cn("truncate", dimmed ? "text-muted" : "text-fg", hidden && "line-through decoration-white/30", kind !== "block" && "font-medium")}>
          {label}
        </span>
        {detail !== undefined && <span className="truncate text-caption text-muted">{detail}</span>}
      </span>
      {countText !== undefined && <span className="shrink-0 px-1 text-caption tabular-nums text-muted">{countText}</span>}
      {badge !== undefined && (
        <span className="shrink-0 rounded-chip border border-app px-1.5 py-px text-caption text-muted">{badge}</span>
      )}
      {visibilityLabel !== undefined && (
        // Pointer shortcut only (tabIndex -1): the keyboard path to hiding is the inspector's eye.
        <IconButton
          size="sm"
          label={visibilityLabel}
          icon={hidden ? <EyeOffIcon /> : <EyeIcon />}
          tooltip={false}
          tabIndex={-1}
          {...action("visibility")}
          className={cn(
            // `cn` does not merge: `!` wins over the ghost variant's text-muted.
            hidden
              ? "!text-accent"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-selected:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        />
      )}
    </motion.li>
  );
});
