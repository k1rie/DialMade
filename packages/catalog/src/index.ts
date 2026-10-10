export type * from "./types";

export { landingLayouts, motionTiers, productTypes } from "./catalog";
export {
  DEFAULT_LANDING_LAYOUT_ID,
  DEFAULT_PAIRING_ID,
  DEFAULT_RECIPE_ID,
  GENERIC_PRODUCT_ID,
  LANDING_SECTION_TYPES,
  OUTPUT_KINDS,
} from "./constants";
export { firstUseQuestion, outputKindOptions } from "./data/outputKinds";
export { productChips } from "./data/productChips";
export { productGroups } from "./data/productGroups";
export { styleRecipes } from "./data/styleRecipes";
export { typographyPairings } from "./data/typographyPairings";
export {
  defaultLandingLayout,
  defaultMotionTier,
  defaultPairing,
  defaultRecipe,
  defaultsFor,
  getLandingLayout,
  getMotionTier,
  getProductType,
  getStyleRecipe,
  getTypographyPairing,
  recommendKind,
} from "./defaults";
export { googleFontsCss2Url, type FontRequest } from "./googleFonts";
