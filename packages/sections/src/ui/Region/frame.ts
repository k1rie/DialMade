import type { SectionFrameOptions } from "../../types";
import { REGION_LAYOUTS, REGION_PADDINGS, REGION_ROLES, type RegionRole } from "./schema";

const SURFACES = ["plain", "card", "muted"] as const;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Role from the stored props; anything unknown reads as a «Contenedor» (`group`), like `defaultProps`. */
export const regionRoleOf = (stored: Readonly<Record<string, unknown>>): RegionRole => pick(stored.role, REGION_ROLES, "group");

/**
 * Wrapper of a region element. Regions render no box of their own (`toCss` lays their children out on
 * the wrapper), so the wrapper carries everything: scopes and inferred regions are structural (no tab
 * stop, role or click), and the data attributes drive the group surface and the landing gutters.
 */
export const regionFrame: SectionFrameOptions = {
  structural: (stored) => regionRoleOf(stored) !== "group",
  attributes: (stored): Record<`data-${string}`, string> => {
    const role = regionRoleOf(stored);
    if (role === "scope") return { "data-dl-region": "scope" };
    if (role === "inferred") return { "data-dl-region": "inferred", "data-dl-layout": pick(stored.layout, REGION_LAYOUTS, "stack") };
    return {
      "data-dl-region": "group",
      "data-dl-surface": pick(stored.variant, SURFACES, "plain"),
      "data-dl-padding": pick(stored.padding, REGION_PADDINGS, "none"),
    };
  },
};
