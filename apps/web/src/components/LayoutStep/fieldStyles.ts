/*
 * Field look of the right panel (BlockInspector and ScreenPanel), the same as the Composer's knob fields:
 * app chrome, nothing of the user's theme.
 *
 * Contrast (DESIGN-BRIEF «Tokens de la app»): every hint, counter, unit and placeholder carries
 * information, so it uses `text-muted` (≥4.5:1 on the panels). `text-subtle` is only for text ≥14 px
 * semibold or decorative glyphs (aria-hidden separators), never for these 12–13 px strings.
 */

export const FIELD_LABEL = "text-caption font-medium text-muted";

export const FIELD_CONTROL =
  "w-full rounded-control border border-app-strong bg-white/[0.03] px-2.5 text-small text-fg transition-[border-color] duration-150 " +
  "placeholder:text-muted hover:border-white/25 disabled:pointer-events-none disabled:opacity-45";

/** Native select with the app tokens (the global dark color scheme paints its options list). */
export const FIELD_SELECT = `${FIELD_CONTROL} h-8 appearance-auto pe-1.5`;

/** Number inputs without the browser spinners (the unit sits where they were). */
export const NUMBER_CONTROL = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Hint under a field (range, unit, what it does). Informational: muted, not subtle. */
export const FIELD_HINT = "text-caption text-muted";

/** Small informational text inside or beside a field: the unit in a number field, the note's counter. */
export const FIELD_META = "text-caption text-muted";
