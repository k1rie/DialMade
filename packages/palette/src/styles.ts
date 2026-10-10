import { clamp, cuspLightness, hueDelta, maxChroma, mix, normalizeHue, pullHue, type Oklch } from "./color";

export type PaletteStyleId =
  | "brand"
  | "vibrant"
  | "pastel"
  | "mono"
  | "dark-luxury"
  | "earthy"
  | "neon"
  | "corporate";

export type LocalizedText = { es: string; en: string };
export type PaletteStyle = { id: PaletteStyleId; label: LocalizedText; description: LocalizedText };
export type ColorMode = "light" | "dark";

export const PALETTE_STYLES: PaletteStyle[] = [
  {
    id: "brand",
    label: { es: "Marca", en: "Brand" },
    description: {
      es: "Tu color exacto, sin transformar.",
      en: "Your exact color, untouched.",
    },
  },
  {
    id: "vibrant",
    label: { es: "Vibrante", en: "Vibrant" },
    description: {
      es: "Más croma y energía, con el mismo tono.",
      en: "More chroma and energy, same hue.",
    },
  },
  {
    id: "pastel",
    label: { es: "Pastel", en: "Pastel" },
    description: {
      es: "Claro y suave; los textos usan pasos oscuros.",
      en: "Light and soft; text uses darker steps.",
    },
  },
  {
    id: "mono",
    label: { es: "Monocromo", en: "Monochrome" },
    description: {
      es: "Un solo tono; los acentos cambian solo la luminosidad.",
      en: "A single hue; accents only change lightness.",
    },
  },
  {
    id: "dark-luxury",
    label: { es: "Lujo oscuro", en: "Dark luxury" },
    description: {
      es: "Oscuro por defecto, croma contenido y acento dorado.",
      en: "Dark by default, restrained chroma and a gold accent.",
    },
  },
  {
    id: "earthy",
    label: { es: "Terroso", en: "Earthy" },
    description: {
      es: "Croma bajo, tono hacia cálidos y neutros tipo piedra.",
      en: "Low chroma, warmer hue and stone-like neutrals.",
    },
  },
  {
    id: "neon",
    label: { es: "Neón", en: "Neon" },
    description: {
      es: "Croma máximo del gamut sobre fondo oscuro.",
      en: "Maximum in-gamut chroma on a dark background.",
    },
  },
  {
    id: "corporate",
    label: { es: "Corporativo", en: "Corporate" },
    description: {
      es: "Croma moderado y neutros fríos.",
      en: "Moderate chroma and cool neutrals.",
    },
  },
];

export const PALETTE_STYLE_IDS: PaletteStyleId[] = PALETTE_STYLES.map((s) => s.id);

/** Hue budget (style shift + scale drift); 2° below the ±15° identity rule to absorb hex rounding. */
export const MAX_STYLE_HUE_SHIFT = 13;
const CHROMATIC = 0.04;

export type StyleSpec = {
  transform: (seed: Oklch) => Oklch;
  neutral: (brand: Oklch, achromatic: boolean) => { hue: number; chroma: number };
  lightBackground: "white" | "tinted";
  /** Dark background lightness; defaults to neutral-950. */
  darkBackgroundL?: number;
  defaultMode: ColorMode;
  statusChroma: number;
  /** Style-owned accent: `always` replaces any secondary; `achromatic` only fills in for gray logos. */
  accent?: { color: (brand: Oklch, achromatic: boolean) => Oklch; when: "always" | "achromatic" };
};

const keepChromatic = (c: number, original: number) => (original >= CHROMATIC ? Math.max(c, CHROMATIC) : c);

const brandNeutral = (chroma: number) => (brand: Oklch, achromatic: boolean) => ({
  hue: brand.h,
  chroma: achromatic ? 0 : chroma,
});

/** Material's Blend.harmonize rule in OKLCH: rotate toward the brand by half the gap, max 15°. */
export function harmonizeHue(hue: number, brandHue: number, cap = 15): number {
  return pullHue(hue, brandHue, 0.5, cap);
}

