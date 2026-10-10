import { getStyleRecipe, type Locale } from "@dialmade/catalog";

/** Value of «Tu guía de estilo» in the style choice (see `StyleChoice`). */
export const GUIDE_STYLE = "guide";

/**
 * Visible name of the chosen style for the «Estilo: …» chip: the guide's name, the recipe's label in the
 * UI language, else the doc's recipe (an unknown or empty choice), else the raw value.
 */
export function styleName(style: string, locale: Locale, guideName: string, fallbackRecipeId?: string): string {
  if (style === GUIDE_STYLE) return guideName;
  const recipe = getStyleRecipe(style) ?? (fallbackRecipeId ? getStyleRecipe(fallbackRecipeId) : undefined);
  return recipe?.label[locale] ?? style;
}
