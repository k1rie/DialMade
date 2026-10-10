/**
 * Fictitious brands for the demos (no real logos or brands in the repo). Each one paints the
 * generated preview through CSS vars; the page itself keeps the app tokens.
 */
type Oklch = readonly [l: number, c: number, h: number];

const colorNames = ["brand", "brand-ink", "brand-soft", "page", "page-ink", "page-muted", "page-line"] as const;
type ColorName = (typeof colorNames)[number];

export type BrandVars = Record<`--${ColorName}`, string>;
export type BrandChannels = Record<`--${ColorName}-${"l" | "c" | "h"}`, string>;

export type DemoBrand = {
  id: "coral" | "bosque" | "ambar";
  name: string;
  /** Fictitious glyph for the brand mark. */
  glyph: "circle" | "leaf" | "spark";
  /** Ready-made colors (`--brand: oklch(…)`), for paint that never changes brand. */
  vars: BrandVars;
  /**
   * The same colors split into OKLCH channels (`--brand-l`, `--brand-c`, `--brand-h`). Together with the
   * `brand-transition` utility, which composes `--brand` from them, a brand switch interpolates in OKLCH.
   */
  channels: BrandChannels;
};

function defineBrand({ colors, ...brand }: Omit<DemoBrand, "vars" | "channels"> & { colors: Record<ColorName, Oklch> }): DemoBrand {
  const vars = {} as BrandVars;
  const channels = {} as BrandChannels;
  for (const name of colorNames) {
    const [l, c, h] = colors[name];
    vars[`--${name}` as const] = `oklch(${l} ${c} ${h})`;
    channels[`--${name}-l` as const] = String(l);
    channels[`--${name}-c` as const] = String(c);
    channels[`--${name}-h` as const] = `${h}deg`;
  }
  return { ...brand, vars, channels };
}

export const demoBrands: DemoBrand[] = [
  defineBrand({
    id: "coral",
    name: "Coralia",
    glyph: "circle",
    colors: {
      brand: [0.64, 0.17, 32],
      "brand-ink": [0.99, 0.01, 32],
      "brand-soft": [0.93, 0.04, 32],
      page: [0.985, 0.006, 40],
      "page-ink": [0.26, 0.03, 30],
      "page-muted": [0.55, 0.03, 30],
      "page-line": [0.9, 0.012, 35],
    },
  }),
  defineBrand({
    id: "bosque",
    name: "Bosque Alto",
    glyph: "leaf",
    colors: {
      brand: [0.52, 0.1, 162],
      "brand-ink": [0.99, 0.01, 160],
      "brand-soft": [0.92, 0.04, 160],
      page: [0.975, 0.008, 150],
      "page-ink": [0.24, 0.03, 165],
      "page-muted": [0.52, 0.03, 165],
      "page-line": [0.89, 0.015, 160],
    },
  }),
  defineBrand({
    id: "ambar",
    name: "Ámbar Studio",
    glyph: "spark",
    colors: {
      brand: [0.74, 0.15, 72],
      "brand-ink": [0.22, 0.04, 60],
      "brand-soft": [0.3, 0.04, 70],
      page: [0.2, 0.012, 70],
      "page-ink": [0.96, 0.01, 80],
      "page-muted": [0.72, 0.02, 75],
      "page-line": [0.32, 0.015, 70],
    },
  }),
];
