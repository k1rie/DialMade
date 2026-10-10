"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Choice, choiceIds, joinIds } from "../Choice";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./Switch.css";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "role"> {
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
  previewState?: PreviewState;
  ref?: Ref<HTMLInputElement>;
}

/** Checkbox nativo con `role="switch"`: funciona también en el HTML exportado sin JS. */
export function Switch({
  id,
  label,
  description,
  size = "md",
  previewState,
  className,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  ref,
  ...props
}: SwitchProps) {
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
      className={cx("dl-switch", className)}
      boxClassName="dl-switch__box"
      size={size}
      control={
        <>
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            className="dl-choice__input"
            disabled={disabled}
            aria-labelledby={ariaLabelledBy ?? (props["aria-label"] ? undefined : labelId)}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId)}
            data-preview-state={previewState}
            {...props}
          />
          <span className="dl-switch__thumb" aria-hidden="true" />
        </>
      }
    />
  );
}
