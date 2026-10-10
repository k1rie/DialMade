import type { PageElement } from "@dialmade/doc";
import type { AnySectionDefinition } from "../../types";

/** The layout region section: structural unless it is a «Contenedor» (`role: "group"`). */
const REGION_TYPE = "ui.region";

/**
 * Is the element a structural box (the layout scope, an inferred `r-…` region) rather than a selectable
 * section? The section decides through `frame.structural`; a `ui.region` without that hook (or not
 * registered) is structural unless its stored `role` is `"group"`.
 */
export function isStructuralElement(def: AnySectionDefinition | undefined, element: PageElement): boolean {
  if (def?.frame?.structural) return def.frame.structural(element.props);
  return element.type === REGION_TYPE && element.props.role !== "group";
}
