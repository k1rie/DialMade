"use client";

import type { BlockCategory, LibraryBlockType, ScreenKind } from "@dialmade/layout";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, useId } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { snappy, tween } from "@/lib/motion";
import { ChevronDownIcon } from "../../icons";
import type { LibraryItemProps } from "../LibraryItem";
import { TileGrid } from "../TileGrid";

export type LibraryCategoryProps = {
  category: BlockCategory;
  types: readonly LibraryBlockType[];
  open: boolean;
  onToggle: (category: BlockCategory) => void;
  instance: string;
  kind: ScreenKind;
  onInsert: (type: LibraryBlockType) => void;
  hints: LibraryItemProps["hints"];
};

/**
 * One collapsible category of the library (APG disclosure: a heading with a button that has
 * `aria-expanded`). The tiles fold with a height transition (≤220 ms, none with reduced motion).
 */
export const LibraryCategory = memo(function LibraryCategory({
  category,
  types,
  open,
  onToggle,
  instance,
  kind,
  onInsert,
  hints,
}: LibraryCategoryProps) {
  const t = useDictionary(layout);
  const id = useId();
  const reduce = useReducedMotion();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  const name = t.categories[category];

  return (
    <div className="flex flex-col">
      <h3 className="text-caption font-semibold tracking-[0.01em] text-fg">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={t.library.category(name, types.length)}
          onClick={() => onToggle(category)}
          className={cn(
            "flex h-8 w-full items-center justify-between gap-2 rounded-control px-1.5 text-start transition-colors duration-150",
            "hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          )}
        >
          <span className="truncate">{name}</span>
          <span className="flex shrink-0 items-center gap-1.5 font-normal text-subtle">
            <span className="tabular-nums">{types.length}</span>
            <motion.span className="inline-flex" initial={false} animate={{ rotate: open ? 180 : 0 }} transition={snappy}>
              <ChevronDownIcon className="size-3.5" />
            </motion.span>
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : tween(0.22)}
            // Room for the tiles' focus ring inside the clip.
            className="-mx-1 overflow-hidden px-1"
          >
            <TileGrid
              types={types}
              section={`category-${category}`}
              instance={instance}
              kind={kind}
              onInsert={onInsert}
              hints={hints}
              aria-labelledby={buttonId}
              className="pt-1 pb-2"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
