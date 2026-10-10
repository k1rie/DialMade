import type { FitInput, FitResult } from "../../types";
import type { RegionProps } from "./schema";

/** A library block that compiles to a region is always the «Contenedor» (scopes and inferred regions are built apart). */
export function fitRegion(_input: FitInput): FitResult<RegionProps> {
  return { props: { role: "group" } };
}
