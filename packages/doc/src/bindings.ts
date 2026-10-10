import { BINDABLE_PATHS } from "./constants";
import { isPlainObject } from "./json";

export type BindablePath = (typeof BINDABLE_PATHS)[number];

/** A text prop that mirrors shared brand content, so name and tagline never diverge between pages. */
export interface Binding {
  bind: BindablePath;
}

export interface BindingSource {
  brand: { name: string; tagline?: string };
}

export const isBindablePath = (value: unknown): value is BindablePath =>
  typeof value === "string" && (BINDABLE_PATHS as readonly string[]).includes(value);

export function isBinding(value: unknown): value is Binding {
  return isPlainObject(value) && Object.keys(value).length === 1 && isBindablePath(value.bind);
}

/** Any object carrying a `bind` key must be exactly `{ bind: BindablePath }`. */
export function looksLikeBinding(value: unknown): boolean {
  return isPlainObject(value) && "bind" in value;
}

export function bindingValue(source: BindingSource, path: BindablePath): string {
  return path === "brand.name" ? source.brand.name : (source.brand.tagline ?? "");
}

function resolveValue(source: BindingSource, value: unknown): unknown {
  if (isBinding(value)) return bindingValue(source, value.bind);
  if (Array.isArray(value)) return value.map((item) => resolveValue(source, item));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) out[key] = resolveValue(source, child);
    return out;
  }
  return value;
}

/**
 * Replaces every `{ bind }` (at any depth) with the current brand text. A missing tagline resolves to
 * `""`. Returns a new object; `props` is not modified.
 */
export function resolveBindings(source: BindingSource, props: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return resolveValue(source, props) as Record<string, unknown>;
}
