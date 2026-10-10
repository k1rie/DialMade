import type { FC, ReactNode } from "react";
import type { z } from "zod";
import type { Locale, LocalizedText, OutputKind, ProductType } from "@dialmade/catalog";
import type { BindablePath, DesignDoc } from "@dialmade/doc";
import type { ContentEstimate, LibraryBlockType, MobileBehavior, ParsedNote, ScreenKind } from "@dialmade/layout";

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
  /**
   * @deprecated `PageRenderer` no longer sets it: the selection lives in its render scope (only the frames read
   * it), so selecting a section re-renders no section (review B #22). `SectionFrame` still reads it when it gets
   * no `selected` prop, for callers that render frames themselves.
   */
  selectedId?: string;
  /** The document being rendered, for sections that show the system itself (brand board). */
  doc?: DesignDoc;
  /** Href of a screen (Layout mode); `null` when the screen has no URL in this render. */
  screenHref?(screenId: string): string | null;
  /** Href of the primary action of an element whose block links to a screen (`linkTo`); `null` when it links nowhere. */
  blockLink?(elementId: string): string | null;
  /** Screen the element's primary action links to, for `data-dl-screen-link`; `null` when it links nowhere. */
  linkTarget?(elementId: string): string | null;
}

/* ------------------------------------------------------------------------------------------------ */
/* Layout mode                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/**
 * What `fit` receives for one block, all deterministic (never measured): the desktop rect in grid units
 * (`w` columns, `h` rows of 8 px) and in px (`widthPx = w * 120`, `heightPx = h * 8`).
 */
export interface FitInput {
  w: number;
  h: number;
  widthPx: number;
  heightPx: number;
  /** `block.count ?? note.count`, clamped to the library's repeatable range; absent when neither is set. */
  count?: number;
  note: ParsedNote;
  /** `estimateContent(block, layout, id)`: what the canvas chip promises. `fit` maps it, never derives again. */
  estimate: ContentEstimate | null;
  /** Types of the accepted children merged into this block (a media inside a hero). */
  absorbed: readonly LibraryBlockType[];
  kind: ScreenKind;
  blockId: string;
  /** The mobile behavior picked in the canvas inspector (`block.responsive.mobile.behavior`), when set. */
  mobile?: MobileBehavior;
  /**
   * The block links to another screen (`block.linkTo`): a section that hides its action at small sizes keeps it,
   * so the link has something to click (ui.text).
   */
  linked?: boolean;
}

export interface FitResult<P> {
  variant?: string;
  props?: Partial<P>;
}

export interface SectionLayout<P> {
  /** Layout-owned keys (count, pageSize…): regenerating rewrites them; copy outside them is kept. */
  owns: readonly (keyof P & string)[];
  /** Variant and layout-owned props for a block of this size. Must return schema-valid values. */
  fit(input: FitInput): FitResult<P>;
  /**
   * Optional: props merged over `defaultProps` when the page comes from a layout, e.g. repeatable lists at
   * their maximum so `count` alone decides what shows. Template pages (`buildDefaultPage`) never use it.
   */
  defaults?(ctx: ContentContext): Partial<P>;
}

/** How the element wrapper of a section behaves. */
export interface SectionFrameOptions {
  /**
   * Structural elements (inferred regions, the layout scope) render a plain wrapper: no tab stop, role,
   * click selection or inert wrapper. Receives the stored props.
   */
  structural?(stored: Readonly<Record<string, unknown>>): boolean;
  /** Extra `data-*` attributes on the wrapper (a region's layout kind, its surface). Receives the stored props. */
  attributes?(stored: Readonly<Record<string, unknown>>): Readonly<Record<`data-${string}`, string>>;
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
  /** Layout mode: how a block of the canvas becomes this section (`buildPageFromLayout`). */
  layout?: SectionLayout<P>;
  /** Wrapper behaviour (structural regions, extra data attributes). */
  frame?: SectionFrameOptions;
  /**
   * The stored props as the section shows them: lists cut to what renders (`count`), copy a flag hides
   * removed. Read by `visibleProps` for descriptions of the page (DESIGN.md, prompt packs, AI copy), never
   * for rendering. Receives the stored props (bindings unresolved, possibly invalid) and only removes or
   * shortens values, never adds them.
   */
  visible?(stored: Readonly<Record<string, unknown>>): Record<string, unknown>;
  Component: FC<SectionComponentProps<P>>;
}

// The registry stores definitions with their props erased.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySectionDefinition = SectionDefinition<any>;
