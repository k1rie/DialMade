import { resolveThemeInputs, resolveTokens, type DesignDoc, type ResolvedTokens, type ThemeInputs } from "@dialmade/doc";
import type { ColorMode, RenderContext } from "../../types";

export type Theme = ThemeInputs["theme"];
export type ContrastCheck = Theme["contrast"][number];

/** What the board shows as numbers: the resolved theme and the tokens of both modes. */
export interface BrandSystem {
  inputs: ThemeInputs;
  theme: Theme;
  tokens: Record<ColorMode, ResolvedTokens>;
  /** Modes whose colors the doc overrides (`doc.tokens.color`): their checks are recomputed. */
  overridden: Record<ColorMode, boolean>;
}

/**
 * A RenderContext that may carry live theme inputs (an unsaved theme in a preview). Without them the
 * board resolves everything from `ctx.doc`.
 */
export type BrandRenderContext = RenderContext & { themeInputs?: Partial<ThemeInputs> };

const NO_OVERRIDES: Partial<ThemeInputs> = {};
const cache = new WeakMap<DesignDoc, WeakMap<object, BrandSystem | null>>();

function build(doc: DesignDoc, overrides: Partial<ThemeInputs>): BrandSystem | null {
  try {
    const inputs = resolveThemeInputs(doc, overrides);
    const pageDials = doc.pages.brand?.dials;
    const tokensFor = (mode: ColorMode) => resolveTokens(doc, { ...inputs, mode, ...(pageDials && { pageDials }) });
    const hasOverrides = (mode: ColorMode) => Object.keys(doc.tokens.color[mode]).length > 0;
    return {
      inputs,
      theme: inputs.theme,
      tokens: { light: tokensFor("light"), dark: tokensFor("dark") },
      overridden: { light: hasOverrides("light"), dark: hasOverrides("dark") },
    };
  } catch {
    return null;
  }
}

/** Resolved system of the rendered doc, cached per doc (immutable) and overrides. Undefined without a doc. */
export function brandSystem(ctx: BrandRenderContext): BrandSystem | undefined {
  const { doc } = ctx;
  if (!doc) return undefined;
  const overrides = ctx.themeInputs ?? NO_OVERRIDES;
  let byOverrides = cache.get(doc);
  if (!byOverrides) {
    byOverrides = new WeakMap();
    cache.set(doc, byOverrides);
  }
  let system = byOverrides.get(overrides);
  if (system === undefined) {
    system = build(doc, overrides);
    byOverrides.set(overrides, system);
  }
  return system ?? undefined;
}
