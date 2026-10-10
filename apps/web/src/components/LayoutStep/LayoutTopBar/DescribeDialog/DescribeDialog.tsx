"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, type MouseEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { smooth, tween } from "@/lib/motion";
import { DescribeScreens } from "../../DescribeScreens";
import { CloseIcon } from "../../icons";

export type DescribeDialogProps = {
  open: boolean;
  /** Esc, backdrop click, «Cerrar» and an applied variant call it with `false`. */
  onOpenChange: (open: boolean) => void;
};

function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

/**
 * «Describir» of the layout top bar: «Describe tu producto» as a modal over the editor, to add screens to the
 * project or replace them all. The same look as the AI key dialog; closes after a variant is applied.
 */
export function DescribeDialog({ open, onOpenChange }: DescribeDialogProps) {
  const t = useDictionary(layout);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => onOpenChange(false);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={close}
      onClick={(event) => {
        if (isBackdropClick(event)) close();
      }}
      className="app-chrome m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,60rem)] overflow-y-auto rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...smooth, opacity: tween(0.2) }}
          className="flex flex-col gap-4 p-5 sm:p-6"
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="m-0 text-h3">
                {t.describe.titleAdd}
              </h2>
              <p className="m-0 mt-1 max-w-2xl text-small text-pretty text-muted">{t.describe.subtitle}</p>
            </div>
            <IconButton label={t.describe.close} icon={<CloseIcon />} tooltip={false} className="-mt-1 -mr-1" onClick={close} />
          </header>
          <DescribeScreens mode="add" showHeader={false} titleId={titleId} onApplied={close} />
        </motion.div>
      )}
    </dialog>
  );
}
