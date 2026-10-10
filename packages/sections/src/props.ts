import { isBindablePath, resolveBindings, type Binding } from "@dialmade/doc";
import { VARIANT_PROP } from "./constants";
import type { AnySectionDefinition, ContentContext } from "./types";

export interface ResolvedSectionProps {
  props: Record<string, unknown>;
  variant: string;
  /** Stored keys that failed the schema and fell back to the defaults. */
  invalidKeys: string[];
}

function pickVariant(def: AnySectionDefinition, value: unknown): string {
  const fallback = def.variants[0]?.id ?? "default";
  return typeof value === "string" && def.variants.some((variant) => variant.id === value) ? value : fallback;
}

/**
 * Props a section renders with: stored props (bindings resolved) over `defaultProps(ctx)`, validated
 * key by key. Throws only when the section's own defaults fail its schema.
 */
export function resolveSectionProps(
  def: AnySectionDefinition,
  stored: Readonly<Record<string, unknown>>,
  ctx: ContentContext,
): ResolvedSectionProps {
  const resolved = resolveBindings({ brand: ctx.brand }, stored);
  const { [VARIANT_PROP]: variant, ...rest } = resolved;
  const defaults = def.defaultProps(ctx) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaults, ...rest };

  const first = def.schema.safeParse(merged);
  if (first.success) return { props: first.data as Record<string, unknown>, variant: pickVariant(def, variant), invalidKeys: [] };

  const invalidKeys = [
    ...new Set(first.error.issues.map((issue) => issue.path[0]).filter((key): key is string => typeof key === "string")),
  ];
  for (const key of invalidKeys) {
    if (key in defaults) merged[key] = defaults[key];
    else delete merged[key];
  }
  const second = def.schema.safeParse(merged);
  const props = second.success ? second.data : def.schema.parse(defaults);
  return { props: props as Record<string, unknown>, variant: pickVariant(def, variant), invalidKeys };
}

/** What `buildDefaultPage` stores for a section: its variant and defaults, brand props as bindings. */
export function storedDefaultProps(def: AnySectionDefinition, ctx: ContentContext): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [VARIANT_PROP]: def.variants[0]?.id,
    ...(def.defaultProps(ctx) as Record<string, unknown>),
  };
  for (const [key, path] of Object.entries(def.bindings ?? {})) {
    if (!isBindablePath(path)) continue;
    if (path === "brand.tagline" && !ctx.brand.tagline) continue;
    props[key] = { bind: path } satisfies Binding;
  }
  return props;
}