export const STYLE_SPECS: Record<PaletteStyleId, StyleSpec> = {
  brand: {
    transform: (s) => s,
    neutral: (brand, achromatic) => ({ hue: brand.h, chroma: achromatic ? 0 : clamp(brand.c * 0.06, 0.005, 0.012) }),
    lightBackground: "white",
    defaultMode: "light",
    statusChroma: 1,
  },
  vibrant: {
    transform: (s) => {
      const l = mix(s.l, 0.62, 0.3);
      return { l, c: Math.min(Math.max(s.c * 1.25, 0.15), maxChroma(l, s.h)), h: s.h };
    },
    neutral: brandNeutral(0.01),
    lightBackground: "white",
    defaultMode: "light",
    statusChroma: 1.1,
  },
  pastel: {
    transform: (s) => ({ l: mix(s.l, 0.86, 0.75), c: keepChromatic(Math.min(s.c * 0.45, 0.09), s.c), h: s.h }),
    neutral: brandNeutral(0.01),
    lightBackground: "tinted",
    defaultMode: "light",
    statusChroma: 0.7,
  },
  mono: {
    transform: (s) => s,
    neutral: brandNeutral(0.018),
    lightBackground: "tinted",
    defaultMode: "light",
    statusChroma: 0.85,
  },
  "dark-luxury": {
    transform: (s) => ({ l: mix(s.l, 0.55, 0.4), c: keepChromatic(s.c * 0.7, s.c), h: s.h }),
    neutral: (brand, achromatic) => (achromatic ? { hue: 70, chroma: 0.006 } : { hue: brand.h, chroma: 0.008 }),
    lightBackground: "tinted",
    darkBackgroundL: 0.17,
    defaultMode: "dark",
    statusChroma: 0.8,
    accent: {
      color: (brand, achromatic) => ({ l: 0.78, c: 0.13, h: achromatic ? 85 : harmonizeHue(85, brand.h) }),
      when: "always",
    },
  },
  earthy: {
    transform: (s) => ({
      l: mix(s.l, 0.55, 0.25),
      c: keepChromatic(Math.min(s.c * 0.6, 0.12), s.c),
      h: pullHue(s.h, 60, 0.35, MAX_STYLE_HUE_SHIFT),
    }),
    neutral: () => ({ hue: 65, chroma: 0.014 }),
    lightBackground: "tinted",
    defaultMode: "light",
    statusChroma: 0.75,
    accent: { color: () => ({ l: 0.6, c: 0.13, h: 42 }), when: "achromatic" },
  },
  neon: {
    transform: (s) => {
      const l = mix(s.l, clamp(cuspLightness(s.h), 0.68, 0.88), 0.85);
      return { l, c: maxChroma(l, s.h) * 0.98, h: s.h };
    },
    neutral: (brand, achromatic) => ({ hue: achromatic ? 195 : brand.h, chroma: achromatic ? 0.01 : 0.015 }),
    lightBackground: "white",
    darkBackgroundL: 0.12,
    defaultMode: "dark",
    statusChroma: 1.15,
    accent: {
      color: () => ({ l: 0.82, c: maxChroma(0.82, 195) * 0.98, h: 195 }),
      when: "achromatic",
    },
  },
  corporate: {
    transform: (s) => ({ l: mix(s.l, 0.5, 0.4), c: keepChromatic(Math.min(s.c * 0.85, 0.17), s.c), h: s.h }),
    neutral: () => ({ hue: 250, chroma: 0.014 }),
    lightBackground: "white",
    defaultMode: "light",
    statusChroma: 0.9,
  },
};

/** Applies the style to a chromatic seed, enforcing the hue budget. Achromatic seeds pass through. */
export function applyStyle(style: PaletteStyleId, seed: Oklch, achromatic: boolean): Oklch {
  if (achromatic) return seed;
  const out = STYLE_SPECS[style].transform(seed);
  if (out === seed) return seed;
  const shift = clamp(hueDelta(seed.h, out.h), -MAX_STYLE_HUE_SHIFT, MAX_STYLE_HUE_SHIFT);
  return { l: clamp(out.l, 0, 1), c: Math.max(0, out.c), h: normalizeHue(seed.h + shift) };
}
