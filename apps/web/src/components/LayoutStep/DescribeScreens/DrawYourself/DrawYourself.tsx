"use client";

import type { ScreenKind } from "@dialmade/layout";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { tween } from "@/lib/motion";
import { KindQuestion } from "../../KindQuestion";
import { PATH_CARD, PATH_GLYPH } from "../constants";
import { CanvasGlyph } from "../icons";

export type DrawYourselfProps = {
  /** An empty screen of that kind: the canvas with the block library. */
  onStart: (kind: ScreenKind) => void;
};

/**
 * «Dibújalo tú», the canvas path of «¿Qué vas a construir?», with the same weight as «Descríbelo»: an empty canvas
 * and the block library, where the user places every box (the original Layout Mode). «Abrir lienzo vacío» asks web
 * or app inline (a blank screen has no kind); Esc closes the question and returns to the button.
 */
export function DrawYourself({ onStart }: DrawYourselfProps) {
  const d = useDictionary(layout).describe.drawPath;
  const id = useId();
  const reduce = useReducedMotion();
  const [asking, setAsking] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section aria-labelledby={`${id}-title`} className={PATH_CARD}>
      <div className="flex items-start gap-3">
        <span aria-hidden className={PATH_GLYPH}>
          <CanvasGlyph />
        </span>
        <div className="min-w-0">
          <h3 id={`${id}-title`} className="m-0 text-h3 text-fg">
            {d.title}
          </h3>
          <p id={`${id}-hint`} className="m-0 mt-0.5 text-small text-pretty text-muted">
            {d.hint}
          </p>
        </div>
      </div>

      {/* The canvas, sketched: a frame with a few boxes, so the path reads as a real way to work. */}
      <div aria-hidden className="flex min-h-28 flex-1 flex-col gap-1.5 rounded-card border border-dashed border-app-strong bg-app p-2.5">
        <span className="h-4 rounded-[5px] bg-white/[0.06]" />
        <span className="grid flex-1 grid-cols-3 gap-1.5">
          <span className="col-span-2 rounded-[5px] bg-white/[0.06]" />
          <span className="rounded-[5px] border border-dashed border-accent/50" />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          ref={buttonRef}
          variant="secondary"
          size="md"
          className="self-start"
          aria-expanded={asking}
          aria-controls={asking ? `${id}-kind` : undefined}
          aria-describedby={`${id}-hint`}
          onClick={() => setAsking((open) => !open)}
        >
          {d.action}
        </Button>
        <AnimatePresence initial={false}>
          {asking && (
            <motion.div key="kind" initial={{ opacity: 0, y: reduce ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={tween(0.16)}>
              <KindQuestion
                id={`${id}-kind`}
                autoFocus
                onChoose={onStart}
                onCancel={() => {
                  setAsking(false);
                  buttonRef.current?.focus();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
