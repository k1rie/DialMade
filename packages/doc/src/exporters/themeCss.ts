import { colorCssVars, tokensToCssVars } from "../compile";
import type { DesignDoc } from "../schema";
import { fontsUrlFor } from "../tokens";
import { recipeIds, resolveExport, type ExportOptions } from "./shared";

export interface ThemeCssOptions extends ExportOptions {
  /** Light block selector (default `:root`). */
  selector?: string;
  /** Dark block selector (default `.dark`, like shadcn). */
  darkSelector?: string;
  /** Prepends `@import url(<Google Fonts css2>)` (see `fontsUrlFor`). Only valid when this CSS is the first file loaded. */
  includeFontImport?: boolean;
}

const block = (selector: string, vars: Record<string, string>) =>
  [`${selector} {`, ...Object.entries(vars).map(([name, value]) => `  ${name}: ${value};`), "}"].join("\n");

/**
 * The full theme as CSS: every variable of the contract (color, `--dl-*` and component tokens) in a
 * light block and again in a dark block. Pairs with `@dialmade/ui` / `@dialmade/sections` CSS.
 */
export function toThemeCss(doc: DesignDoc, options: ThemeCssOptions = {}): string {
  const { inputs, light, dark } = resolveExport(doc, options);
  const colorFormat = options.colorFormat ?? "oklch";
  const vars = (mode: "light" | "dark", tokens: typeof light) => ({
    ...colorCssVars(doc, { theme: inputs.theme, mode, colorFormat }),
    ...tokensToCssVars(tokens),
  });
  const ids = recipeIds(inputs.recipe);
  const header = [
    `/* ${doc.brand.name.replace(/\*\//g, "")} · Dialmade theme (DesignDoc v${doc.version}) */`,
    `/* Recipe: ${ids.recipeId}${ids.themeId ? ` · Theme: ${ids.themeId}` : ""} · Type: ${inputs.pairing.id} · Motion: ${inputs.motionTier.id} · Palette: ${inputs.theme.styleId} */`,
  ];
  const fontsUrl = options.includeFontImport ? fontsUrlFor(doc, inputs.pairing) : null;
  if (fontsUrl) header.push(`@import url("${fontsUrl}");`);
  return [
    header.join("\n"),
    block(options.selector ?? ":root", vars("light", light)),
    block(options.darkSelector ?? ".dark", vars("dark", dark)),
  ].join("\n\n") + "\n";
}
