/** Share of the image a color needs to be a swatch: a 1 % CTA survives, antialiasing does not. */
export const SCREENSHOT_MIN_COVERAGE = 0.002;
/** `ScreenshotSummary.swatches` holds at most 12 (the vision AI refers to them by index 0–11). */
export const MAX_SCREENSHOT_SWATCHES = 12;
/** Asked from `extractFromPixels` before the image-share filter. */
export const EXTRACT_SWATCHES = 16;
/** Pixels at or above this alpha are content; a window capture's shadow and rounded corners are not. */
export const OPAQUE_ALPHA = 250;
/** Same sampling budget as `extractFromPixels`. */
export const MAX_SAMPLES = 262_144;

/** OKLCH lightness of the background: below is dark, above is light, in between ambiguous. */
export const DARK_L = 0.35;
export const LIGHT_L = 0.75;
/** The other side covering this share of the image makes the mode ambiguous (split layouts). */
export const SPLIT_SHARE = 0.45;
/** With a mid-lightness background, this share of light (or dark) pixels still decides the mode. */
export const MAJORITY_SHARE = 0.6;

/** Below this chroma a pixel is a neutral (Tailwind's slate text sits at ≈0.04). */
export const NEUTRAL_C = 0.05;
/** An accent candidate needs at least this chroma, so tinted grays never qualify. */
export const ACCENT_MIN_C = 0.08;
/** Image share of an accent: a button or a badge, not a hero (research: 0.2–10 %). */
export const ACCENT_MIN_SHARE = 0.002;
export const ACCENT_MAX_SHARE = 0.1;
/** Without a small accent, a larger colored area (a sidebar) can be the candidate up to this share. */
export const ACCENT_FALLBACK_MAX_SHARE = 0.4;
/** A background of mid lightness with this chroma is read as the brand color, not as a page. */
export const BRAND_BACKGROUND_C = 0.06;
/** A second chromatic color is a CTA only when it differs from the brand color this much. */
export const DISTINCT_HUE = 30;
export const DISTINCT_DELTA_E = 0.12;
/** Minimum contrast with the background for a neutral to be read as text. */
export const TEXT_CONTRAST = 4.5;

/** A pixel counts toward the nearest swatch within this ΔEok (image shares). */
export const ASSIGN_DELTA_E = 0.1;
/** Candidates closer than this are the same swatch. */
export const SAME_SWATCH_DELTA_E = 0.02;

/** Tinted neutrals must be this share of the neutral pixels for the tint to count. */
export const TINT_MIN_SHARE = 0.05;
/** A mean tint below this chroma is reported as pure gray. */
export const TINT_MIN_C = 0.001;
/** Chromatic pixels below this share of the image: vibrancy is reported as 0. */
export const VIBRANCY_MIN_SHARE = 0.001;
/** The 16 most common exact colors covering less than this share: the image looks like a photo. */
export const PHOTO_TOP_SHARE = 0.35;

/** Consensus: accents within this hue distance are the same brand color (light and dark variants). */
export const SAME_ACCENT_HUE = 25;
/** Consensus: tints within this hue distance agree (warm vs cool grays). */
export const SAME_TINT_HUE = 45;
/** Consensus: a screenshot whose tint is below this chroma is pure gray and does not vote on hue. */
export const TINTED_C = 0.003;
