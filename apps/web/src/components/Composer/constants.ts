import type { PaletteStyleId } from "@dialmade/palette";
import type { PreviewDevice } from "@/hooks/useDesignDoc";

/** Width of the preview frame per device; the frame is scaled down (transform) to fit the canvas. */
export const DEVICE_WIDTHS: Readonly<Record<PreviewDevice, number>> = {
  mobile: 390,
  tablet: 768,
  desktop: 1440,
};

export const DEVICE_ORDER: readonly PreviewDevice[] = ["mobile", "tablet", "desktop"];

/** DnD types of the Composer cards (DraggableItem `type` / DropSlot `accept`). */
export const DND = {
  recipe: "composer-recipe",
  pairing: "composer-pairing",
  theme: "composer-theme",
  section: "composer-section",
} as const;

export const CANVAS_DROP_ID = "composer-canvas";
export const CANVAS_ACCEPT: readonly string[] = [DND.recipe, DND.pairing, DND.theme];
export const STYLE_SLOT_ACCEPT: readonly string[] = [DND.recipe, DND.theme];
export const TYPE_SLOT_ACCEPT: readonly string[] = [DND.pairing];

/** Dial ticks: the 1–10 range reads as three zones (≤3, 4–7, ≥8). */
export const DIAL_DETENTS: readonly number[] = [3, 7];
export const DIAL_MIN = 1;
export const DIAL_MAX = 10;

export type ThemeCombo = { id: string; paletteStyleId: PaletteStyleId; recipeId: string };

/** Curated palette style × recipe pairs for the «Temas» grid (Buffer-style theme cards). */
export const THEME_COMBOS: readonly ThemeCombo[] = [
  { id: "brand-minimal-swiss", paletteStyleId: "brand", recipeId: "minimal-swiss" },
  { id: "vibrant-playful", paletteStyleId: "vibrant", recipeId: "playful" },
  { id: "pastel-soft-ui", paletteStyleId: "pastel", recipeId: "soft-ui" },
  { id: "mono-editorial", paletteStyleId: "mono", recipeId: "editorial" },
  { id: "dark-luxury-dark-luxury", paletteStyleId: "dark-luxury", recipeId: "dark-luxury" },
  { id: "earthy-organic", paletteStyleId: "earthy", recipeId: "organic" },
  { id: "neon-tech-precision", paletteStyleId: "neon", recipeId: "tech-precision" },
  { id: "corporate-corporate-clean", paletteStyleId: "corporate", recipeId: "corporate-clean" },
  { id: "brand-glass", paletteStyleId: "brand", recipeId: "glass" },
  { id: "vibrant-bento", paletteStyleId: "vibrant", recipeId: "bento" },
  { id: "pastel-soft-neubrutal", paletteStyleId: "pastel", recipeId: "soft-neubrutal" },
  { id: "mono-tech-precision", paletteStyleId: "mono", recipeId: "tech-precision" },
  { id: "dark-luxury-editorial", paletteStyleId: "dark-luxury", recipeId: "editorial" },
  { id: "earthy-soft-ui", paletteStyleId: "earthy", recipeId: "soft-ui" },
  { id: "neon-retro-futurist", paletteStyleId: "neon", recipeId: "retro-futurist" },
  { id: "corporate-bento", paletteStyleId: "corporate", recipeId: "bento" },
];

export const THEMES_VISIBLE = 8;
export const FONT_PACKS_VISIBLE = 4;

/** Button color candidates: scale steps that can carry text (white or near-black) at AA. */
export const BUTTON_COLOR_STEPS = {
  brand: [500, 600, 700, 800, 900],
  cta: [500, 600, 700],
  neutral: [900],
} as const;

/** Roles a button color override writes, in both modes. */
export const BUTTON_COLOR_ROLES = ["primary", "primary-foreground", "cta", "cta-foreground"] as const;

/**
 * Rough size of an AI copy request, shown before generating (prices come from `@/lib/ai/pricing` for
 * the default model): ~3.5 characters per token, the prompt's fixed part and a rewrite slightly longer.
 */
export const AI_ESTIMATE = {
  charsPerToken: 3.5,
  promptOverheadTokens: 2500,
  outputRatio: 1.3,
} as const;

/** Palette styles whose theme defaults to dark (`Theme.defaultMode`); theme cards preview them dark. */
export const DARK_PALETTE_STYLES: ReadonlySet<PaletteStyleId> = new Set<PaletteStyleId>(["dark-luxury", "neon"]);
