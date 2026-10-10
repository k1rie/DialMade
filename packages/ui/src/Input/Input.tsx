"use client";

import { useId, useRef, type InputHTMLAttributes, type PointerEvent, type ReactNode, type Ref } from "react";
import { describedBy, Field, isPresent } from "../Field";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import { assignRef } from "../lib/refs";
import type { PreviewState, Size } from "../lib/types";
import "./Input.css";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  /** Mensaje de error: marca el campo como inválido y se enlaza con `aria-describedby`. */
  error?: ReactNode;
  invalid?: boolean;
  hideLabel?: boolean;
  optionalLabel?: ReactNode;
  size?: Size;
  iconStart?: IconSlot;
  iconEnd?: IconSlot;
  previewState?: PreviewState;
  /** Clase del contenedor de campo (etiqueta + control + mensajes). */
  fieldClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  id,
  label,
  hint,
  error,
  invalid,
  hideLabel,
  optionalLabel,
  size = "md",
  iconStart,
  iconEnd,
  previewState,
  fieldClassName,
  className,
  disabled,
  required,
  type = "text",
  "aria-describedby": ariaDescribedBy,
  ref,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasError = isPresent(error);
  const isInvalid = invalid || hasError;
  const focusFromFrame = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };
  const control = (
    <div
      onPointerDown={focusFromFrame}
      className={cx("dl-input", className)}
      data-size={size}
      data-invalid={isInvalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-preview-state={previewState}
    >
      {renderIcon(iconStart, "dl-input__icon")}
      <input
        ref={(node) => {
          inputRef.current = node;
          assignRef(ref, node);
        }}
        id={inputId}
        type={type}
        className="dl-input__control"
        disabled={disabled}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy(inputId, isPresent(hint), hasError, ariaDescribedBy)}
        {...props}
      />
      {renderIcon(iconEnd, "dl-input__icon")}
    </div>
  );
  if (label == null && !isPresent(hint) && !hasError) return control;
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      hideLabel={hideLabel}
      disabled={disabled}
      className={fieldClassName}
    >
      {control}
    </Field>
  );
}
