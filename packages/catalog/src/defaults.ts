import { landingLayouts, motionTiers, productTypes } from "./catalog";
import {
  DASHBOARD_LANDING_LAYOUT_ID,
  DEFAULT_LANDING_LAYOUT_ID,
  DEFAULT_PAIRING_ID,
  DEFAULT_RECIPE_ID,
} from "./constants";
import { firstUseQuestion } from "./data/outputKinds";
import { styleRecipes } from "./data/styleRecipes";
import { typographyPairings } from "./data/typographyPairings";
import type {
  DesignDefaults,
  FirstUseAnswer,
  LandingLayout,
  MotionTier,
  OutputKind,
  ProductGroupId,
  ProductType,
  StyleRecipe,
  TypographyPairing,
} from "./types";

const productById = new Map(productTypes.map((product) => [product.id, product]));
const recipeById = new Map(styleRecipes.map((recipe) => [recipe.id, recipe]));
const pairingById = new Map(typographyPairings.map((pairing) => [pairing.id, pairing]));
const layoutById = new Map(landingLayouts.map((layout) => [layout.id, layout]));
const motionById = new Map(motionTiers.map((tier) => [tier.id, tier]));

const layoutByPattern = new Map<string, LandingLayout>();
for (const layout of landingLayouts) {
  for (const patternId of layout.patternIds ?? []) layoutByPattern.set(patternId, layout);
}

const recipeByStyle = new Map<string, string>();
for (const recipe of styleRecipes) {
  for (const styleId of [recipe.sourceStyleId, ...(recipe.relatedStyleIds ?? [])]) {
    if (styleId) recipeByStyle.set(styleId, recipe.id);
  }
}

// «Dark Mode (OLED)» es lujo oscuro en marcas de consumo y precisión técnica en todo lo demás.
const DARK_LUXURY_GROUPS = new Set<string>(["media", "commerce", "travel", "services", "events"]);

const GROUP_RECIPE: Record<ProductGroupId, string> = {
  software: "corporate-clean",
  data: "tech-precision",
  developer: "tech-precision",
  commerce: "bento",
  finance: "corporate-clean",
  health: "soft-ui",
  education: "soft-ui",
  media: "editorial",
  creative: "soft-neubrutal",
  community: "bento",
  services: "corporate-clean",
  travel: "glass",
  personal: "soft-ui",
  games: "playful",
  public: "corporate-clean",
  industry: "tech-precision",
  events: "bento",
};

// Las recetas con voz tipográfica propia mantienen su pairing; las neutras adoptan el del sector.
const NEUTRAL_TYPE_RECIPES = new Set(["minimal-swiss", "soft-ui", "glass", "corporate-clean", "tech-precision", "bento"]);

const GROUP_PAIRING: Record<ProductGroupId, string> = {
  software: "inter-neo-grotesque",
  data: "inter-neo-grotesque",
  developer: "mono-tech",
  commerce: "geometric-modern",
  finance: "plex-corporate",
  health: "humanist-calm",
  education: "jakarta-friendly",
  media: "editorial-serif",
  creative: "grotesk-startup",
  community: "jakarta-friendly",
  services: "humanist-calm",
  travel: "geometric-modern",
  personal: "jakarta-friendly",
  games: "rounded-friendly",
  public: "humanist-calm",
  industry: "grotesk-startup",
  events: "grotesk-startup",
};

function required<T>(map: Map<string, T>, id: string, kind: string): T {
  const value = map.get(id);
  if (value === undefined) throw new Error(`@dialmade/catalog: falta ${kind} "${id}"`);
  return value;
}

function isGroup(group: string): group is ProductGroupId {
  return group in GROUP_RECIPE;
}

export function getProductType(id: string): ProductType | undefined {
  return productById.get(id);
}

export function getStyleRecipe(id: string): StyleRecipe | undefined {
  return recipeById.get(id);
}

export function getTypographyPairing(id: string): TypographyPairing | undefined {
  return pairingById.get(id);
}

export function getLandingLayout(id: string): LandingLayout | undefined {
  return layoutById.get(id);
}

export function getMotionTier(id: string): MotionTier | undefined {
  return motionById.get(id as MotionTier["id"]);
}

/** Respuesta a «¿Qué vas a hacer primero con este diseño?» → tipo de salida recomendado. */
export function recommendKind(answer: FirstUseAnswer): OutputKind {
  const option = firstUseQuestion.options.find((candidate) => candidate.answer === answer);
  if (!option) throw new Error(`@dialmade/catalog: respuesta desconocida "${String(answer)}"`);
  return option.kind;
}

export function defaultLandingLayout(productTypeId: string): LandingLayout {
  const product = productById.get(productTypeId);
  const fromPattern = product?.landingPatternId ? layoutByPattern.get(product.landingPatternId) : undefined;
  if (fromPattern) return fromPattern;
  const fallbackId = product?.dashboardStyle ? DASHBOARD_LANDING_LAYOUT_ID : DEFAULT_LANDING_LAYOUT_ID;
  return required(layoutById, fallbackId, "el layout");
}

function recipeIdForStyle(styleId: string, group: string): string | undefined {
  if (styleId === "dark-mode-oled") return DARK_LUXURY_GROUPS.has(group) ? "dark-luxury" : "tech-precision";
  return recipeByStyle.get(styleId);
}

export function defaultRecipe(productTypeId: string): StyleRecipe {
  const product = productById.get(productTypeId);
  if (!product) return required(recipeById, DEFAULT_RECIPE_ID, "la receta");

  const avoided = new Set(product.doNotUseStyles);
  const allowed = (recipe: StyleRecipe | undefined): recipe is StyleRecipe =>
    recipe !== undefined && !(recipe.sourceStyleId && avoided.has(recipe.sourceStyleId));

  for (const styleId of product.styleIds ?? []) {
    const recipeId = recipeIdForStyle(styleId, product.group);
    const recipe = recipeId ? recipeById.get(recipeId) : undefined;
    if (allowed(recipe)) return recipe;
  }

  const candidates = [isGroup(product.group) ? GROUP_RECIPE[product.group] : undefined, DEFAULT_RECIPE_ID, "corporate-clean"];
  for (const id of candidates) {
    const recipe = id ? recipeById.get(id) : undefined;
    if (allowed(recipe)) return recipe;
  }
  return required(recipeById, DEFAULT_RECIPE_ID, "la receta");
}

export function defaultPairing(productTypeId: string): TypographyPairing {
  const product = productById.get(productTypeId);
  // Generic (or unknown) keeps the neutral default pairing, whatever the default recipe pairs with.
  if (!product) return required(pairingById, DEFAULT_PAIRING_ID, "el pairing");
  const recipe = defaultRecipe(productTypeId);
  const groupPairing =
    product && isGroup(product.group) && NEUTRAL_TYPE_RECIPES.has(recipe.id) ? GROUP_PAIRING[product.group] : undefined;
  return required(pairingById, groupPairing ?? recipe.pairingId ?? DEFAULT_PAIRING_ID, "el pairing");
}

export function defaultMotionTier(productTypeId: string): MotionTier {
  return required(motionById, defaultRecipe(productTypeId).defaultMotion, "el tier de motion");
}

/** Punto de partida completo para un tipo de producto (o `"generic"`). */
export function defaultsFor(productTypeId: string): DesignDefaults {
  return {
    productType: productById.get(productTypeId),
    recipe: defaultRecipe(productTypeId),
    pairing: defaultPairing(productTypeId),
    landingLayout: defaultLandingLayout(productTypeId),
    motion: defaultMotionTier(productTypeId),
  };
}
