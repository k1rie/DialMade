import type { FC, ReactNode } from "react";
import type { z } from "zod";
import type { Locale, LocalizedText, OutputKind, ProductType } from "@dialmade/catalog";
import type { BindablePath, DesignDoc } from "@dialmade/doc";

export type ColorMode = "light" | "dark";

/** Shared brand content. `logoUrl` is runtime only (blob or CDN URL) and never stored in the doc. */
export interface BrandContent {
  name: string;
  tagline?: string;
  logoUrl?: string;
}

/** Everything the deterministic content helpers need. Same input, same copy. */
export interface ContentContext {
  brand: BrandContent;
  /** Always a ProductType: «generic» resolves to `GENERIC_PRODUCT_TYPE`. */
  productType: ProductType;
  locale: Locale;
  seed: number;
}

/**
 * What a section receives while rendering. It extends ContentContext, so a section can call the
 * content helpers with it directly (`tableData(ctx)`).
 */
export interface RenderContext extends ContentContext {
  mode: ColorMode;
  /** Edit mode: sections are selectable and links do not navigate. */
  interactive: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string;
  /** The document being rendered, for sections that show the system itself (brand board). */
  doc?: DesignDoc;
}

export interface SectionVariant {
  id: string;
  label: LocalizedText;
}

export type KnobControl = "select" | "toggle" | "slider" | "text";

export interface KnobOption {
  value: string;
  label: LocalizedText;
}

/** A declarative control of the inspector. `key` is a prop of the section (or `"variant"`). */
export interface KnobDef<P extends object = Record<string, unknown>> {
  key: Extract<keyof P, string> | "variant";
  label: LocalizedText;
  control: KnobControl;
  options?: readonly KnobOption[];
  min?: number;
  max?: number;
  step?: number;
  scope: "section";
}

export type SectionComponentProps<P extends object> = P & {
  variant: string;
  ctx: RenderContext;
  /** Element id in the page (`hero-1`), useful to build unique DOM ids. */
  elementId: string;
  /** Rendered child elements, for container sections (e.g. `app.shell`). */
  children?: ReactNode;
};

export interface SectionDefinition<P extends object = Record<string, unknown>> {
  /** Namespaced element type, e.g. `"landing.hero"`. Its namespace must be `kind` (or `ui`). */
  type: string;
  kind: OutputKind;
  label: LocalizedText;
  description?: LocalizedText;
  /** At least one. The first is the default. Stored in `props.variant`. */
  variants: readonly SectionVariant[];
  /** Validates the props (without `variant`). Unknown or invalid keys fall back to `defaultProps`. */
  schema: z.ZodType<P>;
  knobs: readonly KnobDef<P>[];
  /** Deterministic and JSON-compatible: `buildDefaultPage` stores it in the doc. */
  defaultProps: (ctx: ContentContext) => P;
  /** Props stored as `{ bind }` so they follow the brand (e.g. `{ brandName: "brand.name" }`). */
  bindings?: Partial<Record<Extract<keyof P, string>, BindablePath>>;
  /** Container sections render their child elements through `children`. */
  container?: boolean;
  /** For containers: the child types `buildDefaultPage` puts inside, in order. */
  defaultChildren?: readonly string[];
  Component: FC<SectionComponentProps<P>>;
}

// The registry stores definitions with their props erased.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySectionDefinition = SectionDefinition<any>;
