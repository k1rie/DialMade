import themePresetsData from "../data/themePresets.json";
import type { ThemeColors, ThemeMode, ThemePreset } from "./types";

// Temas completos de daisyUI y tweakcn, con colores (ETL en scripts/etl-themes.mjs). Van en
// `@dialmade/catalog/themes`, aparte del índice, para que sus ~100 KB no entren en el bundle de quien no los use.
// La forma sin colores y la conversión a `StyleRecipe` están en el índice (`themeShapes`, `getThemeRecipe`…) y
// se reexportan aquí para tenerlo todo en un solo import.
export const themePresets: readonly ThemePreset[] = themePresetsData as readonly ThemePreset[];

const presetById = new Map(themePresets.map((preset) => [preset.id, preset]));

export function getThemePreset(id: string): ThemePreset | undefined {
  return presetById.get(id);
}

/** Colores del tema en el modo pedido; si el tema solo tiene el otro modo, devuelve ese. */
export function themeColors(preset: ThemePreset, mode: ThemeMode): ThemeColors {
  const colors = preset.colors[mode] ?? preset.colors[mode === "light" ? "dark" : "light"];
  if (!colors) throw new Error(`El tema ${preset.id} no trae colores.`);
  return colors;
}

export {
  archetypeOf,
  getThemeRecipe,
  getThemeShape,
  nearestArchetype,
  resolveRecipe,
  themeShapes,
  themesByArchetype,
  themeToRecipe,
} from "./themeRecipes";
