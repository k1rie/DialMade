import type { SectionBuilder } from "../../context";
import { artDirectionBuilder } from "./artDirection";
import { componentsBuilder } from "./components";
import { coverBuilder } from "./cover";
import { identityBuilder } from "./identity";
import { paletteBuilder } from "./palette";
import { shapeBuilder } from "./shape";
import { typeBuilder } from "./type";

/** Builders of the `brand.*` sections (Guía de estilo), in board order. */
export const BRAND_BUILDERS: Readonly<Record<string, SectionBuilder>> = {
  "brand.cover": coverBuilder,
  "brand.identity": identityBuilder,
  "brand.palette": paletteBuilder,
  "brand.type": typeBuilder,
  "brand.shape": shapeBuilder,
  "brand.components": componentsBuilder,
  "brand.artDirection": artDirectionBuilder,
};
