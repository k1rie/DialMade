import { DEVICE_WIDTHS } from "@/lib/devices";

/** Value of «Tu guía de estilo» (an imported guide): the preview uses the doc's own theme inputs. */
export const GUIDE_STYLE = "guide";

/**
 * Area a preview shows, in design px: the top of a desktop screen (1440 × 900, 8:5, «above the fold»).
 * Blocks below it are not painted; the preview box crops the rest.
 */
export const PREVIEW_WIDTH = DEVICE_WIDTHS.desktop;
export const PREVIEW_HEIGHT = (PREVIEW_WIDTH * 5) / 8;

/**
 * Radii and shadows shrink by this factor instead of the true scale (~0.18 for a 260 px card), so a tiny
 * preview keeps the recipe's character (like Composer's StyleSample).
 */
export const PREVIEW_SCALE = 0.45;

/** Page padding around the content and gap between neighbouring blocks, in design px. */
export const PREVIEW_PAD_PX = 24;
export const PREVIEW_GAP_PX = 16;

/** Theme variables kept by the vars cache (several docs × 13 options × modes). */
export const STYLE_VARS_CACHE_SIZE = 64;
/** Base theme inputs kept (generateTheme runs once per brand + palette). */
export const THEME_INPUTS_CACHE_SIZE = 8;

/** Marks the radio group, so other areas (the «Estilo» chip of the top bar) can focus it. */
export const STYLE_PICKER_ATTR = "data-style-picker";

/** The pick is announced once the user stops arrowing through the options (ms). */
export const ANNOUNCE_DELAY_MS = 500;
