import fontsData from "../data/fonts.json";
import styleSourcesData from "../data/styleSources.json";
import typographySourcesData from "../data/typographySources.json";
import type { FontFamily, StyleSource, TypographySource } from "./types";

// Índices de referencia de uupm. Van en `@dialmade/catalog/sources` para que no entren en el bundle si no se usan.
export const styleSources: readonly StyleSource[] = styleSourcesData;
export const typographySources: readonly TypographySource[] = typographySourcesData;
export const fonts: readonly FontFamily[] = fontsData;

const fontByFamily = new Map(fonts.map((font) => [font.family, font]));

export function getFontFamily(family: string): FontFamily | undefined {
  return fontByFamily.get(family);
}

export function isWeightAvailable(family: string, weight: number): boolean {
  return fontByFamily.get(family)?.weights.includes(weight) ?? false;
}
