"use client";

import type { HTMLAttributes, ReactNode } from "react";
import type { IconName } from "../Icon";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { IconButton } from "../IconButton";
import { cx } from "../lib/cx";
import { useUiStrings } from "../UiProvider";
import "./Alert.css";

export type AlertVariant = "neutral" | "info" | "success" | "warning" | "destructive";

const VARIANT_ICON: Record<AlertVariant, IconName> = {
  neutral: "info",
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  destructive: "alert-circle",
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  title?: ReactNode;
  icon?: IconSlot | false;
  /** Botones o enlaces a la derecha. */
  action?: ReactNode;
  onDismiss?: () => void;
}

/** Aviso en línea. Los de error y aviso se anuncian (`alert`); el resto es `status`. */
export function Alert({ variant = "neutral", title, icon, action, onDismiss, className, children, role, ...props }: AlertProps) {
  const strings = useUiStrings();
  const urgent = variant === "destructive" || variant === "warning";
  return (
    <div role={role ?? (urgent ? "alert" : "status")} className={cx("dl-alert", className)} data-variant={variant} {...props}>
      {icon !== false && renderIcon(icon ?? VARIANT_ICON[variant], "dl-alert__icon")}
      <div className="dl-alert__content">
        {title != null && <p className="dl-alert__title">{title}</p>}
        {children != null && <div className="dl-alert__description">{children}</div>}
      </div>
      {(action != null || onDismiss) && (
        <div className="dl-alert__actions">
          {action}
          {onDismiss && <IconButton icon="x" label={strings.dismiss} size="sm" onClick={onDismiss} />}
        </div>
      )}
    </div>
  );
}
