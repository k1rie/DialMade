import landingLayoutsData from "../data/landingLayouts.json";
import motionTiersData from "../data/motionTiers.json";
import productTypesData from "../data/productTypes.json";
import type { LandingLayout, MotionTier, ProductType } from "./types";

// Datos generados por scripts/etl.mjs a partir de ui-ux-pro-max-skill (MIT). Ver data/ATTRIBUTION.md.
export const productTypes: readonly ProductType[] = productTypesData;
export const landingLayouts: readonly LandingLayout[] = landingLayoutsData;
export const motionTiers = motionTiersData as readonly MotionTier[];
