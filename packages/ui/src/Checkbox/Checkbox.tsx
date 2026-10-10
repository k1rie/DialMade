"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Choice, choiceIds, joinIds } from "../Choice";
import { Icon } from "../Icon";
import { cx } from "../lib/cx";
import { assignRef } from "../lib/refs";
import type { PreviewState } from "../lib/types";
import "./Checkbox.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  invalid?: boolean;
  previewState?: PreviewState;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({
  id,
  label,
  description,
  indeterminate = false,
  invalid,
  previewState,
  className,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  ref,
  ...props
}: CheckboxProps) {
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
      className={cx("dl-checkbox", className)}
      control={
        <>
          <input
            ref={(node) => {
              if (node) node.indeterminate = indeterminate;
              assignRef(ref, node);
            }}
            id={inputId}
            type="checkbox"
            className="dl-choice__input"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-labelledby={ariaLabelledBy ?? (props["aria-label"] ? undefined : labelId)}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId)}
            data-preview-state={previewState}
            {...props}
          />
          <Icon name="check" className="dl-checkbox__icon dl-checkbox__icon--check" />
          <Icon name="minus" className="dl-checkbox__icon dl-checkbox__icon--mixed" />
        </>
      }
    />
  );
}
