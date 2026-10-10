import { cx } from "../lib/cx";
import type { Size } from "../lib/types";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "cta" | "destructive";
export type ButtonSize = Size;

export const BUTTON_VARIANTS: readonly ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "cta", "destructive"];
export const BUTTON_SIZES: readonly ButtonSize[] = ["sm", "md", "lg"];

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Atributos de estilo de un botón para pintarlo sobre otro elemento (un `<a>`, por ejemplo):
 * `<a href="/signup" {...buttonStyleProps({ variant: "cta" })}>`.
 */
export function buttonStyleProps({ variant = "primary", size = "md", fullWidth, className }: ButtonStyleOptions = {}) {
  return {
    className: cx("dl-button", className),
    "data-variant": variant,
    "data-size": size,
    "data-full-width": fullWidth ? "" : undefined,
  };
}
