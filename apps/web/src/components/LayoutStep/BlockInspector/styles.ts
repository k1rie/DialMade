/*
 * Field look of the inspector, the same as the Composer's knob fields (app chrome, nothing of the user's
 * theme). `ScreenPanel/styles.ts` holds the same two strings.
 */

export const FIELD_LABEL = "text-caption font-medium text-muted";

export const FIELD_CONTROL =
  "w-full rounded-control border border-app-strong bg-white/[0.03] px-2.5 text-small text-fg transition-[border-color] duration-150 " +
  "placeholder:text-subtle hover:border-white/25 disabled:pointer-events-none disabled:opacity-45";

/** Native select with the app tokens (the global dark color scheme paints its options list). */
export const FIELD_SELECT = `${FIELD_CONTROL} h-8 appearance-auto pe-1.5`;

/** Number inputs without the browser spinners (the unit sits where they were). */
export const NUMBER_CONTROL = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export const FIELD_HINT = "text-caption text-subtle";
