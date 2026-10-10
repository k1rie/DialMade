import type { AnySectionDefinition } from "../types";
import { artDirectionSection } from "./ArtDirection";
import { componentsSection } from "./Components";
import { coverSection } from "./Cover";
import { identitySection } from "./Identity";
import { paletteSection } from "./Palette";
import { shapeSection } from "./Shape";
import { typeSection } from "./Type";

// Guía de estilo (brand board), in board order: 00 cover and 01–06.
export const brandSections: readonly AnySectionDefinition[] = [
  coverSection,
  identitySection,
  paletteSection,
  typeSection,
  shapeSection,
  componentsSection,
  artDirectionSection,
];
