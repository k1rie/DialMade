"use client";

import { useId } from "react";
import { Button, DialogPanel, DialogPreview, buttonStyleProps } from "@dialmade/ui";
import { linkProps } from "../../context";
import { EditInert } from "../../PageRenderer/EditInert";
import type { SectionComponentProps } from "../../types";
import type { ConfirmDialogProps } from "./schema";
import "./ConfirmDialog.css";

/**
 * A confirmation, drawn open and static: over a dimmed page (modal) or as a bare panel. As a container
 * (a «Modal» block of Layout mode with a form or a list inside), the child elements go in its body; in edit
 * mode only its buttons are inert, so the children stay selectable. When the block links to a screen
 * (`linkTo`), the confirm button is a link to it (preview and export).
 */
export function ConfirmDialog({
  title,
  description,
  subject,
  confirmLabel,
  cancelLabel,
  destructive,
  variant,
  ctx,
  elementId,
  children,
}: SectionComponentProps<ConfirmDialogProps>) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmVariant = destructive ? "destructive" : "primary";
  const linked = (ctx.linkTarget?.(elementId) ?? null) !== null;
  const panel = {
    title,
    description,
    icon: destructive ? ("alert-triangle" as const) : ("info" as const),
    tone: destructive ? ("destructive" as const) : ("default" as const),
    size: "sm" as const,
    footer: (
      <EditInert ctx={ctx}>
        <Button variant="outline">{cancelLabel}</Button>
        {linked ? (
          <a {...linkProps(ctx, elementId)} {...buttonStyleProps({ variant: confirmVariant })}>
            <span className="dl-button__label">{confirmLabel}</span>
          </a>
        ) : (
          <Button variant={confirmVariant}>{confirmLabel}</Button>
        )}
      </EditInert>
    ),
    children:
      subject || children != null ? (
        <>
          {subject ? <p className="dl-app-confirm__subject">{subject}</p> : null}
          {children != null ? <div className="dl-app-confirm__content">{children}</div> : null}
        </>
      ) : null,
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
