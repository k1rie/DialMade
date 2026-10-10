import { themeWithOverrides, type DesignDoc, type ThemeInputs } from "@dialmade/doc";
import { toFigmaTokens } from "@dialmade/palette";

/** `figma-{light,dark}.tokens.json`: color variables for Figma's native import (sRGB), with the doc's overrides. */
export function figmaTokensJson(doc: DesignDoc, inputs: Pick<ThemeInputs, "theme">, mode: "light" | "dark"): string {
  return `${JSON.stringify(toFigmaTokens(themeWithOverrides(doc, inputs.theme), mode), null, 2)}\n`;
}
