import type { AnySectionDefinition } from "../types";
import { calendarSection } from "./Calendar";
import { cardsSection } from "./Cards";
import { formSection } from "./Form";
import { listSection } from "./List";
import { mediaSection } from "./Media";
import { placeholderSection } from "./Placeholder";
import { regionSection } from "./Region";
import { textSection } from "./Text";

/**
 * Generic blocks of Layout mode (`ui.*`), placed on landing and app screens alike. Their registry kind is
 * `app` («Dashboard y componentes», the kit of reusable components) only for `registry.list` grouping: the
 * Layout library comes from `LIBRARY` of @dialmade/layout (each block names its `sectionType`), never from
 * `registry.list(kind)`.
 */
export const uiSections: readonly AnySectionDefinition[] = [
  textSection,
  mediaSection,
  cardsSection,
  calendarSection,
  listSection,
  formSection,
  placeholderSection,
  regionSection,
];

export { calendarSection, cardsSection, formSection, listSection, mediaSection, placeholderSection, regionSection, textSection };
export { regionFrame, regionRoleOf, type RegionProps, type RegionRole } from "./Region";
export { UI_FRAMES, type UiFrame } from "./lib/fit";
