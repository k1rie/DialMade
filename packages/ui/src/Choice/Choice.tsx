import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import "./Choice.css";

export interface ChoiceProps {
  inputId: string;
  labelId?: string;
  descriptionId?: string;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  boxClassName?: string;
  size?: "sm" | "md";
  /** El `<input>` y sus adornos (check, thumb…). */
  control: ReactNode;
}

/** Disposición común de Checkbox, Radio y Switch: control + etiqueta + descripción. */
export function Choice({
  inputId,
  labelId,
  descriptionId,
  label,
  description,
  disabled,
  className,
  boxClassName,
  size,
  control,
}: ChoiceProps) {
  return (
    <label
      className={cx("dl-choice", className)}
      htmlFor={inputId}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
    >
      <span className={cx("dl-choice__box", boxClassName)}>{control}</span>
      {(label != null || description != null) && (
        <span className="dl-choice__text">
          {label != null && (
            <span id={labelId} className="dl-choice__label">
              {label}
            </span>
          )}
          {description != null && (
            <span id={descriptionId} className="dl-choice__description">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

/** ids de etiqueta y descripción: la etiqueta nombra el control y la descripción lo describe. */
export function choiceIds(inputId: string, hasLabel: boolean, hasDescription: boolean) {
  return {
    labelId: hasLabel ? `${inputId}-label` : undefined,
    descriptionId: hasDescription ? `${inputId}-description` : undefined,
  };
}

export function joinIds(...ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}
