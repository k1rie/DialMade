"use client";

import type { OutputKind, OutputKindOption } from "@dialmade/catalog";
import type { ContentContext } from "@dialmade/sections";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { useDictionary, useI18n } from "@/i18n";
import { create } from "@/i18n/create";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { KIND_DRAG_TYPE, kindDragId } from "../constants";
import { CheckIcon, SparkleIcon } from "../icons";
import { MiniPreview } from "../MiniPreview";

export type KindCardProps = {
  option: OutputKindOption;
  ctx: ContentContext;
  selected: boolean;
  recommended: boolean;
  /** The doc already has this page: the CTA opens it instead of creating it. */
  created: boolean;
  /** Click/tap alternative to dragging the card onto the canvas. */
  onSelect: (kind: OutputKind) => void;
};

/**
 * One output (ref. 7A Higgsfield style cards): the live mini with the user's theme, the name, «Para ti
 * si…» and what it includes. Drag it onto the canvas, click it, or pick it up with Space/Enter.
 */
export function KindCard({ option, ctx, selected, recommended, created, onSelect }: KindCardProps) {
  const c = useDictionary(create);
  const { locale } = useI18n();
  const id = useId();
  const label = option.label[locale];
  const forId = `${id}-for`;
  const includesId = `${id}-includes`;

  return (
    <DraggableItem
      id={kindDragId(option.id)}
      type={KIND_DRAG_TYPE}
      label={label}
      data={{ kind: option.id }}
      onActivate={() => onSelect(option.id)}
      aria-label={c.cardLabel(label, { selected, recommended, created })}
      aria-describedby={`${forId} ${includesId}`}
      className="group h-full rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div
        className={cn(
          "grid h-full grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-3 rounded-[inherit] border p-2.5 sm:gap-4",
          "md:flex md:flex-col md:gap-4 md:pb-5",
          "transition-[border-color,background-color,translate] duration-200 ease-out",
          selected
            ? "glow-purple border-transparent bg-surface"
            : "border-app bg-surface shadow-surface group-hover:border-app-strong group-hover:bg-surface-hover motion-safe:group-hover:-translate-y-0.5",
        )}
      >
        <div className="relative w-full">
          <MiniPreview kind={option.id} ctx={ctx} className="rounded-card shadow-[0_0_0_1px_oklch(1_0_0/0.06)]" />
          <AnimatePresence initial={false}>
            {recommended && (
              <motion.span
                key="recommended"
                variants={popVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute top-1.5 left-1.5 inline-flex h-5 items-center gap-1 rounded-[6px] bg-accent-cta px-1.5 text-[0.6875rem] leading-none font-medium text-white shadow-glow-purple md:top-2 md:left-2 md:h-6 md:rounded-chip md:px-2 md:text-caption"
              >
                <SparkleIcon className="size-3 md:size-3.5" />
                {c.badges.recommended}
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {selected && (
              <motion.span
                key="selected"
                variants={popVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent-cta text-white shadow-glow-purple md:top-2 md:right-2 md:size-6"
              >
                <CheckIcon className="size-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 md:gap-2 md:px-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[1.0625rem] leading-6 font-semibold tracking-[-0.01em] text-fg md:text-h3">{label}</span>
            {created && (
              <span className="rounded-[6px] border border-app-strong px-1.5 text-caption leading-5 text-muted">{c.badges.created}</span>
            )}
          </div>
          <p id={forId} className="text-small text-pretty text-muted">
            {c.forYouIf} {option.forYouIf[locale]}
          </p>
          <ul id={includesId} className="mt-1.5 hidden flex-col gap-1.5 sm:flex">
            {c.kinds[option.id].map((item) => (
              <li key={item} className="flex gap-2 text-small text-fg/85">
                <CheckIcon className={cn("mt-0.5 size-3.5 shrink-0", selected ? "text-accent" : "text-subtle")} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DraggableItem>
  );
}
