"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { renderIcon, type IconSlot } from "../../Icon/renderIcon";
import { IconButton } from "../../IconButton";
import { cx } from "../../lib/cx";
import { useUiStrings } from "../../UiProvider";
import "./DialogPanel.css";

export interface DialogPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  icon?: IconSlot;
  tone?: "default" | "destructive";
  size?: "sm" | "md" | "lg";
  /** Con `onClose` aparece el botón de cerrar. */
  onClose?: () => void;
  titleId?: string;
  descriptionId?: string;
}

/** La superficie del diálogo, sin comportamiento: la usan `Dialog` y `DialogPreview`. */
export function DialogPanel({
  title,
  description,
  footer,
  icon,
  tone = "default",
  size = "md",
  onClose,
  titleId,
  descriptionId,
  className,
  children,
  ...props
}: DialogPanelProps) {
  const strings = useUiStrings();
  return (
    <div className={cx("dl-dialog-panel", className)} data-size={size} data-tone={tone} {...props}>
      <div className="dl-dialog-panel__header">
        {icon != null && <span className="dl-dialog-panel__icon">{renderIcon(icon)}</span>}
        <div className="dl-dialog-panel__heading">
          <h2 id={titleId} className="dl-dialog-panel__title">
            {title}
          </h2>
          {description != null && (
            <p id={descriptionId} className="dl-dialog-panel__description">
              {description}
            </p>
          )}
        </div>
        {onClose && (
          <IconButton icon="x" label={strings.close} size="sm" className="dl-dialog-panel__close" onClick={onClose} />
        )}
      </div>
      {children != null && <div className="dl-dialog-panel__body">{children}</div>}
      {footer != null && <div className="dl-dialog-panel__footer">{footer}</div>}
    </div>
  );
}
