import type { GenericProductId, LandingSectionType, OutputKind } from "./types";

export const OUTPUT_KINDS: readonly OutputKind[] = ["brand", "landing", "app"];

export const LANDING_SECTION_TYPES: readonly LandingSectionType[] = [
  "landing.navbar",
  "landing.hero",
  "landing.socialProof",
  "landing.features",
  "landing.testimonials",
  "landing.pricing",
  "landing.cta",
  "landing.footer",
];

export const GENERIC_PRODUCT_ID: GenericProductId = "generic";

export const DEFAULT_RECIPE_ID = "minimal-swiss";
export const DEFAULT_PAIRING_ID = "inter-neo-grotesque";
export const DEFAULT_LANDING_LAYOUT_ID = "feature-rich";
export const DASHBOARD_LANDING_LAYOUT_ID = "product-demo";
