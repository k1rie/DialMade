import type { SectionBuilder } from "../context";
import { APP_BUILDERS } from "./app";
import { BRAND_BUILDERS } from "./brand";
import { LANDING_BUILDERS } from "./landing";
import { UI_BUILDERS } from "./ui";

/**
 * Builder of each section type (`landing.hero`, `app.kpiRow`…). A type without one falls back to
 * `genericSection` (its copy as an outline).
 */
export const SECTION_BUILDERS: Readonly<Record<string, SectionBuilder>> = {
  ...LANDING_BUILDERS,
  ...APP_BUILDERS,
  ...UI_BUILDERS,
  ...BRAND_BUILDERS,
};
