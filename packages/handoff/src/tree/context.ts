import type { DesignDoc, ResolvedTokens, ThemeInputs } from "@dialmade/doc";
import type { RenderContext } from "@dialmade/sections";
import type { DesignNode, FrameNode } from "./types";

/** What a section builder receives: the same props and context its React component renders with. */
export interface SectionInput {
  /** Element id in the page (`hero-1`, a block id). */
  id: string;
  type: string;
  /** `resolveSectionProps`: stored props over the section's defaults, bindings resolved, validated. */
  props: Record<string, unknown>;
  variant: string;
  /** Built child elements, for containers (`app.shell`, a «Contenedor»). */
  children: DesignNode[];
  /**
   * The section's render context: content helpers take it as they take the component's `ctx`. Links resolve to
   * screen ids: `ctx.linkTarget(id)` is the screen an element's primary action opens, `ctx.screenHref(id)` is
   * `id` itself.
   */
  ctx: RenderContext;
  build: BuildContext;
}

/** The section's root box. The walker sets its `key` (the element id) and its name. */
export type SectionBuilder = (input: SectionInput) => FrameNode;

export interface BuildContext {
  doc: DesignDoc;
  inputs: ThemeInputs;
  /** Tokens of both modes (the brand board shows values; layout uses the light ones, which only differ in color). */
  light: ResolvedTokens;
  dark: ResolvedTokens;
  pageKind: "landing" | "app" | "brand";
}
