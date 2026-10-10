"use client";

import { useId, useState, type ChangeEvent, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";
import { describedBy, Field, isPresent } from "../Field";
import { Icon } from "../Icon";
import { cx } from "../lib/cx";
import type { PreviewState, Size } from "../lib/types";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "multiple"> {
  options?: readonly SelectOption[];
  /** Opción vacía inicial («Elige un plan»). No se puede volver a elegir. */
  placeholder?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  hideLabel?: boolean;
  optionalLabel?: ReactNode;
  size?: Size;
  previewState?: PreviewState;
  fieldClassName?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  id,
  options,
  placeholder,
  label,
  hint,
  error,
  invalid,
  hideLabel,
  optionalLabel,
  size = "md",
  previewState,
  fieldClassName,
  className,
  disabled,
  required,
  value,
  defaultValue,
  onChange,
  children,
  "aria-describedby": ariaDescribedBy,
  ref,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hasError = isPresent(error);
  const isInvalid = invalid || hasError;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? (placeholder != null ? "" : undefined));
  const currentValue = value ?? uncontrolledValue;
  const showsPlaceholder = placeholder != null && (currentValue === "" || currentValue == null);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (value === undefined) setUncontrolledValue(event.target.value);
    onChange?.(event);
  };

  const control = (
    <div
      className={cx("dl-select", className)}
      data-size={size}
      data-placeholder={showsPlaceholder ? "" : undefined}
      data-preview-state={previewState}
    >
      <select
        ref={ref}
        id={selectId}
        className="dl-select__control"
        disabled={disabled}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy(selectId, isPresent(hint), hasError, ariaDescribedBy)}
        {...(value !== undefined ? { value } : { defaultValue: uncontrolledValue })}
        onChange={handleChange}
        {...props}
      >
        {placeholder != null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <Icon name="chevrons-up-down" className="dl-select__chevron" />
    </div>
  );
  if (label == null && !isPresent(hint) && !hasError) return control;
  return (
    <Field
      id={selectId}
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
