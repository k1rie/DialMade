// Font resolution of the plugin: a family and a CSS weight → a Figma font that exists in this file. Pure, so it
// is tested without Figma.

export type FontName = { family: string; style: string };

/** CSS weight of a Figma style name («Semi Bold», «SemiBold Italic», «Black»…); `null` for unknown names. */
export function styleWeight(style: string): number | null {
  const name = style.toLowerCase().replace(/[\s_-]+/g, "").replace(/italic|oblique/g, "");
  const table: [RegExp, number][] = [
    [/^(thin|hairline)$/, 100],
    [/^(extralight|ultralight)$/, 200],
    [/^light$/, 300],
    [/^(regular|normal|book|roman|)$/, 400],
    [/^medium$/, 500],
    [/^(semibold|demibold)$/, 600],
    [/^bold$/, 700],
    [/^(extrabold|ultrabold)$/, 800],
    [/^(black|heavy)$/, 900],
  ];
  for (const [pattern, weight] of table) if (pattern.test(name)) return weight;
  return null;
}

const isItalic = (style: string) => /italic|oblique/i.test(style);

/**
 * The upright style of `family` closest to `weight` (ties go to the heavier one, like CSS above 500), or `null`
 * when the family has no usable style in `available`.
 */
export function pickStyle(available: readonly FontName[], family: string, weight: number): string | null {
  const wanted = family.trim().toLowerCase();
  const styles = available.filter((font) => font.family.toLowerCase() === wanted && !isItalic(font.style));
  let best: { style: string; distance: number; weight: number } | null = null;
  for (const font of styles) {
    const w = styleWeight(font.style);
    if (w === null) continue;
    const distance = Math.abs(w - weight);
    if (!best || distance < best.distance || (distance === best.distance && w > best.weight)) best = { style: font.style, distance, weight: w };
  }
  return best?.style ?? null;
}

export type ResolvedFont = { font: FontName; substituted: boolean; requested: string };

/** `family` at `weight`, else `fallback` at `weight`, else Inter Regular (always present in Figma). */
export function resolveFont(available: readonly FontName[], family: string, weight: number, fallback: string): ResolvedFont {
  const own = pickStyle(available, family, weight);
  if (own) return { font: { family: available.find((f) => f.family.toLowerCase() === family.toLowerCase())!.family, style: own }, substituted: false, requested: family };
  const other = pickStyle(available, fallback, weight);
  if (other) return { font: { family: fallback, style: other }, substituted: true, requested: family };
  return { font: { family: "Inter", style: "Regular" }, substituted: true, requested: family };
}
