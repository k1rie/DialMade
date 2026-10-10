"use client";

import { useId } from "react";
import { cx } from "../../lib/cx";
import { DialogPanel, type DialogPanelProps } from "../DialogPanel";
import "./DialogPreview.css";

export interface DialogPreviewProps extends Omit<DialogPanelProps, "titleId" | "descriptionId"> {
  /** Clase del marco que simula la página y el fondo oscurecido. */
  frameClassName?: string;
}

/** Diálogo abierto y estático, dentro de un marco con backdrop: para guías de estilo y miniaturas. */
export function DialogPreview({ frameClassName, ...panelProps }: DialogPreviewProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <div className={cx("dl-dialog-preview", frameClassName)}>
      <div className="dl-dialog-preview__page" aria-hidden="true">
        <span className="dl-dialog-preview__line" />
        <span className="dl-dialog-preview__line" />
        <span className="dl-dialog-preview__line" />
        <span className="dl-dialog-preview__line" />
      </div>
      <div className="dl-dialog-preview__backdrop" aria-hidden="true" />
      <div
        className="dl-dialog-preview__surface"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={panelProps.description != null ? descriptionId : undefined}
      >
        <DialogPanel {...panelProps} titleId={titleId} descriptionId={descriptionId} />
      </div>
    </div>
  );
}
