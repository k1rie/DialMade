import { deriveResponsive, inferStructure, type LayoutDoc, type ResponsiveLayout, type Structure } from "@dialmade/layout";

/*
 * Structure and responsive layout memoised per LayoutDoc identity. The store never mutates a layout
 * (every edit makes a new object), so a WeakMap keyed by the layout is a safe cache: the canvas, the
 * layers list, the warnings and «Generar» share one inference per version, and old versions are
 * garbage-collected with the undo history.
 */

const structures = new WeakMap<LayoutDoc, Structure>();
const responsives = new WeakMap<LayoutDoc, ResponsiveLayout>();

/** `inferStructure(layout)`, computed once per layout object. */
export function getStructure(layout: LayoutDoc): Structure {
  let structure = structures.get(layout);
  if (!structure) {
    structure = inferStructure(layout);
    structures.set(layout, structure);
  }
  return structure;
}

/** `deriveResponsive(layout, getStructure(layout))`, computed once per layout object. */
export function getResponsive(layout: LayoutDoc): ResponsiveLayout {
  let responsive = responsives.get(layout);
  if (!responsive) {
    responsive = deriveResponsive(layout, getStructure(layout));
    responsives.set(layout, responsive);
  }
  return responsive;
}
