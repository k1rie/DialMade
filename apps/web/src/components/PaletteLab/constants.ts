/** DnD types: logo swatches go to the seed slots; palette style rows go to the «Estilo» slot. */
export const SWATCH_TYPE = "swatch";
export const STYLE_TYPE = "palette-style";

export const SLOT_IDS = {
  primary: "palette-slot-primary",
  secondary: "palette-slot-secondary",
  style: "palette-slot-style",
} as const;

export type SeedRole = "primary" | "secondary";

/** Palette style rows shown before «N más». */
export const VISIBLE_STYLES = 5;

/** Accents offered when the logo is achromatic: three hues far apart, mid lightness (OKLCH → hex). */
export const SUGGESTED_ACCENTS = [
  { id: "coral", hex: "#e8573f" },
  { id: "teal", hex: "#0f9e8e" },
  { id: "violet", hex: "#7c5cff" },
] as const;

export type SuggestedAccentId = (typeof SUGGESTED_ACCENTS)[number]["id"];

/** Base width the minis are laid out at before scaling to the preview frame (their native size). */
export const MINI_BASE_WIDTH = 320;
