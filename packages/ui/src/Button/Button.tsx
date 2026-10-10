"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { Icon } from "../Icon";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import type { PreviewState } from "../lib/types";
import { useUiStrings } from "../UiProvider";
import { VisuallyHidden } from "../VisuallyHidden";
import { buttonStyleProps, type ButtonSize, type ButtonVariant } from "./buttonClasses";
import "./Button.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: IconSlot;
  iconEnd?: IconSlot;
  loading?: boolean;
  /** Texto que se anuncia mientras carga. Por defecto, «Cargando…» del idioma activo. */
  loadingLabel?: string;
  fullWidth?: boolean;
  previewState?: PreviewState;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  loading = false,
  loadingLabel,
  fullWidth,
  previewState,
  type = "button",
  disabled,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  const strings = useUiStrings();
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      data-preview-state={previewState}
      {...buttonStyleProps({ variant, size, fullWidth, className })}
      {...props}
    >
      {renderIcon(iconStart, "dl-button__icon")}
      {children != null && <span className="dl-button__label">{children}</span>}
      {renderIcon(iconEnd, "dl-button__icon")}
      {loading && (
        <span className="dl-button__spinner">
          <Icon name="loader" />
          <VisuallyHidden>{loadingLabel ?? strings.loading}</VisuallyHidden>
        </span>
      )}
    </button>
  );
}
