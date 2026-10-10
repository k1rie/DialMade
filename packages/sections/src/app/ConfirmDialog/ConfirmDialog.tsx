"use client";

import { useId } from "react";
import { Button, DialogPanel, DialogPreview } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import type { ConfirmDialogProps } from "./schema";
import "./ConfirmDialog.css";

/** A confirmation, drawn open and static: over a dimmed page (modal) or as a bare panel. */
export function ConfirmDialog({
  title,
  description,
  subject,
  confirmLabel,
  cancelLabel,
  destructive,
  variant,
}: SectionComponentProps<ConfirmDialogProps>) {
  const titleId = useId();
  const descriptionId = useId();
  const panel = {
    title,
    description,
    icon: destructive ? ("alert-triangle" as const) : ("info" as const),
    tone: destructive ? ("destructive" as const) : ("default" as const),
    size: "sm" as const,
    footer: (
      <>
        <Button variant="outline">{cancelLabel}</Button>
        <Button variant={destructive ? "destructive" : "primary"}>{confirmLabel}</Button>
      </>
    ),
    children: subject ? <p className="dl-app-confirm__subject">{subject}</p> : null,
  };

  if (variant === "panel") {
    return (
      <div className="dl-app-confirm" data-layout="panel">
        <div role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
          <DialogPanel {...panel} titleId={titleId} descriptionId={descriptionId} />
        </div>
      </div>
    );
  }
  return (
    <div className="dl-app-confirm" data-layout="modal">
      <DialogPreview {...panel} frameClassName="dl-app-confirm__frame" />
    </div>
  );
}
