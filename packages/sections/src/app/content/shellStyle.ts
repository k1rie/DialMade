import type { ProductType } from "@dialmade/catalog";

export const SHELL_TONES = ["default", "inverted", "brand"] as const;
export type ShellTone = (typeof SHELL_TONES)[number];

export const SHELL_DENSITIES = ["comfortable", "compact", "spacious"] as const;
export type ShellDensity = (typeof SHELL_DENSITIES)[number];

// Monitoring and trading consoles: dark navigation and tight spacing. Family, learning and booking
// products: brand-colored navigation and room to breathe. Everything else stays neutral.
const INVERTED = /real-time|monitor|terminal|crypto|financial|data-dense|iot|sensor|3d|spatial|energy|operations/;
const BRAND = /parent|pet|student|learning|education|booking|donation|community|leaderboard/;
const COMPACT = /data-dense|real-time|monitor|terminal|drill-down|financial|crypto|iot|sensor|inventory|sales intelligence|operations/;
const SPACIOUS = /executive|parent|gallery|portfolio|template|pet|booking|student|learning|education|donation|visitor|community/;

/** Shell tone and density from the «Dashboard Style» of the product type (neutral when it has none). */
export function shellStyleFor(productType: Pick<ProductType, "dashboardStyle">): { tone: ShellTone; density: ShellDensity } {
  const style = productType.dashboardStyle?.toLowerCase() ?? "";
  if (!style) return { tone: "default", density: "comfortable" };
  const tone: ShellTone = INVERTED.test(style) ? "inverted" : BRAND.test(style) ? "brand" : "default";
  const density: ShellDensity = COMPACT.test(style) ? "compact" : SPACIOUS.test(style) ? "spacious" : "comfortable";
  return { tone, density };
}
