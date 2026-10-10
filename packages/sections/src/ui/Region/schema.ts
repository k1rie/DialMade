import { z } from "zod";

export const REGION_ROLES = ["scope", "inferred", "group"] as const;
export const REGION_PADDINGS = ["none", "sm", "md", "lg"] as const;
export const REGION_LAYOUTS = ["stack", "row", "grid"] as const;
export const SCREEN_KINDS = ["landing", "app"] as const;

export type RegionRole = (typeof REGION_ROLES)[number];

export const regionSchema = z.strictObject({
  /**
   * `scope`: the root of a layout page (renders the `.dl-layout` element). `inferred`: a row, stack or grid
   * that `inferStructure` found (structural, never selectable). `group`: the library's «Contenedor».
   */
  role: z.enum(REGION_ROLES),
  /** Inner padding of a group. */
  padding: z.enum(REGION_PADDINGS),
  /** Kind of the structure node of an inferred region (landing gutters for top rows and grids). */
  layout: z.enum(REGION_LAYOUTS),
  /** Screen kind of a scope (`data-dl-kind` on `.dl-layout`). */
  screenKind: z.enum(SCREEN_KINDS),
});

export type RegionProps = z.infer<typeof regionSchema>;
