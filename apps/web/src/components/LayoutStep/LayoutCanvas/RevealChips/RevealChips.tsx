"use client";

import type { DesignDoc } from "@dialmade/doc";
import type { ScreenId } from "@dialmade/layout";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import { Spinner } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { parseBlockKey } from "@/lib/ai/layoutCopy";
import { cn } from "@/lib/cn";
import { feedback } from "@/lib/motion";
import { chipView, countBlockStates } from "../../generateFlow";
import { useGenerateAi } from "../../useGenerateFlow";
import { Z_BADGE } from "../constants";
import { rectIn, type Rect } from "../GenerateReveal/revealPlan";

export type RevealChipsProps = {
  screenId: ScreenId;
  /** The reveal layer: the sections are measured through it. */
  layerRef: RefObject<HTMLDivElement | null>;
  /** The document the layer paints: a new one (the AI copy landed) moves the sections, so they are measured again. */
  doc: DesignDoc;
  /** Name of a section for screen readers (its block's label). */
  labelOf: (elementId: string) => string;
};

/** Inset of a chip from its section's top-right corner, in screen px. */
const CHIP_INSET = 8;

const sameRects = (a: Readonly<Record<string, Rect>>, b: Readonly<Record<string, Rect>>) => {
  const keys = Object.keys(b);
  if (keys.length !== Object.keys(a).length) return false;
  return keys.every((key) => {
    const x = a[key];
    const y = b[key]!;
    return x !== undefined && Math.abs(x.left - y.left) < 0.5 && Math.abs(x.top - y.top) < 0.5 && Math.abs(x.width - y.width) < 0.5;
  });
};

const DOT: Record<"muted" | "success" | "danger", string> = { muted: "bg-white/40", success: "bg-success", danger: "bg-danger" };

/**
 * The AI copy state of each block of the shown screen, on its section of the reveal layer (critique #7):
 * «Escribiendo» (spinner) · «Listo» · «Sin cambios» · «Error» with «Reintentar» (one request for every block in
 * error). Positioned from the sections' real rects, measured again whenever the page changes. App chrome, not
 * the user's theme: it sits over the layer, above the boxes.
 */
export function RevealChips({ screenId, layerRef, doc, labelOf }: RevealChipsProps) {
  const t = useDictionary(aiText).layoutCopy;
  const { ai, canRetry, retry } = useGenerateAi();
  const errors = countBlockStates(ai.blocks).error;

  const entries = useMemo(
    () =>
      Object.entries(ai.blocks).flatMap(([key, state]) => {
        const parsed = parseBlockKey(key);
        return parsed && parsed.screenId === screenId ? [{ id: parsed.elementId, state }] : [];
      }),
    [ai.blocks, screenId],
  );

  const [rects, setRects] = useState<Readonly<Record<string, Rect>>>({});
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    let frame = 0;
    const measure = () => {
      const origin = layer.getBoundingClientRect();
      const next: Record<string, Rect> = {};
      for (const { id } of entries) {
        const section = layer.querySelector(`[data-dl-id="${CSS.escape(id)}"]`);
        if (section) next[id] = rectIn(section.getBoundingClientRect(), origin);
      }
      setRects((previous) => (sameRects(previous, next) ? previous : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // The page's box resizes when the copy (or a font) changes its height.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(layer.firstElementChild ?? layer);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [entries, doc, layerRef]);

  if (entries.length === 0) return null;

  return (
    <ul aria-label={t.chipsLabel} className="pointer-events-none absolute inset-0 m-0 list-none p-0" style={{ zIndex: Z_BADGE + 1 }}>
      <AnimatePresence initial={false}>
        {entries.map(({ id, state }) => {
          const rect = rects[id];
          if (!rect) return null;
          const view = chipView(state, canRetry);
          return (
            <motion.li
              key={id}
              data-reveal-interactive=""
              className="glass pointer-events-auto absolute flex max-w-[16rem] -translate-x-full items-center gap-1.5 rounded-chip border border-app px-2 py-1 text-caption text-fg shadow-surface"
              style={{ left: Math.max(rect.left + rect.width - CHIP_INSET, 0), top: Math.max(rect.top + CHIP_INSET, 0) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={feedback}
            >
              <span className="sr-only">{`${labelOf(id)}: `}</span>
              {view.busy ? <Spinner className="size-3 shrink-0 text-accent" /> : <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[view.tone])} />}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={state}
                  className={cn("truncate", view.tone === "danger" && "text-danger")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={feedback}
                >
                  {t.states[state]}
                </motion.span>
              </AnimatePresence>
              {view.retry && (
                <button
                  type="button"
                  aria-label={t.retryAll(errors)}
                  onClick={retry}
                  className="ms-0.5 rounded-[4px] font-medium text-fg underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
                >
                  {t.retry}
                </button>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
