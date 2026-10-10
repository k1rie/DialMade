"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { ContentContext } from "@dialmade/sections";
import { useDragOperation } from "@dnd-kit/react";
import { motion } from "motion/react";
import { DropSlot } from "@/components/dnd/DropSlot";
import { useDictionary, useI18n } from "@/i18n";
import { create } from "@/i18n/create";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { CANVAS_SLOT_ID, KIND_DRAG_TYPE, kindLabel, kindOf } from "../constants";
import { DropIcon } from "../icons";
import { CanvasFrame } from "./CanvasFrame";

export type CanvasSlotProps = {
  kind: OutputKind;
  ctx: ContentContext;
  /** The doc already has the chosen page («Vas a abrir»). */
  created: boolean;
  onDropKind: (kind: OutputKind) => void;
  className?: string;
};

/**
 * «Arrastra aquí lo que quieres crear»: the drop target for the cards, drawn as the silhouette of the
 * Composer's canvas with the chosen mini inside.
 */
export function CanvasSlot({ kind, ctx, created, onDropKind, className }: CanvasSlotProps) {
  const c = useDictionary(create);
  const { locale } = useI18n();
  const { source } = useDragOperation();
  const dragged = source?.type === KIND_DRAG_TYPE ? kindOf(source.data) : null;

  return (
    <DropSlot
      id={CANVAS_SLOT_ID}
      as="section"
      accept={KIND_DRAG_TYPE}
      label={c.slot.label}
      aria-label={c.slot.region}
      className={cn("rounded-panel", className)}
      onDrop={(item) => {
        const next = kindOf(item.data);
        if (next) onDropKind(next);
      }}
    >
      {(state) => {
        const hint = !dragged
          ? null
          : state === "over"
            ? c.slot.over(kindLabel(dragged, locale))
            : state === "compatible"
              ? c.slot.compatible(kindLabel(dragged, locale))
              : null;
        return (
          <>
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit] border border-dashed transition-[border-color,background-color] duration-200 ease-out",
                state === "over" ? "border-accent/80" : state === "compatible" ? "border-accent/45" : "border-white/[0.14] bg-white/[0.012]",
              )}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-16 top-0 h-32 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/0.06),transparent_70%)]"
            />
            <div className="relative flex items-center justify-center gap-4 p-3 sm:gap-8 sm:p-4">
              <CanvasFrame kind={kind} ctx={ctx} className="w-[44%] max-w-[216px] shrink-0 sm:w-[40%]" />
              <div className="flex min-w-0 flex-1 flex-col sm:max-w-sm">
                <p className={cn("flex items-start gap-1.5 text-caption transition-colors duration-150", hint ? "text-accent" : "text-muted")}>
                  <DropIcon className="mt-px size-3.5 shrink-0" />
                  <span>
                    {hint ?? c.slot.hint}
                    {!hint && <span className="hidden sm:inline"> · {c.slot.hintAlt}</span>}
                  </span>
                </p>
                <p className="mt-3 text-small text-muted sm:mt-4">{created ? c.slot.youOpen : c.slot.youCreate}</p>
                <motion.p
                  key={kind}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={tween(0.24)}
                  className="text-[1.0625rem] leading-6 font-semibold tracking-[-0.01em] text-balance text-fg sm:text-h2"
                >
                  {kindLabel(kind, locale)}
                </motion.p>
                <p className="mt-1 hidden text-small text-pretty text-muted sm:block">{c.slot.withBrand(ctx.brand.name)}</p>
              </div>
            </div>
          </>
        );
      }}
    </DropSlot>
  );
}
