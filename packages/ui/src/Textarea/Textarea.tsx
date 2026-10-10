"use client";

import { useId, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { describedBy, Field, isPresent } from "../Field";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./Textarea.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  hideLabel?: boolean;
  optionalLabel?: ReactNode;
  previewState?: PreviewState;
  fieldClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  id,
  label,
  hint,
  error,
  invalid,
  hideLabel,
  optionalLabel,
  previewState,
  fieldClassName,
  className,
  disabled,
  required,
  rows = 4,
  "aria-describedby": ariaDescribedBy,
  ref,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const hasError = isPresent(error);
  const isInvalid = invalid || hasError;
  const control = (
    <textarea
      ref={ref}
      id={textareaId}
      rows={rows}
      className={cx("dl-textarea", className)}
      disabled={disabled}
      required={required}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy(textareaId, isPresent(hint), hasError, ariaDescribedBy)}
      data-preview-state={previewState}
      {...props}
    />
  );
  if (label == null && !isPresent(hint) && !hasError) return control;
  return (
    <Field
      id={textareaId}
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
