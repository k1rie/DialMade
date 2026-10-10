// The theme's fluid type sizes are `clamp(min, a + b·vw, max)` (@dialmade/doc's compileThemeVars). Inside an island
// `vw` is the IFRAME's width, the width of the block's cell, not the page's: a hero in a 6-column cell would get a
// smaller h1 than the same block in the exported page or than the base sections around it in Ajustar. The app pins
// `vw` to the page's viewport before sending the variables, so the island sizes text like the page does.

const VW = /(-?\d*\.?\d+)vw\b/g;

/** `vars` with every `<n>vw` replaced by its px at `viewportWidth`. Other values are untouched. */
export function pinViewportUnits(vars: Readonly<Record<string, string>>, viewportWidth: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) out[name] = value.replace(VW, (_match, n: string) => `${(Number(n) * viewportWidth) / 100}px`);
  return out;
}
