"use client";

// «¿Borrar …?»: a small modal. Focus starts on «Cancelar» (the safe choice); Esc and the backdrop cancel.
import { motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary, useI18n } from "@/i18n";
import { authText } from "@/i18n/auth";
import { smooth, tween } from "@/lib/motion";

export type ConfirmDeleteProps = { name: string | null; onCancel: () => void; onConfirm: () => void };

export function ConfirmDelete({ name, onCancel, onConfirm }: ConfirmDeleteProps) {
  const t = useDictionary(authText).designs;
  const { t: common } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const open = name !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="app-chrome m-auto w-[min(100vw-2rem,24rem)] rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      {open && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...smooth, opacity: tween(0.18) }} className="flex flex-col gap-5 p-5">
          <p id={titleId} className="m-0 text-body text-fg">
            {t.confirmDelete(name)}
          </p>
          <div className="flex justify-end gap-2">
            <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
              {common.actions.cancel}
            </Button>
            <Button variant="secondary" className="text-danger" onClick={onConfirm}>
              {t.confirm}
            </Button>
          </div>
        </motion.div>
      )}
    </dialog>
  );
}
