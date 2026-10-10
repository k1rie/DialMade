import { FORM_PURPOSES, visibleFields, type FormPurpose } from "../content";

const isPurpose = (value: unknown): value is FormPurpose => typeof value === "string" && (FORM_PURPOSES as readonly string[]).includes(value);
const hasId = (value: unknown): value is { id: string } =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

/** The fields the form shows: the purpose's subset, in its order, cut to `count` (like `Form`). */
export function visibleForm(stored: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { fields, purpose, count } = stored;
  if (!Array.isArray(fields) || !fields.every(hasId) || !isPurpose(purpose) || typeof count !== "number" || !Number.isFinite(count)) {
    return { ...stored };
  }
  return { ...stored, fields: visibleFields(fields, purpose, count) };
}
