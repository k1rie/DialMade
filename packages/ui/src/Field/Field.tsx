import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "../Icon";
import { cx } from "../lib/cx";
import { VisuallyHidden } from "../VisuallyHidden";
import { fieldIds, isPresent } from "./fieldIds";
import "./Field.css";

export interface FieldProps extends Omit<HTMLAttributes<HTMLElement>, "id" | "children"> {
  /** id del control: la etiqueta apunta a él y la pista y el error derivan de él. */
  id: string;
  /** `fieldset` para grupos (radios, checkboxes): la etiqueta pasa a ser `<legend>`. */
  as?: "div" | "fieldset";
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Texto junto a la etiqueta de los campos opcionales («Opcional»). */
  optionalLabel?: ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  as: Root = "div",
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  hideLabel,
  disabled,
  className,
  children,
  ...props
}: FieldProps) {
  const ids = fieldIds(id);
  const labelContent = (
    <>
      {label}
      {required && (
        <span className="dl-field__required" aria-hidden="true">
          *
        </span>
      )}
      {!required && optionalLabel && <span className="dl-field__optional">{optionalLabel}</span>}
    </>
  );
  return (
    <Root
      className={cx("dl-field", Root === "fieldset" && "dl-field--group", className)}
      data-disabled={disabled ? "" : undefined}
      data-invalid={isPresent(error) ? "" : undefined}
      {...(Root === "fieldset" ? { disabled } : {})}
      {...props}
    >
      {label != null && Root === "fieldset" && (
        <legend id={ids.label} className={hideLabel ? "dl-visually-hidden" : "dl-field__label"}>
          {hideLabel ? label : labelContent}
        </legend>
      )}
      {label != null &&
        Root === "div" &&
        (hideLabel ? (
          <VisuallyHidden>
            <label id={ids.label} htmlFor={id}>
              {label}
            </label>
          </VisuallyHidden>
        ) : (
          <label id={ids.label} className="dl-field__label" htmlFor={id}>
            {labelContent}
          </label>
        ))}
      {children}
      {isPresent(hint) && (
        <p id={ids.hint} className="dl-field__hint">
          {hint}
        </p>
      )}
      {isPresent(error) && (
        <p id={ids.error} className="dl-field__error">
          <Icon name="alert-circle" />
          <span>{error}</span>
        </p>
      )}
    </Root>
  );
}
