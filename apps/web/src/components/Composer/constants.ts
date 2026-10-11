import type { PaletteStyleId } from "@dialmade/palette";

/** DnD types of the Composer cards (DraggableItem `type` / DropSlot `accept`). */
export const DND = {
  recipe: "composer-recipe",
  pairing: "composer-pairing",
  section: "composer-section",
} as const;

export const CANVAS_DROP_ID = "composer-canvas";
export const CANVAS_ACCEPT: readonly string[] = [DND.recipe, DND.pairing];
export const STYLE_SLOT_ACCEPT: readonly string[] = [DND.recipe];
export const TYPE_SLOT_ACCEPT: readonly string[] = [DND.pairing];

/** Dial ticks: the 1–10 range reads as three zones (≤3, 4–7, ≥8). */
export const DIAL_DETENTS: readonly number[] = [3, 7];
export const DIAL_MIN = 1;
export const DIAL_MAX = 10;

/** Cards of the panel's grids shown before «Ver más». */
export const CARDS_VISIBLE = 8;

/** Button color candidates: scale steps that can carry text (white or near-black) at AA. */
export const BUTTON_COLOR_STEPS = {
  brand: [500, 600, 700, 800, 900],
  cta: [500, 600, 700],
  neutral: [900],
} as const;

/** Roles a button color override writes, in both modes. */
export const BUTTON_COLOR_ROLES = ["primary", "primary-foreground", "cta", "cta-foreground"] as const;

/** Palette styles whose theme defaults to dark (`Theme.defaultMode`); their cards preview dark. */
export const DARK_PALETTE_STYLES: ReadonlySet<PaletteStyleId> = new Set<PaletteStyleId>(["dark-luxury", "neon"]);
