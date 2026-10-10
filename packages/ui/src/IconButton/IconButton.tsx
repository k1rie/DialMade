"use client";

import type { Ref } from "react";
import { Button, type ButtonProps } from "../Button";
import type { IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import "./IconButton.css";

export interface IconButtonProps extends Omit<ButtonProps, "iconStart" | "iconEnd" | "children" | "fullWidth"> {
  icon: IconSlot;
  /** Nombre accesible obligatorio: el botón no tiene texto visible. */
  label: string;
  round?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ icon, label, round, variant = "ghost", className, ...props }: IconButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      iconStart={icon}
      aria-label={label}
      data-round={round ? "" : undefined}
      className={cx("dl-icon-button", className)}
    />
  );
}
