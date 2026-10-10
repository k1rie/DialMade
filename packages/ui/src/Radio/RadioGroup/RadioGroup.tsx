"use client";

import { useId, useState, type ReactNode } from "react";
import { describedBy, Field, fieldIds, isPresent } from "../../Field";
import { cx } from "../../lib/cx";
import type { PreviewState } from "../../lib/types";
import { Radio } from "../Radio";
import "./RadioGroup.css";

export interface RadioGroupOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  previewState?: PreviewState;
}

export interface RadioGroupProps {
  label: ReactNode;
  options: readonly RadioGroupOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}

export function RadioGroup({
  label,
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  orientation = "vertical",
  hint,
  error,
  required,
  disabled,
  hideLabel,
  className,
}: RadioGroupProps) {
  const groupId = useId();
  const groupName = name ?? groupId;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const selected = value ?? uncontrolled;
  const hasError = isPresent(error);

  const select = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <Field
      as="fieldset"
      id={groupId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      disabled={disabled}
      className={cx("dl-radio-group", className)}
      data-orientation={orientation}
      role="radiogroup"
      aria-labelledby={fieldIds(groupId).label}
      aria-describedby={describedBy(groupId, isPresent(hint), hasError)}
      aria-invalid={hasError || undefined}
      aria-required={required || undefined}
    >
      <div className="dl-radio-group__options">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={groupName}
            value={option.value}
            label={option.label}
            description={option.description}
            disabled={disabled || option.disabled}
            invalid={hasError}
            previewState={option.previewState}
            checked={selected === option.value}
            onChange={() => select(option.value)}
          />
        ))}
      </div>
    </Field>
  );
}
