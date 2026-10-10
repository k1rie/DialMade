"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Choice, choiceIds, joinIds } from "../Choice";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./Radio.css";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
  previewState?: PreviewState;
  ref?: Ref<HTMLInputElement>;
}

export function Radio({
  id,
  label,
  description,
  invalid,
  previewState,
  className,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  ref,
  ...props
}: RadioProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const { labelId, descriptionId } = choiceIds(inputId, label != null, description != null);
  return (
    <Choice
      inputId={inputId}
      labelId={labelId}
      descriptionId={descriptionId}
      label={label}
      description={description}
      disabled={disabled}
      className={cx("dl-radio", className)}
      control={
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className="dl-choice__input"
          disabled={disabled}
          // A radio has no aria-invalid: RadioGroup announces it on the group; this is only the look.
          data-invalid={invalid || undefined}
          aria-labelledby={ariaLabelledBy ?? (props["aria-label"] ? undefined : labelId)}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId)}
          data-preview-state={previewState}
          {...props}
        />
      }
    />
  );
}
