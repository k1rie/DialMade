// The theme both emitters resolve the design tree against: every color variable of the contract per mode
// (hex or an alias of another variable, exactly as `compileThemeVars` writes them) and the tokens of each mode.
import { compileThemeVars, resolveExport, type DesignDoc, type ExportOptions, type ResolvedTokens, type ThemeInputs } from "@dialmade/doc";

export type ColorValue = { hex: string; alpha: number } | { alias: string };

export interface ThemeSnapshot {
  inputs: ThemeInputs;
  light: ResolvedTokens;
  dark: ResolvedTokens;
  /** Color variable (without `--`) → value per mode, in the order `compileThemeVars` writes them. */
  colors: { light: Record<string, ColorValue>; dark: Record<string, ColorValue> };
}

const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
const ALIAS = /^var\(--([a-z0-9-]+)\)$/i;

/** `#rrggbb[aa]` or `var(--x)`; anything else (not a color) is `null`. */
export function parseColor(value: string): ColorValue | null {
  const hex = HEX.exec(value.trim());
  if (hex) return { hex: `#${hex[1]!.toLowerCase()}`, alpha: hex[2] ? Number((parseInt(hex[2], 16) / 255).toFixed(3)) : 1 };
  const alias = ALIAS.exec(value.trim());
  return alias ? { alias: alias[1]! } : null;
}

const isColorVar = (name: string) => !name.startsWith("--dl-");

function colorsOf(doc: DesignDoc, inputs: ThemeInputs, mode: "light" | "dark", options: ExportOptions): Record<string, ColorValue> {
  const vars = compileThemeVars(doc, { ...inputs, ...(options.pageDials && { pageDials: options.pageDials }), mode, colorFormat: "hex" });
  const out: Record<string, ColorValue> = {};
  for (const [name, value] of Object.entries(vars)) {
    if (!isColorVar(name)) continue;
    const color = parseColor(value);
    if (color) out[name.slice(2)] = color;
  }
  return out;
}

export function themeSnapshot(doc: DesignDoc, options: ExportOptions = {}): ThemeSnapshot {
  const { inputs, light, dark } = resolveExport(doc, options);
  return { inputs, light, dark, colors: { light: colorsOf(doc, inputs, "light", options), dark: colorsOf(doc, inputs, "dark", options) } };
}

/** The final `#rrggbb` + alpha of a color variable in a mode (aliases followed); `null` when unknown. */
export function resolveColor(snapshot: ThemeSnapshot, mode: "light" | "dark", name: string): { hex: string; alpha: number } | null {
  const colors = snapshot.colors[mode];
  let current = colors[name];
  for (let hops = 0; current && "alias" in current && hops < 8; hops++) current = colors[current.alias];
  return current && "hex" in current ? current : null;
}
