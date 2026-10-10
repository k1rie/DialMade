/**
 * The screen mini of the preview card: the page is laid out at a desktop width (over the layout CSS's 64rem
 * tablet container query, so it shows the desktop layout) and scaled to the card's mini column (13rem, the
 * width the kind minis take). 16:10, like the kind minis (≈320×200).
 */
export const SCREEN_MINI = {
  widthRem: 13,
  pageWidthRem: 80,
  aspectRatio: "16 / 10",
} as const;

/** `widthRem / pageWidthRem`: the page at 80rem fills the 13rem slot exactly. */
export const SCREEN_MINI_SCALE = SCREEN_MINI.widthRem / SCREEN_MINI.pageWidthRem;
