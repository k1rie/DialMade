"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useId } from "react";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { CheckIcon, SparkleIcon } from "../../icons";
import type { StyleChoice } from "../../types";
import type { DeferredPreviews } from "../useDeferredPreviews";
import { useStyleVars } from "../useStyleVars";

export type StyleOptionProps = {
  choice: StyleChoice;
  /** Visible name (the recipe's label, or «Tu guía de estilo»). */
  name: string;
  /** Accessible name (`t.style.option`): the name plus «recomendado». */
  label: string;
  /** Accessible description: the recipe's description or the guide's hint. */
  description: string;
  /** Visible «Recomendado» badge text, or `null` when the option is not the recommended one. */
  recommendedBadge: string | null;
  /**
   * The painted screens and the doc their variables come from; `null` until the deferred pass has run
   * (the card shows an empty preview box, the radio already works).
   */
  previews: DeferredPreviews | null;
  selected: boolean;
  /** Roving tabindex: exactly one option of the group is in the tab order. */
  tabbable: boolean;
  onSelect: (choice: StyleChoice) => void;
  registerRef: (choice: StyleChoice, element: HTMLButtonElement | null) => void;
};

/**
 * One style of the picker: a radio card with the active screen painted in that style (the user's brand
 * with the recipe's shape, depth and surface), its name and badges. Selected: glow-purple and a check.
 */
export const StyleOption = memo(function StyleOption({
  choice,
  name,
  label,
  description,
  recommendedBadge,
  previews,
  selected,
  tabbable,
  onSelect,
  registerRef,
}: StyleOptionProps) {
  const descriptionId = useId();
  const vars = useStyleVars(previews?.doc ?? null, choice);
  const ref = useCallback((element: HTMLButtonElement | null) => registerRef(choice, element), [registerRef, choice]);

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      aria-describedby={descriptionId}
      title={description}
      tabIndex={tabbable ? 0 : -1}
      data-choice={choice}
      onClick={() => onSelect(choice)}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-card border bg-surface text-start transition-[border-color,box-shadow] duration-150",
        selected ? "glow-purple border-transparent" : "border-app hover:border-app-strong",
      )}
    >
      <span className="relative block aspect-[8/5] w-full overflow-hidden border-b border-app [content-visibility:auto]">
        {previews && vars && (
          <span className="absolute inset-0 block" style={vars.style}>
            {vars.surface === "glass" ? previews.glassPreview : previews.preview}
          </span>
        )}
        {recommendedBadge && (
          <span
            aria-hidden
            className="absolute top-1 left-1 inline-flex h-4 max-w-[calc(100%-0.5rem)] items-center gap-0.5 rounded-[6px] bg-accent-cta px-1 text-[0.625rem] leading-none font-medium text-white"
          >
            <SparkleIcon className="size-2.5 shrink-0" />
            <span className="truncate">{recommendedBadge}</span>
          </span>
        )}
        <AnimatePresence initial={false}>
          {selected && (
            <motion.span
              key="selected"
              aria-hidden
              variants={popVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-accent text-white"
            >
              <CheckIcon className="size-2.5" strokeWidth={2.2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="block min-w-0 truncate px-2 py-1.5 text-caption font-medium text-fg">{name}</span>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </button>
  );
});
