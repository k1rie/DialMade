"use client";

import type { ScreenKind } from "@dialmade/layout";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { PlusIcon } from "../../icons";
import { KindQuestion } from "../../KindQuestion";
import { CARD_PREVIEW, CARD_SURFACE } from "../constants";

export type BlankCardProps = {
  onChoose: (kind: ScreenKind) => void;
};

/**
 * «En blanco» as a large card. A blank screen has no kind, so choosing it opens «¿Web pública o pantalla
 * de app?» inside the card (focus moves to the first answer; Esc closes it and returns to the card).
 */
export function BlankCard({ onChoose }: BlankCardProps) {
  const t = useDictionary(layout);
  const id = useId();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const questionId = `${id}-question`;

  return (
    <div className="group h-full w-full rounded-panel">
      <div className={cn(CARD_SURFACE, open && "border-app-strong bg-surface-hover")}>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? questionId : undefined}
          // Named by the title alone: the hint is the description, so it is not read twice.
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-hint`}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full flex-col gap-4 rounded-card text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span className={CARD_PREVIEW}>
            <span
              aria-hidden="true"
              className="flex aspect-[16/10] w-1/2 items-center justify-center rounded-[8px] border border-dashed border-app-strong text-subtle [&_svg]:size-5"
            >
              <PlusIcon />
            </span>
          </span>
          <span className="flex flex-col gap-1 px-1.5">
            <span id={`${id}-title`} className="text-h3 text-fg">
              {t.templatePicker.blank}
            </span>
            <span id={`${id}-hint`} className="text-small text-pretty text-muted">
              {t.templatePicker.blankHint}
            </span>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="kind" variants={popVariants} initial="initial" animate="animate" exit="exit">
              <KindQuestion
                id={questionId}
                autoFocus
                onChoose={onChoose}
                onCancel={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className="px-1.5"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
