import { Checkbox, Input, Select, Textarea } from "@dialmade/ui";
import type { FormPurpose } from "../../content";
import type { FormField as FormFieldData } from "../schema";

export interface FormFieldProps {
  field: FormFieldData;
  /** DOM id of the control (`${elementId}-${field.id}`). */
  id: string;
  purpose: FormPurpose;
  /** Path of the field in the props (`fields/2`), for inline editing. */
  prop: string;
}

const AUTOCOMPLETE: Readonly<Record<string, string>> = {
  name: "name",
  email: "email",
  company: "organization",
  phone: "tel",
};

/** One field of `ui.form` with the kit's controls; the label always names the control. */
export function FormField({ field, id, purpose, prop }: FormFieldProps) {
  const label = <span data-dl-prop={`${prop}/label`}>{field.label}</span>;
  const placeholder = field.placeholder || undefined;
  switch (field.kind) {
    case "textarea":
      return <Textarea id={id} name={field.id} label={label} placeholder={placeholder} required={field.required} rows={3} />;
    case "select":
      return (
        <Select
          id={id}
          name={field.id}
          label={label}
          placeholder={placeholder}
          required={field.required}
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
        />
      );
    case "checkbox":
      return <Checkbox id={id} name={field.id} label={label} required={field.required} />;
    default: {
      const autoComplete =
        field.kind === "password" ? (purpose === "signup" ? "new-password" : "current-password") : AUTOCOMPLETE[field.id];
      return (
        <Input
          id={id}
          name={field.id}
          type={field.kind}
          label={label}
          placeholder={placeholder}
          required={field.required}
          autoComplete={autoComplete}
          iconStart={field.kind === "search" ? "search" : field.kind === "email" ? "mail" : undefined}
        />
      );
    }
  }
}
