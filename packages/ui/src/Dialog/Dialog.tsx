"use client";

import { useEffect, useId, useRef, type MouseEvent, type SyntheticEvent } from "react";
import { cx } from "../lib/cx";
import { DialogPanel, type DialogPanelProps } from "./DialogPanel";
import "./Dialog.css";

export interface DialogProps extends Omit<DialogPanelProps, "titleId" | "descriptionId" | "onClose"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Esc, clic fuera y botón de cerrar. Desactívalo solo si la acción no se puede abandonar. */
  dismissible?: boolean;
}

/** Diálogo modal controlado sobre `<dialog>` nativo: foco atrapado, Esc y retorno del foco del navegador. */
export function Dialog({ open, onOpenChange, dismissible = true, size = "md", className, ...panelProps }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (dismissible) onOpenChange(false);
  };

  const onClose = () => {
    if (open) onOpenChange(false);
  };

  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (dismissible && event.target === event.currentTarget) onOpenChange(false);
  };

  return (
    <dialog
      ref={ref}
      className={cx("dl-dialog", className)}
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={panelProps.description != null ? descriptionId : undefined}
      onCancel={onCancel}
      onClose={onClose}
      onClick={onClick}
    >
      <DialogPanel
        {...panelProps}
        size={size}
        titleId={titleId}
        descriptionId={descriptionId}
        onClose={dismissible ? () => onOpenChange(false) : undefined}
      />
    </dialog>
  );
}
