"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../Button";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import type { IconName } from "../Icon";
import { IconButton } from "../IconButton";
import { cx } from "../lib/cx";
import { useUiStrings } from "../UiProvider";
import "./Toast.css";

export type ToastVariant = "default" | "success" | "warning" | "info" | "destructive";

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  default: "bell",
  success: "check-circle",
  warning: "alert-triangle",
  info: "info",
  destructive: "alert-circle",
};

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** `false` oculta el icono; un nombre o nodo lo sustituye. */
  icon?: IconSlot | false;
  action?: { label: string; onClick?: () => void };
  onDismiss?: () => void;
}

/** Notificación estática (sin temporizador ni pila): la pieza visual de un sistema de toasts. */
export function Toast({ title, description, variant = "default", icon, action, onDismiss, className, ...props }: ToastProps) {
  const strings = useUiStrings();
  const iconNode = icon === false ? null : renderIcon(icon ?? VARIANT_ICON[variant], "dl-toast__icon");
  return (
    <div
      role={variant === "destructive" ? "alert" : "status"}
      className={cx("dl-toast", className)}
      data-variant={variant}
      {...props}
    >
      {iconNode}
      <div className="dl-toast__content">
        <p className="dl-toast__title">{title}</p>
        {description != null && <p className="dl-toast__description">{description}</p>}
      </div>
      {(action || onDismiss) && (
        <div className="dl-toast__actions">
          {action && (
            <Button variant="outline" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {onDismiss && <IconButton icon="x" label={strings.dismiss} size="sm" onClick={onDismiss} />}
        </div>
      )}
    </div>
  );
}
